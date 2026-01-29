import React, { useState, useEffect } from 'react';
import { purchaseOrdersAPI, suppliersAPI, productsAPI, pricesAPI } from '../services/api';
import './PurchaseOrders.css';

function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productPrices, setProductPrices] = useState({}); // Map of productId -> price
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [formData, setFormData] = useState({
    supplier: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    status: 'pending',
    items: [],
    tax: 0,
    notes: '',
  });
  const [newItem, setNewItem] = useState({
    product: '',
    quantity: 1,
    unitPrice: 0,
  });

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrdersAPI.getAll();
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      alert('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'tax' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleAddItem = () => {
    if (!newItem.product || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      alert('Please fill in all item fields');
      return;
    }
    const product = products.find((p) => p._id === newItem.product);
    const item = {
      product: newItem.product,
      quantity: parseFloat(newItem.quantity),
      unitPrice: parseFloat(newItem.unitPrice),
      total: parseFloat(newItem.quantity) * parseFloat(newItem.unitPrice),
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
    setNewItem({ product: '', quantity: 1, unitPrice: 0 });
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + (formData.tax || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }
    try {
      const data = {
        ...formData,
        subtotal: calculateSubtotal(),
        total: calculateTotal(),
      };
      if (editingPO) {
        await purchaseOrdersAPI.update(editingPO._id, data);
      } else {
        await purchaseOrdersAPI.create(data);
      }
      setShowModal(false);
      setEditingPO(null);
      resetForm();
      fetchPurchaseOrders();
    } catch (error) {
      console.error('Error saving purchase order:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
        formData: formData
      });
      alert(error.response?.data?.error || 'Failed to save purchase order');
    }
  };

  const handleEdit = (po) => {
    setEditingPO(po);
    setFormData({
      supplier: po.supplier._id || po.supplier,
      orderDate: po.orderDate ? new Date(po.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      expectedDeliveryDate: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0] : '',
      status: po.status,
      items: po.items || [],
      tax: po.tax || 0,
      notes: po.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) {
      return;
    }
    try {
      await purchaseOrdersAPI.delete(id);
      fetchPurchaseOrders();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
        purchaseOrderId: id
      });
      alert('Failed to delete purchase order');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      status: 'pending',
      items: [],
      tax: 0,
      notes: '',
    });
    setNewItem({ product: '', quantity: 1, unitPrice: 0 });
  };

  const openAddModal = () => {
    setEditingPO(null);
    resetForm();
    setShowModal(true);
  };

  return (
    <div className="purchase-orders-container">
      <div className="purchase-orders-header">
        <h1>Purchase Orders</h1>
        <button className="btn-primary" onClick={openAddModal}>
          + Create Purchase Order
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading purchase orders...</div>
      ) : (
        <div className="purchase-orders-table-container">
          <table className="purchase-orders-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Status</th>
                <th>Items</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po._id}>
                    <td>{po.poNumber}</td>
                    <td>{po.supplier?.name || '-'}</td>
                    <td>{new Date(po.orderDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge status-${po.status}`}>
                        {po.status}
                      </span>
                    </td>
                    <td>{po.items?.length || 0}</td>
                    <td>₹{po.total?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(po)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(po._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>{editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier *</label>
                  <select
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Order Date *</label>
                  <input
                    type="date"
                    name="orderDate"
                    value={formData.orderDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Expected Delivery Date</label>
                  <input
                    type="date"
                    name="expectedDeliveryDate"
                    value={formData.expectedDeliveryDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="items-section">
                <h3>Items</h3>
                <div className="add-item-form">
                  <select
                    value={newItem.product}
                    onChange={(e) => {
                      const productId = e.target.value;
                      const price = productPrices[productId];
                      setNewItem({
                        ...newItem,
                        product: productId,
                        unitPrice: price ? price.salesPrice : 0,
                      });
                    }}
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => {
                      const price = productPrices[product._id];
                      const salesPrice = price ? price.salesPrice : 0;
                      return (
                        <option key={product._id} value={product._id}>
                          {product.title || product.name} - ₹{salesPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </option>
                      );
                    })}
                  </select>
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={newItem.quantity}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    min="1"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Unit Price (₹)"
                    value={newItem.unitPrice}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        unitPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    min="0"
                  />
                  <button type="button" onClick={handleAddItem} className="btn-add-item">
                    Add Item
                  </button>
                </div>

                <div className="items-list">
                  {formData.items.map((item, index) => {
                    const product = products.find((p) => p._id === item.product);
                    return (
                      <div key={index} className="item-row">
                        <span>{product?.title || product?.name || 'Unknown'}</span>
                        <span>Qty: {item.quantity}</span>
                        <span>₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span>₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="btn-remove-item"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tax</label>
                  <input
                    type="number"
                    step="0.01"
                    name="tax"
                    value={formData.tax}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Subtotal</label>
                  <input
                    type="text"
                    value={`₹${calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Total</label>
                  <input
                    type="text"
                    value={`₹${calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    disabled
                    className="total-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingPO ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrders;

