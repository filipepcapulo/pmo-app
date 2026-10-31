// Peças comuns de execução: árvore demanda → subdemanda (com a barra de horas e as mesmas ações em toda tela) e a
// lista de tarefas. Ações sempre pelo popup único (useEdicao).
import { useState } from 'react';
import { data, horas } from '../api/cadastros';
import { arvoreDemandas, rotuloModalidade, rotuloPeriodo, rotuloStatusDemanda, rotuloStatusTarefa, type Tarefa, type TotaisDemanda } from '../api/execucao';
import { useEdicao } from '../estado/edicao';
import { useEquipe, usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { BarraHoras } from './BarraHoras';
import { Icone } from './Icone';
import { NomePessoa } from './NomePessoa';
import { Tabela, type Coluna } from './Tabela';

type ComTotais = { id: string; nome: string; pai_id: string | null; status: string; projeto_id: string; totais?: Partial<TotaisDemanda> | null; extra?: string };

export function StatusPilula({ status, tipo = 'demanda' }: { status: string; tipo?: 'demanda' | 'tarefa' }) {
  return <span className={`pilula st-${status}`}>{tipo === 'demanda' ? rotuloStatusDemanda(status) : rotuloStatusTarefa(status)}</span>;
}

function LinhaDemanda({ d, sub, aberta, alternar, nFilhas }: { d: ComTotais; sub?: boolean; aberta?: boolean; alternar?: () => void; nFilhas?: number }) {
  const ed = useEdicao();
  const pode = usePode();
  const t = d.totais;
  const href = hashDe(caminhoEntidade('demanda', d.id));
  // a linha inteira abre a demanda (como as linhas clicáveis das tabelas); links e botões dentro dela seguem os seus
  const abrir = (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('a, button, input, select, textarea')) location.hash = href; };
  return (
    <div className={`linha-exec${sub ? ' sub' : ''}`} onClick={abrir}>
      <div className="linha-exec-topo">
        {nFilhas ? <button type="button" className="seta" aria-expanded={aberta} aria-label={aberta ? 'Recolher' : 'Expandir'} onClick={alternar}><Icone nome={aberta ? 'baixo' : 'seta'} tam={16} /></button>
          : <span className="seta" aria-hidden />}
        <a href={href} className="linha-exec-nome">{d.nome}</a>
        {d.extra && <small className="ajuda">{d.extra}</small>}
        <StatusPilula status={d.status} />
        {t?.atrasada && <span className="pilula st-atrasada">Atrasada</span>}
        <small className="ajuda">{t?.inicio || t?.fim ? `${data(t?.inicio)} → ${data(t?.fim)}` : ''}{t?.perc != null ? ` · ${t.perc}%` : ''}</small>
        <span className="linha-exec-bts">
          {!sub && pode('demanda.criar') && <button type="button" className="link" onClick={() => ed.demanda({ projeto_id: d.projeto_id, pai_id: d.id })}>+ Sub</button>}
          {pode('tarefa.criar') && <button type="button" className="link" onClick={() => ed.tarefa({ demanda_id: d.id })}>+ Tarefa</button>}
          <button type="button" className="link" onClick={() => ed.demanda({ id: d.id })}>Editar</button>
        </span>
      </div>
      <BarraHoras previsto={t?.horas_previstas} real={t?.horas_reais ?? 0} planejado={t?.horas_planejadas ?? 0} compacta={!!sub} />
    </div>
  );
}

/** Demandas com subdemandas recolhíveis logo abaixo. */
export function ArvoreDemandas({ demandas, vazio = 'Nenhuma demanda.' }: { demandas: ComTotais[]; vazio?: string }) {
  const [fechadas, setFechadas] = useState<Set<string>>(new Set());
  const arv = arvoreDemandas(demandas);
  if (!arv.length) return <p className="ajuda">{vazio}</p>;
  const comFilhas = arv.filter(x => x.filhas.length).map(x => x.item.id);
  const tudoFechado = comFilhas.length > 0 && comFilhas.every(id => fechadas.has(id));
  return (
    <>
    {comFilhas.length > 0 && (
      <div className="arvore-acoes">
        <button type="button" className="link" onClick={() => setFechadas(tudoFechado ? new Set() : new Set(comFilhas))}>
          <Icone nome={tudoFechado ? 'seta' : 'baixo'} tam={14} /> {tudoFechado ? 'Expandir tudo' : 'Recolher tudo'}
        </button>
      </div>
    )}
    <ul className="arvore">
      {arv.map(({ item, filhas }) => {
        const aberta = !fechadas.has(item.id);
        return (
          <li key={item.id}>
            <LinhaDemanda d={item} sub={!!item.pai_id} nFilhas={filhas.length} aberta={aberta}
              alternar={() => setFechadas(s => { const n = new Set(s); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })} />
            {aberta && filhas.length > 0 && (
              <ul>{filhas.map(f => <li key={f.id}><LinhaDemanda d={f} sub /></li>)}</ul>
            )}
          </li>
        );
      })}
    </ul>
    </>
  );
}

/** Tarefas (agenda) com responsável, data, período e horas; clicar abre o mesmo formulário. */
export function ListaTarefas({ tarefas, nomeDemanda, aoMudar }: { tarefas: Tarefa[]; nomeDemanda?: (id: string) => string | null; aoMudar?: () => void }) {
  const ed = useEdicao();
  const { porId } = useEquipe();
  if (!tarefas.length) return <p className="ajuda">Nenhuma tarefa.</p>;
  type L = Tarefa & Record<string, unknown>;
  const cols: Coluna<L>[] = [
    { chave: 'data', titulo: 'Data', render: t => data(t.data) },
    { chave: 'nome', titulo: 'Tarefa', render: t => <><a href={hashDe(caminhoEntidade('tarefa', t.id))}>{t.nome}</a>
      {nomeDemanda?.(t.demanda_id) && <small className="ajuda"> · {nomeDemanda(t.demanda_id)}</small>}</> },
    { chave: 'responsavel_id', titulo: 'Responsável', ordem: t => porId.get(t.responsavel_id ?? '')?.nome, render: t => <NomePessoa id={t.responsavel_id} /> },
    { chave: 'periodo', titulo: 'Período', ordem: t => t.hora_ini ?? t.periodo, render: t => rotuloPeriodo(t.periodo, t.hora_ini, t.hora_fim) },
    { chave: 'modalidade', titulo: 'Agenda', ordem: t => rotuloModalidade(t.modalidade), render: t => rotuloModalidade(t.modalidade) },
    { chave: 'status', titulo: 'Status', ordem: t => rotuloStatusTarefa(t.status), render: t => <StatusPilula status={t.status} tipo="tarefa" /> },
    { chave: 'horas', titulo: 'Horas', alinhar: 'dir', ordem: t => t.horas_reais ?? t.horas_previstas,
      render: t => <span title={t.horas_reais != null ? 'Horas reais (OS/app)' : 'Previstas (sem apontamento)'}>
        {t.horas_reais != null ? <strong>{horas(t.horas_reais)}</strong> : <span className="ajuda">{horas(t.horas_previstas)}</span>}</span> },
    { chave: 'acoes', titulo: 'Ações', fixa: true, render: t => <button type="button" className="link" onClick={() => ed.tarefa({ id: t.id }, aoMudar)}>Editar</button> },
  ];
  return <Tabela id="tarefas" colunas={cols} linhas={tarefas as L[]} chave={t => t.id} tamanhoInicial={30} />;
}
