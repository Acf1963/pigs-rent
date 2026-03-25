import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db';
import { RowDataPacket } from 'mysql2';

dotenv.config();

const app = express();
// Alterei para 3001 para não chocar com o padrão do Vite ou outras ferramentas
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rota de Health Check - Útil para monitorização
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'Pigs Rent API Online', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Rota de Lotes (Sincronizada com dim_lote do MySQL)
app.get('/api/lotes', async (_req: Request, res: Response) => {
  try {
    // Verificamos se o pool existe antes de consultar
    if (!pool) throw new Error("Base de dados não configurada");
    
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM dim_lote ORDER BY id DESC');
    res.json(rows);
  } catch (error: any) {
    console.error('❌ Erro na base de dados:', error.message);
    res.status(500).json({ 
      error: 'Erro ao consultar lotes no MySQL',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Início do servidor
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 API Pigs Rent Ativa em http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  });
}

export default app;
