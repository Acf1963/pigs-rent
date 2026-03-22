import axios from 'axios';

// Quando publicares na Vercel, vais definir VITE_API_URL nas configurações do projeto.
// Enquanto testas localmente, ele usa o teu localhost:3000.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

export default api;