import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBriefcase, FaLaptopCode, FaBuilding, FaMoneyBill, FaPiggyBank, FaUniversity, FaUsers, FaSearch, FaEllipsisH } from 'react-icons/fa';
import './CreateReport.css';

const CreateReport: React.FC = () => {
  const navigate = useNavigate();

  const categories = [
    { id: 1, title: 'Business Development', icon: React.createElement(FaBriefcase as React.ComponentType<any>, { size: 40 }), path: '/admin/business' },
    { id: 2, title: 'Technology', icon: React.createElement(FaLaptopCode as React.ComponentType<any>, { size: 40 }), path: '/admin/technology' },
    { id: 3, title: 'Buildings', icon: React.createElement(FaBuilding as React.ComponentType<any>, { size: 40 }), path: '/admin/buildings' },
    { id: 4, title: 'PLI', icon: React.createElement(FaMoneyBill as React.ComponentType<any>, { size: 40 }), path: '/admin/pli' },
    { id: 5, title: 'Savings Bank', icon: React.createElement(FaPiggyBank as React.ComponentType<any>, { size: 40 }), path: '/admin/savings' },
    { id: 6, title: 'IPPB', icon: React.createElement(FaUniversity as React.ComponentType<any>, { size: 40 }), path: '/admin/ippb' },
    { id: 7, title: 'Recruitment', icon: React.createElement(FaUsers as React.ComponentType<any>, { size: 40 }), path: '/admin/recruitment' },
    { id: 8, title: 'Investigation', icon: React.createElement(FaSearch as React.ComponentType<any>, { size: 40 }), path: '/admin/investigation' },
    { id: 9, title: 'Others', icon: React.createElement(FaEllipsisH as React.ComponentType<any>, { size: 40 }), path: '/admin/others' }
  ];

  return (
    <div className="create-report-container">
      <h1>Create Report</h1>
      <div className="category-grid">
        {categories.map(category => (
          <div 
            key={category.id} 
            className="category-card"
            onClick={() => navigate(category.path)}
          >
            <div className="category-icon">{category.icon}</div>
            <h3>{category.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreateReport;