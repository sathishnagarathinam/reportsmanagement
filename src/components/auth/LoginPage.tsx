import React, { useState, useEffect } from 'react'; // Add useEffect
import { useAuth } from '../../contexts/AuthContext'; // Assuming signIn and resetPassword are here
import { Button, Container, Typography, Box, TextField, Paper, Alert } from '@mui/material';
import { useNavigate, Link, useSearchParams } from 'react-router-dom'; // Add useSearchParams

// RegistrationData interface can be removed if not used elsewhere for login data structure

const LoginPage: React.FC = () => {
  const { signIn, resetPassword } = useAuth(); // Removed signUp
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // Initialize useSearchParams
  // const [isRegistering, setIsRegistering] = useState(false); // Removed
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Simplified state for login and password reset
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [emailForReset, setEmailForReset] = useState(''); // If reset is by email

  useEffect(() => {
    const empIdFromQuery = searchParams.get('employeeId');
    if (empIdFromQuery) {
      setEmployeeId(empIdFromQuery);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isResettingPassword) {
        // Assuming resetPassword in AuthContext uses email or employeeId
        // Adjust based on your AuthContext's resetPassword implementation
        await resetPassword(emailForReset || employeeId); 
        setSuccess('Password reset email sent! Please check your email.');
        setIsResettingPassword(false);
        return;
      }

      // Login logic
      await signIn(employeeId, password); // Assuming signIn uses employeeId and password
      navigate('/'); // Navigate to dashboard or home on successful login

    } catch (error: any) {
      let errorMessage = 'Failed to login. Check credentials.';
      // Add more specific error handling based on Firebase error codes for login
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid Employee ID or Password.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      }
      setError(errorMessage);
      console.error("Login error:", error);
    }
  };

  // Removed handleInputChange for registrationData, use individual setters

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <img 
              src="/Indiapost_Logo.png" 
              alt="India Post Logo" 
              style={{ width: '150px', height: 'auto' }}
            />
          </Box>
          <Typography component="h1" variant="h5" gutterBottom>
            {isResettingPassword ? 'Reset Password' : 'Login to Reports Management System'}
          </Typography>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{success}</Alert>}

          {isResettingPassword ? (
            <TextField
              margin="normal"
              required
              fullWidth
              label="Enter your Email or Employee ID for Reset"
              name="emailForReset" // Or employeeIdForReset
              value={emailForReset} // Or employeeId
              onChange={(e) => setEmailForReset(e.target.value)} // Or setEmployeeId
            />
          ) : (
            <>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Employee ID"
                name="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            {isResettingPassword ? 'Send Reset Link' : 'Sign In'}
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button
              onClick={() => {
                // setIsRegistering(false); // No longer needed
                setIsResettingPassword(false);
                setError('');
                setSuccess('');
              }}
              disabled={!isResettingPassword} // Enable if currently resetting
            >
              Back to Login
            </Button>
            <Button 
              onClick={() => {
                setIsResettingPassword(!isResettingPassword);
                // setIsRegistering(false); // No longer needed
                setError('');
                setSuccess('');
              }}
            >
              {isResettingPassword ? 'Cancel Reset' : 'Forgot Password?'}
            </Button>
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Don't have an account? <Link to="/register">Register here</Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;