import React, { useState } from 'react';
import { supabase } from '../../config/supabaseClient';

const ReportsTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runDiagnostics = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('🔍 Starting Supabase diagnostics...');

      // Test 1: Basic connection
      addResult('📡 Testing basic Supabase connection...');
      try {
        const { data, error } = await supabase.from('dynamic_form_submissions').select('count', { count: 'exact', head: true });
        if (error) {
          addResult(`❌ Connection test failed: ${error.message}`);
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            addResult('💡 Table "dynamic_form_submissions" does not exist. Please run the SQL setup script.');
          }
          if (error.message.includes('permission denied')) {
            addResult('💡 Permission denied. Please check Row Level Security settings.');
          }
        } else {
          addResult(`✅ Connection successful! Table has ${data} records`);
        }
      } catch (err) {
        addResult(`💥 Connection error: ${err}`);
      }

      // Test 2: Try to fetch data
      addResult('📥 Testing data fetch...');
      try {
        const { data, error } = await supabase
          .from('dynamic_form_submissions')
          .select('*')
          .limit(5);
        
        if (error) {
          addResult(`❌ Data fetch failed: ${error.message}`);
        } else {
          addResult(`✅ Data fetch successful! Got ${data?.length || 0} records`);
          if (data && data.length > 0) {
            addResult(`📄 Sample record: ${JSON.stringify(data[0], null, 2)}`);
          }
        }
      } catch (err) {
        addResult(`💥 Data fetch error: ${err}`);
      }

      // Test 3: Check table structure
      addResult('🏗️ Checking table structure...');
      try {
        const { data, error } = await supabase.rpc('get_table_info', { table_name: 'dynamic_form_submissions' });
        if (error) {
          addResult(`⚠️ Could not check table structure: ${error.message}`);
        } else {
          addResult(`📋 Table structure check completed`);
        }
      } catch (err) {
        addResult(`⚠️ Table structure check not available`);
      }

      // Test 4: Test specific queries
      addResult('🔍 Testing specific queries...');
      try {
        // Test form identifiers
        const { data: formData, error: formError } = await supabase
          .from('dynamic_form_submissions')
          .select('form_identifier');
        
        if (formError) {
          addResult(`❌ Form identifiers query failed: ${formError.message}`);
        } else {
          const uniqueForms = new Set(formData?.map((item: any) => item.form_identifier));
          addResult(`📋 Found ${uniqueForms.size} unique form types: ${Array.from(uniqueForms).join(', ')}`);
        }

        // Test user IDs
        const { data: userData, error: userError } = await supabase
          .from('dynamic_form_submissions')
          .select('user_id');
        
        if (userError) {
          addResult(`❌ User IDs query failed: ${userError.message}`);
        } else {
          const uniqueUsers = new Set(userData?.map((item: any) => item.user_id));
          addResult(`👥 Found ${uniqueUsers.size} unique users`);
        }
      } catch (err) {
        addResult(`💥 Specific queries error: ${err}`);
      }

      addResult('🎉 Diagnostics completed!');

    } catch (error) {
      addResult(`💥 Fatal error during diagnostics: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    setLoading(true);
    addResult('🔧 Creating sample data...');

    try {
      const sampleData = [
        {
          form_identifier: 'test-form-1',
          user_id: '123e4567-e89b-12d3-a456-426614174999',
          submission_data: {
            name: 'Test User 1',
            email: 'test1@example.com',
            officeName: 'Test Office 1'
          },
          submitted_at: new Date().toISOString()
        },
        {
          form_identifier: 'test-form-2',
          user_id: '123e4567-e89b-12d3-a456-426614174998',
          submission_data: {
            name: 'Test User 2',
            email: 'test2@example.com',
            officeName: 'Test Office 2'
          },
          submitted_at: new Date().toISOString()
        }
      ];

      const { data, error } = await supabase
        .from('dynamic_form_submissions')
        .insert(sampleData);

      if (error) {
        addResult(`❌ Failed to create sample data: ${error.message}`);
      } else {
        addResult(`✅ Sample data created successfully!`);
        addResult(`📊 Created ${sampleData.length} test records`);
      }
    } catch (err) {
      addResult(`💥 Error creating sample data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🔍 Reports Diagnostics</h2>
      <p>Use this page to diagnose and fix reports issues.</p>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={runDiagnostics}
          disabled={loading}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            marginRight: '1rem'
          }}
        >
          {loading ? '🔄 Running...' : '🔍 Run Diagnostics'}
        </button>
        
        <button 
          onClick={createSampleData}
          disabled={loading}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px'
          }}
        >
          {loading ? '🔄 Creating...' : '🔧 Create Sample Data'}
        </button>
      </div>

      <div style={{ 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '4px', 
        padding: '1rem',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        <h4>📋 Test Results:</h4>
        {testResults.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Click "Run Diagnostics" to start testing...</p>
        ) : (
          <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {testResults.map((result, index) => (
              <div key={index} style={{ marginBottom: '0.5rem', wordBreak: 'break-word' }}>
                {result}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <h4>💡 Quick Fixes:</h4>
        <ul>
          <li><strong>Table doesn't exist:</strong> Run the SQL script from SUPABASE_DIAGNOSTIC_SCRIPT.sql in Supabase SQL Editor</li>
          <li><strong>Permission denied:</strong> Disable Row Level Security: <code>ALTER TABLE dynamic_form_submissions DISABLE ROW LEVEL SECURITY;</code></li>
          <li><strong>No data:</strong> Click "Create Sample Data" button above or run the full SQL setup script</li>
          <li><strong>Connection issues:</strong> Check your Supabase URL and API key in environment variables</li>
        </ul>
      </div>
    </div>
  );
};

export default ReportsTest;
