import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Fallback configuration for development/demo purposes
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCoBTaAwoQoR5B6FipxgyCF70ukN2rN2A0",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "employeemanagementsystem-6e893.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "employeemanagementsystem-6e893",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "employeemanagementsystem-6e893.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "88739308700",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:88739308700:web:66a8e34809583e53c1b959"
};

// Check if we have the required configuration
const hasValidConfig = firebaseConfig.apiKey && firebaseConfig.projectId;

if (!hasValidConfig) {
  console.warn('Firebase configuration is incomplete. Some features may not work.');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;