import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Importação necessária para o login
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAB5i4yR2O30IdXs_0sv99zGv6E5OPy7lw",
  authDomain: "pigs-rent.firebaseapp.com",
  projectId: "pigs-rent",
  storageBucket: "pigs-rent.firebasestorage.app",
  messagingSenderId: "427921371989",
  appId: "1:427921371989:web:9534b08719985458a875dc",
  measurementId: "G-RCNNZ7QYB5"
};

// 1. Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// 2. Inicializar e exportar o Auth (Para usares o utilizador acfs1963@gmail.com)
export const auth = getAuth(app);

// 3. Inicializar o Firestore com PERSISTÊNCIA ATIVADA
// Isto garante que o Dashboard não fique vazio quando estiveres sem internet
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
