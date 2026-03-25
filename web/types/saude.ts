// web/src/types/saude.ts

export type TipoIntervencao = 'VACINA' | 'VERMIFUGO' | 'TRATAMENTO' | 'SUPLEMENTO';

export interface RegistroSaude {
  id: string;
  animalId?: string;       // Se for tratamento individual
  loteId?: string;         // Se for aplicado a todo o lote (ex: vacinação em massa)
  data: string;
  
  tipo: TipoIntervencao;
  medicamento: string;     // Nome do produto (ex: Aftosa, Ivermectina)
  loteMedicamento: string; // Para rastreabilidade total
  dosagem: string;         // Ex: "5ml", "2mg/kg"
  viaAplicacao: 'ORAL' | 'SUBCUTANEA' | 'INTRAMUSCULAR';
  
  // O ponto crítico para o Abate:
  periodoCarenciaDias: number; 
  dataLiberacaoAbate: string; // Calculado: data + periodoCarenciaDias
  
  custoMedicamento: number;   // Para somar ao custo operacional do animal
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
