// web/src/types/comercial.ts

export type TipoVenda = 'ANIMAL_VIVO' | 'CARCACA' | 'CORTES';

export interface Abate {
  id: string;
  animalId: string;
  dataAbate: string;
  
  // Eficiência do Abate (Crucial para o ROI)
  pesoVivoFinalKg: number;    // Peso na balança antes do abate
  pesoCarcacaKg: number;      // Peso da carcaça limpa (gancho)
  
  // O sistema calculará: 
  // rendimentoCarcaca = (pesoCarcacaKg / pesoVivoFinalKg) * 100
  
  custoAbate: number;         // Taxas de matadouro e transporte
  classificacaoGordura: number; // Escala 1 a 5
}

export interface Corte {
  id: string;
  abateId: string;
  nomeCorte: string;          // Ex: "Picanha", "Alcatra", "Entrecosto"
  pesoObtidoKg: number;
  precoVendaKg: number;       // Preço praticado no mercado de Luanda
  
  // O sistema calculará: valorTotalCorte = pesoObtidoKg * precoVendaKg
}

export interface Venda {
  id: string;
  cliente: string;            // Ex: Supermercados, Talhos, Particulares
  dataVenda: string;
  tipo: TipoVenda;
  
  itens: {
    referenciaId: string;     // ID do Animal ou do Corte
    quantidade: number;
    valorUnitario: number;
  }[];
  
  valorTotalVenda: number;
  statusPagamento: 'PENDENTE' | 'PAGO' | 'CANCELADO';
}

export interface AnaliseRentabilidade {
  animalId: string;
  custoTotalAcumulado: number; // Soma de Compra + Frete + Alimentação + Saúde
  valorVendaTotal: number;     // Soma de todos os cortes ou venda viva
  
  // O KPI Final:
  lucroLiquido: number;        // valorVendaTotal - custoTotalAcumulado
  margemPercentual: number;
}
