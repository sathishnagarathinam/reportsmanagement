import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration
// These values come from your Firebase Console
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBJ8xMDWfTlBL4DuK1KmJW_r2-t34_7E8k',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'employeemanagementsystem-6e893.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'employeemanagementsystem-6e893',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'employeemanagementsystem-6e893.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '638747154889',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:638747154889:web:5c8a9f2d8b3c1e4f5a6b7c8d9e0f1a2b',
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('⚠️  Firebase configuration is incomplete. Some features may not work.');
  console.warn('Please set REACT_APP_FIREBASE_* environment variables.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Optional: Connect to Firebase Emulator Suite for local development
// Uncomment these lines if you're using the Firebase Emulator
// if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
//   try {
//     connectAuthEmulator(auth, 'http://localhost:9099');
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     console.log('🔧 Connected to Firebase Emulators');
//   } catch (error) {
//     // Error if emulator is not running - this is fine for development
//     console.log('ℹ️  Firebase Emulator not available (this is OK for development)');
//   }
// }

console.log('✅ Firebase initialized successfully');
console.log(`📱 Project: ${firebaseConfig.projectId}`);

export default app;
