import React, { useState } from 'react';
import { setupMMUAndCleanup, addCustomMMUReport } from './business/utils/mmuSetup';

const MMUSetupTool: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [customReportId, setCustomReportId] = useState('');
  const [customReportTitle, setCustomReportTitle] = useState('');

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSetupMMU = async () => {
    setIsProcessing(true);
    try {
      const result = await setupMMUAndCleanup();
      
      let successMsg = `✅ MMU Setup Complete!\n`;
      successMsg += `🗑️ Cleaned ${result.cleaned} undefined entries\n`;
      successMsg += `📁 MMU category is properly configured\n`;
      
      if (result.nestedReports.length > 0) {
        successMsg += `📄 Created nested reports: ${result.nestedReports.join(', ')}\n`;
      }
      
      successMsg += `\n🔄 Please refresh the page to see changes.`;
      
      showMessage(successMsg, 'success');
      
      // Auto-refresh after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('Setup failed:', error);
      showMessage(`❌ Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCustomReport = async () => {
    if (!customReportId.trim() || !customReportTitle.trim()) {
      showMessage('❌ Please enter both Report ID and Title', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const success = await addCustomMMUReport(customReportId, customReportTitle);
      
      if (success) {
        showMessage(`✅ Successfully created "${customReportTitle}" under MMU!`, 'success');
        setCustomReportId('');
        setCustomReportTitle('');
        
        // Auto-refresh after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showMessage('❌ Failed to create custom report', 'error');
      }
    } catch (error) {
      console.error('Failed to add custom report:', error);
      showMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getMessageStyle = () => {
    const baseStyle = {
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '20px',
      whiteSpace: 'pre-line' as const,
      fontFamily: 'monospace',
      fontSize: '14px'
    };

    switch (messageType) {
      case 'success':
        return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
      case 'error':
        return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
      default:
        return { ...baseStyle, backgroundColor: '#d1ecf1', color: '#0c5460', border: '1px solid #bee5eb' };
    }
  };

  return (
    <div style={{
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '8px',
      padding: '20px',
      margin: '20px 0'
    }}>
      <h3 style={{ color: '#856404', marginBottom: '15px' }}>
        🚛 MMU Setup & Management Tool
      </h3>
      
      <p style={{ color: '#856404', marginBottom: '20px' }}>
        This tool will fix the "undefined" issues and properly set up the MMU (Mail Motor Unit) category with nested reports.
      </p>

      {message && (
        <div style={getMessageStyle()}>
          {message}
        </div>
      )}

      {/* Main Setup Section */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ color: '#856404', marginBottom: '10px' }}>
          🔧 Setup MMU & Clean Database
        </h4>
        <p style={{ color: '#856404', fontSize: '14px', marginBottom: '15px' }}>
          This will:
          <br />• Remove all undefined entries from the database
          <br />• Create or fix the MMU category
          <br />• Add default nested reports (Vehicle Maintenance, Fuel Management, etc.)
        </p>
        <button
          onClick={handleSetupMMU}
          disabled={isProcessing}
          style={{
            padding: '12px 24px',
            backgroundColor: isProcessing ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {isProcessing ? '🔄 Setting up MMU...' : '🚀 Setup MMU & Clean Database'}
        </button>
      </div>

      {/* Custom Report Section */}
      <div style={{ borderTop: '1px solid #ffeaa7', paddingTop: '20px' }}>
        <h4 style={{ color: '#856404', marginBottom: '10px' }}>
          ➕ Add Custom Nested Report to MMU
        </h4>
        <p style={{ color: '#856404', fontSize: '14px', marginBottom: '15px' }}>
          Add a custom report under the MMU category:
        </p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Report ID (e.g., 'vehicle-tracking')"
            value={customReportId}
            onChange={(e) => setCustomReportId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            style={{
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              minWidth: '200px',
              flex: '1'
            }}
          />
          <input
            type="text"
            placeholder="Report Title (e.g., 'Vehicle Tracking')"
            value={customReportTitle}
            onChange={(e) => setCustomReportTitle(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              minWidth: '200px',
              flex: '1'
            }}
          />
        </div>
        
        <button
          onClick={handleAddCustomReport}
          disabled={isProcessing || !customReportId.trim() || !customReportTitle.trim()}
          style={{
            padding: '10px 20px',
            backgroundColor: isProcessing ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isProcessing || !customReportId.trim() || !customReportTitle.trim()) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isProcessing ? '➕ Adding...' : '➕ Add Custom Report'}
        </button>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#e2e3e5', 
        borderRadius: '4px',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <strong>Note:</strong> After using this tool, the page will automatically refresh to show the changes. 
        The MMU category will appear properly in the dropdown without any "undefined" entries.
      </div>
    </div>
  );
};

export default MMUSetupTool;
