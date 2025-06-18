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
    user.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <TextField
            fullWidth
            label="Search by Employee ID"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 3 }}
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Office Name</TableCell>
                  <TableCell>Division Name</TableCell>
                  <TableCell>Designation</TableCell>
                  <TableCell>Current Role</TableCell>
                  <TableCell>New Role</TableCell>
                  <TableCell>Actions</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.employeeId}</TableCell>
                    <TableCell>{user.officeName}</TableCell>
                    <TableCell>{user.divisionName}</TableCell>
                    <TableCell>{user.designation}</TableCell>
                    <TableCell>{user.role || 'No Role'}</TableCell>
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