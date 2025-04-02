import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
  deleteUser,
  fetchSignInMethodsForEmail,
  signInWithCustomToken,
  getAuth
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { UserData } from '../types/database';
import { UserType } from '../firebase.config';

interface AuthContextData {
  user: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, userType: UserType) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('Auth state changed:', firebaseUser?.email);
      try {
        if (firebaseUser) {
          // Fetch additional user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          console.log('Fetching user doc for:', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            console.log('User doc exists');
            const userData = userDoc.data() as UserData;
            setUser(userData);
          } else {
            console.log('No user doc found - cleaning up orphaned auth user');
            await deleteUser(firebaseUser);
            setUser(null);
          }
        } else {
          console.log('No firebase user');
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
      } finally {
      setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful for:', result.user.email);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message);
    }
  };

  const cleanupOrphanedAuthUser = async (email: string, password: string) => {
    try {
      // Try to sign in with the provided credentials
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const orphanedUser = userCredential.user;
      
      // If we successfully signed in, delete this user
      if (orphanedUser) {
        console.log('Successfully signed in to orphaned account, deleting...');
        await deleteUser(orphanedUser);
        return true; // Cleanup successful
      }
    } catch (error: any) {
      console.log('Cleanup attempt failed:', error.message);
      // If wrong password, we know the email is genuinely in use
      if (error.code === 'auth/wrong-password') {
        throw new Error('The email address is already in use. Please try logging in instead.');
      }
      // For other errors, let the registration proceed
      return false;
    }
    return false;
  };

  const signUp = async (name: string, email: string, password: string, userType: UserType) => {
    let createdUser: FirebaseUser | null = null;
    
    try {
      console.log('Starting signup for:', email);
      
      // Check if email already exists in Auth
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0) {
        console.log('Email exists in Auth, attempting cleanup...');
        // Try to cleanup any orphaned auth user
        const cleaned = await cleanupOrphanedAuthUser(email, password);
        if (!cleaned) {
          console.log('Could not clean up user, but proceeding with registration...');
        }
      }

      // Proceed with new registration
      console.log('Creating new auth user');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      createdUser = userCredential.user;

      if (!createdUser) {
        throw new Error('Failed to create user');
      }

      try {
        // Create user document in Firestore
        console.log('Creating Firestore document');
        const userData: UserData = {
          id: createdUser.uid,
          email: email,
          name: name,
          type: userType,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const userDocRef = doc(db, 'users', createdUser.uid);
        await setDoc(userDocRef, userData);
        console.log('User document created successfully');
      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        // If Firestore creation fails, delete the auth user
        if (createdUser) {
          await deleteUser(createdUser);
        }
        throw new Error('Failed to create user profile. Please try again.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      // Clean up any partially created user from this attempt
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch (cleanupError) {
          console.error('Failed to cleanup user after error:', cleanupError);
        }
      }
      // Rethrow the error with a user-friendly message
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('The email address is already in use. If you cannot register, please try resetting your password or contact support.');
      }
      throw new Error(error.message || 'Registration failed. Please try again.');
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 