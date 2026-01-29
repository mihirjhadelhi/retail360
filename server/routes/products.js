const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const logger = require('../utils/logger');
const { paginate } = require('../utils/pagination');
const { parseExcel, validateExcelData } = require('../utils/excelParser');
const { generateTemplate, exportToExcel } = require('../utils/excelGenerator');

// File management utilities
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'products');

// Ensure uploads directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Sanitize SKU for use as folder name
function sanitizeSkuForFolderName(sku) {
  if (!sku) return null;
  // Remove or replace invalid characters for folder names
  return sku.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// Get upload directory for a product
function getUploadDirectory(productId, sku) {
  ensureDirectoryExists(UPLOADS_DIR);
  if (sku) {
    const sanitizedSku = sanitizeSkuForFolderName(sku);
    return path.join(UPLOADS_DIR, sanitizedSku);
  } else {
    return path.join(UPLOADS_DIR, `_temp_${productId}`);
  }
}

// Move files from temp folder to SKU folder
async function moveTempImagesToSkuFolder(productId, sku) {
  try {
    const tempDir = path.join(UPLOADS_DIR, `_temp_${productId}`);
    const skuDir = path.join(UPLOADS_DIR, sanitizeSkuForFolderName(sku));
    
    if (!fs.existsSync(tempDir)) {
      return; // No temp folder to move
    }
    
    ensureDirectoryExists(skuDir);
    
    const files = fs.readdirSync(tempDir);
    const movedFiles = [];
    
    for (const file of files) {
      const sourcePath = path.join(tempDir, file);
      const destPath = path.join(skuDir, file);
      fs.renameSync(sourcePath, destPath);
      movedFiles.push(`products/${sanitizeSkuForFolderName(sku)}/${file}`);
    }
    
    // Remove temp directory
    fs.rmdirSync(tempDir);
    
    // Update product images paths
    const product = await Product.findById(productId);
    if (product && product.images) {
      product.images = product.images.map(img => {
        if (img.startsWith(`products/_temp_${productId}/`)) {
          return img.replace(`products/_temp_${productId}/`, `products/${sanitizeSkuForFolderName(sku)}/`);
        }
        return img;
      });
      await product.save();
    }
    
    logger.backend.info('Moved temp images to SKU folder', { productId, sku, movedFiles: movedFiles.length });
    return movedFiles;
  } catch (error) {
    logger.backend.error('Error moving temp images to SKU folder', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Configure multer for image uploads with disk storage
// We'll create a dynamic storage function that can be configured per route
function createImageStorage(productId, sku) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = getUploadDirectory(productId, sku);
      ensureDirectoryExists(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
      cb(null, `${name}_${timestamp}${ext}`);
    }
  });
}

// File filter for images only
const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (jpg, jpeg, png, gif, webp) are allowed.'), false);
  }
};

// Configure multer for image uploads - will be configured dynamically per route
function getImageUploadMiddleware(productId, sku) {
  return multer({
    storage: createImageStorage(productId, sku),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per image
    fileFilter: imageFilter
  });
}

// Configure multer for Excel uploads (keep memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to generate next sequential serial number
async function generateNextSerialNumber() {
  try {
    // Find the maximum slno value in the Product collection
    const maxProduct = await Product.findOne({ slno: { $exists: true, $ne: null } })
      .sort({ slno: -1 })
      .select('slno')
      .lean();
    
    // If no products exist or no slno found, return 1
    if (!maxProduct || maxProduct.slno === null || maxProduct.slno === undefined) {
      return 1;
    }
    
    // Return the next sequential number
    return maxProduct.slno + 1;
  } catch (error) {
    logger.backend.error('Error generating next serial number', { error: error.message, stack: error.stack });
    // On error, default to 1 to ensure we can still create products
    return 1;
  }
}

// GET all products (with pagination)
// GET product count
router.get('/count', async (req, res) => {
  try {
    const { search, category, subCategory, brandName } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { ean: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { hsnCode: { $regex: search, $options: 'i' } },
        { manufacturerName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (subCategory) {
      query.subCategory = subCategory;
    }
    
    if (brandName) {
      query.brandName = brandName;
    }
    
    const count = await Product.countDocuments(query);
    res.json({ count });
  } catch (error) {
    logger.backend.error('Error counting products', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, category, subCategory, brandName, page, limit } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { ean: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { hsnCode: { $regex: search, $options: 'i' } },
        { manufacturerName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (subCategory) {
      query.subCategory = subCategory;
    }
    
    if (brandName) {
      query.brandName = brandName;
    }
    
    // Use pagination if page/limit provided, otherwise return all
    if (page || limit) {
      const result = await paginate(Product, query, {
        page: page || 1,
        limit: limit || 25,
        sort: { createdAt: -1 },
        populate: [
          { path: 'category', select: 'name hsnCode' },
          { path: 'subCategory', select: 'name category', populate: { path: 'category', select: 'name hsnCode' } }
        ]
      });
      res.json(result);
    } else {
      const products = await Product.find(query)
        .populate('category', 'name hsnCode')
        .populate({ path: 'subCategory', select: 'name category', populate: { path: 'category', select: 'name hsnCode' } })
        .sort({ createdAt: -1 });
      res.json(products);
    }
  } catch (error) {
    logger.backend.error('Error fetching products', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

// GET Excel template (must be before /:id route)
router.get('/template', (req, res) => {
  try {
    logger.backend.info('Generating product template');
    const headers = [
      { key: 'slno', label: 'SL No' },
      { key: 'parentSkuOrAsin', label: 'Parent SKU/ASIN' },
      { key: 'variation', label: 'Variation' },
      { key: 'sku', label: 'SKU *' },
      { key: 'ean', label: 'EAN' },
      { key: 'category', label: 'Category' },
      { key: 'subCategory', label: 'Sub Category' },
      { key: 'brandName', label: 'Brand Name' },
      { key: 'title', label: 'Title' },
      { key: 'name', label: 'Name *' },
      { key: 'colour', label: 'Colour' },
      { key: 'material', label: 'Material' },
      { key: 'size', label: 'Size' },
      { key: 'hsnCode', label: 'HSN Code' },
      { key: 'description', label: 'Description' },
      { key: 'manufacturerName', label: 'Manufacturer Name' },
      { key: 'contactDetails', label: 'Contact Details' },
      { key: 'bulletPoint1', label: 'Bullet Point 1' },
      { key: 'bulletPoint2', label: 'Bullet Point 2' },
      { key: 'bulletPoint3', label: 'Bullet Point 3' },
      { key: 'bulletPoint4', label: 'Bullet Point 4' },
      { key: 'bulletPoint5', label: 'Bullet Point 5' },
      { key: 'productDimensionLength', label: 'Product Dimension Length (cm)' },
      { key: 'productDimensionWidth', label: 'Product Dimension Width (cm)' },
      { key: 'productDimensionHeight', label: 'Product Dimension Height (cm)' },
      { key: 'packageDimensionLength', label: 'Package Dimension Length (cm)' },
      { key: 'packageDimensionWidth', label: 'Package Dimension Width (cm)' },
      { key: 'packageDimensionHeight', label: 'Package Dimension Height (cm)' },
      { key: 'weight', label: 'Weight (kg)' },
      { key: 'shape', label: 'Shape' },
      { key: 'specialFeature', label: 'Special Feature' },
      { key: 'images', label: 'Images (comma-separated URLs)' }
    ];
    
    logger.backend.info('Calling generateTemplate with', { headerCount: headers.length });
    const buffer = generateTemplate(headers);
    logger.backend.info('Template generated, buffer size:', buffer.length);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=products_template.xlsx');
    res.send(buffer);
  } catch (error) {
    logger.backend.error('Error generating product template', { 
      error: error.message, 
      stack: error.stack,
      name: error.name
    });
    console.error('Template generation error:', error);
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    // Prevent matching special routes
    if (req.params.id === 'template' || req.params.id === 'import') {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    const product = await Product.findById(req.params.id)
      .populate('category', 'name hsnCode')
      .populate({ path: 'subCategory', select: 'name category', populate: { path: 'category', select: 'name hsnCode' } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST upload images for a product
router.post('/:id/images', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const sku = product.sku || null;
    const uploadMiddleware = getImageUploadMiddleware(productId, sku);
    
    uploadMiddleware.array('images', 10)(req, res, async (err) => {
      if (err) {
        logger.backend.error('Multer error', { error: err.message });
        return res.status(400).json({ error: err.message });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images uploaded' });
      }
      
      const imagePaths = req.files.map(file => {
        const relativePath = sku 
          ? `products/${sanitizeSkuForFolderName(sku)}/${file.filename}`
          : `products/_temp_${productId}/${file.filename}`;
        return relativePath;
      });
      
      // Add new image paths to existing images array
      if (!product.images) {
        product.images = [];
      }
      product.images = [...product.images, ...imagePaths];
      await product.save();
      
      res.json({ 
        success: true, 
        images: imagePaths,
        message: `${imagePaths.length} image(s) uploaded successfully`
      });
    });
  } catch (error) {
    logger.backend.error('Error uploading images', { error: error.message, stack: error.stack });
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          logger.backend.error('Error cleaning up file on error', { error: err.message });
        }
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST create product
router.post('/', async (req, res) => {
  try {
    // Check if slno is provided, if not auto-generate it
    if (!req.body.slno || req.body.slno === '' || req.body.slno === null || req.body.slno === undefined) {
      req.body.slno = await generateNextSerialNumber();
    }
    
    const product = new Product(req.body);
    await product.save();
    
    // If SKU was added and there are temp images, move them
    if (product.sku && product.images && product.images.some(img => img.includes('_temp_'))) {
      try {
        await moveTempImagesToSkuFolder(product._id.toString(), product.sku);
      } catch (error) {
        logger.backend.error('Error moving temp images after product creation', { error: error.message });
        // Don't fail product creation if image move fails
      }
    }
    
    res.status(201).json(product);
  } catch (error) {
    logger.backend.error('Error creating product', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      code: error.code
    });
    if (error.code === 11000) {
      res.status(400).json({ error: 'SKU already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// PUT update product
router.put('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const oldProduct = await Product.findById(productId);
    
    if (!oldProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const oldSku = oldProduct.sku;
    const newSku = req.body.sku;
    
    // Update product
    const product = await Product.findByIdAndUpdate(
      productId,
      req.body,
      { new: true, runValidators: true }
    );
    
    // If SKU changed from empty to value, or from one value to another, move images
    if (newSku && newSku !== oldSku) {
      try {
        // If old SKU was empty, move from temp folder
        if (!oldSku) {
          await moveTempImagesToSkuFolder(productId, newSku);
        } else {
          // If SKU changed, move from old SKU folder to new SKU folder
          const oldSkuDir = path.join(UPLOADS_DIR, sanitizeSkuForFolderName(oldSku));
          const newSkuDir = path.join(UPLOADS_DIR, sanitizeSkuForFolderName(newSku));
          
          if (fs.existsSync(oldSkuDir)) {
            ensureDirectoryExists(newSkuDir);
            const files = fs.readdirSync(oldSkuDir);
            
            for (const file of files) {
              const sourcePath = path.join(oldSkuDir, file);
              const destPath = path.join(newSkuDir, file);
              fs.renameSync(sourcePath, destPath);
            }
            
            // Update image paths in product
            if (product.images) {
              product.images = product.images.map(img => {
                if (img.startsWith(`products/${sanitizeSkuForFolderName(oldSku)}/`)) {
                  return img.replace(
                    `products/${sanitizeSkuForFolderName(oldSku)}/`,
                    `products/${sanitizeSkuForFolderName(newSku)}/`
                  );
                }
                return img;
              });
              await product.save();
            }
            
            // Remove old SKU directory
            fs.rmdirSync(oldSkuDir);
          }
        }
      } catch (error) {
        logger.backend.error('Error moving images after SKU update', { error: error.message });
        // Don't fail product update if image move fails
      }
    }
    
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST import products from Excel
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { mode = 'both' } = req.body; // 'create', 'update', or 'both'
    const fileBuffer = req.file.buffer;
    
    // Parse Excel file
    const excelData = parseExcel(fileBuffer);
    
    if (excelData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Validate data
    const schema = {
      required: ['name'],
      types: {
        weight: 'number',
        slno: 'number'
      },
      unique: ['sku']
    };
    
    const validation = validateExcelData(excelData, schema);
    
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    // Process each row
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      const rowNum = i + 2; // +2 for header row and 0-index

      try {
        // Map Excel columns to product fields
        const productData = {
          slno: row['SL No'] ? parseInt(row['SL No']) : undefined,
          parentSkuOrAsin: row['Parent SKU/ASIN'] || '',
          variation: row['Variation'] || '',
          sku: row['SKU *'] || '',
          ean: row['EAN'] || '',
          category: row['Category'] || '',
          subCategory: row['Sub Category'] || '',
          brandName: row['Brand Name'] || '',
          title: row['Title'] || '',
          name: row['Name *'] || '',
          colour: row['Colour'] || '',
          material: row['Material'] || '',
          size: row['Size'] || '',
          hsnCode: row['HSN Code'] || '',
          description: row['Description'] || '',
          manufacturerName: row['Manufacturer Name'] || '',
          contactDetails: row['Contact Details'] || '',
          bulletPoints: [
            row['Bullet Point 1'] || '',
            row['Bullet Point 2'] || '',
            row['Bullet Point 3'] || '',
            row['Bullet Point 4'] || '',
            row['Bullet Point 5'] || ''
          ].filter(bp => bp),
          productDimensionCm: {
            length: row['Product Dimension Length (cm)'] ? parseFloat(row['Product Dimension Length (cm)']) : undefined,
            width: row['Product Dimension Width (cm)'] ? parseFloat(row['Product Dimension Width (cm)']) : undefined,
            height: row['Product Dimension Height (cm)'] ? parseFloat(row['Product Dimension Height (cm)']) : undefined
          },
          packageDimensionCm: {
            length: row['Package Dimension Length (cm)'] ? parseFloat(row['Package Dimension Length (cm)']) : undefined,
            width: row['Package Dimension Width (cm)'] ? parseFloat(row['Package Dimension Width (cm)']) : undefined,
            height: row['Package Dimension Height (cm)'] ? parseFloat(row['Package Dimension Height (cm)']) : undefined
          },
          weight: row['Weight (kg)'] ? parseFloat(row['Weight (kg)']) : undefined,
          shape: row['Shape'] || '',
          specialFeature: row['Special Feature'] || '',
          images: row['Images (comma-separated URLs)'] ? row['Images (comma-separated URLs)'].split(',').map(url => url.trim()) : []
        };

        // Remove undefined values
        Object.keys(productData).forEach(key => {
          if (productData[key] === undefined) delete productData[key];
        });

        // Clean up dimension objects
        if (productData.productDimensionCm && Object.values(productData.productDimensionCm).every(v => v === undefined)) {
          delete productData.productDimensionCm;
        }
        if (productData.packageDimensionCm && Object.values(productData.packageDimensionCm).every(v => v === undefined)) {
          delete productData.packageDimensionCm;
        }

        if (!productData.name) {
          errors.push({
            row: rowNum,
            field: 'name',
            message: 'Name is required',
            data: row
          });
          failed++;
          continue;
        }

        // Check if product exists (by SKU or name)
        let existingProduct = null;
        if (productData.sku) {
          existingProduct = await Product.findOne({ sku: productData.sku });
        }
        if (!existingProduct && productData.name) {
          existingProduct = await Product.findOne({ name: productData.name });
        }

        if (existingProduct) {
          if (mode === 'create') {
            errors.push({
              row: rowNum,
              field: 'sku',
              message: 'Product already exists',
              data: row
            });
            failed++;
            continue;
          }
          // Update existing
          await Product.findByIdAndUpdate(existingProduct._id, productData, { runValidators: true });
          updated++;
        } else {
          if (mode === 'update') {
            errors.push({
              row: rowNum,
              field: 'sku',
              message: 'Product not found for update',
              data: row
            });
            failed++;
            continue;
          }
          // Create new
          const product = new Product(productData);
          await product.save();
          imported++;
        }
      } catch (error) {
        errors.push({
          row: rowNum,
          field: 'general',
          message: error.message,
          data: row
        });
        failed++;
      }
    }

    res.json({
      success: true,
      imported,
      updated,
      failed,
      errors: errors.slice(0, 100) // Limit errors to first 100
    });
  } catch (error) {
    logger.backend.error('Error importing products', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

