import React from 'react';

const StatsCards: React.FC = () => {
  return (
    <div className="stats-grid">
      <div className="stat-card primary">
        <h3>Earning</h3>
        <p className="stat-value">$628</p>
      </div>
      <div className="stat-card">
        <h3>Share</h3>
        <p className="stat-value">2434</p>
      </div>
      <div className="stat-card">
        <h3>Likes</h3>
        <p className="stat-value">1259</p>
      </div>
      <div className="stat-card">
        <h3>Rating</h3>
        <p className="stat-value">8.5</p>
      </div>
    </div>
  );
};

export default StatsCards; 