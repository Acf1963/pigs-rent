export type TipoIntervencao = 'VACINA' | 'VERMIFUGO' | 'TRATAMENTO' | 'SUPLEMENTO';

export interface RegistroSaude {
  id: string;
  animalId?: string;
  loteId?: string;
  data: string;
  tipo: TipoIntervencao;
  medicamento: string;
  loteMedicamento: string;
  dosagem: string;
  viaAplicacao: 'ORAL' | 'SUBCUTANEA' | 'INTRAMUSCULAR';
  periodoCarenciaDias: number; 
  dataLiberacaoAbate: string;
  custoMedicamento: number;
  veterinarioResponsavel: string;
  observacoes?: string;
}

export interface AlertaSanitario {
  id: string;
  animalId: string;
  descricao: string;
  severidade: 'BAIXA' | 'MEDIA' | 'ALTA';
  dataInicio: string;
  resolvido: boolean;
}
