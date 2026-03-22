import { Request, Response } from 'express';
import pool from '../config/db';

export const getLotes = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM dim_lote ORDER BY data_inicio_lote DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar lotes no base de dados.' });
  }
};

export const createLote = async (req: Request, res: Response) => {
  const { codigo_lote, fornecedor_origem, data_inicio_lote } = req.body;
  try {
    await pool.query(
      'INSERT INTO dim_lote (codigo_lote, fornecedor_origem, data_inicio_lote) VALUES (?, ?, ?)',
      [codigo_lote, fornecedor_origem, data_inicio_lote]
    );
    res.status(201).json({ message: 'Lote criado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao inserir novo lote.' });
  }
};