// Ociosidade (V11a, no lugar do módulo do 2.x): consultores do dia, alocado × capacidade e sugestões do backlog (0041).
import { rpc } from './cliente';

export type SituacaoOcioso = 'sem_agenda' | 'parcial' | 'completo' | 'ausente';
export interface AgendaDia { tarefa_id: string; tarefa: string; periodo: string; horas: number | null; status: string; demanda: string; projeto: string; cliente: string }
export interface Sugestao { demanda_id: string; demanda: string; projeto_id: string; projeto: string; cliente: string; fim: string | null; horas_previstas: number | null; afinidade: number }
export interface ConsultorDia {
  id: string; nome: string; alocadas: number; ausencia: number; capacidade: number; livres: number; situacao: SituacaoOcioso;
  agendas: AgendaDia[]; sugestoes: Sugestao[];
}
export interface Ociosidade { data: string; horas_dia: number; consultores: ConsultorDia[] }

export const ociosidade = {
  dia: (esc: string, dia: string) => rpc<Ociosidade>('v1_ociosidade', { p_escritorio: esc, p_dia: dia }),
};

export const SITUACOES: { valor: SituacaoOcioso; rotulo: string; cor: string }[] = [
  { valor: 'sem_agenda', rotulo: 'Sem agenda', cor: 'var(--vermelho)' },
  { valor: 'parcial', rotulo: 'Com ociosidade', cor: 'var(--laranja)' },
  { valor: 'completo', rotulo: 'Agenda completa', cor: 'var(--verde)' },
  { valor: 'ausente', rotulo: 'Ausentes', cor: 'var(--texto-2)' },
];

/** Grupos na ordem da tela; os parciais do menos para o mais alocado (como no 2.x). */
export function agrupar(cs: ConsultorDia[]) {
  const de = (s: SituacaoOcioso) => cs.filter(c => c.situacao === s);
  return { sem_agenda: de('sem_agenda'), parcial: de('parcial').sort((a, b) => a.alocadas - b.alocadas), completo: de('completo'), ausente: de('ausente') };
}

const h = (n: number) => `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Texto para o WhatsApp/Telegram, no formato do relatório do 2.x. */
export function textoOciosidade(o: Ociosidade): string {
  const g = agrupar(o.consultores);
  let s = `*Equipe sem agenda - ${o.data.split('-').reverse().join('/')}*\n`;
  if (!g.sem_agenda.length && !g.parcial.length) return s + '\nNinguém ocioso hoje.';
  const linha = (c: ConsultorDia) => {
    const sug = c.sugestoes.slice(0, 3).map(x => `${x.cliente} - ${x.demanda}${x.fim ? ` (${dm(x.fim)})` : ''}`).join(', ') || 'sem sugestões disponíveis';
    const st = c.situacao === 'sem_agenda' ? `${h(c.capacidade)} disponíveis` : `${h(c.alocadas)} alocadas / ${h(c.livres)} livres`;
    s += `• *${c.nome}* (${st}) — sugestões: ${sug}\n`;
  };
  if (g.sem_agenda.length) { s += '\n*SEM AGENDA:*\n'; g.sem_agenda.forEach(linha); }
  if (g.parcial.length) { s += '\n*COM OCIOSIDADE:*\n'; g.parcial.forEach(linha); }
  return s.trimEnd();
}
