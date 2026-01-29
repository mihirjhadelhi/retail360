import React, { useState } from 'react';
import logger from './utils/logger';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Suppliers from './components/Suppliers';
import PurchaseOrders from './components/PurchaseOrders';
import Purchases from './components/Purchases';
import Locations from './components/Locations';
import Stock from './components/Stock';
import Prices from './components/Prices';
import SalesChannels from './components/SalesChannels';
import SalesLocations from './components/SalesLocations';
import Sales from './components/Sales';
import ShipmentVendors from './components/ShipmentVendors';
import ShippingCharges from './components/ShippingCharges';
import Shipments from './components/Shipments';
import MIS from './components/MIS';
import Categories from './components/Categories';
import Subcategories from './components/Subcategories';
import GeminiImageGenerator from './components/GeminiImageGenerator';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'suppliers':
        return <Suppliers />;
      case 'locations':
        return <Locations />;
      case 'stock':
        return <Stock />;
      case 'prices':
        return <Prices />;
      case 'sales-channels':
        return <SalesChannels />;
      case 'sales-locations':
        return <SalesLocations />;
      case 'sales':
        return <Sales />;
      case 'purchase-orders':
        return <PurchaseOrders />;
      case 'purchases':
        return <Purchases />;
      case 'shipment-vendors':
        return <ShipmentVendors />;
      case 'shipping-charges':
        return <ShippingCharges />;
      case 'shipments':
        return <Shipments />;
      case 'mis':
        return <MIS />;
      case 'categories':
        return <Categories />;
      case 'subcategories':
        return <Subcategories />;
      case 'gemini-image-generator':
        return <GeminiImageGenerator />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="App">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>RetailOS</h1>
        </div>
        <nav className="sidebar-nav">
          <button
            className={activeTab === 'dashboard' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={activeTab === 'products' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('products')}
          >
            📦 Products
          </button>
          <button
            className={activeTab === 'suppliers' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('suppliers')}
          >
            🏢 Suppliers
          </button>
          <button
            className={activeTab === 'locations' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('locations')}
          >
            🏭 Locations
          </button>
          <button
            className={activeTab === 'stock' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('stock')}
          >
            📊 Stock
          </button>
          <button
            className={activeTab === 'prices' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('prices')}
          >
            💵 Prices
          </button>
          <button
            className={activeTab === 'sales-channels' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('sales-channels')}
          >
            📡 Sales Channels
          </button>
          <button
            className={activeTab === 'sales-locations' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('sales-locations')}
          >
            📍 Sales Locations
          </button>
          <button
            className={activeTab === 'sales' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('sales')}
          >
            🛒 Sales
          </button>
          <button
            className={activeTab === 'purchase-orders' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('purchase-orders')}
          >
            📋 Purchase Orders
          </button>
          <button
            className={activeTab === 'purchases' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('purchases')}
          >
            💰 Purchases
          </button>
          <button
            className={activeTab === 'shipment-vendors' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('shipment-vendors')}
          >
            🚚 Shipment Vendors
          </button>
          <button
            className={activeTab === 'shipping-charges' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('shipping-charges')}
          >
            💳 Shipping Charges
          </button>
          <button
            className={activeTab === 'shipments' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('shipments')}
          >
            📦 Shipments
          </button>
          <button
            className={activeTab === 'mis' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('mis')}
          >
            📊 MIS Reports
          </button>
          <button
            className={activeTab === 'categories' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('categories')}
          >
            📁 Categories
          </button>
          <button
            className={activeTab === 'subcategories' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('subcategories')}
          >
            📂 Subcategories
          </button>
          <button
            className={activeTab === 'gemini-image-generator' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveTab('gemini-image-generator')}
          >
            🎨 Image Generator
          </button>
        </nav>
      </div>
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;

