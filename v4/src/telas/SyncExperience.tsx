// Sistema › Sync com o Experience (V13d-2, módulo 02 da Central BP-MS). Quem tem sync_experience.gerenciar roda o sync no
// período (Conta Sankhya dele); o modo do escritório (Simulação/Real) é ligado só por quem tem integracao.gerenciar.
// Mostra a última rodada (ou uma anterior) com o resultado por tarefa. Nunca exclui nada no app.
import { useMemo, useState } from 'react';
import { hojeIso } from '../api/projeto';
import {
  dataBr, erroPeriodo, fapValida, pendente, periodoPadrao, ROTULO_ACAO, ROTULO_MODO, ROTULO_RESULTADO, syncExperience, textoExecucao,
  textoResultado, totaisSync, type LinhaSync, type Modo, type ResultadoSync,
} from '../api/syncExperience';
import { Botao } from '../componentes/Botao';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useEquipe } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

const COR: Record<ResultadoSync, string> = {
  feito: 'var(--verde)', simulado: 'var(--azul, #2f6db5)', sem_mudanca: 'var(--texto-2)', ignorado: 'var(--texto-2)',
  bloqueado: 'var(--laranja, #d9822b)', erro: 'var(--vermelho)',
};
const REGRAS = 'Entram as tarefas com Apontamento "OS Experience" ou "Hora Dobrada" no período. O campo Experience decide: vazio/"Não lançado" cria, '
  + '"Alterar" altera (ou cria se não achar), "Lixeira" exclui no Experience só o lançamento com a TAG da tarefa ([ClickUp:id] ou [PMO:id]). '
  + 'Ordem: Excluir → Alterar → Criar. Só projeto "Em Andamento" e, nesta etapa, só o modelo Avulso (15/72) e a etapa "Personalização / Customização": '
  + 'os demais modelos ficam bloqueados e seguem pela Central. Lançamento que já virou OS não muda. Clientes Z, 1-BP-MS, Horas Cruzadas, '
  + 'Planos de Ação e Agenda "Planejamento" ficam fora. Nunca exclui nada no app: a tarefa fica, com a observação na ficha.';
type Filtro = 'pendencias' | 'todas' | ResultadoSync;

export function SyncExperience() {
  const escritorio = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const avisar = useToast();
  const { lista } = useEquipe();
  const hoje = hojeIso();
  const [execucao, setExecucao] = useState<string | undefined>(undefined);
  const [periodo, setPeriodo] = useState(() => periodoPadrao(hoje));
  const [fap, setFap] = useState('');
  const [consultor, setConsultor] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [rodando, setRodando] = useState(false);
  const c = useCarga(() => syncExperience.painel(escritorio, execucao), [escritorio, execucao, ed.geracao]);
  const d = c.dados;
  const linhas = d?.linhas ?? [];
  const t = totaisSync(linhas);
  const vistas = useMemo(() => linhas.filter(l => (filtro === 'todas' ? true : filtro === 'pendencias' ? pendente(l) : l.resultado === filtro)),
    [linhas, filtro]);
  const erroP = erroPeriodo(periodo.de, periodo.ate, hoje) ?? (fapValida(fap) ? null : 'FAP: só o número (4 a 6 dígitos).');
  const ativos = useMemo(() => lista.filter(m => m.ativo).sort((a, b) => a.nome.localeCompare(b.nome)), [lista]);

  async function rodar() {
    if (erroP) { avisar(erroP, 'erro'); return; }
    if (d?.modo === 'real' && !window.confirm('O modo é REAL: o sync vai criar, alterar e excluir lançamentos no Experience. Continuar?')) return;
    setRodando(true);
    try {
      const r = await syncExperience.rodar(escritorio, { de: periodo.de, ate: periodo.ate, fap: fap || null, consultor: consultor || null });
      avisar(textoResultado(r), r.ok ? 'ok' : 'erro');
      if (r.ok) { setExecucao(undefined); setFiltro('todas'); ed.mudou(); }
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setRodando(false);
  }
  async function trocarModo(m: Modo) {
    if (m === 'real' && !window.confirm('Ligar o modo REAL? A partir daí o sync grava no Experience (cria, altera e exclui lançamentos). Confira antes uma simulação.')) return;
    try { await syncExperience.modo(escritorio, m); avisar(m === 'real' ? 'Modo real ligado.' : 'Voltou para simulação.', 'ok'); ed.mudou(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
  }

  const colunas = useMemo<Coluna<LinhaSync>[]>(() => [
    { chave: 'resultado', titulo: 'Resultado', valor: l => l.resultado, texto: l => ROTULO_RESULTADO[l.resultado],
      render: l => <span className="pilula" style={{ background: COR[l.resultado], color: '#fff' }}>{ROTULO_RESULTADO[l.resultado]}</span> },
    { chave: 'acao', titulo: 'Ação', valor: l => l.acao, texto: l => ROTULO_ACAO[l.acao] },
    { chave: 'consultor', titulo: 'Consultor', texto: l => l.consultor },
    { chave: 'data', titulo: 'Data', valor: l => l.data ?? '', texto: l => dataBr(l.data) },
    { chave: 'janela', titulo: 'Período', texto: l => l.janela ?? '' },
    { chave: 'tarefa', titulo: 'Tarefa', texto: l => l.tarefa, render: l => <a href={hashDe(caminhoEntidade('tarefa', l.tarefa_id))}>{l.tarefa}</a> },
    { chave: 'cliente', titulo: 'Cliente', texto: l => l.cliente },
    { chave: 'fap', titulo: 'FAP', texto: l => l.fap ?? '' },
    { chave: 'lancamento_id', titulo: 'Lançamento', texto: l => l.lancamento_id ?? '' },
    { chave: 'mensagem', titulo: 'Observação', texto: l => l.mensagem ?? '' },
  ], []);

  const chip = (f: Filtro, rotulo: string, n: number) => (
    <button type="button" className={`chip${filtro === f ? ' sel' : ''}`} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>{rotulo} <small>{n}</small></button>);

  return (
    <div className="pagina">
      <header className="pagina-topo"><h1>Sync com o Experience</h1></header>
      <section className="cartao" aria-label="Modo do sync">
        <p data-testid="sync-modo">
          <strong>Modo: {d ? ROTULO_MODO[d.modo] : '…'}</strong>
          {d?.modo_por && <small className="ajuda"> · por {d.modo_por}{d.modo_em ? ` em ${dataBr(d.modo_em.slice(0, 10))}` : ''}</small>}
        </p>
        {d?.pode_modo && (
          <div className="linha">
            {d.modo === 'simulacao'
              ? <Botao onClick={() => void trocarModo('real')}>Ligar modo real</Botao>
              : <Botao onClick={() => void trocarModo('simulacao')}>Voltar para simulação</Botao>}
          </div>)}
        {d?.modo === 'simulacao' && <p className="ajuda">Em simulação o sync lê tudo no Experience e mostra o que faria, sem gravar nada lá nem na tarefa.</p>}
        {d?.rodando && <p className="msg-erro">Rodada em andamento desde {new Date(d.rodando.desde).toLocaleTimeString('pt-BR').slice(0, 5)}{d.rodando.por ? ` (${d.rodando.por})` : ''}.</p>}
        <div className="barra-filtros" aria-label="Rodar o sync">
          <label className="ajuda">De <input type="date" aria-label="Data inicial" value={periodo.de} onChange={e => setPeriodo(p => ({ ...p, de: e.target.value }))} /></label>
          <label className="ajuda">Até <input type="date" aria-label="Data final" value={periodo.ate} onChange={e => setPeriodo(p => ({ ...p, ate: e.target.value }))} /></label>
          <label className="ajuda">FAP <input aria-label="FAP" inputMode="numeric" size={7} value={fap} placeholder="todas" onChange={e => setFap(e.target.value.trim())} /></label>
          <label className="ajuda">Consultor <select aria-label="Consultor" value={consultor} onChange={e => setConsultor(e.target.value)}>
            <option value="">Todos</option>{ativos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select></label>
          <Botao variante="primario" onClick={rodar} carregando={rodando} disabled={rodando || !!erroP || !!d?.rodando}>
            {d?.modo === 'real' ? 'Rodar o sync' : 'Simular o sync'}
          </Botao>
          {erroP && <small className="msg-erro">{erroP}</small>}
        </div>
      </section>

      <section className="cartao" aria-label="Resultado do sync">
        {d && <p className="ajuda" data-testid="sync-quando">{textoExecucao(d.execucao)}</p>}
        {d && d.execucoes.length > 1 && (
          <label className="ajuda">Rodadas anteriores <select aria-label="Escolher a rodada" value={d.execucao?.id ?? ''} onChange={e => setExecucao(e.target.value || undefined)}>
            {d.execucoes.map(x => <option key={x.id} value={x.id}>{`${x.modo === 'real' ? 'Real' : 'Simulação'} · ${dataBr(x.de)} a ${dataBr(x.ate)} · ${new Date(x.criado_em).toLocaleString('pt-BR').slice(0, 17)}`}</option>)}
          </select></label>)}
        {d?.execucao && (
          <div className="chips" role="group" aria-label="Resultado">
            {chip('todas', 'Todas', linhas.length)}
            {chip('pendencias', 'Pendências', linhas.filter(pendente).length)}
            {t.feito > 0 && chip('feito', 'Feitas', t.feito)}
            {t.simulado > 0 && chip('simulado', 'Simulação', t.simulado)}
            {chip('sem_mudanca', 'Já certas', t.sem_mudanca)}
            {chip('bloqueado', 'Bloqueadas', t.bloqueado)}
            {chip('erro', 'Erros', t.erro)}
          </div>)}
        {d?.execucao && <section className="indicadores" aria-label="Totais do sync">
          <div className="indicador"><small>{d.execucao.modo === 'real' ? 'Gravadas' : 'Faria'}</small><strong data-testid="sync-acoes">{t.feito + t.simulado}</strong></div>
          <div className="indicador"><small>Já certas</small><strong>{t.sem_mudanca}</strong></div>
          <div className="indicador"><small>Bloqueadas</small><strong>{t.bloqueado}</strong></div>
          <div className="indicador"><small>Erros</small><strong data-testid="sync-erros">{t.erro}</strong></div>
        </section>}
        {c.erro && <p className="msg-erro">{c.erro}</p>}
        {d?.execucao && <Tabela id="sync-experience" nome={`Sync Experience ${d.execucao.de} a ${d.execucao.ate}`} colunas={colunas} linhas={vistas}
          chave={l => l.id} tamanhoInicial={30} vazio="Nenhuma linha neste filtro." />}
        {c.carregando && !d && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
        <p className="ajuda"><small>{REGRAS}</small></p>
      </section>
    </div>
  );
}
