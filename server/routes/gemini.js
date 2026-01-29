const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Subcategory = require('../models/Subcategory');
const logger = require('../utils/logger');
const { generateMultipleImages, generateSingleImage, saveGeneratedImage } = require('../utils/geminiImageGenerator');

// Configure multer for temporary file storage
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'temp'),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (jpg, jpeg, png, gif, webp) are allowed.'));
    }
  }
});

// Ensure directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// POST /api/gemini/regenerate-image
// Regenerate a single image using the same prompt (must be before /generate-images)
router.post('/regenerate-image', upload.single('image'), async (req, res) => {
  let tempImagePath = null;
  
  try {
    logger.backend.info('Regenerate image route hit', { url: req.url, body: req.body });
    
    // Validate input
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    
    const { subcategoryId, prompt, order } = req.body;
    
    if (!subcategoryId) {
      return res.status(400).json({ error: 'Subcategory ID is required' });
    }
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!order) {
      return res.status(400).json({ error: 'Order is required' });
    }
    
    tempImagePath = req.file.path;
    
    // Validate subcategory exists
    const subcategory = await Subcategory.findById(subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    logger.backend.info('Regenerating single image', { 
      subcategoryId, 
      order,
      imagePath: tempImagePath 
    });
    
    // Generate single image
    const result = await generateSingleImage(tempImagePath, prompt);
    
    if (!result.success || !result.imageData) {
      return res.status(500).json({ 
        error: 'Failed to generate image',
        message: result.note || 'Unknown error'
      });
    }
    
    // Create output directory for generated images
    const outputDir = path.join(__dirname, '..', 'uploads', 'gemini-generated', subcategoryId);
    ensureDirectoryExists(outputDir);
    
    // Create filename based on order and timestamp
    const timestamp = Date.now();
    const ext = result.mimeType === 'image/png' ? '.png' : '.jpg';
    const filename = `image_${timestamp}_${order}${ext}`;
    const outputPath = path.join(outputDir, filename);
    
    // Save the image
    saveGeneratedImage(result.imageData, outputPath, `order_${order}`);
    
    // Create relative URL path
    const relativePath = `gemini-generated/${subcategoryId}/${filename}`;
    
    logger.backend.info('Image regenerated and saved', { 
      order,
      path: relativePath 
    });
    
    // Clean up temporary uploaded file
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
    }
    
    res.json({
      success: true,
      image: {
        order: parseInt(order),
        prompt: prompt,
        url: `/uploads/${relativePath}`,
        path: relativePath
      }
    });
    
  } catch (error) {
    // Clean up temporary file on error
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      try {
        fs.unlinkSync(tempImagePath);
      } catch (cleanupError) {
        logger.backend.error('Error cleaning up temp file', { error: cleanupError.message });
      }
    }
    
    logger.backend.error('Error regenerating image', { 
      error: error.message, 
      stack: error.stack,
      subcategoryId: req.body.subcategoryId,
      order: req.body.order
    });
    
    res.status(500).json({ 
      error: 'Failed to regenerate image',
      message: error.message 
    });
  }
});

// POST /api/gemini/generate-images
// Generate 6-10 images based on uploaded image and subcategory prompts
router.post('/generate-images', upload.single('image'), async (req, res) => {
  let tempImagePath = null;
  
  try {
    // Validate input
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    
    const { subcategoryId } = req.body;
    if (!subcategoryId) {
      return res.status(400).json({ error: 'Subcategory ID is required' });
    }
    
    tempImagePath = req.file.path;
    
    // Fetch subcategory and validate prompts
    const subcategory = await Subcategory.findById(subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    const prompts = subcategory.imageGenerationPrompts || [];
    if (prompts.length === 0) {
      return res.status(400).json({ 
        error: 'No image generation prompts found for this subcategory. Please configure prompts first.' 
      });
    }
    
    if (prompts.length < 6 || prompts.length > 10) {
      return res.status(400).json({ 
        error: `Subcategory must have 6-10 prompts. Currently has ${prompts.length} prompts.` 
      });
    }
    
    // Sort prompts by order
    const sortedPrompts = [...prompts].sort((a, b) => a.order - b.order);
    
    logger.backend.info('Starting image generation', { 
      subcategoryId, 
      promptCount: sortedPrompts.length,
      imagePath: tempImagePath 
    });
    
    // Generate images using the utility
    const generationResults = await generateMultipleImages(tempImagePath, sortedPrompts);
    
    // Create output directory for generated images
    const outputDir = path.join(__dirname, '..', 'uploads', 'gemini-generated', subcategoryId);
    ensureDirectoryExists(outputDir);
    
    // Save generated images and collect URLs
    const savedImages = [];
    const timestamp = Date.now();
    
    for (let i = 0; i < generationResults.length; i++) {
      const result = generationResults[i];
      
      if (result.success && result.data && result.data.imageData) {
        try {
          // Create filename based on order and timestamp
          const ext = result.data.mimeType === 'image/png' ? '.png' : '.jpg';
          const filename = `image_${timestamp}_${result.order}${ext}`;
          const outputPath = path.join(outputDir, filename);
          
          // Save the image
          saveGeneratedImage(result.data.imageData, outputPath, `order_${result.order}`);
          
          // Create relative URL path
          const relativePath = `gemini-generated/${subcategoryId}/${filename}`;
          
          savedImages.push({
            order: result.order,
            prompt: result.prompt,
            url: `/uploads/${relativePath}`,
            path: relativePath
          });
          
          logger.backend.info('Image generated and saved', { 
            order: result.order,
            path: relativePath 
          });
        } catch (saveError) {
          logger.backend.error('Error saving generated image', { 
            error: saveError.message,
            order: result.order 
          });
          savedImages.push({
            order: result.order,
            prompt: result.prompt,
            success: false,
            error: saveError.message
          });
        }
      } else {
        // Handle failed generation
        logger.backend.warn('Image generation failed for prompt', { 
          order: result.order,
          error: result.error 
        });
        savedImages.push({
          order: result.order,
          prompt: result.prompt,
          success: false,
          error: result.error || 'Unknown error'
        });
      }
    }
    
    // Clean up temporary uploaded file
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
    }
    
    // Check if we have any successful generations
    const successfulImages = savedImages.filter(img => img.url);
    
    if (successfulImages.length === 0) {
      return res.status(500).json({ 
        error: 'Failed to generate any images. Please check your Gemini API configuration and prompts.',
        details: savedImages
      });
    }
    
    logger.backend.info('Image generation completed', { 
      subcategoryId,
      total: savedImages.length,
      successful: successfulImages.length 
    });
    
    res.json({
      success: true,
      images: savedImages,
      message: `Successfully generated ${successfulImages.length} out of ${savedImages.length} images`
    });
    
  } catch (error) {
    // Clean up temporary file on error
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      try {
        fs.unlinkSync(tempImagePath);
      } catch (cleanupError) {
        logger.backend.error('Error cleaning up temp file', { error: cleanupError.message });
      }
    }
    
    logger.backend.error('Error generating images', { 
      error: error.message, 
      stack: error.stack,
      subcategoryId: req.body.subcategoryId 
    });
    
    res.status(500).json({ 
      error: 'Failed to generate images',
      message: error.message 
    });
  }
});

module.exports = router;

