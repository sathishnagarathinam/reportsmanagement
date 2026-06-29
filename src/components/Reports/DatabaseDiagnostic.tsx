import React, { useState } from 'react';
import { supabase } from '../../config/supabaseClient';

const DatabaseDiagnostic: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runDiagnostic = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      addResult('🔍 Starting database diagnostic...');

      // Check all possible tables
      const tablesToCheck = [
        'dynamic_form_submissions',
        'reports_data_view', 
        'reports_test_data'
      ];

      for (const tableName of tablesToCheck) {
        addResult(`📋 Checking table: ${tableName}`);
        
        try {
          // Check if table exists and count records
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (countError) {
            addResult(`❌ ${tableName}: ${countError.message}`);
          } else {
            addResult(`✅ ${tableName}: ${count || 0} records`);
            
            // If table has data, show sample
            if (count && count > 0) {
              const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(3);
                
              if (!error && data) {
                addResult(`📄 Sample from ${tableName}:`);
                data.forEach((item, index) => {
                  const keys = Object.keys(item);
                  addResult(`  Record ${index + 1}: ${keys.join(', ')}`);
                  if (item.employee_id) {
                    addResult(`    employee_id: "${item.employee_id}"`);
                  }
                  if (item.form_identifier) {
                    addResult(`    form_identifier: "${item.form_identifier}"`);
                  }
                });
              }
            }
          }
        } catch (err) {
          addResult(`💥 ${tableName}: ${err}`);
        }
      }

      // Check if we can create test data
      addResult('🧪 Testing data creation...');
      try {
        const testData = {
          form_identifier: 'diagnostic-test',
          user_id: 'test-user',
          employee_id: 'DIAG001',
          submission_data: { test: 'diagnostic data' },
          submitted_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('dynamic_form_submissions')
          .insert(testData)
          .select();

        if (error) {
          addResult(`❌ Test insert failed: ${error.message}`);
          if (error.message.includes('employee_id')) {
            addResult(`💡 Hint: employee_id column missing - run ADD_EMPLOYEE_ID_COLUMN.sql`);
          }
        } else {
          addResult(`✅ Test insert successful: ${data?.[0]?.id}`);
          
          // Clean up test data
          if (data?.[0]?.id) {
            await supabase
              .from('dynamic_form_submissions')
              .delete()
              .eq('id', data[0].id);
            addResult(`🧹 Test data cleaned up`);
          }
        }
      } catch (err) {
        addResult(`💥 Test insert error: ${err}`);
      }

    } catch (error) {
      addResult(`💥 Diagnostic error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    setLoading(true);
    addResult('🏗️ Creating sample data with employee_id...');
    
    try {
      const sampleData = [
        {
          form_identifier: 'test',
          user_id: 'user123',
          employee_id: 'EMP001',
          submission_data: { 
            field_1749386192587: 'John Doe',
            field_1749386216803: 'john.doe@company.com',
            field_1749386266953: 'Chennai RO',
            field_1749386300152: 'Software Engineer'
          },
          submitted_at: new Date().toISOString()
        },
        {
          form_identifier: 'employee-registration',
          user_id: 'user456',
          employee_id: 'TEST001',
          submission_data: { 
            field_1749386192587: 'Jane Smith',
            field_1749386216803: 'jane.smith@company.com',
            field_1749386266953: 'Mumbai BO',
            field_1749386300152: 'HR Manager'
          },
          submitted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          form_identifier: 'daily-report',
          user_id: 'user789',
          employee_id: 'USER123456',
          submission_data: { 
            field_1749386192587: 'Mike Johnson',
            field_1749386216803: 'mike.johnson@company.com',
            field_1749386266953: 'Delhi SO',
            field_1749386300152: 'Team Lead'
          },
          submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      const { data, error } = await supabase
        .from('dynamic_form_submissions')
        .insert(sampleData)
        .select();

      if (error) {
        addResult(`❌ Sample data creation failed: ${error.message}`);
        if (error.message.includes('employee_id')) {
          addResult(`💡 Hint: Run the ADD_EMPLOYEE_ID_COLUMN.sql script first`);
        }
      } else {
        addResult(`✅ Created ${data?.length || 0} sample records with employee_id`);
        data?.forEach((item, index) => {
          addResult(`  Record ${index + 1}: employee_id="${item.employee_id}" form="${item.form_identifier}"`);
        });
      }
    } catch (error) {
      addResult(`💥 Sample data error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🔍 Database Diagnostic</h2>
      <p>This tool helps diagnose database issues and check for submission data.</p>
      
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={runDiagnostic}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '1rem'
          }}
        >
          {loading ? '🔄 Running...' : '🔍 Run Diagnostic'}
        </button>
        
        <button
          onClick={createSampleData}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {loading ? '🔄 Creating...' : '🏗️ Create Sample Data'}
        </button>
      </div>

      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '1rem',
        maxHeight: '500px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '0.875rem'
      }}>
        {results.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Click "Run Diagnostic" to check database status...</p>
        ) : (
          results.map((result, index) => (
            <div key={index} style={{ marginBottom: '0.25rem' }}>
              {result}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DatabaseDiagnostic;
