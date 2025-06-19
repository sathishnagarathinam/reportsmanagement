import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { FaTruck } from 'react-icons/fa';
import Sidebar from '../../shared/Sidebar';
import StatsCards from '../../shared/StatsCards';
import PageBuilder from '../business/PageBuilder';

const MMUAdmin: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userRef = doc(db, 'employees', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  return (
    <div className="dashboard-container">
      <Sidebar userData={userData} />
      <div className="main-content">
        <div className="page-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {React.createElement(FaTruck as React.ComponentType<any>, { size: 32, color: '#007bff' })}
            <span>MMU (Mail Motor Unit) Administration</span>
          </div>
          <button
            onClick={() => navigate('/admin')}
            style={{
              marginLeft: '20px',
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back to Admin
          </button>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <p style={{ margin: 0, color: '#495057' }}>
            <strong>MMU Administration:</strong> Manage Mail Motor Unit forms and configurations.
            Create and configure forms related to mail transportation, vehicle management, route planning, and logistics operations.
          </p>
        </div>

        <StatsCards />
        <PageBuilder />
      </div>
    </div>
  );
};

export default MMUAdmin;
