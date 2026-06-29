import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

const theme = createTheme();

// Error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App initialization error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>India Post Reports Management System</h1>
          <p>Loading application...</p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            If this message persists, please check your internet connection.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Debug logging
console.log('🚀 App initialization started');
console.log('📱 Environment:', process.env.NODE_ENV);
console.log('🔑 Firebase API Key available:', !!process.env.REACT_APP_FIREBASE_API_KEY);

async function initializeAndRender() {
  try {
    // Import Firebase configuration with error handling
    // IMPORTANT: Must await this before rendering!
    await import('./config/firebase').catch(error => {
      console.warn('⚠️ Firebase configuration warning:', error);
    });

    console.log('✅ Firebase initialized');

    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found in HTML');
    }

    console.log('✅ Root element found');

    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
          </ThemeProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );

    console.log('✅ React app rendered successfully');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    // Fallback rendering
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
          <h1>Reports Management System</h1>
          <p>⚠️ Error initializing application</p>
          <p style="color: #d32f2f; font-size: 14px;">Please check browser console (F12) for details.</p>
          <p style="color: #666; font-size: 12px;">Error: ${error instanceof Error ? error.message : String(error)}</p>
        </div>
      `;
    }
  }
}

// Start initialization
initializeAndRender();