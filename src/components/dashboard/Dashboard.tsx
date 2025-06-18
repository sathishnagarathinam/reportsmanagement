import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../shared/Sidebar';
import StatsCards from '../shared/StatsCards';
import './Dashboard.css';

const Dashboard: React.FC = () => {
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

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="dashboard-container">
      <Sidebar userData={userData} />

      {/* Main Content */}
      <div className="main-content">
        <div className="page-title">Dashboard</div>
        
        <StatsCards />

        {/* Charts Section */}
        <div className="charts-container">
          <div className="chart-box main-chart" onClick={() => handleNavigation('/data-entry')}>
            <h3>Data Entry</h3>
            <div className="chart-content">
              {/* Add Chart.js or Recharts implementation here */}
            </div>
          </div>
          <div className="chart-box main-chart" onClick={() => handleNavigation('/reports')}>
            <h3>Reports</h3>
            <div className="chart-content">
              {/* Add Chart.js or Recharts implementation here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;