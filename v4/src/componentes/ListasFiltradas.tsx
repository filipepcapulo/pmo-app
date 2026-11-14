// Listas internas das fichas com a barra de filtros: demandas do projeto (aba Demandas) e tarefas da demanda/subdemanda
// (aba Tarefas). A regra fica em estado/filtrosLista.ts; o filtro é lembrado por tipo de tela, não por registro.
import { useMemo } from 'react';
import { PRIORIDADES, STATUS_TAREFA, STATUS_V4, type Tarefa } from '../api/execucao';
import { useEtapas } from '../estado/etapas';
import type { DemandaProjeto } from '../api/projeto';
import { useEquipe } from '../estado/equipe';
import {
  consultoresPorDemanda, filtrarDemandas, NIVEIS_FILTRO, NIVEL_TAREFA, SEM, filtrarTarefas, opcoesPessoas, PADRAO_DEMANDAS, PADRAO_TAREFAS, TIPOS_DEMANDA, useFiltroLista,
} from '../estado/filtrosLista';
import { ArvoreDemandas, ListaTarefas } from './ArvoreDemandas';
import { BarraFiltros } from './BarraFiltros';
import { SelecaoMultipla } from './SelecaoMultipla';

/** Aba Demandas do projeto: responsável por nível (demanda com as subdemandas, subdemanda, tarefa) ou em todos. */
export function DemandasDoProjeto({ demandas, tarefas, vazio }: { demandas: DemandaProjeto[]; tarefas: Tarefa[]; vazio?: string }) {
  const { porId } = useEquipe();
  const { f, mudar, limpar, ativos } = useFiltroLista('projeto:demandas', PADRAO_DEMANDAS);
  const et = useEtapas();
  const consultores = useMemo(() => consultoresPorDemanda(tarefas), [tarefas]);
  const comEtapa = useMemo(() => demandas.map(d => ({ ...d, etapa_app_id: et.idDe(d) })), [demandas, et]);
  const itens = useMemo(() => filtrarDemandas(comEtapa, f, consultores), [comEtapa, f, consultores]);
  const ops = useMemo(() => ({
    etapas: [...et.lista.filter(e => comEtapa.some(d => d.etapa_app_id === e.id)).map(e => ({ valor: e.id, rotulo: e.nome })),
      ...(comEtapa.some(d => !d.etapa_app_id) ? [{ valor: SEM, rotulo: '(sem etapa)' }] : [])],
    responsaveis: opcoesPessoas([...demandas.map(d => d.responsavel_id), ...tarefas.map(t => t.responsavel_id)], id => porId.get(id)?.nome),
    tipos: TIPOS_DEMANDA.filter(t => demandas.some(d => (d.tipo ?? 'entregavel') === t.valor)),
  }), [demandas, tarefas, porId, comEtapa, et]);
  if (!demandas.length) return <p className="ajuda">{vazio ?? 'Nenhuma demanda.'}</p>;
  return (
    <>
      <BarraFiltros nome="demandas" n={itens.length} total={demandas.length} ativos={ativos} aoLimpar={limpar}>
        <input type="search" aria-label="Buscar demanda" placeholder="Buscar demanda" value={f.texto} onChange={e => mudar({ texto: e.target.value })} />
        <SelecaoMultipla rotulo="Status" opcoes={STATUS_V4} sel={f.status} aoMudar={v => mudar({ status: v })} />
        <SelecaoMultipla rotulo="Etapa" opcoes={ops.etapas} sel={f.etapas} aoMudar={v => mudar({ etapas: v })} />
        <SelecaoMultipla rotulo="Responsável" opcoes={ops.responsaveis} sel={f.responsaveis} aoMudar={v => mudar({ responsaveis: v })} />
        {ops.tipos.length > 1 && <SelecaoMultipla rotulo="Tipo" opcoes={ops.tipos} sel={f.tipos} aoMudar={v => mudar({ tipos: v })} />}
        <SelecaoMultipla rotulo="Prioridade" opcoes={PRIORIDADES} sel={f.prioridades} aoMudar={v => mudar({ prioridades: v })} />
        <label className="check"><input type="checkbox" checked={f.atrasadas} onChange={e => mudar({ atrasadas: e.target.checked })} /> Só atrasadas</label>
        <span className="filtro-nivel" role="group" aria-label="Nível em que os filtros são aplicados" title="Vale para todos os filtros acima (em Tarefas, só o responsável)">
          Aplicar filtros em
          <span className="filtro-nivel-ops">
            {[...NIVEIS_FILTRO, NIVEL_TAREFA].map(n => <button key={n.valor || 'todos'} type="button" aria-pressed={(f.nivel || '') === n.valor} onClick={() => mudar({ nivel: n.valor })}>{n.rotulo}</button>)}
          </span>
        </span>
      </BarraFiltros>
      <ArvoreDemandas demandas={itens} tarefas={tarefas} vazio="Nenhuma demanda com esses filtros." />
    </>
  );
}

/** Aba Tarefas da demanda/subdemanda: responsável, status, período e texto. */
export function TarefasDaDemanda({ tarefas, nomeDemanda }: { tarefas: Tarefa[]; nomeDemanda?: (id: string) => string | null }) {
  const { porId } = useEquipe();
  const { f, mudar, limpar, ativos } = useFiltroLista('demanda:tarefas', PADRAO_TAREFAS);
  const itens = useMemo(() => filtrarTarefas(tarefas, f), [tarefas, f]);
  const responsaveis = useMemo(() => opcoesPessoas(tarefas.map(t => t.responsavel_id), id => porId.get(id)?.nome), [tarefas, porId]);
  if (!tarefas.length) return <p className="ajuda">Nenhuma tarefa.</p>;
  return (
    <>
      <BarraFiltros nome="tarefas" n={itens.length} total={tarefas.length} ativos={ativos} aoLimpar={limpar}>
        <input type="search" aria-label="Buscar tarefa" placeholder="Buscar tarefa" value={f.texto} onChange={e => mudar({ texto: e.target.value })} />
        <SelecaoMultipla rotulo="Responsável" opcoes={responsaveis} sel={f.responsaveis} aoMudar={v => mudar({ responsaveis: v })} />
        <SelecaoMultipla rotulo="Status" opcoes={STATUS_TAREFA} sel={f.status} aoMudar={v => mudar({ status: v })} />
        <span className="periodo">
          <label>De <input type="date" aria-label="De" value={f.de} onChange={e => mudar({ de: e.target.value })} /></label>
          <label>até <input type="date" aria-label="Até" value={f.ate} onChange={e => mudar({ ate: e.target.value })} /></label>
        </span>
      </BarraFiltros>
      {itens.length ? <ListaTarefas tarefas={itens} nomeDemanda={nomeDemanda} /> : <p className="ajuda">Nenhuma tarefa com esses filtros.</p>}
    </>
  );
}
