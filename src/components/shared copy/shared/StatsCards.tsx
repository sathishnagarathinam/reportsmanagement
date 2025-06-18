import React from 'react';

const StatsCards: React.FC = () => {
  return (
    <div className="stats-grid">
      <div className="stat-card primary">
        <h3>SB Accounts</h3>
        <p className="stat-value">123456</p>
      </div>
      <div className="stat-card">
        <h3>BD Revenue</h3>
        <p className="stat-value">₹24343</p>
      </div>
      <div className="stat-card">
        <h3>No.Aadhaar Trans</h3>
        <p className="stat-value">1259</p>
      </div>
      <div className="stat-card">
        <h3>PLI</h3>
        <p className="stat-value">₹9999999</p>
      </div>
    </div>
  );
};

export default StatsCards; 