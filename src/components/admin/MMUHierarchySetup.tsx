import React, { useState } from 'react';
import { setupMMUWithSubcategories, verifyMMUHierarchy } from './business/utils/mmuCategorySetup';

const MMUHierarchySetup: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 8000);
  };

  const handleSetupMMU = async () => {
    setIsProcessing(true);
    try {
      const result = await setupMMUWithSubcategories();
      
      let successMsg = `✅ MMU Hierarchy Setup Complete!\n\n`;
      
      if (result.mmuCreated) {
        successMsg += `📁 Created MMU parent category\n`;
      } else {
        successMsg += `📁 MMU parent category already exists\n`;
      }
      
      if (result.subcategoriesCreated.length > 0) {
        successMsg += `📄 Created subcategories:\n`;
        result.subcategoriesCreated.forEach(name => {
          successMsg += `   • ${name}\n`;
        });
      } else {
        successMsg += `📄 All subcategories already exist\n`;
      }
      
      if (result.errors.length > 0) {
        successMsg += `\n⚠️ Errors encountered:\n`;
        result.errors.forEach(error => {
          successMsg += `   • ${error}\n`;
        });
      }
      
      successMsg += `\n🔄 Please refresh the page to see changes.`;
      
      showMessage(successMsg, result.errors.length > 0 ? 'error' : 'success');
      
      // Auto-refresh after 3 seconds if no errors
      if (result.errors.length === 0) {
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
      
    } catch (error) {
      console.error('Setup failed:', error);
      showMessage(`❌ Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyHierarchy = async () => {
    setIsProcessing(true);
    try {
      const verification = await verifyMMUHierarchy();
      
      let verifyMsg = `${verification.summary}\n\n`;
      
      if (verification.issues.length > 0) {
        verifyMsg += `Issues found:\n`;
        verification.issues.forEach(issue => {
          verifyMsg += `   • ${issue}\n`;
        });
        verifyMsg += `\nRun "Setup MMU Hierarchy" to fix these issues.`;
      } else {
        verifyMsg += `All checks passed! MMU hierarchy is properly configured.`;
      }
      
      showMessage(verifyMsg, verification.isValid ? 'success' : 'error');
      
    } catch (error) {
      console.error('Verification failed:', error);
      showMessage(`❌ Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
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
      fontSize: '14px',
      maxHeight: '300px',
      overflowY: 'auto' as const
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
      backgroundColor: '#e8f5e8',
      border: '1px solid #28a745',
      borderRadius: '8px',
      padding: '20px',
      margin: '20px 0'
    }}>
      <h3 style={{ color: '#155724', marginBottom: '15px' }}>
        🚛 MMU Hierarchy Setup
      </h3>
      
      <p style={{ color: '#155724', marginBottom: '20px' }}>
        Set up MMU (Mail Motor Unit) category with subcategories using the same hierarchical logic as PLI.
        This will create a parent MMU category and link it with professional subcategories.
      </p>

      {message && (
        <div style={getMessageStyle()}>
          {message}
        </div>
      )}

      {/* Setup Section */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#155724', marginBottom: '10px' }}>
          🔧 Create MMU Hierarchy
        </h4>
        <p style={{ color: '#155724', fontSize: '14px', marginBottom: '15px' }}>
          This will create:
          <br />• MMU parent category (if not exists)
          <br />• Vehicle Maintenance subcategory
          <br />• Fuel Management subcategory
          <br />• Driver Management subcategory
          <br />• Route Optimization subcategory
          <br />• Vehicle Tracking subcategory
          <br />• Maintenance Schedule subcategory
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
            fontWeight: 'bold',
            marginRight: '10px'
          }}
        >
          {isProcessing ? '🔄 Setting up...' : '🚀 Setup MMU Hierarchy'}
        </button>

        <button
          onClick={handleVerifyHierarchy}
          disabled={isProcessing}
          style={{
            padding: '12px 24px',
            backgroundColor: isProcessing ? '#6c757d' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {isProcessing ? '🔍 Checking...' : '🔍 Verify Hierarchy'}
        </button>
      </div>

      {/* Expected Result Section */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '4px',
        border: '1px solid #dee2e6'
      }}>
        <h5 style={{ color: '#495057', marginBottom: '10px' }}>Expected Result:</h5>
        <div style={{ fontSize: '14px', color: '#6c757d', fontFamily: 'monospace' }}>
          📁 MMU (Parent Category)<br />
          ├── 🚛 Vehicle Maintenance<br />
          ├── ⛽ Fuel Management<br />
          ├── 👔 Driver Management<br />
          ├── 🗺️ Route Optimization<br />
          ├── 📍 Vehicle Tracking<br />
          └── 📅 Maintenance Schedule
        </div>
        <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '10px', marginBottom: '0' }}>
          <strong>Navigation:</strong> Data Entry → MMU → [Select Subcategory] → Form
        </p>
      </div>
    </div>
  );
};

export default MMUHierarchySetup;
