import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, User, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

interface UserData {
  employeeId: string;
  role: string;
  // Add other user data fields as needed
  [key: string]: any; // Allow for other properties
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null; // Add userData to context type
  loading: boolean;
  signUp: (employeeId: string, password: string, userData: any) => Promise<any>;
  signIn: (employeeId: string, password: string) => Promise<any>;
  resetPassword: (employeeId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null); // Add state for user data
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => { // Make the callback async
      setCurrentUser(user);
      if (user) {
        // Fetch user data from Firestore
        const userRef = doc(db, 'employees', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        } else {
          setUserData(null); // User data not found
        }
      } else {
        setUserData(null); // Clear user data on sign out
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [auth, db]); // Add db to dependency array

  const signUp = async (employeeId: string, password: string, userData: any) => {
    const email = `${employeeId}@employee.com`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, 'employees', userCredential.user.uid);
    await setDoc(userRef, {
      ...userData,
      employeeId,
      role: 'user', // Set default role as 'user'
      createdAt: new Date().toISOString()
    });
    // After successful sign up and data saving, fetch and set user data
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      setUserData(docSnap.data() as UserData);
    }
    return userCredential;
  };

  const signIn = async (employeeId: string, password: string) => {
    const email = `${employeeId}@employee.com`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // After successful sign in, fetch and set user data
    const userRef = doc(db, 'employees', userCredential.user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      setUserData(docSnap.data() as UserData);
    } else {
       setUserData(null); // User data not found
    }
    return userCredential;
  };

  const resetPassword = async (employeeId: string) => {
    const email = `${employeeId}@employee.com`;
    return sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserData(null); // Clear user data on sign out
  };

  const value = {
    currentUser,
    userData, // Include userData in the context value
    loading,
    signUp,
    signIn,
    resetPassword,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};