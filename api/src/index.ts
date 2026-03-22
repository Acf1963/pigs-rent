import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db';
import { RowDataPacket } from 'mysql2';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de CORS flexível para Produção/Dev
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rota de Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'Pigs Rent API Online', timestamp: new Date() });
});

// Rota de Lotes
app.get('/api/lotes', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM dim_lote');
    res.json(rows);
  } catch (error) {
    console.error('❌ Erro na base de dados:', error);
    res.status(500).json({ 
      error: 'Erro ao consultar lotes',
      details: process.env.NODE_ENV === 'development' ? error : undefined 
    });
  }
});

// Só inicia o servidor se não estiver na Vercel (Serverless mode)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 API Ativa em http://localhost:${PORT}`);
  });
}

export default app;