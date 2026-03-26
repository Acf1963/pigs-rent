import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAB5i4yR2030IdXs_0sv99zGv6E50Py7lw",
  authDomain: "pigs-rent.firebaseapp.com",
  projectId: "pigs-rent",
  storageBucket: "pigs-rent.firebasestorage.app",
  messagingSenderId: "427921371989",
  appId: "1:427921371989:web:379a0bbe26312fc6a875dc",
  measurementId: "G-4PF5V34ZGK"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// Inicializar o Firestore (Banco de Dados)
export const db = getFirestore(app);
