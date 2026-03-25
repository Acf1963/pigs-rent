export interface Abate {
  id?: string;
  lote_id: string;
  data_abate: string; // ISO Date AAAA-MM-DD
  quantidade: number;
  peso_carcaca_total: number;
  peso_medio_carcaca: number;
  rendimento_percentual?: number; // (Peso Carcaça / Peso Vivo) * 100
  observacoes?: string;
  createdAt?: any;
}

export interface Venda {
  id?: string;
  cliente: string;
  data_venda: string;
  valor_total_kz: number;
  peso_total_vendido: number;
  preco_por_kg: number;
}
