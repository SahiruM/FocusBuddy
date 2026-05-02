import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyB9ksx7_HnEtWYboO3ba57CamqUf9xdVWY",
  authDomain: "suustudy-16663.firebaseapp.com",
  projectId: "suustudy-16663",
  storageBucket: "suustudy-16663.firebasestorage.app",
  messagingSenderId: "204235115234",
  appId: "1:204235115234:web:5bc1518fe5f9c90d376cbb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);