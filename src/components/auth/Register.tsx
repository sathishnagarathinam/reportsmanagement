import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth'; // Added User type
import { auth } from '../../config/firebase';
import { supabase } from '../../config/supabaseClient';
import { doc, setDoc } from 'firebase/firestore'; // Import for Firestore
import OfficeService from '../../services/officeService';
import { db } from '../../config/firebase'; // Assuming you have db exported from firebase config
import './Register.css'; // Import your CSS file
import { Link, useNavigate } from 'react-router-dom'; // Add useNavigate

// Import Material UI components
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Paper, // Import Paper component
  Autocomplete, // Import Autocomplete
} from '@mui/material';

interface Office {
  // id: string; // Remove id
  name: string;
}

// Define an interface for the additional user profile data
interface UserProfile {
  uid: string;
  name: string;
  employeeId: string;
  email: string; // Firebase auth already stores email, but good to have in profile
  // officeId: string; // Remove officeId
  officeName: string;
  divisionName: string;
  designation: string;
  mobileNumber: string;
  // Add any other fields you need
}

interface ValidationErrors {
  name?: string;
  employeeId?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  mobileNumber?: string;
  divisionName?: string;
  designation?: string;
  selectedOfficeName?: string; // Update validation error key
}

const Register: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState(''); // New state
  const [employeeId, setEmployeeId] = useState(''); // New state
  const [divisionName, setDivisionName] = useState(''); // New state
  const [designation, setDesignation] = useState(''); // New state
  const [mobileNumber, setMobileNumber] = useState(''); // New state
  const [selectedOfficeName, setSelectedOfficeName] = useState<string>(''); // Change state variable name
  const [offices, setOffices] = useState<Office[]>([]);
  const [error, setError] = useState('');
  const [loadingOffices, setLoadingOffices] = useState<boolean>(true);
  const [isRegistering, setIsRegistering] = useState<boolean>(false); // For loading state during registration
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Name validation
    if (!name.trim()) {
      errors.name = 'Name is required';
    } else if (name.length < 3) {
      errors.name = 'Name must be at least 3 characters';
    }

    // Employee ID validation
    if (!employeeId.trim()) {
      errors.employeeId = 'Employee ID is required';
    } else if (!/^[A-Z0-9]+$/.test(employeeId)) {
      errors.employeeId = 'Employee ID must contain only uppercase letters and numbers';
    }

    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      errors.email = 'Invalid email address';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Mobile number validation
    if (!mobileNumber) {
      errors.mobileNumber = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(mobileNumber)) {
      errors.mobileNumber = 'Invalid mobile number (must be 10 digits)';
    }

    // Division name validation
    if (!divisionName.trim()) {
      errors.divisionName = 'Division name is required';
    }

    // Designation validation
    if (!designation.trim()) {
      errors.designation = 'Designation is required';
    }

    // Office validation
    if (!selectedOfficeName) { // Check selectedOfficeName
      errors.selectedOfficeName = 'Please select an office'; // Update error key
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }
    setIsRegistering(true);
    try {
      // Construct the email from employeeId for Firebase Authentication
      const firebaseEmail = `${employeeId}@employee.com`;

      // 1. Create user with Firebase Authentication using the constructed email
      const userCredential = await createUserWithEmailAndPassword(auth, firebaseEmail, password);
      const user = userCredential.user;

      // Prepare user profile data for Firestore/Supabase
      const userProfileData = {
        uid: user.uid, // This is Firebase UID. Supabase might have its own auto-generated ID or you might want to use this as a foreign key.
        employeeId: employeeId, // Ensure column names match your Supabase table
        name: name,
        email: email, // User's actual communication email
        officeName: selectedOfficeName,
        divisionName: divisionName,
        designation: designation,
        mobileNumber: mobileNumber,
        role: 'user',
        // firebase_auth_email: firebaseEmail, // You could also store the Firebase auth email if needed
      };

      // --- SAVING TO FIRESTORE (Optional - keep if you need data in both) ---
      const userDocRef = doc(db, 'employees', user.uid);
      await setDoc(userDocRef, userProfileData); // This saves to Firestore
      console.log('User profile data saved to Firestore.');
      // --- END OF FIRESTORE SAVE ---

      // 2. Save additional user information to Supabase table 'user_profiles'
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('user_profiles') // Your Supabase table name
        .insert([userProfileData]); // userProfileData should match your table structure

      if (supabaseError) {
        console.error('Error saving user profile to Supabase:', supabaseError);
        // CRITICAL: Decide on error handling. 
        // If Supabase save fails, you might want to delete the Firebase user
        // to prevent an inconsistent state (user exists in Firebase Auth but not in your profiles table).
        // await user.delete(); // Requires careful implementation and testing
        setError(`Failed to save user profile to Supabase: ${supabaseError.message}`);
        setIsRegistering(false);
        return; // Stop execution if Supabase save fails
      }

      console.log('User registered with Firebase. UID:', user.uid, 'Auth Email:', firebaseEmail);
      console.log('User profile data saved to Supabase:', supabaseData);
      setError('');
      alert('Registration successful! You will be redirected to the login page.');
      navigate(`/login?employeeId=${employeeId}`); // Navigate to login with employeeId

    } catch (err: any) {
      // Handle Firebase Auth errors
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. It should be at least 6 characters.');
      } else {
        setError('Failed to create account. Please try again.');
      }
      console.error(err); // <-- CHECK THIS OUTPUT IN YOUR CONSOLE
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setIsRegistering(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // For Google Sign-In, you might need a subsequent step to collect
      // employeeId, office, division, designation, mobileNumber if not available from Google.
      // Or, if this is the first time they sign in with Google, you might redirect them
      // to a profile completion page.
      // For now, let's assume we'd try to create a basic profile or check if one exists.

      // Example: Check if a profile exists, if not, create a basic one or prompt for more info.
      // This part needs careful consideration based on your app's flow.
      // For simplicity, we'll log and suggest manual data entry or a separate profile page.
      console.log('Google sign-in successful for user:', user.displayName, user.email, user.uid);
      alert('Google registration successful! Please complete your profile if prompted.');
      // TODO: Implement profile creation/completion for Google users.
      // This might involve checking Firestore for an existing profile and then:
      // 1. If profile exists, proceed.
      // 2. If not, redirect to a form to collect employeeId, officeId, divisionName, etc.
      //    and then call setDoc(doc(db, 'users', user.uid), profileData);

    } catch (err: any) {
      setError('Failed to register with Google. Please try again.');
      console.error(err);
    } finally {
      setIsRegistering(false);
    }
  };

  // Fetch offices from Supabase using enhanced OfficeService
  useEffect(() => {
    const fetchOffices = async () => {
      try {
        console.log('🏢 Register: Fetching offices with comprehensive pagination...');

        // Use enhanced OfficeService with comprehensive pagination
        const officeNames = await OfficeService.fetchOfficeNames();

        // Convert to Office format
        const validOffices: Office[] = officeNames.map((name: string) => ({ name }));

        setOffices(validOffices);
        console.log('✅ Register: Fetched and mapped offices:', validOffices.length, 'offices');

        // Log some statistics
        if (validOffices.length > 0) {
          const sortedNames = validOffices.map(o => o.name).sort();
          console.log('📊 Register: Office range - First:', sortedNames[0]);
          console.log('📊 Register: Office range - Last:', sortedNames[sortedNames.length - 1]);

          // Check for specific offices
          const tirupurDivision = validOffices.find(o => o.name.toLowerCase().includes('tirupur division'));
          console.log('📊 Register: Contains "Tirupur division":', !!tirupurDivision);
          if (tirupurDivision) {
            console.log('📊 Register: Found Tirupur division:', tirupurDivision.name);
          }
        }

      } catch (error) {
        console.error('❌ Register: Error fetching offices:', error);
        setError('Failed to load offices. Please try again.');
        setOffices([]);
      } finally {
        setLoadingOffices(false);
      }
    };

    fetchOffices();
  }, []); // Empty dependency array means this runs once on mount

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={6} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
        <Box sx={{ mb: 2 }}>
          <img src="/Indiapost_Logo.png" alt="India Post Logo" style={{ width: '100px' }} />
        </Box>
        <Typography component="h1" variant="h5">
          Create Account
        </Typography>
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
        <Box component="form" onSubmit={handleEmailRegister} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Full Name"
            name="name"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => validateForm()}
            error={!!validationErrors.name}
            helperText={validationErrors.name}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="employeeId"
            label="Employee ID"
            name="employeeId"
            autoComplete="employee-id"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            onBlur={() => validateForm()}
            error={!!validationErrors.employeeId}
            helperText={validationErrors.employeeId}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => validateForm()}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => validateForm()}
            error={!!validationErrors.password}
            helperText={validationErrors.password}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => validateForm()}
            error={!!validationErrors.confirmPassword}
            helperText={validationErrors.confirmPassword}
          />
          {/* Replace FormControl, InputLabel, Select, MenuItem with Autocomplete */}
          <Autocomplete
            fullWidth
            options={offices} // Use the fetched offices as options
            getOptionLabel={(option) => option.name} // Specify how to get the label from an option object
            value={offices.find(office => office.name === selectedOfficeName) || undefined} // Change null to undefined
            onChange={(event, newValue) => {
              setSelectedOfficeName(newValue ? newValue.name : ''); // Update state with the selected office name
              validateForm(); // Re-validate on change
            }}
            onBlur={() => validateForm()} // Validate on blur
            renderInput={(params) => (
              <TextField
                {...params}
                margin="normal"
                required
                label="Office Name"
                error={!!validationErrors.selectedOfficeName}
                helperText={validationErrors.selectedOfficeName}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loadingOffices ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
            disabled={isRegistering || loadingOffices}
            disableClearable // Prevent clearing the selection
            freeSolo={false} // Restrict input to only options
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="divisionName"
            label="Division Name"
            name="divisionName"
            autoComplete="division-name"
            value={divisionName}
            onChange={(e) => setDivisionName(e.target.value)}
            onBlur={() => validateForm()}
            error={!!validationErrors.divisionName}
            helperText={validationErrors.divisionName}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="designation"
            label="Designation"
            name="designation"
            autoComplete="designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            onBlur={() => validateForm()}
            error={!!validationErrors.designation}
            helperText={validationErrors.designation}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="mobileNumber"
            label="Mobile Number"
            name="mobileNumber"
            autoComplete="tel"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            onBlur={() => validateForm()}
            error={!!validationErrors.mobileNumber}
            helperText={validationErrors.mobileNumber}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isRegistering || loadingOffices}
          >
            {isRegistering ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ mt: 2 }}>
          Or register with
        </Typography>
        <Button
          type="button"
          fullWidth
          variant="outlined"
          sx={{ mt: 1, mb: 2 }}
          onClick={handleGoogleRegister}
          disabled={isRegistering}
        >
          {isRegistering ? <CircularProgress size={24} color="inherit" /> : 'Continue with Google'}
        </Button>

        <Typography variant="body2">
          Already have an account? <Link to="/login">Sign In</Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default Register;


interface Office {
  name: string;
}

// Define an interface for the data returned directly from the Supabase query
// interface SupabaseOfficeData {
//   'office name': string; // Match the column name exactly
// }

// Define an interface for the additional user profile data
interface UserProfile {
  uid: string;
  name: string;
  employeeId: string;
  email: string; // Firebase auth already stores email, but good to have in profile
  // officeId: string; // Remove officeId
  officeName: string;
  divisionName: string;
  designation: string;
  mobileNumber: string;
  // Add any other fields you need
}

interface ValidationErrors {
  name?: string;
  employeeId?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  mobileNumber?: string;
  divisionName?: string;
  designation?: string;
  selectedOfficeName?: string; // Update validation error key
}
