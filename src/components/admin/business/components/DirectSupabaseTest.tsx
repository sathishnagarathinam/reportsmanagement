import React, { useState } from 'react';
import { supabase } from '../../../../config/supabaseClient';

const DirectSupabaseTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDirectTest = async () => {
    setLoading(true);
    setTestResults(null);

    try {
      console.log('🚀 DIRECT TEST: Starting Supabase query...');

      // Run the exact same query as the app
      const { data: rawData, error } = await supabase
        .from('offices')
        .select('"Facility ID", Region, Division, "Office name"')
        .order('Region', { ascending: true })
        .order('Division', { ascending: true })
        .order('"Office name"', { ascending: true });

      if (error) {
        console.error('🚨 DIRECT TEST: Query error:', error);
        setTestResults({ error: error.message });
        return;
      }

      console.log('✅ DIRECT TEST: Raw data received:', rawData);

      // Process regions exactly like the app does
      const uniqueRegions = new Set<string>();
      const regionAnalysis: any[] = [];

      rawData?.forEach((record, index) => {
        const regionValue = record.Region;
        
        // Detailed analysis of each region value
        const analysis: any = {
          recordIndex: index + 1,
          facilityId: record['Facility ID'],
          regionValue: regionValue,
          regionType: typeof regionValue,
          regionString: String(regionValue),
          regionTrimmed: String(regionValue).trim(),
          isNull: regionValue === null,
          isUndefined: regionValue === undefined,
          isEmpty: regionValue === '',
          isEmptyAfterTrim: String(regionValue).trim() === '',
          addedToSet: false,
          cleanRegion: null
        };

        // Try to add to set (same logic as app)
        if (regionValue && typeof regionValue === 'string' && regionValue.trim()) {
          const cleanRegion = regionValue.trim();
          const sizeBefore = uniqueRegions.size;
          uniqueRegions.add(cleanRegion);
          const sizeAfter = uniqueRegions.size;
          analysis.addedToSet = sizeAfter > sizeBefore;
          analysis.cleanRegion = cleanRegion;
        }

        regionAnalysis.push(analysis);
      });

      // Convert Set to Array
      const regionsArray = Array.from(uniqueRegions).sort();

      // Get unique regions using SQL-like approach for comparison
      const regionValues = rawData?.map(r => r.Region).filter(r => r) || [];
      const sqlLikeRegionsSet = new Set(regionValues);
      const sqlLikeRegions = Array.from(sqlLikeRegionsSet);

      const results = {
        totalRecords: rawData?.length || 0,
        rawDataSample: rawData?.slice(0, 3),
        regionAnalysis: regionAnalysis,
        uniqueRegionsSet: Array.from(uniqueRegions),
        uniqueRegionsCount: uniqueRegions.size,
        sqlLikeRegions: sqlLikeRegions,
        sqlLikeCount: sqlLikeRegions.length,
        finalRegionsArray: regionsArray,
        success: true
      };

      console.log('🎉 DIRECT TEST: Final results:', results);
      setTestResults(results);

    } catch (err) {
      console.error('🚨 DIRECT TEST: Unexpected error:', err);
      setTestResults({ error: `Unexpected error: ${err}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="direct-supabase-test p-4 border rounded bg-light">
      <h4>🎯 Direct Supabase Test</h4>
      <p className="text-muted">This tests the exact same query and processing logic as your app.</p>
      
      <button 
        className="btn btn-primary mb-4" 
        onClick={runDirectTest}
        disabled={loading}
      >
        {loading ? '🔄 Testing...' : '🎯 Run Direct Test'}
      </button>

      {testResults && (
        <div className="test-results">
          {testResults.error ? (
            <div className="alert alert-danger">
              <strong>Error:</strong> {testResults.error}
            </div>
          ) : (
            <div>
              {/* Summary */}
              <div className="alert alert-info">
                <h5>📊 Summary</h5>
                <ul className="mb-0">
                  <li><strong>Total Records:</strong> {testResults.totalRecords}</li>
                  <li><strong>Unique Regions (App Logic):</strong> {testResults.uniqueRegionsCount}</li>
                  <li><strong>Unique Regions (SQL-like):</strong> {testResults.sqlLikeCount}</li>
                  <li><strong>Expected:</strong> 4</li>
                  <li><strong>Status:</strong> {testResults.uniqueRegionsCount === 4 ? '✅ WORKING' : '❌ BROKEN'}</li>
                </ul>
              </div>

              {/* Regions Comparison */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <h6>🔧 App Logic Regions</h6>
                  <div className="bg-white p-2 border rounded">
                    {testResults.uniqueRegionsSet.length > 0 ? (
                      <ul className="mb-0">
                        {testResults.uniqueRegionsSet.map((region: string, index: number) => (
                          <li key={index}>"{region}"</li>
                        ))}
                      </ul>
                    ) : (
                      <em className="text-muted">No regions found</em>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <h6>📊 SQL-like Regions</h6>
                  <div className="bg-white p-2 border rounded">
                    {testResults.sqlLikeRegions.length > 0 ? (
                      <ul className="mb-0">
                        {testResults.sqlLikeRegions.map((region: string, index: number) => (
                          <li key={index}>"{region}"</li>
                        ))}
                      </ul>
                    ) : (
                      <em className="text-muted">No regions found</em>
                    )}
                  </div>
                </div>
              </div>

              {/* Raw Data Sample */}
              <div className="mb-4">
                <h6>📋 Raw Data Sample (First 3 Records)</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered bg-white">
                    <thead>
                      <tr>
                        <th>Facility ID</th>
                        <th>Region</th>
                        <th>Division</th>
                        <th>Office Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.rawDataSample?.map((record: any, index: number) => (
                        <tr key={index}>
                          <td>{record['Facility ID']}</td>
                          <td>"{record.Region}" <small>({typeof record.Region})</small></td>
                          <td>"{record.Division}"</td>
                          <td>"{record['Office name']}"</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Region Analysis */}
              <div className="mb-4">
                <h6>🔍 Detailed Region Analysis (First 10 Records)</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered bg-white">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Region Value</th>
                        <th>Type</th>
                        <th>After Trim</th>
                        <th>Added to Set?</th>
                        <th>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResults.regionAnalysis?.slice(0, 10).map((analysis: any, index: number) => (
                        <tr key={index} className={analysis.addedToSet ? 'table-success' : 'table-warning'}>
                          <td>{analysis.recordIndex}</td>
                          <td>"{analysis.regionValue}"</td>
                          <td>{analysis.regionType}</td>
                          <td>"{analysis.regionTrimmed}"</td>
                          <td>{analysis.addedToSet ? '✅' : '❌'}</td>
                          <td>
                            {analysis.isNull && <span className="badge bg-danger me-1">NULL</span>}
                            {analysis.isUndefined && <span className="badge bg-danger me-1">UNDEFINED</span>}
                            {analysis.isEmpty && <span className="badge bg-warning me-1">EMPTY</span>}
                            {analysis.isEmptyAfterTrim && <span className="badge bg-warning me-1">EMPTY_TRIM</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DirectSupabaseTest;
