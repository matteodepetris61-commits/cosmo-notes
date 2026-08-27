import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: "euro-tracker-8120a",
  appId: "1:180653025338:web:6fef60898cb70c267a2d03",
  storageBucket: "euro-tracker-8120a.firebasestorage.app",
  apiKey: "AIzaSyC4ypsU4P399oFgvCLBlb6e-EKY-2CKnl4",
  authDomain: "euro-tracker-8120a.firebaseapp.com",
  messagingSenderId: "180653025338"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
};
