import { Lote } from '../types/lote';

export const excelMapper = {
  mapLotes: (rawArray: any[]): Lote[] => {
    return rawArray.map(row => ({
      codigo: row.Codigo || row.ID || `LOTE-${Date.now()}`,
      fornecedor: row.Fornecedor || 'Desconhecido',
      data_entrada: row.Data || new Date().toISOString().split('T')[0],
      quantidade_cabecas: Number(row.Qtd || 0),
      peso_chegada_kg: Number(row.Peso || 0),
      custo_aquisicao_total_kz: Number(row.Preco || row.Custo || 0),
      custo_transporte_kz: Number(row.Frete || 0),
      especie: row.Especie || 'Suína',
      raca_predominante: row.Raca || 'Mista',
      peso_origem_kg: Number(row.PesoOrigem || row.Peso || 0),
      
      // CORREÇÃO: Alterado de "Quarentena" para "Ativo" para cumprir a Interface Lote
      status: 'Ativo', 
      
      observacoes: row.Obs || ''
    }));
  },

  animais: () => [],
  manejo: () => [],
  saude: () => []
};
