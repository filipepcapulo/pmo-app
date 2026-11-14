// Fluxo do chamado na V4 (0085): localização no kanban, backlog por etapa, "meus chamados" e a disponibilidade do
// consultor nas duas semanas (para o popup Alocar agenda). Leitura e gravação pelas funções `api.v4_*`.
import { novaOperacao, rpc } from './cliente';
import type { ChamadoLinha } from './chamados';
import type { Ausencia, Grade, TarefaGrade } from './equipe';

export type Local = 'triagem' | 'aguardando_cliente' | 'backlog_consultores' | 'backlog_personalizacao' | 'atribuido' | 'service_desk' | 'em_validacao' | 'concluido';
export const LOCAIS: { valor: Local; rotulo: string; cor: string }[] = [
  { valor: 'triagem', rotulo: 'Triagem', cor: '#9ca3af' },
  { valor: 'aguardando_cliente', rotulo: 'Aguardando Autorização do Cliente', cor: '#db2777' },
  { valor: 'backlog_consultores', rotulo: 'Backlog Consultores', cor: '#eab308' },
  { valor: 'backlog_personalizacao', rotulo: 'Backlog Personalização', cor: '#dc2626' },
  { valor: 'atribuido', rotulo: 'Atribuído', cor: '#2563eb' },
  { valor: 'service_desk', rotulo: 'Service Desk Sankhya', cor: '#0891b2' },
  { valor: 'em_validacao', rotulo: 'Em Validação', cor: '#7c3aed' },
  { valor: 'concluido', rotulo: 'Concluído', cor: '#16a34a' },
];
export const rotuloLocal = (v: string | null | undefined) => LOCAIS.find(l => l.valor === v)?.rotulo ?? 'Encerrado';
export const BACKLOGS: Local[] = ['backlog_consultores', 'backlog_personalizacao'];

export interface ChamadoFluxo extends ChamadoLinha {
  localizacao: Local | null; localizacao_em: string | null; origem: string | null; status: string; responsavel_id: string | null; etapa_id: string | null;
  projeto_id: string; projeto: string; horas_previstas: number | null; demanda_versao: number;
  tarefas_abertas: number; tarefas_total: number; consultores: string[]; proxima_data: string | null;
}
export interface ChamadoDaSub { id: string; versao: number; numero: number; titulo: string; localizacao: Local | null; fila: string; tarefas_abertas: number }
export interface AvisoBacklog { pers: string[]; cons: string[]; padrao_pers: string[]; padrao_cons: string[] }
export interface FiltroFluxo { meus?: boolean; locais?: Local[]; encerrados?: boolean; dias_concluidos?: number }

export const chamV4 = {
  listar: (esc: string, f: FiltroFluxo = {}) => rpc<{ itens: ChamadoFluxo[] }>('v4_chamados', { p_escritorio: esc, p_filtros: f }),
  mover: (esc: string, d: { id: string; destino: Local; versao?: number; motivo?: string; ticket?: string }) =>
    rpc<{ ok: true; id: string; versao: number }>('v4_chamado_mover', { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() }),
  daDemanda: (esc: string, demanda: string) => rpc<ChamadoDaSub | null>('v4_chamado_da_demanda', { p_escritorio: esc, p_demanda: demanda }),
  aviso: (esc: string) => rpc<AvisoBacklog>('v4_aviso_backlog', { p_escritorio: esc }),
  avisoSalvar: (esc: string, d: { pers: string[]; cons: string[] }) =>
    rpc<{ ok: true }>('v4_aviso_backlog_salvar', { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() }),
  gradeDe: (esc: string, consultor: string, de: string, ate: string) =>
    rpc<Grade>('v1_grade', { p_escritorio: esc, p_de: de, p_ate: ate, p_consultores: [consultor] }),
};

// ---------------------------------------------------------------- regras puras (testadas no Vitest)
/** O que o movimento pede antes de gravar: agenda (popup de alocar), ticket, confirmação ou nada. */
export function exigenciaDoMovimento(c: Pick<ChamadoFluxo, 'tarefas_abertas' | 'ticket' | 'localizacao'>, destino: Local): 'nada' | 'alocar' | 'ticket' | 'confirmar' | 'bloqueado' {
  if (destino === c.localizacao) return 'nada';
  if (destino === 'atribuido') return c.tarefas_abertas > 0 ? 'nada' : 'alocar';
  if (['triagem', 'aguardando_cliente', 'backlog_consultores', 'backlog_personalizacao'].includes(destino) && c.tarefas_abertas > 0) return 'bloqueado';
  if (destino === 'service_desk' && !c.ticket) return 'ticket';
  if (destino === 'concluido') return 'confirmar';
  return 'nada';
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const deIso = (s: string) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
/** Segunda a sexta da semana de `hoje` e da seguinte. */
export function duasSemanas(hoje: string): string[][] {
  const d = deIso(hoje);
  const seg = new Date(d); seg.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return [0, 7].map(mais => [0, 1, 2, 3, 4].map(i => { const x = new Date(seg); x.setDate(seg.getDate() + mais + i); return iso(x); }));
}

export type TurnoDisp = 'manha' | 'tarde';
export interface CelulaDisp { data: string; turno: TurnoDisp; estado: 'livre' | 'ocupado' | 'ausente' | 'passado'; itens: string[] }
const JANELA: Record<TurnoDisp, [string, string]> = { manha: ['08:00', '12:00'], tarde: ['14:00', '18:00'] };
const cruza = (ini: string | null | undefined, fim: string | null | undefined, t: TurnoDisp) =>
  !ini || !fim || (ini.slice(0, 5) < JANELA[t][1] && fim.slice(0, 5) > JANELA[t][0]);
const ocupa = (x: Pick<TarefaGrade, 'periodo' | 'hora_ini' | 'hora_fim'>, t: TurnoDisp) =>
  x.periodo === 'dia' || x.periodo === t || (x.periodo === 'livre' && cruza(x.hora_ini, x.hora_fim, t));

/** Disponibilidade do consultor, por semana: cada dia útil × manhã/tarde, com o que ocupa (tarefas e ausências). */
export function disponibilidade(grade: Grade, consultor: string, hoje: string): { dias: string[]; manha: CelulaDisp[]; tarde: CelulaDisp[] }[] {
  const tarefas = grade.tarefas.filter(t => t.consultor_id === consultor && !['cancelada', 'nao_executada'].includes(t.status));
  const aus = grade.ausencias.filter((a: Ausencia) => a.consultor_id === consultor);
  const celula = (data: string, turno: TurnoDisp): CelulaDisp => {
    const fora = aus.filter(a => a.de <= data && a.ate >= data && cruza(a.hora_ini, a.hora_fim, turno));
    const ocup = tarefas.filter(t => t.data === data && ocupa(t, turno));
    const itens = [...fora.map(a => ({ ferias: 'Férias', folga: 'Folga', licenca: 'Licença', ausencia: 'Ausência' }[a.tipo] ?? 'Ausência')), ...ocup.map(t => `${t.cliente} · ${t.nome}`)];
    return { data, turno, itens, estado: data < hoje ? 'passado' : fora.length ? 'ausente' : ocup.length ? 'ocupado' : 'livre' };
  };
  return duasSemanas(hoje).map(dias => ({ dias, manha: dias.map(d => celula(d, 'manha')), tarde: dias.map(d => celula(d, 'tarde')) }));
}

/** Horários escolhidos → tarefas a criar: manhã + tarde do mesmo dia viram um "dia". */
export function tarefasDosHorarios(sel: { data: string; turno: TurnoDisp }[]): { data: string; periodo: 'manha' | 'tarde' | 'dia' }[] {
  const porDia = new Map<string, Set<TurnoDisp>>();
  for (const s of sel) porDia.set(s.data, (porDia.get(s.data) ?? new Set()).add(s.turno));
  return [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([data, t]) => ({ data, periodo: t.size === 2 ? 'dia' : [...t][0] }));
}
