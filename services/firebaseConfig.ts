import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "blank",
  authDomain: "windfields-connect.firebaseapp.com",
  projectId: "windfields-connect",
  storageBucket: "windfields-connect.firebasestorage.app",
  messagingSenderId: "460155358748",
  appId: "1:460155358748:web:b566e550de804f1f1d99d9",
  measurementId: "G-QYY70TCVMW",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
