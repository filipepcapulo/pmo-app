// Conferência de OS (V13c-3, Produtividade › Conferência de OS): OS do Experience × agendas do banco no período.
// Quem tem conferencia_os.gerenciar roda a conferência (Conta Sankhya dele) e grava o vínculo da OS nas tarefas (com quem
// validou). Sem produtividade.ver_todos (o consultor), o banco devolve só as próprias linhas. Relatório por consultor:
// imprimir/PDF, com a mensagem de cada um pronta para copiar; Excel pela tabela.
import { useMemo, useState } from 'react';
import {
  conferencia, dataBr, erroPeriodo, mensagemConsultor, pendente, periodoPadrao, porConsultor, ROTULO, ROTULO_FASE, textoExecucao,
  textoResultado, textoVinculo, totaisConferencia, vinculavel, type Conferencia, type LinhaConferencia, type Situacao,
} from '../api/conferencia';
import { horas as fmtHoras } from '../api/cadastros';
import { hojeIso } from '../api/projeto';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { Botao } from './Botao';
import { Tabela, type Coluna } from './Tabela';
import { useToast } from './Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useSessao } from '../estado/sessao';

const ORIGEM = 'OS: Experience (integradas e travadas, só leitura). Agendas: tarefas do banco com Apontamento "OS Experience" ou "(Apontamento OS)"; '
  + 'canceladas, gestores, Lixeira, Planejamento, 1-BP-MS, Horas Cruzadas e Planos de Ação ficam fora. Concluída só sai com OS registrada e horas. '
  + 'Ordem: TAG [ClickUp:id] ou nº da OS já registrado → data + consultor + cliente (horário cobrindo metade da agenda) → tarefa-gêmea.';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const COR: Record<Situacao, string> = {
  conferida: 'var(--verde)', sem_os: 'var(--vermelho)', aguardando_gp: 'var(--laranja, #d9822b)', tempo_alterado: 'var(--laranja, #d9822b)',
  os_sem_tarefa: 'var(--texto-2)',
};
type Filtro = 'pendencias' | Situacao | 'todas';

function relatorio(d: Conferencia, linhas: LinhaConferencia[]) {
  const w = window.open('', '_blank');
  if (!w) throw new Error('O navegador bloqueou a janela do relatório; libere as janelas deste site.');
  const t = totaisConferencia(linhas);
  const grupos = porConsultor(linhas);
  w.document.open();
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Conferência de OS</title>
<style>body{font:12px/1.4 system-ui,sans-serif;color:#1d2a22;margin:24px}h1{font-size:18px;margin:0 0 2px}h2{font-size:14px;margin:20px 0 6px;break-after:avoid}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #cfd8d2;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eef4f0}
.resumo{width:auto}.num{text-align:right;white-space:nowrap}small{color:#5c6b62}pre{white-space:pre-wrap;background:#f4f7f5;padding:8px;border-radius:6px}
.ok{color:#1b7f3b}.ruim{color:#b3261e}section{break-inside:avoid-page}@media print{button{display:none}}</style></head><body>
<button onclick="print()" style="float:right">Imprimir / salvar PDF</button>
<h1>Conferência de OS × agendas</h1>
<small>${esc(textoExecucao(d.execucao))} · gerado em ${new Date().toLocaleString('pt-BR')}</small>
<h2>Resumo</h2><table class="resumo">
<tr><th>Conferidas</th><td class="num">${t.conferida}</td></tr><tr><th>Sem apontamento no Sankhya</th><td class="num">${t.sem_os}</td></tr>
<tr><th>Aguardando aprovação do GP</th><td class="num">${t.aguardando_gp}</td></tr><tr><th>Tempo alterado no Sankhya</th><td class="num">${t.tempo_alterado}</td></tr>
<tr><th>OS sem tarefa</th><td class="num">${t.os_sem_tarefa}</td></tr><tr><th>Conferidas para conferir (horas divididas / horário)</th><td class="num">${t.conferir}</td></tr></table>
<h2>Por consultor</h2><table class="resumo"><thead><tr><th>Consultor</th><th class="num">Conferidas</th><th class="num">Pendências</th></tr></thead><tbody>
${grupos.map(g => `<tr><td>${esc(g.consultor)}</td><td class="num">${g.totais.conferida}</td><td class="num ${g.pendencias.length ? 'ruim' : 'ok'}">${g.pendencias.length}</td></tr>`).join('')}</tbody></table>
${grupos.map(g => `<section><h2>${esc(g.consultor)} — ${g.pendencias.length ? `${g.pendencias.length} pendência(s)` : 'tudo certo'}</h2>
${g.pendencias.length ? `<table><thead><tr><th>Data</th><th>Agenda</th><th>Cliente</th><th>Situação</th><th>OS</th><th>Horário OS</th><th class="num">Horas</th><th>Observação</th></tr></thead><tbody>
${g.pendencias.map(l => `<tr><td>${dataBr(l.data)}</td><td>${esc(l.tarefa_nome ?? '')}${l.janela ? ` <small>${esc(l.janela)}</small>` : ''}</td><td>${esc(l.cliente)}</td>
<td>${esc(ROTULO[l.situacao])}</td><td>${esc(l.numero_os ?? (l.experience_id ? `Pendente (Cód. ${l.experience_id})` : ''))}</td>
<td>${l.os_ini && l.os_fim ? `${l.os_ini}-${l.os_fim}` : ''}</td><td class="num">${l.horas ?? ''}</td><td>${esc(l.mensagem ?? '')}</td></tr>`).join('')}</tbody></table>` : ''}
<pre>${esc(mensagemConsultor(g, d.execucao))}</pre></section>`).join('')}
</body></html>`);
  w.document.close();
}

export function ConferenciaOS() {
  const escritorio = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const avisar = useToast();
  const hoje = hojeIso();
  const [execucao, setExecucao] = useState<string | undefined>(undefined);
  const [periodo, setPeriodo] = useState(() => periodoPadrao(hoje));
  const [filtro, setFiltro] = useState<Filtro>('pendencias');
  const [consultor, setConsultor] = useState('');
  const [rodando, setRodando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const c = useCarga(() => conferencia.listar(escritorio, execucao), [escritorio, execucao, ed.geracao]);
  const d = c.dados;
  const linhas = d?.linhas ?? [];
  const consultores = useMemo(() => [...new Set(linhas.map(l => l.consultor ?? l.executante ?? '—'))].sort(), [linhas]);
  const doConsultor = useMemo(() => (consultor ? linhas.filter(l => (l.consultor ?? l.executante ?? '—') === consultor) : linhas), [linhas, consultor]);
  const vistas = useMemo(() => doConsultor.filter(l => (filtro === 'todas' ? true : filtro === 'pendencias' ? pendente(l) : l.situacao === filtro)),
    [doConsultor, filtro]);
  const t = totaisConferencia(doConsultor);
  const pode = !!d?.pode_gerenciar;
  const erroP = erroPeriodo(periodo.de, periodo.ate, hoje);

  async function conferir() {
    if (erroP) { avisar(erroP, 'erro'); return; }
    setRodando(true);
    try {
      const r = await conferencia.conferir(escritorio, periodo.de, periodo.ate);
      avisar(textoResultado(r), r.ok ? 'ok' : 'erro');
      if (r.ok) { setExecucao(undefined); setFiltro('pendencias'); setConsultor(''); ed.mudou(); }
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setRodando(false);
  }
  async function vincular(ids: string[]) {
    if (!d?.execucao || !ids.length) return;
    if (ids.length > 1 && !window.confirm(`Gravar a OS como apontamento em ${ids.length} agenda(s)? Fica registrado que você validou.`)) return;
    setGravando(true);
    try { avisar(textoVinculo(await conferencia.vincular(escritorio, d.execucao.id, ids)), 'ok'); ed.mudou(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  }

  const colunas = useMemo<Coluna<LinhaConferencia>[]>(() => [
    { chave: 'consultor', titulo: 'Consultor', texto: l => l.consultor ?? l.executante ?? '',
      render: l => <>{l.consultor ?? l.executante}{!l.usuario_id && <><br /><small className="ajuda">sem par no cadastro</small></>}</> },
    { chave: 'data', titulo: 'Data', valor: l => l.data ?? '', texto: l => dataBr(l.data) },
    { chave: 'situacao', titulo: 'Situação', valor: l => l.situacao, texto: l => ROTULO[l.situacao],
      render: l => <span className="pilula" style={{ background: COR[l.situacao], color: '#fff' }}>{ROTULO[l.situacao]}</span> },
    { chave: 'tarefa_nome', titulo: 'Agenda', texto: l => l.tarefa_nome ?? '',
      render: l => (l.tarefa_id ? <a href={hashDe(caminhoEntidade('tarefa', l.tarefa_id))}>{l.tarefa_nome}</a> : <span className="ajuda">—</span>) },
    { chave: 'janela', titulo: 'Período', texto: l => l.janela ?? '' },
    { chave: 'cliente', titulo: 'Cliente', texto: l => l.cliente ?? '' },
    { chave: 'numero_os', titulo: 'OS', texto: l => l.numero_os ?? (l.experience_id ? `Pendente (${l.experience_id})` : '') },
    { chave: 'horario_os', titulo: 'Horário OS', texto: l => (l.os_ini && l.os_fim ? `${l.os_ini}-${l.os_fim}` : '') },
    { chave: 'horas', titulo: 'Horas', alinhar: 'dir', valor: l => l.horas ?? -1,
      texto: l => (l.horas === null ? '' : `${fmtHoras(l.horas)}${l.horas_antes !== null ? ` (era ${fmtHoras(l.horas_antes)})` : ''}`) },
    { chave: 'fase', titulo: 'Casou por', texto: l => (l.fase ? ROTULO_FASE[l.fase] : '') },
    { chave: 'mensagem', titulo: 'Observação', texto: l => l.mensagem ?? '' },
    { chave: 'vinculo', titulo: 'Vínculo', valor: l => l.vinculado_em ?? '',
      texto: l => (l.vinculado_em ? `Gravado por ${l.vinculado_por ?? '—'} em ${dataBr(l.vinculado_em.slice(0, 10))}` : ''),
      render: l => (l.vinculado_em ? <small className="ajuda">Gravado por {l.vinculado_por ?? '—'} em {dataBr(l.vinculado_em.slice(0, 10))}</small>
        : pode && vinculavel(l) ? <Botao onClick={() => void vincular([l.id])} disabled={gravando}>Gravar</Botao> : null) },
    { chave: 'solucao', titulo: 'Solução (OS)', texto: l => l.solucao ?? '' },
    { chave: 'fap', titulo: 'FAP', texto: l => l.fap ?? '' },
    { chave: 'experience_id', titulo: 'ID Experience', texto: l => l.experience_id ?? '' },
  ], [pode, gravando, escritorio, d?.execucao?.id]);

  const chip = (f: Filtro, rotulo: string, n?: number) => (
    <button type="button" className={`chip${filtro === f ? ' sel' : ''}`} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
      {rotulo}{n !== undefined && <> <small>{n}</small></>}
    </button>);

  return (
    <section className="cartao" aria-label="Conferência de OS">
      <div className="pagina-topo">
        <h2 className="secao">Conferência de OS × agendas</h2>
        <div>
          {d?.execucao && <Botao onClick={() => { try { relatorio(d, doConsultor); } catch (e) { avisar((e as Error).message, 'erro'); } }}>Relatório por consultor</Botao>}
          {pode && t.vinculaveis > 0 && (
            <Botao onClick={() => void vincular(doConsultor.filter(vinculavel).map(l => l.id))} carregando={gravando} disabled={gravando}>
              Gravar vínculos ({t.vinculaveis})
            </Botao>)}
        </div>
      </div>
      {pode && (
        <div className="barra-filtros" aria-label="Rodar a conferência">
          <label className="ajuda">De <input type="date" aria-label="Data inicial" value={periodo.de} max={hoje} onChange={e => setPeriodo(p => ({ ...p, de: e.target.value }))} /></label>
          <label className="ajuda">Até <input type="date" aria-label="Data final" value={periodo.ate} max={hoje} onChange={e => setPeriodo(p => ({ ...p, ate: e.target.value }))} /></label>
          <Botao variante="primario" onClick={conferir} carregando={rodando} disabled={rodando || !!erroP}>Conferir com o Experience</Botao>
          {erroP && <small className="msg-erro">{erroP}</small>}
        </div>
      )}
      {d && <p className="ajuda" data-testid="conferencia-quando">{textoExecucao(d.execucao)}</p>}
      {d && d.execucoes.length > 1 && (
        <label className="ajuda">Conferências anteriores <select aria-label="Escolher a conferência" value={d.execucao?.id ?? ''} onChange={e => setExecucao(e.target.value || undefined)}>
          {d.execucoes.map(x => <option key={x.id} value={x.id}>{`${dataBr(x.de)} a ${dataBr(x.ate)} · ${new Date(x.criado_em).toLocaleString('pt-BR').slice(0, 17)}${x.consultor ? ` · ${x.consultor}` : ''}`}</option>)}
        </select></label>
      )}
      {d?.execucao && (
        <div className="barra-filtros">
          <div className="chips" role="group" aria-label="Situação">
            {chip('pendencias', 'Pendências', doConsultor.filter(pendente).length)}
            {chip('sem_os', 'Sem OS', t.sem_os)}
            {chip('aguardando_gp', 'Aguardando GP', t.aguardando_gp)}
            {chip('os_sem_tarefa', 'OS sem tarefa', t.os_sem_tarefa)}
            {t.tempo_alterado > 0 && chip('tempo_alterado', 'Tempo alterado', t.tempo_alterado)}
            {chip('conferida', 'Conferidas', t.conferida)}
            {chip('todas', 'Todas', doConsultor.length)}
          </div>
          {d.todos && consultores.length > 1 && (
            <label className="ajuda">Consultor <select aria-label="Filtrar consultor" value={consultor} onChange={e => setConsultor(e.target.value)}>
              <option value="">Todos</option>{consultores.map(n => <option key={n} value={n}>{n}</option>)}
            </select></label>)}
        </div>
      )}
      {d?.execucao && <section className="indicadores" aria-label="Totais da conferência">
        <div className="indicador"><small>Conferidas</small><strong data-testid="conferencia-conferidas">{t.conferida}</strong></div>
        <div className="indicador"><small>Sem apontamento</small><strong data-testid="conferencia-sem-os">{t.sem_os}</strong></div>
        <div className="indicador"><small>Aguardando GP</small><strong>{t.aguardando_gp}</strong></div>
        <div className="indicador"><small>OS sem tarefa</small><strong>{t.os_sem_tarefa}</strong></div>
        <div className="indicador"><small>Para conferir</small><strong>{t.conferir + t.tempo_alterado}</strong></div>
      </section>}
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {d?.execucao && <Tabela id="conferencia-os" nome={`Conferencia OS ${d.execucao.de} a ${d.execucao.ate}`} colunas={colunas} linhas={vistas}
        chave={l => l.id} tamanhoInicial={30}
        vazio={filtro === 'pendencias' ? 'Nenhuma pendência nesta conferência.' : 'Nenhuma linha nesta situação.'} />}
      {c.carregando && !d && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {d && !d.todos && <p className="ajuda">Você vê só as suas agendas e OS; as da equipe aparecem para a gerência.</p>}
      <p className="ajuda"><small>{ORIGEM} Gravar vínculo grava a OS como apontamento da agenda, com quem validou (aparece na ficha da tarefa); nunca apaga agenda nem apontamento, e o apontamento já conferido pela gerência fica como está.</small></p>
    </section>
  );
}
