import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../shared/Sidebar';
import StatsCards from '../shared/StatsCards';
import PageBuilder from './business/PageBuilder';
import OfficeLoadingTest from './business/OfficeLoadingTest';
import FixUndefinedReport from './FixUndefinedReport';

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
          <button
            onClick={() => setShowOfficeTest(!showOfficeTest)}
            style={{
              marginLeft: '20px',
              padding: '8px 16px',
              backgroundColor: showOfficeTest ? '#dc3545' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showOfficeTest ? 'Hide Office Test' : 'Show Office Loading Test'}
          </button>
        </div>
        <StatsCards />
        <FixUndefinedReport />
        {showOfficeTest ? <OfficeLoadingTest /> : <PageBuilder />}
      </div>
    </div>
  );
};

export default AdminPage;