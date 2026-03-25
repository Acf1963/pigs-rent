export interface Saude {
  id?: string;
  animal_id: string;
  data_aplicacao: string;
  tipo_intervencao: 'Vacina' | 'Medicamento' | 'Vitaminas';
  produto: string;
  carencia_dias: number;
  data_liberacao: string;
  veterinario?: string;
}
