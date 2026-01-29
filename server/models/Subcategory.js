const mongoose = require('mongoose');

const imageGenerationPromptSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  order: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  }
}, { _id: true });

const subcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  imageGenerationPrompts: {
    type: [imageGenerationPromptSchema],
    default: [],
    validate: {
      validator: function(prompts) {
        // Allow empty array or 6-10 prompts
        return prompts.length === 0 || (prompts.length >= 6 && prompts.length <= 10);
      },
      message: 'Subcategory must have 6-10 image generation prompts or none'
    }
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate subcategories in same category
subcategorySchema.index({ name: 1, category: 1 }, { unique: true });

// Index for faster queries
subcategorySchema.index({ category: 1 });

// Validate prompt orders are sequential
subcategorySchema.pre('save', function(next) {
  if (this.imageGenerationPrompts && this.imageGenerationPrompts.length > 0) {
    // Validate orders are unique and sequential
    const orders = this.imageGenerationPrompts.map(p => p.order).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        return next(new Error('Image generation prompt orders must be sequential starting from 1'));
      }
    }
  }
  next();
});

module.exports = mongoose.model('Subcategory', subcategorySchema);

