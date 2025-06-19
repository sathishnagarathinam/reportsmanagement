import React, { useState } from 'react';
import { supabase } from '../../config/supabaseClient';

const BasicSupabaseTest: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runBasicTest = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      addResult('🔍 Starting basic Supabase test...');

      // Test 1: Simple query
      addResult('📡 Testing basic connection...');
      try {
        const { data, error } = await supabase
          .from('simple_test_table')
          .select('*');
        
        if (error) {
          addResult(`❌ Connection failed: ${error.message}`);
          addResult(`💡 Error details: ${JSON.stringify(error)}`);
        } else {
          addResult(`✅ Connection successful! Found ${data?.length || 0} records`);
          if (data && data.length > 0) {
            addResult(`📄 Sample data: ${JSON.stringify(data[0])}`);
          }
        }
      } catch (err) {
        addResult(`💥 Connection error: ${err}`);
      }

      // Test 2: Check environment variables
      addResult('🔧 Checking configuration...');
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
      
      addResult(`📍 Supabase URL: ${supabaseUrl ? 'Set' : 'Missing'}`);
      addResult(`🔑 Supabase Key: ${supabaseKey ? 'Set' : 'Missing'}`);
      
      if (supabaseUrl) {
        addResult(`🌐 URL starts with: ${supabaseUrl.substring(0, 30)}...`);
      }

      // Test 3: Try to create a record
      addResult('📝 Testing data insertion...');
      try {
        const { data, error } = await supabase
          .from('simple_test_table')
          .insert([{ message: `Test from React at ${new Date().toISOString()}` }])
          .select();
        
        if (error) {
          addResult(`❌ Insert failed: ${error.message}`);
        } else {
          addResult(`✅ Insert successful! Created record: ${JSON.stringify(data)}`);
        }
      } catch (err) {
        addResult(`💥 Insert error: ${err}`);
      }

      // Test 4: Count records
      addResult('📊 Testing count query...');
      try {
        const { count, error } = await supabase
          .from('simple_test_table')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          addResult(`❌ Count failed: ${error.message}`);
        } else {
          addResult(`✅ Count successful! Total records: ${count}`);
        }
      } catch (err) {
        addResult(`💥 Count error: ${err}`);
      }

      addResult('🎉 Basic test completed!');

    } catch (error) {
      addResult(`💥 Fatal error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testReportsTable = async () => {
    setLoading(true);
    addResult('🔍 Testing reports-related tables...');

    const tablesToTest = [
      'dynamic_form_submissions',
      'reports_test_data',
      'reports_data_view'
    ];

    for (const tableName of tablesToTest) {
      try {
        addResult(`📋 Testing table: ${tableName}`);
        
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          addResult(`❌ ${tableName}: ${error.message}`);
        } else {
          addResult(`✅ ${tableName}: ${count} records found`);
          
          // If records exist, try to fetch one
          if (count && count > 0) {
            const { data: sampleData, error: sampleError } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (!sampleError && sampleData && sampleData.length > 0) {
              addResult(`📄 ${tableName} sample: ${JSON.stringify(sampleData[0])}`);
            }
          }
        }
      } catch (err) {
        addResult(`💥 ${tableName} error: ${err}`);
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🔍 Basic Supabase Connection Test</h2>
      <p>This will test the most basic Supabase functionality.</p>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={runBasicTest}
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
          {loading ? '🔄 Testing...' : '🧪 Run Basic Test'}
        </button>
        
        <button 
          onClick={testReportsTable}
          disabled={loading}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px'
          }}
        >
          {loading ? '🔄 Testing...' : '📊 Test Reports Tables'}
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
        {results.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Click a test button to start...</p>
        ) : (
          <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {results.map((result, index) => (
              <div key={index} style={{ marginBottom: '0.5rem', wordBreak: 'break-word' }}>
                {result}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <h4>📋 Instructions:</h4>
        <ol>
          <li><strong>First:</strong> Run the BASIC_SUPABASE_TEST.sql script in Supabase SQL Editor</li>
          <li><strong>Then:</strong> Click "Run Basic Test" to verify connection</li>
          <li><strong>Finally:</strong> Click "Test Reports Tables" to check reports data</li>
        </ol>
        
        <h4>✅ Success Indicators:</h4>
        <ul>
          <li>✅ "Connection successful!" message</li>
          <li>✅ Environment variables are "Set"</li>
          <li>✅ Insert and count operations work</li>
          <li>✅ At least one reports table has data</li>
        </ul>
      </div>
    </div>
  );
};

export default BasicSupabaseTest;
