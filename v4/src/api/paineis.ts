// Painéis dinâmicos (V4 4.13.0, 0103): relatórios montados pelo usuário — tabela com agrupamento (descida de nível),
// linha do tempo (linha × datas agrupadas) e painel de gráficos (barras e linhas). As linhas vêm de
// `api.v4_relatorio_din_dados`, que já devolve só o que a pessoa enxerga no app, com os nomes do app (etapa do cadastro,
// lugar do chamado) e sem valores financeiros. Aqui ficam o catálogo de campos e as contas (puras, testadas no Vitest).
import { novaOperacao, rpc } from './cliente';
import type { Gravado } from './cadastros';
import { rotuloPeriodo, rotuloPrioridade, rotuloStatusDemanda, rotuloStatusTarefa } from './execucao';
import { rotuloAgenda } from './equipe';

export type Fonte = 'tarefas' | 'demandas' | 'chamados' | 'apontamentos';
export type TipoPainel = 'tabela' | 'linha_tempo' | 'graficos';
export type TipoCampo = 'texto' | 'data' | 'numero';
export interface Campo { chave: string; rotulo: string; tipo: TipoCampo }
export type Linha = Record<string, string | number | null>;
export type Filtros = Record<string, string[]>;
export type Granularidade = 'dia' | 'semana' | 'mes' | 'trimestre' | 'ano';
/** 'contagem' ou a chave de um campo numérico (soma). */
export type Medida = string;

export interface ConfigTabela { fonte: Fonte; filtros?: Filtros; colunas: string[]; grupos: string[] }
export interface ConfigLinhaTempo { fonte: Fonte; filtros?: Filtros; linha: string; campoData: string; gran: Granularidade; medida: Medida }
export interface ConfigGrafico { titulo: string; tipo: 'barras' | 'linhas'; fonte: Fonte; filtros?: Filtros; x: string; gran: Granularidade; medida: Medida; serie?: string | null }
export interface ConfigGraficos { graficos: ConfigGrafico[] }
/** Janela de datas do painel, em dias a partir de hoje (o banco aceita até 400 dias). */
export interface Janela { antes: number; depois: number }
export type ConfigPainel = (ConfigTabela | ConfigLinhaTempo | ConfigGraficos) & { janela?: Janela };
export interface Painel {
  id: string; versao: number; nome: string; tipo: TipoPainel; config: ConfigPainel; compartilhado: boolean; meu: boolean; dono_id: string | null; atualizado_em: string;
}
export interface DadosFonte { fonte: Fonte; de: string; ate: string; cortado: boolean; linhas: Record<string, unknown>[] }

export const TIPOS_PAINEL: { valor: TipoPainel; rotulo: string; detalhe: string }[] = [
  { valor: 'tabela', rotulo: 'Tabela', detalhe: 'Colunas escolhidas e agrupamentos com descida de nível' },
  { valor: 'linha_tempo', rotulo: 'Linha do tempo', detalhe: 'Uma linha por item e as datas agrupadas nas colunas' },
  { valor: 'graficos', rotulo: 'Painel de gráficos', detalhe: 'Vários gráficos de barras e de linhas' },
];
export const GRANULARIDADES: { valor: Granularidade; rotulo: string }[] = [
  { valor: 'dia', rotulo: 'Dia' }, { valor: 'semana', rotulo: 'Semana' }, { valor: 'mes', rotulo: 'Mês' },
  { valor: 'trimestre', rotulo: 'Trimestre' }, { valor: 'ano', rotulo: 'Ano' },
];
export const JANELA_PADRAO: Janela = { antes: 30, depois: 30 };

const t = (chave: string, rotulo: string): Campo => ({ chave, rotulo, tipo: 'texto' });
const d = (chave: string, rotulo: string): Campo => ({ chave, rotulo, tipo: 'data' });
const n = (chave: string, rotulo: string): Campo => ({ chave, rotulo, tipo: 'numero' });
export const FONTES: { valor: Fonte; rotulo: string; detalhe: string; campos: Campo[] }[] = [
  { valor: 'tarefas', rotulo: 'Tarefas (agenda)', detalhe: 'Uma linha por tarefa de agenda no período', campos: [
    d('data', 'Data'), t('consultor', 'Consultor'), t('cliente', 'Cliente'), t('projeto', 'Projeto'), t('demanda', 'Demanda'), t('subdemanda', 'Subdemanda'),
    t('tarefa', 'Tarefa'), t('etapa', 'Etapa'), t('status', 'Status'), t('periodo', 'Período'), t('tipo_agenda', 'Tipo de agenda'), t('tipo_os', 'Apontamento (tipo de OS)'),
    t('gp', 'GP do projeto'), t('de_chamado', 'É de chamado'), n('horas_previstas', 'Horas previstas'), n('horas_reais', 'Horas apontadas')] },
  { valor: 'demandas', rotulo: 'Demandas e subdemandas', detalhe: 'As abertas e as encerradas no período', campos: [
    t('cliente', 'Cliente'), t('projeto', 'Projeto'), t('demanda', 'Demanda'), t('subdemanda', 'Subdemanda'), t('nivel', 'Nível'), t('tipo', 'Tipo'),
    t('etapa', 'Etapa'), t('status', 'Status'), t('prioridade', 'Prioridade'), t('responsavel', 'Responsável'), t('gp', 'GP do projeto'), t('atrasada', 'Atrasada'),
    d('inicio', 'Início'), d('fim', 'Fim'), d('criada_em', 'Criada em'),
    n('horas_previstas', 'Horas previstas'), n('horas_planejadas', 'Horas planejadas'), n('horas_reais', 'Horas apontadas'), n('tarefas', 'Tarefas')] },
  { valor: 'chamados', rotulo: 'Chamados', detalhe: 'Os abertos e os abertos ou resolvidos no período', campos: [
    n('numero', 'Nº'), t('titulo', 'Título'), t('cliente', 'Cliente'), t('lugar', 'Lugar no fluxo'), t('prioridade', 'Prioridade'), t('tipo', 'Tipo'), t('fila', 'Fila'),
    t('origem', 'Origem'), t('etapa', 'Etapa'), t('responsavel', 'Responsável'), t('triado_por', 'Triado por'), t('aberto', 'Em aberto'),
    d('aberto_em', 'Aberto em'), d('triado_em', 'Triado em'), d('resolvido_em', 'Resolvido em'), n('dias', 'Dias em aberto'), n('agendas_abertas', 'Agendas em aberto')] },
  { valor: 'apontamentos', rotulo: 'Horas apontadas', detalhe: 'Uma linha por apontamento no período', campos: [
    d('data', 'Data'), t('consultor', 'Consultor'), t('cliente', 'Cliente'), t('projeto', 'Projeto'), t('demanda', 'Demanda'), t('tarefa', 'Tarefa'),
    t('etapa', 'Etapa'), t('tipo_os', 'Apontamento (tipo de OS)'), t('origem', 'Origem'), t('gp', 'GP do projeto'), n('horas', 'Horas')] },
];
export const fonteDe = (f: Fonte) => FONTES.find(x => x.valor === f) ?? FONTES[0];
export const camposDe = (f: Fonte, tipo?: TipoCampo) => fonteDe(f).campos.filter(c => !tipo || c.tipo === tipo);
export const campoDe = (f: Fonte, chave: string) => fonteDe(f).campos.find(c => c.chave === chave) ?? null;
export const rotuloCampo = (f: Fonte, chave: string) => (chave === 'contagem' ? 'Quantidade' : campoDe(f, chave)?.rotulo ?? chave);
/** Para onde a linha leva ao clicar (ficha da tarefa, demanda ou chamado). */
export const ENTIDADE: Record<Fonte, 'tarefa' | 'demanda' | 'chamado'> = { tarefas: 'tarefa', demandas: 'demanda', chamados: 'chamado', apontamentos: 'tarefa' };
export const idDaLinha = (f: Fonte, l: Linha) => String((f === 'apontamentos' ? l.tarefa_id : l.id) ?? '');

export const paineisApi = {
  listar: (esc: string) => rpc<{ pode_editar: boolean; itens: Painel[] }>('v4_relatorios_din', { p_escritorio: esc }),
  salvar: (esc: string, dados: Record<string, unknown>) =>
    rpc<Gravado>('v4_relatorio_din_salvar', { p_escritorio: esc, p_dados: dados, p_id_operacao: novaOperacao() }),
  dados: (esc: string, fonte: Fonte, de: string, ate: string) =>
    rpc<DadosFonte>('v4_relatorio_din_dados', { p_escritorio: esc, p_fonte: fonte, p_de: de, p_ate: ate }),
};

// ---------------------------------------------------------------- regras puras
export const VAZIO = '(vazio)';
const TIPOS_DEM: Record<string, string> = { entregavel: 'Entregável', plano_acao: 'Plano de ação', chamado: 'Chamado' };
const simNao = (v: unknown) => (v === true ? 'Sim' : v === false ? 'Não' : null);

/** Linhas do banco com os rótulos do app (status, prioridade, período, sim/não); texto vazio vira nulo. */
export function normalizar(fonte: Fonte, linhas: Record<string, unknown>[]): Linha[] {
  const status = fonte === 'tarefas' ? rotuloStatusTarefa : rotuloStatusDemanda;
  return linhas.map(l => {
    const r: Linha = {};
    for (const [k, v] of Object.entries(l)) {
      r[k] = typeof v === 'boolean' ? simNao(v) : v === '' || v === undefined || v === null ? null : typeof v === 'number' ? v
        : k === 'status' ? status(String(v)) : k === 'prioridade' ? rotuloPrioridade(String(v)) : k === 'periodo' ? rotuloPeriodo(String(v))
        : k === 'tipo_agenda' ? rotuloAgenda(String(v)) || String(v) : k === 'tipo' && fonte === 'demandas' ? TIPOS_DEM[String(v)] ?? String(v) : String(v);
    }
    return r;
  });
}

const texto = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? VAZIO : String(v));
export const num = (v: string | number | null | undefined) => (typeof v === 'number' ? v : v ? Number(v) || 0 : 0);

/** Filtro por campo: lista vazia = todos; a linha passa se o valor do campo estiver entre os escolhidos. */
export function filtrar(linhas: Linha[], filtros: Filtros | undefined): Linha[] {
  const ativos = Object.entries(filtros ?? {}).filter(([, v]) => v.length > 0);
  if (!ativos.length) return linhas;
  return linhas.filter(l => ativos.every(([c, v]) => v.includes(texto(l[c]))));
}
/** Valores que existem num campo, em ordem alfabética (para montar o filtro). */
export function valoresDe(linhas: Linha[], campo: string): string[] {
  return [...new Set(linhas.map(l => texto(l[campo])))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
}
export const medir = (linhas: Linha[], medida: Medida) => (medida === 'contagem' ? linhas.length : linhas.reduce((s, l) => s + num(l[medida]), 0));

const p2 = (x: number) => String(x).padStart(2, '0');
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** Balde de uma data (AAAA-MM-DD): chave ordenável e rótulo curto. Semana começa na segunda. */
export function balde(iso: string | number | null | undefined, gran: Granularidade): { chave: string; rotulo: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  if (!m) return null;
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (gran === 'dia') return { chave: `${m[1]}-${m[2]}-${m[3]}`, rotulo: `${m[3]}/${m[2]}` };
  if (gran === 'semana') {
    const dt = new Date(Date.UTC(a, mes - 1, dia));
    dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
    const ch = `${dt.getUTCFullYear()}-${p2(dt.getUTCMonth() + 1)}-${p2(dt.getUTCDate())}`;
    return { chave: ch, rotulo: `sem. ${p2(dt.getUTCDate())}/${p2(dt.getUTCMonth() + 1)}` };
  }
  if (gran === 'mes') return { chave: `${m[1]}-${m[2]}`, rotulo: `${MESES[mes - 1]}/${m[1].slice(2)}` };
  if (gran === 'trimestre') { const q = Math.ceil(mes / 3); return { chave: `${m[1]}-T${q}`, rotulo: `${q}º tri/${m[1].slice(2)}` }; }
  return { chave: m[1], rotulo: m[1] };
}

export interface NoGrupo { chave: string; campo: string; valor: string; n: number; somas: Record<string, number>; filhos: NoGrupo[]; linhas: Linha[] }
/** Árvore de agrupamento (descida de nível): cada nível agrupa por um campo; a folha guarda as linhas. */
export function agrupar(linhas: Linha[], grupos: string[], numericos: string[], prefixo = ''): NoGrupo[] {
  if (!grupos.length) return [];
  const [campo, ...resto] = grupos;
  const mapa = new Map<string, Linha[]>();
  for (const l of linhas) { const v = texto(l[campo]); (mapa.get(v) ?? mapa.set(v, []).get(v)!).push(l); }
  return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { numeric: true })).map(([valor, ls]) => {
    const chave = `${prefixo}/${campo}=${valor}`;
    return { chave, campo, valor, n: ls.length, somas: Object.fromEntries(numericos.map(c => [c, ls.reduce((s, l) => s + num(l[c]), 0)])),
      filhos: agrupar(ls, resto, numericos, chave), linhas: resto.length ? [] : ls };
  });
}

export interface MatrizTempo { colunas: { chave: string; rotulo: string }[]; linhas: { nome: string; celulas: Record<string, number>; total: number }[]; totais: Record<string, number>; total: number; semData: number; maximo: number }
/** Linha do tempo: uma linha por valor de `linha`, as datas de `campoData` agrupadas nas colunas, a medida em cada célula. */
export function linhaDoTempo(linhas: Linha[], c: Pick<ConfigLinhaTempo, 'linha' | 'campoData' | 'gran' | 'medida'>): MatrizTempo {
  const cols = new Map<string, string>(); const porLinha = new Map<string, Map<string, Linha[]>>(); let semData = 0;
  for (const l of linhas) {
    const b = balde(l[c.campoData], c.gran);
    if (!b) { semData++; continue; }
    cols.set(b.chave, b.rotulo);
    const nome = texto(l[c.linha]); const m = porLinha.get(nome) ?? porLinha.set(nome, new Map()).get(nome)!;
    (m.get(b.chave) ?? m.set(b.chave, []).get(b.chave)!).push(l);
  }
  const colunas = [...cols.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([chave, rotulo]) => ({ chave, rotulo }));
  const totais: Record<string, number> = {}; let maximo = 0;
  const saida = [...porLinha.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { numeric: true })).map(([nome, m]) => {
    const celulas: Record<string, number> = {}; let total = 0;
    for (const [k, ls] of m) { const v = medir(ls, c.medida); celulas[k] = v; total += v; totais[k] = (totais[k] ?? 0) + v; maximo = Math.max(maximo, v); }
    return { nome, celulas, total };
  });
  return { colunas, linhas: saida, totais, total: saida.reduce((s, l) => s + l.total, 0), semData, maximo };
}

export const MAX_SERIES = 8;
export const OUTROS = 'Outros';
export interface DadosGrafico { categorias: { chave: string; rotulo: string }[]; series: { nome: string; valores: number[] }[]; maximo: number }
/** Séries de um gráfico: eixo X por campo (data agrupada ou texto), medida no Y e, se houver, uma série por valor de `serie`.
 *  Mais de 8 séries: ficam as 7 maiores e o resto vira "Outros" (cor nova nunca é inventada). X de texto: as 30 maiores. */
export function dadosGrafico(linhas: Linha[], c: Pick<ConfigGrafico, 'x' | 'gran' | 'medida' | 'serie'>, xEhData: boolean): DadosGrafico {
  const cats = new Map<string, string>(); const porSerie = new Map<string, Map<string, Linha[]>>();
  for (const l of linhas) {
    const b = xEhData ? balde(l[c.x], c.gran) : { chave: texto(l[c.x]), rotulo: texto(l[c.x]) };
    if (!b) continue;
    cats.set(b.chave, b.rotulo);
    const s = c.serie ? texto(l[c.serie]) : '';
    const m = porSerie.get(s) ?? porSerie.set(s, new Map()).get(s)!;
    (m.get(b.chave) ?? m.set(b.chave, []).get(b.chave)!).push(l);
  }
  let categorias = [...cats.entries()].map(([chave, rotulo]) => ({ chave, rotulo }));
  const totalCat = (k: string) => [...porSerie.values()].reduce((s, m) => s + medir(m.get(k) ?? [], c.medida), 0);
  if (xEhData) categorias.sort((a, b) => a.chave.localeCompare(b.chave));
  else categorias = categorias.map(x => ({ ...x, t: totalCat(x.chave) })).sort((a, b) => b.t - a.t || a.rotulo.localeCompare(b.rotulo, 'pt-BR')).slice(0, 30);
  let series = [...porSerie.entries()].map(([nome, m]) => ({ nome, valores: categorias.map(k => medir(m.get(k.chave) ?? [], c.medida)) }));
  const soma = (v: number[]) => v.reduce((a, b) => a + b, 0);
  series.sort((a, b) => soma(b.valores) - soma(a.valores) || a.nome.localeCompare(b.nome, 'pt-BR'));
  if (series.length > MAX_SERIES) {
    const resto = series.slice(MAX_SERIES - 1);
    series = [...series.slice(0, MAX_SERIES - 1), { nome: OUTROS, valores: categorias.map((_, i) => resto.reduce((s, r) => s + r.valores[i], 0)) }];
  }
  return { categorias, series, maximo: Math.max(0, ...series.flatMap(s => s.valores)) };
}

/** Período do painel a partir de hoje (o banco limita a 400 dias). */
export function periodoDe(j: Janela | undefined, hoje: string): { de: string; ate: string } {
  const jan = j ?? JANELA_PADRAO;
  const antes = Math.min(Math.max(Math.round(jan.antes) || 0, 0), 365), depois = Math.min(Math.max(Math.round(jan.depois) || 0, 0), 400 - antes);
  const mais = (dias: number) => { const [a, m, dd] = hoje.split('-').map(Number); const x = new Date(Date.UTC(a, m - 1, dd + dias)); return `${x.getUTCFullYear()}-${p2(x.getUTCMonth() + 1)}-${p2(x.getUTCDate())}`; };
  return { de: mais(-antes), ate: mais(depois) };
}
/** Fontes que o painel usa (um painel de gráficos pode misturar fontes). */
export function fontesDoPainel(tipo: TipoPainel, c: ConfigPainel): Fonte[] {
  if (tipo === 'graficos') return [...new Set(((c as ConfigGraficos).graficos ?? []).map(g => g.fonte))];
  return [(c as ConfigTabela).fonte ?? 'tarefas'];
}
/** Configuração inicial de um painel novo, já utilizável. */
export function configInicial(tipo: TipoPainel): ConfigPainel {
  if (tipo === 'tabela') return { fonte: 'tarefas', colunas: ['data', 'consultor', 'cliente', 'tarefa', 'status', 'horas_previstas'], grupos: ['consultor'], janela: JANELA_PADRAO };
  if (tipo === 'linha_tempo') return { fonte: 'tarefas', linha: 'consultor', campoData: 'data', gran: 'semana', medida: 'horas_previstas', janela: JANELA_PADRAO };
  return { graficos: [graficoInicial()], janela: JANELA_PADRAO };
}
export const graficoInicial = (): ConfigGrafico => ({ titulo: '', tipo: 'barras', fonte: 'tarefas', x: 'data', gran: 'semana', medida: 'horas_previstas', serie: null });
/** Tira da configuração o que não existe mais no catálogo (campo renomeado ou painel salvo por versão antiga). */
export function sanear(tipo: TipoPainel, c: ConfigPainel): ConfigPainel {
  const tem = (f: Fonte, k: string | null | undefined, tp?: TipoCampo) => !!k && camposDe(f, tp).some(x => x.chave === k);
  const filtros = (f: Fonte, fi?: Filtros) => Object.fromEntries(Object.entries(fi ?? {}).filter(([k, v]) => tem(f, k) && Array.isArray(v) && v.length));
  const medida = (f: Fonte, m: string) => (m === 'contagem' || tem(f, m, 'numero') ? m : 'contagem');
  const base = configInicial(tipo);
  if (tipo === 'tabela') {
    const x = { ...(base as ConfigTabela), ...(c as ConfigTabela) }; const f = fonteDe(x.fonte).valor;
    const colunas = (x.colunas ?? []).filter(k => tem(f, k));
    return { fonte: f, filtros: filtros(f, x.filtros), colunas: colunas.length ? colunas : camposDe(f).slice(0, 6).map(k => k.chave), grupos: (x.grupos ?? []).filter(k => tem(f, k)).slice(0, 4), janela: c.janela ?? JANELA_PADRAO };
  }
  if (tipo === 'linha_tempo') {
    const x = { ...(base as ConfigLinhaTempo), ...(c as ConfigLinhaTempo) }; const f = fonteDe(x.fonte).valor;
    return { fonte: f, filtros: filtros(f, x.filtros), linha: tem(f, x.linha) ? x.linha : camposDe(f, 'texto')[0].chave,
      campoData: tem(f, x.campoData, 'data') ? x.campoData : camposDe(f, 'data')[0].chave,
      gran: GRANULARIDADES.some(g => g.valor === x.gran) ? x.gran : 'semana', medida: medida(f, x.medida), janela: c.janela ?? JANELA_PADRAO };
  }
  const gs = ((c as ConfigGraficos).graficos ?? []).slice(0, 8).map(g => {
    const f = fonteDe(g.fonte).valor;
    return { titulo: String(g.titulo ?? '').slice(0, 80), tipo: g.tipo === 'linhas' ? 'linhas' as const : 'barras' as const, fonte: f, filtros: filtros(f, g.filtros),
      x: tem(f, g.x) ? g.x : camposDe(f)[0].chave, gran: GRANULARIDADES.some(k => k.valor === g.gran) ? g.gran : 'semana' as Granularidade,
      medida: medida(f, g.medida), serie: tem(f, g.serie) ? g.serie : null };
  });
  return { graficos: gs.length ? gs : [graficoInicial()], janela: c.janela ?? JANELA_PADRAO };
}
/** Número para a tela: inteiro sem casas; fração com até 1 casa. */
export const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
