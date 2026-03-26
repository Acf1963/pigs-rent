import { Lote } from '../types/lote';

// Função auxiliar para converter o número serial do Excel (ex: 46091) em Data ISO (AAAA-MM-DD)
const formatExcelDate = (value: any): string => {
  if (!value) return new Date().toISOString().split('T')[0];
  
  // Se já for uma string formatada (Ex: "2026-03-26"), retorna-a
  if (typeof value === 'string' && value.includes('-')) return value;

  // Se for o número serial do Excel (como o 46091 visto no Firebase)
  if (!isNaN(value)) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  
  return String(value);
};

export const excelMapper = {
  mapLotes: (rawArray: any[]): Lote[] => {
    return rawArray.map(row => {
      // Mapeamento flexível para aceitar as colunas do seu OnlyOffice
      return {
        // Tenta 'loteId' (visto na sua imagem), 'Codigo' ou gera um ID
        codigo: String(row.loteId || row.Codigo || row.ID || `LOTE-${Date.now()}`),
        
        fornecedor: row.Fornecedor || row.Origem || 'Desconhecido',
        
        // CORREÇÃO: Usa a função formatExcelDate para evitar o erro do número 46091
        data_entrada: formatExcelDate(row.dataEntrada || row.dataAbate || row.Data || row.data),
        
        quantidade_cabecas: Number(row.quantidade || row.Qtd || row.quantidadeAbatida || 0),
        
        // Mapeia pesoVivoK ou pesoVivoKg conforme a sua planilha de abates
        peso_chegada_kg: Number(row.pesoVivoKg || row.pesoVivoK || row.Peso || 0),
        
        // Mapeia custoAbateKz ou custoAquisicaoTotal
        custo_aquisicao_total_kz: Number(row.custoAquisicaoTotal || row.custoAbateKz || row.Preco || 0),
        
        custo_transporte_kz: Number(row.custo_transporte_kz || row.Frete || 0),
        especie: row.especie || row.Especie || 'Suína',
        raca_predominante: row.raca || row.Raca || 'Mista',
        peso_origem_kg: Number(row.peso_origem_kg || row.PesoOrigem || row.pesoVivoKg || 0),
        
        status: 'Ativo',
        observacoes: row.observacoes || row.Obs || ''
      };
    });
  },

  animais: () => [],
  manejo: () => [],
  saude: () => []
};
