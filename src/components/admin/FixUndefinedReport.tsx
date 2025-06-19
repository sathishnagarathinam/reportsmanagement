import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FaTruck, FaTools } from 'react-icons/fa';

const FixUndefinedReport: React.FC = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [foundIssues, setFoundIssues] = useState<any[]>([]);
  const [hasUnnamedReport, setHasUnnamedReport] = useState(false);

  const scanForUndefinedReports = async () => {
    setIsFixing(true);
    setError('');
    setSuccess('');
    setFoundIssues([]);

    try {
      // Check Firebase 'pages' collection
      const pagesSnapshot = await getDocs(collection(db, 'pages'));
      const issues: any[] = [];

      pagesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const title = data.title;

        if (!title || title === 'undefined' || title.trim() === '' || title === '[Unnamed Report]') {
          issues.push({
            collection: 'pages',
            id: doc.id,
            data: data,
            issue: !title ? 'Missing title' :
                   title === 'undefined' ? 'Title is "undefined"' :
                   title === '[Unnamed Report]' ? 'Title is "[Unnamed Report]"' :
                   'Empty title'
          });
        }
      });

      setFoundIssues(issues);

      // Check if any of the issues might be the unnamed report showing in dropdown
      const hasUnnamed = issues.some(issue =>
        issue.issue.includes('Missing title') ||
        issue.issue.includes('undefined') ||
        issue.issue.includes('[Unnamed Report]')
      );
      setHasUnnamedReport(hasUnnamed);

      if (issues.length === 0) {
        setSuccess('✅ No undefined reports found! Your database is clean.');
      } else {
        setSuccess(`🔍 Found ${issues.length} report(s) with title issues. Click "Fix Issues" to resolve them.`);
      }

    } catch (err) {
      console.error('Error scanning for undefined reports:', err);
      setError('❌ Failed to scan for undefined reports. Please try again.');
    } finally {
      setIsFixing(false);
    }
  };

  const quickFixUnnamedReport = async () => {
    setIsFixing(true);
    setError('');
    setSuccess('');

    try {
      // Quick fix for the most common case - find and fix the unnamed report
      const pagesSnapshot = await getDocs(collection(db, 'pages'));
      let fixedCount = 0;

      for (const docSnapshot of pagesSnapshot.docs) {
        const data = docSnapshot.data();
        const title = data.title;

        // If this looks like it should be MMU or is unnamed
        if (!title || title === 'undefined' || title.trim() === '' || title === '[Unnamed Report]') {
          const docRef = doc(db, 'pages', docSnapshot.id);

          await updateDoc(docRef, {
            title: 'MMU',
            id: docSnapshot.id,
            lastUpdated: new Date(),
            description: 'Mail Motor Unit - Vehicle management and logistics',
            parentId: data.parentId || '',
            isPage: data.isPage !== undefined ? data.isPage : false
          });
          fixedCount++;
        }
      }

      if (fixedCount > 0) {
        setSuccess(`✅ Quick fix successful! Renamed ${fixedCount} unnamed report(s) to "MMU". The dropdown will now show "MMU" instead of "[Unnamed Report]".`);
        setFoundIssues([]);
        setHasUnnamedReport(false);

        // Refresh the page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSuccess('✅ No unnamed reports found to fix.');
      }

    } catch (err) {
      console.error('Error in quick fix:', err);
      setError('❌ Quick fix failed. Please try the full scan and fix process.');
    } finally {
      setIsFixing(false);
    }
  };

  const fixUndefinedReports = async () => {
    setIsFixing(true);
    setError('');
    setSuccess('');

    try {
      let fixedCount = 0;
      let deletedCount = 0;

      for (const issue of foundIssues) {
        const docRef = doc(db, issue.collection, issue.id);

        // Check if this should be MMU based on ID or if it has meaningful data
        const shouldBeMMU = issue.id === 'mmu' ||
                           issue.id.toLowerCase().includes('mmu') ||
                           issue.data.id === 'mmu' ||
                           (issue.data.id && issue.data.id.toLowerCase().includes('mmu'));

        if (shouldBeMMU || issue.data.id || issue.data.parentId !== undefined) {
          // Rename to MMU with proper data structure
          await updateDoc(docRef, {
            title: 'MMU',
            id: issue.id === 'mmu' ? 'mmu' : issue.data.id || 'mmu',
            lastUpdated: new Date(),
            description: 'Mail Motor Unit - Vehicle management and logistics',
            parentId: issue.data.parentId || '',
            isPage: issue.data.isPage !== undefined ? issue.data.isPage : false
          });
          fixedCount++;
        } else {
          // If it's completely empty/meaningless, delete it
          await deleteDoc(docRef);
          deletedCount++;
        }
      }

      setFoundIssues([]);
      setSuccess(`✅ Successfully fixed ${fixedCount} report(s) and removed ${deletedCount} empty report(s). The "undefined" report is now renamed to "MMU"!`);
      
      // Refresh the page after 2 seconds to show the changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      console.error('Error fixing undefined reports:', err);
      setError('❌ Failed to fix undefined reports. Please try again.');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      margin: '20px 0',
      border: '2px solid #ffc107',
      borderRadius: '8px',
      backgroundColor: '#fff3cd'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
        {React.createElement(FaTools as React.ComponentType<any>, { size: 24, color: '#856404' })}
        <h3 style={{ margin: 0, color: '#856404' }}>Fix "undefined" Report Issue</h3>
      </div>
      
      <p style={{ marginBottom: '15px', color: '#856404' }}>
        <strong>Seeing "[Unnamed Report]" or "undefined" in the dropdown?</strong><br/>
        Use the <strong>"Quick Fix: Rename to MMU"</strong> button to instantly fix this issue.
        The unnamed report will be properly renamed to "MMU" and appear correctly in the dropdown.
      </p>

      {error && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '4px'
        }}>
          {success}
        </div>
      )}

      {foundIssues.length > 0 && (
        <div style={{
          padding: '15px',
          marginBottom: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Issues Found:</h4>
          {foundIssues.map((issue, index) => (
            <div key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>
              <strong>ID:</strong> {issue.id} - <strong>Issue:</strong> {issue.issue}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={quickFixUnnamedReport}
          disabled={isFixing}
          style={{
            padding: '12px 24px',
            backgroundColor: isFixing ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isFixing ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {React.createElement(FaTruck as React.ComponentType<any>, { size: 16 })}
          {isFixing ? 'Fixing...' : 'Quick Fix: Rename to MMU'}
        </button>

        <button
          onClick={scanForUndefinedReports}
          disabled={isFixing}
          style={{
            padding: '12px 24px',
            backgroundColor: isFixing ? '#6c757d' : '#ffc107',
            color: isFixing ? 'white' : '#212529',
            border: 'none',
            borderRadius: '4px',
            cursor: isFixing ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {React.createElement(FaTools as React.ComponentType<any>, { size: 16 })}
          {isFixing ? 'Scanning...' : 'Scan for Issues'}
        </button>

        {foundIssues.length > 0 && (
          <button
            onClick={fixUndefinedReports}
            disabled={isFixing}
            style={{
              padding: '12px 24px',
              backgroundColor: isFixing ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isFixing ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {React.createElement(FaTruck as React.ComponentType<any>, { size: 16 })}
            {isFixing ? 'Fixing...' : 'Fix All Issues'}
          </button>
        )}
      </div>

      <div style={{ marginTop: '15px', fontSize: '14px', color: '#6c757d' }}>
        <strong>What this will do:</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
          <li>Scan Firebase for reports with undefined/empty titles</li>
          <li>Rename meaningful undefined reports to "MMU"</li>
          <li>Remove completely empty/invalid reports</li>
          <li>Clean up your admin panel dropdown</li>
        </ul>
      </div>
    </div>
  );
};

export default FixUndefinedReport;
