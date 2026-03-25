// web/src/types/manejo.ts

export interface Pesagem {
  id: string;
  animalId: string;
  data: string;
  
  // Dados para cálculo de GMD (Ganho Médio Diário)
  pesoAtualKg: number;
  escoreCorporal?: number; // Opcional: 1 a 5 para bovinos/suínos
  
  observacoes?: string;
}

export interface Alimentacao {
  id: string;
  loteId: string;
  data: string;
  
  // Insumos
  tipoRacao: string;       // Ex: Rações de Crescimento, Finalização
  quantidadeKg: number;    // Quantidade total distribuída ao lote
  
  // Custos (Crucial para o teu projeto de viabilidade)
  custoPorKg: number;      // Valor do Kwanza (Kz) por Kg de ração
  
  // O sistema calculará: custoTotal = quantidadeKg * custoPorKg
  responsavel: string;
}

export interface MetaDesempenho {
  loteId: string;
  gmdAlvo: number;         // Ganho Médio Diário esperado (ex: 0.8kg/dia)
  dataFinalPrevista: string;
}