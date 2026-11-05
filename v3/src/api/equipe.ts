// Visão da equipe (V8): grade semana a semana, Kanban das agendas em aberto (3.13.0), backlog lateral, mover tarefas,
// ausências e as regras puras da tela (semanas, árvore do backlog, mover em massa, colunas do Kanban).
import { novaOperacao, rpc } from './cliente';
import { STATUS_DEMANDA } from './execucao';
import { diaNum, hojeIso, somarDias } from './projeto';

// ---------------------------------------------------------------- tipos
export interface TarefaGrade {
  id: string; versao: number; data: string; periodo: string; hora_ini: string | null; hora_fim: string | null; horas_previstas: number | null;
  modalidade: string | null; status: string; nome: string; consultor_id: string; demanda_id: string; demanda: string;
  projeto_id: string; projeto: string; cliente: string;
}
export type TipoAusencia = 'ferias' | 'folga' | 'licenca' | 'ausencia';
export const TIPOS_AUSENCIA: { valor: TipoAusencia; rotulo: string }[] = [
  { valor: 'ferias', rotulo: 'Férias' }, { valor: 'folga', rotulo: 'Folga' }, { valor: 'licenca', rotulo: 'Licença' }, { valor: 'ausencia', rotulo: 'Ausência' },
];
export const rotuloAusencia = (t: string) => TIPOS_AUSENCIA.find(x => x.valor === t)?.rotulo ?? t;
export interface Ausencia {
  id: string | null; versao: number | null; consultor_id: string; de: string; ate: string; tipo: TipoAusencia; origem?: 'app' | 'clickup'; motivo?: string | null;
  /** Só parte do dia (0039): início, fim e as horas pela conta da agenda (2 h de almoço). Vazios = dia inteiro. */
  hora_ini?: string | null; hora_fim?: string | null; horas?: number | null;
}
export interface Grade { tarefas: TarefaGrade[]; ausencias: Ausencia[] }
export type OrigemBacklog = 'demanda' | 'backlog_base' | 'personalizacao';
export const ORIGENS: { valor: OrigemBacklog; rotulo: string }[] = [
  { valor: 'demanda', rotulo: 'Demandas' }, { valor: 'backlog_base', rotulo: 'Backlog Base' }, { valor: 'personalizacao', rotulo: 'Personalização' },
];
export interface PedidoBacklog { id: string; versao: number; horas: number; motivo: string; solicitante: string }
export interface ItemBacklog {
  id: string; pai_id: string | null; pai: string | null; nome: string; prioridade: string; status: string; cliente_id: string; cliente: string;
  projeto_id: string; projeto: string; origem: OrigemBacklog; horas: number; pedidos: PedidoBacklog[]; criado_em?: string;
  /** Agendas em aberto (planejada/em andamento, qualquer data) do item (com as das subdemandas) e da demanda-mãe; próxima data futura. */
  agendas?: number; agendas_pai?: number | null; agenda_prox?: string | null;
  /** GP pela regra da pílula (0047): responsável, senão o da mãe, o do projeto, o do cliente. */
  gp_id?: string | null;
}
/** Agenda em aberto (não iniciada / em andamento) de qualquer data, para o Kanban (0047). */
export interface AgendaAberta extends TarefaGrade { pai_id: string | null; pai: string | null; cliente_id: string }
export interface ItemMover { id: string; versao: number; data: string; responsavel_id: string }

// ---------------------------------------------------------------- chamadas
const gravar = <T = { ok: true }>(fn: string, esc: string, d: unknown) => rpc<T>(fn, { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() });
export const equipe = {
  grade: (esc: string, de: string, ate: string) => rpc<Grade>('v1_grade', { p_escritorio: esc, p_de: de, p_ate: ate, p_consultores: null }),
  backlog: (esc: string) => rpc<ItemBacklog[]>('v1_backlog_lateral', { p_escritorio: esc }),
  abertas: (esc: string) => rpc<AgendaAberta[]>('v1_agendas_abertas', { p_escritorio: esc }),
  mover: (esc: string, itens: ItemMover[]) => gravar('v1_tarefas_mover', esc, { itens }),
  ausenciaSalvar: (esc: string, d: Record<string, unknown>) => gravar('v1_ausencia_salvar', esc, d),
  pedidoAtendido: (esc: string, id: string, versao: number) => gravar('v1_pedido_agenda_salvar', esc, { id, versao, situacao: 'atendido' }),
};

// ---------------------------------------------------------------- semanas e dias (sem fuso)
const diaSemana = (iso: string) => new Date(diaNum(iso) * 86400000).getUTCDay();
export const fimDeSemana = (iso: string) => [0, 6].includes(diaSemana(iso));
/** Segunda-feira da semana do dia. */
export const segundaDe = (iso: string) => somarDias(iso, -((diaSemana(iso) + 6) % 7));
export function diasEntre(de: string, ate: string) {
  const out: string[] = [];
  for (let n = diaNum(de); n <= diaNum(ate); n++) out.push(somarDias(de, n - diaNum(de)));
  return out;
}
/** Janela inicial: da semana passada até duas semanas à frente, em semanas fechadas. */
export const janelaInicial = (hoje = hojeIso()) => ({ de: somarDias(segundaDe(hoje), -7), ate: somarDias(segundaDe(hoje), 20) });
export const ausenciaEm = (lista: Ausencia[], consultor: string, data: string) =>
  lista.find(a => a.consultor_id === consultor && a.de <= data && a.ate >= data) ?? null;
/** Ausências da pessoa no dia: a de dia inteiro primeiro (bloqueia a célula); as de algumas horas só tiram horas. */
export const ausenciasNoDia = (lista: Ausencia[], consultor: string, data: string) =>
  lista.filter(a => a.consultor_id === consultor && a.de <= data && a.ate >= data).sort((a, b) => Number(!!a.hora_ini) - Number(!!b.hora_ini));
export const diaInteiro = (a: Ausencia) => !a.hora_ini;
/** Horas de ausência no dia (capacidade de 8 h): dia inteiro = 8; parciais somam as horas de cada uma, no máximo 8. */
export const horasAusentes = (l: Ausencia[]) => (l.some(diaInteiro) ? CAPACIDADE_DIA : Math.min(CAPACIDADE_DIA, l.reduce((s, a) => s + Number(a.horas ?? 0), 0)));
export const CAPACIDADE_DIA = 8;
/** "Ausência" ou "Ausência 14h-18h". */
export const rotuloAusenciaDia = (a: Ausencia) =>
  rotuloAusencia(a.tipo) + (a.hora_ini && a.hora_fim ? ` ${a.hora_ini.slice(0, 5)}-${a.hora_fim.slice(0, 5)}`.replace(/:00/g, 'h') : '');

// ---------------------------------------------------------------- backlog: Cliente → Demanda → Subdemanda
export interface NoDemanda { id: string; nome: string; projeto_id: string; projeto: string; item: ItemBacklog | null; subs: ItemBacklog[]; agendas: number }
export interface NoProjeto { id: string; nome: string; demandas: NoDemanda[] }
export interface NoCliente { id: string; nome: string; demandas: NoDemanda[]; total: number; pedidos: number }
const RANK_PRIORIDADE = ['urgente', 'alta', 'normal', 'baixa'];
export function arvoreBacklog(itens: ItemBacklog[], origem: OrigemBacklog | '' = '', texto = '', statusFora: ReadonlySet<string> = new Set()): NoCliente[] {
  const t = texto.trim().toLowerCase();
  const vis = itens.filter(i => !statusFora.has(i.status) && (!origem || i.origem === origem)
    && (!t || [i.nome, i.pai ?? '', i.cliente, i.projeto].some(x => x.toLowerCase().includes(t))));
  const clientes = new Map<string, NoCliente>();
  for (const i of vis) {
    const c = clientes.get(i.cliente_id) ?? { id: i.cliente_id, nome: i.cliente, demandas: [], total: 0, pedidos: 0 };
    clientes.set(i.cliente_id, c);
    c.total++;
    c.pedidos += i.pedidos.length;
    const raiz = i.pai_id ?? i.id;
    let n = c.demandas.find(d => d.id === raiz);
    if (!n) { n = { id: raiz, nome: i.pai ?? i.nome, projeto_id: i.projeto_id, projeto: i.projeto, item: null, subs: [], agendas: 0 }; c.demandas.push(n); }
    if (i.pai_id) n.subs.push(i); else n.item = i;
    // agendas em aberto da demanda-mãe: as do próprio item ou, se ela não está no backlog, as que a subdemanda trouxe
    n.agendas = Math.max(n.agendas, (i.pai_id ? i.agendas_pai : i.agendas) ?? 0);
  }
  const lista = [...clientes.values()];
  // chamados (Backlog Base): prioridade × antiguidade, inclusive entre clientes
  if (origem === 'backlog_base') {
    const ordem = (n: NoDemanda) => n.item ?? n.subs[0];
    const compara = (a: NoDemanda, b: NoDemanda) => {
      const x = ordem(a), y = ordem(b);
      return RANK_PRIORIDADE.indexOf(x.prioridade) - RANK_PRIORIDADE.indexOf(y.prioridade) || (x.criado_em ?? '').localeCompare(y.criado_em ?? '');
    };
    for (const c of lista) c.demandas.sort(compara);
    return lista.sort((a, b) => compara(a.demandas[0], b.demandas[0]));
  }
  return lista.sort((a, b) => b.pedidos - a.pedidos || a.nome.localeCompare(b.nome));
}

/** "Já tem agenda": quantas em aberto e a próxima data, para destacar no backlog o que ainda precisa de alocação. */
export function rotuloAgendas(n: number, prox?: string | null): string {
  if (!n) return '';
  return `${n === 1 ? '1 agenda' : `${n} agendas`} em aberto${prox ? ` · próx. ${prox.slice(8, 10)}/${prox.slice(5, 7)}` : ''}`;
}

/** Nível de projeto da árvore: agrupa as demandas do cliente, mantendo a ordem em que vieram. */
export function porProjeto(demandas: NoDemanda[]): NoProjeto[] {
  const m = new Map<string, NoProjeto>();
  for (const d of demandas) {
    const p = m.get(d.projeto_id) ?? { id: d.projeto_id, nome: d.projeto, demandas: [] };
    m.set(d.projeto_id, p);
    p.demandas.push(d);
  }
  return [...m.values()];
}

/** Status presentes no backlog, na ordem do fluxo, com a quantidade (opções do filtro). */
export function statusBacklog(itens: ItemBacklog[]): { valor: string; rotulo: string; total: number }[] {
  const conta = new Map<string, number>();
  for (const i of itens) conta.set(i.status, (conta.get(i.status) ?? 0) + 1);
  return STATUS_DEMANDA.filter(s => conta.has(s.valor)).map(s => ({ ...s, total: conta.get(s.valor)! }));
}

// ---------------------------------------------------------------- turno e carga do dia (cores da agenda do 2.x)
export type Turno = 'manha' | 'tarde' | 'dia' | 'noite' | '';
export const TURNOS: { valor: Exclude<Turno, ''>; rotulo: string }[] = [
  { valor: 'manha', rotulo: 'Manhã' }, { valor: 'tarde', rotulo: 'Tarde' }, { valor: 'dia', rotulo: 'Dia inteiro' }, { valor: 'noite', rotulo: 'Noite' },
];
const horaNum = (h: string) => Number(h.slice(0, 2)) + Number(h.slice(3, 5)) / 60;
const JANELAS: Record<string, [number, number]> = { manha: [8, 12], tarde: [14, 18], dia: [8, 18], noite: [18, 22] };
/** Janela da agenda em horas decimais; horário livre vem de início/fim. */
export function faixaTarefa(t: Pick<TarefaGrade, 'periodo' | 'hora_ini' | 'hora_fim'>): [number, number] | null {
  if (t.hora_ini && t.hora_fim) return [horaNum(t.hora_ini), horaNum(t.hora_fim)];
  return JANELAS[t.periodo] ?? null;
}
/** Mesma regra do 2.x (agendaTurno_): começa às 18h ou depois = noite; pega manhã e tarde = dia inteiro. */
export function turnoDe(t: Pick<TarefaGrade, 'periodo' | 'hora_ini' | 'hora_fim'>): Turno {
  if (t.periodo !== 'livre') return t.periodo as Turno;
  const f = faixaTarefa(t);
  if (!f) return '';
  if (f[0] >= 18) return 'noite';
  const manha = f[0] < 12, tarde = f[1] > 12;
  return manha && tarde ? 'dia' : manha ? 'manha' : tarde ? 'tarde' : '';
}
/** Agendas do dia na ordem das horas: pelo início, depois pelo fim; sem horário vai para o fim. */
export function ordenarDia<T extends Pick<TarefaGrade, 'periodo' | 'hora_ini' | 'hora_fim'>>(lista: T[]): T[] {
  const chave = (t: T) => faixaTarefa(t) ?? [99, 99];
  return [...lista].sort((a, b) => chave(a)[0] - chave(b)[0] || chave(a)[1] - chave(b)[1]);
}
// ---------------------------------------------------------------- escala de tempo da grade aberta (como o Google Agenda)
export const ESCALA_PADRAO: [number, number] = [7, 19];
/** Pixels por hora na grade aberta: o card de 4 h fica do tamanho do card antigo (cliente, título e horário). */
export const PX_HORA = 14;
/** Faixa de horas da grade aberta: 07h–19h, alargada (em horas cheias) só quando alguma agenda cai fora dela. */
export function faixaEscala(faixas: ([number, number] | null)[]): [number, number] {
  let [ini, fim] = ESCALA_PADRAO;
  for (const f of faixas) if (f) { ini = Math.min(ini, Math.floor(f[0])); fim = Math.max(fim, Math.ceil(f[1])); }
  return [Math.max(0, ini), Math.min(24, fim)];
}
export interface Bloco<T> { item: T; ini: number; fim: number; coluna: number; colunas: number; semHora: boolean }
/** Posição das agendas do dia na escala. Sobrepostas dividem a largura em colunas, como no Google Agenda; sem horário vai no
 *  topo com 1 h; o card tem no mínimo 15 min para continuar clicável. */
export function blocosDia<T extends Pick<TarefaGrade, 'periodo' | 'hora_ini' | 'hora_fim'>>(lista: T[], escala: [number, number]): Bloco<T>[] {
  const bl: Bloco<T>[] = lista.map(item => {
    const f = faixaTarefa(item);
    if (!f) return { item, ini: escala[0], fim: escala[0] + 1, coluna: 0, colunas: 1, semHora: true };
    const ini = Math.min(Math.max(escala[0], f[0]), escala[1] - 0.25);
    return { item, ini, fim: Math.max(ini + 0.25, Math.min(escala[1], f[1])), coluna: 0, colunas: 1, semHora: false };
  }).sort((a, b) => a.ini - b.ini || b.fim - a.fim);
  let grupo: Bloco<T>[] = [], fimGrupo = -1;
  const fechar = () => { const n = Math.max(...grupo.map(b => b.coluna)) + 1; grupo.forEach(b => { b.colunas = n; }); grupo = []; fimGrupo = -1; };
  for (const b of bl) {
    if (grupo.length && b.ini >= fimGrupo) fechar();
    const ocupadas = new Set(grupo.filter(g => g.fim > b.ini).map(g => g.coluna));
    let c = 0;
    while (ocupadas.has(c)) c++;
    b.coluna = c;
    grupo.push(b);
    fimGrupo = Math.max(fimGrupo, b.fim);
  }
  if (grupo.length) fechar();
  return bl;
}
/** Marcas da régua: horas pares dentro da escala ("8h", "10h"…). */
export const marcasEscala = (e: [number, number]) =>
  Array.from({ length: e[1] - e[0] + 1 }, (_, i) => e[0] + i).filter(h => h % 2 === 0 && h > e[0] && h < e[1]);

/** Faixa de cor da carga do dia (mesmos degraus do 2.x). */
export const nivelCarga = (h: number) => (h === 0 ? 'livre' : h <= 7 ? 'parcial' : h === 8 ? 'cheio' : h <= 12 ? 'acima' : 'excesso');
export const horasTexto = (h: number) => `${String(Math.round(h * 100) / 100).replace('.', ',')} h`;
export const rotuloAgenda = (m: string | null) => ({ presencial: 'Presencial', interno: 'Interno', remoto: 'Remoto' })[m ?? ''] ?? '';

// ---------------------------------------------------------------- mover (arrastar uma ou várias)
/** Soltar leva a tarefa arrastada para o destino: as demais andam os mesmos dias e, se eram do mesmo consultor, trocam junto. */
export function itensMover(selecionadas: TarefaGrade[], arrastada: TarefaGrade, data: string, consultor: string): ItemMover[] {
  const dias = diaNum(data) - diaNum(arrastada.data);
  return selecionadas.filter(t => dias !== 0 || (t.consultor_id === arrastada.consultor_id && consultor !== t.consultor_id)).map(t => ({
    id: t.id, versao: t.versao, data: somarDias(t.data, dias),
    responsavel_id: t.consultor_id === arrastada.consultor_id ? consultor : t.consultor_id,
  }));
}

// ---------------------------------------------------------------- Kanban
export type AgrupaKanban = 'consultor' | 'cliente' | 'demanda';
export const AGRUPAMENTOS: { valor: AgrupaKanban; rotulo: string }[] = [
  { valor: 'consultor', rotulo: 'Consultor' }, { valor: 'cliente', rotulo: 'Cliente' }, { valor: 'demanda', rotulo: 'Demanda/subdemanda' },
];
export interface ColunaKanban { id: string; titulo: string; sub: string; itens: AgendaAberta[]; horas: number }
/**
 * Colunas do Kanban: uma por consultor, cliente ou demanda/subdemanda (a subdemanda vira "Mãe › Sub"). Cartões em ordem de
 * data; colunas por nome (consultor sem nome cadastrado vai para o fim). Consultores extras entram vazios (alvo de arrasto).
 */
export function colunasKanban(lista: AgendaAberta[], por: AgrupaKanban, nomeConsultor: (id: string) => string | undefined, vazias: string[] = []): ColunaKanban[] {
  const m = new Map<string, ColunaKanban>();
  const col = (id: string, titulo: string, sub: string) => {
    let c = m.get(id);
    if (!c) { c = { id, titulo: titulo ?? '', sub: sub ?? '', itens: [], horas: 0 }; m.set(id, c); }
    return c;
  };
  if (por === 'consultor') for (const id of vazias) col(id, nomeConsultor(id) ?? '', '');
  for (const t of lista) {
    const c = por === 'consultor' ? col(t.consultor_id, nomeConsultor(t.consultor_id) ?? '', '')
      : por === 'cliente' ? col(t.cliente_id, t.cliente, '')
      : col(t.demanda_id, t.pai ? `${t.pai} › ${t.demanda}` : t.demanda, `${t.cliente} · ${t.projeto}`);
    c.itens.push(t);
    c.horas += Number(t.horas_previstas ?? 0);
  }
  const lista2 = [...m.values()];
  for (const c of lista2) c.itens.sort((a, b) => a.data.localeCompare(b.data) || (a.hora_ini ?? '').localeCompare(b.hora_ini ?? ''));
  return lista2.sort((a, b) => Number(!a.titulo) - Number(!b.titulo) || a.titulo.localeCompare(b.titulo, 'pt-BR') || a.sub.localeCompare(b.sub, 'pt-BR'));
}

// Filtro do Kanban (3.13.2): seleção múltipla por dimensão (vazio = todas). Demanda = a de 1º nível (a mãe, se a agenda é
// de subdemanda); subdemanda = a própria, quando tem mãe. Id guardado que não existe mais é ignorado.
export type DimKanban = 'consultores' | 'clientes' | 'projetos' | 'demandas' | 'subdemandas';
export type FiltroKanban = Record<DimKanban, string[]>;
export const FILTRO_KANBAN_VAZIO: FiltroKanban = { consultores: [], clientes: [], projetos: [], demandas: [], subdemandas: [] };
export const DIMENSOES: { dim: DimKanban; rotulo: string }[] = [
  { dim: 'consultores', rotulo: 'Consultores' }, { dim: 'clientes', rotulo: 'Clientes' }, { dim: 'projetos', rotulo: 'Projetos' },
  { dim: 'demandas', rotulo: 'Demandas' }, { dim: 'subdemandas', rotulo: 'Subdemandas' },
];
/** Ordem dos filtros conforme a visualização: a dimensão das colunas vem primeiro. */
export const ORDEM_FILTROS: Record<AgrupaKanban, DimKanban[]> = {
  consultor: ['consultores', 'clientes', 'projetos', 'demandas', 'subdemandas'],
  cliente: ['clientes', 'projetos', 'demandas', 'subdemandas', 'consultores'],
  demanda: ['demandas', 'subdemandas', 'clientes', 'projetos', 'consultores'],
};
const valorDim = (t: AgendaAberta, d: DimKanban): string | null => ({
  consultores: t.consultor_id, clientes: t.cliente_id, projetos: t.projeto_id, demandas: t.pai_id ?? t.demanda_id, subdemandas: t.pai_id ? t.demanda_id : null,
})[d];
const casa = (t: AgendaAberta, d: DimKanban, sel: ReadonlySet<string>) => !sel.size || sel.has(valorDim(t, d) ?? '');

/** Seleção válida por dimensão: só os ids que existem nas agendas (os demais não filtram). */
function selecaoValida(lista: AgendaAberta[], f: Partial<FiltroKanban>): Record<DimKanban, Set<string>> {
  const out = {} as Record<DimKanban, Set<string>>;
  for (const { dim } of DIMENSOES) {
    const existe = new Set(lista.map(t => valorDim(t, dim)).filter((x): x is string => !!x));
    out[dim] = new Set((f[dim] ?? []).filter(id => existe.has(id)));
  }
  return out;
}

export function filtrarKanban(lista: AgendaAberta[], f: Partial<FiltroKanban>): AgendaAberta[] {
  const sel = selecaoValida(lista, f);
  return lista.filter(t => DIMENSOES.every(({ dim }) => casa(t, dim, sel[dim])));
}

/**
 * Opções de cada filtro em cascata: a lista de uma dimensão considera as escolhas das outras (escolher o cliente limita
 * projetos, demandas, subdemandas e consultores ao que ele tem). Ordem alfabética.
 */
export function opcoesKanban(lista: AgendaAberta[], f: Partial<FiltroKanban>, nomeConsultor: (id: string) => string | undefined): Record<DimKanban, { valor: string; rotulo: string }[]> {
  const sel = selecaoValida(lista, f);
  const rotulo = (t: AgendaAberta, dim: DimKanban) => ({
    consultores: nomeConsultor(t.consultor_id) ?? '(sem nome)', clientes: t.cliente, projetos: `${t.cliente} · ${t.projeto}`,
    demandas: t.pai ?? t.demanda, subdemandas: `${t.pai} › ${t.demanda}`,
  })[dim];
  const out = {} as Record<DimKanban, { valor: string; rotulo: string }[]>;
  for (const { dim } of DIMENSOES) {
    const m = new Map<string, string>();
    for (const t of lista) {
      if (!DIMENSOES.every(o => o.dim === dim || casa(t, o.dim, sel[o.dim]))) continue;
      const v = valorDim(t, dim);
      if (!v || m.has(v)) continue;
      m.set(v, rotulo(t, dim));
    }
    // o que está marcado continua na lista, mesmo que a cascata o esconda (para poder desmarcar)
    for (const id of sel[dim]) if (!m.has(id)) { const t = lista.find(x => valorDim(x, dim) === id); if (t) m.set(id, rotulo(t, dim)); }
    out[dim] = [...m].map(([valor, rotulo]) => ({ valor, rotulo: rotulo ?? '' })).sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  }
  return out;
}

/** Preferência do Kanban (por usuário): agrupamento e o filtro de cada visualização. */
export interface PrefKanban { por: AgrupaKanban; filtros: Record<AgrupaKanban, FiltroKanban> }
export const PREF_KANBAN_PADRAO: PrefKanban = { por: 'consultor', filtros: { consultor: FILTRO_KANBAN_VAZIO, cliente: FILTRO_KANBAN_VAZIO, demanda: FILTRO_KANBAN_VAZIO } };
/** Lê a preferência guardada (banco ou aparelho) tolerando formato velho ou estragado. */
export function lerPrefKanban(v: unknown): PrefKanban {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<PrefKanban>;
  const por: AgrupaKanban = o.por === 'cliente' || o.por === 'demanda' ? o.por : 'consultor';
  const filtro = (x: unknown): FiltroKanban => {
    const y = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    return Object.fromEntries(DIMENSOES.map(({ dim }) => [dim, Array.isArray(y[dim]) ? (y[dim] as unknown[]).filter((i): i is string => typeof i === 'string') : []])) as FiltroKanban;
  };
  const fs = (o.filtros ?? {}) as Partial<Record<AgrupaKanban, unknown>>;
  return { por, filtros: { consultor: filtro(fs.consultor), cliente: filtro(fs.cliente), demanda: filtro(fs.demanda) } };
}

/** Filtro "GP responsável" do backlog: só o que é do GP; a mãe fica se alguma subdemanda for dele (a árvore a mostra como título). */
export const doGp = (itens: ItemBacklog[], gp: string) => (gp ? itens.filter(i => i.gp_id === gp) : itens);
