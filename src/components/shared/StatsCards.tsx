import React from 'react';
import './StatsCards.css';

const stats = [
  { title: 'SB Accounts', value: 123456 },
  { title: 'BD Revenue', value: '₹24,343' },
  { title: 'No. Aadhaar Trans', value: 1259 },
  { title: 'PLI', value: '₹99,99,999' }
];

const StatsCards: React.FC = () => {
  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div className={`stat-card card-${index}`} key={index}>
          <h3>{stat.title}</h3>
          <p className="stat-value">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;