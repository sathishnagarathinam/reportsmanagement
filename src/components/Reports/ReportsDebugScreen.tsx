import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ReportsRoutingService from '../../services/reportsRoutingService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Sidebar from '../shared/Sidebar';

interface DebugResults {
  timestamp: string;
  userAuthenticated: boolean;
  userUID: string | null;
  userEmail: string | null;
  userDocExists: boolean;
  rawUserData: any;
  officeName: string | null;
  officeNameType: string;
  allUserDataKeys: string[];
  shouldShowComprehensive: boolean;
  officeInfo: any;
  error?: string;
}

/**
 * Debug screen to test and troubleshoot the reports routing logic
 */
const ReportsDebugScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const [debugResults, setDebugResults] = useState<DebugResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Fetch basic user data for sidebar
  React.useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'employees', currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data for sidebar:', error);
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  const runDebugTest = async () => {
    setIsLoading(true);
    console.log('🧪 === REACT ROUTING DEBUG TEST ===');

    try {
      const results: DebugResults = {
        timestamp: new Date().toISOString(),
        userAuthenticated: !!currentUser,
        userUID: currentUser?.uid || null,
        userEmail: currentUser?.email || null,
        userDocExists: false,
        rawUserData: null,
        officeName: null,
        officeNameType: 'undefined',
        allUserDataKeys: [],
        shouldShowComprehensive: false,
        officeInfo: null,
      };

      console.log('🧪 Debug: User authenticated:', results.userAuthenticated);
      console.log('🧪 Debug: User UID:', results.userUID);
      console.log('🧪 Debug: User email:', results.userEmail);

      if (currentUser) {
        // Test direct Firebase access
        console.log('🧪 Debug: Testing direct Firebase document access...');
        const userDoc = await getDoc(doc(db, 'employees', currentUser.uid));
        
        results.userDocExists = userDoc.exists();
        console.log('🧪 Debug: User document exists:', results.userDocExists);

        if (userDoc.exists()) {
          results.rawUserData = userDoc.data();
          results.allUserDataKeys = Object.keys(results.rawUserData || {});
          
          console.log('🧪 Debug: Raw user data:', results.rawUserData);
          console.log('🧪 Debug: All data keys:', results.allUserDataKeys);

          // Extract office name
          results.officeName = results.rawUserData?.officeName || null;
          results.officeNameType = typeof results.officeName;
          
          console.log('🧪 Debug: Extracted office name:', results.officeName);
          console.log('🧪 Debug: Office name type:', results.officeNameType);

          // Test ReportsRoutingService
          console.log('🧪 Debug: Testing ReportsRoutingService...');

          // Clear cache first
          ReportsRoutingService.clearCache();

          // Test office name retrieval
          const serviceOfficeName = await ReportsRoutingService.getCurrentUserOfficeName();
          console.log('🧪 Debug: Service office name:', serviceOfficeName);

          // Manual test of the division logic
          if (results.officeName) {
            console.log('🧪 Debug: === MANUAL DIVISION LOGIC TEST ===');
            console.log('🧪 Debug: Original office name:', `"${results.officeName}"`);
            console.log('🧪 Debug: Trimmed office name:', `"${results.officeName.trim()}"`);
            console.log('🧪 Debug: Lowercase office name:', `"${results.officeName.trim().toLowerCase()}"`);
            console.log('🧪 Debug: Ends with "division":', results.officeName.trim().toLowerCase().endsWith('division'));
            console.log('🧪 Debug: Manual division check result:', results.officeName.trim().toLowerCase().endsWith('division'));
            console.log('🧪 Debug: === END MANUAL DIVISION LOGIC TEST ===');
          }

          // Test direct division logic (bypasses cache)
          const directTest = await ReportsRoutingService.testDivisionLogicDirect();
          console.log('🧪 Debug: Direct division test:', directTest);

          // Test comprehensive reports check
          results.shouldShowComprehensive = await ReportsRoutingService.shouldShowComprehensiveReports();
          console.log('🧪 Debug: Should show comprehensive:', results.shouldShowComprehensive);

          // Test office info
          results.officeInfo = await ReportsRoutingService.getUserOfficeInfo();
          console.log('🧪 Debug: Office info:', results.officeInfo);

          // Add direct test results to results object
          (results as any).directTest = directTest;
        }
      }

      setDebugResults(results);
      console.log('🧪 === END REACT ROUTING DEBUG TEST ===');

    } catch (error) {
      console.error('🧪 Debug: Error during test:', error);
      setDebugResults({
        timestamp: new Date().toISOString(),
        userAuthenticated: !!currentUser,
        userUID: currentUser?.uid || null,
        userEmail: currentUser?.email || null,
        userDocExists: false,
        rawUserData: null,
        officeName: null,
        officeNameType: 'error',
        allUserDataKeys: [],
        shouldShowComprehensive: false,
        officeInfo: null,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = () => {
    ReportsRoutingService.clearCache();
    console.log('🗑️ Cache cleared');
  };

  const forceRefresh = async () => {
    console.log('🔄 Force refreshing division status...');
    try {
      const result = await ReportsRoutingService.forceRefreshDivisionStatus();
      console.log('🔄 Force refresh result:', result);

      // Also get fresh office info
      const officeInfo = await ReportsRoutingService.getUserOfficeInfo();
      console.log('🔄 Fresh office info:', officeInfo);

      alert(`Force refresh complete!\nDivision User: ${result}\nOffice Info: ${JSON.stringify(officeInfo, null, 2)}`);
    } catch (error) {
      console.error('❌ Force refresh error:', error);
      alert(`Force refresh failed: ${error}`);
    }
  };

  const testDivisionLogic = () => {
    console.log('🧪 === MANUAL DIVISION LOGIC TEST ===');

    const testCases = [
      'Coimbatore Division',
      'Chennai Division',
      'Mumbai Division',
      'Tirupur Division',
      'Chennai RO',
      'Mumbai BO',
      'Delhi SO',
      'Bangalore HO',
      'coimbatore division', // lowercase
      'COIMBATORE DIVISION', // uppercase
      'Coimbatore  Division  ', // with spaces
    ];

    testCases.forEach(testCase => {
      const trimmed = testCase.trim();
      const lowercase = trimmed.toLowerCase();
      const result = lowercase.endsWith('division');

      console.log(`🧪 Test: "${testCase}"`);
      console.log(`   Trimmed: "${trimmed}"`);
      console.log(`   Lowercase: "${lowercase}"`);
      console.log(`   Ends with "division": ${result}`);
      console.log(`   Expected Screen: ${result ? 'Report Screen 1 (Comprehensive)' : 'Report Screen 2 (Table Only)'}`);
      console.log('');
    });

    console.log('🧪 === END MANUAL DIVISION LOGIC TEST ===');
  };

  return (
    <div className="dashboard-container">
      <Sidebar userData={userData} />
      <div className="main-content">
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 style={{ margin: 0, color: '#1E3A8A' }}>🧪 Reports Routing Debug</h1>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={clearCache}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🗑️ Clear Cache
              </button>
              <button
                onClick={forceRefresh}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🔄 Force Refresh
              </button>
              <button
                onClick={testDivisionLogic}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🔍 Test Division Logic
              </button>
              <button
                onClick={runDebugTest}
                disabled={isLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isLoading ? '#6c757d' : '#1E3A8A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {isLoading ? '🔄 Testing...' : '🧪 Run Debug Test'}
              </button>
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#495057' }}>📋 Debug Instructions</h3>
            <ol style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li>Click "Run Debug Test" to analyze your office data and routing logic</li>
              <li>Check the console for detailed logs during the test</li>
              <li>Review the results below to identify any issues</li>
              <li>Use "Clear Cache" to force fresh data retrieval</li>
            </ol>
          </div>

          {debugResults && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#495057' }}>🔍 Debug Results</h3>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '0.5rem', alignItems: 'start' }}>
                  <strong>Timestamp:</strong>
                  <span style={{ fontFamily: 'monospace' }}>{debugResults.timestamp}</span>
                  
                  <strong>User Authenticated:</strong>
                  <span style={{ color: debugResults.userAuthenticated ? '#28a745' : '#dc3545' }}>
                    {debugResults.userAuthenticated ? '✅ Yes' : '❌ No'}
                  </span>
                  
                  <strong>User UID:</strong>
                  <span style={{ fontFamily: 'monospace' }}>{debugResults.userUID || 'NULL'}</span>
                  
                  <strong>User Email:</strong>
                  <span style={{ fontFamily: 'monospace' }}>{debugResults.userEmail || 'NULL'}</span>
                  
                  <strong>Document Exists:</strong>
                  <span style={{ color: debugResults.userDocExists ? '#28a745' : '#dc3545' }}>
                    {debugResults.userDocExists ? '✅ Yes' : '❌ No'}
                  </span>
                  
                  <strong>Office Name:</strong>
                  <span style={{ 
                    fontFamily: 'monospace',
                    color: debugResults.officeName ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {debugResults.officeName || 'NULL/UNDEFINED'}
                  </span>
                  
                  <strong>Office Name Type:</strong>
                  <span style={{ fontFamily: 'monospace' }}>{debugResults.officeNameType}</span>
                  
                  <strong>Should Show Comprehensive:</strong>
                  <span style={{ color: debugResults.shouldShowComprehensive ? '#007bff' : '#28a745' }}>
                    {debugResults.shouldShowComprehensive ? '📊 Report Screen 1 (Comprehensive)' : '📋 Report Screen 2 (Table Only)'}
                  </span>
                </div>

                {/* Direct Test Results */}
                {(debugResults as any).directTest && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '8px'
                  }}>
                    <strong style={{ color: '#856404' }}>🧪 Direct Division Logic Test (Bypasses Cache):</strong>
                    <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <span>Original:</span>
                      <span style={{ fontFamily: 'monospace' }}>"{(debugResults as any).directTest.officeName}"</span>

                      <span>Trimmed:</span>
                      <span style={{ fontFamily: 'monospace' }}>"{(debugResults as any).directTest.trimmed}"</span>

                      <span>Lowercase:</span>
                      <span style={{ fontFamily: 'monospace' }}>"{(debugResults as any).directTest.lowercase}"</span>

                      <span>Ends with "division":</span>
                      <span style={{
                        fontFamily: 'monospace',
                        color: (debugResults as any).directTest.endsWithDivision ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        {(debugResults as any).directTest.endsWithDivision ? '✅ TRUE' : '❌ FALSE'}
                      </span>

                      <span>Expected Screen:</span>
                      <span style={{
                        fontWeight: 'bold',
                        color: (debugResults as any).directTest.shouldShowComprehensive ? '#007bff' : '#28a745'
                      }}>
                        {(debugResults as any).directTest.shouldShowComprehensive ? '📊 Report Screen 1' : '📋 Report Screen 2'}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '0.5rem', alignItems: 'start' }}>
                </div>

                {debugResults.allUserDataKeys.length > 0 && (
                  <div>
                    <strong>Available Data Keys:</strong>
                    <div style={{ 
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      {debugResults.allUserDataKeys.join(', ')}
                    </div>
                  </div>
                )}

                {debugResults.rawUserData && (
                  <div>
                    <strong>Raw User Data:</strong>
                    <pre style={{ 
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {JSON.stringify(debugResults.rawUserData, null, 2)}
                    </pre>
                  </div>
                )}

                {debugResults.officeInfo && (
                  <div>
                    <strong>Office Info from Service:</strong>
                    <pre style={{ 
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(debugResults.officeInfo, null, 2)}
                    </pre>
                  </div>
                )}

                {debugResults.error && (
                  <div>
                    <strong style={{ color: '#dc3545' }}>Error:</strong>
                    <div style={{ 
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      backgroundColor: '#f8d7da',
                      color: '#721c24',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      {debugResults.error}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '12px'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#1565c0' }}>💡 Troubleshooting Tips</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
              <li><strong>Office Name is NULL:</strong> Check if the user's document in Firebase has an 'officeName' field</li>
              <li><strong>Document doesn't exist:</strong> User may not be properly registered in the employees collection</li>
              <li><strong>Wrong office name:</strong> Verify the office name format and spelling in Firebase</li>
              <li><strong>Cache issues:</strong> Use "Clear Cache" button to force fresh data retrieval</li>
              <li><strong>Authentication issues:</strong> Ensure user is properly logged in</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsDebugScreen;
