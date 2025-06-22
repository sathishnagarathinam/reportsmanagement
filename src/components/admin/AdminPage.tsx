import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../shared/Sidebar';
import StatsCards from '../shared/StatsCards';
import PageBuilder from './business/PageBuilder';
import OfficeLoadingTest from './business/OfficeLoadingTest';

const AdminPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [showOfficeTest, setShowOfficeTest] = useState<boolean>(false);

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
          Admin Dashboard
          <div style={{ marginLeft: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowOfficeTest(!showOfficeTest)}
              style={{
                padding: '10px 20px',
                backgroundColor: showOfficeTest ? '#dc3545' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              {showOfficeTest ? '🔧 Hide Debug Tools' : '🔧 Show Offline Load Test'}
            </button>
            {showOfficeTest && (
              <span style={{
                padding: '6px 12px',
                backgroundColor: '#fff3cd',
                color: '#856404',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                DEBUG MODE ACTIVE
              </span>
            )}
          </div>
        </div>
        <StatsCards />
        {showOfficeTest ? <OfficeLoadingTest /> : <PageBuilder />}
      </div>
    </div>
  );
};

export default AdminPage;