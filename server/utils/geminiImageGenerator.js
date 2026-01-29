const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Convert image file to base64
function imageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    logger.backend.error('Error converting image to base64', { error: error.message, imagePath });
    throw new Error(`Failed to convert image to base64: ${error.message}`);
  }
}

// Get MIME type from file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

// Generate a single image using Gemini API
async function generateSingleImage(imagePath, prompt, useProModel = false) {
  try {
    const genAI = getGeminiClient();
    
    // Use image generation models: gemini-2.5-flash-image (fast) or gemini-3-pro-image-preview (pro)
    const modelName = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Convert image to base64 for reference
    const imageBase64 = imageToBase64(imagePath);
    const mimeType = getMimeType(imagePath);
    
    // Prepare the full prompt that includes reference to the uploaded image
    // The prompt should guide the model to generate an image similar to the uploaded one
    const fullPrompt = `Based on the uploaded product image, ${prompt}. Generate a high-quality product image that matches the style and quality of the reference image.`;
    
    // For image generation with reference image, we use the Files API approach
    // First, upload the image file, then use it in the generation request
    // For now, we'll use inline data approach for smaller images
    
    // Generate image using the image generation model
    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      },
      {
        text: fullPrompt
      }
    ]);
    
    const response = await result.response;
    
    // Check if response contains image data
    // Gemini image generation models return images in the response
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const candidate = candidates[0];
      
      // Extract image data from response
      // The exact structure may vary, so we need to handle different response formats
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            return {
              success: true,
              imageData: part.inlineData.data,
              mimeType: part.inlineData.mimeType,
              prompt: prompt
            };
          }
        }
      }
    }
    
    // Fallback: if no image data found, return text response
    // This might happen if the API returns a different format
    const text = response.text();
    logger.backend.warn('Gemini API returned text instead of image', { prompt, text: text.substring(0, 100) });
    
    return {
      success: true,
      text: text,
      prompt: prompt,
      note: 'API returned text description instead of image'
    };
  } catch (error) {
    logger.backend.error('Error generating image with Gemini', { 
      error: error.message, 
      stack: error.stack,
      prompt 
    });
    throw new Error(`Failed to generate image: ${error.message}`);
  }
}

// Generate multiple images using multiple prompts
async function generateMultipleImages(imagePath, prompts) {
  try {
    if (!prompts || prompts.length === 0) {
      throw new Error('No prompts provided');
    }
    
    if (prompts.length < 6 || prompts.length > 10) {
      throw new Error('Must provide 6-10 prompts');
    }
    
    const results = [];
    
    // Generate images sequentially to avoid rate limiting
    for (let i = 0; i < prompts.length; i++) {
      const promptObj = prompts[i];
      logger.backend.info(`Generating image ${i + 1}/${prompts.length}`, { 
        order: promptObj.order 
      });
      
      try {
        const result = await generateSingleImage(imagePath, promptObj.prompt);
        results.push({
          order: promptObj.order,
          prompt: promptObj.prompt,
          success: true,
          data: result
        });
        
        // Add a small delay to avoid rate limiting
        if (i < prompts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        logger.backend.error(`Error generating image for prompt ${i + 1}`, { 
          error: error.message,
          order: promptObj.order 
        });
        results.push({
          order: promptObj.order,
          prompt: promptObj.prompt,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    logger.backend.error('Error generating multiple images', { error: error.message });
    throw error;
  }
}

// Save generated image data to file
function saveGeneratedImage(imageData, outputPath, type) {
  try {
    ensureDirectoryExists(path.dirname(outputPath));
    
    let buffer;
    
    // Handle different image data formats
    if (typeof imageData === 'string') {
      // Base64 string (with or without data URI prefix)
      if (imageData.startsWith('data:image')) {
        const base64Data = imageData.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        // Plain base64 string
        buffer = Buffer.from(imageData, 'base64');
      }
    } else if (Buffer.isBuffer(imageData)) {
      buffer = imageData;
    } else {
      logger.backend.warn('Received non-image data from Gemini', { type, outputPath, dataType: typeof imageData });
      throw new Error('Invalid image data format received from Gemini API');
    }
    
    fs.writeFileSync(outputPath, buffer);
    logger.backend.info('Generated image saved', { outputPath, type, size: buffer.length });
    
    return outputPath;
  } catch (error) {
    logger.backend.error('Error saving generated image', { error: error.message, outputPath });
    throw new Error(`Failed to save generated image: ${error.message}`);
  }
}

// Ensure directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = {
  getGeminiClient,
  imageToBase64,
  generateSingleImage,
  generateMultipleImages,
  saveGeneratedImage,
  getMimeType
};

