// Filtros das listas (Clientes, Projetos, Demandas e as listas internas das fichas): regra pura de cada tela, opções
// montadas a partir do que a lista traz e o filtro escolhido lembrado por tela neste navegador (pmo4:filtros:<tela>).
// Lista vazia num filtro de vários = todos. SEM = "sem responsável / sem GP / sem etapa".
import { useCallback, useEffect, useState } from 'react';
import { semAlerta, statusV4 } from '../api/execucao';
import { temTexto } from './filtro';
import { marcadosDe, montarSelecao, ocultando, passa, passaAlgum, semSelecao } from '../util/selecao';

export { temTexto };

export const SEM = '-';
export interface Opcao { valor: string; rotulo: string }

// ---------------------------------------------------------------- peças comuns
/** Exibir (só os marcados) ou Ocultar (todos menos os marcados): ver util/selecao. */
const em = (sel: readonly string[], v: string | null | undefined) => passa(sel, v || SEM);
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
    && passaAlgum(f.fases, fases.get(l.id) ?? [])
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
    && passa(f.clientes, l.cliente_id)
    && temTexto(f.texto, l.cliente, l.nome, l.fase));
}

// ---------------------------------------------------------------- demandas
/** `status` vazio = todos (na lista geral o status já vem filtrado do banco). */
export interface FiltroDemandas {
  texto: string; fases: string[]; etapas: string[]; responsaveis: string[]; status: string[]; tipos: string[]; prioridades: string[];
  clientes: string[]; projetos: string[]; atrasadas: boolean;
  /**
   * V4: nível em que TODOS os filtros são aplicados — '' (demandas e subdemandas), 'demanda' (a demanda que passa vem com
   * todas as subdemandas), 'subdemanda' (só as subdemandas que passam, com a mãe de contexto) ou 'tarefa' (só o
   * responsável, onde as tarefas estão à mão).
   */
  nivel: string;
  /** 4.26.0: situação do projeto da demanda — 'ativos' (Ativo e Suspenso), 'inativos' (Encerrado e Cancelado) ou '' (todos). */
  sitProjeto: string;
}
export const SIT_PROJETO: Opcao[] = [
  { valor: 'ativos', rotulo: 'Projetos ativos' }, { valor: 'inativos', rotulo: 'Projetos inativos' }, { valor: '', rotulo: 'Projetos ativos e inativos' },
];
export const NIVEIS_FILTRO: Opcao[] = [
  { valor: '', rotulo: 'Demandas e subdemandas' }, { valor: 'demanda', rotulo: 'Demandas' }, { valor: 'subdemanda', rotulo: 'Subdemandas' },
];
export const NIVEIS_RESPONSAVEL: Opcao[] = [
  { valor: '', rotulo: 'Todos os níveis' }, { valor: 'demanda', rotulo: 'Só demandas (com as subdemandas)' }, { valor: 'subdemanda', rotulo: 'Só subdemandas' },
];
export const NIVEL_TAREFA: Opcao = { valor: 'tarefa', rotulo: 'Só tarefas' };
export const PADRAO_DEMANDAS: FiltroDemandas = {
  texto: '', fases: [], etapas: [], responsaveis: [], status: [], tipos: [], prioridades: [], clientes: [], projetos: [], atrasadas: false, nivel: '', sitProjeto: '',
};
/** Tela de Demandas: abre só com os projetos ativos (como Clientes e Projetos); as outras listas não olham a situação. */
export const PADRAO_DEMANDAS_TELA: FiltroDemandas = { ...PADRAO_DEMANDAS, sitProjeto: 'ativos' };
export interface DemandaFiltravel {
  id: string; pai_id: string | null; nome: string; status: string; projeto_id?: string; tipo?: string; prioridade?: string;
  responsavel_id?: string | null; etapa?: string | null; fase?: string; cliente_id?: string; cliente?: string; projeto?: string;
  /** V4: etapa do app (id); quando vem preenchida o filtro de etapa compara por ela, senão pelo texto. */
  etapa_app_id?: string | null;
  /** Projeto Encerrado ou Cancelado (a tela preenche); sem ele, o projeto conta como ativo. */
  projeto_inativo?: boolean;
  /** Nome da etapa do app (a tela preenche); entra na busca por texto. Sem ele, vale o texto de `etapa`. */
  etapa_nome?: string | null;
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
  if (semSelecao(f.responsaveis)) return null;
  const dele = (d: DemandaFiltravel) => em(f.responsaveis, d.responsavel_id);
  const nivel = (n: string) => f.nivel === '' || f.nivel === n;
  const ids = new Set<string>();
  if (nivel('demanda')) {
    const maes = new Set(lista.filter(d => !d.pai_id && dele(d)).map(d => d.id));
    for (const d of lista) if (maes.has(d.id) || (d.pai_id && maes.has(d.pai_id))) ids.add(d.id);
  }
  if (nivel('subdemanda')) for (const d of lista) if (d.pai_id && dele(d)) ids.add(d.id);
  if (nivel('tarefa') && consultores) for (const d of lista) if (passaAlgum(f.responsaveis, [...(consultores.get(d.id) ?? [])])) ids.add(d.id);
  return ids;
}

const etapaDe = (d: DemandaFiltravel) => (d.etapa_app_id !== undefined ? d.etapa_app_id : d.etapa);
/**
 * Etapa para a busca por texto: o nome da etapa do app E o texto original (o de/para pode dar outro nome à etapa — ex.:
 * "Personalização / Customização" aparece no app como "Backlog Personalização"); sem etapa própria, valem os da mãe.
 */
const etapasTexto = (d: DemandaFiltravel, mae?: DemandaFiltravel) =>
  (d.etapa_nome || d.etapa ? [d.etapa_nome, d.etapa] : [mae?.etapa_nome, mae?.etapa]);
/** `mae`: a demanda-mãe (quando está na lista) — o nome dela vale na busca por texto e a etapa dela vale (no texto e no filtro Etapa) para a subdemanda sem etapa própria, como no backlog da Agenda da Equipe. */
function demandaPassa(d: DemandaFiltravel, f: FiltroDemandas, doResp: Set<string> | null, mae?: DemandaFiltravel): boolean {
  return (!doResp || doResp.has(d.id)) && em(f.status, statusV4(d.status)) && em(f.fases, d.fase)
    && em(f.etapas, etapaDe(d) || (mae ? etapaDe(mae) : null))   // sem etapa própria vale a da mãe (como no backlog da Agenda)
    && passa(f.tipos, d.tipo ?? 'entregavel')
    && passa(f.prioridades, d.prioridade ?? 'normal')
    && passa(f.clientes, d.cliente_id)
    && passa(f.projetos, d.projeto_id)
    && (!f.sitProjeto || (f.sitProjeto === 'inativos') === !!d.projeto_inativo)
    && (!f.atrasadas || (!!d.totais?.atrasada && !semAlerta(d)))
    && temTexto(f.texto, d.nome, mae?.nome, d.cliente, d.projeto, ...etapasTexto(d, mae));
}
/**
 * Demandas e subdemandas que passam no filtro, na ordem recebida. A mãe de uma subdemanda que passa vem junto
 * (para a árvore mostrar a subdemanda no lugar), mesmo sem passar ela mesma. Responsável: ver idsDoResponsavel.
 */
export function filtrarDemandas<T extends DemandaFiltravel>(lista: T[], f: FiltroDemandas, consultores?: Map<string, Set<string>>): T[] {
  const porId = new Map(lista.map(d => [d.id, d]));
  const maeDe = (d: T) => (d.pai_id ? porId.get(d.pai_id) : undefined);
  if (f.nivel === 'demanda' || f.nivel === 'subdemanda') {
    // V4: o nível vale para todos os filtros. Responsável aqui é o do próprio item.
    const ehSub = (d: T) => !!d.pai_id && porId.has(d.pai_id);
    const dele = semSelecao(f.responsaveis) ? null : new Set(lista.filter(d => em(f.responsaveis, d.responsavel_id)).map(d => d.id));
    if (f.nivel === 'demanda') {
      const maes = new Set(lista.filter(d => !ehSub(d) && demandaPassa(d, f, dele)).map(d => d.id));
      return lista.filter(d => maes.has(d.id) || (!!d.pai_id && maes.has(d.pai_id)));
    }
    const subs = new Set(lista.filter(d => ehSub(d) && demandaPassa(d, f, dele, maeDe(d))).map(d => d.id));
    const contexto = new Set(lista.filter(d => subs.has(d.id)).map(d => d.pai_id!));
    return lista.filter(d => subs.has(d.id) || contexto.has(d.id));
  }
  const doResp = idsDoResponsavel(lista, f, consultores);
  const passam = new Set(lista.filter(d => demandaPassa(d, f, doResp, maeDe(d))).map(d => d.id));
  const maes = new Set(lista.filter(d => d.pai_id && passam.has(d.id)).map(d => d.pai_id!));
  return lista.filter(d => passam.has(d.id) || maes.has(d.id));
}

// ---------------------------------------------------------------- portfólio
/** Portfólio (V4 4.2.0): os mesmos filtros da tela de Demandas + GP (pelo nome, como nas barras). */
export interface FiltroPortfolio extends FiltroDemandas { gps: string[] }
export const PADRAO_PORTFOLIO: FiltroPortfolio = { ...PADRAO_DEMANDAS, gps: [] };
interface ProjetoDoPortfolio { id: string; nome: string; fase: string; cliente_id: string; cliente: string; gp: string | null }
/** Há filtro que olha as demandas do projeto (etapa, responsável, tipo, prioridade, só atrasadas)? O status entra por `statusRestringe`. */
export const filtraPorDemanda = (f: FiltroPortfolio, statusRestringe = false) =>
  statusRestringe || !semSelecao(f.etapas) || !semSelecao(f.responsaveis) || !semSelecao(f.tipos) || !semSelecao(f.prioridades) || f.atrasadas;
/**
 * Projetos do Portfólio que passam no filtro. Fase, cliente, projeto, GP e texto valem para o projeto; etapa, responsável,
 * tipo, prioridade e "só atrasadas" (e o status, quando `statusRestringe`) pedem ao menos uma demanda do projeto que
 * passe — no nível escolhido em "Aplicar filtros em". `demandas` já vem do banco só com os status escolhidos.
 * `fora` deixa de aplicar fases e/ou GPs (os cartões por fase contam sem o filtro de fase; as barras, sem o de GP).
 */
export function filtrarPortfolio<P extends ProjetoDoPortfolio>(ps: P[], demandas: DemandaFiltravel[] | null, f: FiltroPortfolio,
  statusRestringe = false, fora: { fases?: boolean; gps?: boolean } = {}, semGp = 'Sem GP'): P[] {
  let comDemanda: Set<string> | null = null;
  if (demandas && filtraPorDemanda(f, statusRestringe)) {
    const passam = filtrarDemandas(demandas, { ...f, texto: '', fases: [], clientes: [], projetos: [], status: [] });
    comDemanda = new Set(passam.map(d => d.projeto_id).filter((x): x is string => !!x));
  }
  return ps.filter(p =>
    (fora.fases || em(f.fases, p.fase)) && (fora.gps || passa(f.gps, p.gp ?? semGp))
    && passa(f.clientes, p.cliente_id)
    && passa(f.projetos, p.id)
    && (!comDemanda || comDemanda.has(p.id))
    && temTexto(f.texto, p.nome, p.cliente, p.gp, p.fase));
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
  const validos = montarSelecao(marcadosDe(escolhidos).filter(id => candidatos.some(m => m.id === id)), ocultando(escolhidos));
  return candidatos.filter(m => passa(validos, m.id) && temTexto(texto, m.nome));
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
const chave = (tela: string) => `pmo4:filtros:${tela}`;
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

/** Itens que o gráfico de Demandas conta conforme o nível escolhido em "Aplicar filtros em" (4.18.0): só demandas, só subdemandas
 *  ou os dois. A lista filtrada traz também o contexto (as subdemandas da demanda que passou, ou a mãe da subdemanda que passou),
 *  que aparece na árvore mas não entra na contagem. Subdemanda = tem mãe carregada (`todas`), como em filtrarDemandas. */
export function itensDoNivel<T extends { id: string; pai_id: string | null }>(filtradas: T[], nivel: string, todas: { id: string }[] = filtradas): T[] {
  if (nivel !== 'demanda' && nivel !== 'subdemanda') return filtradas;
  const ids = new Set(todas.map(d => d.id));
  return filtradas.filter(d => (!!d.pai_id && ids.has(d.pai_id)) === (nivel === 'subdemanda'));
}

/** Quantidade de demandas/subdemandas por cliente, em ordem alfabética (gráfico da tela Demandas). 4.17.0: cada cliente traz
 *  a quantidade por etapa do app (`etapas`, na ordem de `ordemEtapas`; "sem etapa" = id null, sempre por último). */
export interface ContagemCliente { cliente_id: string; cliente: string; n: number; etapas: { id: string | null; n: number }[] }
export function contarPorCliente(itens: { cliente_id: string; cliente: string; etapa_app_id?: string | null }[], ordemEtapas: string[] = []): ContagemCliente[] {
  const m = new Map<string, { cliente_id: string; cliente: string; n: number; e: Map<string | null, number> }>();
  for (const d of itens) {
    const c = m.get(d.cliente_id) ?? { cliente_id: d.cliente_id, cliente: d.cliente, n: 0, e: new Map<string | null, number>() };
    const id = d.etapa_app_id ?? null;
    c.n++;
    c.e.set(id, (c.e.get(id) ?? 0) + 1);
    m.set(d.cliente_id, c);
  }
  const pos = (id: string | null) => { if (id === null) return Infinity; const i = ordemEtapas.indexOf(id); return i < 0 ? ordemEtapas.length : i; };
  return [...m.values()].map(({ e, ...c }) => ({ ...c, etapas: [...e].map(([id, n]) => ({ id, n })).sort((a, b) => pos(a.id) - pos(b.id)) }))
    .sort((a, b) => a.cliente.localeCompare(b.cliente, 'pt-BR', { sensitivity: 'base' }));
}
