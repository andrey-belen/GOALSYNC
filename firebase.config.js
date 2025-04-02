import { initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

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
const db = firestore();
const authentication = auth();

export { app, db, authentication };