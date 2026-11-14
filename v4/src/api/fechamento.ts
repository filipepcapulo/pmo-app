// Fechamento de produtividade (V11a, D10): por consultor, de v_apontamentos (OS do Sankhya OM + app), no lugar da planilha
// mestre e das planilhas dos consultores no Drive. Período padrão do fechamento: 21 do mês retrasado a 20 do mês anterior.
import { rpc } from './cliente';

export interface LinhaFechamento extends Record<string, unknown> {
  consultor_id: string; consultor: string; dias_uteis: number; ausencia: number; capacidade: number; horas_os: number; horas_app: number;
  total: number; normais: number; extras: number; dias_com_apontamento: number; agendado: number; pendentes: number; ocupacao: number | null;
}
export interface Fechamento { de: string; ate: string; horas_dia: number; consultores: LinhaFechamento[] }

export const fechamento = {
  ler: (esc: string, de: string, ate: string) => rpc<Fechamento>('v1_fechamento', { p_escritorio: esc, p_de: de, p_ate: ate }),
};

const iso = (a: number, m: number, d: number) => new Date(Date.UTC(a, m, d)).toISOString().slice(0, 10);

/** Período do fechamento de uma data: de 21 do mês retrasado a 20 do mês anterior (regra da skill fechamento-produtividade). */
export function periodoFechamento(hoje: string): { de: string; ate: string } {
  const a = +hoje.slice(0, 4), m = +hoje.slice(5, 7) - 1;
  return { de: iso(a, m - 2, 21), ate: iso(a, m - 1, 20) };
}

/** Totais da equipe (linha de rodapé). */
export function totais(ls: LinhaFechamento[]) {
  const s = (k: keyof LinhaFechamento) => Math.round(ls.reduce((t, l) => t + (Number(l[k]) || 0), 0) * 100) / 100;
  return { capacidade: s('capacidade'), horas_os: s('horas_os'), horas_app: s('horas_app'), total: s('total'), normais: s('normais'),
    extras: s('extras'), agendado: s('agendado'), pendentes: s('pendentes') };
}
