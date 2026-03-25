export type Especie = 'Suíno' | 'Bovino';

export interface Lote {
  id?: string;
  codigo: string;
  especie: Especie;
  raca_predominante: string;
  fornecedor: string;
  data_entrada: string;
  peso_origem_kg: number;
  peso_chegada_kg: number;
  custo_transporte_kz: number;
  custo_aquisicao_total_kz: number;
  status: 'Ativo' | 'Abatido' | 'Vendido';
}

export interface Animal {
  id?: string;
  brinco_id: string;
  lote_id: string;
  sexo: 'M' | 'F';
  peso_inicial: number;
  data_nascimento?: string;
  status: string;
}
