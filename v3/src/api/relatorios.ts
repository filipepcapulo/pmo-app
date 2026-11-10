// Relatórios HTML do backlog e das demandas (V13a-5, módulo 09 da Central: "Backlog Base" com filtro por status e
// relatório HTML5). Montam o que a tela está mostrando — mesmos filtros, mesma ordem — e o util gera o arquivo.
import { ORIGENS, porProjeto, rotuloAgendas, type ItemBacklog, type NoCliente } from './equipe';
import { rotuloPrioridade, rotuloStatusDemanda, STATUS_DEMANDA, type DemandaLinha } from './execucao';
import { diaNum, hojeIso } from './projeto';
import type { Relatorio, SecaoRelatorio } from '../util/relatorioHtml';

const dataBr = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
/** Dias desde a criação (fila), pela data local; sem data, vazio. */
export const diasNaFila = (criado?: string | null, hoje = hojeIso()) => (criado ? Math.max(0, diaNum(hoje) - diaNum(criado.slice(0, 10))) : null);
const horas = (h?: number | null) => (h ? Number(h.toFixed(1)) : null);

export const COLUNAS_BACKLOG = ['Projeto', 'Demanda', 'Subdemanda', 'Status', 'Prioridade', 'Origem', 'Horas', 'Dias na fila', 'Agendas', 'Pedidos de agenda'];

function linhaBacklog(i: ItemBacklog, projeto: string, demanda: string, hoje: string) {
  return [projeto, demanda, i.pai_id ? i.nome : '', rotuloStatusDemanda(i.status), rotuloPrioridade(i.prioridade),
    ORIGENS.find(o => o.valor === i.origem)?.rotulo ?? i.origem, horas(i.horas), diasNaFila(i.criado_em, hoje),
    rotuloAgendas(i.agendas ?? 0, i.agenda_prox), i.pedidos.map(p => `${p.horas} h — ${p.motivo}`).join('; ')];
}

/** Backlog da Agenda da equipe como está na tela (árvore já filtrada), um bloco por cliente. */
export function relatorioBacklog(arvore: NoCliente[], filtros: string[], hoje = hojeIso()): Relatorio {
  const secoes: SecaoRelatorio[] = arvore.map(c => ({
    titulo: c.nome,
    linhas: porProjeto(c.demandas).flatMap(p => p.demandas.flatMap(d => [
      ...(d.item ? [linhaBacklog(d.item, p.nome, d.nome, hoje)] : []),
      ...d.subs.map(s => linhaBacklog(s, p.nome, d.nome, hoje)),
    ])),
  }));
  return { titulo: 'Backlog', filtros, colunas: COLUNAS_BACKLOG, secoes };
}

export const COLUNAS_DEMANDAS = ['Demanda', 'Subdemanda', 'Status', 'Prioridade', 'Início', 'Fim', 'Horas previstas', 'Etapa'];

/** Demandas da tela Demandas (filtro de status/texto aplicado no banco), um bloco por cliente · projeto. */
export function relatorioDemandas(itens: DemandaLinha[], filtros: string[]): Relatorio {
  const nomes = new Map(itens.map(d => [d.id, d.nome]));
  const grupos = new Map<string, SecaoRelatorio>();
  for (const d of itens) {
    const g = grupos.get(d.projeto_id) ?? { titulo: `${d.cliente} · ${d.projeto}`, linhas: [] };
    grupos.set(d.projeto_id, g);
    const sub = !!d.pai_id;
    g.linhas.push([sub ? (nomes.get(d.pai_id!) ?? '') : d.nome, sub ? d.nome : '', rotuloStatusDemanda(d.status), rotuloPrioridade(d.prioridade),
      dataBr(d.inicio), dataBr(d.fim), horas(d.horas_previstas), d.etapa ?? '']);
  }
  return { titulo: 'Demandas', filtros, colunas: COLUNAS_DEMANDAS, secoes: [...grupos.values()] };
}

// ---------------------------------------------------------------- filtro de vários status (tela Demandas)
export const ABERTAS = ['backlog', 'planejada', 'em_andamento', 'pausada'];
export const TODOS: string[] = STATUS_DEMANDA.map(s => s.valor);
/** Status escolhidos guardados no aparelho, na ordem do fluxo; o que não for status conhecido é ignorado; vazio = abertas. */
export function lerStatus(txt: string | null): string[] {
  try {
    const l = JSON.parse(txt || '[]');
    const ok = Array.isArray(l) ? TODOS.filter(x => l.includes(x)) : [];
    return ok.length ? ok : ABERTAS;
  } catch { return ABERTAS; }
}
export const rotuloStatus = (l: string[]) => (l.length === TODOS.length ? 'todos'
  : l.length === ABERTAS.length && ABERTAS.every(x => l.includes(x)) ? 'abertas'
  : STATUS_DEMANDA.filter(s => l.includes(s.valor)).map(s => s.rotulo).join(', '));
