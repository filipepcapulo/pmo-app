// Peças comuns de execução: árvore demanda → subdemanda (com a barra de horas e as mesmas ações em toda tela) e a
// lista de tarefas. Ações sempre pelo popup único (useEdicao). Com `tarefas`, cada linha abre as próprias tarefas
// (drilldown demanda → subdemanda → tarefa da Tela de Projeto); clicar na tarefa abre o formulário.
// 4.16.0: sem `tarefas` (tela Demandas e afins), a linha que tem tarefa mostra a pílula "N tarefas"; clicar busca as
// tarefas da demanda (e das subdemandas dela) e lista ali mesmo.
import { useEffect, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { arvoreDemandas, AVISO_TAREFA_OS, exec, PERMISSAO_EDITAR_COM_OS, semAlerta, tarefaTravadaOs, rotuloModalidade, rotuloPeriodo, rotuloStatusTarefa, type Tarefa, type TotaisDemanda } from '../api/execucao';
import { useEdicao } from '../estado/edicao';
import type { ItemLote } from '../estado/edicaoMultipla';
import { useEtapas } from '../estado/etapas';
import { useEquipe, usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { BarraHoras } from './BarraHoras';
import { AcoesEdicaoMultipla, CaixaLote, useSelecao } from './EdicaoMultipla';
import { Icone } from './Icone';
import { NomePessoa } from './NomePessoa';
import { Tabela, type Coluna } from './Tabela';
import { Resumo } from './Resumo';
import { PilulaEtapa, PilulaResp, PilulaStatus, SinalStatus } from './Pilulas';

type ComTotais = { id: string; nome: string; pai_id: string | null; status: string; projeto_id: string; totais?: Partial<TotaisDemanda> | null; extra?: string; avulso_base?: boolean;
  etapa?: string | null; etapa_id?: string | null; etapa_app_id?: string | null; responsavel_id?: string | null;
  chamado?: { id: string; numero: number; localizacao: string | null; precisa_alocacao?: boolean } | null };

/** Linha da árvore como item da edição múltipla (4.23.0). */
export const itemLoteDemanda = (d: ComTotais, etapaId: string | null): ItemLote =>
  ({ tipo: 'demanda', id: d.id, nome: d.nome, status: d.status, etapa_id: etapaId, responsavel_id: d.responsavel_id ?? null });
const itemLoteTarefa = (t: Tarefa, etapaId: string | null): ItemLote =>
  ({ tipo: 'tarefa', id: t.id, nome: t.nome, status: t.status, etapa_id: etapaId, responsavel_id: t.responsavel_id, demanda_id: t.demanda_id });

export function StatusPilula({ status, tipo = 'demanda' }: { status: string; tipo?: 'demanda' | 'tarefa' }) {
  if (tipo === 'demanda') return <PilulaStatus status={status} />;
  return <span className={`pilula st-${status}`}>{rotuloStatusTarefa(status)}</span>;
}

function LinhaDemanda({ d, sub, aberta, alternar, nFilhas, tarefas }: { d: ComTotais; sub?: boolean; aberta?: boolean; alternar?: () => void; nFilhas?: number; tarefas?: Tarefa[] }) {
  const ed = useEdicao();
  const pode = usePode();
  const [verTarefas, setVerTarefas] = useState(false);
  const et = useEtapas();
  const temSelecao = !!useSelecao();
  const t = d.totais;
  // pílula de tarefas: a lista vem da ficha da demanda só quando a pessoa abre (e de novo depois de cada gravação)
  const esc = useSessao().eu?.escritorio_id;
  const nTarefas = tarefas ? 0 : Number(t?.tarefas ?? 0);
  const [drill, setDrill] = useState<{ tarefas: Tarefa[]; nomes: Map<string, string> } | null>(null);
  const [erroDrill, setErroDrill] = useState<string | null>(null);
  const buscar = verTarefas && !tarefas && !!esc;
  useEffect(() => {
    if (!buscar) return;
    let vivo = true;
    exec.demanda(esc!, d.id).then(r => { if (vivo) { setErroDrill(null);
      setDrill({ tarefas: r.tarefas.filter(x => x.status !== 'cancelada'), nomes: new Map(r.subdemandas.map(x => [x.id, x.nome])) }); } })
      .catch(e => { if (vivo) setErroDrill((e as Error).message); });
    return () => { vivo = false; };
  }, [buscar, esc, d.id, ed.geracao]);
  const href = hashDe(caminhoEntidade('demanda', d.id));
  // a linha inteira abre a demanda (como as linhas clicáveis das tabelas); links e botões dentro dela seguem os seus
  const abrir = (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('a, button, input, select, textarea, [role=button]')) location.hash = href; };
  return (
    <div className={`linha-exec${sub ? ' sub' : ''}`} onClick={abrir}>
      <div className="linha-exec-topo">
        {nFilhas ? <button type="button" className="seta" aria-expanded={aberta} aria-label={aberta ? 'Recolher' : 'Expandir'} onClick={alternar}><Icone nome={aberta ? 'baixo' : 'seta'} tam={16} /></button>
          : <span className="seta" aria-hidden />}
        {/* edição múltipla: a caixa ocupa o lugar do sinal quando o mouse passa na linha (ou quando já há algo marcado) */}
        <SinalStatus status={d.status} />
        {temSelecao && pode('demanda.editar') && <CaixaLote item={itemLoteDemanda(d, et.idDe(d))} />}
        <Resumo tipo="demanda" id={d.id}><a href={href} className="linha-exec-nome">{d.nome}</a></Resumo>
        {d.extra && <small className="ajuda">{d.extra}</small>}
        {d.chamado && <a className="pil pil-chamado" href={hashDe(caminhoEntidade('chamado', d.chamado.id))} title="Abrir o chamado">Chamado #{d.chamado.numero}</a>}
        {d.chamado?.precisa_alocacao && <span className="pil pil-alocar" title="Chamado triado sem agenda: precisa de alocação">Precisa de alocação</span>}
        <span className="dem-pilulas">
          <PilulaEtapa reg={d} />
          <StatusPilula status={d.status} />
          <PilulaResp id={d.responsavel_id} />
          {t?.atrasada && !semAlerta(d) && <span className="pil pst-atrasada">Atrasada</span>}
          {nTarefas > 0 && <button type="button" className="pil pil-tarefas" aria-expanded={verTarefas} onClick={() => setVerTarefas(v => !v)}
            title={verTarefas ? 'Ocultar as tarefas' : 'Ver as tarefas aqui mesmo'}>{nTarefas} tarefa{nTarefas > 1 ? 's' : ''}</button>}
        </span>
        <small className="ajuda dem-datas">{t?.inicio || t?.fim ? `${data(t?.inicio)} → ${data(t?.fim)}` : ''}{t?.perc != null ? ` · ${t.perc}%` : ''}</small>
        <span className="linha-exec-bts">
          {!sub && pode('demanda.criar') && <button type="button" className="link" onClick={() => ed.demanda({ projeto_id: d.projeto_id, pai_id: d.id })}>+ Sub</button>}
          {pode('tarefa.criar') && <button type="button" className="link" onClick={() => ed.tarefa({ demanda_id: d.id })}>+ Tarefa</button>}
          {tarefas && tarefas.length > 0 && <button type="button" className="link" aria-expanded={verTarefas} onClick={() => setVerTarefas(v => !v)}>
            {verTarefas ? 'Ocultar' : 'Ver'} {tarefas.length} tarefa{tarefas.length > 1 ? 's' : ''}</button>}
          <button type="button" className="link" onClick={() => ed.demanda({ id: d.id })}>Editar</button>
        </span>
      </div>
      <BarraHoras previsto={t?.horas_previstas} real={t?.horas_reais ?? 0} planejado={t?.horas_planejadas ?? 0} compacta={!!sub} semAlerta={semAlerta(d)} />
      {verTarefas && tarefas && <TarefasDrill tarefas={tarefas} />}
      {buscar && (erroDrill ? <p className="msg-erro">{erroDrill}</p>
        : !drill ? <p className="ajuda tarefas-drill-carga"><span className="giro" /> Carregando as tarefas…</p>
        : drill.tarefas.length ? <TarefasDrill tarefas={drill.tarefas} nomeDemanda={id => (id === d.id ? null : drill.nomes.get(id) ?? null)} />
        : <p className="ajuda">Nenhuma tarefa.</p>)}
    </div>
  );
}

function TarefasDrill({ tarefas, nomeDemanda }: { tarefas: Tarefa[]; nomeDemanda?: (id: string) => string | null }) {
  const ed = useEdicao();
  const pode = usePode();
  const et = useEtapas();
  const sel = useSelecao();
  const marcavel = !!sel && pode('tarefa.editar');
  const aMostra = marcavel && (sel!.ativa || sel!.total > 0);
  const liberado = pode(PERMISSAO_EDITAR_COM_OS);
  const livres = marcavel ? tarefas.filter(t => !tarefaTravadaOs(t, liberado)).map(t => itemLoteTarefa(t, et.idDe(t))) : [];
  const todas = livres.length > 0 && livres.every(i => sel!.tem(i));
  return (
    <ul className={`tarefas-drill${marcavel ? ' com-lote' : ''}`} aria-label="Tarefas">
      {aMostra && livres.length > 1 && (
        <li className="td-todas"><label className="check"><input type="checkbox" className="lote-caixa" checked={todas}
          onChange={e => sel!.marcar(livres, e.target.checked)} /> Todas as {livres.length} tarefas</label></li>
      )}
      {tarefas.map(t => (
        <li key={t.id} role="button" tabIndex={0} onClick={() => ed.tarefa({ id: t.id })}
          onKeyDown={e => { if (e.key === 'Enter') ed.tarefa({ id: t.id }); }}>
          {marcavel && <CaixaLote item={itemLoteTarefa(t, et.idDe(t))} travada={tarefaTravadaOs(t, liberado) ? `Tarefa com OS: ${AVISO_TAREFA_OS}` : null} />}
          <span className="ajuda">{data(t.data)} · {rotuloPeriodo(t.periodo, t.hora_ini, t.hora_fim)}</span>
          <span className="td-nome">{t.nome}{nomeDemanda?.(t.demanda_id) && <small className="ajuda"> · {nomeDemanda(t.demanda_id)}</small>}</span>
          <NomePessoa id={t.responsavel_id} />
          <StatusPilula status={t.status} tipo="tarefa" />
          <span>{t.horas_reais != null ? <strong>{horas(t.horas_reais)}</strong> : <span className="ajuda">{horas(t.horas_previstas)}</span>}</span>
        </li>
      ))}
    </ul>
  );
}

/** Demandas com subdemandas recolhíveis logo abaixo. 4.18.0: com `fechadas`/`aoFechar` quem recolhe é a tela (um botão só
 *  para todas as árvores, como em Demandas) e o "Recolher tudo" de cada árvore não aparece. */
export function ArvoreDemandas({ demandas, vazio = 'Nenhuma demanda.', tarefas, fechadas: fechadasDaTela, aoFechar }: { demandas: ComTotais[]; vazio?: string; tarefas?: Tarefa[];
  fechadas?: Set<string>; aoFechar?: (f: (s: Set<string>) => Set<string>) => void }) {
  const [fechadasAqui, setFechadasAqui] = useState<Set<string>>(new Set());
  const daTela = !!(fechadasDaTela && aoFechar);
  const fechadas = daTela ? fechadasDaTela! : fechadasAqui;
  const setFechadas = (v: Set<string> | ((s: Set<string>) => Set<string>)) => (daTela ? aoFechar!(typeof v === 'function' ? v : () => v) : setFechadasAqui(v));
  const tarefasDe = (id: string) => (tarefas ? tarefas.filter(t => t.demanda_id === id) : undefined);
  const et = useEtapas();
  const temSelecao = !!useSelecao();
  const arv = arvoreDemandas(demandas);
  if (!arv.length) return <p className="ajuda">{vazio}</p>;
  const comFilhas = arv.filter(x => x.filhas.length).map(x => x.item.id);
  const tudoFechado = comFilhas.length > 0 && comFilhas.every(id => fechadas.has(id));
  return (
    <>
    {!daTela && (comFilhas.length > 0 || temSelecao) && (
      <div className="arvore-acoes">
        {comFilhas.length > 0 && <button type="button" className="link" onClick={() => setFechadas(tudoFechado ? new Set() : new Set(comFilhas))}>
          <Icone nome={tudoFechado ? 'seta' : 'baixo'} tam={14} /> {tudoFechado ? 'Expandir tudo' : 'Recolher tudo'}
        </button>}
        {/* marca as demandas e subdemandas da árvore (as recolhidas também); tarefa é marcada na própria lista de tarefas */}
        <AcoesEdicaoMultipla todos={demandas.map(d => itemLoteDemanda(d, et.idDe(d)))} />
      </div>
    )}
    <ul className="arvore">
      {arv.map(({ item, filhas }) => {
        const aberta = !fechadas.has(item.id);
        return (
          <li key={item.id}>
            <LinhaDemanda d={item} sub={!!item.pai_id} nFilhas={filhas.length} aberta={aberta} tarefas={tarefasDe(item.id)}
              alternar={() => setFechadas(s => { const n = new Set(s); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })} />
            {aberta && filhas.length > 0 && (
              <ul>{filhas.map(f => <li key={f.id}><LinhaDemanda d={f} sub tarefas={tarefasDe(f.id)} /></li>)}</ul>
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
    { chave: 'responsavel_id', titulo: 'Responsável', ordem: t => porId.get(t.responsavel_id ?? '')?.nome ?? '', render: t => <NomePessoa id={t.responsavel_id} /> },
    { chave: 'periodo', titulo: 'Período', ordem: t => t.hora_ini ?? t.periodo, texto: t => rotuloPeriodo(t.periodo, t.hora_ini, t.hora_fim), render: t => rotuloPeriodo(t.periodo, t.hora_ini, t.hora_fim) },
    { chave: 'modalidade', titulo: 'Agenda', ordem: t => rotuloModalidade(t.modalidade), render: t => rotuloModalidade(t.modalidade) },
    { chave: 'status', titulo: 'Status', ordem: t => rotuloStatusTarefa(t.status), render: t => <StatusPilula status={t.status} tipo="tarefa" /> },
    { chave: 'horas', titulo: 'Horas', alinhar: 'dir', valor: t => t.horas_reais ?? t.horas_previstas,
      render: t => <span title={t.horas_reais != null ? 'Horas reais (OS/app)' : 'Previstas (sem apontamento)'}>
        {t.horas_reais != null ? <strong>{horas(t.horas_reais)}</strong> : <span className="ajuda">{horas(t.horas_previstas)}</span>}</span> },
    { chave: 'acoes', titulo: 'Ações', fixa: true, render: t => <button type="button" className="link" onClick={() => ed.tarefa({ id: t.id }, aoMudar)}>Editar</button> },
  ];
  return <Tabela id="tarefas" nome="Tarefas" colunas={cols} linhas={tarefas as L[]} chave={t => t.id} tamanhoInicial={30} />;
}
