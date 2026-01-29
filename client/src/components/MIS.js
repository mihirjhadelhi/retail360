import React, { useState } from 'react';
import SalesReport from './SalesReport';
import PurchaseReport from './PurchaseReport';
import './MIS.css';

function MIS() {
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <div className="mis-container">
      <div className="mis-header">
        <h1>Management Information System (MIS)</h1>
      </div>
      
      <div className="mis-tabs">
        <button
          className={activeTab === 'sales' ? 'mis-tab active' : 'mis-tab'}
          onClick={() => setActiveTab('sales')}
        >
          Sales Report
        </button>
        <button
          className={activeTab === 'purchases' ? 'mis-tab active' : 'mis-tab'}
          onClick={() => setActiveTab('purchases')}
        >
          Purchase Report
        </button>
      </div>
      
      <div className="mis-content">
        {activeTab === 'sales' && <SalesReport />}
        {activeTab === 'purchases' && <PurchaseReport />}
      </div>
    </div>
  );
}

export default MIS;

