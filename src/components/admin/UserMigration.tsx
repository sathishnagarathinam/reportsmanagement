import React, { useState } from 'react';
import { UserMigrationService } from '../../utils/migrateUsersToSupabase';
import './UserMigration.css';

interface MigrationResult {
  totalFirebaseUsers: number;
  totalSupabaseUsers: number;
  migratedUsers: number;
  errors: string[];
}

interface ValidationResult {
  consistent: boolean;
  issues: string[];
}

const UserMigration: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFullMigration = async () => {
    setIsLoading(true);
    setError(null);
    setMigrationResult(null);

    try {
      console.log('🚀 Starting full user migration...');
      const result = await UserMigrationService.performFullMigration();
      setMigrationResult(result);
      
      if (result.errors.length > 0) {
        setError(`Migration completed with errors: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidation = async () => {
    setIsLoading(true);
    setError(null);
    setValidationResult(null);

    try {
      console.log('🔍 Validating data consistency...');
      const result = await UserMigrationService.validateDataConsistency();
      setValidationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleUserMigration = async () => {
    const firebaseUID = prompt('Enter Firebase UID to migrate:');
    if (!firebaseUID) return;

    setIsLoading(true);
    setError(null);

    try {
      const success = await UserMigrationService.migrateSingleUser(firebaseUID);
      if (success) {
        alert(`User ${firebaseUID} migrated successfully!`);
      } else {
        setError(`Failed to migrate user ${firebaseUID}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Single user migration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="user-migration">
      <div className="migration-header">
        <h2>User Migration Tool</h2>
        <p>Migrate users from Firebase to Supabase to fix profile update issues</p>
      </div>

      <div className="migration-actions">
        <div className="action-card">
          <h3>🔍 Validate Data Consistency</h3>
          <p>Check for missing users and data mismatches between Firebase and Supabase</p>
          <button 
            onClick={handleValidation}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            {isLoading ? 'Validating...' : 'Validate Data'}
          </button>
        </div>

        <div className="action-card">
          <h3>🚀 Full Migration</h3>
          <p>Migrate all missing users from Firebase to Supabase</p>
          <button 
            onClick={handleFullMigration}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Migrating...' : 'Start Full Migration'}
          </button>
        </div>

        <div className="action-card">
          <h3>👤 Single User Migration</h3>
          <p>Migrate a specific user by Firebase UID</p>
          <button 
            onClick={handleSingleUserMigration}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            {isLoading ? 'Migrating...' : 'Migrate Single User'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <h4>❌ Error</h4>
          <p>{error}</p>
        </div>
      )}

      {validationResult && (
        <div className={`validation-result ${validationResult.consistent ? 'success' : 'warning'}`}>
          <h4>{validationResult.consistent ? '✅ Data Consistent' : '⚠️ Data Issues Found'}</h4>
          {validationResult.issues.length > 0 && (
            <ul>
              {validationResult.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {migrationResult && (
        <div className="migration-result">
          <h4>📊 Migration Results</h4>
          <div className="result-stats">
            <div className="stat">
              <span className="stat-label">Firebase Users:</span>
              <span className="stat-value">{migrationResult.totalFirebaseUsers}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Supabase Users (before):</span>
              <span className="stat-value">{migrationResult.totalSupabaseUsers}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Migrated Users:</span>
              <span className="stat-value success">{migrationResult.migratedUsers}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Errors:</span>
              <span className="stat-value error">{migrationResult.errors.length}</span>
            </div>
          </div>
          
          {migrationResult.errors.length > 0 && (
            <div className="migration-errors">
              <h5>Errors:</h5>
              <ul>
                {migrationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="migration-info">
        <h4>ℹ️ How This Fixes Profile Updates</h4>
        <ul>
          <li>Profile updates fail when users exist in Firebase but not in Supabase</li>
          <li>This tool migrates missing user records to Supabase</li>
          <li>After migration, profile updates will work for all users</li>
          <li>The migration preserves all user data and maintains consistency</li>
        </ul>
      </div>

      <div className="migration-steps">
        <h4>📋 Recommended Steps</h4>
        <ol>
          <li><strong>Validate Data:</strong> Check for missing users and inconsistencies</li>
          <li><strong>Run Migration:</strong> Migrate all missing users to Supabase</li>
          <li><strong>Test Profile Updates:</strong> Verify that profile editing now works</li>
          <li><strong>Monitor:</strong> Check logs for any remaining issues</li>
        </ol>
      </div>
    </div>
  );
};

export default UserMigration;
