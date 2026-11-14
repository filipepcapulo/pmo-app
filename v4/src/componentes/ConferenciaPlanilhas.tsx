// Conferência de Planilhas (V13e-1, Produtividade › Planilhas): planilhas de horas dos consultores (Drive) × agendas de
// planilha do banco. Quem tem planilhas.gerenciar roda a conferência (só leitura), fecha as planilhas depois do "Sim"
// (OBS/VISTO + validação no banco, com quem validou) e cria a aba do novo ciclo depois de outro "Sim". Sem
// produtividade.ver_todos (o consultor), o banco devolve só as próprias linhas.
import { useMemo, useState } from 'react';
import {
  abaProximoCiclo, dataBr, erroPeriodo, horarioPl, hm, mensagemConsultorPl, pendentePl, periodoPadrao, planilhas, porConsultorPl, ROTULO_PL,
  textoAbaCicloPl, textoConferirPl, textoExecucaoPl, textoFecharPl, totaisPl, type ConferenciaPl, type LinhaPlanilha, type SituacaoPl,
} from '../api/planilhas';
import { hojeIso } from '../api/projeto';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { Botao } from './Botao';
import { Tabela, type Coluna } from './Tabela';
import { useToast } from './Toasts';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useSessao } from '../estado/sessao';

const ORIGEM = 'Planilhas: "PLANILHA DE HORAS" de cada pasta em "01. Planilhas Consultores" (Drive), todas as abas menos CONF-. '
  + 'Agendas: tarefas do banco com Apontamento Bonificado (Planilha), Planilha - Serviços, Treinamento ou Faturado (Planilha); canceladas e gestores ficam fora. '
  + 'Casamento por consultor + dia (cliente e horário com 30 min de tolerância); "já tem OS" vem da OS registrada na agenda ou anotada na planilha.';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const COR: Record<SituacaoPl, string> = {
  conferido: 'var(--verde)', horario: 'var(--laranja, #d9822b)', cliente: 'var(--laranja, #d9822b)', falta: 'var(--vermelho)',
  sem_tarefa: 'var(--texto-2)', conflito: 'var(--vermelho)', duplicado: 'var(--vermelho)',
};
type Filtro = 'pendencias' | SituacaoPl | 'com_os' | 'todas';

function relatorio(d: ConferenciaPl, linhas: LinhaPlanilha[]) {
  const w = window.open('', '_blank');
  if (!w) throw new Error('O navegador bloqueou a janela do relatório; libere as janelas deste site.');
  const grupos = porConsultorPl(linhas);
  w.document.open();
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Conferência de Planilhas</title>
<style>body{font:12px/1.4 system-ui,sans-serif;color:#1d2a22;margin:24px}h1{font-size:18px;margin:0 0 2px}h2{font-size:14px;margin:20px 0 6px;break-after:avoid}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #cfd8d2;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eef4f0}
.resumo{width:auto}.num{text-align:right;white-space:nowrap}small{color:#5c6b62}pre{white-space:pre-wrap;background:#f4f7f5;padding:8px;border-radius:6px}
.amarelo{background:#fff6bf}.ok{color:#1b7f3b}.ruim{color:#b3261e}section{break-inside:avoid-page}@media print{button{display:none}}</style></head><body>
<button onclick="print()" style="float:right">Imprimir / salvar PDF</button>
<h1>Conferência de Planilhas × agendas</h1>
<small>${esc(textoExecucaoPl(d.execucao))} · gerado em ${new Date().toLocaleString('pt-BR')}</small>
<h2>Resumo por consultor</h2><table class="resumo"><thead><tr><th>Consultor</th><th class="num">Agenda</th><th class="num">Planilha</th><th class="num">Diferença</th>
<th class="num">Já tem OS</th><th class="num">Conferidos</th><th class="num">Pendências</th></tr></thead><tbody>
${grupos.map(g => { const ag = g.linhas.filter(l => l.tarefa_id).length, pl = g.linhas.filter(l => l.linha).length;
    return `<tr><td>${esc(g.consultor)}</td><td class="num">${ag}</td><td class="num">${pl}</td><td class="num">${hm(g.totais.min_planilha)}h${g.totais.min_so_agenda ? ` (+${hm(g.totais.min_so_agenda)}h só na agenda)` : ''}</td>
<td class="num">${g.totais.com_os}</td><td class="num">${g.totais.conferido}</td><td class="num ${g.pendencias.length ? 'ruim' : 'ok'}">${g.pendencias.length}</td></tr>`; }).join('')}</tbody></table>
${grupos.map(g => `<section><h2>${esc(g.consultor)} — ${g.pendencias.length ? `${g.pendencias.length} pendência(s)` : 'tudo certo'}</h2>
${g.pendencias.length ? `<table><thead><tr><th>Data</th><th>Situação</th><th>Planilha</th><th>Agenda</th><th>Observação</th></tr></thead><tbody>
${g.pendencias.map(l => `<tr class="${l.os ? 'amarelo' : ''}"><td>${dataBr(l.data)}</td><td>${esc(ROTULO_PL[l.situacao])}</td>
<td>${esc(l.cliente_planilha ?? '')} ${horarioPl(l)}${l.aba ? ` <small>${esc(l.aba)} linha ${l.linha}</small>` : ''}</td>
<td>${esc(l.tarefa_nome ?? '')}${l.janela ? ` <small>${esc(l.janela)}</small>` : ''}</td><td>${esc(l.observacao ?? '')}</td></tr>`).join('')}</tbody></table>` : ''}
<pre>${esc(mensagemConsultorPl(g, d.execucao))}</pre></section>`).join('')}
</body></html>`);
  w.document.close();
}

export function ConferenciaPlanilhas() {
  const escritorio = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const avisar = useToast();
  const hoje = hojeIso();
  const [execucao, setExecucao] = useState<string | undefined>(undefined);
  const [periodo, setPeriodo] = useState(() => periodoPadrao(hoje));
  const [filtro, setFiltro] = useState<Filtro>('pendencias');
  const [consultor, setConsultor] = useState('');
  const [rodando, setRodando] = useState<'' | 'conferir' | 'fechar' | 'aba'>('');
  const c = useCarga(() => planilhas.listar(escritorio, execucao), [escritorio, execucao, ed.geracao]);
  const d = c.dados;
  const linhas = d?.linhas ?? [];
  const consultores = useMemo(() => [...new Set(linhas.map(l => l.consultor ?? '—'))].sort(), [linhas]);
  const doConsultor = useMemo(() => (consultor ? linhas.filter(l => (l.consultor ?? '—') === consultor) : linhas), [linhas, consultor]);
  const vistas = useMemo(() => doConsultor.filter(l => (filtro === 'todas' ? true : filtro === 'pendencias' ? pendentePl(l)
    : filtro === 'com_os' ? !!l.os : l.situacao === filtro)), [doConsultor, filtro]);
  const t = totaisPl(doConsultor);
  const pode = !!d?.pode_gerenciar;
  const ex = d?.execucao ?? null;
  const ultima = !!ex && d!.execucoes[0]?.id === ex.id;
  const erroP = erroPeriodo(periodo.de, periodo.ate, hoje);
  const proxima = ex ? abaProximoCiclo(ex.ate) : '';

  async function conferir() {
    if (erroP) { avisar(erroP, 'erro'); return; }
    setRodando('conferir');
    try {
      const r = await planilhas.conferir(escritorio, periodo.de, periodo.ate);
      avisar(textoConferirPl(r), r.ok ? 'ok' : 'erro');
      if (r.ok) { setExecucao(undefined); setFiltro('pendencias'); setConsultor(''); ed.mudou(); }
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setRodando('');
  }
  async function criarAba() {
    if (!ex) return;
    if (!window.confirm(`Criar a aba vazia do próximo ciclo (${proxima}) nas planilhas dos consultores? É uma cópia da aba anterior com os campos limpos; antes, uma cópia de segurança de cada planilha é guardada.`)) return;
    setRodando('aba');
    try {
      const r = await planilhas.abaCiclo(escritorio, ex.id);
      avisar(textoAbaCicloPl(r), r.ok ? 'ok' : 'erro');
      ed.mudou();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setRodando('');
  }
  async function fecharPlanilhas() {
    if (!ex) return;
    if (!window.confirm('Já podemos fechar a planilha e preencher a OBS?\n\nAs planilhas dos consultores serão alteradas no Drive: OBS das linhas conferidas '
      + '(texto manual fica), VISTO nas planilhas vazias do ciclo e validação das linhas conferidas como apontamento (fica registrado que você validou). '
      + 'Antes, uma cópia de segurança de cada planilha é guardada.')) return;
    setRodando('fechar');
    let ok = false;
    try {
      const r = await planilhas.fechar(escritorio, ex.id);
      ok = r.ok;
      avisar(textoFecharPl(r), r.ok ? 'ok' : 'erro');
      ed.mudou();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setRodando('');
    if (ok) await criarAba();
  }

  const colunas = useMemo<Coluna<LinhaPlanilha>[]>(() => [
    { chave: 'consultor', titulo: 'Consultor', texto: l => l.consultor ?? '',
      render: l => <>{l.consultor}{!l.usuario_id && <><br /><small className="ajuda">pasta sem par no cadastro</small></>}</> },
    { chave: 'data', titulo: 'Data', valor: l => l.data, texto: l => dataBr(l.data) },
    { chave: 'situacao', titulo: 'Situação', valor: l => l.situacao, texto: l => ROTULO_PL[l.situacao] + (l.os ? ' · já tem OS' : ''),
      render: l => <><span className="pilula" style={{ background: COR[l.situacao], color: '#fff' }}>{ROTULO_PL[l.situacao]}</span>
        {l.os && <><br /><small className="pilula" style={{ background: '#fff2a8', color: '#5c4a00' }}>Já tem OS {l.os}</small></>}</> },
    { chave: 'cliente_planilha', titulo: 'Cliente (planilha)', texto: l => l.cliente_planilha ?? '' },
    { chave: 'horario', titulo: 'Horário (planilha)', texto: horarioPl },
    { chave: 'total', titulo: 'Total', alinhar: 'dir', valor: l => l.total_min ?? 0, texto: l => (l.total_min ? hm(l.total_min) : '') },
    { chave: 'tarefa_nome', titulo: 'Agenda', texto: l => l.tarefa_nome ?? '',
      render: l => (l.tarefa_id ? <a href={hashDe(caminhoEntidade('tarefa', l.tarefa_id))}>{l.tarefa_nome}</a> : <span className="ajuda">—</span>) },
    { chave: 'janela', titulo: 'Período', texto: l => l.janela ?? '' },
    { chave: 'parceiro', titulo: 'Cliente (agenda)', texto: l => l.parceiro ?? '' },
    { chave: 'apontamento', titulo: 'Apontamento', texto: l => l.apontamento ?? '' },
    { chave: 'observacao', titulo: 'Observação', texto: l => l.observacao ?? '' },
    { chave: 'obs_gravada', titulo: 'OBS na planilha', texto: l => l.obs_gravada ?? '' },
    { chave: 'validado', titulo: 'Validado', valor: l => l.validado_em ?? '', texto: l => (l.validado_em ? `Validado em ${dataBr(l.validado_em.slice(0, 10))}` : '') },
    { chave: 'local', titulo: 'Planilha / aba / linha', texto: l => (l.aba ? `${l.arquivo_nome ?? ''} · ${l.aba} · linha ${l.linha}` : '') },
    { chave: 'descricao', titulo: 'Descrição', texto: l => l.descricao ?? '' },
  ], []);

  const chip = (f: Filtro, rotulo: string, n?: number) => (
    <button type="button" className={`chip${filtro === f ? ' sel' : ''}`} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
      {rotulo}{n !== undefined && <> <small>{n}</small></>}
    </button>);

  return (
    <section className="cartao" aria-label="Conferência de Planilhas">
      <div className="pagina-topo">
        <h2 className="secao">Planilhas de horas × agendas</h2>
        <div>
          {ex && <Botao onClick={() => { try { relatorio(d!, doConsultor); } catch (e) { avisar((e as Error).message, 'erro'); } }}>Relatório por consultor</Botao>}
          {pode && ex && ultima && !ex.fechada_em && (
            <Botao onClick={fecharPlanilhas} carregando={rodando === 'fechar'} disabled={!!rodando}>Fechar planilhas…</Botao>)}
          {pode && ex && ultima && ex.fechada_em && !ex.aba_ciclo_em && (
            <Botao onClick={criarAba} carregando={rodando === 'aba'} disabled={!!rodando}>Criar aba {proxima}…</Botao>)}
        </div>
      </div>
      {pode && (
        <div className="barra-filtros" aria-label="Rodar a conferência de planilhas">
          <label className="ajuda">De <input type="date" aria-label="Data inicial" value={periodo.de} max={hoje} onChange={e => setPeriodo(p => ({ ...p, de: e.target.value }))} /></label>
          <label className="ajuda">Até <input type="date" aria-label="Data final" value={periodo.ate} max={hoje} onChange={e => setPeriodo(p => ({ ...p, ate: e.target.value }))} /></label>
          <Botao variante="primario" onClick={conferir} carregando={rodando === 'conferir'} disabled={!!rodando || !!erroP}>Conferir planilhas</Botao>
          {erroP && <small className="msg-erro">{erroP}</small>}
        </div>
      )}
      {d && <p className="ajuda" data-testid="planilhas-quando">{textoExecucaoPl(ex)}</p>}
      {d && d.execucoes.length > 1 && (
        <label className="ajuda">Conferências anteriores <select aria-label="Escolher a conferência de planilhas" value={ex?.id ?? ''} onChange={e => setExecucao(e.target.value || undefined)}>
          {d.execucoes.map(x => <option key={x.id} value={x.id}>{`${dataBr(x.de)} a ${dataBr(x.ate)} · ${new Date(x.criado_em).toLocaleString('pt-BR').slice(0, 17)}${x.consultor ? ` · ${x.consultor}` : ''}${x.fechada_em ? ' · fechada' : ''}`}</option>)}
        </select></label>
      )}
      {ex && d!.todos && (ex.resumo?.com_erro?.length || ex.resumo?.sem_planilha?.length || ex.resumo?.sem_cadastro?.length) ? (
        <p className="msg-erro" data-testid="planilhas-avisos">
          {ex.resumo?.com_erro?.length ? `Não consegui ler: ${ex.resumo.com_erro.join(', ')}. ` : ''}
          {ex.resumo?.sem_planilha?.length ? `Pasta sem planilha: ${ex.resumo.sem_planilha.join(', ')}. ` : ''}
          {ex.resumo?.sem_cadastro?.length ? `Pasta sem consultor no cadastro: ${ex.resumo.sem_cadastro.join(', ')}.` : ''}
        </p>) : null}
      {ex?.fechamento && d!.todos && (
        <p className="ajuda" data-testid="planilhas-fechamento">
          Fechamento: {ex.fechamento.arquivos.reduce((s, a) => s + (a.escritas ?? 0), 0)} OBS preenchida(s), {ex.fechamento.criados + ex.fechamento.validados} linha(s) validada(s)
          {ex.fechamento.arquivos.some(a => a.erro) && <> · não gravadas: {ex.fechamento.arquivos.filter(a => a.erro).map(a => `${a.pasta} (${a.erro})`).join('; ')}</>}
        </p>)}
      {ex && (
        <div className="barra-filtros">
          <div className="chips" role="group" aria-label="Situação">
            {chip('pendencias', 'Pendências', t.pendencias)}
            {chip('horario', 'Horário', t.horario)}
            {chip('cliente', 'Cliente', t.cliente)}
            {chip('falta', 'Falta na planilha', t.falta)}
            {chip('sem_tarefa', 'Sem agenda', t.sem_tarefa)}
            {t.duplicado > 0 && chip('duplicado', 'Duplicado', t.duplicado)}
            {t.conflito > 0 && chip('conflito', 'Conflito', t.conflito)}
            {t.com_os > 0 && chip('com_os', 'Já tem OS', t.com_os)}
            {chip('conferido', 'Conferidos', t.conferido)}
            {chip('todas', 'Todas', doConsultor.length)}
          </div>
          {d!.todos && consultores.length > 1 && (
            <label className="ajuda">Consultor <select aria-label="Filtrar consultor" value={consultor} onChange={e => setConsultor(e.target.value)}>
              <option value="">Todos</option>{consultores.map(n => <option key={n} value={n}>{n}</option>)}
            </select></label>)}
        </div>
      )}
      {ex && <section className="indicadores" aria-label="Totais da conferência de planilhas">
        <div className="indicador"><small>Conferidos</small><strong data-testid="planilhas-conferidos">{t.conferido}</strong></div>
        <div className="indicador"><small>Com diferença</small><strong>{t.horario + t.cliente}</strong></div>
        <div className="indicador"><small>Falta na planilha</small><strong data-testid="planilhas-falta">{t.falta}</strong></div>
        <div className="indicador"><small>Sem agenda</small><strong>{t.sem_tarefa}</strong></div>
        <div className="indicador"><small>Horas na planilha</small><strong>{hm(t.min_planilha)}</strong></div>
      </section>}
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {ex && <Tabela id="conferencia-planilhas" nome={`Conferencia Planilhas ${ex.de} a ${ex.ate}`} colunas={colunas} linhas={vistas}
        chave={l => l.id} tamanhoInicial={30}
        vazio={filtro === 'pendencias' ? 'Nenhuma pendência nesta conferência.' : 'Nenhuma linha nesta situação.'} />}
      {c.carregando && !d && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {d && !d.todos && <p className="ajuda">Você vê só as suas linhas; as da equipe aparecem para a gerência.</p>}
      <p className="ajuda"><small>{ORIGEM} Conferir só lê as planilhas. Fechar (depois do "Sim") preenche a OBS em vermelho negrito (texto manual fica; o primeiro VISTO mantém a data), marca VISTO na planilha vazia do ciclo e valida as linhas conferidas como apontamento da agenda, com quem validou; depois, outro "Sim" cria a aba vazia do próximo ciclo. Antes de cada gravação a planilha é guardada como estava. Nunca apaga agenda nem apontamento.</small></p>
    </section>
  );
}
