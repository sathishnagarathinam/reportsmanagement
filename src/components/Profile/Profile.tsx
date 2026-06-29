import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabaseClient'; // Keep for user profile updates
import OfficeService from '../../services/officeService'; // Use OfficeService for office fetching
import Sidebar from '../shared/Sidebar';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import './Profile.css';

interface UserData {
  name: string;
  employeeId: string;
  email: string;
  officeName: string;
  divisionName?: string;
  designation?: string;
  mobileNumber?: string;
  role?: string;
}

interface FormData {
  name: string;
  officeName: string;
  divisionName: string;
  designation: string;
  mobileNumber: string;
}

const Profile: React.FC = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    officeName: '',
    divisionName: '',
    designation: '',
    mobileNumber: ''
  });
  const [officeOptions, setOfficeOptions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [officeError, setOfficeError] = useState<string | null>(null);

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, [currentUser]);

  // Fetch office options when editing starts
  useEffect(() => {
    if (isEditing) {
      fetchOfficeOptions();
    }
  }, [isEditing]);

  // Debug function to test office fetching
  const debugOfficeFetching = async () => {
    console.log('🧪 === PROFILE DEBUG: Testing Office Fetching ===');
    try {
      // Clear cache first
      OfficeService.clearCache();
      console.log('🧪 Profile Debug: Cache cleared');

      // Test OfficeService
      const officeNames = await OfficeService.fetchOfficeNames();
      console.log('🧪 Profile Debug: OfficeService returned', officeNames.length, 'offices');
      console.log('🧪 Profile Debug: First 10 offices:', officeNames.slice(0, 10));
      console.log('🧪 Profile Debug: Last 10 offices:', officeNames.slice(-10));

      // Test specific searches
      const divisionOffices = officeNames.filter(name => name.toLowerCase().includes('division'));
      console.log('🧪 Profile Debug: Division offices found:', divisionOffices.length);
      console.log('🧪 Profile Debug: Division offices:', divisionOffices);

    } catch (error) {
      console.error('🧪 Profile Debug: Error:', error);
    }
    console.log('🧪 === END PROFILE DEBUG ===');
  };

  // Fetch user data from Firebase
  const fetchUserData = async () => {
    if (!currentUser) {
      setError('User not logged in');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Profile: Fetching user data...');
      const userDoc = await getDoc(doc(db, 'employees', currentUser.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        setUserData(data);
        setFormData({
          name: data.name || '',
          officeName: data.officeName || '',
          divisionName: data.divisionName || '',
          designation: data.designation || '',
          mobileNumber: data.mobileNumber || ''
        });
        console.log('✅ Profile: User data loaded successfully');
      } else {
        setError('User profile not found');
        console.log('❌ Profile: User document not found');
      }
    } catch (err) {
      console.error('❌ Profile: Error fetching user data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch office options - Same logic as Registration screen using OfficeService
  const fetchOfficeOptions = async () => {
    setOfficeLoading(true);
    setOfficeError(null);

    try {
      console.log('🏢 Profile: Fetching office options using OfficeService...');

      // Use the same OfficeService as Registration screen - fetch ALL offices with comprehensive pagination
      const officeNames = await OfficeService.fetchOfficeNames();

      setOfficeOptions(officeNames);
      console.log(`✅ Profile: Successfully loaded ${officeNames.length} office options using OfficeService`);

      // Log some statistics for debugging
      if (officeNames.length > 0) {
        const sortedNames = [...officeNames].sort();
        console.log('📊 Profile: Office range - First:', sortedNames[0]);
        console.log('📊 Profile: Office range - Last:', sortedNames[sortedNames.length - 1]);

        // Check for specific offices
        const tirupurDivision = officeNames.find(o => o.toLowerCase().includes('tirupur division'));
        const coimbatoreDivision = officeNames.find(o => o.toLowerCase().includes('coimbatore division'));
        console.log('📊 Profile: Contains "Tirupur division":', !!tirupurDivision);
        console.log('📊 Profile: Contains "Coimbatore division":', !!coimbatoreDivision);
        if (tirupurDivision) {
          console.log('📊 Profile: Found Tirupur division:', tirupurDivision);
        }
        if (coimbatoreDivision) {
          console.log('📊 Profile: Found Coimbatore division:', coimbatoreDivision);
        }
      }

    } catch (err) {
      console.error('❌ Profile: Error fetching office options:', err);
      setOfficeError('Failed to load office options');
      setOfficeOptions([]); // Set empty array on error
    } finally {
      setOfficeLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save profile changes to both Firebase and Supabase
  const handleSave = async () => {
    if (!currentUser || !userData) {
      setError('User data not available');
      return;
    }

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.officeName.trim()) {
      setError('Office name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      console.log('💾 Profile: Saving profile data...');

      // Prepare update data
      const updateData = {
        name: formData.name,
        officeName: formData.officeName,
        divisionName: formData.divisionName,
        designation: formData.designation,
        mobileNumber: formData.mobileNumber,
        updatedAt: new Date()
      };

      // Update Firebase Firestore (employees collection)
      await updateDoc(doc(db, 'employees', currentUser.uid), updateData);
      console.log('✅ Profile: Firebase updated successfully');

      // Update Supabase user_profiles table (same fields as Registration screen)
      console.log('🔍 Profile: Attempting Supabase update...');
      console.log('🔍 Profile: Employee ID for update:', userData.employeeId);
      console.log('🔍 Profile: Update data:', {
        name: formData.name,
        officeName: formData.officeName,
        divisionName: formData.divisionName,
        designation: formData.designation,
        mobileNumber: formData.mobileNumber,
      });

      // First, check if the record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('employeeId', userData.employeeId)
        .single();

      if (checkError) {
        console.error('❌ Profile: Error checking existing record:', checkError);

        // Try alternative lookup by Firebase UID
        console.log('🔄 Profile: Trying alternative lookup by Firebase UID...');
        const { data: altRecord, error: altError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('uid', currentUser.uid)
          .single();

        if (altError) {
          console.error('❌ Profile: Alternative lookup also failed:', altError);
          console.log('🔄 Profile: User record not found in Supabase. Creating new record...');

          // Create the missing user record in Supabase
          try {
            const newUserRecord = {
              uid: currentUser.uid,
              employeeId: userData.employeeId,
              name: userData.name,
              email: userData.email,
              officeName: userData.officeName,
              divisionName: userData.divisionName || '',
              designation: userData.designation || '',
              mobileNumber: userData.mobileNumber || '',
              role: userData.role || 'user'
            };

            console.log('🔄 Profile: Creating user record with data:', newUserRecord);

            const { data: createdRecord, error: createError } = await supabase
              .from('user_profiles')
              .insert(newUserRecord)
              .select()
              .single();

            if (createError) {
              console.error('❌ Profile: Failed to create user record:', createError);

              // Check for RLS error
              if (createError.code === '42501' || createError.message.includes('row-level security')) {
                throw new Error('Database security settings are blocking profile creation. Please contact your administrator to disable Row Level Security for the user_profiles table.');
              }

              throw new Error(`Failed to create user record: ${createError.message}`);
            }

            console.log('✅ Profile: Successfully created user record:', createdRecord);
          } catch (createError) {
            console.error('❌ Profile: Error creating user record:', createError);
            throw new Error(`Unable to create user profile. Please contact support. Error: ${checkError.message}`);
          }
        } else {
          console.log('✅ Profile: Found record using Firebase UID:', altRecord);
          // Update userData with the correct employeeId for the update
          userData.employeeId = altRecord.employeeId;
        }
      } else {
        console.log('🔍 Profile: Existing record found:', existingRecord);
      }

      // Perform the update
      const { data: updateResult, error: supabaseError } = await supabase
        .from('user_profiles')
        .update({
          name: formData.name,
          officeName: formData.officeName,
          divisionName: formData.divisionName,
          designation: formData.designation,
          mobileNumber: formData.mobileNumber,
          // Note: No updated_at field - table only has columns from Registration
        })
        .eq('employeeId', userData.employeeId)
        .select(); // Add select to get the updated record

      if (supabaseError) {
        console.error('❌ Profile: Supabase update error:', supabaseError);

        // Check for RLS error
        if (supabaseError.code === '42501' || supabaseError.message.includes('row-level security')) {
          throw new Error('Database security settings are blocking profile updates. Please contact your administrator to disable Row Level Security for the user_profiles table.');
        }

        throw new Error(`Supabase update failed: ${supabaseError.message}`);
      }

      console.log('✅ Profile: Supabase updated successfully');
      console.log('✅ Profile: Updated record:', updateResult);

      // Update local state with all updated fields
      setUserData(prev => prev ? {
        ...prev,
        name: formData.name,
        officeName: formData.officeName,
        divisionName: formData.divisionName,
        designation: formData.designation,
        mobileNumber: formData.mobileNumber
      } : null);
      setIsEditing(false);

      // Show success message
      alert('Profile updated successfully!');

    } catch (err) {
      console.error('❌ Profile: Error saving profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({
      name: userData?.name || '',
      officeName: userData?.officeName || '',
      divisionName: userData?.divisionName || '',
      designation: userData?.designation || '',
      mobileNumber: userData?.mobileNumber || ''
    });
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar userData={userData} />
        <div className="main-content">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="dashboard-container">
        <Sidebar userData={userData} />
        <div className="main-content">
          <div className="error-container">
            <h2>Profile Not Found</h2>
            <p>{error || 'Unable to load user profile'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar userData={userData} />
      <div className="main-content">
        <div className="profile-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1 className="page-title">User Profile</h1>
            <button
              onClick={debugOfficeFetching}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              🧪 Debug Office Fetching
            </button>
          </div>
          
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar">
              {userData.name.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <h2>{userData.name}</h2>
              <p className="employee-id">Employee ID: {userData.employeeId}</p>
              {userData.role && <span className="role-badge">{userData.role}</span>}
            </div>
          </div>

          {/* Personal Information Card */}
          <div className="profile-card">
            <h3>Personal Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Full Name</label>
                <span>{userData.name}</span>
              </div>
              <div className="info-item">
                <label>Employee ID</label>
                <span>{userData.employeeId}</span>
              </div>
              <div className="info-item">
                <label>Email Address</label>
                <span>{userData.email}</span>
              </div>
              <div className="info-item">
                <label>Division</label>
                <span>{userData.divisionName || 'Not specified'}</span>
              </div>
              <div className="info-item">
                <label>Designation</label>
                <span>{userData.designation || 'Not specified'}</span>
              </div>
              <div className="info-item">
                <label>Mobile Number</label>
                <span>{userData.mobileNumber || 'Not specified'}</span>
              </div>
            </div>
          </div>

          {/* Editable Information Card */}
          <div className="profile-card">
            <div className="card-header">
              <h3>Editable Information</h3>
              {!isEditing && (
                <button
                  className="edit-btn"
                  onClick={() => setIsEditing(true)}
                >
                  <i className="fas fa-edit"></i> Edit Profile
                </button>
              )}
            </div>
            
            {isEditing ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <TextField
                      fullWidth
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="designation">Designation</label>
                    <TextField
                      fullWidth
                      value={formData.designation}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      placeholder="Enter designation"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="divisionName">Division</label>
                    <TextField
                      fullWidth
                      value={formData.divisionName}
                      onChange={(e) => handleInputChange('divisionName', e.target.value)}
                      placeholder="Enter division name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="mobileNumber">Mobile Number</label>
                    <TextField
                      fullWidth
                      value={formData.mobileNumber}
                      onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="officeName">Office Name</label>
                  <Autocomplete
                    fullWidth
                    options={officeOptions}
                    getOptionLabel={(option) => option}
                    value={formData.officeName || null}
                    onChange={(event, newValue) => {
                      handleInputChange('officeName', newValue || '');
                    }}
                    disabled={officeLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={officeLoading ? 'Loading offices...' : 'Select Office'}
                        error={!!officeError}
                        helperText={officeError}
                        required
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {officeLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                  />
                </div>

                <div className="form-actions">
                  <button
                    className="btn-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving || officeLoading || !formData.officeName.trim()}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <label>Full Name</label>
                  <span>{userData.name}</span>
                </div>
                <div className="info-item">
                  <label>Designation</label>
                  <span>{userData.designation || 'Not specified'}</span>
                </div>
                <div className="info-item">
                  <label>Division</label>
                  <span>{userData.divisionName || 'Not specified'}</span>
                </div>
                <div className="info-item">
                  <label>Mobile Number</label>
                  <span>{userData.mobileNumber || 'Not specified'}</span>
                </div>
                <div className="info-item">
                  <label>Office Name</label>
                  <span>{userData.officeName || 'Not specified'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
