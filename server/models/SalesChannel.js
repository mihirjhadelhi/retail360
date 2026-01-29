const mongoose = require('mongoose');

const salesChannelSchema = new mongoose.Schema({
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
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['online', 'retail', 'wholesale', 'marketplace', 'other'],
    default: 'other'
  },
  commissionRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  paymentTerms: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
salesChannelSchema.index({ code: 1 });
salesChannelSchema.index({ name: 1 });
salesChannelSchema.index({ type: 1 });
salesChannelSchema.index({ isActive: 1 });

module.exports = mongoose.model('SalesChannel', salesChannelSchema);

