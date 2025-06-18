import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../config/supabaseClient';

interface DebugResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

const ComprehensiveDebug: React.FC = () => {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (step: string, status: 'success' | 'error' | 'warning', message: string, data?: any) => {
    setResults(prev => [...prev, { step, status, message, data }]);
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Step 1: Test basic connection
      addResult('1', 'success', 'Starting comprehensive debug...', null);

      // Step 2: Test table existence and basic query
      try {
        const { data: basicData, error: basicError } = await supabase
          .from('offices')
          .select('*')
          .limit(1);

        if (basicError) {
          addResult('2', 'error', `Table access failed: ${basicError.message}`, basicError);
          return;
        }

        addResult('2', 'success', `Table accessible. Sample record:`, basicData?.[0]);
      } catch (err) {
        addResult('2', 'error', `Connection failed: ${err}`, null);
        return;
      }

      // Step 3: Check total record count
      const { count, error: countError } = await supabase
        .from('offices')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        addResult('3', 'error', `Count query failed: ${countError.message}`, countError);
      } else {
        addResult('3', 'success', `Total records in table: ${count}`, { count });
      }

      // Step 4: Test the exact query used by the app
      const { data: appData, error: appError } = await supabase
        .from('offices')
        .select('"Facility ID", Region, Division, "Office name"')
        .order('Region', { ascending: true })
        .order('Division', { ascending: true })
        .order('"Office name"', { ascending: true });

      if (appError) {
        addResult('4', 'error', `App query failed: ${appError.message}`, appError);
        return;
      }

      addResult('4', 'success', `App query successful. Retrieved ${appData?.length || 0} records`, {
        totalRecords: appData?.length,
        firstRecord: appData?.[0],
        lastRecord: appData?.[appData?.length - 1]
      });

      // Step 5: Analyze regions specifically
      const allRegions = appData?.map(record => record.Region) || [];
      const regionAnalysis = allRegions.map((region, index) => ({
        index: index + 1,
        value: region,
        type: typeof region,
        isNull: region === null,
        isUndefined: region === undefined,
        isEmpty: region === '',
        length: region?.length || 0,
        trimmed: region?.trim(),
        hasLeadingSpaces: region !== region?.trimStart(),
        hasTrailingSpaces: region !== region?.trimEnd(),
      }));

      addResult('5', 'success', `Region analysis completed`, {
        totalRegions: allRegions.length,
        analysis: regionAnalysis.slice(0, 10) // First 10 for brevity
      });

      // Step 6: Extract unique regions (simulate app logic)
      const uniqueRegionsSet = new Set<string>();
      const validRegions: string[] = [];
      const invalidRegions: any[] = [];

      appData?.forEach((record, index) => {
        const region = record.Region;
        
        if (!region || typeof region !== 'string' || region.trim() === '') {
          invalidRegions.push({ index: index + 1, region, record });
        } else {
          const cleanRegion = region.trim();
          validRegions.push(cleanRegion);
          uniqueRegionsSet.add(cleanRegion);
        }
      });

      const uniqueRegionsArray = Array.from(uniqueRegionsSet);

      addResult('6', uniqueRegionsArray.length === 4 ? 'success' : 'warning', 
        `Unique regions extracted: ${uniqueRegionsArray.length} (Expected: 4)`, {
        uniqueRegions: uniqueRegionsArray,
        validRegionsCount: validRegions.length,
        invalidRegionsCount: invalidRegions.length,
        invalidRegions: invalidRegions.slice(0, 5) // First 5 invalid
      });

      // Step 7: Test region-to-ID conversion
      const regionsWithIds = uniqueRegionsArray.map(regionName => ({
        original: regionName,
        id: regionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: regionName
      }));

      addResult('7', 'success', 'Region ID generation completed', regionsWithIds);

      // Step 8: Test division extraction
      const uniqueDivisionsMap = new Map<string, string>();
      appData?.forEach(record => {
        if (record.Region && record.Division && 
            typeof record.Region === 'string' && typeof record.Division === 'string' &&
            record.Region.trim() && record.Division.trim()) {
          uniqueDivisionsMap.set(record.Division.trim(), record.Region.trim());
        }
      });

      const divisionsArray = Array.from(uniqueDivisionsMap.entries()).map(([divisionName, regionName]) => ({
        id: divisionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: divisionName,
        region: regionName
      }));

      addResult('8', 'success', `Divisions extracted: ${divisionsArray.length}`, {
        totalDivisions: divisionsArray.length,
        divisions: divisionsArray.slice(0, 10)
      });

      // Step 9: Test office extraction
      const validOffices = appData?.filter(record => 
        record['Facility ID'] && 
        record.Region && 
        record.Division && 
        record['Office name']
      ) || [];

      addResult('9', 'success', `Valid offices: ${validOffices.length}`, {
        totalOffices: validOffices.length,
        sampleOffices: validOffices.slice(0, 5)
      });

      // Step 10: Final summary
      addResult('10', 'success', 'Debug completed successfully!', {
        summary: {
          totalRecords: appData?.length || 0,
          uniqueRegions: uniqueRegionsArray.length,
          totalDivisions: divisionsArray.length,
          validOffices: validOffices.length,
          expectedRegions: 4,
          regionsMissing: 4 - uniqueRegionsArray.length,
          hierarchyWorking: uniqueRegionsArray.length === 4 && divisionsArray.length > 0
        }
      });

    } catch (error) {
      addResult('ERROR', 'error', `Unexpected error: ${error}`, error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="comprehensive-debug p-4 border rounded">
      <h4>🔍 Comprehensive Hierarchy Debug</h4>
      <p className="text-muted">This will test every step of the data flow to identify the exact issue.</p>
      
      <button 
        className="btn btn-primary mb-4" 
        onClick={runComprehensiveTest}
        disabled={isRunning}
      >
        {isRunning ? '🔄 Running Tests...' : '🚀 Run Complete Debug'}
      </button>

      {results.length > 0 && (
        <div className="debug-results">
          <h5>Debug Results:</h5>
          {results.map((result, index) => (
            <div 
              key={index} 
              className={`alert ${
                result.status === 'success' ? 'alert-success' : 
                result.status === 'error' ? 'alert-danger' : 
                'alert-warning'
              } mb-2`}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong>Step {result.step}:</strong> {result.message}
                </div>
                <span className={`badge ${
                  result.status === 'success' ? 'bg-success' : 
                  result.status === 'error' ? 'bg-danger' : 
                  'bg-warning'
                }`}>
                  {result.status.toUpperCase()}
                </span>
              </div>
              
              {result.data && (
                <details className="mt-2">
                  <summary className="btn btn-sm btn-outline-secondary">View Data</summary>
                  <pre className="mt-2 p-2 bg-light border rounded small">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComprehensiveDebug;
