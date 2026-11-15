// Rentabilidade geral (V4, 0091 + Edge Function `financeiro`, ação `rentabilidade_geral`): faturado × custo de todo o
// escritório num intervalo. A função devolve um "cubo" — uma célula por mês civil × período 21–20 × cliente × projeto ×
// consultor — e esta camada soma as células por dimensão e aplica os filtros da navegação (descer de nível não consulta de
// novo). Só quem tem o papel Dono ou Rentabilidade no cofre recebe alguma coisa. Nada é guardado no navegador.
//   faturado = horas executadas × valor/hora médio vendido do projeto; custo = horas × remuneração vigente na data.
// Tipo de OS (0094): o campo Apontamento da tarefa diz se a hora é cobrada. Tipo marcado como "não conta no faturado"
// (bonificado, interno…) entra só com o custo. O cadastro fica no cofre (ações `tipos_os` e `tipo_os_salvar`).
import { sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';
import type { Planilha } from '../util/xlsx';

export interface CelulaGeral {
  mes: string; periodo: number; cliente_id: string; projeto_id: string; consultor_id: string; tipo_id?: string;
  min: number; faturado: number; custo: number; min_sem_valor: number; min_sem_custo: number; min_nao_fatura?: number;
}
export interface Soma { min: number; faturado: number; custo: number; margem: number; margem_pct: number | null; min_sem_valor: number; min_sem_custo: number; min_nao_fatura: number }
export interface RentaGeral {
  ini: string; fim: string;
  clientes: { id: string; nome: string }[]; projetos: { id: string; nome: string; cliente_id: string }[]; pessoas: { id: string; nome: string }[];
  periodos: { key: number; label: string; ini: string; fim: string }[];
  /** tipos de OS que apareceram no intervalo (id = chave do nome) e se contam no faturado */
  tipos?: { id: string; nome: string; fatura: boolean }[];
  celulas: CelulaGeral[]; total: Soma; pendencias: string[];
}
/** Linha do cadastro de tipos de OS. */
export interface TipoOs { chave: string; nome: string; fatura: boolean; cadastrado: boolean; do_campo: boolean; apontamentos: number }
export type Dimensao = 'tempo' | 'cliente' | 'projeto' | 'consultor' | 'tipo';
/** Como o tempo é fatiado: mês civil ou período de fechamento (21–20). */
export type Agrupamento = 'mes' | 'periodo';
export type FiltroGeral = Partial<Record<Dimensao, string>>;
export interface Grupo extends Soma { id: string; nome: string }

async function chamar<T>(acao: string, esc: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb.functions.invoke('financeiro', { body: { acao, escritorio: esc, ...extra } });
  if (error) {
    const c = await (error as { context?: Response }).context?.json?.().catch(() => null);
    const t = traduzirErro({ message: c?.erro ?? error.message });
    throw new FalhaApi(t.codigo, t.mensagem);
  }
  return data as T;
}

export const rentaGeral = {
  ler: (esc: string, ini: string, fim: string) => chamar<RentaGeral>('rentabilidade_geral', esc, { ini, fim }),
  /** Cadastro: tipos de OS (campo Apontamento) e se cada um conta no faturado. */
  tipos: (esc: string) => chamar<{ linhas: TipoOs[] }>('tipos_os', esc).then(r => r.linhas),
  tipoSalvar: (esc: string, nome: string, fatura: boolean) => chamar<{ ok: true }>('tipo_os_salvar', esc, { dados: { nome, fatura } }),
  tipoRemover: (esc: string, nome: string) => chamar<{ ok: true }>('tipo_os_salvar', esc, { dados: { nome, remover: true } }),
};

/** Tarefa sem o campo preenchido. */
export const TIPO_VAZIO = 'vazio';

export const ROTULO_DIMENSAO: Record<Dimensao, string> = { tempo: 'Período', cliente: 'Cliente', projeto: 'Projeto', consultor: 'Consultor', tipo: 'Tipo de OS' };
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "2026-10" → "out/26". */
export const rotuloMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1] ?? '?'}/${mes.slice(2, 4)}`;

const r2 = (v: number) => Math.round(v * 100) / 100;
const chaveTempo = (c: CelulaGeral, ag: Agrupamento) => (ag === 'mes' ? c.mes : String(c.periodo));
const chaveDe = (c: CelulaGeral, dim: Dimensao, ag: Agrupamento) =>
  (dim === 'tempo' ? chaveTempo(c, ag) : dim === 'cliente' ? c.cliente_id : dim === 'projeto' ? c.projeto_id : dim === 'tipo' ? c.tipo_id ?? TIPO_VAZIO : c.consultor_id);

/** Soma de um conjunto de células (margem = faturado − custo; % sobre o faturado). */
export function somar(celulas: CelulaGeral[]): Soma {
  const t = { min: 0, faturado: 0, custo: 0, min_sem_valor: 0, min_sem_custo: 0, min_nao_fatura: 0 };
  for (const c of celulas) { t.min += c.min; t.faturado += c.faturado; t.custo += c.custo; t.min_sem_valor += c.min_sem_valor; t.min_sem_custo += c.min_sem_custo; t.min_nao_fatura += c.min_nao_fatura ?? 0; }
  const faturado = r2(t.faturado), custo = r2(t.custo), margem = r2(faturado - custo);
  return { ...t, faturado, custo, margem, margem_pct: faturado ? margem / faturado : null };
}

/** Células que passam pelos filtros da navegação (cada dimensão filtrada restringe as demais). */
export function filtrar(celulas: CelulaGeral[], f: FiltroGeral, ag: Agrupamento): CelulaGeral[] {
  return celulas.filter(c => (Object.keys(f) as Dimensao[]).every(dim => !f[dim] || chaveDe(c, dim, ag) === f[dim]));
}

/** Nome de um item de uma dimensão. */
export function nomeDe(d: Pick<RentaGeral, 'clientes' | 'projetos' | 'pessoas' | 'periodos' | 'tipos'>, dim: Dimensao, id: string, ag: Agrupamento): string {
  if (dim === 'tipo') return d.tipos?.find(x => x.id === id)?.nome ?? (id === TIPO_VAZIO ? '(vazio)' : id);
  if (dim === 'tempo') return ag === 'mes' ? rotuloMes(id) : d.periodos.find(p => String(p.key) === id)?.label ?? id;
  const lista = dim === 'cliente' ? d.clientes : dim === 'projeto' ? d.projetos : d.pessoas;
  return lista.find(x => x.id === id)?.nome ?? '—';
}

/** Soma por dimensão. O tempo sai em ordem cronológica; as demais, do maior faturado para o menor (empate: maior custo). */
export function agrupar(d: Pick<RentaGeral, 'clientes' | 'projetos' | 'pessoas' | 'periodos' | 'tipos'>, celulas: CelulaGeral[], dim: Dimensao, ag: Agrupamento): Grupo[] {
  const m = new Map<string, CelulaGeral[]>();
  for (const c of celulas) { const k = chaveDe(c, dim, ag); const l = m.get(k); if (l) l.push(c); else m.set(k, [c]); }
  const grupos = [...m].map(([id, l]) => ({ id, nome: nomeDe(d, dim, id, ag), ...somar(l) }));
  return dim === 'tempo'
    ? grupos.sort((a, b) => (ag === 'mes' ? a.id.localeCompare(b.id) : Number(a.id) - Number(b.id)))
    : grupos.sort((a, b) => b.faturado - a.faturado || b.custo - a.custo || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** O "nível de baixo" natural da navegação: geral → clientes → projetos → consultores (consultor escolhido: os projetos dele). */
export function proximoNivel(f: FiltroGeral): Dimensao {
  if (f.projeto) return f.consultor ? 'tempo' : 'consultor';
  if (f.cliente) return 'projeto';
  if (f.consultor) return 'projeto';
  return 'cliente';
}

/** Ao escolher um projeto, o cliente dele entra junto na trilha; trocar de cliente tira o projeto de outro cliente. */
export function aplicarFiltro(d: Pick<RentaGeral, 'projetos'>, f: FiltroGeral, dim: Dimensao, id: string): FiltroGeral {
  const n: FiltroGeral = { ...f };
  if (n[dim] === id) { delete n[dim]; return n; }   // clicar de novo no mesmo item desfaz
  n[dim] = id;
  if (dim === 'projeto') { const p = d.projetos.find(x => x.id === id); if (p) n.cliente = p.cliente_id; }
  if (dim === 'cliente' && n.projeto && d.projetos.find(x => x.id === n.projeto)?.cliente_id !== id) delete n.projeto;
  return n;
}

/** O grupo inteiro é de hora que não conta no faturado (tipo bonificado, interno…): só custo. */
export const soCusto = (g: Pick<Soma, 'min' | 'min_nao_fatura'>) => g.min > 0 && g.min_nao_fatura >= g.min;

/** Intervalo padrão: do 1º dia de 5 meses atrás até hoje (6 meses de calendário). */
export function intervaloPadrao(hoje: string, meses = 6): { ini: string; fim: string } {
  const y = Number(hoje.slice(0, 4)), m = Number(hoje.slice(5, 7)) - (meses - 1);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return { ini: d.toISOString().slice(0, 10), fim: hoje };
}

/** Planilha do detalhamento mostrado (só com os valores à mostra). */
export function planilhaGeral(dim: Dimensao, grupos: Grupo[], total: Soma): Planilha {
  const h = (min: number) => Math.round(min / 60 * 100) / 100;
  const linha = (nome: string, g: Soma) => [nome, h(g.min), h(g.min_nao_fatura), g.faturado, g.custo, g.margem, g.margem_pct === null ? null : Math.round(g.margem_pct * 1000) / 10];
  return {
    aba: 'Rentabilidade',
    colunas: [{ titulo: ROTULO_DIMENSAO[dim], largura: 40 }, { titulo: 'Horas', tipo: 'V' }, { titulo: 'Horas não faturadas', tipo: 'V' }, { titulo: 'Faturado', tipo: 'V' }, { titulo: 'Custo', tipo: 'V' },
      { titulo: 'Margem', tipo: 'V' }, { titulo: 'Margem %', tipo: 'V' }],
    linhas: [...grupos.map(g => linha(g.nome, g)), linha('Total', total)],
  };
}
