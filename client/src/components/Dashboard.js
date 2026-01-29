import React, { useState, useEffect } from 'react';
import { productsAPI, purchaseOrdersAPI, purchasesAPI, stockAPI, shipmentsAPI, salesAPI } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    pendingPOs: 0,
    totalPurchases: 0,
    totalShipments: 0,
    pendingShipments: 0,
    totalSales: 0,
    pendingSales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Use Promise.allSettled to handle individual API failures gracefully
      const [
        productsResult,
        poResult,
        purchasesResult,
        lowStockResult,
        shipmentsResult,
        pendingShipmentsResult,
        salesResult,
        pendingSalesResult
      ] = await Promise.allSettled([
        productsAPI.getCount(),
        purchaseOrdersAPI.getAll({ status: 'pending' }),
        purchasesAPI.getAll(),
        stockAPI.getLowStock(),
        shipmentsAPI.getAll(),
        shipmentsAPI.getAll({ status: 'pending' }),
        salesAPI.getAll(),
        salesAPI.getAll({ orderStatus: 'pending' }),
      ]);

      // Extract responses, handling both fulfilled and rejected promises
      const productsRes = productsResult.status === 'fulfilled' ? productsResult.value : null;
      const poRes = poResult.status === 'fulfilled' ? poResult.value : null;
      const purchasesRes = purchasesResult.status === 'fulfilled' ? purchasesResult.value : null;
      const lowStockRes = lowStockResult.status === 'fulfilled' ? lowStockResult.value : null;
      const shipmentsRes = shipmentsResult.status === 'fulfilled' ? shipmentsResult.value : null;
      const pendingShipmentsRes = pendingShipmentsResult.status === 'fulfilled' ? pendingShipmentsResult.value : null;
      const salesRes = salesResult.status === 'fulfilled' ? salesResult.value : null;
      const pendingSalesRes = pendingSalesResult.status === 'fulfilled' ? pendingSalesResult.value : null;

      // Log any failed API calls
      if (productsResult.status === 'rejected') console.error('Dashboard: Products API failed:', productsResult.reason);
      if (poResult.status === 'rejected') console.error('Dashboard: Purchase Orders API failed:', poResult.reason);
      if (purchasesResult.status === 'rejected') console.error('Dashboard: Purchases API failed:', purchasesResult.reason);
      if (lowStockResult.status === 'rejected') console.error('Dashboard: Low Stock API failed:', lowStockResult.reason);
      if (shipmentsResult.status === 'rejected') console.error('Dashboard: Shipments API failed:', shipmentsResult.reason);
      if (pendingShipmentsResult.status === 'rejected') console.error('Dashboard: Pending Shipments API failed:', pendingShipmentsResult.reason);
      if (salesResult.status === 'rejected') console.error('Dashboard: Sales API failed:', salesResult.reason);
      if (pendingSalesResult.status === 'rejected') console.error('Dashboard: Pending Sales API failed:', pendingSalesResult.reason);

      // Log raw responses for debugging
      console.log('Dashboard raw API responses:', {
        productsRes: productsRes?.data,
        productsResType: typeof productsRes?.data,
        productsResIsArray: Array.isArray(productsRes?.data),
      });

      // Helper function to extract data from response
      const extractData = (response, name = 'unknown') => {
        if (!response) {
          console.warn(`Dashboard: ${name} - No response object`);
          return [];
        }
        
        if (!response.data) {
          console.warn(`Dashboard: ${name} - No response.data`);
          return [];
        }
        
        const data = response.data;
        
        // Log the actual structure for debugging
        console.log(`Dashboard: ${name} response structure:`, {
          isArray: Array.isArray(data),
          hasPagination: !!data.pagination,
          hasDataProperty: !!data.data,
          dataType: typeof data,
          keys: Object.keys(data || {}),
          sample: Array.isArray(data) ? `Array(${data.length})` : (data.pagination ? 'Paginated' : 'Other')
        });
        
        // Check if it's a paginated response
        if (data.pagination && Array.isArray(data.data)) {
          console.log(`Dashboard: ${name} - Using paginated data, count: ${data.data.length}`);
          return data.data;
        }
        
        // Check if it's a direct array
        if (Array.isArray(data)) {
          console.log(`Dashboard: ${name} - Using direct array, count: ${data.length}`);
          return data;
        }
        
        // Fallback: return empty array
        console.warn(`Dashboard: ${name} - Unknown response structure, returning empty array`);
        return [];
      };

      // Extract product count (special handling for count endpoint)
      let productCount = 0;
      if (productsRes && productsRes.data) {
        if (typeof productsRes.data.count === 'number') {
          productCount = productsRes.data.count;
          console.log(`Dashboard: products - Using count endpoint, count: ${productCount}`);
        } else {
          // Fallback to array length if count property doesn't exist
          const products = extractData(productsRes, 'products');
          productCount = products.length;
        }
      }

      const lowStock = extractData(lowStockRes, 'lowStock');
      const shipments = extractData(shipmentsRes, 'shipments');
      const pendingShipments = extractData(pendingShipmentsRes, 'pendingShipments');
      const sales = extractData(salesRes, 'sales');
      const pendingSales = extractData(pendingSalesRes, 'pendingSales');
      const pendingPOs = extractData(poRes, 'pendingPOs');
      const purchases = extractData(purchasesRes, 'purchases');

      console.log('Dashboard final counts:', {
        products: productCount,
        lowStock: lowStock.length,
        pendingPOs: pendingPOs.length,
        purchases: purchases.length,
        shipments: shipments.length,
        pendingShipments: pendingShipments.length,
        sales: sales.length,
        pendingSales: pendingSales.length,
      });

      setStats({
        totalProducts: productCount || 0,
        lowStockCount: lowStock.length || 0,
        pendingPOs: pendingPOs.length || 0,
        totalPurchases: purchases.length || 0,
        totalShipments: shipments.length || 0,
        pendingShipments: pendingShipments.length || 0,
        totalSales: sales.length || 0,
        pendingSales: pendingSales.length || 0,
      });

      setLowStockItems(lowStock.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        stack: error.stack
      });
      // Set all stats to 0 on error to prevent showing stale data
      setStats({
        totalProducts: 0,
        lowStockCount: 0,
        pendingPOs: 0,
        totalPurchases: 0,
        totalShipments: 0,
        pendingShipments: 0,
        totalSales: 0,
        pendingSales: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>{stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <h3>{stats.lowStockCount}</h3>
            <p>Low Stock Items</p>
          </div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>{stats.pendingPOs}</h3>
            <p>Pending POs</p>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>{stats.totalPurchases}</h3>
            <p>Total Purchases</p>
          </div>
        </div>
        
        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-icon">🚚</div>
          <div className="stat-info">
            <h3>{stats.totalShipments}</h3>
            <p>Total Shipments</p>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon">📤</div>
          <div className="stat-info">
            <h3>{stats.pendingShipments}</h3>
            <p>Pending Shipments</p>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">🛒</div>
          <div className="stat-info">
            <h3>{stats.totalSales}</h3>
            <p>Total Sales</p>
          </div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{stats.pendingSales}</h3>
            <p>Pending Sales</p>
          </div>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="low-stock-section">
          <h2>Low Stock Alerts</h2>
          <div className="low-stock-list">
            {lowStockItems.map((stockItem) => (
              <div key={stockItem._id} className="low-stock-item">
                <span className="product-name">
                  {stockItem.product?.title || stockItem.product?.name || 'Unknown'} - {stockItem.location?.name || 'Unknown'}
                </span>
                <span className="stock-info">
                  Stock: {stockItem.quantity} / Min: {stockItem.minStockLevel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

