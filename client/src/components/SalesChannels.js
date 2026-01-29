import React, { useState, useEffect } from 'react';
import { salesChannelsAPI } from '../services/api';
import './SalesChannels.css';

function SalesChannels() {
  const [salesChannels, setSalesChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'other',
    commissionRate: 0,
    paymentTerms: '',
    isActive: true,
  });

  useEffect(() => {
    fetchSalesChannels();
  }, []);

  const fetchSalesChannels = async () => {
    try {
      setLoading(true);
      const response = await salesChannelsAPI.getAll({ search: searchTerm, isActive: 'true' });
      setSalesChannels(response.data);
    } catch (error) {
      console.error('Error fetching sales channels:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      alert('Failed to fetch sales channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchSalesChannels();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'commissionRate' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingChannel) {
        await salesChannelsAPI.update(editingChannel._id, formData);
      } else {
        await salesChannelsAPI.create(formData);
      }
      setShowModal(false);
      setEditingChannel(null);
      resetForm();
      fetchSalesChannels();
    } catch (error) {
      console.error('Error saving sales channel:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
        formData: formData
      });
      alert(error.response?.data?.error || 'Failed to save sales channel');
    }
  };

  const handleEdit = (channel) => {
    setEditingChannel(channel);
    setFormData({
      code: channel.code || '',
      name: channel.name || '',
      description: channel.description || '',
      type: channel.type || 'other',
      commissionRate: channel.commissionRate || 0,
      paymentTerms: channel.paymentTerms || '',
      isActive: channel.isActive !== undefined ? channel.isActive : true,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this sales channel?')) {
      return;
    }
    try {
      await salesChannelsAPI.delete(id);
      fetchSalesChannels();
    } catch (error) {
      console.error('Error deleting sales channel:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
        channelId: id
      });
      alert('Failed to delete sales channel');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'other',
      commissionRate: 0,
      paymentTerms: '',
      isActive: true,
    });
  };

  const openAddModal = () => {
    setEditingChannel(null);
    resetForm();
    setShowModal(true);
  };

  return (
    <div className="sales-channels-container">
      <div className="sales-channels-header">
        <h1>Sales Channels</h1>
        <button className="btn-primary" onClick={openAddModal}>
          + Add Sales Channel
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search sales channels by name, code, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Loading sales channels...</div>
      ) : (
        <div className="sales-channels-table-container">
          <table className="sales-channels-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Commission Rate</th>
                <th>Payment Terms</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesChannels.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">
                    No sales channels found
                  </td>
                </tr>
              ) : (
                salesChannels.map((channel) => (
                  <tr key={channel._id}>
                    <td>{channel.code}</td>
                    <td>{channel.name}</td>
                    <td>
                      <span className="type-badge type-{channel.type}">
                        {channel.type}
                      </span>
                    </td>
                    <td>{channel.commissionRate}%</td>
                    <td>{channel.paymentTerms || '-'}</td>
                    <td>
                      <span className={`status-badge ${channel.isActive ? 'active' : 'inactive'}`}>
                        {channel.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(channel)}
                      >
                        Edit
                      </button>
                      {channel.isActive && (
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(channel._id)}
                        >
                          Deactivate
                        </button>
                      )}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingChannel ? 'Edit Sales Channel' : 'Add Sales Channel'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Code *</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    disabled={!!editingChannel}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="online">Online</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="marketplace">Marketplace</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    name="commissionRate"
                    value={formData.commissionRate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Payment Terms</label>
                <input
                  type="text"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingChannel ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesChannels;

