import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAh7cgObhkQmdg3U5A_g7LJHHISZHYzVVU",
  authDomain: "mapitauwu.firebaseapp.com",
  databaseURL: "https://mapitauwu-default-rtdb.firebaseio.com",
  projectId: "mapitauwu",
  storageBucket: "mapitauwu.firebasestorage.app",
  messagingSenderId: "370557096285",
  appId: "1:370557096285:web:f7151affcf37fa0e5658b4",
  measurementId: "G-ZHS2H7SBGX"
};

// Evita inicializar dos veces
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const database = getDatabase(app);
