// Log de desvios: os do consultor (Meus desvios) ou o dos GPs, com aprovar/recusar para o GP do projeto atendido
// (no desvio sem atendimento — 0118 —, o GP do projeto previsto; aprovar só marca a prevista como não executada).
import { useMemo, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { desvios, ROTULO_SITUACAO, rotuloAtendido, type Desvio, type OpcaoDemanda } from '../api/desvios';
import { rotuloPeriodo } from '../api/execucao';
import { traduzirErro } from '../api/mensagens';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { Popup } from './Popup';
import { Tabela, type Coluna } from './Tabela';
import { useToast } from './Toasts';
import { passaEm } from '../util/selecao';

function Decidir({ d, decisao, aoFechar, aoGravar }: { d: Desvio; decisao: 'aprovar' | 'recusar'; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [demanda, setDemanda] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const sem = !d.projeto_atendido_id;
  const pedeDemanda = decisao === 'aprovar' && !sem && !d.demanda_atendida_id;
  const dem = useCarga<OpcaoDemanda[]>(() => (pedeDemanda && d.projeto_atendido_id ? desvios.demandas(esc, d.projeto_atendido_id) : Promise.resolve([])), [esc, d, pedeDemanda]);
  async function gravar() {
    if (pedeDemanda && !demanda) { setErro('Escolha a demanda atendida.'); return; }
    if (decisao === 'recusar' && !motivo.trim()) { setErro('Informe o motivo da recusa.'); return; }
    setGravando(true); setErro(null);
    try {
      if (decisao === 'aprovar') await desvios.aprovar(esc, d, demanda || undefined); else await desvios.recusar(esc, d, motivo.trim());
      avisar(decisao !== 'aprovar' ? 'Desvio recusado' : sem ? 'Desvio aprovado: tarefa não executada' : 'Desvio aprovado: agenda trocada', 'ok');
      aoGravar();
    } catch (e) { setErro(traduzirErro(e).mensagem); setGravando(false); }
  }
  return (
    <Popup aberto titulo={decisao === 'aprovar' ? 'Aprovar desvio' : 'Recusar desvio'} aoFechar={aoFechar} rodape={<>
      <Botao onClick={aoFechar}>Cancelar</Botao>
      <Botao variante="primario" carregando={gravando} onClick={gravar}>{decisao === 'aprovar' ? 'Aprovar' : 'Recusar'}</Botao>
    </>}>
      <Formulario aoEnviar={gravar}>
        <p className="ajuda"><strong>{d.consultor}</strong> · {data(d.data)} · {rotuloPeriodo(d.periodo, d.hora_ini, d.hora_fim)}</p>
        <p className="ajuda">Previsto: {d.cliente_previsto} · {d.projeto_previsto}. Atendido: {rotuloAtendido(d)}.</p>
        <p className="ajuda">{d.motivo}</p>
        {decisao === 'aprovar' && <p className="ajuda">{sem
          ? 'Marca a tarefa prevista como não executada; a demanda volta ao backlog. Nenhuma tarefa é criada.'
          : 'Cria a tarefa no projeto atendido e marca a prevista como não executada; a demanda volta ao backlog.'}</p>}
        {pedeDemanda && <Campo rotulo="Demanda atendida" tipo="select" obrigatorio valor={demanda} aoMudar={setDemanda}
          opcoes={[{ valor: '', rotulo: 'Escolha…' }, ...(dem.dados ?? []).map(x => ({ valor: x.id, rotulo: x.pai ? `${x.pai} › ${x.nome}` : x.nome }))]} />}
        {decisao === 'recusar' && <Campo rotulo="Motivo da recusa" tipo="textarea" obrigatorio valor={motivo} aoMudar={setMotivo} maxLength={2000} />}
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}

/** Situações do desvio, para o filtro da tela. */
export const SITUACOES_DESVIO = [{ valor: 'pendente', rotulo: 'Pendentes' }, { valor: 'aprovado', rotulo: 'Aprovados' }, { valor: 'recusado', rotulo: 'Recusados' }];

/** situacao: lista (seleção múltipla com Exibir/Ocultar; filtra aqui) ou o valor único antigo (filtra no banco). */
export function ListaDesvios({ meus, de, ate, situacao = '' }: { meus?: boolean; de: string; ate: string; situacao?: string | readonly string[] }) {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const noBanco = typeof situacao === 'string' ? situacao : '';
  const c = useCarga(() => desvios.lista(esc, { de, ate, situacao: noBanco, meus }), [esc, de, ate, noBanco, meus, ed.geracao]);
  const linhas = useMemo(() => (c.dados ?? []).filter(d => passaEm(situacao, d.situacao)), [c.dados, situacao]);
  const [acao, setAcao] = useState<{ d: Desvio; decisao: 'aprovar' | 'recusar' } | null>(null);
  const colunas = useMemo<Coluna<Desvio>[]>(() => [
    { chave: 'data', titulo: 'Data', texto: d => data(d.data) },
    { chave: 'periodo', titulo: 'Período', texto: d => rotuloPeriodo(d.periodo, d.hora_ini, d.hora_fim) },
    ...(meus ? [] : [{ chave: 'consultor', titulo: 'Consultor' }]),
    { chave: 'horas', titulo: 'Horas', alinhar: 'dir', texto: d => (d.horas == null ? '' : horas(d.horas)), valor: d => d.horas },
    { chave: 'previsto', titulo: 'Previsto', valor: d => d.projeto_previsto, texto: d => `${d.cliente_previsto} · ${d.projeto_previsto}`,
      render: d => <a href={hashDe(caminhoEntidade('tarefa', d.tarefa_prevista_id))}>{d.cliente_previsto} · {d.projeto_previsto}</a> },
    { chave: 'atendido', titulo: 'Atendido', valor: d => d.projeto_atendido ?? rotuloAtendido(d), texto: d => `${rotuloAtendido(d)}${d.demanda_atendida ? ' · ' + d.demanda_atendida : ''}`,
      render: d => (d.tarefa_criada_id ? <a href={hashDe(caminhoEntidade('tarefa', d.tarefa_criada_id))}>{rotuloAtendido(d)}</a> : <>{rotuloAtendido(d)}</>) },
    { chave: 'orientado_por', titulo: 'Quem orientou' },
    { chave: 'motivo', titulo: 'Motivo' },
    { chave: 'situacao', titulo: 'Situação', texto: d => ROTULO_SITUACAO[d.situacao],
      render: d => <span className={`pilula ${d.situacao === 'pendente' ? 'pilula-neutra' : d.situacao === 'recusado' ? 'st-atrasada' : ''}`} title={d.motivo_recusa ?? undefined}>{ROTULO_SITUACAO[d.situacao]}</span> },
    { chave: 'aprovado_por', titulo: 'Decidido por' },
    { chave: 'acao', titulo: '', fixa: true, render: d => (d.pode_decidir ? <span className="linha">
      <button type="button" className="link" onClick={() => setAcao({ d, decisao: 'aprovar' })}>Aprovar</button>
      <button type="button" className="link" onClick={() => setAcao({ d, decisao: 'recusar' })}>Recusar</button>
    </span> : null) },
  ], [meus]);
  return (
    <>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {c.dados && (linhas.length
        ? <Tabela id={meus ? 'meus-desvios' : 'desvios'} nome={meus ? 'Meus desvios' : 'Desvios de agenda'} colunas={colunas} linhas={linhas} chave={d => d.id} />
        : <p className="ajuda">Nenhum desvio no período.</p>)}
      {acao && <Decidir d={acao.d} decisao={acao.decisao} aoFechar={() => setAcao(null)} aoGravar={() => { setAcao(null); ed.mudou(); }} />}
    </>
  );
}
