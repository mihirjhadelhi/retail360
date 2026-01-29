const mongoose = require('mongoose');

const shipmentVendorSchema = new mongoose.Schema({
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
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true,
    default: 'India'
  },
  pincode: {
    type: String,
    trim: true
  },
  serviceTypes: [{
    type: String,
    trim: true
  }], // e.g., ['express', 'standard', 'overnight']
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for faster searches
shipmentVendorSchema.index({ code: 1 });
shipmentVendorSchema.index({ name: 1 });
shipmentVendorSchema.index({ isActive: 1 });
shipmentVendorSchema.index({ serviceTypes: 1 });

module.exports = mongoose.model('ShipmentVendor', shipmentVendorSchema);

