const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  name: {
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
  }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  salesNumber: {
    type: String,
    unique: true,
    required: true
  },
  salesChannel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesChannel',
    required: true
  },
  salesLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesLocation',
    required: true
  },
  customer: {
    type: customerSchema,
    default: {}
  },
  salesDate: {
    type: Date,
    default: Date.now
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save hook to calculate totals
saleSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    this.total = this.subtotal - (this.discount || 0) + (this.tax || 0);
  }
  next();
});

// Post-save hook to deduct stock from warehouse location
saleSchema.post('save', async function() {
  try {
    const Stock = mongoose.model('Stock');
    const SalesLocation = mongoose.model('SalesLocation');
    
    // Get the warehouse location from sales location
    const salesLocation = await SalesLocation.findById(this.salesLocation).populate('location');
    if (!salesLocation || !salesLocation.location) {
      console.error('Sales location or warehouse location not found');
      return;
    }
    
    const warehouseLocation = salesLocation.location._id || salesLocation.location;
    
    // Deduct stock for each item
    for (const item of this.items) {
      const stock = await Stock.findOne({ product: item.product, location: warehouseLocation });
      
      if (!stock || stock.quantity < item.quantity) {
        console.error(`Insufficient stock for product ${item.product} at location ${warehouseLocation}`);
        // Note: In production, you might want to throw an error or handle this differently
      }
      
      await Stock.findOneAndUpdate(
        { product: item.product, location: warehouseLocation },
        { 
          $inc: { quantity: -item.quantity },
          $set: { lastUpdated: new Date() }
        },
        { upsert: false } // Don't create if doesn't exist
      );
    }
  } catch (error) {
    console.error('Error deducting stock quantities:', error);
  }
});

// Post-remove hook to reverse stock deduction
saleSchema.post(['findOneAndDelete', 'findOneAndRemove'], async function(doc) {
  if (!doc) return;
  
  try {
    const Stock = mongoose.model('Stock');
    const SalesLocation = mongoose.model('SalesLocation');
    
    // Get the warehouse location from sales location
    const salesLocation = await SalesLocation.findById(doc.salesLocation).populate('location');
    if (!salesLocation || !salesLocation.location) {
      console.error('Sales location or warehouse location not found');
      return;
    }
    
    const warehouseLocation = salesLocation.location._id || salesLocation.location;
    
    // Reverse stock deduction for each item
    for (const item of doc.items) {
      await Stock.findOneAndUpdate(
        { product: item.product, location: warehouseLocation },
        { 
          $inc: { quantity: item.quantity },
          $set: { lastUpdated: new Date() }
        },
        { upsert: false }
      );
    }
  } catch (error) {
    console.error('Error reversing stock quantities:', error);
  }
});

// Indexes
saleSchema.index({ salesNumber: 1 });
saleSchema.index({ salesChannel: 1 });
saleSchema.index({ salesLocation: 1 });
saleSchema.index({ salesDate: -1 });
saleSchema.index({ paymentStatus: 1 });
saleSchema.index({ orderStatus: 1 });

module.exports = mongoose.model('Sale', saleSchema);

