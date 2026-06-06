import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD2xGFX0Oy-3cPF5x2PrqL_l-SbvtciROA",
  authDomain: "edusaas-690c0.firebaseapp.com",
  projectId: "edusaas-690c0",
  storageBucket: "edusaas-690c0.firebasestorage.app",
  messagingSenderId: "498821315938",
  appId: "1:498821315938:web:d692d7ffa4e3dc73b7c03b",
  measurementId: "G-D9Y9QVN49V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);