const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  hsnCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for faster searches
categorySchema.index({ name: 1 });
categorySchema.index({ hsnCode: 1 });

module.exports = mongoose.model('Category', categorySchema);

