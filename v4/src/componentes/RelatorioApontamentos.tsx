// Relatório de apontamentos (escopo §6.4): filtro por origem e período, total OS + app. Com `equipe`, é o de Produtividade
// (todos ou um consultor), onde a gerência confere ou reabre. Conferido, nem o próprio consultor altera (0036).
// 4.21.0 (0110/0112): origem em seleção múltipla (Sankhya OM, Apontamento no APP, Agenda prevista sem apontamento; nenhuma
// marcada = todas) e o Total soma tudo o que está no filtro, inclusive o previsto. Em Ordens de Serviço o filtro é o mesmo
// da aba Fechamento (`origens`/`aoMudarOrigens`).
import { useCallback, useMemo, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { traduzirErro } from '../api/mensagens';
import { consultor, ORIGENS, origemParam, podeApontar, rotuloOrigens, temOrigem, type LinhaApontamento } from '../api/consultor';
import { rotuloStatusTarefa } from '../api/execucao';
import { hojeIso, somarDias } from '../api/projeto';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useEquipe, usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { SelecaoMultipla } from './SelecaoMultipla';
import { Tabela, type Coluna } from './Tabela';

const ROTULO_ORIGEM = { sankhya_om: 'Sankhya OM', app: 'Apontamento no APP', manual: 'Manual', previsto: 'Agenda prevista' };
const janela = (a: LinhaApontamento) => (a.hora_ini && a.hora_fim ? `${a.hora_ini.slice(0, 5)}–${a.hora_fim.slice(0, 5)}` : '');

export function RelatorioApontamentos({ equipe, origens, aoMudarOrigens }: { equipe?: boolean; origens?: string[]; aoMudarOrigens?: (s: string[]) => void }) {
  const { eu } = useSessao();
  const esc = eu!.escritorio_id!;
  const ed = useEdicao();
  const { lista } = useEquipe();
  const [origensLocal, setOrigensLocal] = useState<string[]>([]);
  const sel = origens ?? origensLocal, mudarOrigens = aoMudarOrigens ?? setOrigensLocal;
  const origem = origemParam(sel), comPrevisto = temOrigem(sel, 'previsto');
  const [de, setDe] = useState(() => somarDias(hojeIso(), -30));
  const [ate, setAte] = useState(hojeIso);
  const [pessoa, setPessoa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const pode = usePode();
  const conferente = !!equipe && pode('relatorio.produtividade');
  const conferir = useCallback(async (ids: string[], sim: boolean) => {
    setErro(null);
    try { await consultor.conferir(esc, ids, sim); ed.mudou(); } catch (e) { setErro(traduzirErro(e).mensagem); }
  }, [esc, ed]);
  const c = useCarga(() => consultor.apontamentos(esc, { de, ate, origem, equipe, consultor: pessoa }), [esc, de, ate, origem, equipe, pessoa, ed.geracao]);
  const colunas = useMemo<Coluna<LinhaApontamento>[]>(() => [
    { chave: 'data', titulo: 'Data', texto: a => data(a.data) },
    ...(equipe ? [{ chave: 'consultor', titulo: 'Consultor' }] : []),
    { chave: 'origem', titulo: 'Origem', texto: a => ROTULO_ORIGEM[a.origem] },
    { chave: 'numero', titulo: 'Nº', valor: a => a.numero_os ?? a.numero_interno, texto: a => String(a.numero_os ?? a.numero_interno ?? '') },
    { chave: 'horario', titulo: 'Início–fim', valor: janela, texto: janela },
    { chave: 'intervalo_min', titulo: 'Intervalo (min)', alinhar: 'dir' },
    { chave: 'horas', titulo: 'Horas', alinhar: 'dir', texto: a => horas(a.horas), valor: a => a.horas },
    { chave: 'cliente', titulo: 'Cliente' },
    { chave: 'projeto', titulo: 'Projeto' },
    { chave: 'demanda', titulo: 'Demanda' },
    { chave: 'tarefa', titulo: 'Tarefa', render: a => <a href={hashDe(caminhoEntidade('tarefa', a.tarefa_id))}>{a.tarefa}</a>, texto: a => a.tarefa },
    { chave: 'texto', titulo: 'Texto' },
    { chave: 'status_tarefa', titulo: 'Agenda', valor: a => (a.status_tarefa ? rotuloStatusTarefa(a.status_tarefa) : ''), texto: a => (a.status_tarefa ? rotuloStatusTarefa(a.status_tarefa) : '') },
    { chave: 'tipo_apontamento', titulo: 'Tipo de apontamento' },
    { chave: 'conferido', titulo: 'Conferência', valor: a => a.conferido_em, texto: a => (a.origem !== 'app' ? '' : a.conferido_em ? 'Conferido' : 'Pendente'),
      render: a => (a.origem !== 'app' ? null : <span className={`pilula${a.conferido_em ? '' : ' pilula-neutra'}`}>{a.conferido_em ? 'Conferido' : 'Pendente'}</span>) },
    { chave: 'acao', titulo: '', fixa: true, render: a => (a.origem === 'previsto'
      ? (a.consultor_id === eu!.usuario.id && podeApontar({ data: a.data, status: a.status_tarefa ?? '' }, hojeIso())
        ? <button type="button" className="link" onClick={() => ed.apontar({ tarefa_id: a.tarefa_id, nome: a.tarefa, data: a.data })}>Apontar</button> : null)
      : a.origem !== 'app' ? null : <span className="linha">
      {!a.conferido_em && a.consultor_id === eu!.usuario.id && <button type="button" className="link" onClick={() => ed.apontar({ tarefa_id: a.tarefa_id, nome: a.tarefa, data: a.data, apontamento: a })}>Editar</button>}
      {conferente && <button type="button" className="link" onClick={() => conferir([a.apontamento_id!], !a.conferido_em)}>{a.conferido_em ? 'Reabrir' : 'Conferir'}</button>}
    </span>) },
  ], [equipe, ed, eu, conferente, conferir]);
  const pendentes = (c.dados?.itens ?? []).filter(a => a.origem === 'app' && !a.conferido_em);
  const r = c.dados;
  return (
    <>
      <div className="barra-filtros">
        {equipe && (
          <select value={pessoa} onChange={e => setPessoa(e.target.value)} aria-label="Consultor">
            <option value="">Todos os consultores</option>
            {lista.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        )}
        <SelecaoMultipla rotulo="Origem" opcoes={ORIGENS} sel={sel} aoMudar={mudarOrigens} />
        <label className="ajuda">De <input type="date" value={de} onChange={e => e.target.value && setDe(e.target.value)} aria-label="De" /></label>
        <label className="ajuda">Até <input type="date" value={ate} onChange={e => e.target.value && setAte(e.target.value)} aria-label="Até" /></label>
        {conferente && pendentes.length > 0 && <Botao variante="primario" onClick={() => conferir(pendentes.map(a => a.apontamento_id!), true)}>Conferir {pendentes.length} do filtro</Botao>}
      </div>
      {(c.erro || erro) && <p className="msg-erro">{c.erro || erro}</p>}
      {r && <>
        <section className="indicadores" aria-label="Total de horas">
          <div className="indicador"><small>Total ({rotuloOrigens(sel)})</small><strong data-testid="total-horas">{horas(r.horas_total ?? r.horas + (r.horas_previstas ?? 0))}</strong></div>
          {temOrigem(sel, 'sankhya_om') && <div className="indicador"><small>Sankhya OM</small><strong data-testid="horas-os">{horas(r.horas_os)}</strong></div>}
          {temOrigem(sel, 'app') && <div className="indicador"><small>Apontamento no APP</small><strong data-testid="horas-app">{horas(r.horas_app)}</strong></div>}
          {comPrevisto && <div className="indicador"><small>Previsto sem apontamento</small><strong data-testid="horas-previstas">{horas(r.horas_previstas ?? 0)}</strong></div>}
          <div className="indicador"><small>Registros</small><strong>{r.total}</strong></div>
        </section>
        {r.total > r.itens.length && <p className="ajuda">Mostrando {r.itens.length} de {r.total}; reduza o período.</p>}
        <section className="cartao">
          <Tabela id={equipe ? 'produtividade' : 'meus-apontamentos'} nome={equipe ? 'Ordens de Serviço' : 'Meus apontamentos'} colunas={colunas} linhas={r.itens}
            chave={a => a.apontamento_id ?? `previsto:${a.tarefa_id}`} tamanhoInicial={15} vazio={comPrevisto ? 'Nada no período para as origens escolhidas.' : 'Nenhum apontamento no período.'} />
        </section>
      </>}
      {c.carregando && !r && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
    </>
  );
}
