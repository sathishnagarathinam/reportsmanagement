import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../shared/Sidebar';
import OfficeManager from './OfficeManager';

import { Box, Typography, Tabs, Tab, Alert, Card, CardContent } from '@mui/material';

const MasterData: React.FC = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'offices'>('offices');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userRef = doc(db, 'employees', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      }
      setIsLoading(false);
    };
    fetchUserData();
  }, [currentUser]);

  const normalizedRole = typeof userData?.role === 'string' ? userData.role.trim().toLowerCase() : '';

  if (!isLoading && normalizedRole !== 'master_admin') {
    return (
      <div className="dashboard-container">
        <Sidebar userData={userData} />
        <div className="main-content">
          <Box sx={{ p: 3 }}>
            <Alert severity="error">
              You do not have permission to access this page. Only Master Admin users can manage master data.
            </Alert>
          </Box>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar userData={userData} />
      <div className="main-content">
        <Box sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold', mb: 1 }}>
              Master Data Management
            </Typography>
            <Typography variant="body1" sx={{ color: '#666' }}>
              Manage master data including offices, regions, and divisions.
            </Typography>
          </Box>

          <Card sx={{ mb: 3, boxShadow: 2 }}>
            <CardContent>
              <Alert severity="info" sx={{ mb: 0 }}>
                <Typography variant="body2">
                  <strong>Master Admin Only:</strong> Changes made here affect all users of the application.
                </Typography>
              </Alert>
            </CardContent>
          </Card>

          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="offices" label="Offices" />
          </Tabs>

          {activeTab === 'offices' && <OfficeManager />}
        </Box>
      </div>
    </div>
  );
};

export default MasterData;

