import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAB5i4yR2030IdXs_0sv99zGv6E50Py7lw",
  authDomain: "pigs-rent.firebaseapp.com",
  projectId: "pigs-rent",
  storageBucket: "pigs-rent.firebasestorage.app",
  messagingSenderId: "427921371989",
  appId: "1:427921371989:web:9534b08719985458a875dc"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
