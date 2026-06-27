import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// REPLACE THIS OBJECT WITH YOUR ACTUAL KEYS FROM FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBn-Kv71HcuHqz0W0mm2EeDRZoTh-QhnC8",
  authDomain: "spelling-bee-app-55a71.firebaseapp.com",
  databaseURL: "https://spelling-bee-app-55a71-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "spelling-bee-app-55a71",
  storageBucket: "spelling-bee-app-55a71.firebasestorage.app",
  messagingSenderId: "1016413492434",
  appId: "1:1016413492434:web:5d1b49347d48d4773f890b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const db = getDatabase(app);