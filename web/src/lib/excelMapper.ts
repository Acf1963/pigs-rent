import { Lote } from '../types/lote';
import { Animal } from '../types/lote'; // Animal está no mesmo ficheiro
import { Manejo } from '../types/manejo';
import { Saude } from '../types/saude';

export const excelMapper = {
  // Mapeia o Excel de Lotes com o novo campo Fornecedor
  lotes: (rawArray: any[]): Lote[] => {
    return rawArray.map(item => ({
      codigo: String(item.codigo || item.ID || ""),
      fornecedor: String(item.fornecedor || "Origem não informada"),
      especie: (item.especie || "Suíno") as 'Suíno' | 'Bovino',
      raca_predominante: String(item.raca_predominante || ""),
      peso_origem_kg: Number(item.peso_origem_kg || 0),
      peso_chegada_kg: Number(item.peso_chegada_kg || 0),
      custo_transporte_kz: Number(item.custo_transporte_kz || 0),
      custo_aquisicao_total_kz: Number(item.custo_aquisicao_kz || 0),
      data_entrada: item.data_entrada || new Date().toISOString().split('T')[0],
      status: "Ativo"
    }));
  },

  // Mapeia o Excel de Animais Individuais
  animais: (rawArray: any[]): Animal[] => {
    return rawArray.map(item => ({
      brinco_id: String(item.brinco_id || ""),
      lote_id: String(item.lote_id || ""),
      sexo: item.sexo === 'M' ? 'M' : 'F',
      peso_inicial: Number(item.peso_inicial_kg || 0),
      data_nascimento: item.data_nascimento || "",
      status: "Ativo"
    }));
  },

  // Mapeia o Excel de Manejo/Custos
  manejo: (rawArray: any[]): Manejo[] => {
    return rawArray.map(item => ({
      lote_id: String(item.lote_id || ""),
      data_trato: item.data_trato || new Date().toISOString().split('T')[0],
      tipo_racao: String(item.tipo_racao || ""),
      quantidade_kg: Number(item.quantidade_kg || 0),
      custo_por_kg_kz: Number(item.custo_por_kg_kz || 0),
      custo_total_kz: Number(item.quantidade_kg || 0) * Number(item.custo_por_kg_kz || 0)
    }));
  },

  // Mapeia o Excel de Saúde
  saude: (rawArray: any[]): Saude[] => {
    return rawArray.map(item => ({
      animal_id: String(item.animal_id || ""),
      data_aplicacao: item.data_aplicacao || new Date().toISOString().split('T')[0],
      tipo_intervencao: (item.tipo_intervencao || "Vacina") as 'Vacina' | 'Medicamento' | 'Vitaminas',
      produto: String(item.produto || item.medicamento || ""),
      carencia_dias: Number(item.carencia_dias || 0),
      data_liberacao: calcularDataLiberacao(item.data_aplicacao, item.carencia_dias)
    }));
  }
};

function calcularDataLiberacao(data: string, dias: number) {
  if (!data || !dias) return data;
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}
