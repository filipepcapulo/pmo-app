// Execução › Tarefas Pendentes no Experience (4.14.0, 0105): painel de acompanhamento das agendas que ainda pedem uma ação
// no Experience — Abertura (criar o lançamento), Ajuste (alterar) ou Exclusão (Lixeira) —, venham de chamado, demanda ou
// subdemanda. Mesma permissão do Sync com o Experience (sync_experience.gerenciar). 4.14.1 (pedido do Filipe): a tela é só
// monitoramento; quem sincroniza é a tela Sync com o Experience ou a ficha da tarefa.
import { useMemo, useState } from 'react';
import { hojeIso } from '../api/projeto';
import {
  avisosPendente, COR_PENDENCIA, erroPeriodoPendentes, experiencePendentes, filtrarPendentes, janelaPendente, opcoesPendentes, periodoPendentes,
  ROTULO_PENDENCIA, totaisPendentes, type LinhaPendente,
} from '../api/experiencePendentes';
import { dataBr, ROTULO_MODO, type AcaoSync } from '../api/syncExperience';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

const REGRAS = 'Entram as agendas com Apontamento "OS Experience" ou "Hora Dobrada" cujo campo Experience ainda pede uma ação: vazio ou "Não lançado" = '
  + 'Abertura, "Alterar" = Ajuste, "Lixeira" = Exclusão — não importa se a tarefa veio de chamado, demanda ou subdemanda. Depois de sincronizada no modo real '
  + '(tela Sync com o Experience ou ficha da tarefa) ela sai daqui. Ficam fora: Agenda "Planejamento", '
  + '1-BP-MS, Horas Cruzadas, Planos de Ação e clientes inativos — as mesmas regras do Sync com o Experience.';

export function ExperiencePendentes() {
  const escritorio = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const hoje = hojeIso();
  const [periodo, setPeriodo] = useState(() => periodoPendentes(hoje));
  const [acao, setAcao] = useState<AcaoSync | ''>('');
  const [consultor, setConsultor] = useState('');
  const [apontamento, setApontamento] = useState('');
  const erroP = erroPeriodoPendentes(periodo.de, periodo.ate);
  const c = useCarga(() => (erroP ? Promise.resolve(null) : experiencePendentes.painel(escritorio, periodo.de, periodo.ate)),
    [escritorio, periodo.de, periodo.ate, erroP, ed.geracao]);
  const d = c.dados;
  const linhas = useMemo(() => d?.linhas ?? [], [d]);
  const opcoes = useMemo(() => opcoesPendentes(linhas), [linhas]);
  // os chips contam o que sobra dos outros filtros (consultor e apontamento)
  const semAcao = useMemo(() => filtrarPendentes(linhas, { acao: '', consultor, apontamento }), [linhas, consultor, apontamento]);
  const t = totaisPendentes(semAcao);
  const vistas = useMemo(() => (acao ? semAcao.filter(l => l.acao === acao) : semAcao), [semAcao, acao]);

  const colunas = useMemo<Coluna<LinhaPendente>[]>(() => [
    { chave: 'acao', titulo: 'Pendência', valor: l => l.acao, texto: l => ROTULO_PENDENCIA[l.acao],
      render: l => <span className="pilula" style={{ background: COR_PENDENCIA[l.acao], color: '#fff' }}>{ROTULO_PENDENCIA[l.acao]}</span> },
    { chave: 'consultor', titulo: 'Consultor executante', texto: l => l.consultor },
    { chave: 'data', titulo: 'Data da agenda', valor: l => l.data, texto: l => dataBr(l.data) },
    { chave: 'periodo', titulo: 'Período', valor: l => `${l.ini ?? ''} ${l.periodo}`, texto: l => janelaPendente(l) },
    { chave: 'apontamento', titulo: 'Apontamento', texto: l => l.apontamento },
    { chave: 'cliente', titulo: 'Cliente', texto: l => l.cliente },
    { chave: 'fap', titulo: 'FAP', texto: l => l.fap ?? '' },
    { chave: 'demanda', titulo: 'Demanda', texto: l => l.demanda, render: l => <a href={hashDe(caminhoEntidade('demanda', l.demanda_id))}>{l.demanda}</a> },
    { chave: 'subdemanda', titulo: 'Subdemanda', texto: l => l.subdemanda ?? '',
      render: l => (l.subdemanda_id ? <a href={hashDe(caminhoEntidade('demanda', l.subdemanda_id))}>{l.subdemanda}</a> : '') },
    { chave: 'tarefa', titulo: 'Tarefa', texto: l => l.tarefa, render: l => <a href={hashDe(caminhoEntidade('tarefa', l.id))}>{l.tarefa}</a> },
    { chave: 'experience', titulo: 'Experience', texto: l => l.experience || 'Não lançado' },
    { chave: 'lancamento_id', titulo: 'Lançamento', texto: l => l.lancamento_id ?? '' },
    { chave: 'avisos', titulo: 'Atenção', texto: l => avisosPendente(l, hoje).join(' · '),
      render: l => { const a = avisosPendente(l, hoje); return a.length ? <span className="msg-erro">{a.join(' · ')}</span> : ''; } },
    { chave: 'observacao', titulo: 'Último sync', texto: l => [l.observacao, l.sync_em ? dataBr(l.sync_em.slice(0, 10)) : ''].filter(Boolean).join(' · ') },
  ], [hoje]);

  const chip = (a: AcaoSync | '', rotulo: string, n: number) => (
    <button type="button" className={`chip${acao === a ? ' sel' : ''}`} aria-pressed={acao === a} onClick={() => setAcao(a)}>{rotulo} <small>{n}</small></button>);

  return (
    <div className="pagina">
      <header className="pagina-topo">
        <h1>Tarefas Pendentes no Experience</h1>
        <div className="linha"><a className="bt bt-secundario" href={hashDe('sync-experience')}>Sync com o Experience</a></div>
      </header>
      <section className="cartao" aria-label="Filtros das pendências">
        <p className="ajuda" data-testid="pendentes-modo">Modo do sync: <strong>{d ? ROTULO_MODO[d.modo] : '…'}</strong>. Esta tela só acompanha: para lançar, use o Sync com o Experience ou a ficha da tarefa.</p>
        <div className="barra-filtros">
          <label className="ajuda">De <input type="date" aria-label="Data inicial" value={periodo.de} onChange={e => setPeriodo(p => ({ ...p, de: e.target.value }))} /></label>
          <label className="ajuda">Até <input type="date" aria-label="Data final" value={periodo.ate} onChange={e => setPeriodo(p => ({ ...p, ate: e.target.value }))} /></label>
          <label className="ajuda">Consultor <select aria-label="Consultor executante" value={consultor} onChange={e => setConsultor(e.target.value)}>
            <option value="">Todos</option>{opcoes.consultores.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select></label>
          <label className="ajuda">Apontamento <select aria-label="Apontamento" value={apontamento} onChange={e => setApontamento(e.target.value)}>
            <option value="">Todos</option>{opcoes.apontamentos.map(a => <option key={a} value={a}>{a}</option>)}
          </select></label>
          {erroP && <small className="msg-erro">{erroP}</small>}
        </div>
        <div className="chips" role="group" aria-label="Tipo de pendência">
          {chip('', 'Todas', semAcao.length)}
          {chip('criar', 'Abertura', t.criar)}
          {chip('alterar', 'Ajustes', t.alterar)}
          {chip('excluir', 'Exclusão', t.excluir)}
        </div>
      </section>

      <section className="cartao" aria-label="Tarefas pendentes no Experience">
        <section className="indicadores" aria-label="Totais das pendências">
          <div className="indicador"><small>Abertura</small><strong data-testid="pendentes-abertura">{t.criar}</strong></div>
          <div className="indicador"><small>Ajustes</small><strong data-testid="pendentes-ajuste">{t.alterar}</strong></div>
          <div className="indicador"><small>Exclusão</small><strong data-testid="pendentes-exclusao">{t.excluir}</strong></div>
          <div className="indicador"><small>Com atenção</small><strong>{semAcao.filter(l => avisosPendente(l, hoje).length > 0).length}</strong></div>
        </section>
        {c.erro && <p className="msg-erro">{c.erro}</p>}
        {d && <Tabela id="experience-pendentes" nome={`Pendentes no Experience ${periodo.de} a ${periodo.ate}`} colunas={colunas} linhas={vistas}
          chave={l => l.id} tamanhoInicial={30} vazio="Nenhuma tarefa pendente no Experience neste filtro." />}
        {c.carregando && !d && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
        <p className="ajuda"><small>{REGRAS}</small></p>
      </section>
    </div>
  );
}
