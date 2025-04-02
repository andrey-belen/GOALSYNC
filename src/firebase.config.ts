import { initializeApp } from 'firebase/app';
import { getAuth, deleteUser, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, Timestamp, FieldValue } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDvbuOE92uiDPPzVDSXf5F2dzq-GTJoyFo",
  authDomain: "goalsync-81284.firebaseapp.com",
  projectId: "goalsync-81284",
  storageBucket: "goalsync-81284.firebasestorage.app",
  messagingSenderId: "287369509531",
  appId: "1:287369509531:web:324bd234daf4fe0aa0243e",
  measurementId: "G-FG65PNX1SG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase authentication instance
export const auth = getAuth(app);

// Export Firestore instance
export const db = getFirestore(app);

// Collection references
export const usersCollection = collection(db, 'users');

// User types
export type UserType = 'team_member' | 'trainer' | 'individual';

// User data interface
export interface UserData {
  id: string;
  email: string;
  name: string;
  type: UserType;
  teamId?: string;  // Optional since not all users will be part of a team
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// Utility function to clean up orphaned auth users
export const cleanupOrphanedUser = async (email: string, password: string) => {
  try {
    // Try to sign in with the credentials
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if Firestore document exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    // If no Firestore document exists, delete the auth user
    if (!userDoc.exists()) {
      await deleteUser(user);
    }
  } catch (error) {
    // Ignore errors - if sign in fails, the user doesn't exist
    console.log('No orphaned user found');
  }
}; 