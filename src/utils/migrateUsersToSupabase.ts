import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { supabase } from '../config/supabaseClient';

/**
 * Migration utility to sync existing Firebase users to Supabase user_profiles table
 * This fixes the issue where users exist in Firebase but not in Supabase
 */

interface FirebaseUser {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  officeName?: string;
  divisionName?: string;
  designation?: string;
  mobileNumber?: string;
  role?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface SupabaseUser {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  officeName: string | null;
  divisionName: string | null;
  designation: string | null;
  mobileNumber: string | null;
  role: string;
}

export class UserMigrationService {
  
  /**
   * Fetches all users from Firebase employees collection
   */
  static async fetchFirebaseUsers(): Promise<FirebaseUser[]> {
    try {
      console.log('🔍 Migration: Fetching users from Firebase...');
      
      const employeesCollection = collection(db, 'employees');
      const snapshot = await getDocs(employeesCollection);
      
      const users: FirebaseUser[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id, // Document ID is the Firebase Auth UID
          employeeId: data.employeeId || '',
          name: data.name || '',
          email: data.email || '',
          officeName: data.officeName || '',
          divisionName: data.divisionName || '',
          designation: data.designation || '',
          mobileNumber: data.mobileNumber || '',
          role: data.role || 'user',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      
      console.log(`✅ Migration: Found ${users.length} users in Firebase`);
      return users;
      
    } catch (error) {
      console.error('❌ Migration: Error fetching Firebase users:', error);
      throw error;
    }
  }

  /**
   * Fetches existing users from Supabase user_profiles table
   */
  static async fetchSupabaseUsers(): Promise<SupabaseUser[]> {
    try {
      console.log('🔍 Migration: Fetching users from Supabase...');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('uid, employeeId, name, email, officeName, divisionName, designation, mobileNumber, role');

      if (error) {
        throw error;
      }

      console.log(`✅ Migration: Found ${data?.length || 0} users in Supabase`);
      return data || [];
      
    } catch (error) {
      console.error('❌ Migration: Error fetching Supabase users:', error);
      throw error;
    }
  }

  /**
   * Finds users that exist in Firebase but not in Supabase
   */
  static findMissingUsers(firebaseUsers: FirebaseUser[], supabaseUsers: SupabaseUser[]): FirebaseUser[] {
    const supabaseUIDs = new Set(supabaseUsers.map(user => user.uid));
    const supabaseEmployeeIds = new Set(supabaseUsers.map(user => user.employeeId));
    
    const missingUsers = firebaseUsers.filter(fbUser => 
      !supabaseUIDs.has(fbUser.uid) && !supabaseEmployeeIds.has(fbUser.employeeId)
    );
    
    console.log(`🔍 Migration: Found ${missingUsers.length} users missing from Supabase`);
    return missingUsers;
  }

  /**
   * Migrates missing users from Firebase to Supabase
   */
  static async migrateMissingUsers(missingUsers: FirebaseUser[]): Promise<void> {
    if (missingUsers.length === 0) {
      console.log('✅ Migration: No users to migrate');
      return;
    }

    try {
      console.log(`🔄 Migration: Migrating ${missingUsers.length} users to Supabase...`);
      
      const supabaseUsers = missingUsers.map(user => ({
        uid: user.uid,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        officeName: user.officeName || null,
        divisionName: user.divisionName || null,
        designation: user.designation || null,
        mobileNumber: user.mobileNumber || null,
        role: user.role || 'user'
      }));

      const { data, error } = await supabase
        .from('user_profiles')
        .insert(supabaseUsers)
        .select();

      if (error) {
        throw error;
      }

      console.log(`✅ Migration: Successfully migrated ${data?.length || 0} users`);
      
    } catch (error) {
      console.error('❌ Migration: Error migrating users:', error);
      throw error;
    }
  }

  /**
   * Performs complete migration from Firebase to Supabase
   */
  static async performFullMigration(): Promise<{
    totalFirebaseUsers: number;
    totalSupabaseUsers: number;
    migratedUsers: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalFirebaseUsers = 0;
    let totalSupabaseUsers = 0;
    let migratedUsers = 0;

    try {
      console.log('🚀 Migration: Starting full user migration...');

      // Step 1: Fetch Firebase users
      const firebaseUsers = await this.fetchFirebaseUsers();
      totalFirebaseUsers = firebaseUsers.length;

      // Step 2: Fetch existing Supabase users
      const supabaseUsers = await this.fetchSupabaseUsers();
      totalSupabaseUsers = supabaseUsers.length;

      // Step 3: Find missing users
      const missingUsers = this.findMissingUsers(firebaseUsers, supabaseUsers);

      // Step 4: Migrate missing users
      if (missingUsers.length > 0) {
        await this.migrateMissingUsers(missingUsers);
        migratedUsers = missingUsers.length;
      }

      console.log('🎉 Migration: Full migration completed successfully');
      
      return {
        totalFirebaseUsers,
        totalSupabaseUsers,
        migratedUsers,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      console.error('❌ Migration: Full migration failed:', error);
      
      return {
        totalFirebaseUsers,
        totalSupabaseUsers,
        migratedUsers,
        errors
      };
    }
  }

  /**
   * Migrates a specific user by Firebase UID
   */
  static async migrateSingleUser(firebaseUID: string): Promise<boolean> {
    try {
      console.log(`🔄 Migration: Migrating single user: ${firebaseUID}`);
      
      const firebaseUsers = await this.fetchFirebaseUsers();
      const targetUser = firebaseUsers.find(user => user.uid === firebaseUID);
      
      if (!targetUser) {
        console.error(`❌ Migration: User ${firebaseUID} not found in Firebase`);
        return false;
      }

      await this.migrateMissingUsers([targetUser]);
      console.log(`✅ Migration: Successfully migrated user: ${firebaseUID}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Migration: Failed to migrate user ${firebaseUID}:`, error);
      return false;
    }
  }

  /**
   * Validates data consistency between Firebase and Supabase
   */
  static async validateDataConsistency(): Promise<{
    consistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const firebaseUsers = await this.fetchFirebaseUsers();
      const supabaseUsers = await this.fetchSupabaseUsers();

      // Check for missing users
      const missingUsers = this.findMissingUsers(firebaseUsers, supabaseUsers);
      if (missingUsers.length > 0) {
        issues.push(`${missingUsers.length} users exist in Firebase but not in Supabase`);
      }

      // Check for data mismatches
      for (const fbUser of firebaseUsers) {
        const sbUser = supabaseUsers.find(u => u.uid === fbUser.uid);
        if (sbUser) {
          if (sbUser.employeeId !== fbUser.employeeId) {
            issues.push(`Employee ID mismatch for ${fbUser.uid}: Firebase(${fbUser.employeeId}) vs Supabase(${sbUser.employeeId})`);
          }
          if (sbUser.name !== fbUser.name) {
            issues.push(`Name mismatch for ${fbUser.uid}: Firebase(${fbUser.name}) vs Supabase(${sbUser.name})`);
          }
          if (sbUser.officeName !== fbUser.officeName) {
            issues.push(`Office mismatch for ${fbUser.uid}: Firebase(${fbUser.officeName}) vs Supabase(${sbUser.officeName})`);
          }
        }
      }

      return {
        consistent: issues.length === 0,
        issues
      };

    } catch (error) {
      issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        consistent: false,
        issues
      };
    }
  }
}

export default UserMigrationService;
