// Portfólio de projetos (V11a, no lugar do módulo do 2.x): projetos ativos por fase e GP, Go Live, atraso, horas e riscos (0041).
import { rpc } from './cliente';
import type { NivelRisco } from './projeto';

export interface ProjetoPortfolio extends Record<string, unknown> {
  id: string; nome: string; fase: string; cliente_id: string; cliente: string; gp_id: string | null; gp: string | null;
  inicio: string | null; fim: string | null; golive: string | null; golive_ok: boolean; atraso: 'golive' | 'etapa' | null;
  etapas_atrasadas: string[]; horas_agendadas: number; horas_executadas: number; horas_pedidas: number; demandas_abertas: number;
}
export interface RiscoPortfolio extends Record<string, unknown> {
  demanda_id: string; nome: string; projeto_id: string; projeto: string; cliente: string; responsavel: string | null;
  vencimento: string | null; dias: number | null; prioridade: string; nivel: NivelRisco;
}
export interface Portfolio { hoje: string; projetos: ProjetoPortfolio[]; riscos: RiscoPortfolio[] }

export const portfolio = {
  ler: (esc: string) => rpc<Portfolio>('v1_portfolio', { p_escritorio: esc }),
};

export const SEM_GP = 'Sem GP';
const ORDEM_FASES = ['P1', 'P2', 'P3', 'P4', 'P5', 'Operação Assistida', 'Sustentação', 'Banco de Horas', 'Avulso'];

/** Fases presentes, na ordem do Portfólio do 2.x (P1…P5, Operação Assistida, Sustentação…); as demais por nome no fim. */
export function fasesDe(ps: ProjetoPortfolio[]): string[] {
  const todas = [...new Set(ps.map(p => p.fase))];
  const pos = (f: string) => { const i = ORDEM_FASES.findIndex(o => o.toLowerCase() === f.toLowerCase()); return i < 0 ? 99 : i; };
  return todas.sort((a, b) => pos(a) - pos(b) || a.localeCompare(b, 'pt-BR'));
}

/** GPs com projeto (o "Sem GP" por último). */
export function gpsDe(ps: ProjetoPortfolio[]): string[] {
  return [...new Set(ps.map(p => p.gp ?? SEM_GP))].sort((a, b) => Number(a === SEM_GP) - Number(b === SEM_GP) || a.localeCompare(b, 'pt-BR'));
}

export function filtrar(ps: ProjetoPortfolio[], f: { fase?: string; gp?: string; texto?: string }) {
  const t = (f.texto ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  return ps.filter(p => (!f.fase || p.fase === f.fase) && (!f.gp || (p.gp ?? SEM_GP) === f.gp)
    && (!t || [p.nome, p.cliente, p.gp ?? '', p.fase].some(v => v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(t))));
}

/** Projetos por GP (com quantos atrasados), para o gráfico de barras. */
export function porGp(ps: ProjetoPortfolio[]) {
  return gpsDe(ps).map(g => {
    const do_ = ps.filter(p => (p.gp ?? SEM_GP) === g);
    return { gp: g, n: do_.length, atrasados: do_.filter(p => p.atraso).length };
  });
}

/** Janela do Gantt: do 1º dia do mês do início mais antigo (até 6 meses atrás) ao fim mais distante (até 12 meses), com hoje dentro. */
export function janelaGantt(ps: ProjetoPortfolio[], hoje: string): { ini: string; fim: string } {
  const add = (iso: string, meses: number) => { const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1 + meses, 1)); return d.toISOString().slice(0, 10); };
  const datas = ps.flatMap(p => [p.inicio, p.fim, p.golive]).filter((x): x is string => !!x).sort();
  const min = add(hoje, -6), max = add(hoje, 13);
  let ini = datas[0] && datas[0] > min ? datas[0] : min;
  let fim = datas[datas.length - 1] && datas[datas.length - 1] < max ? datas[datas.length - 1] : max;
  if (ini > hoje) ini = hoje;
  if (fim < add(hoje, 1)) fim = add(hoje, 1);
  return { ini: ini.slice(0, 8) + '01', fim };
}
