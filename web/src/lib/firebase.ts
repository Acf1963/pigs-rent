import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

/**
 * Configuração oficial do ecossistema Pigs-Rent
 * Dados vinculados ao projeto da Fazenda Quanza
 */
const firebaseConfig = {
  apiKey: "AIzaSyAB5i4yR2030IdXs_0sv99zGv6E50Py7lw",
  authDomain: "pigs-rent.firebaseapp.com",
  projectId: "pigs-rent",
  storageBucket: "pigs-rent.firebasestorage.app",
  messagingSenderId: "427921371989",
  appId: "1:427921371989:web:9534b08719985458a875dc",
  measurementId: "G-RCNNZ7QYB5"
};

// 1. Inicialização do Core do Firebase
const app = initializeApp(firebaseConfig);

/** * 2. Inicialização do Analytics
 * Chamamos a função diretamente para evitar o erro 'declared but never read'.
 * Isto mantém a telemetria ativa sem precisar de uma variável órfã.
 */
getAnalytics(app);

/** * 3. Exportação da Base de Dados (Firestore)
 * Este é o motor que alimenta os teus formulários de Lotes, Manejo e Saúde.
 */
export const db = getFirestore(app);

export default app;
