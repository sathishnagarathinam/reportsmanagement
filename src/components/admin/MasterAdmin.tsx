import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../shared/Sidebar';
import VersionControl from './VersionControl';

import {
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress
} from '@mui/material';

interface User {
  id: string;
  employeeId: string;
  email: string;
  name: string;
  role: string;
  officeName: string;
  divisionName: string;
  appVersion?: string;
  platform?: string;
  lastVersionCheck?: string;
  source?: 'employees' | 'userProfiles';
  designation: string;
}

const MasterAdmin: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<{[key: string]: string}>({});
  const [updateStatus, setUpdateStatus] = useState<{[key: string]: string}>({});
  const [activeTab, setActiveTab] = useState<'users' | 'version'>('users');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');

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
    fetchUsers();
  }, [currentUser]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');

    try {
      const usersMap = new Map<string, User>();
      let employeesCount = 0;
      let profilesCount = 0;

      // Fetch from employees collection
      try {
        const employeesRef = collection(db, 'employees');
        const employeesSnapshot = await getDocs(query(employeesRef));
        employeesCount = employeesSnapshot.size;

        console.log(`MasterAdmin: Found ${employeesCount} users in employees collection`);

        employeesSnapshot.forEach((doc) => {
          const data = doc.data();
          const user: User = {
            id: doc.id,
            employeeId: data.employeeId || data.employee_code || data.employeeId || '',
            email: data.email || data.userEmail || '',
            name: data.name || data.userName || data.employeeName || '',
            role: data.role || 'user',
            officeName: data.officeName || data.office || '',
            divisionName: data.divisionName || data.division || '',
            designation: data.designation || '',
            appVersion: data.appVersion || data.app_version || '',
            platform: data.platform || '',
            lastVersionCheck: data.lastVersionCheck || data.last_version_check || '',
            source: 'employees'
          };
          usersMap.set(doc.id, user);
        });
      } catch (error) {
        console.error('Error fetching employees collection:', error);
      }

      // Fetch from userProfiles collection (fallback / merge)
      try {
        const profilesRef = collection(db, 'userProfiles');
        const profilesSnapshot = await getDocs(query(profilesRef));
        profilesCount = profilesSnapshot.size;

        console.log(`MasterAdmin: Found ${profilesCount} users in userProfiles collection`);

        profilesSnapshot.forEach((doc) => {
          const data = doc.data();
          const existingUser = usersMap.get(doc.id);

          const user: User = {
            id: doc.id,
            employeeId: existingUser?.employeeId || data.employeeId || data.employee_code || '',
            email: existingUser?.email || data.email || data.userEmail || '',
            name: existingUser?.name || data.name || data.userName || data.fullName || '',
            role: existingUser?.role || data.role || 'user',
            officeName: existingUser?.officeName || data.officeName || data.office || '',
            divisionName: existingUser?.divisionName || data.divisionName || data.division || '',
            designation: existingUser?.designation || data.designation || '',
            appVersion: existingUser?.appVersion || data.appVersion || data.app_version || '',
            platform: existingUser?.platform || data.platform || '',
            lastVersionCheck: existingUser?.lastVersionCheck || data.lastVersionCheck || data.last_version_check || '',
            source: existingUser?.source || 'userProfiles'
          };

          usersMap.set(doc.id, user);
        });
      } catch (error) {
        console.error('Error fetching userProfiles collection:', error);
      }

      const mergedUsers = Array.from(usersMap.values());
      console.log(`MasterAdmin: Total merged users: ${mergedUsers.length} (employees: ${employeesCount}, profiles: ${profilesCount})`);

      setUsers(mergedUsers);

      // Only show error if both collections are empty
      if (mergedUsers.length === 0 && employeesCount === 0 && profilesCount === 0) {
        setUsersError('No users found. Please verify that employees or userProfiles collections exist in Firestore.');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsersError(`Failed to load users: ${error instanceof Error ? error.message : 'Unknown error'}. Please check Firestore permissions and try again.`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdateStatus(prev => ({ ...prev, [userId]: 'updating' }));

      const user = users.find(u => u.id === userId);
      const collectionName = user?.source === 'userProfiles' ? 'userProfiles' : 'employees';

      const userRef = doc(db, collectionName, userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User document not found');
      }

      await updateDoc(userRef, {
        role: newRole
      });

      // Verify the update
      const updatedDoc = await getDoc(userRef);
      const updatedData = updatedDoc.data();

      if (updatedDoc.exists() && updatedData?.role === newRole) {
        // Update the local state with all user data to maintain consistency
        setUsers(users.map(user =>
          user.id === userId ? { ...user, ...updatedData, role: newRole } : user
        ));

        // Refresh the users list to ensure data consistency
        await fetchUsers();

        // Clear the selected role
        setSelectedRoles(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });

        setUpdateStatus(prev => ({ ...prev, [userId]: 'success' }));

        // Clear success message after 3 seconds
        setTimeout(() => {
          setUpdateStatus(prev => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
          });
        }, 3000);
      } else {
        throw new Error('Role update verification failed');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setUpdateStatus(prev => ({ ...prev, [userId]: 'error' }));

      // Clear error message after 3 seconds
      setTimeout(() => {
        setUpdateStatus(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }, 3000);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    setUpdateStatus(prev => ({ ...prev, [userId]: 'updating' }));

    try {
      // Delete from employees collection
      const employeeRef = doc(db, 'employees', userId);
      try {
        await updateDoc(employeeRef, { deletedAt: new Date().toISOString(), isDeleted: true });
      } catch (err) {
        console.log('Employee record not found or already deleted');
      }

      // Delete from userProfiles collection
      const profileRef = doc(db, 'userProfiles', userId);
      try {
        await updateDoc(profileRef, { deletedAt: new Date().toISOString(), isDeleted: true });
      } catch (err) {
        console.log('User profile not found or already deleted');
      }

      // Remove user from the list
      setUsers(prev => prev.filter(u => u.id !== userId));

      setUpdateStatus(prev => ({ ...prev, [userId]: 'success' }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateStatus(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }, 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setUpdateStatus(prev => ({ ...prev, [userId]: 'error' }));

      // Clear error message after 3 seconds
      setTimeout(() => {
        setUpdateStatus(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }, 3000);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar userData={userData} />
      <div className="main-content">
        <Box sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <h1 style={{
              margin: 0,
              marginBottom: '8px',
              color: '#1976d2',
              fontSize: '2rem',
              fontWeight: 'bold'
            }}>
              Master Admin Panel
            </h1>
            <p style={{
              margin: 0,
              color: '#666',
              fontSize: '1rem'
            }}>
              Manage user roles, permissions, and mobile app version control
            </p>
          </Box>

          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="users" label="User Management" />
            <Tab value="version" label="Version Management" />
          </Tabs>

          {activeTab === 'version' && <VersionControl />}

          {activeTab === 'users' && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Card sx={{ minWidth: 200, flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Employees
                </Typography>
                <Typography variant="h4" component="div" color="primary">
                  {users.length}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 200, flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Filtered Results
                </Typography>
                <Typography variant="h4" component="div" color="secondary">
                  {filteredUsers.length}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 200, flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Admin Users
                </Typography>
                <Typography variant="h4" component="div" color="success.main">
                  {users.filter(user => user.role === 'admin' || user.role === 'master_admin').length}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 200, flex: 1 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Regular Users
                </Typography>
                <Typography variant="h4" component="div" color="info.main">
                  {users.filter(user => user.role === 'user' || !user.role).length}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {loadingUsers && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {usersError && !loadingUsers && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {usersError}
            </Alert>
          )}

          {!loadingUsers && !usersError && (
            <>
              <TextField
                fullWidth
                label="Search by Employee ID, Name, or Email"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 3 }}
                placeholder="Enter Employee ID, Full Name, or Email to search..."
              />
              <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>Employee ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>Employee Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>Office Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>Division Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>Designation</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>App Version</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>Platform</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>Current Role</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>New Role</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>Actions</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
              <TableBody>
                {filteredUsers.map((user, index) => (
                  <TableRow
                    key={user.id}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                      '&:hover': { backgroundColor: '#e3f2fd' }
                    }}
                  >
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {user.employeeId}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {user.name || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {user.email}
                    </TableCell>
                    <TableCell>{user.officeName}</TableCell>
                    <TableCell>{user.divisionName}</TableCell>
                    <TableCell>{user.designation}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {user.appVersion || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {user.platform ? (
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            backgroundColor: user.platform.toLowerCase().includes('android') ? '#e8f5e9' : '#e3f2fd',
                            color: user.platform.toLowerCase().includes('android') ? '#2e7d32' : '#1976d2'
                          }}
                        >
                          {user.platform}
                        </Box>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-block',
                          px: 2,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.875rem',
                          fontWeight: 'bold',
                          backgroundColor:
                            user.role === 'master_admin' ? '#e8f5e9' :
                            user.role === 'admin' ? '#fff3e0' :
                            user.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                          color:
                            user.role === 'master_admin' ? '#2e7d32' :
                            user.role === 'admin' ? '#f57c00' :
                            user.role === 'user' ? '#1976d2' : '#666'
                        }}
                      >
                        {user.role === 'master_admin' ? 'Master Admin' :
                         user.role === 'admin' ? 'Admin' :
                         user.role === 'user' ? 'User' : 'No Role'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={selectedRoles[user.id] || ''}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            setSelectedRoles(prev => ({
                              ...prev,
                              [user.id]: newRole
                            }));
                          }}
                          displayEmpty
                          disabled={updateStatus[user.id] === 'updating'}
                        >
                          <MenuItem value="">Select Role</MenuItem>
                          <MenuItem value="user">User</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="master_admin">Master Admin</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          disabled={!selectedRoles[user.id] || updateStatus[user.id] === 'updating'}
                          onClick={() => handleRoleChange(user.id, selectedRoles[user.id])}
                          size="small"
                        >
                          {updateStatus[user.id] === 'updating' ? 'Updating...' : 'Update'}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          disabled={updateStatus[user.id] === 'updating'}
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          size="small"
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {updateStatus[user.id] === 'success' && (
                        <Box sx={{ color: 'success.main' }}>Role updated successfully!</Box>
                      )}
                      {updateStatus[user.id] === 'error' && (
                        <Box sx={{ color: 'error.main' }}>Update failed</Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
              </>
            )}

          {/* Mobile User Details Section */}
          <Card sx={{ mt: 4, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                Mobile User Details
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Mobile app versions and platform details are shown when the mobile app reports them.
              </Typography>

              {loadingUsers ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : users.filter(u => u.appVersion).length === 0 ? (
                <Alert severity="info">
                  No mobile app version data available yet. Mobile users will appear here once they open the app.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Employee Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Office</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>App Version</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Platform</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Last Version Check</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users
                        .filter(u => u.appVersion)
                        .map((user) => (
                          <TableRow key={`mobile-${user.id}`}>
                            <TableCell>{user.name || 'N/A'}</TableCell>
                            <TableCell>{user.officeName || 'N/A'}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{user.appVersion}</TableCell>
                            <TableCell>{user.platform || 'N/A'}</TableCell>
                            <TableCell>
                              {user.lastVersionCheck
                                ? new Date(user.lastVersionCheck).toLocaleString()
                                : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      </Box>
      </div>
    </div>
  );
};

export default MasterAdmin;