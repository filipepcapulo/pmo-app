// Filtros das listas (Clientes, Projetos, Demandas e as listas internas das fichas): regra pura de cada tela, opções
// montadas a partir do que a lista traz e o filtro escolhido lembrado por tela neste navegador (pmo3:filtros:<tela>).
// Lista vazia num filtro de vários = todos. SEM = "sem responsável / sem GP / sem etapa".
import { useCallback, useEffect, useState } from 'react';
import { semAlerta } from '../api/execucao';
import { normal } from './filtro';

export const SEM = '-';
export interface Opcao { valor: string; rotulo: string }

// ---------------------------------------------------------------- peças comuns
const em = (sel: readonly string[], v: string | null | undefined) => sel.length === 0 || sel.includes(v || SEM);
/** Todas as palavras do texto aparecem em algum dos campos (sem acento, sem caixa). */
export function temTexto(texto: string, ...campos: (string | null | undefined)[]): boolean {
  const palavras = normal(texto).split(/\s+/).filter(Boolean);
  if (!palavras.length) return true;
  const onde = normal(campos.filter(Boolean).join(' '));
  return palavras.every(p => onde.includes(p));
}

const col = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
/** Opções de pessoa a partir dos ids que aparecem na lista (nome pelo `nomeDe`); nulo vira "(sem …)" no fim. */
export function opcoesPessoas(ids: (string | null | undefined)[], nomeDe: (id: string) => string | null | undefined, semRotulo = '(sem responsável)'): Opcao[] {
  const vistos = new Set<string>();
  let vazio = false;
  for (const i of ids) { if (i) vistos.add(i); else vazio = true; }
  const REMOVIDA = '(pessoa removida)';
  const ops = [...vistos].map(v => ({ valor: v, rotulo: nomeDe(v) || REMOVIDA }))
    .sort((a, b) => Number(a.rotulo === REMOVIDA) - Number(b.rotulo === REMOVIDA) || col.compare(a.rotulo, b.rotulo));
  return vazio ? [...ops, { valor: SEM, rotulo: semRotulo }] : ops;
}
/** Opções de texto distintas, em ordem; `base` (ex.: FASES) vem primeiro, na ordem dada. Vazio vira "(sem …)". */
export function opcoesTexto(valores: (string | null | undefined)[], base: readonly string[] = [], semRotulo?: string): Opcao[] {
  const vistos = new Set<string>();
  let vazio = false;
  for (const v of valores) { if (v) vistos.add(v); else vazio = true; }
  const extras = [...vistos].filter(v => !base.includes(v)).sort(col.compare);
  const ops = [...base, ...extras].map(v => ({ valor: v, rotulo: v }));
  return vazio && semRotulo ? [...ops, { valor: SEM, rotulo: semRotulo }] : ops;
}
/** Opções id → nome distintas (clientes, projetos), em ordem alfabética. */
export function opcoesNomeadas(pares: [string, string][]): Opcao[] {
  return [...new Map(pares).entries()].map(([valor, rotulo]) => ({ valor, rotulo })).sort((a, b) => col.compare(a.rotulo, b.rotulo));
}

// ---------------------------------------------------------------- clientes
export interface FiltroClientes { texto: string; gps: string[]; fases: string[]; situacao: 'ativos' | 'inativos' | 'todos' }
export const PADRAO_CLIENTES: FiltroClientes = { texto: '', gps: [], fases: [], situacao: 'ativos' };
interface ClienteFiltravel { id: string; nome: string; ativo: boolean; gp?: { id: string } | null }

/** Fases dos projetos abertos (ativo/suspenso) de cada cliente, na ordem de `ordem`. */
export function fasesPorCliente(projetos: { cliente_id: string; fase: string; situacao: string }[], ordem: readonly string[] = []): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const p of projetos) {
    if (p.situacao !== 'ativo' && p.situacao !== 'pausado') continue;
    const l = m.get(p.cliente_id) ?? [];
    if (!l.includes(p.fase)) l.push(p.fase);
    m.set(p.cliente_id, l);
  }
  const pos = (f: string) => { const i = ordem.indexOf(f); return i < 0 ? ordem.length : i; };
  for (const l of m.values()) l.sort((a, b) => pos(a) - pos(b) || col.compare(a, b));
  return m;
}
export function filtrarClientes<T extends ClienteFiltravel>(linhas: T[], f: FiltroClientes, fases: Map<string, string[]> = new Map()): T[] {
  return linhas.filter(l =>
    (f.situacao === 'todos' || (f.situacao === 'ativos') === l.ativo)
    && em(f.gps, l.gp?.id)
    && (f.fases.length === 0 || (fases.get(l.id) ?? []).some(x => f.fases.includes(x)))
    && temTexto(f.texto, l.nome));
}

// ---------------------------------------------------------------- projetos
/** situacao: 'abertos' (ativo + suspenso), uma situação ou '' (todas). */
export interface FiltroProjetos { texto: string; fases: string[]; gps: string[]; clientes: string[]; situacao: string }
export const PADRAO_PROJETOS: FiltroProjetos = { texto: '', fases: [], gps: [], clientes: [], situacao: 'abertos' };
export const PADRAO_PROJETOS_CLIENTE: FiltroProjetos = { ...PADRAO_PROJETOS, situacao: '' };
interface ProjetoFiltravel { nome: string; fase: string; situacao: string; gp?: { id: string } | null; cliente_id?: string; cliente?: string }

export function filtrarProjetos<T extends ProjetoFiltravel>(linhas: T[], f: FiltroProjetos): T[] {
  return linhas.filter(l =>
    (f.situacao === '' || (f.situacao === 'abertos' ? l.situacao === 'ativo' || l.situacao === 'pausado' : l.situacao === f.situacao))
    && em(f.fases, l.fase) && em(f.gps, l.gp?.id)
    && (f.clientes.length === 0 || (!!l.cliente_id && f.clientes.includes(l.cliente_id)))
    && temTexto(f.texto, l.cliente, l.nome, l.fase));
}

// ---------------------------------------------------------------- demandas
/** `status` vazio = todos (na lista geral o status já vem filtrado do banco). */
export interface FiltroDemandas {
  texto: string; fases: string[]; etapas: string[]; responsaveis: string[]; status: string[]; tipos: string[]; prioridades: string[];
  clientes: string[]; projetos: string[]; atrasadas: boolean;
  /** Em que nível o responsável é procurado: '' (todos), 'demanda', 'subdemanda' ou 'tarefa' (onde as tarefas estão à mão). */
  nivel: string;
}
export const NIVEIS_RESPONSAVEL: Opcao[] = [
  { valor: '', rotulo: 'Todos os níveis' }, { valor: 'demanda', rotulo: 'Só demandas (com as subdemandas)' }, { valor: 'subdemanda', rotulo: 'Só subdemandas' },
];
export const NIVEL_TAREFA: Opcao = { valor: 'tarefa', rotulo: 'Só tarefas' };
export const PADRAO_DEMANDAS: FiltroDemandas = {
  texto: '', fases: [], etapas: [], responsaveis: [], status: [], tipos: [], prioridades: [], clientes: [], projetos: [], atrasadas: false, nivel: '',
};
export interface DemandaFiltravel {
  id: string; pai_id: string | null; nome: string; status: string; projeto_id?: string; tipo?: string; prioridade?: string;
  responsavel_id?: string | null; etapa?: string | null; fase?: string; cliente_id?: string; cliente?: string; projeto?: string;
  totais?: { atrasada?: boolean; avulso_base?: boolean } | null; avulso_base?: boolean;
}
export const TIPOS_DEMANDA: Opcao[] = [
  { valor: 'entregavel', rotulo: 'Entregável' }, { valor: 'plano_acao', rotulo: 'Plano de ação' }, { valor: 'chamado', rotulo: 'Chamado' },
];

/** Quem tem tarefa em cada demanda (para o filtro de responsável onde as tarefas estão à mão, como na ficha do projeto). */
export function consultoresPorDemanda(tarefas: { demanda_id: string; responsavel_id: string | null }[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const t of tarefas) {
    if (!t.responsavel_id) continue;
    const s = m.get(t.demanda_id) ?? new Set<string>();
    s.add(t.responsavel_id);
    m.set(t.demanda_id, s);
  }
  return m;
}

/**
 * Ids que passam no filtro de responsável (null = sem filtro), conforme o nível:
 * - demanda: a demanda do responsável e TODAS as subdemandas dela (o que ele delegou também aparece);
 * - subdemanda: só as subdemandas atribuídas a ele;
 * - tarefa: demandas/subdemandas onde ele tem tarefa (precisa de `consultores`);
 * - todos (''): a soma dos três.
 */
export function idsDoResponsavel(lista: DemandaFiltravel[], f: Pick<FiltroDemandas, 'responsaveis' | 'nivel'>, consultores?: Map<string, Set<string>>): Set<string> | null {
  if (f.responsaveis.length === 0) return null;
  const dele = (d: DemandaFiltravel) => f.responsaveis.includes(d.responsavel_id || SEM);
  const nivel = (n: string) => f.nivel === '' || f.nivel === n;
  const ids = new Set<string>();
  if (nivel('demanda')) {
    const maes = new Set(lista.filter(d => !d.pai_id && dele(d)).map(d => d.id));
    for (const d of lista) if (maes.has(d.id) || (d.pai_id && maes.has(d.pai_id))) ids.add(d.id);
  }
  if (nivel('subdemanda')) for (const d of lista) if (d.pai_id && dele(d)) ids.add(d.id);
  if (nivel('tarefa') && consultores) for (const d of lista) if ([...(consultores.get(d.id) ?? [])].some(c => f.responsaveis.includes(c))) ids.add(d.id);
  return ids;
}

function demandaPassa(d: DemandaFiltravel, f: FiltroDemandas, doResp: Set<string> | null): boolean {
  return (!doResp || doResp.has(d.id)) && em(f.status, d.status) && em(f.fases, d.fase) && em(f.etapas, d.etapa)
    && (f.tipos.length === 0 || f.tipos.includes(d.tipo ?? 'entregavel'))
    && (f.prioridades.length === 0 || f.prioridades.includes(d.prioridade ?? 'normal'))
    && (f.clientes.length === 0 || (!!d.cliente_id && f.clientes.includes(d.cliente_id)))
    && (f.projetos.length === 0 || (!!d.projeto_id && f.projetos.includes(d.projeto_id)))
    && (!f.atrasadas || (!!d.totais?.atrasada && !semAlerta(d)))
    && temTexto(f.texto, d.nome, d.cliente, d.projeto);
}
/**
 * Demandas e subdemandas que passam no filtro, na ordem recebida. A mãe de uma subdemanda que passa vem junto
 * (para a árvore mostrar a subdemanda no lugar), mesmo sem passar ela mesma. Responsável: ver idsDoResponsavel.
 */
export function filtrarDemandas<T extends DemandaFiltravel>(lista: T[], f: FiltroDemandas, consultores?: Map<string, Set<string>>): T[] {
  const doResp = idsDoResponsavel(lista, f, consultores);
  const passam = new Set(lista.filter(d => demandaPassa(d, f, doResp)).map(d => d.id));
  const maes = new Set(lista.filter(d => d.pai_id && passam.has(d.id)).map(d => d.pai_id!));
  return lista.filter(d => passam.has(d.id) || maes.has(d.id));
}

// ---------------------------------------------------------------- tarefas
export interface FiltroTarefas { texto: string; responsaveis: string[]; status: string[]; de: string; ate: string }
export const PADRAO_TAREFAS: FiltroTarefas = { texto: '', responsaveis: [], status: [], de: '', ate: '' };
interface TarefaFiltravel { nome: string; responsavel_id: string | null; status: string; data: string | null }

export function filtrarTarefas<T extends TarefaFiltravel>(lista: T[], f: FiltroTarefas): T[] {
  const [de, ate] = f.de && f.ate && f.ate < f.de ? [f.ate, f.de] : [f.de, f.ate];   // período invertido vale igual
  return lista.filter(t => {
    const dia = (t.data ?? '').slice(0, 10);
    return em(f.responsaveis, t.responsavel_id) && em(f.status, t.status)
      && (!de || (!!dia && dia >= de)) && (!ate || (!!dia && dia <= ate))
      && temTexto(f.texto, t.nome);
  });
}

// ---------------------------------------------------------------- agenda da equipe (grade)
export interface FiltroAgendaEquipe { pessoas: string[] }
export const PADRAO_AGENDA_EQUIPE: FiltroAgendaEquipe = { pessoas: [] };
interface MembroGrade { id: string; nome: string; ativo: boolean; papeis: string[] }
/** Quem pode aparecer na grade: ativo e consultor/desenvolvedor, ou com tarefa no período; em ordem alfabética. */
export function candidatosGrade<T extends MembroGrade>(lista: T[], comTarefa: Set<string>): T[] {
  return lista.filter(m => m.ativo && (m.papeis.some(p => p === 'consultor' || p === 'desenvolvedor') || comTarefa.has(m.id)))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}
/** Linhas da grade: os escolhidos (nenhum escolhido, ou escolhidos que já não estão na equipe = todos) e o texto do nome. */
export function pessoasDaGrade<T extends MembroGrade>(candidatos: T[], escolhidos: readonly string[], texto = ''): T[] {
  const validos = escolhidos.filter(id => candidatos.some(m => m.id === id));
  return candidatos.filter(m => (validos.length === 0 || validos.includes(m.id)) && temTexto(texto, m.nome));
}

// ---------------------------------------------------------------- lembrar por tela
/** Quantos campos do filtro diferem do padrão (o que o "Limpar filtros" desfaz). */
export function contarAtivos<T extends object>(f: T, padrao: T): number {
  return (Object.keys(padrao) as (keyof T)[]).filter(k => JSON.stringify(f[k]) !== JSON.stringify(padrao[k])).length;
}
/** Aproveita de `bruto` só os campos do padrão com o mesmo tipo (o que veio do aparelho ou de um filtro salvo antigo). */
export function normalizarFiltro<T extends object>(padrao: T, bruto: unknown): T {
  const r = { ...padrao } as Record<string, unknown>;
  if (!bruto || typeof bruto !== 'object') return r as T;
  for (const [k, p] of Object.entries(padrao)) {
    const v = (bruto as Record<string, unknown>)[k];
    if (Array.isArray(p)) { if (Array.isArray(v)) r[k] = v.filter(x => typeof x === 'string'); }
    else if (v != null && typeof v === typeof p) r[k] = v;
  }
  return r as T;
}
const chave = (tela: string) => `pmo3:filtros:${tela}`;
export function lerFiltro<T extends object>(tela: string, padrao: T): T {
  try { return normalizarFiltro(padrao, JSON.parse(localStorage.getItem(chave(tela)) ?? 'null')); } catch { return { ...padrao }; }
}
export function gravarFiltro<T extends object>(tela: string, f: T, padrao: T): void {
  try {
    if (contarAtivos(f, padrao) === 0) localStorage.removeItem(chave(tela));
    else localStorage.setItem(chave(tela), JSON.stringify(f));
  } catch { /* sem armazenamento */ }
}

/** Filtro de uma tela, lembrado neste navegador: valor, `mudar({campo})`, `limpar()` e quantos campos estão ativos. */
export function useFiltroLista<T extends object>(tela: string, padrao: T) {
  const [f, setF] = useState<T>(() => lerFiltro(tela, padrao));
  useEffect(() => gravarFiltro(tela, f, padrao), [tela, f, padrao]);
  const mudar = useCallback((p: Partial<T>) => setF(x => ({ ...x, ...p })), []);
  const limpar = useCallback(() => setF({ ...padrao }), [padrao]);
  const aplicar = useCallback((bruto: unknown) => setF(normalizarFiltro(padrao, bruto)), [padrao]);
  return { f, mudar, limpar, aplicar, ativos: contarAtivos(f, padrao) };
}
