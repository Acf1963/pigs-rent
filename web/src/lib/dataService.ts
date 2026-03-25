import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  writeBatch, 
  doc 
} from 'firebase/firestore';
import { db } from './firebase';

export const dataService = {
  // Grava um único documento (usado nos formulários manuais)
  saveSingle: async (colecao: string, data: any) => {
    try {
      const docRef = await addDoc(collection(db, colecao), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (e) {
      console.error("Erro ao salvar documento: ", e);
      throw e;
    }
  },

  // Grava em lote (usado na importação de Excel)
  saveBulk: async (colecao: string, dataArray: any[]) => {
    try {
      const batch = writeBatch(db);
      dataArray.forEach((item) => {
        const docRef = doc(collection(db, colecao));
        batch.set(docRef, {
          ...item,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.error("Erro no saveBulk: ", e);
      throw e;
    }
  },

  // NOVO: Recupera todos os documentos de uma coleção (resolve o erro 2339)
  getAll: async (colecao: string) => {
    try {
      const q = query(collection(db, colecao), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (e) {
      console.error(`Erro ao ler coleção ${colecao}: `, e);
      throw e;
    }
  }
};
