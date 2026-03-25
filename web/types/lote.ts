export type Especie = 'BOVINO' | 'SUINO';
export type StatusLote = 'ATIVO' | 'TRANSPORTE' | 'FINALIZADO';

export interface Lote {
  id: string;
  codigo: string;          // Ex: FQ-2026-BOV01
  especie: Especie;
  dataEntrada: string;
  
  // Logística e Pesagem (O que pediste para apurar perdas)
  pesoOrigemKg: number;    // Peso medido no local de compra/origem
  pesoChegadaKg: number;   // Peso medido à chegada na Fazenda Quanza
  
  // O sistema calculará automaticamente:
  // quebraTransporte = pesoOrigemKg - pesoChegadaKg
  
  custoCompra: number;     // Valor pago pelos animais
  custoTransporte: number; // Frete e logística
  
  status: StatusLote;
}

export interface Animal {
  id: string;
  loteId: string;
  brinco: string;          // Identificação individual
  raca: string;
  sexo: 'M' | 'F';
  pesoAtual: number;
}