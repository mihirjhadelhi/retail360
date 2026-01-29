const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  minStockLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound unique index on (product, location)
stockSchema.index({ product: 1, location: 1 }, { unique: true });

// Indexes for faster queries
stockSchema.index({ product: 1 });
stockSchema.index({ location: 1 });
stockSchema.index({ quantity: 1 });

// Virtual for available quantity
stockSchema.virtual('availableQuantity').get(function() {
  return Math.max(0, this.quantity - this.reservedQuantity);
});

// Ensure virtuals are included in JSON
stockSchema.set('toJSON', { virtuals: true });

// Pre-save hook to update lastUpdated
stockSchema.pre('save', function(next) {
  if (this.isModified('quantity')) {
    this.lastUpdated = new Date();
  }
  next();
});

module.exports = mongoose.model('Stock', stockSchema);

