import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBriefcase, FaLaptopCode, FaBuilding, FaMoneyBill, FaPiggyBank, FaUniversity, FaUsers, FaSearch, FaEllipsisH } from 'react-icons/fa';
import './CreateReport.css';

const CreateReport: React.FC = () => {
  const navigate = useNavigate();

  const categories = [
    { id: 1, title: 'Business Development', icon: <FaBriefcase size={40} />, path: '/admin/business' },
    { id: 2, title: 'Technology', icon: <FaLaptopCode size={40} />, path: '/admin/technology' },
    { id: 3, title: 'Buildings', icon: <FaBuilding size={40} />, path: '/admin/buildings' },
    { id: 4, title: 'PLI', icon: <FaMoneyBill size={40} />, path: '/admin/pli' },
    { id: 5, title: 'Savings Bank', icon: <FaPiggyBank size={40} />, path: '/admin/savings' },
    { id: 6, title: 'IPPB', icon: <FaUniversity size={40} />, path: '/admin/ippb' },
    { id: 7, title: 'Recruitment', icon: <FaUsers size={40} />, path: '/admin/recruitment' },
    { id: 8, title: 'Investigation', icon: <FaSearch size={40} />, path: '/admin/investigation' },
    { id: 9, title: 'Others', icon: <FaEllipsisH size={40} />, path: '/admin/others' }
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