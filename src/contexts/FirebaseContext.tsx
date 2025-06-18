import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../config/firebase';

type FirebaseContextType = {
  currentUser: User | null;
  loading: boolean;
};

const FirebaseContext = createContext<FirebaseContextType>({ currentUser: null, loading: true });

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <FirebaseContext.Provider value={{ currentUser, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
};