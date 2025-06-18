import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../shared/Sidebar';

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
} from '@mui/material';

interface User {
  id: string;
  employeeId: string;
  email: string;
  name: string;
  role: string;
  officeName: string;
  divisionName: string;
  designation: string;
}

const MasterAdmin: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<{[key: string]: string}>({});
  const [updateStatus, setUpdateStatus] = useState<{[key: string]: string}>({});

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
    try {
      const usersRef = collection(db, 'employees');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
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
      
      const userRef = doc(db, 'employees', userId);
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
              Manage user roles and permissions for all employees
            </p>
          </Box>
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
                      <Button
                        variant="contained"
                        color="primary"
                        disabled={!selectedRoles[user.id] || updateStatus[user.id] === 'updating'}
                        onClick={() => handleRoleChange(user.id, selectedRoles[user.id])}
                      >
                        {updateStatus[user.id] === 'updating' ? 'Updating...' : 'Update'}
                      </Button>
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
        </Box>
      </div>
    </div>
  );
};

export default MasterAdmin;