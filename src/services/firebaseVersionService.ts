import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  DocumentSnapshot,
} from 'firebase/firestore';

export interface VersionControlData {
  latest_version: string;
  min_required_version: string;
  force_update: boolean;
  release_notes: string;
  url: string;
}

export interface PlatformVersionControl {
  android: VersionControlData;
  ios: VersionControlData;
}

class FirebaseVersionService {
  private static readonly COLLECTION = 'app_config';
  private static readonly DOC_ID = 'version_control';

  /**
   * Get version control data for a specific platform
   */
  static async getPlatformVersionControl(
    platform: 'android' | 'ios'
  ): Promise<VersionControlData | null> {
    try {
      console.log(`🔍 FirebaseVersionService: Fetching ${platform} version control...`);

      const docRef = doc(
        db,
        this.COLLECTION,
        this.DOC_ID,
        platform,
        'current'
      );
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as VersionControlData;
        console.log(`✅ FirebaseVersionService: ${platform} version data fetched`, data);
        return data;
      }

      console.log(`⚠️ FirebaseVersionService: No version data found for ${platform}`);
      return null;
    } catch (error) {
      console.error(
        `❌ FirebaseVersionService: Error fetching ${platform} version:`,
        error
      );
      return null;
    }
  }

  /**
   * Get version control data for both platforms
   */
  static async getAllVersionControl(): Promise<PlatformVersionControl | null> {
    try {
      console.log('🔍 FirebaseVersionService: Fetching all version control data...');

      const android = await this.getPlatformVersionControl('android');
      const ios = await this.getPlatformVersionControl('ios');

      if (android && ios) {
        return { android, ios };
      }

      console.log('⚠️ FirebaseVersionService: Incomplete version data');
      return null;
    } catch (error) {
      console.error('❌ FirebaseVersionService: Error fetching all versions:', error);
      return null;
    }
  }

  /**
   * Update version control data for a platform
   */
  static async updatePlatformVersion(
    platform: 'android' | 'ios',
    data: VersionControlData
  ): Promise<boolean> {
    try {
      console.log(`🔄 FirebaseVersionService: Updating ${platform} version...`);

      const docRef = doc(
        db,
        this.COLLECTION,
        this.DOC_ID,
        platform,
        'current'
      );

      // Use setDoc with merge option to create or update
      await setDoc(docRef, data, { merge: true });

      console.log(`✅ FirebaseVersionService: ${platform} version updated successfully`);
      return true;
    } catch (error) {
      console.error(`❌ FirebaseVersionService: Error updating ${platform} version:`, error);
      return false;
    }
  }

  /**
   * Update both Android and iOS versions
   */
  static async updateAllVersions(data: PlatformVersionControl): Promise<boolean> {
    try {
      console.log('🔄 FirebaseVersionService: Updating all versions...');

      const androidSuccess = await this.updatePlatformVersion('android', data.android);
      const iosSuccess = await this.updatePlatformVersion('ios', data.ios);

      if (androidSuccess && iosSuccess) {
        console.log('✅ FirebaseVersionService: All versions updated successfully');
        return true;
      }

      console.log('❌ FirebaseVersionService: Partial update failure');
      return false;
    } catch (error) {
      console.error('❌ FirebaseVersionService: Error updating all versions:', error);
      return false;
    }
  }

  /**
   * Validate version string format (e.g., "1.0.0")
   */
  static isValidVersion(version: string): boolean {
    const versionRegex = /^\d+(\.\d+){0,2}$/;
    return versionRegex.test(version);
  }

  /**
   * Compare two version strings
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }
}

export default FirebaseVersionService;
