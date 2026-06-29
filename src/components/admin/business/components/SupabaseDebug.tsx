import React, { useState } from 'react';
import { supabase } from '../../../../config/supabaseClient';

const SupabaseDebug: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const testConnection = async () => {
    setLoading(true);
    setTestResult('Testing connection...');
    
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .limit(5);

      if (error) {
        setTestResult(`Error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`);
      } else {
        setTestResult(`Success! Found ${data?.length || 0} records.\n\nSample data:\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setTestResult(`Unexpected error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testTableStructure = async () => {
    setLoading(true);
    setTestResult('Testing table structure...');

    try {
      // Try to get just the column names by selecting with limit 1
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .limit(1);

      if (error) {
        setTestResult(`Error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`);
      } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        setTestResult(`Table structure:\nColumns found: ${columns.join(', ')}\n\nSample record:\n${JSON.stringify(data[0], null, 2)}`);
      } else {
        setTestResult('Table exists but is empty');
      }
    } catch (err) {
      setTestResult(`Unexpected error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testHierarchyQuery = async () => {
    setLoading(true);
    setTestResult('Testing hierarchy query...');

    try {
      // Test the exact query used by the component
      const { data, error } = await supabase
        .from('offices')
        .select('"Facility ID", Region, Division, "Office name"')
        .order('Region', { ascending: true })
        .order('Division', { ascending: true })
        .order('"Office name"', { ascending: true });

      if (error) {
        setTestResult(`Error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`);
      } else {
        const regionSet = new Set(data?.map(r => r.Region) || []);
        const divisionSet = new Set(data?.map(r => r.Division) || []);
        const regions = Array.from(regionSet);
        const divisions = Array.from(divisionSet);

        setTestResult(`Hierarchy Query Success!\n\nTotal Records: ${data?.length || 0}\nUnique Regions: ${regions.length} (${regions.join(', ')})\nUnique Divisions: ${divisions.length}\n\nFirst 3 records:\n${JSON.stringify(data?.slice(0, 3), null, 2)}`);
      }
    } catch (err) {
      setTestResult(`Unexpected error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testRegionExtraction = async () => {
    setLoading(true);
    setTestResult('Testing region extraction specifically...');

    try {
      // Get all records and analyze regions
      const { data, error } = await supabase
        .from('offices')
        .select('Region')
        .order('Region', { ascending: true });

      if (error) {
        setTestResult(`Error: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}`);
      } else {
        const allRegions = data?.map(r => r.Region) || [];
        const regionAnalysis = allRegions.map((region, index) => ({
          index: index + 1,
          value: region,
          type: typeof region,
          length: region?.length || 0,
          trimmed: region?.trim(),
          isEmpty: !region || region.trim() === '',
          hasSpaces: region !== region?.trim()
        }));

        const filteredRegions = allRegions.filter(r => r && r.trim());
        const uniqueRegionsSet = new Set(filteredRegions);
        const uniqueRegions = Array.from(uniqueRegionsSet);

        setTestResult(`Region Analysis:\n\nTotal Records: ${allRegions.length}\nUnique Regions: ${uniqueRegions.length}\nRegions: ${uniqueRegions.join(', ')}\n\nDetailed Analysis:\n${JSON.stringify(regionAnalysis, null, 2)}`);
      }
    } catch (err) {
      setTestResult(`Unexpected error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="supabase-debug p-4 border rounded">
      <h4>Supabase Connection Debug</h4>
      <div className="mb-3">
        <button
          className="btn btn-primary me-2"
          onClick={testConnection}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          className="btn btn-secondary me-2"
          onClick={testTableStructure}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Check Table Structure'}
        </button>
        <button
          className="btn btn-info me-2"
          onClick={testHierarchyQuery}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test Hierarchy Query'}
        </button>
        <button
          className="btn btn-warning"
          onClick={testRegionExtraction}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Debug Regions Only'}
        </button>
      </div>
      
      {testResult && (
        <div className="mt-3">
          <h5>Result:</h5>
          <pre className="bg-light p-3 border rounded" style={{ whiteSpace: 'pre-wrap' }}>
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SupabaseDebug;
