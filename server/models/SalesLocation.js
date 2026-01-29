const mongoose = require('mongoose');

const salesLocationSchema = new mongoose.Schema({
  salesChannel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesChannel',
    required: true
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  code: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound unique index on (salesChannel, location) - prevent duplicates
salesLocationSchema.index({ salesChannel: 1, location: 1 }, { unique: true });
salesLocationSchema.index({ code: 1 });
salesLocationSchema.index({ name: 1 });
salesLocationSchema.index({ salesChannel: 1 });
salesLocationSchema.index({ location: 1 });
salesLocationSchema.index({ isActive: 1 });

module.exports = mongoose.model('SalesLocation', salesLocationSchema);

