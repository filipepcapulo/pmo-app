/*
 * PMO BP-MS — versão web (iPhone / qualquer navegador).
 *
 * Segurança: este código NÃO tem nenhum token nem ID de integração. Tudo passa
 * pelo servidor do app (Google Apps Script), que guarda os tokens do ClickUp e
 * do GitHub e confere, a cada pedido, a sessão e as permissões do usuário.
 * O acesso é por e-mail autorizado + código enviado por e-mail; a sessão fica
 * guardada no aparelho (não pede de novo a cada abertura).
 */
'use strict';

const VERSAO_WEB = '2.7.1';
// URL da implantação do servidor (Apps Script > Implantar > App da Web). Não é segredo:
// sem um e-mail autorizado e o código enviado por e-mail, ela não devolve nada.
const SERVIDOR = 'https://script.google.com/macros/s/AKfycbzTcboB69tml5f_quYwfbVA1n0MDUTrZ8y3gA3EQsydEHA-5EWWHh-BHLy9dbMJnMUw/exec';
// Módulo Reembolso KM: só para este e-mail (o servidor confere de novo a cada pedido).
const DONO_REEMBOLSO = 'filipe.capulo@sankhya.com.br';

// ---------------------------------------------------------------- utilidades

const $ = (sel, raiz = document) => raiz.querySelector(sel);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const guardar = {
  ler(k) { try { const v = localStorage.getItem('pmo.' + k); return v == null ? null : JSON.parse(v); } catch { return null; } },
  gravar(k, v) { try { localStorage.setItem('pmo.' + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  apagar(k) { try { localStorage.removeItem('pmo.' + k); } catch { /* ignora */ } },
};
function horas(h) {
  h = Number(h) || 0;
  return (h % 1 === 0 ? String(h) : h.toFixed(1).replace('.', ',')) + 'h';
}

const pad2 = n => String(n).padStart(2, '0');
function isoHoje() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function parseDia(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function dataCurta(iso) { const d = parseDia(iso); return d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}` : (iso || ''); }
function maiuscula1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function diaExtenso(iso) {
  const d = parseDia(iso);
  return d ? maiuscula1(d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })) : iso;
}
function geradoEmTexto(s) {
  const d = new Date(s);
  if (isNaN(d)) return s || '';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} às ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function semAcento(s) { return String(s || '').normalize('NFD').replace(/\p{Mn}+/gu, '').toLowerCase(); }
function cor(c, padrao = '#87909e') { return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : padrao; }
function corAlfa(hex, a) {
  hex = cor(hex).slice(1);
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const n = parseInt(hex.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Ícones (SVG em linha, traço simples no estilo SF Symbols)
const IC = {
  voltar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  recarregar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
  compartilhar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  baixo: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  seta: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  calendario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  pessoa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  lista: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
  sino: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  ferramenta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>',
  busca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  filtros: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  sair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/></svg>',
  chave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/></svg>',
  lapis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
  kanban: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/></svg>',
  monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  celular: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
  carro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14v-5l-2-5H7l-2 5z"/><path d="M5 12h14"/><circle cx="8" cy="17" r="1.8"/><circle cx="16" cy="17" r="1.8"/></svg>',
  adicionar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
};

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2200);
}

// ---------------------------------------------------------------- visualização celular / PC

/*
 * Ícone no canto superior direito de todas as telas: alterna entre a tela de
 * celular (coluna estreita) e a de PC (larga). A escolha fica no aparelho; sem
 * escolha, segue a largura da tela.
 */
function modoVisual() {
  const v = guardar.ler('visual');
  return v === 'pc' || v === 'celular' ? v : (window.innerWidth >= 900 ? 'pc' : 'celular');
}
function botaoVisual() {
  const pc = modoVisual() === 'pc';
  const rot = pc ? 'Ver como celular' : 'Ver como PC';
  return `<button class="icone-btn" data-visual aria-label="${rot}" title="${rot}">${pc ? IC.celular : IC.monitor}</button>`;
}
function aplicarVisual() {
  const m = modoVisual();
  document.body.classList.toggle('modo-pc', m === 'pc');
  document.body.classList.toggle('modo-celular', m === 'celular');
  document.querySelectorAll('[data-visual]').forEach(b => { b.outerHTML = botaoVisual(); });
}
document.addEventListener('click', ev => {
  if (!ev.target.closest('[data-visual]')) return;
  guardar.gravar('visual', modoVisual() === 'pc' ? 'celular' : 'pc');
  aplicarVisual();
  toast(modoVisual() === 'pc' ? 'Visualização de PC' : 'Visualização de celular');
  if (moduloAtual) redesenhar(moduloAtual, true);
});
window.addEventListener('resize', () => { if (!guardar.ler('visual')) aplicarVisual(); });

// ---------------------------------------------------------------- servidor

class ErroApi extends Error {
  constructor(codigo, msg, extra) { super(msg || codigo); this.codigo = codigo; Object.assign(this, extra || {}); }
}

const sessao = {
  get token() { return guardar.ler('sessao') || ''; },
  get usuario() { return guardar.ler('usuario') || null; },
};
const pode = p => !!(sessao.usuario && sessao.usuario[p]);
const ehDonoReembolso = () => !!(sessao.usuario && String(sessao.usuario.email || '').toLowerCase() === DONO_REEMBOLSO);
const temModulo = id => id === 'reembolso' ? ehDonoReembolso() : !!(sessao.usuario && (sessao.usuario.modulos || []).includes(id));

function limparSessaoLocal() {
  try { Object.keys(localStorage).filter(k => k.startsWith('pmo.') && k !== 'pmo.ultimoEmail').forEach(k => localStorage.removeItem(k)); } catch { /* ignora */ }
  for (const k of Object.keys(estados)) delete estados[k];
}

/** Chama o servidor. Sessão inválida -> volta para a tela de acesso. */
async function api(acao, dados = {}, { tempo = 60000 } = {}) {
  const corpo = JSON.stringify({ acao, sessao: sessao.token, plataforma: 'web', versao: VERSAO_WEB, ...dados });
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), tempo);
  let r;
  try {
    // text/plain: pedido "simples" (sem preflight), o que o Apps Script aceita
    r = await fetch(SERVIDOR, { method: 'POST', body: corpo, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal, redirect: 'follow', cache: 'no-store' });
  } catch (e) {
    throw new ErroApi('REDE', e.name === 'AbortError' ? 'O servidor demorou para responder. Tente de novo.' : 'Sem conexão com a internet.');
  } finally { clearTimeout(t); }
  let j;
  try { j = await r.json(); } catch { throw new ErroApi('SERVIDOR', `Resposta inválida do servidor (HTTP ${r.status}).`); }
  if (!j.ok) {
    if (j.codigo === 'SESSAO_INVALIDA') {
      limparSessaoLocal();
      setTimeout(() => { irPara(''); mostrar(); toast(j.erro || 'Entre novamente.'); }, 0);
    }
    throw new ErroApi(j.codigo, j.erro, j);
  }
  return j;
}

function mensagemAmigavel(e) {
  if (e instanceof ErroApi) return e.message;
  if (e instanceof TypeError) return 'Sem conexão com a internet.';
  return e?.message || String(e);
}

async function lerArquivoServidor(arquivo, forcar) {
  return (await api('dados', { arquivo, forcar: !!forcar })).conteudo;
}
async function listarExecucoes(wf, n = 10) { return (await api('execucoes', { workflow: wf, n })).execucoes; }
async function buscarExecucao(id) { return (await api('execucao', { id })).execucao; }
async function dispararWorkflow(wf) { return (await api('disparar', { workflow: wf })).id; }

const espera = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------- estado dos módulos

/*
 * Cada módulo tem: dados (JSON interpretado), erro, carregando e o estado do
 * botão "Atualizar agora" ({tipo: parada|andamento|concluida|falhou, msg, link}).
 * Os últimos dados ficam guardados no aparelho para abrir na hora.
 */
const estados = {};

function estadoDe(m) {
  if (!estados[m.id]) {
    const st = { dados: null, erro: null, carregando: false, atualizacao: { tipo: 'parada' }, ui: m.uiInicial ? m.uiInicial() : {}, lidoEm: 0 };
    const salvo = guardar.ler('json.' + m.arquivo);
    if (salvo) { try { st.dados = m.interpretar(salvo); } catch { /* ignora cache inválido */ } }
    estados[m.id] = st;
  }
  return estados[m.id];
}

async function recarregar(m, forcar = false) {
  const st = estadoDe(m);
  if (st.carregando && !forcar) return !st.erro; // já está buscando (ex.: pré-carga)
  st.carregando = true; st.erro = null; redesenhar(m);
  try {
    const json = m.ler ? await m.ler(forcar) : await lerArquivoServidor(m.arquivo, forcar);
    st.dados = m.interpretar(json);
    guardar.gravar('json.' + m.arquivo, json);
    st.lidoEm = Date.now();
    return true;
  } catch (e) {
    st.erro = mensagemAmigavel(e);
    return false;
  } finally {
    st.carregando = false; redesenhar(m);
  }
}

async function atualizarAgora(m) {
  const st = estadoDe(m);
  if (st.atualizacao.tipo === 'andamento') return;
  const setA = a => { st.atualizacao = a; redesenhar(m); };
  try {
    setA({ tipo: 'andamento', msg: 'Conectando…' });
    const recentes = await listarExecucoes(m.workflow);
    const ativa = recentes.find(x => !x.terminou);
    let id;
    if (ativa) {
      id = ativa.id;
    } else {
      setA({ tipo: 'andamento', msg: 'Disparando a atualização…' });
      const antes = new Set(recentes.map(x => x.id));
      id = await dispararWorkflow(m.workflow);
      if (!id) id = await localizarNova(m.workflow, antes);
    }
    await acompanhar(m, id);
  } catch (e) {
    setA({ tipo: 'falhou', msg: mensagemAmigavel(e) });
  }
}

async function localizarNova(wf, antes) {
  for (let i = 0; i < 15; i++) {
    await espera(3000);
    const nova = (await listarExecucoes(wf, 5)).find(x => !antes.has(x.id));
    if (nova) return nova.id;
  }
  throw new Error('A atualização foi disparada, mas ainda não apareceu. Tente de novo em instantes.');
}

async function acompanhar(m, id) {
  const st = estadoDe(m);
  const setA = a => { st.atualizacao = a; redesenhar(m); };
  const inicio = Date.now();
  for (;;) {
    const ex = await buscarExecucao(id);
    if (ex.terminou) {
      if (ex.conclusao === 'success') {
        setA({ tipo: 'andamento', msg: 'Baixando os dados novos…', link: ex.link });
        if (await recarregar(m, true)) {
          setA({ tipo: 'concluida', msg: 'Dados atualizados.' });
          await espera(4000);
          if (st.atualizacao.tipo === 'concluida') setA({ tipo: 'parada' });
        } else {
          setA({ tipo: 'falhou', msg: st.erro || 'Não consegui baixar os dados novos.', link: ex.link });
        }
      } else {
        setA({ tipo: 'falhou', msg: `A atualização terminou com erro (${ex.conclusao || 'sem status'}). Avise o administrador.`, link: ex.link });
      }
      return;
    }
    setA({ tipo: 'andamento', msg: ex.status === 'in_progress' ? m.etapa : 'Na fila… (pode levar alguns minutos)', link: ex.link });
    if (Date.now() - inicio > 15 * 60000) {
      setA({ tipo: 'falhou', msg: 'A atualização está demorando mais que o normal. Ela continua rodando; recarregue daqui a pouco.', link: ex.link });
      return;
    }
    await espera(5000);
  }
}

/** Ao abrir um módulo: se já houver atualização rodando no GitHub, mostra o andamento. */
async function acompanharSeRodando(m) {
  const st = estadoDe(m);
  if (!m.workflow || st.atualizacao.tipo === 'andamento') return;
  try {
    const ativa = (await listarExecucoes(m.workflow, 5)).find(x => !x.terminou);
    if (ativa && st.atualizacao.tipo !== 'andamento') {
      st.atualizacao = { tipo: 'andamento', msg: 'Atualização em andamento…', link: ativa.link };
      redesenhar(m);
      acompanhar(m, ativa.id).catch(e => { st.atualizacao = { tipo: 'falhou', msg: mensagemAmigavel(e) }; redesenhar(m); });
    }
  } catch { /* sem internet: segue com os dados guardados */ }
}

// ---------------------------------------------------------------- navegação e desenho

let moduloAtual = null;
const MODULOS = []; // preenchido mais abaixo

function rota() { return (location.hash || '').replace(/^#\/?/, ''); }

function irPara(id) { location.hash = id ? '#/' + id : ''; }

window.addEventListener('hashchange', mostrar);

function mostrar() {
  fecharFolha();
  const app = $('#app');
  if (!sessao.token || !sessao.usuario) { moduloAtual = null; telaLogin(app); return; }
  const r = rota();
  window.scrollTo(0, 0);
  if (r === 'permissoes' && pode('admin')) { moduloAtual = null; telaPermissoes(app); return; }
  if (r === 'historico') { moduloAtual = null; telaHistorico(app); return; }
  if (r === 'notificacoes') { moduloAtual = null; telaNotificacoes(app); return; }
  const [r0, r1] = r.split('/'); // ex.: reembolso/relatorio (link da notificação)
  const m = MODULOS.find(x => x.id === r0 && temModulo(x.id));
  moduloAtual = m || null;
  if (!m) { telaInicio(app); return; }
  if (r1 && m.aoRota) m.aoRota(r1);
  app.innerHTML = `
    <header class="barra">
      <button class="icone-btn" data-nav="voltar" aria-label="Voltar">${IC.voltar}</button>
      <div class="titulo"><h1>${esc(m.titulo)}</h1><div class="sub" id="sub"></div></div>
      <div id="acoes-barra"></div>
      <button class="icone-btn" id="btn-recarregar" aria-label="Recarregar">${IC.recarregar}</button>
      ${botaoVisual()}
    </header>
    <div id="abas"></div>
    <div id="aviso"></div>
    <main class="conteudo" id="conteudo"></main>
    <button class="fab" id="fab"></button>`;
  $('[data-nav="voltar"]').onclick = () => irPara('');
  $('#btn-recarregar').onclick = () => recarregar(m, true);
  $('#fab').onclick = () => atualizarAgora(m);
  const st = estadoDe(m);
  redesenhar(m, true);
  if (!st.carregando && (!st.lidoEm || Date.now() - st.lidoEm > 30000)) recarregar(m);
  acompanharSeRodando(m);
}

/** Redesenha a tela do módulo (só se ele estiver aberto). */
function redesenhar(m, inteiro = false) {
  if (moduloAtual !== m) return;
  const st = estadoDe(m);
  $('#sub').textContent = st.dados ? 'Atualizado em ' + geradoEmTexto(st.dados.geradoEm) : '';
  const br = $('#btn-recarregar');
  br.classList.toggle('girando', st.carregando);
  const a = st.atualizacao;
  const rodando = a.tipo === 'andamento';
  $('#fab').className = 'fab' + (rodando ? ' rodando' : '');
  $('#fab').hidden = !m.workflow; // Backlog Desenvolvimento lê o ClickUp ao vivo
  $('#fab').innerHTML = rodando ? '<span class="spinner p" style="border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> Atualizando…' : IC.recarregar + ' Atualizar agora';
  $('#aviso').innerHTML = a.tipo === 'parada' ? '' : `
    <div class="aviso ${a.tipo === 'falhou' ? 'falhou' : a.tipo === 'concluida' ? 'ok' : 'andamento'}">
      ${rodando ? '<span class="spinner p"></span>' : ''}
      <span class="msg">${esc(a.msg)}</span>
      ${a.link ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">Ver log</a>` : ''}
      ${!rodando ? `<button data-fechar-aviso aria-label="Fechar">${IC.x}</button>` : ''}
    </div>`;
  const fa = $('[data-fechar-aviso]');
  if (fa) fa.onclick = () => { st.atualizacao = { tipo: 'parada' }; redesenhar(m); };

  const cont = $('#conteudo');
  if (!st.dados) {
    $('#abas').innerHTML = ''; $('#acoes-barra').innerHTML = '';
    cont.innerHTML = st.erro
      ? `<div class="centro"><div>${esc(st.erro)}</div><button class="btn primario" id="tentar">Tentar de novo</button></div>`
      : '<div class="centro"><div class="spinner"></div></div>';
    const t = $('#tentar'); if (t) t.onclick = () => recarregar(m, true);
    return;
  }
  m.desenhar(st, { cont, abas: $('#abas'), acoes: $('#acoes-barra'), inteiro });
}

// Eventos: cada elemento com data-a="acao" chama m.acao(nome, elemento, estado)
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]');
  if (!el || !moduloAtual) return;
  const m = moduloAtual;
  const st = estadoDe(m);
  if (m.acao(el.dataset.a, el, st, ev) !== false) redesenhar(m);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !moduloAtual) return;
  const st = estadoDe(moduloAtual);
  if (Date.now() - st.lidoEm > 60000) recarregar(moduloAtual);
});

// ---------------------------------------------------------------- folha (bottom sheet)

function abrirFolha(html, aoMontar) {
  const f = $('#folha');
  f.innerHTML = `<div class="folha" role="dialog"><div class="alca"></div>${html}</div>`;
  f.hidden = false;
  f.onclick = ev => { if (ev.target === f) fecharFolha(); };
  if (aoMontar) aoMontar($('.folha', f));
}
function fecharFolha() { const f = $('#folha'); if (f) { f.hidden = true; f.innerHTML = ''; } }

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); toast('Copiado'); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = texto; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copiado'); } catch { toast('Não consegui copiar'); }
    ta.remove();
  }
}
function whatsapp(texto) { window.location.href = 'https://wa.me/?text=' + encodeURIComponent(texto); }
async function compartilhar(texto) {
  if (navigator.share) { try { await navigator.share({ text: texto }); } catch { /* cancelado */ } }
  else copiar(texto);
}

/** Folha padrão de envio de texto (WhatsApp / Compartilhar / Copiar). */
function folhaEnviar(titulo, texto) {
  abrirFolha(`<h3>${esc(titulo)}</h3>
    <div class="corpo"><div class="pre" style="background:var(--superficie-2);border-radius:10px;padding:10px;max-height:40vh;overflow:auto">${esc(texto)}</div></div>
    <div class="rodape-f">
      <button class="btn contorno" id="f-copiar">Copiar</button>
      <button class="btn contorno" id="f-outros">Outros</button>
      <button class="btn primario" id="f-wa">WhatsApp</button>
    </div>`, f => {
    $('#f-copiar', f).onclick = () => { copiar(texto); fecharFolha(); };
    $('#f-outros', f).onclick = () => { compartilhar(texto); fecharFolha(); };
    $('#f-wa', f).onclick = () => { whatsapp(texto); fecharFolha(); };
  });
}

// ---------------------------------------------------------------- tela de acesso

function nomeAparelho() {
  const ua = navigator.userAgent;
  const so = /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) ? 'iPad' : /android/i.test(ua) ? 'Android' : /mac/i.test(ua) ? 'Mac' : /windows/i.test(ua) ? 'Windows' : 'Navegador';
  return so + (instaladoNaTela() ? ' (app)' : ' (navegador)');
}

function telaLogin(app) {
  const ui = { etapa: 'email', email: guardar.ler('ultimoEmail') || '' };
  const desenhar = (erro = '', info = '') => {
    app.innerHTML = `
      <header class="barra"><div class="titulo inicio"><h1>PMO BP-MS</h1></div>${botaoVisual()}</header>
      <div class="login">
        <h2>Acesso</h2>
        ${ui.etapa === 'email' ? `
          <p class="muted">Informe o seu e-mail. Se ele tiver acesso, você recebe um código para entrar.</p>
          <input id="em" class="campo" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="nome@sankhya.com.br" value="${esc(ui.email)}">
          <div class="erro-txt" id="erro">${esc(erro)}</div>
          <button id="ok" class="btn primario largo" style="margin-top:14px">Enviar código</button>` : `
          <p class="muted">${esc(ui.info || info || 'Enviamos um código para')} <b>${esc(ui.email)}</b>. Digite-o abaixo (vale 10 minutos).</p>
          <input id="cod" class="campo codigo" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
          <div class="erro-txt" id="erro">${esc(erro)}</div>
          <button id="ok" class="btn primario largo" style="margin-top:14px">Entrar</button>
          <div style="display:flex;justify-content:space-between;margin-top:10px">
            <button class="btn texto" id="trocar">Trocar e-mail</button><button class="btn texto" id="reenviar">Reenviar código</button>
          </div>`}
        <p class="muted" style="margin-top:22px">Depois de entrar, o app lembra do seu acesso neste aparelho.</p>
      </div>`;
    const b = $('#ok');
    const ocupado = t => { b.disabled = true; b.innerHTML = `<span class="spinner p" style="border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> ${t}`; };
    const pedirCodigo = async () => {
      ui.email = ($('#em') ? $('#em').value : ui.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ui.email)) { $('#erro').textContent = 'Informe um e-mail válido.'; return; }
      ocupado('Enviando…');
      try {
        const r = await api('iniciar', { email: ui.email });
        guardar.gravar('ultimoEmail', ui.email);
        ui.etapa = 'codigo'; ui.info = 'Se este e-mail tiver acesso, enviamos um código para'; desenhar();
        $('#cod').focus();
      } catch (e) { desenhar(mensagemAmigavel(e)); }
    };
    if (ui.etapa === 'email') {
      b.onclick = pedirCodigo;
      $('#em').onkeydown = e => { if (e.key === 'Enter') pedirCodigo(); };
      return;
    }
    const entrar = async () => {
      const codigo = $('#cod').value.replace(/\D/g, '');
      if (codigo.length !== 6) { $('#erro').textContent = 'O código tem 6 números.'; return; }
      ocupado('Conferindo…');
      try {
        const r = await api('entrar', { email: ui.email, codigo, aparelho: nomeAparelho() });
        guardar.gravar('sessao', r.sessao);
        guardar.gravar('usuario', r.usuario);
        irPara(''); mostrar();
        preCarregar().then(atualizarVencidos);
      } catch (e) { desenhar(mensagemAmigavel(e)); }
    };
    b.onclick = entrar;
    $('#cod').oninput = e => { if (e.target.value.replace(/\D/g, '').length === 6) entrar(); };
    $('#trocar').onclick = () => { ui.etapa = 'email'; desenhar(); };
    $('#reenviar').onclick = pedirCodigo;
  };
  desenhar();
}

/** Confere no servidor se o acesso continua valendo e atualiza as permissões. */
async function conferirAcesso() {
  try {
    const r = await api('eu');
    const antes = JSON.stringify(sessao.usuario);
    guardar.gravar('usuario', r.usuario);
    if (antes !== JSON.stringify(r.usuario) && !moduloAtual) mostrar();
  } catch { /* sem internet: segue com o que tem; sessão inválida já volta ao login */ }
}

// ---------------------------------------------------------------- tela inicial

function instaladoNaTela() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

function telaInicio(app) {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const u = sessao.usuario;
  const meus = MODULOS.filter(m => temModulo(m.id));
  const extras = [];
  if (pode('agendar') || pode('editar')) extras.push({ id: 'historico', titulo: 'Agendamentos feitos', descricao: 'O que você gravou no ClickUp e se deu certo', icone: IC.ok });
  if (tiposNotificacao().length) extras.push({ id: 'notificacoes', titulo: 'Notificações', descricao: guardar.ler('push.tipos') ? 'Ativas neste aparelho' : 'Avisos no celular (ociosidade, reembolso)', icone: IC.sino });
  if (pode('admin')) extras.push({ id: 'permissoes', titulo: 'Permissões', descricao: 'Quem pode acessar o app e o quê', icone: IC.chave });
  app.innerHTML = `
    <header class="barra">
      <div class="titulo inicio"><h1>PMO BP-MS</h1><div class="sub">${esc(u.nome || u.email)}</div></div>
      <button class="icone-btn" id="sair" aria-label="Sair">${IC.sair}</button>
      ${botaoVisual()}
    </header>
    ${ios && !instaladoNaTela() ? `<div class="dica">${IC.adicionar}<div><b>Instale no iPhone:</b> toque em <b>Compartilhar</b> no Safari e depois em <b>Adicionar à Tela de Início</b>. O app abre em tela cheia, como um app normal.</div></div>` : ''}
    <div class="lista-modulos">
      ${meus.length ? '' : '<div class="vazio">Seu acesso ainda não tem módulos liberados. Fale com o administrador.</div>'}
      ${[...meus, ...extras].map(m => `
        <button class="modulo" data-mod="${m.id}">
          <span class="ic">${m.icone}</span>
          <span><b>${esc(m.titulo)}</b><span>${esc(m.descricao)}</span></span>
          <span class="seta">${IC.seta}</span>
        </button>`).join('')}
    </div>
    <div class="rodape">Versão web ${VERSAO_WEB} · ${esc(u.email)}</div>`;
  app.querySelectorAll('[data-mod]').forEach(b => { b.onclick = () => irPara(b.dataset.mod); });
  $('#sair').onclick = () => {
    abrirFolha(`<h3>Sair deste aparelho?</h3><p class="muted">Para entrar de novo, será preciso pedir um novo código por e-mail.</p>
      <div class="rodape-f"><button class="btn contorno" id="nao">Cancelar</button><button class="btn primario" id="sim">Sair</button></div>`, f => {
      $('#nao', f).onclick = fecharFolha;
      $('#sim', f).onclick = async () => {
        try { await cancelarPushAparelho(); } catch { /* segue saindo */ }
        try { await api('sair', {}, { tempo: 8000 }); } catch { /* sai mesmo sem internet */ }
        limparSessaoLocal();
        irPara(''); mostrar();
      };
    });
  };
}

// ================================================================= AGENDAR / EDITAR NO CLICKUP

/*
 * Formulário único para incluir (subtarefa nova dentro da demanda) ou alterar
 * uma agenda. Regras da skill agendar-atendimento-clickup: título, consultor,
 * data, período e parceiro obrigatórios; observações vão no Detalhamento;
 * Etapa "Atendimento avulso", Agendamento "Agendar", Experience "Não lançado"
 * e Apontamento "OS Experience" por padrão; vários dias = uma subtarefa por dia,
 * cada dia com o período geral ou um período próprio (um envio ao servidor por período).
 * O servidor grava, lê a tarefa de volta e confere campo a campo — o resultado
 * (ok / parcial / erro) aparece no fim e fica no histórico do aparelho.
 */

const PERIODOS_RAPIDOS = [['08h-12h', 'Manhã'], ['14h-18h', 'Tarde'], ['08h-18h', 'Dia inteiro']];
let opcoesCache = null;
async function opcoesAgenda(forcar) {
  if (!forcar && opcoesCache && Date.now() - opcoesCache.em < 10 * 60000) return opcoesCache.dados;
  const r = await api('agendaOpcoes');
  opcoesCache = { em: Date.now(), dados: r };
  return r;
}
const idTarefa = url => { const m = /\/t\/(?:\d+\/)?([a-z0-9]+)/i.exec(url || ''); return m ? m[1] : String(url || ''); };
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}
function parceiroPorNome(ops, ...nomes) {
  for (const n of nomes) {
    const t = semAcento(n).trim();
    if (!t) continue;
    const exato = ops.parceiros.find(p => semAcento(p.nome) === t);
    if (exato) return exato.id;
    const p1 = t.split(/[\s-]+/)[0];
    const parc = ops.parceiros.filter(p => semAcento(p.nome).split(/[\s-]+/)[0] === p1);
    if (parc.length === 1) return parc[0].id;
  }
  return '';
}

function horasPeriodo(p) {
  const fixo = { '08h-12h': 4, '13h-17h': 4, '14h-18h': 4, '08h-18h': 8 }[p];
  if (fixo) return fixo;
  const m = /^(\d{1,2})h-(\d{1,2})h$/.exec(p || '');
  if (!m) return 0;
  let h = +m[2] - +m[1];
  if (+m[1] <= 12 && +m[2] >= 13) h -= 1;
  return Math.max(0, Math.min(8, h));
}

/** Horário livre tocado → opção do campo Período: a exata ou a maior que cabe dentro dele. */
function periodoDisponivel(p, ops) {
  const lista = [...new Set([...PERIODOS_RAPIDOS.map(x => x[0]), ...((ops && ops.periodos) || [])])];
  if (lista.includes(p)) return p;
  const m = /(\d{1,2})h(\d{2})?\s*-\s*(\d{1,2})h(\d{2})?/;
  const fx = q => { const r = m.exec(q || ''); return r ? [+r[1] + (+r[2] || 0) / 60, +r[3] + (+r[4] || 0) / 60] : null; };
  const alvo = fx(p);
  if (!alvo) return '';
  let melhor = '', dur = 0;
  for (const q of lista) {
    const f = fx(q);
    if (f && f[0] >= alvo[0] - 1e-9 && f[1] <= alvo[1] + 1e-9 && f[1] - f[0] > dur) { melhor = q; dur = f[1] - f[0]; }
  }
  return melhor;
}

function registrarHistorico(item) {
  const h = guardar.ler('historico') || [];
  h.unshift(item);
  guardar.gravar('historico', h.slice(0, 60));
}

/**
 * inicial: { id } para editar; ou { pai: {id, nome, local}, consultorId, data, parceiro, cliente } para agendar.
 * Backlog Desenvolvimento: paiFixo (não troca a demanda: a agenda vira subtarefa do item),
 * exigirData (começa sem data: o usuário informa a data de vencimento) e etapaPai
 * (a agenda herda a Etapa da tarefa-pai, Personalização / Customização).
 * Agenda dos Consultores: { copiaDe: id } abre "Alocar mais" (nova agenda com os dados da
 * existente, para escolher outras datas/horários) e { periodo } já marca o horário livre tocado.
 */
async function abrirFormAgenda(inicial = {}) {
  const editando = !!inicial.id, copia = !editando && !!inicial.copiaDe;
  if (!pode(editando ? 'editar' : 'agendar')) { toast('Seu acesso não permite ' + (editando ? 'editar' : 'agendar') + '.'); return; }
  const f = {
    op: uuid(), estado: 'carregando', erro: '', resultado: null,
    id: inicial.id || '', paiId: inicial.pai?.id || '', paiNome: inicial.pai?.nome || '', paiLocal: inicial.pai?.local || '',
    pastaId: '', demandas: null, carregandoDemandas: false,
    paiFixo: !!inicial.paiFixo, exigirData: !!inicial.exigirData, etapaPai: !!inicial.etapaPai,
    titulo: '', consultorId: inicial.consultorId || '',
    datas: inicial.exigirData || copia ? [] : [inicial.data && inicial.data >= isoHoje() ? inicial.data : isoHoje()],
    copia, periodo: '08h-12h', agenda: 'Remoto', apontamento: 'OS Experience', parceiroId: '', detalhamento: '', status: '',
    // período próprio por dia (vazio = usa o período geral) e id de operação por período (não duplica ao repetir)
    periodosDia: {}, opsPeriodo: {},
  };
  let ops = null;
  abrirFolha('<h3>' + (editando ? 'Editar agenda' : copia ? 'Alocar mais agendas' : 'Agendar') + '</h3><div class="corpo" id="fa"></div><div class="rodape-f" id="fa-rod"></div>', raiz => {
    raiz.classList.add('alta');
  });
  const folha = $('#folha .folha');
  const desenhar = () => { if (folha.isConnected) desenharFormAgenda(folha, f, ops, editando, acoes); };
  const acoes = {
    desenhar,
    async escolherPasta(id) {
      f.pastaId = id; f.paiId = ''; f.demandas = null;
      if (!id) { desenhar(); return; }
      f.carregandoDemandas = true; desenhar();
      try { f.demandas = (await api('agendaDemandas', { pastaId: id })).demandas; }
      catch (e) { f.erro = mensagemAmigavel(e); }
      f.carregandoDemandas = false; desenhar();
    },
    async salvar() {
      const faltam = [];
      if (!f.titulo.trim()) faltam.push('título');
      if (!f.consultorId) faltam.push('consultor');
      if (!f.datas.length) faltam.push(f.exigirData ? 'data de vencimento' : 'data');
      const perDe = d => (!editando && f.periodosDia[d]) || f.periodo;
      if (f.datas.some(d => !perDe(d))) faltam.push('período');
      if (!editando && !f.paiId) faltam.push('demanda');
      if (faltam.length) { f.erro = 'Preencha: ' + faltam.join(', ') + '.'; desenhar(); return; }
      f.estado = 'salvando'; f.erro = ''; desenhar();
      const dados = {
        id: f.id || undefined, paiId: f.paiId || undefined, titulo: f.titulo.trim(), consultorId: f.consultorId,
        datas: [...f.datas].sort(), periodo: f.periodo, agenda: f.agenda, apontamento: f.apontamento,
        parceiroId: f.parceiroId, detalhamento: f.detalhamento,
      };
      if (f.etapaPai) dados.etapaPai = true;
      // um envio por período: os dias com o mesmo período vão juntos
      const grupos = new Map();
      for (const d of dados.datas) { const p = perDe(d); if (!grupos.has(p)) grupos.set(p, []); grupos.get(p).push(d); }
      const periodoTxt = grupos.size > 1 ? [...grupos].map(([p, ds]) => `${ds.map(dataCurta).join(', ')}: ${p}`).join(' | ') : [...grupos.keys()][0];
      const consultor = (ops.consultores.find(c => c.id === f.consultorId) || {}).nome || '';
      try {
        let r;
        if (grupos.size === 1) {
          dados.periodo = [...grupos.keys()][0];
          r = await api('agendaSalvar', { idOperacao: f.op, dados }, { tempo: 120000 });
        } else {
          const partes = [];
          for (const [p, ds] of grupos) {
            const op = f.opsPeriodo[p] || (f.opsPeriodo[p] = uuid());
            try { partes.push(await api('agendaSalvar', { idOperacao: op, dados: { ...dados, datas: ds, periodo: p } }, { tempo: 120000 })); }
            catch (e) {
              partes.push({ situacao: e.codigo === 'REDE' ? 'incerto' : 'erro', erro: `${p}: ${mensagemAmigavel(e)}`,
                resultados: ds.map(d => ({ data: d, situacao: 'erro', erro: mensagemAmigavel(e) })) });
            }
          }
          const sit = partes.map(x => x.situacao);
          r = {
            situacao: sit.every(s => s === 'ok') ? 'ok' : sit.every(s => s === 'erro') ? 'erro' : sit.every(s => s === 'erro' || s === 'incerto') ? 'incerto' : 'parcial',
            erro: partes.map(x => x.erro).filter(Boolean).join(' '),
            resultados: partes.flatMap(x => x.resultados || []).map(x => ({ ...x, periodo: x.periodo || perDe(x.data) })).sort((a, b) => String(a.data).localeCompare(String(b.data))),
            agendaAtualizando: partes.some(x => x.agendaAtualizando),
          };
        }
        f.resultado = r; f.estado = 'resultado';
        registrarHistorico({ em: Date.now(), modo: editando ? 'editar' : 'incluir', titulo: dados.titulo, consultor, datas: dados.datas,
          periodo: periodoTxt, demanda: f.paiNome, situacao: r.situacao,
          resultados: r.resultados.map(x => ({ id: x.id, url: x.url, data: x.data, situacao: x.situacao, erro: x.erro, naoConfirmados: x.naoConfirmados })) });
        if (r.situacao === 'ok' || r.situacao === 'parcial') {
          // Backlog Desenvolvimento relê o ClickUp para o cartão mudar de coluna
          const bd = MODULOS.find(m => m.id === 'backlogdev');
          if (bd && estados[bd.id]) { estadoDe(bd).lidoEm = 0; if (moduloAtual === bd) recarregar(bd, true); }
        }
        if (r.agendaAtualizando) {
          const ag = MODULOS.find(m => m.id === 'agenda');
          if (ag) { const st = estadoDe(ag); st.lidoEm = 0; setTimeout(() => { if (moduloAtual === ag) acompanharSeRodando(ag); }, 4000); }
        }
      } catch (e) {
        f.estado = 'resultado';
        f.resultado = { situacao: e.codigo === 'REDE' ? 'incerto' : 'erro', erro: mensagemAmigavel(e), resultados: [] };
        registrarHistorico({ em: Date.now(), modo: editando ? 'editar' : 'incluir', titulo: dados.titulo, consultor, datas: dados.datas,
          periodo: periodoTxt, demanda: f.paiNome, situacao: f.resultado.situacao, erro: f.resultado.erro, resultados: [] });
      }
      desenhar();
    },
    voltar() { f.estado = 'editando'; f.resultado = null; desenhar(); },
    novo() {
      f.op = uuid(); f.opsPeriodo = {}; f.estado = 'editando'; f.resultado = null;
      if (!f.copia) { f.titulo = ''; f.detalhamento = ''; }
      if (f.exigirData || f.copia) { f.datas = []; f.periodosDia = {}; }
      desenhar();
    },
  };
  desenhar();
  try {
    ops = await opcoesAgenda();
    if (editando) {
      const t = (await api('agendaTarefa', { id: inicial.id })).tarefa;
      Object.assign(f, {
        id: t.id, titulo: t.titulo, consultorId: t.consultorId, datas: [t.data || isoHoje()], periodo: t.periodo || '',
        agenda: t.agenda || 'Remoto', apontamento: t.apontamento || 'OS Experience', parceiroId: t.parceiroId || '',
        detalhamento: t.detalhamento || '', paiNome: t.pai.nome, paiLocal: [t.pasta?.nome, t.lista].filter(Boolean).join(' › '),
        url: t.url, status: t.status,
      });
      if (t.consultores.length > 1) f.aviso = 'Esta agenda tem mais de um consultor no ClickUp (' + t.consultores.map(c => c.nome).join(', ') + '). Ao salvar, fica só o escolhido.';
      if (t.consultorId && !ops.consultores.some(c => c.id === t.consultorId)) ops = { ...ops, consultores: [...ops.consultores, ...t.consultores.filter(c => c.id === t.consultorId)] };
    } else if (copia) {
      const t = (await api('agendaTarefa', { id: inicial.copiaDe })).tarefa;
      Object.assign(f, {
        titulo: t.titulo || '', consultorId: inicial.consultorId || t.consultorId || '', periodo: t.periodo || '',
        agenda: t.agenda || 'Remoto', apontamento: t.apontamento || 'OS Experience', parceiroId: t.parceiroId || '',
        detalhamento: t.detalhamento || '', paiId: (t.pai && t.pai.id) || t.paiId || inicial.paiId || '',
        paiNome: (t.pai && t.pai.nome) || '', paiLocal: [t.pasta?.nome, t.lista].filter(Boolean).join(' › '),
      });
      f.paiFixo = !!f.paiId;
      if (!f.paiId) { f.paiNome = ''; f.paiLocal = ''; } else if (!f.paiNome) f.paiNome = 'Mesma demanda da agenda original';
      f.aviso = `Nova agenda com os dados de “${t.titulo || inicial.copiaNome || 'agenda'}”. Escolha as novas datas e horários (dá para trocar o consultor).`
        + (f.paiId ? '' : ' Não identifiquei a demanda-pai: escolha o cliente e a demanda abaixo.');
      if (f.consultorId && !ops.consultores.some(c => c.id === f.consultorId)) ops = { ...ops, consultores: [...ops.consultores, ...(t.consultores || []).filter(c => c.id === f.consultorId)] };
    } else {
      f.parceiroId = parceiroPorNome(ops, inicial.parceiro, inicial.cliente);
      if (inicial.periodo) f.periodo = periodoDisponivel(inicial.periodo, ops);
    }
    if (f.periodo && !PERIODOS_RAPIDOS.some(p => p[0] === f.periodo)) f.outroPeriodo = true;
    f.estado = 'editando';
  } catch (e) {
    f.estado = 'falhaCarga'; f.erro = mensagemAmigavel(e);
  }
  desenhar();
}

function desenharFormAgenda(folha, f, ops, editando, acoes) {
  const corpo = $('#fa', folha), rod = $('#fa-rod', folha);
  if (!corpo) return;
  const ativo = document.activeElement && corpo.contains(document.activeElement) ? document.activeElement.id : null;
  if (f.estado === 'carregando') {
    corpo.innerHTML = '<div class="centro"><div class="spinner"></div><div class="muted">Carregando do ClickUp…</div></div>';
    rod.innerHTML = '<button class="btn contorno" data-x="fechar">Cancelar</button>';
  } else if (f.estado === 'falhaCarga') {
    corpo.innerHTML = `<div class="resultado erro">${IC.alerta}<b>Não consegui abrir o formulário</b><div>${esc(f.erro)}</div></div>`;
    rod.innerHTML = '<button class="btn contorno" data-x="fechar">Fechar</button>';
  } else if (f.estado === 'resultado') {
    corpo.innerHTML = resultadoAgendaHTML(f.resultado, editando);
    rod.innerHTML = f.resultado.situacao === 'ok' || f.resultado.situacao === 'parcial'
      ? `<button class="btn contorno" data-x="fechar">Fechar</button>${editando ? '' : `<button class="btn primario" data-x="novo">${f.copia ? 'Alocar outras datas' : 'Agendar outro'}</button>`}`
      : `<button class="btn contorno" data-x="voltar">Voltar ao formulário</button><button class="btn primario" data-x="salvar">Tentar de novo</button>`;
  } else {
    const salvando = f.estado === 'salvando';
    const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
    let demanda;
    if (editando || f.paiId && f.paiNome) {
      demanda = `<div class="caixa-dem"><div class="pequeno">${esc(f.paiLocal)}</div><b>${esc(f.paiNome || 'Demanda')}</b>
        ${!editando && !f.paiFixo ? '<button class="btn texto" data-x="trocar-dem" style="padding:4px 0">Trocar demanda</button>' : ''}</div>`;
    } else {
      const grupos = {};
      (f.demandas || []).forEach(d => { (grupos[d.lista] = grupos[d.lista] || []).push(d); });
      demanda = `
        <select id="fa-pasta" class="campo">${opt('', 'Escolha o cliente…', !f.pastaId)}${ops.clientes.map(c => opt(c.id, c.nome, c.id === f.pastaId)).join('')}</select>
        ${f.pastaId ? (f.carregandoDemandas ? '<div class="muted" style="margin-top:8px"><span class="spinner p" style="display:inline-block;vertical-align:middle"></span> Buscando demandas…</div>'
          : `<select id="fa-dem" class="campo" style="margin-top:8px">${opt('', (f.demandas || []).length ? 'Escolha a demanda (tarefa-pai)…' : 'Nenhuma demanda aberta neste cliente', !f.paiId)}
              ${Object.entries(grupos).map(([l, ds]) => `<optgroup label="${esc(l)}">${ds.map(d => opt(d.id, d.nome, d.id === f.paiId)).join('')}</optgroup>`).join('')}</select>`) : ''}`;
    }
    const periodoOutro = f.periodo && !PERIODOS_RAPIDOS.some(p => p[0] === f.periodo);
    const multi = !editando && f.datas.length > 1;
    const listaPeriodos = [...new Set([...PERIODOS_RAPIDOS.map(p => p[0]), ...(ops.periodos || [])])];
    corpo.innerHTML = `
      ${f.aviso ? `<div class="aviso andamento" style="margin:0 0 8px">${esc(f.aviso)}</div>` : ''}
      <fieldset ${salvando ? 'disabled' : ''} class="form-ag">
        <label>Demanda (tarefa-pai)</label>${demanda}
        <label for="fa-titulo">Título da agenda *</label>
        <input id="fa-titulo" class="campo" type="text" value="${esc(f.titulo)}" placeholder="O que será feito" autocomplete="off">
        <label for="fa-cons">Consultor *</label>
        <select id="fa-cons" class="campo">${opt('', 'Escolha…', !f.consultorId)}${ops.consultores.map(c => opt(c.id, c.nome, c.id === f.consultorId)).join('')}</select>
        <label>${editando ? 'Data *' : f.exigirData ? 'Data(s) de vencimento * — uma agenda por dia' : f.copia ? 'Novas datas * — uma agenda por dia' : 'Data(s) * — uma agenda por dia'}</label>
        ${editando ? `<input id="fa-data" class="campo" type="date" value="${esc(f.datas[0] || '')}">` : `
        <div class="linha-datas">
          <input id="fa-data" class="campo" type="date" value="" aria-label="${f.datas.length ? 'Adicionar data' : 'Escolher data'}" ${f.datas.length >= 15 ? 'disabled' : ''}>
          ${f.datas.length ? `<button class="btn contorno pq" data-x="add-data" type="button" ${f.datas.length >= 15 ? 'disabled' : ''}>+ dia útil</button>` : ''}
        </div>
        <div class="pequeno" style="margin-top:4px">${f.datas.length ? 'Escolha outra data no calendário para incluir mais dias (uma agenda por dia).' : 'Escolha a data no calendário. Dá para incluir vários dias.'}</div>
        ${f.datas.length === 1 ? `<div class="chips" style="flex-wrap:wrap">${f.datas.map(d => `<button class="chip sel" type="button" data-x="rem-data" data-d="${d}" aria-label="Remover ${esc(dataTitulo(d))}">${esc(dataTitulo(d))} ${IC.x}</button>`).join('')}</div>` : ''}`}
        <label>${multi ? 'Período * — vale para todos os dias' : 'Período *'}</label>
        <div class="chips seg">${PERIODOS_RAPIDOS.map(([v, t]) => `<button type="button" class="chip${f.periodo === v ? ' sel' : ''}" data-x="periodo" data-v="${v}">${t}<small>${v}</small></button>`).join('')}
          <button type="button" class="chip${periodoOutro || f.outroPeriodo ? ' sel' : ''}" data-x="periodo-outro">Outro</button></div>
        ${periodoOutro || f.outroPeriodo ? `<select id="fa-per" class="campo" style="margin-top:8px">${opt('', 'Escolha o horário…', !f.periodo)}${[...new Set([...(f.periodo && !ops.periodos.includes(f.periodo) ? [f.periodo] : []), ...ops.periodos])].map(p => opt(p, `${p} (${horas(horasPeriodo(p))})`, p === f.periodo)).join('')}</select>` : ''}
        ${multi ? `<label>Período por dia</label>
        <div class="pequeno" style="margin-top:-2px">Troque o horário de um dia específico, se precisar.</div>
        <div class="dias-per">${[...f.datas].sort().map(d => {
          const proprio = f.periodosDia[d] || '';
          return `<div class="dia-per${proprio && proprio !== f.periodo ? ' proprio' : ''}">
            <span class="d">${esc(dataTitulo(d))}</span>
            <select class="campo" data-per-dia="${d}" aria-label="Período de ${esc(dataTitulo(d))}">
              ${opt('', f.periodo ? `Igual aos demais (${f.periodo})` : 'Escolha o horário…', !proprio)}
              ${listaPeriodos.map(p => opt(p, `${p} (${horas(horasPeriodo(p))})`, p === proprio)).join('')}</select>
            <button class="rem-dia" type="button" data-x="rem-data" data-d="${d}" aria-label="Remover ${esc(dataTitulo(d))}">${IC.x}</button>
          </div>`;
        }).join('')}</div>` : ''}
        <label>Tipo de agenda</label>
        <div class="chips" style="flex-wrap:wrap">${ops.agendas.map(a => `<button type="button" class="chip${f.agenda === a ? ' sel' : ''}" data-x="agenda" data-v="${esc(a)}">${esc(a)}</button>`).join('')}</div>
        <label for="fa-parc">Parceiro *</label>
        <select id="fa-parc" class="campo">${opt('', editando ? 'Escolha…' : 'O mesmo da demanda', !f.parceiroId)}${ops.parceiros.map(p => opt(p.id, p.nome, p.id === f.parceiroId)).join('')}</select>
        <label for="fa-apont">Apontamento</label>
        <select id="fa-apont" class="campo">${ops.apontamentos.map(a => opt(a, a, a === f.apontamento)).join('')}</select>
        <label for="fa-det">Detalhamento</label>
        <textarea id="fa-det" class="campo" rows="4" placeholder="Observações da agenda (vão no campo Detalhamento)">${esc(f.detalhamento)}</textarea>
        ${editando && f.url ? `<a class="pequeno" href="${esc(f.url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px">Abrir no ClickUp</a>` : ''}
      </fieldset>
      <div class="erro-txt" style="margin-top:8px">${esc(f.erro)}</div>`;
    const resumo = !editando && f.datas.length > 1 ? `Salvar ${f.datas.length} agendas` : editando ? 'Salvar alterações' : 'Salvar no ClickUp';
    rod.innerHTML = `<button class="btn contorno" data-x="fechar" ${salvando ? 'disabled' : ''}>Cancelar</button>
      <button class="btn primario" data-x="salvar" ${salvando ? 'disabled' : ''}>${salvando ? '<span class="spinner p" style="border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> Gravando no ClickUp…' : resumo}</button>`;
    // liga campos
    const liga = (id, fn, ev = 'input') => { const el = $('#' + id, corpo); if (el) el.addEventListener(ev, () => fn(el.value)); };
    liga('fa-titulo', v => { f.titulo = v; });
    liga('fa-det', v => { f.detalhamento = v; });
    liga('fa-cons', v => { f.consultorId = v; }, 'change');
    liga('fa-parc', v => { f.parceiroId = v; }, 'change');
    liga('fa-apont', v => { f.apontamento = v; }, 'change');
    liga('fa-per', v => { f.periodo = v; acoes.desenhar(); }, 'change');
    corpo.querySelectorAll('[data-per-dia]').forEach(el => el.addEventListener('change', () => {
      if (el.value && el.value !== f.periodo) f.periodosDia[el.dataset.perDia] = el.value;
      else delete f.periodosDia[el.dataset.perDia];
      acoes.desenhar();
    }));
    liga('fa-data', v => {
      if (!v) return;
      if (editando) { f.datas = [v]; return; }
      if (!f.datas.includes(v) && f.datas.length < 15) f.datas.push(v); // cada data escolhida vira mais uma agenda
      acoes.desenhar();
    }, 'change');
    liga('fa-pasta', v => acoes.escolherPasta(v), 'change');
    liga('fa-dem', v => {
      f.paiId = v;
      const d = (f.demandas || []).find(x => x.id === v);
      if (d) { f.paiNome = d.nome; f.paiLocal = [ops.clientes.find(c => c.id === f.pastaId)?.nome, d.lista].filter(Boolean).join(' › '); if (d.parceiroId) f.parceiroId = d.parceiroId; }
      acoes.desenhar();
    }, 'change');
    if (ativo && $('#' + ativo, corpo)) $('#' + ativo, corpo).focus();
  }
  folha.onclick = ev => {
    const b = ev.target.closest('[data-x]');
    if (!b || b.disabled) return;
    const x = b.dataset.x;
    if (x === 'fechar') { fecharFolha(); return; }
    if (x === 'salvar') { acoes.salvar(); return; }
    if (x === 'voltar') { acoes.voltar(); return; }
    if (x === 'novo') { acoes.novo(); return; }
    if (x === 'trocar-dem') { f.paiId = ''; f.paiNome = ''; f.paiLocal = ''; f.pastaId = ''; f.demandas = null; }
    if (x === 'periodo') {
      f.periodo = b.dataset.v; f.outroPeriodo = false;
      for (const d of Object.keys(f.periodosDia)) if (f.periodosDia[d] === f.periodo) delete f.periodosDia[d];
    }
    if (x === 'periodo-outro') { f.outroPeriodo = true; if (PERIODOS_RAPIDOS.some(p => p[0] === f.periodo)) f.periodo = ''; }
    if (x === 'agenda') f.agenda = b.dataset.v;
    if (x === 'add-data') {
      const ult = [...f.datas].sort().pop() || isoHoje();
      const d = parseDia(ult); d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      f.datas.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
    }
    if (x === 'rem-data') { f.datas = f.datas.filter(d => d !== b.dataset.d); delete f.periodosDia[b.dataset.d]; }
    acoes.desenhar();
  };
}

function resultadoAgendaHTML(r, editando) {
  const tit = {
    ok: [IC.ok, editando ? 'Alteração gravada no ClickUp' : 'Agenda gravada no ClickUp', 'ok'],
    parcial: [IC.alerta, 'Gravado, mas com pendências', 'parcial'],
    erro: [IC.x, 'Não foi gravado no ClickUp', 'erro'],
    incerto: [IC.alerta, 'Não consegui confirmar a gravação', 'parcial'],
  }[r.situacao] || [IC.alerta, r.situacao, 'parcial'];
  const linhas = (r.resultados || []).map(x => `
    <div class="res-linha ${x.situacao}">
      <span class="res-ic">${x.situacao === 'ok' ? IC.ok : x.situacao === 'erro' ? IC.x : IC.alerta}</span>
      <div><b>${esc(dataTitulo(x.data))}</b>${x.periodo ? ` <span class="pequeno">· ${esc(x.periodo)}</span>` : ''}
        <div class="pequeno">${x.situacao === 'ok' ? `Confirmado no ClickUp (${x.conferidos} itens conferidos)`
          : x.situacao === 'erro' ? esc(x.erro || 'Erro') : 'Não confirmado: ' + esc((x.naoConfirmados || []).join(', '))}</div>
        ${(x.avisos || []).length ? `<div class="pequeno">${esc(x.avisos.join(' '))}</div>` : ''}
        ${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener" class="pequeno" style="font-weight:700">Abrir no ClickUp</a>` : ''}</div>
    </div>`).join('');
  return `<div class="resultado ${tit[2]}">${tit[0]}<b>${tit[1]}</b>
      ${r.erro ? `<div>${esc(r.erro)}</div>` : ''}
      ${r.situacao === 'incerto' ? '<div>A internet falhou no meio do envio. Toque em "Tentar de novo": se já tiver sido gravado, não duplica.</div>' : ''}
      ${r.situacao === 'parcial' ? '<div>Confira os itens abaixo direto no ClickUp.</div>' : ''}
    </div>
    ${linhas}
    ${r.agendaAtualizando ? '<p class="muted" style="margin-top:10px">A Agenda dos Consultores do app está sendo atualizada e mostra a mudança em 1–3 minutos.</p>' : ''}`;
}

// ---------------------------------------------------------------- histórico de agendamentos

function telaHistorico(app) {
  const h = guardar.ler('historico') || [];
  const rot = { ok: ['Gravado', 'ok'], parcial: ['Com pendências', 'parcial'], erro: ['Não gravado', 'erro'], incerto: ['Não confirmado', 'parcial'] };
  app.innerHTML = `
    <header class="barra"><button class="icone-btn" data-nav="voltar" aria-label="Voltar">${IC.voltar}</button>
      <div class="titulo"><h1>Agendamentos feitos</h1><div class="sub">Neste aparelho</div></div>
      ${pode('agendar') ? `<button class="icone-btn" id="novo" aria-label="Agendar">${IC.mais}</button>` : ''}${botaoVisual()}</header>
    <main class="conteudo">
      ${h.length ? h.map(x => {
        const [t, c] = rot[x.situacao] || [x.situacao, 'parcial'];
        return `<div class="cartao">
          <div class="topo"><span class="nome-t">${esc(x.titulo)}</span><span class="selo-res ${c}">${esc(t)}</span></div>
          <div class="pequeno">${x.modo === 'editar' ? 'Alteração' : 'Inclusão'} · ${esc(geradoEmTexto(x.em))}${x.consultor ? ' · ' + esc(x.consultor) : ''}</div>
          <div class="pequeno">${esc((x.datas || []).map(dataCurta).join(', '))} · ${esc(x.periodo || '')}${x.demanda ? ' · ' + esc(x.demanda) : ''}</div>
          ${x.erro ? `<div class="erro-txt">${esc(x.erro)}</div>` : ''}
          ${(x.resultados || []).map(r => `<div class="pequeno">${esc(dataCurta(r.data))}: ${esc((rot[r.situacao] || [r.situacao])[0])}${r.naoConfirmados?.length ? ' (' + esc(r.naoConfirmados.join(', ')) + ')' : ''}${r.erro ? ' — ' + esc(r.erro) : ''}
            ${r.url ? ` · <a href="${esc(r.url)}" target="_blank" rel="noopener">ClickUp</a>` : ''}${r.id && pode('editar') && r.situacao !== 'erro' ? ` · <a href="#" data-editar="${esc(r.id)}">Editar</a>` : ''}</div>`).join('')}
        </div>`;
      }).join('') : '<div class="vazio">Nada agendado ou alterado por este aparelho ainda.</div>'}
    </main>`;
  $('[data-nav="voltar"]').onclick = () => irPara('');
  if ($('#novo')) $('#novo').onclick = () => abrirFormAgenda({});
  app.querySelectorAll('[data-editar]').forEach(a => { a.onclick = e => { e.preventDefault(); abrirFormAgenda({ id: a.dataset.editar }); }; });
}

// ---------------------------------------------------------------- permissões (administrador)

const NOMES_MODULOS = { agenda: 'Agenda dos Consultores', ociosidade: 'Ociosidade', demandas: 'Demandas', backlog: 'Backlog Base', backlogdev: 'Backlog Desenvolvimento' };

async function telaPermissoes(app) {
  const ui = { lista: null, erro: '', busca: '' };
  const desenhar = () => {
    const t = semAcento(ui.busca);
    const lista = (ui.lista || []).filter(u => !t || semAcento(u.email + ' ' + u.nome).includes(t));
    $('#conteudo').innerHTML = ui.lista == null
      ? (ui.erro ? `<div class="centro"><div>${esc(ui.erro)}</div><button class="btn primario" id="tentar">Tentar de novo</button></div>` : '<div class="centro"><div class="spinner"></div></div>')
      : `<div class="secao"><div class="muted">${ui.lista.length} e-mails cadastrados. Só estes conseguem receber o código de acesso.</div>
          ${campoBusca(ui.busca, 'Buscar e-mail ou nome')}</div><div class="divisor"></div>
        ${lista.map(u => `<button class="cartao usuario" data-u="${esc(u.email)}" style="display:block;width:calc(100% - 24px);text-align:left">
          <div class="topo"><span class="nome-t uma-linha">${esc(u.nome || u.email)}</span>${u.ativo ? '' : '<span class="selo-res erro">Bloqueado</span>'}${u.admin ? '<span class="selo-res ok">Admin</span>' : ''}</div>
          ${u.nome ? `<div class="pequeno">${esc(u.email)}</div>` : ''}
          <div class="pequeno">${esc(resumoPermissao(u))}</div>
          <div class="pequeno">${u.aparelhos ? `${u.aparelhos} aparelho${u.aparelhos > 1 ? 's' : ''} conectado${u.aparelhos > 1 ? 's' : ''} · último uso ${esc(geradoEmTexto(u.ultimoUso))}` : 'Nenhum aparelho conectado'}</div>
        </button>`).join('')}`;
    const tt = $('#tentar'); if (tt) tt.onclick = carregar;
    const inp = $('#busca');
    if (inp) { inp.oninput = () => { ui.busca = inp.value; const pos = inp.selectionStart; desenhar(); const n = $('#busca'); n.focus(); n.setSelectionRange(pos, pos); }; }
    const lb = $('[data-a="limpar-busca"]'); if (lb) lb.onclick = () => { ui.busca = ''; desenhar(); };
    app.querySelectorAll('[data-u]').forEach(b => { b.onclick = () => folhaUsuario(ui.lista.find(u => u.email === b.dataset.u), carregar); });
  };
  const carregar = async () => {
    ui.erro = ''; ui.lista = null; desenhar();
    try { ui.lista = (await api('usuarios')).usuarios; } catch (e) { ui.erro = mensagemAmigavel(e); }
    desenhar();
  };
  app.innerHTML = `
    <header class="barra"><button class="icone-btn" data-nav="voltar" aria-label="Voltar">${IC.voltar}</button>
      <div class="titulo"><h1>Permissões</h1><div class="sub">Acesso ao app por e-mail</div></div>
      <button class="icone-btn" id="novo" aria-label="Incluir e-mail">${IC.mais}</button>${botaoVisual()}</header>
    <main class="conteudo" id="conteudo"></main>`;
  $('[data-nav="voltar"]').onclick = () => irPara('');
  $('#novo').onclick = () => folhaUsuario(null, carregar);
  carregar();
}

function resumoPermissao(u) {
  const m = u.modulos || [];
  const partes = [m.length === Object.keys(NOMES_MODULOS).length ? 'Todos os módulos' : m.length ? m.map(x => NOMES_MODULOS[x] || x).join(', ') : 'Nenhum módulo'];
  if (u.agendar) partes.push('agenda');
  if (u.editar) partes.push('edita');
  if (u.notifOciosidade && m.includes('ociosidade')) partes.push('recebe notif. Ociosidade');
  return partes.join(' · ');
}

function folhaUsuario(u, aoSalvar) {
  const novo = !u;
  const eu = sessao.usuario.email;
  const d = u ? { ...u, modulos: [...u.modulos], notifOciosidade: !!u.notifOciosidade } : { email: '', nome: '', ativo: true, admin: false, agendar: false, editar: false, modulos: ['agenda'], notifOciosidade: false };
  const chk = (on, attr, txt, sub = '') => `<button type="button" class="opcao" ${attr}><span class="check ${on ? 'on' : ''}">${on ? IC.ok : ''}</span><span class="n">${txt}${sub ? `<span class="pequeno" style="display:block;white-space:normal">${sub}</span>` : ''}</span></button>`;
  const desenhar = (erro = '', ocupado = false) => {
    const completo = d.admin && d.agendar && d.editar && d.notifOciosidade && d.modulos.length === Object.keys(NOMES_MODULOS).length;
    const temOci = d.modulos.includes('ociosidade');
    $('#fu').innerHTML = `
      <fieldset class="form-ag" ${ocupado ? 'disabled' : ''}>
      <label for="fu-email">E-mail *</label>
      <input id="fu-email" class="campo" type="email" value="${esc(d.email)}" ${novo ? '' : 'disabled'} placeholder="nome@sankhya.com.br" autocapitalize="off">
      <label for="fu-nome">Nome</label>
      <input id="fu-nome" class="campo" type="text" value="${esc(d.nome)}" placeholder="Opcional">
      <label>Acesso</label>
      ${chk(completo, 'data-p="completo"', '<b>Permissão completa</b>', 'Todos os módulos, agendar, editar, notificações e administrar permissões')}
      <label>Módulos que pode ver</label>
      ${Object.entries(NOMES_MODULOS).map(([k, t]) => chk(d.modulos.includes(k), `data-m="${k}"`, t)).join('')}
      <label>Ações</label>
      ${chk(d.agendar, 'data-p="agendar"', 'Agendar no ClickUp', 'Criar agendas pelo app')}
      ${chk(d.editar, 'data-p="editar"', 'Editar agendas no ClickUp')}
      ${chk(d.admin, 'data-p="admin"', 'Administrador', 'Pode cadastrar e-mails e mudar permissões')}
      <label>Notificações</label>
      ${chk(temOci && d.notifOciosidade, `data-p="notifOciosidade"${temOci ? '' : ' disabled style="opacity:.55"'}`, 'Receber notificação de Ociosidade', temOci ? 'Aviso 1 vez por dia útil, depois do relatório da manhã' : 'Marque antes o módulo Ociosidade')}
      ${chk(!d.ativo, 'data-p="bloquear"', 'Bloquear acesso', 'Desconecta todos os aparelhos e impede novos códigos')}
      </fieldset>
      ${!novo ? `<div class="acoes" style="margin:12px 0 4px">
        ${u.aparelhos ? `<button class="btn contorno pq" id="fu-desc">Desconectar ${u.aparelhos} aparelho${u.aparelhos > 1 ? 's' : ''}</button>` : ''}
        ${u.email !== eu ? '<button class="btn contorno pq" id="fu-rem" style="color:var(--vermelho)">Remover e-mail</button>' : ''}</div>` : ''}
      <div class="erro-txt">${esc(erro)}</div>`;
    const em = $('#fu-email'), nm = $('#fu-nome');
    em.oninput = () => { d.email = em.value.trim().toLowerCase(); };
    nm.oninput = () => { d.nome = nm.value; };
    const desc = $('#fu-desc');
    if (desc) desc.onclick = async () => {
      desenhar('', true);
      try { await api('usuarioDesconectar', { email: d.email }); toast('Aparelhos desconectados'); fecharFolha(); aoSalvar(); }
      catch (e) { desenhar(mensagemAmigavel(e)); }
    };
    const rem = $('#fu-rem');
    if (rem) rem.onclick = async () => {
      if (!rem.dataset.conf) { rem.dataset.conf = '1'; rem.textContent = 'Toque de novo para remover'; return; }
      desenhar('', true);
      try { await api('usuarioRemover', { email: d.email }); toast('E-mail removido'); fecharFolha(); aoSalvar(); }
      catch (e) { desenhar(mensagemAmigavel(e)); }
    };
    $('#fu-salvar').disabled = ocupado;
    $('#fu-salvar').innerHTML = ocupado ? '<span class="spinner p" style="border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> Salvando…' : 'Salvar';
  };
  abrirFolha(`<h3>${novo ? 'Incluir e-mail' : 'Permissões'}</h3><div class="corpo" id="fu"></div>
    <div class="rodape-f"><button class="btn contorno" id="fu-canc">Cancelar</button><button class="btn primario" id="fu-salvar">Salvar</button></div>`, f => {
    f.classList.add('alta');
    $('#fu-canc', f).onclick = fecharFolha;
    $('#fu', f).onclick = ev => {
      const b = ev.target.closest('.opcao');
      if (!b) return;
      const p = b.dataset.p, m = b.dataset.m;
      if (m) d.modulos = d.modulos.includes(m) ? d.modulos.filter(x => x !== m) : [...d.modulos, m];
      if (!d.modulos.includes('ociosidade')) d.notifOciosidade = false; // sem o módulo, sem a notificação
      if (p === 'completo') {
        const on = !(d.admin && d.agendar && d.editar && d.notifOciosidade && d.modulos.length === Object.keys(NOMES_MODULOS).length);
        Object.assign(d, { admin: on, agendar: on, editar: on, notifOciosidade: on, modulos: on ? Object.keys(NOMES_MODULOS) : ['agenda'] });
      }
      if (p === 'agendar' || p === 'editar' || p === 'admin' || (p === 'notifOciosidade' && d.modulos.includes('ociosidade'))) d[p] = !d[p];
      if (p === 'bloquear') d.ativo = !d.ativo;
      desenhar();
    };
    $('#fu-salvar', f).onclick = async () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { desenhar('Informe um e-mail válido.'); return; }
      desenhar('', true);
      try {
        await api('usuarioSalvar', { usuario: d });
        if (d.email === eu) await conferirAcesso();
        toast(novo ? 'E-mail incluído' : 'Permissões salvas');
        fecharFolha(); aoSalvar();
      } catch (e) { desenhar(mensagemAmigavel(e)); }
    };
    desenhar();
  });
}

// ================================================================= MÓDULOS

/** Troca o HTML mantendo a rolagem lateral dos elementos marcados com data-rola. */
function trocarHTML(el, html) {
  const rolagens = {};
  el.querySelectorAll('[data-rola]').forEach(x => { rolagens[x.dataset.rola] = x.scrollLeft; });
  el.innerHTML = html;
  el.querySelectorAll('[data-rola]').forEach(x => { if (rolagens[x.dataset.rola]) x.scrollLeft = rolagens[x.dataset.rola]; });
}
function alternar(conj, chave) { if (conj.has(chave)) conj.delete(chave); else conj.add(chave); }

function barraHoras(plan, real, agend, semNada) {
  const base = Math.max(plan || 0, real + agend);
  if (base <= 0) return semNada ? `<div class="pequeno" style="margin-top:6px;font-size:11px">${semNada}</div>` : '';
  const estourou = plan != null && plan > 0 && real + agend > plan;
  const pct = v => Math.max(0, Math.min(100, v / base * 100)).toFixed(1) + '%';
  return `<div class="barra-h"><i class="ag" style="width:${pct(real + agend)}"></i><i class="re" style="width:${pct(real)}"></i></div>
    <div class="barra-leg"><span>${horas(real)} realizadas${agend > 0 ? ' · ' + horas(agend) + ' agendadas' : ''}</span>
    <b class="${estourou ? 'atraso' : ''}">${plan != null ? 'de ' + horas(plan) + ' planejadas' : 'sem horas planejadas'}</b></div>`;
}

function selo(texto, c) {
  if (!texto) return '';
  return `<span class="selo" style="background:${corAlfa(c, .15)}"><i style="background:${cor(c)}"></i>${esc(texto)}</span>`;
}

function campoBusca(valor, dica) {
  return `<div class="busca">${IC.busca}<input id="busca" class="campo" type="text" enterkeyhint="search" value="${esc(valor)}" placeholder="${esc(dica)}" autocomplete="off" autocorrect="off">
    <button class="limpar" data-a="limpar-busca" ${valor ? '' : 'hidden'} aria-label="Limpar">${IC.x}</button></div>`;
}

/** Liga o campo de busca: redesenha só a lista (sem perder o teclado). */
function ligarBusca(st, desenharLista) {
  const inp = $('#busca');
  if (!inp) return;
  inp.oninput = () => {
    st.ui.busca = inp.value;
    $('[data-a="limpar-busca"]').hidden = !inp.value;
    desenharLista();
  };
}

// ---------------------------------------------------------------- Módulo 1: Agenda

const LETRA_DIA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // getDay(): 0 = domingo
const letraDia = iso => { const d = parseDia(iso); return d ? LETRA_DIA[d.getDay()] : ''; };
const numeroDia = iso => { const d = parseDia(iso); return d ? String(d.getDate()) : iso; };
const fimDeSemana = iso => { const d = parseDia(iso); return d ? d.getDay() === 0 || d.getDay() === 6 : false; };

function coresHoras(h) {
  if (h === 0) return ['#e9e9e9', '#8a8a8a'];
  if (h <= 7) return ['#eee2b8', '#8a6d1f'];
  if (h === 8) return ['#c6ecd2', '#1f7a45'];
  if (h <= 12) return ['#f7d3a8', '#c1650a'];
  return ['#f5b6b1', '#c62f28'];
}
const corTurno = t => ({ manha: '#f5e8a8', tarde: '#b8d4f5', dia: '#f5b6b1' }[t] || '#e0e0e0');

function seloHoras(h, estilo = '') {
  const [f, t] = coresHoras(h);
  return `<span class="selo-h" style="background:${f};color:${t};${estilo}">${horas(h)}</span>`;
}
function avatar(c, tam = 36) {
  return `<span class="avatar" style="width:${tam}px;height:${tam}px;background:${cor(c.cor, '#1f7a45')};font-size:${Math.round(tam / 3)}px">${esc(c.iniciais)}</span>`;
}

function interpretarAgenda(json) {
  const r = JSON.parse(json);
  const dias = r.dias || [];
  const consultores = (r.consultores || []).map(c => {
    const m = {};
    for (const dk of dias) {
      const d = (c.dias || {})[dk];
      m[dk] = d ? { horas: Number(d.horas) || 0, itens: d.itens || [] } : { horas: 0, itens: [] };
    }
    return { id: String(c.id), nome: c.nome || '', iniciais: c.iniciais || '', cor: c.cor || '#1f7a45', dias: m };
  });
  return { geradoEm: r.gerado_em || '', hoje: r.hoje || '', dias, consultores };
}
const diaDe = (c, dk) => c.dias[dk] || { horas: 0, itens: [] };

function botaoEditar(url, classe = 'btn contorno pq') {
  return url && pode('editar') ? `<button class="${classe}" data-a="editar" data-id="${esc(idTarefa(url))}">${IC.lapis.replace('<svg', '<svg width="15" height="15"')} Editar</button>` : '';
}

function ordemPeriodo(p) { const m = /(\d{1,2})h/.exec(p || ''); return m ? +m[1] : 99; }
function dataTitulo(dk) {
  const d = parseDia(dk);
  return d ? maiuscula1(d.toLocaleDateString('pt-BR', { weekday: 'long' })) + ', ' + dataCurta(dk) : dk;
}
function textoAgenda(c, dias) {
  let s = `*Agenda – ${c.nome}*\n`;
  for (const dk of [...dias].sort()) {
    const itens = [...diaDe(c, dk).itens].sort((a, b) => ordemPeriodo(a.periodo) - ordemPeriodo(b.periodo));
    if (!itens.length) continue;
    s += `\n📅 *${dataTitulo(dk)}*\n`;
    for (const it of itens) {
      s += `\n▪️ *${it.periodo || 'Sem período'}* | *${it.cliente}*\n${it.tarefa}\n`;
      const det = ['Horas: ' + horas(it.horas)];
      if (it.agenda) det.push('Agenda: ' + it.agenda);
      s += `_${det.join(' · ')}_\n`;
      if (it.detalhamento) s += `Detalhamento: ${it.detalhamento}\n`;
    }
  }
  return s.trimEnd();
}

function folhaExportarAgenda(c, dados) {
  const hoje = isoHoje();
  const comAgenda = dados.dias.filter(dk => diaDe(c, dk).itens.length);
  let sel = new Set(comAgenda.filter(dk => dk >= hoje));
  if (!sel.size) sel = new Set(comAgenda);
  const desenhar = f => {
    $('.corpo', f).innerHTML = comAgenda.length ? `
      <div class="muted">Dias que vão na mensagem:</div>
      <div><button class="btn texto" data-f="todos">Todos</button><button class="btn texto" data-f="nenhum">Nenhum</button></div>
      ${comAgenda.map(dk => {
        const d = diaDe(c, dk);
        const dt = parseDia(dk);
        const rot = maiuscula1(dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')) + ' ' + dataCurta(dk);
        return `<button class="opcao" data-f="dia" data-dk="${dk}">
          <span class="check ${sel.has(dk) ? 'on' : ''}">${sel.has(dk) ? IC.ok : ''}</span>
          <span class="n" style="${dk === hoje ? 'font-weight:700' : ''}">${rot}${dk === hoje ? ' (hoje)' : ''}</span>
          <span class="pequeno">${d.itens.length} · ${horas(d.horas)}</span></button>`;
      }).join('')}` : `<p>${esc(c.nome)} não tem agendas no período carregado.</p>`;
    f.querySelectorAll('.rodape-f .btn').forEach(b => { b.disabled = !sel.size; });
  };
  abrirFolha(`<h3>Enviar agenda<br><span class="muted" style="font-size:15px">${esc(c.nome)}</span></h3>
    <div class="corpo"></div>
    <div class="rodape-f">
      <button class="btn contorno" data-f="copiar">Copiar</button>
      <button class="btn contorno" data-f="outros">Outros</button>
      <button class="btn primario" data-f="wa">WhatsApp</button>
    </div>`, f => {
    desenhar(f);
    f.onclick = ev => {
      const b = ev.target.closest('[data-f]');
      if (!b) return;
      const acao = b.dataset.f;
      if (acao === 'todos') sel = new Set(comAgenda);
      else if (acao === 'nenhum') sel = new Set();
      else if (acao === 'dia') alternar(sel, b.dataset.dk);
      else {
        const texto = textoAgenda(c, [...sel]);
        if (acao === 'copiar') copiar(texto);
        else if (acao === 'outros') compartilhar(texto);
        else whatsapp(texto);
        fecharFolha();
        return;
      }
      desenhar(f);
    };
  });
}

function folhaEscolherConsultor(dados) {
  const hoje = isoHoje();
  abrirFolha(`<h3>Enviar agenda de…</h3><div class="corpo">
    ${dados.consultores.map(c => {
      const h = dados.dias.filter(dk => dk >= hoje).reduce((s, dk) => s + diaDe(c, dk).horas, 0);
      return `<button class="opcao" data-c="${esc(c.id)}">${avatar(c, 30)}<span class="n">${esc(c.nome)}</span><span class="pequeno">${horas(h)}</span></button>`;
    }).join('')}</div>
    <div class="rodape-f"><button class="btn contorno" data-fechar>Cancelar</button></div>`, f => {
    f.onclick = ev => {
      if (ev.target.closest('[data-fechar]')) { fecharFolha(); return; }
      const b = ev.target.closest('[data-c]');
      if (b) folhaExportarAgenda(dados.consultores.find(c => c.id === b.dataset.c), dados);
    };
  });
}

/* ---- v2.7.0: Agenda no padrão visual dos demais módulos ----
 * Por dia: um cartão por consultor (como na Ociosidade); o drilldown abre a linha do
 * tempo do dia, ordenada pelo horário de execução, com os horários livres clicáveis.
 * Grade: "Gantt" por consultor (mini-faixa 08h–18h em cada dia); o drilldown mostra as
 * agendas de cada dia por horário. Tocar numa agenda abre o popup com Editar e
 * Alocar mais (duplica a agenda para outras datas/horários); tocar num horário
 * vazio abre o formulário já com o consultor, o dia e o período.
 */
const TURNO_COR = { manha: '#d29c0b', tarde: '#3b7dd8', dia: '#8e5cc4', noite: '#55606e' };
const JANELAS_TRABALHO = [[8, 12], [14, 18]];
const INICIO_DIA = 8, FIM_DIA = 18;

/** "08h-12h", "08h30 - 12h" → [8, 12] / [8.5, 12] (horas decimais) ou null. */
function faixaPeriodo(p) {
  const m = /(\d{1,2})h(\d{2})?\s*-\s*(\d{1,2})h(\d{2})?/.exec(p || '');
  if (!m) return null;
  const a = +m[1] + (+m[2] || 0) / 60, b = +m[3] + (+m[4] || 0) / 60;
  return b > a ? [a, b] : null;
}
const horaTxt = h => { const i = Math.floor(h), m = Math.round((h - i) * 60); return pad2(i) + 'h' + (m ? pad2(m) : ''); };
const periodoDeFaixa = (a, b) => `${horaTxt(a)}-${horaTxt(b)}`;

/** Horários livres do dia (≥ 1h) dentro de 08h–12h e 14h–18h, descontando os períodos ocupados. */
function vagosDoDia(dc, dk) {
  if (fimDeSemana(dk) || dc.horas >= 8) return [];
  const ocup = dc.itens.map(i => faixaPeriodo(i.periodo)).filter(Boolean);
  const livres = [];
  for (const [ja, jb] of JANELAS_TRABALHO) {
    let segs = [[ja, jb]];
    for (const [x, y] of ocup) segs = segs.flatMap(([s, e]) => (y <= s || x >= e) ? [[s, e]] : [[s, Math.max(s, x)], [Math.min(e, y), e]]);
    livres.push(...segs.filter(([s, e]) => e - s >= 1 - 1e-9));
  }
  return livres;
}

/** Itens do dia + horários livres, na ordem de execução (sem horário vai para o fim). */
function linhasDoDia(c, dk) {
  const dc = diaDe(c, dk);
  const linhas = dc.itens.map((it, i) => { const f = faixaPeriodo(it.periodo); return { tipo: 'item', it, i, a: f ? f[0] : 99, b: f ? f[1] : 99 }; });
  if (pode('agendar')) vagosDoDia(dc, dk).forEach(([a, b]) => linhas.push({ tipo: 'livre', a, b }));
  return linhas.sort((x, y) => x.a - y.a || x.b - y.b || (x.tipo === 'livre') - (y.tipo === 'livre'));
}

/** Situação do consultor no dia, nas cores da Ociosidade. */
function cargaDia(h) {
  if (h <= 0) return { c: COR_SEM, t: 'Sem agenda · 8h livres' };
  if (h < 8) return { c: COR_PARCIAL, t: `${horas(h)} alocadas · ${horas(8 - h)} livres` };
  if (h === 8) return { c: COR_COMPLETO, t: `${horas(h)} alocadas` };
  return { c: 'var(--azul)', t: `${horas(h)} alocadas · ${horas(h - 8)} acima` };
}

function linhaTempo(c, dk, compacto = false) {
  const linhas = linhasDoDia(c, dk);
  if (!linhas.length) return `<div class="pequeno" style="padding:6px 0">${fimDeSemana(dk) ? 'Fim de semana' : 'Sem agenda'}</div>`;
  const hora = l => l.a === 99 ? '<span class="tl-sem">sem<br>horário</span>' : `${horaTxt(l.a)}<span>${horaTxt(l.b)}</span>`;
  const horaInline = l => l.a === 99 ? 'Sem horário' : `${horaTxt(l.a)} – ${horaTxt(l.b)}`;
  return `<div class="tl${compacto ? ' compacto' : ''}">${linhas.map(l => {
    if (l.tipo === 'livre') {
      const p = periodoDeFaixa(l.a, l.b);
      return `<div class="tl-linha">${compacto ? '' : `<div class="tl-hora">${hora(l)}</div>`}
        <button class="tl-livre" data-a="vago" data-id="${esc(c.id)}" data-dk="${dk}" data-p="${p}">${IC.mais.replace('<svg', '<svg width="15" height="15"')}
          <span>${compacto ? esc(horaInline(l)) : `Livre · ${horas(l.b - l.a)}`}</span></button></div>`;
    }
    const it = l.it;
    return `<div class="tl-linha">${compacto ? '' : `<div class="tl-hora">${hora(l)}</div>`}
      <button class="tl-item" style="--t:${TURNO_COR[it.turno] || '#87909e'}" data-a="item" data-id="${esc(c.id)}" data-dk="${dk}" data-i="${l.i}">
        ${compacto ? `<div class="tl-hc">${esc(horaInline(l))}</div>` : ''}
        <div class="cli"><span>${esc(it.cliente)}</span><b>${horas(it.horas)}</b></div>
        <div class="tar">${esc(it.tarefa)}</div>
        ${!compacto && (it.agenda || it.detalhamento) ? `<div class="meta">${esc([it.agenda, it.detalhamento ? 'Com detalhamento' : ''].filter(Boolean).join(' · '))}</div>` : ''}
      </button></div>`;
  }).join('')}</div>`;
}

/** Mini-faixa 08h–18h do dia, com os períodos ocupados (Grade). */
function miniFaixa(dc) {
  const tot = FIM_DIA - INICIO_DIA;
  const segs = dc.itens.map(it => { const f = faixaPeriodo(it.periodo); return f && { f, cor: TURNO_COR[it.turno] || '#87909e' }; }).filter(Boolean)
    .map(({ f, cor }) => {
      const a = Math.max(INICIO_DIA, f[0]), b = Math.min(FIM_DIA, f[1]);
      return b > a ? `<i style="left:${(a - INICIO_DIA) / tot * 100}%;width:${(b - a) / tot * 100}%;background:${cor}"></i>` : '';
    }).join('');
  const semHora = dc.itens.some(it => !faixaPeriodo(it.periodo));
  return `<span class="mini-faixa${semHora && !segs ? ' sem-hora' : ''}"><i class="almoco"></i>${segs}</span>`;
}

function cartaoAgenda(c, dk, aberto) {
  const dc = diaDe(c, dk), k = cargaDia(dc.horas);
  const clientes = [...new Set(dc.itens.map(i => i.cliente))].join(', ');
  const pct = Math.max(0, Math.min(100, dc.horas / 8 * 100));
  return `<div class="cartao ag-cartao">
    <button class="topo${aberto ? ' aberto' : ''}" data-a="consultor" data-id="${esc(c.id)}" style="align-items:center">
      ${avatar(c, 34)}
      <span style="flex:1;min-width:0"><b class="uma-linha" style="display:block;font-weight:600">${esc(c.nome)}</b>
        <span style="font-size:12px;font-weight:600;color:${k.c}">${k.t}</span></span>
      ${IC.baixo}
    </button>
    <div class="prog" style="background:${mistura(k.c, 15)}"><i style="width:${pct}%;background:${k.c}"></i></div>
    ${!aberto && clientes ? `<div class="pequeno uma-linha" style="margin-top:8px">${esc(clientes)}</div>` : ''}
    ${aberto ? `<div style="margin-top:6px">${linhaTempo(c, dk)}
      <div class="acoes"><button class="btn contorno pq" data-a="exportar" data-id="${esc(c.id)}">${IC.compartilhar.replace('<svg', '<svg width="15" height="15"')} Enviar agenda</button>
        ${pode('agendar') ? `<button class="btn contorno pq" data-a="agendar" data-id="${esc(c.id)}">${IC.mais.replace('<svg', '<svg width="15" height="15"')} Agendar</button>` : ''}</div>
    </div>` : ''}
  </div>`;
}

function agendaPorDia(st) {
  const d = st.dados, ui = st.ui, hoje = isoHoje(), dia = ui.dia;
  const total = d.consultores.reduce((s, c) => s + diaDe(c, dia).horas, 0);
  const cont = f => d.consultores.filter(c => f(diaDe(c, dia).horas)).length;
  const resumo = (t, n, c) => `<div class="resumo-o" style="background:${mistura(c, 10)};color:${c}"><b>${n}</b><span>${t}</span></div>`;
  return `
    <div class="dias" data-rola="dias">
      ${d.dias.map(dk => `<button class="chip-dia${dk === dia ? ' sel' : ''}${dk === hoje ? ' hoje' : ''}${fimDeSemana(dk) ? ' fds' : ''}" data-a="dia" data-dk="${dk}">
        <small>${letraDia(dk)}</small><b>${numeroDia(dk)}</b></button>`).join('')}
    </div>
    <div class="secao" style="padding-top:0">
      <h2 class="dia-titulo">${esc(diaExtenso(dia))}</h2>
      <div class="muted">${horas(total)} alocadas na equipe</div>
      <div class="numeros" style="margin-top:10px">${resumo('Sem agenda', cont(h => h <= 0), COR_SEM)}${resumo('Com horas livres', cont(h => h > 0 && h < 8), COR_PARCIAL)}${resumo('Completos', cont(h => h >= 8), COR_COMPLETO)}</div>
      ${st.erro ? `<div class="erro-txt">Não consegui buscar dados novos: ${esc(st.erro)}</div>` : ''}
    </div>
    <div class="divisor"></div>
    <div style="padding:6px 0 8px">${d.consultores.map(c => cartaoAgenda(c, dia, ui.abertos.has(c.id))).join('')}</div>
    <p class="muted" style="padding:0 16px">Toque no consultor para ver o dia por horário · toque numa agenda para ver os detalhes${pode('agendar') ? ' · toque num horário livre para agendar' : ''}.</p>`;
}

function agendaGrade(st) {
  const d = st.dados, ui = st.ui, hoje = isoHoje();
  const larga = ui.abertosGrade.size > 0;
  return `
    <div class="grade-wrap" data-rola="grade">
      <table class="grade ag-grade${larga ? ' larga' : ''}">
        <thead><tr><th class="col-nome" style="text-align:left">Consultor</th>
          ${d.dias.map(dk => `<th class="dia${dk === hoje ? ' hoje' : ''}${fimDeSemana(dk) ? ' fds' : ''}" data-dk="${dk}"><span>${letraDia(dk)} ${numeroDia(dk)}</span></th>`).join('')}
        </tr></thead>
        <tbody>
        ${d.consultores.map(c => {
          const aberto = ui.abertosGrade.has(c.id);
          const tot = d.dias.filter(dk => dk >= hoje).reduce((s, dk) => s + diaDe(c, dk).horas, 0);
          return `<tr class="${aberto ? 'aberta' : ''}">
              <td class="col-nome"><button class="nome-grade${aberto ? ' aberto' : ''}" data-a="grade" data-id="${esc(c.id)}">${avatar(c, 26)}
                <span class="n"><b>${esc(c.nome)}</b><small>${horas(tot)} agendadas</small></span>${IC.baixo}</button></td>
              ${d.dias.map(dk => {
                const dc = diaDe(c, dk), [fundo, txt] = coresHoras(dc.horas);
                if (aberto) return `<td class="cel cel-aberta${fimDeSemana(dk) ? ' fds' : ''}">${linhaTempo(c, dk, true)}</td>`;
                return `<td class="cel${fimDeSemana(dk) ? ' fds' : ''}"><button class="cel-ag" data-a="${dc.horas > 0 || !pode('agendar') ? 'grade' : 'vago-dia'}" data-id="${esc(c.id)}" data-dk="${dk}"
                  aria-label="${esc(c.nome)}, ${esc(dataTitulo(dk))}: ${horas(dc.horas)}">
                  <b style="background:${fundo};color:${txt}">${dc.horas > 0 ? horas(dc.horas) : pode('agendar') && !fimDeSemana(dk) ? '+' : '–'}</b>${miniFaixa(dc)}</button></td>`;
              }).join('')}
            </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>
    <div class="legenda">
      ${[[0, 'livre'], [4, '≤7h'], [8, '8h'], [10, '≤12h'], [13, '>12h']].map(([h, r]) => { const [f, t] = coresHoras(h); return `<span style="background:${f};color:${t}">${r}</span>`; }).join('')}
      <span class="leg-t"><i style="background:${TURNO_COR.manha}"></i>Manhã</span><span class="leg-t"><i style="background:${TURNO_COR.tarde}"></i>Tarde</span><span class="leg-t"><i style="background:${TURNO_COR.dia}"></i>Dia inteiro</span>
    </div>
    <p class="muted" style="padding:0 16px">Faixa de cada dia: 08h–18h (almoço 12h–14h). Toque no consultor (ou num dia com horas) para abrir as agendas por horário · toque numa agenda para ver os detalhes${pode('agendar') ? ' · toque num dia ou horário livre para agendar' : ''}.</p>`;
}

/** Popup de detalhes da agenda, com Editar e Alocar mais. */
function folhaAgendaItem(c, dk, it) {
  const id = it.id ? String(it.id) : it.url ? idTarefa(it.url) : '';
  const ic = (svg, t = 16) => svg.replace('<svg', `<svg width="${t}" height="${t}"`);
  const botoes = [
    pode('editar') && id ? `<button class="btn contorno" data-f="editar">${ic(IC.lapis)} Editar</button>` : '',
    pode('agendar') && id ? `<button class="btn primario" data-f="mais">${ic(IC.mais)} Alocar mais</button>` : '',
  ].filter(Boolean);
  abrirFolha(`<h3>${esc(it.tarefa)}</h3><div class="corpo">
      <div class="pequeno" style="font-weight:700;text-transform:uppercase">${esc(it.cliente)}</div>
      <div class="linha-selos" style="flex-wrap:wrap;margin:8px 0">${selo(it.periodo || 'Sem horário', TURNO_COR[it.turno] || '#87909e')}${selo(horas(it.horas), '#1f7a45')}${selo(it.agenda, '#2c4e8c')}</div>
      <div class="ag-quem">${avatar(c, 32)}<div><b>${esc(c.nome)}</b><div class="pequeno">${esc(dataTitulo(dk))}</div></div></div>
      ${it.detalhamento ? `<div class="rotulo">Detalhamento</div><div class="pre">${esc(it.detalhamento)}</div>` : ''}
      ${it.url ? `<a href="${esc(it.url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:14px;font-size:14px;font-weight:700;color:var(--verde)">Abrir no ClickUp</a>` : ''}
    </div>
    <div class="rodape-f">${botoes.length ? botoes.join('') : '<button class="btn contorno" data-f="fechar">Fechar</button>'}</div>`, f => {
    f.onclick = ev => {
      const b = ev.target.closest('[data-f]');
      if (!b) return;
      if (b.dataset.f === 'fechar') fecharFolha();
      else if (b.dataset.f === 'editar') abrirFormAgenda({ id });
      else if (b.dataset.f === 'mais') abrirFormAgenda({ copiaDe: id, consultorId: c.id, paiId: it.pai_id || '', copiaNome: it.tarefa });
    };
  });
}

MODULOS.push({
  id: 'agenda',
  titulo: 'Agenda dos Consultores',
  descricao: 'Carga de trabalho de hoje até os próximos 10 dias',
  icone: IC.calendario,
  workflow: 'carga_trabalho.yml',
  arquivo: 'app_carga_trabalho.json',
  etapa: 'Buscando as agendas no ClickUp…',
  uiInicial: () => ({ aba: 0, dia: null, abertos: new Set(), abertosGrade: new Set(), rolarPara: null, centralizarDia: true }),
  interpretar: interpretarAgenda,
  desenhar(st, { cont, abas, acoes }) {
    const d = st.dados, ui = st.ui, hoje = isoHoje();
    if (!ui.dia || !d.dias.includes(ui.dia)) ui.dia = d.dias.includes(hoje) ? hoje : d.dias[0];
    abas.innerHTML = `<nav class="abas"><button class="${ui.aba === 0 ? 'ativa' : ''}" data-a="aba" data-v="0">Por dia</button><button class="${ui.aba === 1 ? 'ativa' : ''}" data-a="aba" data-v="1">Grade</button></nav>`;
    acoes.innerHTML = `${pode('agendar') ? `<button class="icone-btn" data-a="agendar" aria-label="Agendar">${IC.mais}</button>` : ''}<button class="icone-btn" data-a="escolher" aria-label="Enviar agenda de um consultor">${IC.compartilhar}</button>`;
    trocarHTML(cont, ui.aba === 0 ? agendaPorDia(st) : agendaGrade(st));
    if (ui.aba === 0) {
      const chip = cont.querySelector('.chip-dia.sel');
      if (chip && ui.centralizarDia) { chip.scrollIntoView({ inline: 'center', block: 'nearest' }); ui.centralizarDia = false; }
    }
    if (ui.aba === 1 && ui.rolarPara) {
      const th = cont.querySelector(`th[data-dk="${ui.rolarPara}"]`);
      const wrap = cont.querySelector('.grade-wrap');
      if (th && wrap) wrap.scrollTo({ left: th.offsetLeft - wrap.querySelector('.col-nome').offsetWidth, behavior: 'smooth' });
      ui.rolarPara = null;
    }
  },
  acao(nome, el, st) {
    const ui = st.ui, d = st.dados;
    const cons = () => d.consultores.find(c => c.id === el.dataset.id);
    switch (nome) {
      case 'aba': ui.aba = +el.dataset.v; if (ui.aba === 0) ui.centralizarDia = true; window.scrollTo(0, 0); return;
      case 'dia': ui.dia = el.dataset.dk; return;
      case 'consultor': alternar(ui.abertos, el.dataset.id); return;
      case 'item': {
        const c = cons(), it = c && diaDe(c, el.dataset.dk).itens[+el.dataset.i];
        if (it) folhaAgendaItem(c, el.dataset.dk, it);
        return false;
      }
      case 'vago': abrirFormAgenda({ consultorId: el.dataset.id, data: el.dataset.dk, periodo: el.dataset.p }); return false;
      case 'vago-dia': abrirFormAgenda({ consultorId: el.dataset.id, data: el.dataset.dk }); return false;
      case 'editar': abrirFormAgenda({ id: el.dataset.id }); return false;
      case 'agendar': abrirFormAgenda({ consultorId: el.dataset.id || '', data: ui.aba === 0 ? ui.dia : isoHoje() }); return false;
      case 'grade':
        if (!ui.abertosGrade.has(el.dataset.id)) ui.rolarPara = el.dataset.dk || (d.dias.includes(isoHoje()) ? isoHoje() : '');
        alternar(ui.abertosGrade, el.dataset.id);
        return;
      case 'exportar': folhaExportarAgenda(cons(), d); return false;
      case 'escolher': folhaEscolherConsultor(d); return false;
    }
    return false;
  },
});

// ---------------------------------------------------------------- Módulo 2: Ociosidade

const COR_SEM = 'var(--vermelho)', COR_PARCIAL = 'var(--laranja)', COR_COMPLETO = 'var(--verde)';
const mistura = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

function interpretarOciosidade(json) {
  const r = JSON.parse(json);
  const consultores = (r.consultores || []).map(c => ({
    id: String(c.id), nome: c.nome || '', situacao: c.situacao || '',
    horasAlocadas: Number(c.horas_alocadas) || 0, horasLivres: Number(c.horas_livres) || 0,
    agendasHoje: c.agendas_hoje || [], sugestoes: c.sugestoes || [],
  }));
  return {
    geradoEm: r.gerado_em || '', data: r.data || '', consultores,
    semAgenda: consultores.filter(c => c.situacao === 'sem_agenda'),
    parciais: consultores.filter(c => c.situacao === 'parcial').sort((a, b) => a.horasAlocadas - b.horasAlocadas),
    completos: consultores.filter(c => c.situacao === 'completo'),
  };
}

function textoOciosidade(d) {
  const dt = parseDia(d.data);
  let s = `*Equipe sem agenda - ${dt ? dt.toLocaleDateString('pt-BR') : d.data}*\n`;
  const linha = c => {
    const sug = c.sugestoes.slice(0, 3).map(x => x.rotulo).join(', ') || 'sem sugestões disponíveis';
    const status = c.situacao === 'sem_agenda' ? '8h disponíveis' : `${horas(c.horasAlocadas)} alocadas / ${horas(c.horasLivres)} livres`;
    s += `• *${c.nome}* (${status}) — sugestões: ${sug}\n`;
  };
  if (!d.semAgenda.length && !d.parciais.length) return s + '\nNinguém ocioso hoje.';
  if (d.semAgenda.length) { s += '\n*SEM AGENDA:*\n'; d.semAgenda.forEach(linha); }
  if (d.parciais.length) { s += '\n*COM OCIOSIDADE:*\n'; d.parciais.forEach(linha); }
  return s.trimEnd();
}

function cartaoOcioso(c, aberto) {
  const corC = c.situacao === 'sem_agenda' ? COR_SEM : c.situacao === 'parcial' ? COR_PARCIAL : COR_COMPLETO;
  const status = c.situacao === 'sem_agenda' ? '8h disponíveis'
    : c.situacao === 'parcial' ? `${horas(c.horasAlocadas)} alocadas / ${horas(c.horasLivres)} livres`
    : `${horas(c.horasAlocadas)} alocadas`;
  const pct = Math.max(0, Math.min(100, c.horasAlocadas / 8 * 100));
  return `<div class="cartao" data-a="ocioso" data-id="${esc(c.id)}" role="button">
    <div class="topo${aberto ? ' aberto' : ''}" style="align-items:center">
      <span class="ponto" style="background:${corC}"></span>
      <span style="flex:1;min-width:0"><b class="uma-linha" style="display:block;font-weight:600">${esc(c.nome)}</b>
        <span style="font-size:12px;font-weight:600;color:${corC}">${status}</span></span>
      ${IC.baixo}
    </div>
    <div class="prog" style="background:${mistura(corC, 15)}"><i style="width:${pct}%;background:${corC}"></i></div>
    ${!aberto && c.sugestoes.length ? `<div class="pequeno" style="margin-top:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">Sugestões: ${esc(c.sugestoes.slice(0, 3).map(x => x.rotulo).join(', '))}</div>` : ''}
    ${aberto ? `<div style="margin-top:8px">
      ${c.agendasHoje.length ? `<div class="rotulo">Agenda de hoje</div>${c.agendasHoje.map(a => `
        <div class="linha-s"><a ${a.url ? `href="${esc(a.url)}" target="_blank" rel="noopener"` : ''} data-link style="flex:1;color:inherit;text-decoration:none">${esc(a.parceiro)} - ${esc(a.tarefa)}</a><b style="font-size:12px">${horas(a.horas)}</b>${botaoEditar(a.url, 'btn-card')}</div>`).join('')}` : ''}
      ${c.situacao !== 'completo' ? `<div class="rotulo">Sugestões de alocação</div>
        ${c.sugestoes.length ? '' : '<div class="pequeno" style="font-size:13px">Sem sugestões disponíveis</div>'}
        ${c.sugestoes.map((s, i) => {
          const meta = [s.lista, (s.datas || []).length ? s.datas.map(dataCurta).join(' e ') : '', s.horas > 0 ? horas(s.horas) : ''].filter(Boolean).join(' · ');
          return `<div class="sug"><div class="p">${esc(s.parceiro)}</div><div class="t">${esc(s.tarefa)}</div>
            ${meta ? `<div class="pequeno">${esc(meta)}</div>` : ''}
            ${s.url ? `<div class="acoes" style="margin-top:6px">${pode('agendar') ? `<button class="btn primario pq" data-a="agendar-sug" data-id="${esc(c.id)}" data-i="${i}">Agendar</button>` : ''}
              <a class="btn contorno pq" style="text-decoration:none" href="${esc(s.url)}" target="_blank" rel="noopener" data-link>Abrir no ClickUp</a></div>` : ''}</div>`;
        }).join('')}` : ''}
    </div>` : ''}
  </div>`;
}

MODULOS.push({
  id: 'ociosidade',
  titulo: 'Ociosidade',
  descricao: 'Consultores sem agenda e sugestões de alocação',
  icone: IC.pessoa,
  workflow: 'ociosidade.yml',
  arquivo: 'app_ociosidade.json',
  entradas: { telegram: 'false' }, // pelo app, não repete a mensagem do Telegram
  etapa: 'Calculando a ociosidade no ClickUp…',
  uiInicial: () => ({ abertos: new Set(), verCompletos: false }),
  interpretar: interpretarOciosidade,
  desenhar(st, { cont, abas, acoes }) {
    const d = st.dados, ui = st.ui;
    abas.innerHTML = '';
    acoes.innerHTML = `<button class="icone-btn" data-a="enviar" aria-label="Enviar relatório">${IC.compartilhar}</button>`;
    const resumo = (t, n, c) => `<div class="resumo-o" style="background:${mistura(c, 10)};color:${c}"><b>${n}</b><span>${t}</span></div>`;
    trocarHTML(cont, `
      <div class="secao" style="padding:16px">
        <h2 class="dia-titulo">${esc(diaExtenso(d.data))}</h2>
        <div class="numeros" style="margin-top:8px">${resumo('Sem agenda', d.semAgenda.length, COR_SEM)}${resumo('Com ociosidade', d.parciais.length, COR_PARCIAL)}${resumo('Completos', d.completos.length, COR_COMPLETO)}</div>
        ${d.data && d.data !== isoHoje() ? `<div class="erro-txt" style="margin-top:8px">Estes dados são de ${dataCurta(d.data)}. Toque em "Atualizar agora" para calcular o dia de hoje.</div>` : ''}
        ${st.erro ? `<div class="erro-txt">Não consegui buscar dados novos: ${esc(st.erro)}</div>` : ''}
      </div>
      <div class="divisor"></div>
      ${!d.semAgenda.length && !d.parciais.length ? '<div class="vazio" style="font-size:17px;color:var(--texto)">Ninguém ocioso hoje. 🎉</div>' : ''}
      ${d.semAgenda.length ? `<div class="sec-t" style="color:${COR_SEM}">Sem agenda</div>${d.semAgenda.map(c => cartaoOcioso(c, ui.abertos.has(c.id))).join('')}` : ''}
      ${d.parciais.length ? `<div class="sec-t" style="color:${COR_PARCIAL}">Com ociosidade</div>${d.parciais.map(c => cartaoOcioso(c, ui.abertos.has(c.id))).join('')}` : ''}
      ${d.completos.length ? `<button class="sec-t botao${ui.verCompletos ? ' aberto' : ''}" style="color:${COR_COMPLETO}" data-a="completos"><span>Agenda completa (${d.completos.length})</span>${IC.baixo}</button>
        ${ui.verCompletos ? d.completos.map(c => cartaoOcioso(c, ui.abertos.has(c.id))).join('') : ''}` : ''}`);
  },
  acao(nome, el, st, ev) {
    if (ev.target.closest('[data-link]')) return false;
    if (nome === 'editar') { abrirFormAgenda({ id: el.dataset.id }); return false; }
    if (nome === 'agendar-sug') {
      const c = st.dados.consultores.find(x => x.id === el.dataset.id), s = c && c.sugestoes[+el.dataset.i];
      if (s) abrirFormAgenda({ pai: { id: idTarefa(s.url), nome: s.tarefa, local: [s.parceiro, s.lista].filter(Boolean).join(' › ') },
        consultorId: c.id, data: st.dados.data, parceiro: s.parceiro });
      return false;
    }
    if (nome === 'ocioso') { alternar(st.ui.abertos, el.dataset.id); return; }
    if (nome === 'completos') { st.ui.verCompletos = !st.ui.verCompletos; return; }
    if (nome === 'enviar') { folhaEnviar('Enviar relatório', textoOciosidade(st.dados)); return false; }
    return false;
  },
});

// ---------------------------------------------------------------- Módulo 3: Demandas

const SEM_GERENTE = 'Sem gerente';
const numOuNull = v => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? null : Number(v);
const txts = a => (a || []).map(String).filter(x => x.trim());

function interpretarDemandas(json) {
  const r = JSON.parse(json);
  const clientes = (r.clientes || []).map(c => ({
    id: String(c.id), nome: c.nome || '', gerente: (c.gerente || '').trim() || SEM_GERENTE,
    horasPlanejadas: Number(c.horas_planejadas) || 0, horasRealizadas: Number(c.horas_realizadas) || 0, horasAgendadas: Number(c.horas_agendadas) || 0,
    listas: (c.listas || []).map(l => ({
      id: String(l.id), nome: l.nome || '', url: l.url || '',
      horasPlanejadas: Number(l.horas_planejadas) || 0, horasRealizadas: Number(l.horas_realizadas) || 0, horasAgendadas: Number(l.horas_agendadas) || 0,
      demandas: (l.demandas || []).map(o => ({
        id: String(o.id), nome: o.nome || '', url: o.url || '', status: o.status || '', statusCor: o.status_cor || '',
        responsaveis: txts(o.responsaveis), inicio: o.inicio || '', fim: o.fim || '', atrasada: !!o.atrasada,
        parceiro: o.parceiro || '', planejamento: !!o.planejamento, detalhamento: o.detalhamento || '',
        horasPlanejadas: numOuNull(o.horas_planejadas), horasRealizadas: Number(o.horas_realizadas) || 0, horasAgendadas: Number(o.horas_agendadas) || 0,
        agendas: (o.agendas || []).map(a => ({
          nome: a.nome || '', consultores: txts(a.consultores), data: a.data || '', horas: Number(a.horas) || 0, periodo: a.periodo || '',
          status: a.status || '', statusCor: a.status_cor || '', realizada: !!a.realizada, detalhamento: a.detalhamento || '', url: a.url || '',
        })),
      })),
    })),
  }));
  const qtd = c => c.listas.reduce((s, l) => s + l.demandas.length, 0);
  clientes.forEach(c => { c.qtd = qtd(c); });
  const gerentes = [...new Set(clientes.map(c => c.gerente))]
    .sort((a, b) => (a === SEM_GERENTE) - (b === SEM_GERENTE) || a.toLowerCase().localeCompare(b.toLowerCase()));
  return { geradoEm: r.gerado_em || '', hoje: r.hoje || '', clientes, gerentes };
}

function filtrarDemandas(d, termo, soAtrasadas, gerente) {
  const t = semAcento(termo.trim());
  const out = [];
  for (const c of d.clientes) {
    if (gerente && c.gerente !== gerente) continue;
    const tc = t && semAcento(c.gerente).includes(t) ? '' : t; // busca pelo gerente mostra tudo dele
    const listas = [];
    for (const l of c.listas) {
      const dems = l.demandas.filter(x => (!soAtrasadas || x.atrasada) && (!tc ||
        [x.nome, c.nome, l.nome, x.parceiro, x.status, x.responsaveis.join(' ')].some(v => semAcento(v).includes(tc))));
      if (dems.length) listas.push({ ...l, demandas: dems });
    }
    if (listas.length) out.push({ ...c, listas });
  }
  return out;
}

function resumoHoras(p, r, a) {
  const x = [];
  if (p > 0) x.push(horas(p) + ' plan.');
  x.push(horas(r) + ' real.');
  if (a > 0) x.push(horas(a) + ' agend.');
  return x.join(' · ');
}
const soma = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);

function linhaSub(a, chave, aberto, comPlanejamento) {
  const linha1 = comPlanejamento ? a.nome : [a.data ? dataCurta(a.data) : '', a.consultores.join(', ')].filter(Boolean).join(' · ');
  const linha2 = comPlanejamento
    ? [a.data ? dataCurta(a.data) : '', a.consultores.join(', '), a.periodo].filter(Boolean).join(' · ')
    : [a.nome, a.periodo].filter(Boolean).join(' · ');
  return `<div class="sub-linha" role="button" data-a="sub" data-k="${esc(chave)}">
    <div class="l"><span class="bolinha${a.realizada ? ' ok' : ''}">${a.realizada ? IC.ok : ''}</span>
      <div><div style="font-size:13px;font-weight:600" class="${aberto ? '' : 'uma-linha'}">${esc(linha1)}</div>
      ${linha2 ? `<div class="pequeno ${aberto ? '' : 'uma-linha'}">${esc(linha2)}</div>` : ''}</div>
      ${a.horas > 0 || !comPlanejamento ? `<b style="font-size:12px">${horas(a.horas)}</b>` : ''}</div>
    ${aberto ? `<div class="extra">${selo(a.status, a.statusCor)}
      ${a.detalhamento ? `<div class="pre" style="font-size:12px;margin-top:4px">${esc(a.detalhamento)}</div>` : ''}
      <div class="acoes-card">${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener" data-link>Abrir no ClickUp</a>` : ''}${botaoEditar(a.url, 'btn-card')}</div></div>` : ''}
  </div>`;
}

function cartaoDemanda(d, ui) {
  const aberto = ui.abertos.has('d:' + d.id);
  const datas = (d.inicio || d.fim) ? `<div class="data-linha ${d.atrasada ? 'atraso' : ''}">${IC.calendario}
    ${d.inicio ? dataCurta(d.inicio) : '—'} → ${d.fim ? dataCurta(d.fim) : '—'}${d.atrasada ? ' · atrasada' : ''}</div>` : '';
  return `<div class="cartao recuo" role="button" data-a="abre" data-k="d:${esc(d.id)}">
    <div class="topo${aberto ? ' aberto' : ''}"><span class="nome-t${aberto ? '' : ' corta'}">${esc(d.nome)}</span>${IC.baixo}</div>
    <div class="linha-selos">${selo(d.status, d.statusCor)}${d.planejamento ? '<span style="font-size:10px;font-weight:700;color:#b08800">PLANEJAMENTO</span>' : ''}</div>
    ${d.responsaveis.length ? `<div class="pequeno uma-linha" style="margin-top:4px">${esc(d.responsaveis.join(', '))}</div>` : ''}
    ${datas}
    ${barraHoras(d.horasPlanejadas, d.horasRealizadas, d.horasAgendadas, 'Sem horas planejadas ou agendadas')}
    ${aberto ? `<div style="margin-top:8px">
      ${d.detalhamento ? `<div class="rotulo">Detalhamento</div><div class="pre">${esc(d.detalhamento)}</div>` : ''}
      ${d.agendas.length ? `<div class="rotulo">Agendas (${d.agendas.length})</div>${d.agendas.map((a, i) => linhaSub(a, `${d.id}|${i}`, ui.subs.has(`${d.id}|${i}`), false)).join('')}` : ''}
      ${d.url ? `<div class="acoes">${pode('agendar') ? `<button class="btn primario pq" data-a="agendar-dem" data-id="${esc(d.id)}">Agendar</button>` : ''}
        <a class="btn contorno pq" style="text-decoration:none" href="${esc(d.url)}" target="_blank" rel="noopener" data-link>Abrir no ClickUp</a></div>` : ''}
    </div>` : ''}
  </div>`;
}

function listaDemandas(st) {
  const d = st.dados, ui = st.ui;
  const gerente = d.gerentes.includes(ui.gerente) ? ui.gerente : null;
  const filtrando = !!ui.busca.trim() || ui.soAtrasadas;
  const clientes = filtrarDemandas(d, ui.busca, ui.soAtrasadas, gerente);
  if (!clientes.length) return `<div class="vazio">${filtrando ? 'Nenhuma demanda encontrada.' : 'Nenhuma demanda em andamento.'}</div>`;
  const grupos = new Map();
  clientes.forEach(c => { if (!grupos.has(c.gerente)) grupos.set(c.gerente, []); grupos.get(c.gerente).push(c); });
  let h = '';
  for (const [g, cs] of grupos) {
    const gAberto = filtrando || gerente != null || !ui.gerentesFechados.has(g);
    h += `<button class="grupo gerente${gAberto ? ' aberto' : ''}" data-a="gerente-grupo" data-g="${esc(g)}">${IC.pessoa}
      <span class="t"><b>${esc(g)}</b><span class="pequeno">${cs.length} cliente${cs.length === 1 ? '' : 's'} · ${resumoHoras(soma(cs, c => c.horasPlanejadas), soma(cs, c => c.horasRealizadas), soma(cs, c => c.horasAgendadas))}</span></span>
      <span class="contador">${soma(cs, c => c.qtd)}</span>${IC.baixo}</button>`;
    if (!gAberto) continue;
    for (const c of cs) {
      const cAberto = filtrando || ui.abertos.has('c:' + c.id);
      h += `<button class="grupo${cAberto ? ' aberto' : ''}" data-a="abre" data-k="c:${esc(c.id)}">
        <span class="t"><b>${esc(c.nome)}</b><span class="pequeno">${resumoHoras(c.horasPlanejadas, c.horasRealizadas, c.horasAgendadas)}</span></span>
        <span class="contador">${c.qtd}</span>${IC.baixo}</button>`;
      if (!cAberto) continue;
      for (const l of c.listas) {
        const lAberto = filtrando || ui.abertos.has('l:' + l.id);
        h += `<button class="grupo lista${lAberto ? ' aberto' : ''}" data-a="abre" data-k="l:${esc(l.id)}">
          <span class="ponto" style="background:var(--verde);width:8px;height:8px"></span>
          <span class="t"><b>${esc(l.nome)}</b><span class="pequeno">${resumoHoras(l.horasPlanejadas, l.horasRealizadas, l.horasAgendadas)}</span></span>
          <span class="contador">${l.demandas.length}</span>${IC.baixo}</button>`;
        if (lAberto) h += l.demandas.map(x => cartaoDemanda(x, ui)).join('');
      }
    }
  }
  return h;
}

MODULOS.push({
  id: 'demandas',
  titulo: 'Demandas',
  descricao: 'Demandas em andamento por gerente, cliente, lista e demanda',
  icone: IC.lista,
  workflow: 'demandas.yml',
  arquivo: 'app_demandas.json',
  etapa: 'Buscando as demandas no ClickUp…',
  uiInicial: () => ({ busca: '', soAtrasadas: false, gerente: null, abertos: new Set(), gerentesFechados: new Set(), subs: new Set() }),
  interpretar: interpretarDemandas,
  desenhar(st, { cont, abas, acoes, inteiro }) {
    const d = st.dados, ui = st.ui;
    abas.innerHTML = ''; acoes.innerHTML = '';
    const gerente = d.gerentes.includes(ui.gerente) ? ui.gerente : null;
    const doGerente = d.clientes.filter(c => !gerente || c.gerente === gerente);
    const todas = doGerente.flatMap(c => c.listas.flatMap(l => l.demandas));
    const atrasadas = todas.filter(x => x.atrasada).length;
    const numero = (t, v, c) => `<div class="num"><b style="color:${c}">${v}</b><span>${t}</span></div>`;
    const topo = `
      <div class="secao">
        <div class="numeros">${numero('Demandas', todas.length, 'var(--verde)')}${numero('Planejadas', horas(soma(todas, x => x.horasPlanejadas)), 'var(--texto)')}${numero('Realizadas', horas(soma(todas, x => x.horasRealizadas)), 'var(--verde)')}${numero('Agendadas', horas(soma(todas, x => x.horasAgendadas)), 'var(--azul)')}</div>
        ${campoBusca(ui.busca, 'Buscar cliente, lista, demanda ou pessoa')}
        ${d.gerentes.length > 1 ? `<div class="chips" data-rola="gerentes">
          <button class="chip${gerente ? '' : ' sel'}" data-a="gerente">Todos os gerentes</button>
          ${d.gerentes.map(g => `<button class="chip${gerente === g ? ' sel' : ''}" data-a="gerente" data-g="${esc(g)}">${IC.pessoa}${esc(g)} (${soma(d.clientes.filter(c => c.gerente === g), c => c.qtd)})</button>`).join('')}
        </div>` : ''}
        ${atrasadas > 0 ? `<div class="chips"><button class="chip${ui.soAtrasadas ? ' sel' : ''}" data-a="atrasadas">Só atrasadas (${atrasadas})</button></div>` : ''}
        ${st.erro ? `<div class="erro-txt">Não consegui buscar dados novos: ${esc(st.erro)}</div>` : ''}
      </div>
      <div class="divisor"></div>`;
    const focado = document.activeElement && document.activeElement.id === 'busca';
    if (inteiro || !focado || !$('#lista-dem')) {
      trocarHTML(cont, topo + '<div id="lista-dem"></div>');
      ligarBusca(st, () => { $('#lista-dem').innerHTML = listaDemandas(st); });
    }
    $('#lista-dem').innerHTML = listaDemandas(st);
  },
  acao(nome, el, st, ev) {
    const ui = st.ui;
    if (ev.target.closest('[data-link]')) return false;
    switch (nome) {
      case 'abre': alternar(ui.abertos, el.dataset.k); return;
      case 'sub': alternar(ui.subs, el.dataset.k); return;
      case 'gerente-grupo': alternar(ui.gerentesFechados, el.dataset.g); return;
      case 'editar': abrirFormAgenda({ id: el.dataset.id }); return false;
      case 'agendar-dem': {
        for (const c of st.dados.clientes) for (const l of c.listas) {
          const d = l.demandas.find(x => x.id === el.dataset.id);
          if (d) { abrirFormAgenda({ pai: { id: d.id, nome: d.nome, local: c.nome + ' › ' + l.nome }, parceiro: d.parceiro, cliente: c.nome }); return false; }
        }
        return false;
      }
      case 'gerente': ui.gerente = el.dataset.g && ui.gerente !== el.dataset.g ? el.dataset.g : null; return;
      case 'atrasadas': ui.soAtrasadas = !ui.soAtrasadas; return;
      case 'limpar-busca': ui.busca = ''; $('#busca').value = ''; $('#busca').blur(); return;
    }
    return false;
  },
});

// ---------------------------------------------------------------- Módulos 4 e 5: Backlog Base e Comitê

const COLACAO = new Intl.Collator('pt-BR', { sensitivity: 'base' });

function interpretarTarefas(json) {
  const r = JSON.parse(json);
  const grupos = (r.grupos || []).map(g => ({
    id: String(g.id ?? g.nome), nome: g.nome || '', cor: g.cor || '',
    itens: (g.itens || []).map(o => ({
      id: String(o.id), nome: o.nome || '', url: o.url || '', status: o.status || '', statusCor: o.status_cor || '',
      prioridade: o.prioridade || '', prioridadeCor: o.prioridade_cor || '', responsaveis: txts(o.responsaveis),
      espaco: o.espaco || '', pasta: o.pasta || '', lista: o.lista || '', parceiro: o.parceiro || '',
      agendamento: o.agendamento || '', agendamentoCor: o.agendamento_cor || '', origem: o.origem || '',
      usuarioCliente: o.usuario_cliente || '', detalhamento: o.detalhamento || '', criado: o.criado || '',
      diasFila: numOuNull(o.dias_fila), inicio: o.inicio || '', fim: o.fim || '', atrasada: !!o.atrasada,
      horasPlanejadas: numOuNull(o.horas_planejadas), horasRealizadas: Number(o.horas_realizadas) || 0, horasAgendadas: Number(o.horas_agendadas) || 0,
      // Backlog Desenvolvimento: ordem da prioridade (1 urgente … 5 sem) e criação em ms, para o Kanban
      prioridadeOrdem: numOuNull(o.prioridade_ordem) ?? 5, criadoMs: Number(o.criado_ms) || 0,
      subtarefas: (o.subtarefas || []).map(a => ({
        nome: a.nome || '', consultores: txts(a.consultores), data: a.data || '', horas: Number(a.horas) || 0, periodo: a.periodo || '',
        status: a.status || '', statusCor: a.status_cor || '', realizada: !!a.realizada, detalhamento: a.detalhamento || '', url: a.url || '',
        planejamento: !!a.planejamento, consultorIds: txts(a.consultor_ids),
      })),
    })),
  }));
  // colunas do Kanban (consultores de desenvolvimento), em ordem alfabética
  const colunas = (r.colunas || []).map(c => ({ id: String(c.id), nome: c.nome || '' }));
  colunas.sort((a, b) => COLACAO.compare(a.nome, b.nome));
  return { titulo: r.titulo || '', geradoEm: r.gerado_em || '', hoje: r.hoje || '', grupos, colunas, qtd: soma(grupos, g => g.itens.length) };
}

function cartaoTarefa(t, cfg, ui) {
  const aberto = ui.abertos.has(t.id);
  const local = [cfg.mostrarEspaco ? t.espaco : '', t.pasta, t.lista].filter(Boolean).join(' / ');
  const pessoas = [t.parceiro, t.responsaveis.join(', ') || 'Sem responsável'].filter(Boolean).join(' · ');
  const datas = [];
  if (t.criado) datas.push('Criada ' + dataCurta(t.criado) + (t.diasFila > 0 ? ` (${t.diasFila} dias)` : ''));
  if (t.fim) datas.push('Vence ' + dataCurta(t.fim) + (t.atrasada ? ' · atrasada' : ''));
  const extras = [['Usuário cliente', t.usuarioCliente], ['Origem', t.origem], ['Agendamento', t.agendamento]].filter(x => x[1]);
  return `<div class="cartao" role="button" data-a="abre" data-k="${esc(t.id)}">
    ${local ? `<div class="local">${esc(local)}</div>` : ''}
    <div class="topo${aberto ? ' aberto' : ''}"><span class="nome-t${aberto ? '' : ' corta'}">${esc(t.nome)}</span>${IC.baixo}</div>
    <div class="linha-selos">${selo(t.status, t.statusCor)}${cfg.mostrarPrioridade ? selo(t.prioridade, t.prioridadeCor) : ''}
      ${t.subtarefas.length ? `<span class="pequeno" style="font-size:11px;white-space:nowrap">${t.subtarefas.length} subtarefa${t.subtarefas.length > 1 ? 's' : ''}</span>` : ''}</div>
    <div class="pequeno uma-linha" style="margin-top:4px">${esc(pessoas)}</div>
    ${datas.length ? `<div class="data-linha ${t.atrasada ? 'atraso' : ''}">${IC.calendario}${esc(datas.join(' · '))}</div>` : ''}
    ${barraHoras(t.horasPlanejadas, t.horasRealizadas, t.horasAgendadas)}
    ${aberto ? `<div style="margin-top:8px">
      ${extras.map(([r, v]) => `<div class="pequeno">${esc(r)}: ${esc(v)}</div>`).join('')}
      ${t.detalhamento ? `<div class="rotulo">Detalhamento</div><div class="pre">${esc(t.detalhamento)}</div>` : ''}
      ${t.subtarefas.length ? `<div class="rotulo">Subtarefas (${t.subtarefas.length})</div>${t.subtarefas.map((a, i) => linhaSub(a, `${t.id}|${i}`, ui.subs.has(`${t.id}|${i}`), true)).join('')}` : ''}
      ${t.url ? `<div class="acoes">${pode('agendar') ? `<button class="btn primario pq" data-a="agendar-tar" data-id="${esc(t.id)}">Agendar</button>` : ''}
        <a class="btn contorno pq" style="text-decoration:none" href="${esc(t.url)}" target="_blank" rel="noopener" data-link>Abrir no ClickUp</a></div>` : ''}
    </div>` : ''}
  </div>`;
}

function listaTarefas(st, cfg) {
  const d = st.dados, ui = st.ui;
  const t = semAcento(ui.busca.trim());
  const filtrando = !!t || ui.soAtrasadas;
  const grupos = d.grupos.map(g => ({ ...g, itens: g.itens.filter(x => (!cfg.filtroItem || cfg.filtroItem(x, d)) && (!ui.soAtrasadas || x.atrasada) && (!t ||
    [x.nome, x.pasta, x.lista, x.espaco, x.parceiro, x.status, x.prioridade, x.agendamento, x.usuarioCliente, x.detalhamento, x.responsaveis.join(' ')]
      .some(v => semAcento(v).includes(t)))) })).filter(g => g.itens.length);
  if (!grupos.length) return `<div class="vazio">${filtrando ? 'Nenhuma tarefa encontrada.' : esc(cfg.textoVazio)}</div>`;
  return grupos.map(g => {
    const aberto = filtrando || !ui.fechados.has(g.id);
    return `<button class="grupo${aberto ? ' aberto' : ''}" data-a="grupo" data-g="${esc(g.id)}">
      <span class="ponto" style="background:${cor(g.cor, '#1f7a45')};width:12px;height:12px"></span>
      <span class="t"><b>${esc(g.nome)}</b></span><span class="contador">${g.itens.length}</span>${IC.baixo}</button>
      ${aberto ? g.itens.map(x => cartaoTarefa(x, cfg, ui)).join('') : ''}`;
  }).join('');
}

function moduloTarefas(cfg) {
  return {
    ...cfg,
    workflow: 'backlog_comite.yml',
    etapa: 'Buscando as tarefas no ClickUp…',
    uiInicial: () => ({ busca: '', soAtrasadas: false, fechados: new Set(), abertos: new Set(), subs: new Set() }),
    interpretar: interpretarTarefas,
    desenhar(st, { cont, abas, acoes, inteiro }) {
      const d = st.dados, ui = st.ui;
      abas.innerHTML = ''; acoes.innerHTML = '';
      const visiveis = g => cfg.filtroItem ? g.itens.filter(x => cfg.filtroItem(x, d)) : g.itens;
      const atrasadas = soma(d.grupos, g => visiveis(g).filter(x => x.atrasada).length);
      const topo = `<div class="secao">
        ${cfg.avisoLista ? `<div class="pequeno" style="margin-bottom:8px">${esc(cfg.avisoLista)}</div>` : ''}
        <div class="numeros rola" data-rola="nums"><div class="num"><b style="color:var(--verde)">${soma(d.grupos, g => visiveis(g).length)}</b><span>Total</span></div>
          ${d.grupos.map(g => `<div class="num"><b style="color:${cor(g.cor, 'var(--texto)')}">${visiveis(g).length}</b><span>${esc(g.nome)}</span></div>`).join('')}</div>
        ${campoBusca(ui.busca, 'Buscar cliente, tarefa, status ou pessoa')}
        ${atrasadas > 0 ? `<div class="chips"><button class="chip${ui.soAtrasadas ? ' sel' : ''}" data-a="atrasadas">Só atrasadas (${atrasadas})</button></div>` : ''}
        ${st.erro ? `<div class="erro-txt">Não consegui buscar dados novos: ${esc(st.erro)}</div>` : ''}
      </div><div class="divisor"></div>`;
      const focado = document.activeElement && document.activeElement.id === 'busca';
      if (inteiro || !focado || !$('#lista-tar')) {
        trocarHTML(cont, topo + '<div id="lista-tar"></div>');
        ligarBusca(st, () => { $('#lista-tar').innerHTML = listaTarefas(st, cfg); });
      }
      $('#lista-tar').innerHTML = listaTarefas(st, cfg);
    },
    acao(nome, el, st, ev) {
      const ui = st.ui;
      if (ev.target.closest('[data-link]')) return false;
      switch (nome) {
        case 'abre': alternar(ui.abertos, el.dataset.k); return;
        case 'sub': alternar(ui.subs, el.dataset.k); return;
        case 'grupo': alternar(ui.fechados, el.dataset.g); return;
        case 'editar': abrirFormAgenda({ id: el.dataset.id }); return false;
        case 'agendar-tar': {
          for (const g of st.dados.grupos) {
            const t = g.itens.find(x => x.id === el.dataset.id);
            if (t) { abrirFormAgenda(cfg.agendaNoItem ? pedidoBacklog(t) : { pai: { id: t.id, nome: t.nome, local: [t.pasta, t.lista].filter(Boolean).join(' › ') }, parceiro: t.parceiro, cliente: t.pasta }); return false; }
          }
          return false;
        }
        case 'atrasadas': ui.soAtrasadas = !ui.soAtrasadas; return;
        case 'limpar-busca': ui.busca = ''; $('#busca').value = ''; $('#busca').blur(); return;
      }
      return false;
    },
  };
}

MODULOS.push(moduloTarefas({
  id: 'backlog',
  titulo: 'Backlog Base',
  descricao: 'Backlog base a agendar e previsto',
  icone: IC.sino,
  arquivo: 'app_backlog_base.json',
  textoVazio: 'Nenhuma tarefa no Backlog Base para agendar.',
  mostrarEspaco: false,
  mostrarPrioridade: true,
}));

// Comitê de Personalizações retirado do app em 23/10/2026 (substituído pelo Backlog Desenvolvimento)

// ---------------------------------------------------------------- Módulo 6: Backlog Desenvolvimento

/*
 * Tarefas do PMO BP-MS com Etapa "Personalização / Customização" e status
 * pendente ou em andamento. Os dados vêm AO VIVO do ClickUp pelo servidor do
 * app (ação "backlogDev", a mesma do APK) — não depende de workflow do GitHub.
 *
 * Abas: Lista (agrupada por prioridade) e Kanban ("A distribuir" + uma coluna
 * por consultor, em ordem alfabética + "Em Validação" no fim, à direita). Arrastar um cartão até a coluna de um
 * consultor (segurar no celular; clicar e arrastar no PC) abre o formulário de
 * agenda com o consultor já escolhido; a data de vencimento e os demais campos
 * obrigatórios têm de ser informados. "Agendar" sempre cria a subtarefa dentro
 * do item do backlog.
 */

const FILA = '_fila';
const VALIDACAO = '_validacao';
const emValidacao = t => /valida/.test(semAcento(t.status || ''));

function pedidoBacklog(t, consultorId = '') {
  return {
    pai: { id: t.id, nome: t.nome, local: [t.pasta, t.lista].filter(Boolean).join(' › ') },
    consultorId, parceiro: t.parceiro, cliente: t.pasta,
    paiFixo: true, exigirData: true, etapaPai: true,
  };
}

function itemBacklog(d, id) {
  for (const g of (d && d.grupos) || []) { const t = g.itens.find(x => x.id === id); if (t) return t; }
  return null;
}

/*
 * v2.6.0 — a demanda é o entregável; quem executa são as subtarefas (agendas).
 * Uma demanda aparece na coluna de TODOS os consultores que estão em alguma
 * subtarefa "ativa" dela. Subtarefa ativa = não é de planejamento e o status
 * dela está no mesmo critério que coloca a demanda no Kanban (os status das
 * próprias demandas carregadas + não iniciado / pendente / em andamento /
 * em validação). Só contam os consultores de desenvolvimento (as colunas que
 * vêm do servidor); os demais consultores do ClickUp são ignorados. Sem
 * subtarefa ativa de um desenvolvedor -> "A distribuir" (com o motivo).
 */
const STATUS_KANBAN_BASE = ['nao iniciado', 'pendente', 'em andamento', 'em validacao'];
const normStatus = s => semAcento(s).trim();

function criterioStatus(d) {
  const s = new Set(STATUS_KANBAN_BASE);
  for (const g of d.grupos) for (const it of g.itens) if (it.status) s.add(normStatus(it.status));
  return s;
}
/** Subtarefa conta como "com o consultor" quando o status dela segue o critério do Kanban. */
function subAtiva(a, crit) {
  if (a.planejamento || a.realizada) return false;
  return !a.status || crit.has(normStatus(a.status));
}
/** Pares [chave, nome] dos consultores de uma subtarefa (id do ClickUp; sem id, o nome). */
function consultoresSub(a, porNome) {
  const ids = a.consultorIds || [], nomes = a.consultores || [];
  if (ids.length) return ids.map((id, i) => [id, nomes.length === ids.length ? nomes[i] : '']);
  return nomes.map(n => [porNome.get(semAcento(n)) || 'n:' + n, n]);
}

function filtrarItensBacklog(d, busca) {
  const t = semAcento((busca || '').trim());
  return d.grupos.flatMap(g => g.itens)
    .filter(x => !t || [x.nome, x.pasta, x.lista, x.parceiro, x.status, x.prioridade, x.responsaveis.join(' '),
      x.subtarefas.flatMap(a => a.consultores).join(' ')].some(v => semAcento(v).includes(t)))
    .sort((a, b) => a.prioridadeOrdem - b.prioridadeOrdem || a.criadoMs - b.criadoMs);
}

/** Devs de uma subtarefa (só as chaves que são colunas do Kanban). */
const devsDaSub = (a, ctx) => consultoresSub(a, ctx.porNome).map(([k]) => k).filter(k => ctx.devs.has(k));

/** Quem está com cada demanda: Map(dev -> subtarefas ativas dele); temAgenda = já teve subtarefa de algum dev. */
function analisarDemanda(it, ctx) {
  const ativos = new Map();
  const doDev = it.subtarefas.filter(a => !a.planejamento && devsDaSub(a, ctx).length);
  for (const a of doDev) {
    if (!subAtiva(a, ctx.crit)) continue;
    for (const k of devsDaSub(a, ctx)) {
      if (!ativos.has(k)) ativos.set(k, []);
      ativos.get(k).push(a);
    }
  }
  return { ativos, temAgenda: doDev.length > 0 };
}

function contextoBacklog(d) {
  const crit = criterioStatus(d);
  const porNome = new Map(d.colunas.map(c => [semAcento(c.nome), c.id]));
  const nomes = new Map(d.colunas.map(c => [c.id, c.nome]));
  return { crit, porNome, nomes, devs: new Set(d.colunas.map(c => c.id)) };
}

/** Regra do Kanban: demanda sem subtarefa ativa de um desenvolvedor (e não em validação). */
const ctxCache = new WeakMap();
function aDistribuir(it, d) {
  if (emValidacao(it)) return false;
  if (!ctxCache.has(d)) ctxCache.set(d, contextoBacklog(d));
  return analisarDemanda(it, ctxCache.get(d)).ativos.size === 0;
}

function montarColunas(d, busca) {
  const ctx = contextoBacklog(d);
  const itens = filtrarItensBacklog(d, busca);
  const por = new Map([[FILA, []], ...d.colunas.map(c => [c.id, []]), [VALIDACAO, []]]);
  const resumo = { total: 0, comAlguem: 0, semNinguem: 0, multi: 0 };
  for (const it of itens) {
    const { ativos, temAgenda } = analisarDemanda(it, ctx);
    // status "Em Validação": só na última coluna, à direita
    if (emValidacao(it)) { por.get(VALIDACAO).push({ item: it, proxima: null, outros: [...ativos.keys()] }); continue; }
    resumo.total++;
    if (!ativos.size) {
      resumo.semNinguem++;
      por.get(FILA).push({ item: it, proxima: null, outros: [], motivo: temAgenda ? 'Sem agenda ativa — parada' : 'Nenhuma subtarefa atribuída' });
      continue;
    }
    resumo.comAlguem++;
    if (ativos.size > 1) resumo.multi++;
    for (const [c, subs] of ativos) {
      const prox = subs.map(a => a.data).filter(Boolean).sort()[0] || null;
      por.get(c).push({ item: it, proxima: prox, outros: [...ativos.keys()].filter(k => k !== c) });
    }
  }
  const cols = [{ id: FILA, nome: 'A distribuir', itens: por.get(FILA) },
    ...d.colunas.map(c => ({ id: c.id, nome: c.nome, itens: por.get(c.id) })),
    { id: VALIDACAO, nome: 'Em Validação', itens: por.get(VALIDACAO) }];
  cols.resumo = resumo;
  cols.nomes = ctx.nomes;
  return cols;
}

function cartaoKanban(x, colId, nomes) {
  const t = x.item;
  const local = [t.pasta, t.lista].filter(Boolean).join(' / ');
  const meta = [t.criado ? 'Criada ' + dataCurta(t.criado) : '', t.fim ? 'Vence ' + dataCurta(t.fim) + (t.atrasada ? ' · atrasada' : '') : ''].filter(Boolean).join(' · ');
  const outros = (x.outros || []).map(k => nomes.get(k) || k.replace(/^n:/, ''));
  return `<div class="kb-card" role="button" tabindex="0" data-a="kb-detalhe" data-kb="${esc(t.id)}" data-col="${esc(colId)}">
    ${local ? `<div class="local">${esc(local)}</div>` : ''}
    <div class="kb-nome">${esc(t.nome)}</div>
    <div class="linha-selos" style="flex-wrap:wrap">${selo(t.prioridade || 'Sem prioridade', t.prioridadeCor || '#b5bcc2')}${selo(t.status, t.statusCor)}</div>
    ${x.motivo ? `<div class="kb-motivo">${IC.alerta}${esc(x.motivo)}</div>` : ''}
    ${outros.length ? `<div class="kb-outros">${IC.pessoa}${colId === VALIDACAO ? '' : 'Também com '}${esc(outros.join(', '))}</div>` : ''}
    ${x.proxima ? `<div class="pequeno" style="margin-top:4px">Próxima agenda: ${esc(dataCurta(x.proxima))}</div>` : ''}
    ${meta ? `<div class="pequeno${t.atrasada ? ' atraso-txt' : ''}" style="margin-top:2px">${esc(meta)}</div>` : ''}
  </div>`;
}

function resumoKanban(r) {
  const n = (t, v, c) => `<div class="num"><b style="color:${c}">${v}</b><span>${t}</span></div>`;
  return `<div class="secao" style="padding-top:4px;padding-bottom:4px"><div class="numeros">${n('Demandas', r.total, 'var(--texto)')}${n('Com consultor', r.comAlguem, 'var(--verde)')}${n('A distribuir', r.semNinguem, r.semNinguem ? 'var(--vermelho)' : 'var(--texto-2)')}${n('2+ consultores', r.multi, 'var(--azul)')}</div></div>`;
}

function quadroKanban(st) {
  const cols = montarColunas(st.dados, st.ui.busca);
  return `${resumoKanban(cols.resumo)}<div class="kanban" data-rola="kanban">${cols.map(c => `
    <div class="kb-col${c.id === FILA ? ' fila' : c.id === VALIDACAO ? ' validacao' : ''}" data-col="${esc(c.id)}">
      <div class="kb-cab"><b>${esc(c.nome)}</b><span class="contador">${c.itens.length}</span></div>
      <div class="kb-itens">${c.itens.length ? c.itens.map(x => cartaoKanban(x, c.id, cols.nomes)).join('')
        : `<div class="pequeno kb-vazio">${c.id === FILA ? 'Nada a distribuir' : c.id === VALIDACAO ? 'Nada em validação' : 'Arraste uma tarefa para cá'}</div>`}</div>
    </div>`).join('')}</div>`;
}


// --- Gantt (aba 3): linhas por tarefa (demanda) ou por consultor

/*
 * Cada agenda (subtarefa, exceto planejamento) é um bloco de um dia na cor do
 * consultor; concluída fica esmaecida, fora do critério do Kanban fica hachurada.
 * A barra fina de fundo é o período da demanda (início/1ª agenda até
 * vencimento/última agenda). "Por consultor": um grupo por consultor com as
 * demandas que estão com ele (mesma regra do Kanban) e o grupo "A distribuir".
 * Tocar numa linha ou bloco abre o detalhe da demanda (editar / agendar).
 */
const GT_ZOOM = { semana: { dias: 28, w: 40, voltar: 7 }, mes: { dias: 70, w: 20, voltar: 14 }, trimestre: { dias: 130, w: 9, voltar: 21 } };
const GT_CORES = ['#2f7dd1', '#d9822b', '#1f9d63', '#a24bd1', '#d64545', '#15a3a3', '#b8932a', '#c2569b', '#5468d4', '#6b8e23'];
const GT_DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
// pílulas de cliente: [fundo, texto] claros, uma cor por cliente
const GT_CLIENTES = [['#dbeafe', '#1e4fa3'], ['#fde2cf', '#9a4310'], ['#d7f2e1', '#16673d'], ['#ece0fb', '#6633a3'], ['#fde0e0', '#a12a2a'],
  ['#d3f1f1', '#0f6b6b'], ['#f6ecc6', '#7a5d07'], ['#fadcec', '#962f6c'], ['#e0e4fb', '#3442a0'], ['#e6efd2', '#4b6a14'], ['#ececec', '#4a4a4a'], ['#fbe5d6', '#8a3d1c']];
const GT_ORDENS = [['prioridade', 'Prioridade'], ['nome', 'Tarefa'], ['cliente', 'Cliente'], ['entrega', 'Entrega']];
const GT_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const isoDe = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const somaDias = (iso, n) => { const d = parseDia(iso); d.setDate(d.getDate() + n); return isoDe(d); };
const difDias = (a, b) => Math.round((parseDia(a) - parseDia(b)) / 864e5);

function gtUi(ui) {
  if (!ui.gt) ui.gt = { modo: 'tarefa', zoom: 'mes', inicio: '', ordem: guardar.ler('gt.ordem') || 'prioridade' };
  if (!ui.gt.inicio) { ui.gt.inicio = somaDias(isoHoje(), -GT_ZOOM[ui.gt.zoom].voltar); ui.gt.rolarHoje = true; }
  return ui.gt;
}

/** Fundo da trilha: fins de semana sombreados, repetindo a cada 7 dias a partir do 1º dia da janela. */
function gtFundo(inicio, w) {
  const s = parseDia(inicio).getDay(), partes = [];
  for (let i = 0; i < 7; i++) {
    const dw = (s + i) % 7, c = dw === 0 || dw === 6 ? 'var(--gt-fds)' : 'transparent';
    partes.push(`${c} ${i * w}px ${(i + 1) * w}px`);
  }
  return `background-image:repeating-linear-gradient(90deg, ${partes.join(', ')});background-size:${7 * w}px 100%;background-position:var(--gt-rot) 0`;
}

function gtCabecalho(g, dias, w, larg) {
  const hoje = isoHoje();
  let meses = '', diasH = '';
  for (let i = 0; i < dias; i++) {
    const iso = somaDias(g.inicio, i), d = parseDia(iso);
    if (i === 0 || d.getDate() === 1) meses += `<span class="gt-mes" style="left:${i * w}px">${GT_MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}</span>`;
    const mostra = w >= 18 || d.getDay() === 1;
    if (mostra) diasH += `<span class="gt-dia${iso === hoje ? ' hoje' : ''}" style="left:${i * w}px;width:${w >= 18 ? w : w * 7}px">${w >= 36 ? GT_DIAS[d.getDay()] + '<br>' : ''}${d.getDate()}</span>`;
  }
  return `<div class="gt-linha gt-cab"><div class="gt-rot"></div><div class="gt-trilha" style="width:${larg}px">${meses}<div class="gt-dias">${diasH}</div></div></div>`;
}

function gtBlocos(subs, g, dias, w, corDe, ctx, chaveItem, col, soDe) {
  // dias seguidos do mesmo consultor e mesmo estado viram um único segmento
  const dias_ = new Map();
  for (const a of subs) {
    if (!a.data) continue;
    const x = difDias(a.data, g.inicio);
    if (x < 0 || x >= dias) continue;
    const cons = consultoresSub(a, ctx.porNome);
    const k = soDe || (cons.find(([c]) => ctx.devs.has(c)) || cons[0] || [''])[0];
    const estado = a.realizada ? 'feita' : !subAtiva(a, ctx.crit) ? 'fora' : 'ativa';
    const ch = `${k}|${estado}|${x}`;
    if (!dias_.has(ch)) dias_.set(ch, { k, estado, x, horas: 0, dicas: [] });
    const o = dias_.get(ch);
    o.horas += a.horas || 0;
    o.dicas.push([dataCurta(a.data), a.consultores.join(', ') || 'Sem consultor', a.periodo, a.horas ? horas(a.horas) : '', a.status].filter(Boolean).join(' · '));
  }
  const lista = [...dias_.values()].sort((p, q) => p.k.localeCompare(q.k) || p.estado.localeCompare(q.estado) || p.x - q.x);
  const segs = [];
  for (const o of lista) {
    const u = segs[segs.length - 1];
    if (u && u.k === o.k && u.estado === o.estado && u.x + u.n === o.x) { u.n++; u.horas += o.horas; u.dicas.push(...o.dicas); }
    else segs.push({ ...o, n: 1, dicas: [...o.dicas] });
  }
  return segs.map(o => {
    const larg = o.n * w - 2;
    const txt = larg >= 26 && o.horas ? `<b>${esc(horas(o.horas))}</b>` : '';
    return `<i class="gt-bloco ${o.estado}" style="left:${o.x * w + 1}px;width:${Math.max(4, larg)}px;--c:${corDe(o.k)}" title="${esc(o.dicas.join('\n'))}" data-a="kb-detalhe" data-kb="${esc(chaveItem)}" data-col="${esc(col)}">${txt}</i>`;
  }).join('');
}

/** Barra do período da demanda (ou das agendas de um consultor nela). */
function gtPeriodo(ini, fim, g, dias, w, c, tracejada) {
  if (!ini && !fim) return '';
  ini = ini || fim; fim = fim || ini;
  if (fim < ini) [ini, fim] = [fim, ini];
  const a = Math.max(0, difDias(ini, g.inicio)), b = Math.min(dias - 1, difDias(fim, g.inicio));
  if (b < 0 || a > dias - 1) return '';
  return `<span class="gt-barra${tracejada ? ' tracejada' : ''}" style="left:${a * w}px;width:${(b - a + 1) * w}px;--c:${c}"></span>`;
}

function gtLinha(rotulo, trilha, larg, extra = '', alvo = '') {
  return `<div class="gt-linha${extra}"><div class="gt-rot"${alvo}>${rotulo}</div><div class="gt-trilha" style="width:${larg}px">${trilha}</div></div>`;
}

function gantt(st) {
  const d = st.dados, g = gtUi(st.ui), z = GT_ZOOM[g.zoom], dias = z.dias, w = z.w, larg = dias * w;
  const ctx = contextoBacklog(d);
  const itens = filtrarItensBacklog(d, st.ui.busca);
  const analise = new Map(itens.map(it => [it.id, analisarDemanda(it, ctx)]));
  // cor por consultor (ordem alfabética, estável)
  const chaves = new Set();
  for (const it of itens) for (const a of it.subtarefas) if (!a.planejamento) for (const k of devsDaSub(a, ctx)) chaves.add(k);
  const nomeDe = k => ctx.nomes.get(k) || String(k).replace(/^n:/, '') || 'Sem consultor';
  const ordem = [...chaves].sort((a, b) => COLACAO.compare(nomeDe(a), nomeDe(b)));
  const corDe = k => { const i = ordem.indexOf(k); return i < 0 ? '#87909e' : GT_CORES[i % GT_CORES.length]; };
  const subsDe = it => it.subtarefas.filter(a => !a.planejamento);
  const datasDe = subs => subs.map(a => a.data).filter(Boolean).sort();
  const hojeX = difDias(isoHoje(), g.inicio);
  const linhaHoje = hojeX >= 0 && hojeX < dias ? `<span class="gt-hoje" style="left:${hojeX * w + w / 2}px"></span>` : '';
  const fundo = gtFundo(g.inicio, w);
  // cliente (pasta) -> cor fixa, pela ordem alfabética de todos os clientes carregados
  const clientes = [...new Set(d.grupos.flatMap(x => x.itens).map(it => it.pasta).filter(Boolean))].sort(COLACAO.compare);
  const pilula = cli => {
    if (!cli) return '';
    const [bg, fg] = GT_CLIENTES[clientes.indexOf(cli) % GT_CLIENTES.length];
    return `<span class="gt-cli" style="--bg:${bg};--fg:${fg}">${esc(cli)}</span>`;
  };
  const periodoPai = it => it.inicio || it.fim
    ? `${it.inicio ? dataCurta(it.inicio) : '—'} → ${it.fim ? dataCurta(it.fim) : '—'}` : 'sem datas';
  const rotDemanda = (it, sub) => `<div class="gt-nome">${esc(it.nome)}</div>
    <div class="gt-sub gt-sub-1">${pilula(it.pasta)}<span class="gt-datas${it.atrasada ? ' atraso-txt' : ''}" title="Início → entrega no ClickUp">${esc(periodoPai(it))}</span></div>
    ${sub ? `<div class="gt-sub">${esc(sub)}</div>` : ''}`;
  const ordenar = lista => {
    const o = g.ordem;
    if (o === 'prioridade') return lista;
    const cmp = o === 'nome' ? (a, b) => COLACAO.compare(a.nome, b.nome)
      : o === 'cliente' ? (a, b) => COLACAO.compare(a.pasta || '\uffff', b.pasta || '\uffff') || COLACAO.compare(a.nome, b.nome)
      : (a, b) => (a.fim || '9999').localeCompare(b.fim || '9999') || COLACAO.compare(a.nome, b.nome);
    return [...lista].sort(cmp);
  };

  let linhas = '';
  if (!itens.length) return '<div class="vazio">Nenhuma demanda encontrada.</div>';

  if (g.modo === 'tarefa') {
    for (const it of ordenar(itens)) {
      const { ativos, temAgenda } = analise.get(it.id);
      const subs = subsDe(it), ds = datasDe(subs);
      const quem = ativos.size ? [...ativos.keys()].map(nomeDe).join(', ') : (temAgenda ? 'A distribuir · sem agenda ativa' : 'A distribuir · nenhuma subtarefa atribuída');
      const trilha = gtPeriodo(it.inicio || ds[0] || '', it.fim || ds[ds.length - 1] || '', g, dias, w, cor(it.statusCor), !ativos.size)
        + gtBlocos(subs, g, dias, w, k => corDe(k), ctx, it.id, '', '');
      linhas += gtLinha(rotDemanda(it, quem), linhaHoje + trilha, larg,
        ativos.size ? '' : ' sem-ninguem', ` role="button" data-a="kb-detalhe" data-kb="${esc(it.id)}" data-col=""`);
    }
  } else {
    // grupos por desenvolvedor (só quem tem subtarefa ativa) + "A distribuir"
    const grupos = new Map(), semNinguem = [];
    for (const it of itens) {
      const { ativos } = analise.get(it.id);
      if (!ativos.size) { semNinguem.push(it); continue; }
      for (const k of ativos.keys()) { if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(it); }
    }
    const ks = [...grupos.keys()].sort((a, b) => COLACAO.compare(nomeDe(a), nomeDe(b)));
    const daPessoa = (it, k) => subsDe(it).filter(a => consultoresSub(a, ctx.porNome).some(([c]) => c === k));
    for (const k of ks) {
      const its = grupos.get(k), c = corDe(k);
      const todas = its.flatMap(it => daPessoa(it, k));
      const carga = todas.filter(a => !a.realizada && a.data && a.data >= isoHoje()).reduce((s, a) => s + (a.horas || 0), 0);
      linhas += gtLinha(`<div class="gt-nome"><span class="gt-ponto" style="background:${c}"></span>${esc(nomeDe(k))}</div><div class="gt-sub">${its.length} demanda${its.length > 1 ? 's' : ''}${carga ? ' · ' + horas(carga) + ' a fazer' : ''}</div>`,
        linhaHoje + its.map(it => gtBlocos(daPessoa(it, k), g, dias, w, () => c, ctx, it.id, k, k)).join(''), larg, ' gt-grupo');
      for (const it of ordenar(its)) {
        const subs = daPessoa(it, k), ds = datasDe(subs), outros = [...analise.get(it.id).ativos.keys()].filter(x => x !== k).map(nomeDe);
        linhas += gtLinha(rotDemanda(it, outros.length ? 'também ' + outros.join(', ') : ''),
          linhaHoje + gtPeriodo(ds[0] || '', ds[ds.length - 1] || '', g, dias, w, c, false) + gtBlocos(subs, g, dias, w, () => c, ctx, it.id, k, k), larg,
          ' gt-filho', ` role="button" data-a="kb-detalhe" data-kb="${esc(it.id)}" data-col="${esc(k)}"`);
      }
    }
    if (semNinguem.length) {
      linhas += gtLinha(`<div class="gt-nome"><span class="gt-ponto" style="background:var(--vermelho)"></span>A distribuir</div><div class="gt-sub">${semNinguem.length} demanda${semNinguem.length > 1 ? 's' : ''} sem desenvolvedor ativo</div>`, linhaHoje, larg, ' gt-grupo sem-ninguem');
      for (const it of ordenar(semNinguem)) {
        const subs = subsDe(it), ds = datasDe(subs);
        linhas += gtLinha(rotDemanda(it, analise.get(it.id).temAgenda ? 'sem agenda ativa' : 'nenhuma subtarefa atribuída'),
          linhaHoje + gtPeriodo(it.inicio || ds[0] || '', it.fim || ds[ds.length - 1] || '', g, dias, w, cor(it.statusCor), true) + gtBlocos(subs, g, dias, w, k => corDe(k), ctx, it.id, '', ''),
          larg, ' gt-filho sem-ninguem', ` role="button" data-a="kb-detalhe" data-kb="${esc(it.id)}" data-col=""`);
      }
    }
  }
  const legenda = g.modo === 'tarefa' && ordem.length
    ? `<div class="gt-legenda">${ordem.map(k => `<span><i style="background:${corDe(k)}"></i>${esc(nomeDe(k))}</span>`).join('')}</div>` : '';
  return `${legenda}<div class="gantt" data-rola="gantt"><div class="gt-corpo" style="${fundo}">
    ${gtCabecalho(g, dias, w, larg)}${linhas}</div></div>
    <div class="pequeno gt-nota">Bloco = agenda (subtarefa). Esmaecido = concluída · hachurado = status fora do critério do Kanban. Barra fina = início → entrega da demanda; tracejada e linha avermelhada = a distribuir. Cinza = agenda de quem não é desenvolvedor.</div>`;
}

function controlesGantt(ui) {
  const g = gtUi(ui);
  const b = (a, v, t, sel) => `<button class="chip${sel ? ' sel' : ''}" data-a="${a}" data-v="${v}">${t}</button>`;
  const fim = somaDias(g.inicio, GT_ZOOM[g.zoom].dias - 1);
  return `<div class="chips">${b('gt-nav', '-1', '‹', false)}${b('gt-nav', '0', 'Hoje', false)}${b('gt-nav', '1', '›', false)}
      <span class="pequeno" style="align-self:center">${esc(dataCurta(g.inicio))} a ${esc(dataCurta(fim))}</span></div>`;
}

/** Linha da busca do Gantt com o botão de filtros/ordenação no fim; o painel abre suspenso logo abaixo. */
function buscaGantt(ui, dica) {
  const g = gtUi(ui);
  const b = (a, v, t, sel) => `<button class="chip${sel ? ' sel' : ''}" data-a="${a}" data-v="${v}">${t}</button>`;
  const alterado = g.modo !== 'tarefa' || g.zoom !== 'mes' || g.ordem !== 'prioridade';
  const painel = g.painel ? `<div class="gt-fundo-painel" data-a="gt-filtros"></div>
    <div class="gt-painel" role="dialog" aria-label="Filtros e ordenação">
      <div class="rotulo">Visão</div>
      <div class="chips">${b('gt-modo', 'tarefa', 'Por tarefa', g.modo === 'tarefa')}${b('gt-modo', 'consultor', 'Por consultor', g.modo === 'consultor')}</div>
      <div class="rotulo">Escala</div>
      <div class="chips">${b('gt-zoom', 'semana', 'Semanas', g.zoom === 'semana')}${b('gt-zoom', 'mes', 'Meses', g.zoom === 'mes')}${b('gt-zoom', 'trimestre', 'Trimestre', g.zoom === 'trimestre')}</div>
      <div class="rotulo">Ordenar</div>
      <div class="chips" style="flex-wrap:wrap">${GT_ORDENS.map(([v, t]) => b('gt-ordem', v, t, g.ordem === v)).join('')}</div>
    </div>` : '';
  return `<div class="busca-linha">${campoBusca(ui.busca, dica)}
      <button class="btn-filtros${g.painel ? ' aberto' : ''}" data-a="gt-filtros" aria-label="Filtros e ordenação" aria-expanded="${g.painel ? 'true' : 'false'}">${IC.filtros}${alterado ? '<i class="ponto"></i>' : ''}</button>
      ${painel}</div>`;
}

/**
 * Barra de rolagem lateral do Kanban no topo, logo abaixo das abas Lista / Kanban.
 * Desenhada pelo app (trilho + alça) para aparecer sempre, inclusive no iPhone,
 * onde a barra nativa só surge durante a rolagem. Arrastar a alça ou tocar no trilho rola o quadro.
 */
function ligarRolagemKb() {
  const barra = $('#kb-rol'), q = $('.kanban');
  if (!barra || !q) return;
  const alca = barra.firstElementChild;
  const medir = () => {
    const sobra = q.scrollWidth - q.clientWidth;
    barra.hidden = sobra <= 1;
    if (barra.hidden) return;
    const w = barra.clientWidth, a = Math.max(36, w * q.clientWidth / q.scrollWidth);
    alca.style.width = a + 'px';
    alca.style.transform = `translateX(${(w - a) * q.scrollLeft / sobra}px)`;
  };
  q.onscroll = medir;
  barra.onpointerdown = ev => {
    ev.preventDefault();
    const sobra = q.scrollWidth - q.clientWidth, w = barra.clientWidth, a = alca.offsetWidth;
    const r = barra.getBoundingClientRect();
    const naAlca = ev.target === alca;
    const x0 = ev.clientX, s0 = naAlca ? q.scrollLeft : sobra * Math.min(1, Math.max(0, (ev.clientX - r.left - a / 2) / (w - a)));
    q.scrollLeft = s0;
    try { barra.setPointerCapture(ev.pointerId); } catch { /* segue sem captura */ }
    barra.onpointermove = e => { q.scrollLeft = s0 + (e.clientX - x0) * sobra / Math.max(1, w - a); };
    barra.onpointerup = barra.onpointercancel = () => { barra.onpointermove = null; };
  };
  medir();
  if (!ligarRolagemKb.ouvindo) { ligarRolagemKb.ouvindo = true; window.addEventListener('resize', () => ligarRolagemKb()); }
}

/** Subtarefa (agenda) no detalhe do Kanban: data · consultor · período, com botão Editar. */
function linhaSubKb(a, destaque) {
  const id = a.url ? idTarefa(a.url) : '';
  return `<div class="sub-kb${destaque ? ' destaque' : ''}${a.realizada ? ' feita' : ''}">
    <div class="l"><div class="t">${a.realizada ? '✓ ' : ''}${esc(a.nome || 'Agenda')}</div>
      <div class="pequeno">${esc([a.data ? dataCurta(a.data) : 'Sem data', a.consultores.join(', ') || 'Sem consultor', a.periodo].filter(Boolean).join(' · '))}</div>
      ${a.status ? `<div style="margin-top:3px">${selo(a.status, a.statusCor)}</div>` : ''}</div>
    ${id && pode('editar') ? `<button class="btn contorno pq" type="button" data-kbe="${esc(id)}">${IC.lapis.replace('<svg', '<svg width="14" height="14"')} Editar</button>` : ''}
  </div>`;
}

function folhaBacklog(t, colunas, colId = '') {
  // as agendas do consultor da coluna aparecem primeiro e destacadas
  const doCons = a => !!colId && a.consultorIds.includes(colId);
  const subs = [...t.subtarefas].sort((a, b) => (doCons(b) - doCons(a)) || String(a.data || '9').localeCompare(String(b.data || '9')));
  abrirFolha(`<h3>${esc(t.nome)}</h3><div class="corpo">
      ${t.pasta || t.lista ? `<div class="pequeno">${esc([t.pasta, t.lista].filter(Boolean).join(' / '))}</div>` : ''}
      <div class="linha-selos" style="flex-wrap:wrap;margin:6px 0">${selo(t.prioridade || 'Sem prioridade', t.prioridadeCor || '#b5bcc2')}${selo(t.status, t.statusCor)}</div>
      <div style="font-size:13px">${esc([t.parceiro, t.responsaveis.join(', ') || 'Sem responsável'].filter(Boolean).join(' · '))}</div>
      ${t.criado ? `<div class="pequeno">Criada ${esc(dataCurta(t.criado))}${t.diasFila > 0 ? ` (${t.diasFila} dias)` : ''}</div>` : ''}
      ${t.detalhamento ? `<div class="rotulo">Detalhamento</div><div class="pre">${esc(t.detalhamento)}</div>` : ''}
      ${subs.length ? `<div class="rotulo">Subtarefas (${subs.length})</div>${subs.map(a => linhaSubKb(a, doCons(a))).join('')}` : ''}
      ${pode('agendar') ? `<div class="rotulo">Agendar para</div>
        <div class="chips" style="flex-wrap:wrap">${colunas.map(c => `<button class="chip" data-kbc="${esc(c.id)}">${esc(c.nome)}</button>`).join('')}
          <button class="chip" data-kbc="">Outro consultor…</button></div>` : ''}
    </div>
    <div class="rodape-f"><button class="btn contorno" data-f="fechar">Fechar</button>
      ${t.url ? `<a class="btn primario" style="text-decoration:none" href="${esc(t.url)}" target="_blank" rel="noopener">Abrir no ClickUp</a>` : ''}</div>`, f => {
    f.onclick = ev => {
      if (ev.target.closest('[data-f="fechar"]')) { fecharFolha(); return; }
      const e = ev.target.closest('[data-kbe]');
      if (e) { abrirFormAgenda({ id: e.dataset.kbe }); return; }
      const b = ev.target.closest('[data-kbc]');
      if (b) abrirFormAgenda(pedidoBacklog(t, b.dataset.kbc));
    };
  });
}

// --- arrastar e soltar (pointer events: mouse arrasta direto; toque, depois de segurar)
const kb = { el: null, ativo: false, tipo: '', origem: '', itemId: '', x0: 0, y0: 0, px: 0, py: 0, dx: 0, dy: 0, timer: 0, rolar: 0, fantasma: null, ultimo: 0 };

function kbColunaEm(x, y) {
  const el = document.elementFromPoint(x, y);
  const col = el && el.closest('.kb-col');
  if (col) return col.dataset.col;
  // fora de uma coluna (espaço entre elas / abaixo): a mais próxima até 48 px na horizontal
  let melhor = null, dist = 49;
  document.querySelectorAll('.kb-col').forEach(c => {
    const r = c.getBoundingClientRect();
    if (y < r.top) return;
    const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
    if (d < dist) { dist = d; melhor = c.dataset.col; }
  });
  return melhor;
}
function kbMover() {
  if (!kb.fantasma) return;
  kb.fantasma.style.transform = `translate(${kb.px - kb.dx}px, ${kb.py - kb.dy}px) rotate(2deg)`;
  const alvo = kbColunaEm(kb.px, kb.py);
  document.querySelectorAll('.kb-col').forEach(c => {
    c.classList.toggle('kb-alvo', c.dataset.col === alvo && alvo !== FILA && alvo !== VALIDACAO && alvo !== kb.origem);
  });
}
function kbRolarBorda() {
  const q = $('.kanban');
  if (!q || !kb.ativo) return;
  const r = q.getBoundingClientRect();
  if (kb.px < r.left + 40) q.scrollLeft -= 18;
  else if (kb.px > r.right - 40) q.scrollLeft += 18;
  if (kb.py < 90) window.scrollBy(0, -12);
  else if (kb.py > window.innerHeight - 50) window.scrollBy(0, 12);
  kbMover();
}
function kbIniciar() {
  clearTimeout(kb.timer);
  if (!kb.el || !kb.el.isConnected) { kbCancelar(); return; }
  kb.ativo = true;
  const r = kb.el.getBoundingClientRect();
  kb.dx = kb.x0 - r.left; kb.dy = kb.y0 - r.top;
  const f = kb.el.cloneNode(true);
  f.classList.add('kb-fantasma');
  f.removeAttribute('data-a');
  f.style.width = r.width + 'px';
  document.body.appendChild(f);
  kb.fantasma = f;
  kb.el.classList.add('kb-apagado');
  document.body.classList.add('kb-arrastando');
  try { if (navigator.vibrate) navigator.vibrate(15); } catch { /* sem vibração */ }
  kbMover();
  kb.rolar = setInterval(kbRolarBorda, 16);
}
function kbCancelar() {
  clearTimeout(kb.timer); clearInterval(kb.rolar);
  if (kb.fantasma) kb.fantasma.remove();
  if (kb.el) kb.el.classList.remove('kb-apagado');
  document.querySelectorAll('.kb-alvo').forEach(c => c.classList.remove('kb-alvo'));
  document.body.classList.remove('kb-arrastando');
  kb.el = null; kb.ativo = false; kb.fantasma = null;
}
function kbSoltar() {
  const destino = kbColunaEm(kb.px, kb.py), origem = kb.origem, itemId = kb.itemId;
  kbCancelar();
  kb.ultimo = Date.now(); // o "click" que vem depois do arrasto não abre o detalhe
  if (!destino || destino === FILA || destino === VALIDACAO || destino === origem) return;
  const m = moduloAtual;
  if (!m || m.id !== 'backlogdev') return;
  const t = itemBacklog(estadoDe(m).dados, itemId);
  if (t) abrirFormAgenda(pedidoBacklog(t, destino.startsWith('n:') ? '' : destino));
}
document.addEventListener('pointerdown', ev => {
  const card = ev.target.closest('.kb-card');
  if (!card || !pode('agendar') || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
  kbCancelar();
  Object.assign(kb, { el: card, tipo: ev.pointerType, origem: card.dataset.col, itemId: card.dataset.kb, x0: ev.clientX, y0: ev.clientY, px: ev.clientX, py: ev.clientY });
  if (ev.pointerType !== 'mouse') kb.timer = setTimeout(kbIniciar, 380);
});
document.addEventListener('pointermove', ev => {
  if (!kb.el) return;
  kb.px = ev.clientX; kb.py = ev.clientY;
  if (!kb.ativo) {
    const dist = Math.hypot(ev.clientX - kb.x0, ev.clientY - kb.y0);
    if (kb.tipo === 'mouse') { if (dist > 6) kbIniciar(); } else if (dist > 10) kbCancelar(); // virou rolagem
    return;
  }
  ev.preventDefault();
  kbMover();
}, { passive: false });
document.addEventListener('pointerup', () => { if (kb.ativo) kbSoltar(); else kbCancelar(); });
document.addEventListener('pointercancel', () => { if (kb.el) kbCancelar(); });
document.addEventListener('touchmove', ev => { if (kb.ativo) ev.preventDefault(); }, { passive: false }); // segura a rolagem durante o arrasto
document.addEventListener('contextmenu', ev => { if (ev.target.closest('.kb-card')) ev.preventDefault(); });

const baseBacklogDev = moduloTarefas({
  id: 'backlogdev',
  titulo: 'Backlog Desenvolvimento',
  descricao: 'Personalizações pendentes e em andamento, com Kanban e Gantt por consultor',
  icone: IC.kanban,
  arquivo: 'app_backlog_dev.json', // só a chave do cache no aparelho (os dados vêm ao vivo)
  textoVazio: 'Nenhuma demanda a distribuir — todas estão com algum desenvolvedor.',
  avisoLista: 'Só as demandas a distribuir: sem subtarefa ativa de um desenvolvedor (fora as em validação).',
  filtroItem: (x, d) => aDistribuir(x, d),
  mostrarEspaco: false,
  mostrarPrioridade: true,
  agendaNoItem: true,
});

MODULOS.push({
  ...baseBacklogDev,
  workflow: null,
  etapa: '',
  ler: async forcar => (await api('backlogDev', { forcar: !!forcar }, { tempo: 90000 })).conteudo,
  uiInicial: () => ({ ...baseBacklogDev.uiInicial(), aba: 0 }),
  desenhar(st, ctx) {
    const { cont, abas, inteiro } = ctx;
    const ui = st.ui;
    if (ui.aba === 0) baseBacklogDev.desenhar(st, ctx);
    const nav = `<nav class="abas">${['Lista', 'Kanban', 'Gantt'].map((t, i) => `<button class="${ui.aba === i ? 'ativa' : ''}" data-a="aba" data-v="${i}">${t}</button>`).join('')}</nav>`;
    abas.innerHTML = ui.aba === 1 ? `<div class="abas-kb">${nav}<div class="kb-rolagem" id="kb-rol" hidden><i></i></div></div>` : nav;
    if (ui.aba === 0) return;
    ctx.acoes.innerHTML = '';
    if (ui.aba === 2) {
      const topoGt = `<div class="secao">
          ${buscaGantt(ui, 'Buscar cliente, tarefa, status ou consultor')}
          ${st.erro ? `<div class="erro-txt">Não consegui buscar dados novos: ${esc(st.erro)}</div>` : ''}
          ${controlesGantt(ui)}
        </div>`;
      const focadoGt = document.activeElement && document.activeElement.id === 'busca';
      if (inteiro || !focadoGt || !$('#quadro-gt')) {
        trocarHTML(cont, topoGt + '<div id="quadro-gt"></div>');
        ligarBusca(st, () => { trocarHTML($('#quadro-gt'), gantt(st)); });
      }
      trocarHTML($('#quadro-gt'), gantt(st));
      // ao abrir / trocar a escala / voltar para hoje: rola até a linha de hoje
      const gq = $('.gantt'), gh = gq && gq.querySelector('.gt-hoje');
      if (ui.gt && ui.gt.rolarHoje && gh) { gq.scrollLeft = Math.max(0, gh.offsetLeft - 3 * GT_ZOOM[ui.gt.zoom].w); ui.gt.rolarHoje = false; }
      return;
    }
    const topo = `<div class="secao">
        ${campoBusca(ui.busca, 'Buscar cliente, tarefa, status ou pessoa')}
        ${st.erro ? `<div class="erro-txt">Não consegui buscar dados novos: ${esc(st.erro)}</div>` : ''}
        <div class="pequeno" style="margin-top:8px">${pode('agendar')
          ? 'Cada demanda aparece em todos os consultores com subtarefa ativa; sem nenhuma, fica em "A distribuir". Arraste um cartão até a coluna do consultor para criar a agenda (no celular, segure o cartão antes de arrastar). Toque no cartão para ver os detalhes e editar as agendas.'
          : 'Toque no cartão para ver os detalhes.'}</div>
      </div>`;
    const focado = document.activeElement && document.activeElement.id === 'busca';
    if (inteiro || !focado || !$('#quadro-kb')) {
      trocarHTML(cont, topo + '<div id="quadro-kb"></div>');
      ligarBusca(st, () => { trocarHTML($('#quadro-kb'), quadroKanban(st)); ligarRolagemKb(); });
    }
    trocarHTML($('#quadro-kb'), quadroKanban(st));
    ligarRolagemKb();
  },
  acao(nome, el, st, ev) {
    const ui = st.ui;
    if (nome === 'aba') { ui.aba = +el.dataset.v; window.scrollTo(0, 0); redesenhar(this, true); return false; }
    if (nome === 'kb-detalhe') {
      if (Date.now() - kb.ultimo < 500) return false;
      const t = itemBacklog(st.dados, el.dataset.kb);
      if (t) folhaBacklog(t, st.dados.colunas, el.dataset.col);
      return false;
    }
    if (nome === 'gt-filtros') { const g = gtUi(ui); g.painel = !g.painel; redesenhar(this, true); return false; }
    if (nome === 'gt-modo' || nome === 'gt-zoom' || nome === 'gt-nav' || nome === 'gt-ordem') {
      const g = gtUi(ui);
      if (nome === 'gt-modo') { g.modo = el.dataset.v; g.rolarHoje = true; }
      if (nome === 'gt-ordem') { g.ordem = el.dataset.v; guardar.gravar('gt.ordem', g.ordem); }
      if (nome === 'gt-zoom') { g.zoom = el.dataset.v; g.inicio = ''; }
      if (nome === 'gt-nav') g.inicio = +el.dataset.v === 0 ? '' : somaDias(g.inicio, +el.dataset.v * Math.round(GT_ZOOM[g.zoom].dias / 2));
      redesenhar(this, true); return false;
    }
    if (nome === 'limpar-busca' && ui.aba >= 1) { ui.busca = ''; $('#busca').value = ''; $('#busca').blur(); redesenhar(this, true); return false; }
    return baseBacklogDev.acao(nome, el, st, ev);
  },
});

// ---------------------------------------------------------------- Módulo: Reembolso KM (só o dono)

/*
 * v2.5.0: o Reembolso KM inteiro mora aqui (o app antigo virou só o motor que lê
 * a Google Agenda). Abas: Pendentes (classificar presencial/remoto/ignorar),
 * Agenda (mês, filtros, editar, visita manual), Clientes (cadastro, sugestões,
 * "não é cliente"), Relatório (PDF para baixar/compartilhar) e Ajustes.
 * Tudo passa pelo servidor (ações rkm*), que confere o e-mail a cada pedido.
 */
const RKM_ST = { PENDENTE: 'Pendente', PRESENCIAL: 'Presencial', REMOTO: 'Remoto/Interno', IGNORADO: 'Ignorado' };
const RKM_HEX = { PENDENTE: '#c1650a', PRESENCIAL: '#1f7a45', REMOTO: '#2c4e8c', IGNORADO: '#87909e' };
const RKM_OBS_SISTEMA = ['Ignorado automaticamente', 'Não é cliente', 'Sem cliente cadastrado'];
const RKM_ABAS = [['pendentes', 'Pendentes'], ['agenda', 'Agenda'], ['clientes', 'Clientes'], ['relatorio', 'Relatório'], ['ajustes', 'Ajustes']];
const RKM_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const RKM_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const rkmI = (ic, t = 18) => `<span style="display:inline-flex;width:${t}px;height:${t}px;flex:none">${ic}</span>`;
const rkmKm = n => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('pt-BR') + ' km';
const rkmBrl = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const rkmBr = iso => { const p = String(iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(iso || ''); };
function rkmNum(v) {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').trim().replace(/[^\d,.-]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
function rkmDia(iso) {
  const d = parseDia(iso); if (!d) return iso || '';
  const h = isoHoje(), o = new Date(); o.setDate(o.getDate() - 1);
  const ontem = `${o.getFullYear()}-${pad2(o.getMonth() + 1)}-${pad2(o.getDate())}`;
  return (iso === h ? 'Hoje · ' : iso === ontem ? 'Ontem · ' : '') + `${RKM_DIAS[d.getDay()]}, ${d.getDate()} de ${RKM_MESES[d.getMonth()]}`;
}
function rkmSyncTexto(s) { return s ? `Agenda sincronizada em ${rkmBr(s.slice(0, 10)).slice(0, 5)} às ${s.slice(11, 16)}` : 'Agenda ainda não sincronizada'; }
function rkmMesIso(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; }
function rkmPeriodo(preset) {
  const d = new Date();
  const ini = (a, m) => `${a}-${pad2(m + 1)}-01`, fim = (a, m) => { const u = new Date(a, m + 1, 0); return `${u.getFullYear()}-${pad2(u.getMonth() + 1)}-${pad2(u.getDate())}`; };
  if (preset === 'atu') return [ini(d.getFullYear(), d.getMonth()), fim(d.getFullYear(), d.getMonth())];
  const a = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return [ini(a.getFullYear(), a.getMonth()), fim(a.getFullYear(), a.getMonth())];
}

function interpretarReembolso(json) {
  const r = JSON.parse(json);
  if (!r.inicio) throw new Error('Dados antigos'); // cache da v2.4.0
  return { geradoEm: r.gerado_em || '', ...r.inicio, ateHoje: r.pend.ateHoje || [], proximos: r.pend.proximos || [] };
}

function rkmCliente(st, id) { return (st.dados.clientes || []).find(c => c.id === id) || null; }
function rkmNomeCli(c) { return c ? c.nome + (c.unidade ? ' – ' + c.unidade : '') : ''; }
function rkmOpcoesCli(st, sel, novo = true) {
  const op = (v, t, s) => `<option value="${esc(v)}"${s ? ' selected' : ''}>${esc(t)}</option>`;
  return op('', '— escolha o cliente —', !sel) +
    (st.dados.clientes || []).filter(c => c.ativo || c.id === sel).map(c => op(c.id, `${rkmNomeCli(c)} (${rkmKm(c.km)})`, c.id === sel)).join('') +
    (novo ? op('__novo', '+ Cadastrar novo cliente…', false) : '');
}
function rkmSugNome(t) { return String(t || '').split(/\s+[-–|:]\s+|\s*[-–]\s+/)[0].replace(/^\[.*?\]\s*/, '').trim().slice(0, 40); }
function rkmMeet(e) { return e.meet ? `<a class="btn contorno pq" style="text-decoration:none;margin-top:8px" href="${esc(e.meet)}" target="_blank" rel="noopener" data-link>🎥 Google Meet</a>` : ''; }

/** Chama o servidor com aviso de erro; devolve null se falhar. */
async function rkmApi(acao, dados, msgOk) {
  try {
    const r = await api(acao, dados);
    if (msgOk) toast(msgOk);
    return r;
  } catch (e) { toast(mensagemAmigavel(e)); return null; }
}

// ---------- Pendentes

function rkmCartaoPend(st, e, futuro) {
  const c = rkmCliente(st, e.clienteId), id = esc(e.chave), oc = st.ui.ocupado[e.chave];
  const hora = e.inicio ? e.inicio + (e.fim ? ' – ' + e.fim : '') : 'Dia inteiro';
  return `<div class="cartao" style="${oc ? 'opacity:.5' : ''}">
    <div style="font-weight:600;font-size:15px">${esc(e.titulo || '(sem título)')}</div>
    <div class="pequeno">${esc(hora)}${e.local ? ' · ' + esc(e.local) : ''}</div>
    ${e.descricao ? `<div class="pequeno" style="margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(e.descricao)}</div>` : ''}
    ${rkmMeet(e)}
    ${futuro ? `<div class="acoes" style="margin-top:8px"><button class="btn contorno pq" data-a="rkm-evento" data-k="${id}">Classificar</button></div>` : `
    <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
      <select class="campo" data-rkm-cli="${id}" style="flex:1;padding:9px 10px;font-size:15px" ${oc ? 'disabled' : ''}>${rkmOpcoesCli(st, e.clienteId)}</select>
      ${c ? `<span class="selo" style="background:${mistura(c.km ? 'var(--verde)' : 'var(--laranja)', 15)};font-size:12px">${c.km ? rkmKm(c.km) : 'sem KM'}</span>` : ''}
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn primario" style="flex:1" data-a="rkm-classe" data-s="PRESENCIAL" data-k="${id}" ${oc ? 'disabled' : ''}>🚗 Presencial</button>
      <button class="btn contorno" style="flex:1;color:var(--azul)" data-a="rkm-classe" data-s="REMOTO" data-k="${id}" ${oc ? 'disabled' : ''}>💻 Remoto/Interno</button>
    </div>
    <div style="text-align:center"><button class="btn texto pequeno" data-a="rkm-classe" data-s="IGNORADO" data-k="${id}" ${oc ? 'disabled' : ''}>Ignorar (não é trabalho / não conta)</button></div>`}
  </div>`;
}

function rkmDesenharPend(st) {
  const d = st.dados, ui = st.ui;
  const semKm = (d.clientes || []).filter(c => c.ativo && !c.km).length;
  const sync = ui.sync;
  const resumo = (t, n, c) => `<div class="resumo-o" style="background:${mistura(c, 10)};color:${c}"><b>${n}</b><span>${t}</span></div>`;
  let h = `<div class="secao">
    <div class="numeros">${resumo('A classificar', d.ateHoje.length, d.ateHoje.length ? COR_PARCIAL : COR_COMPLETO)}${resumo('Próximos dias', d.proximos.length, 'var(--texto-2)')}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
      <div class="pequeno" style="flex:1">${esc(rkmSyncTexto(d.ultimaSync))}${sync.estado === 'esperando' ? '<br><b style="color:var(--verde)">Sincronizando… a agenda atualiza em até 5 min.</b>' : ''}</div>
      <button class="btn contorno pq" data-a="rkm-sync" ${sync.estado === 'esperando' ? 'disabled' : ''}>${sync.estado === 'esperando' ? '<span class="spinner p"></span>' : rkmI(IC.recarregar, 16)} Sincronizar</button>
    </div>
    ${d.syncErro && d.syncErro.slice(0, 19) > (d.ultimaSync || '') ? `<div class="erro-txt">Última sincronização falhou: ${esc(d.syncErro.slice(20))}</div>` : ''}
    ${st.erro ? `<div class="erro-txt">Não consegui buscar dados novos: ${esc(st.erro)}</div>` : ''}
  </div>`;
  if (semKm) h += `<div class="dica">${IC.alerta}<div>${semKm} cliente(s) sem KM cadastrado. <a href="#" data-a="rkm-aba" data-v="clientes">Completar</a></div></div>`;
  h += '<div class="divisor" style="margin-top:12px"></div>';
  if (!d.ateHoje.length) {
    h += `<div class="vazio" style="text-align:center"><div style="font-size:34px">✅</div><b style="color:var(--texto)">Tudo classificado!</b>
      <div class="pequeno" style="margin-top:6px">Nenhuma agenda aguardando. Quando quiser, gere o relatório do período.</div>
      <button class="btn contorno" style="margin-top:12px" data-a="rkm-aba" data-v="relatorio">Ir para o relatório</button></div>`;
  } else {
    let dia = '';
    d.ateHoje.forEach(e => {
      if (e.data !== dia) { dia = e.data; h += `<div class="sec-t" style="color:${COR_PARCIAL}">${esc(rkmDia(e.data))}</div>`; }
      h += rkmCartaoPend(st, e, false);
    });
  }
  if (d.proximos.length) {
    h += `<button class="sec-t botao${ui.verProximos ? ' aberto' : ''}" data-a="rkm-proximos"><span>Próximos dias (${d.proximos.length})</span>${IC.baixo}</button>`;
    if (ui.verProximos) h += d.proximos.map(e => rkmCartaoPend(st, e, true)).join('');
  }
  return h + '<div style="height:24px"></div>';
}

async function rkmClassificar(m, st, e, status, clienteId, km = null, obs = null) {
  if (status === 'PRESENCIAL' && !clienteId) { toast('Escolha o cliente da visita.'); return false; }
  const c = rkmCliente(st, clienteId);
  if (status === 'PRESENCIAL' && c && !c.km && km == null) {
    toast(`Informe o KM de ${c.nome} para continuar.`);
    rkmFolhaCliente(m, st, c, null, nc => { if (nc && nc.km) rkmClassificar(m, st, e, status, nc.id); });
    return false;
  }
  // resposta imediata: o cartão sai da lista e o servidor grava em segundo plano
  const antes = { ateHoje: st.dados.ateHoje, proximos: st.dados.proximos };
  st.dados.ateHoje = st.dados.ateHoje.filter(x => x.chave !== e.chave);
  st.dados.proximos = st.dados.proximos.filter(x => x.chave !== e.chave);
  toast(status === 'PRESENCIAL' ? 'Marcado como presencial' : status === 'REMOTO' ? 'Marcado como remoto/interno' : status === 'IGNORADO' ? 'Ignorado' : 'Salvo');
  redesenhar(m);
  const r = await rkmApi('rkmClassificar', { chave: e.chave, status, clienteId: clienteId || '', km, obs });
  if (!r) { Object.assign(st.dados, antes); redesenhar(m); recarregar(m, true); return false; }
  st.dados.pendentes = r.pendentes;
  if (st.ui.mesDados) st.ui.mesDados = null; // agenda do mês volta a ser lida
  return true;
}

// ---------- folhas (evento, cliente, visita manual)

function rkmFolhaEvento(m, st, e) {
  let status = e.status || 'PENDENTE';
  const c0 = rkmCliente(st, e.clienteId);
  const kmProprio = e.kmManual != null && e.status === 'PRESENCIAL' && (!c0 || e.kmManual !== c0.km) ? String(e.kmManual).replace('.', ',') : '';
  const obs = RKM_OBS_SISTEMA.includes(e.obs) ? '' : (e.obs || '');
  abrirFolha(`<h3>${esc(e.titulo || '(sem título)')}</h3>
    <div class="corpo">
      <div class="pequeno">${esc(rkmDia(e.data))}${e.inicio ? ' · ' + esc(e.inicio) + (e.fim ? '–' + esc(e.fim) : '') : ''}${e.local ? ' · ' + esc(e.local) : ''}</div>
      ${rkmMeet(e)}
      ${e.descricao ? `<div class="pequeno" style="margin-top:6px">${esc(e.descricao)}</div>` : ''}
      <fieldset class="form-ag">
        <label>Classificação</label>
        <div class="chips" id="rk-seg">${['PRESENCIAL', 'REMOTO', 'IGNORADO', 'PENDENTE'].map(s => `<button type="button" class="chip${s === status ? ' sel' : ''}" data-s="${s}">${RKM_ST[s]}</button>`).join('')}</div>
        <label for="rk-cli">Cliente</label>
        <select id="rk-cli" class="campo">${rkmOpcoesCli(st, e.clienteId)}</select>
        <div id="rk-kmw"><label for="rk-km">KM desta visita</label>
        <input id="rk-km" class="campo" inputmode="decimal" value="${esc(kmProprio)}"><div class="pequeno" id="rk-kmh" style="margin-top:4px"></div></div>
        <label for="rk-obs">Observação (sai no PDF)</label>
        <input id="rk-obs" class="campo" value="${esc(obs)}">
      </fieldset>
    </div>
    <div class="rodape-f">${e.origem === 'MANUAL' ? '<button class="btn contorno" id="rk-del" style="color:var(--vermelho)">Excluir</button>' : ''}
      <button class="btn contorno" id="rk-canc">Cancelar</button><button class="btn primario" id="rk-salvar">Salvar</button></div>`, f => {
    const upd = () => {
      const c = rkmCliente(st, $('#rk-cli', f).value);
      $('#rk-kmw', f).hidden = status !== 'PRESENCIAL';
      $('#rk-km', f).placeholder = c ? String(c.km).replace('.', ',') : '';
      $('#rk-kmh', f).textContent = c ? `Em branco = ${rkmKm(c.km)} (cadastro do cliente).` : '';
    };
    upd();
    $('#rk-seg', f).onclick = ev => { const b = ev.target.closest('[data-s]'); if (!b) return; status = b.dataset.s; f.querySelectorAll('#rk-seg .chip').forEach(x => x.classList.toggle('sel', x === b)); upd(); };
    $('#rk-cli', f).onchange = ev => {
      if (ev.target.value === '__novo') {
        ev.target.value = e.clienteId || '';
        rkmFolhaCliente(m, st, null, { nome: rkmSugNome(e.titulo), palavras: rkmSugNome(e.titulo) }, nc => rkmFolhaEvento(m, st, { ...e, clienteId: nc.id, status }));
        return;
      }
      upd();
    };
    $('#rk-canc', f).onclick = fecharFolha;
    $('#rk-salvar', f).onclick = async ev => {
      const cli = $('#rk-cli', f).value;
      if (status === 'PRESENCIAL' && !cli) { toast('Escolha o cliente.'); return; }
      const kmv = $('#rk-km', f).value.trim();
      ev.target.disabled = true; ev.target.innerHTML = '<span class="spinner p" style="border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> Salvando…';
      const r = await rkmApi('rkmClassificar', { chave: e.chave, status, clienteId: cli, km: status === 'PRESENCIAL' && kmv ? rkmNum(kmv) : null, obs: $('#rk-obs', f).value });
      if (!r) { ev.target.disabled = false; ev.target.textContent = 'Salvar'; return; }
      fecharFolha(); toast('Salvo');
      st.dados.pendentes = r.pendentes; st.ui.mesDados = null;
      recarregar(m, true); rkmCarregarMes(m, st);
    };
    const del = $('#rk-del', f);
    if (del) del.onclick = async () => {
      if (!confirm('Excluir esta visita manual?')) return;
      del.disabled = true;
      if (await rkmApi('rkmManualExcluir', { chave: e.chave }, 'Visita excluída')) { fecharFolha(); st.ui.mesDados = null; rkmCarregarMes(m, st); }
      else del.disabled = false;
    };
  });
}

function rkmFolhaCliente(m, st, c, pre, depois) {
  const x = c || { nome: '', unidade: '', km: '', palavras: '', ativo: true, obs: '', ...(pre || {}) };
  abrirFolha(`<h3>${c ? 'Editar cliente' : 'Novo cliente'}</h3>
    <div class="corpo"><fieldset class="form-ag">
      <label for="kc-nome">Nome do cliente *</label><input id="kc-nome" class="campo" value="${esc(x.nome)}" autocomplete="off">
      <label for="kc-uni">Unidade (opcional)</label><input id="kc-uni" class="campo" value="${esc(x.unidade)}" placeholder="Ex.: Dourados, Matriz…">
      <label for="kc-km">KM a considerar por visita</label><input id="kc-km" class="campo" inputmode="decimal" value="${x.km === '' || x.km == null ? '' : String(x.km).replace('.', ',')}" placeholder="Ex.: 24 (ida e volta)">
      <div class="pequeno" style="margin-top:4px">Use o total que a empresa reembolsa por visita (normalmente ida + volta).</div>
      <label for="kc-pal">Palavras-chave na agenda</label><input id="kc-pal" class="campo" value="${esc(x.palavras)}" placeholder="Ex.: Semalo, SML">
      <div class="pequeno" style="margin-top:4px">Separadas por vírgula. Se o título da agenda tiver uma delas, o cliente já vem escolhido.</div>
      <label for="kc-obs">Observação</label><input id="kc-obs" class="campo" value="${esc(x.obs)}">
      ${c ? `<button type="button" class="opcao" id="kc-ativo" style="margin-top:8px"><span class="check ${x.ativo ? 'on' : ''}">${x.ativo ? IC.ok : ''}</span><span class="n">Ativo</span></button>` : ''}
    </fieldset></div>
    <div class="rodape-f">${c ? '<button class="btn contorno" id="kc-del" style="color:var(--vermelho)">Excluir</button>' : ''}
      <button class="btn contorno" id="kc-canc">Cancelar</button><button class="btn primario" id="kc-salvar">Salvar</button></div>`, f => {
    let ativo = x.ativo !== false;
    setTimeout(() => { const i = x.nome ? $('#kc-km', f) : $('#kc-nome', f); if (i) i.focus(); }, 150);
    const at = $('#kc-ativo', f);
    if (at) at.onclick = () => { ativo = !ativo; const ck = $('.check', at); ck.classList.toggle('on', ativo); ck.innerHTML = ativo ? IC.ok : ''; };
    $('#kc-canc', f).onclick = fecharFolha;
    $('#kc-salvar', f).onclick = async ev => {
      const obj = { id: c ? c.id : '', nome: $('#kc-nome', f).value.trim(), unidade: $('#kc-uni', f).value.trim(), km: rkmNum($('#kc-km', f).value) || 0,
        palavras: $('#kc-pal', f).value.trim(), obs: $('#kc-obs', f).value, ativo };
      if (!obj.nome) { toast('Informe o nome.'); return; }
      if (!obj.km && !confirm('Salvar sem KM? A visita entrará com 0 km.')) return;
      ev.target.disabled = true;
      const r = await rkmApi('rkmClienteSalvar', { cliente: obj });
      if (!r) { ev.target.disabled = false; return; }
      st.dados.clientes = r.clientes; st.dados.pendentes = r.pendentes; st.ui.sug = null;
      fecharFolha();
      toast(r.trazidos ? `Cliente salvo · ${r.trazidos} agenda(s) foram para Pendentes` : 'Cliente salvo');
      if (r.trazidos) recarregar(m, true);
      redesenhar(m);
      if (depois) depois(r.cliente);
    };
    const del = $('#kc-del', f);
    if (del) del.onclick = async () => {
      if (!confirm(`Excluir ${c.nome}? (Se já tiver visitas no histórico, ele será só inativado.)`)) return;
      del.disabled = true;
      const r = await rkmApi('rkmClienteExcluir', { id: c.id });
      if (!r) { del.disabled = false; return; }
      st.dados.clientes = r.clientes; fecharFolha(); toast(r.inativado ? 'Cliente inativado (tem histórico)' : 'Cliente excluído'); redesenhar(m);
    };
  });
}

function rkmFolhaManual(m, st) {
  abrirFolha(`<h3>Visita manual</h3>
    <div class="corpo"><div class="pequeno">Para deslocamentos que não estão na agenda.</div><fieldset class="form-ag">
      <label for="vm-data">Data *</label><input id="vm-data" class="campo" type="date" value="${isoHoje()}">
      <label for="vm-hora">Hora</label><input id="vm-hora" class="campo" type="time">
      <label for="vm-cli">Cliente *</label><select id="vm-cli" class="campo">${rkmOpcoesCli(st, '', false)}</select>
      <label for="vm-tit">Descrição</label><input id="vm-tit" class="campo" placeholder="Ex.: Visita técnica">
      <label for="vm-km">KM (em branco = cadastro do cliente)</label><input id="vm-km" class="campo" inputmode="decimal">
      <label for="vm-obs">Observação</label><input id="vm-obs" class="campo">
    </fieldset></div>
    <div class="rodape-f"><button class="btn contorno" id="vm-canc">Cancelar</button><button class="btn primario" id="vm-salvar">Adicionar</button></div>`, f => {
    $('#vm-canc', f).onclick = fecharFolha;
    $('#vm-salvar', f).onclick = async ev => {
      const v = { data: $('#vm-data', f).value, inicio: $('#vm-hora', f).value, clienteId: $('#vm-cli', f).value, titulo: $('#vm-tit', f).value.trim(),
        km: $('#vm-km', f).value.trim() ? rkmNum($('#vm-km', f).value) : '', obs: $('#vm-obs', f).value };
      if (!v.clienteId) { toast('Escolha o cliente.'); return; }
      ev.target.disabled = true;
      if (await rkmApi('rkmManualSalvar', { visita: v }, 'Visita adicionada')) {
        fecharFolha(); st.ui.mes = v.data.slice(0, 7); st.ui.mesDados = null; rkmCarregarMes(m, st);
      } else ev.target.disabled = false;
    };
  });
}

// ---------- Agenda do mês

async function rkmCarregarMes(m, st) {
  const ui = st.ui, mes = ui.mes;
  const [a, mm] = mes.split('-').map(Number);
  const ult = new Date(a, mm, 0).getDate();
  ui.mesCarregando = true; redesenhar(m);
  try {
    const r = await api('rkmAgenda', { de: `${mes}-01`, ate: `${mes}-${pad2(ult)}` });
    if (ui.mes === mes) { ui.mesDados = r.itens; ui.mesErro = ''; }
  } catch (e) { ui.mesErro = mensagemAmigavel(e); }
  ui.mesCarregando = false; redesenhar(m);
}

function rkmDesenharAgenda(st) {
  const ui = st.ui, lista = ui.mesDados;
  const [a, mm] = ui.mes.split('-').map(Number);
  let h = `<div class="secao"><div style="display:flex;align-items:center;gap:8px">
      <button class="btn contorno pq" data-a="rkm-mes" data-v="-1" aria-label="Mês anterior">‹</button>
      <b style="flex:1;text-align:center;text-transform:capitalize">${RKM_MESES[mm - 1]} ${a}</b>
      <button class="btn contorno pq" data-a="rkm-mes" data-v="1" aria-label="Próximo mês">›</button></div>`;
  if (!lista) {
    return h + (ui.mesErro ? `<div class="erro-txt">${esc(ui.mesErro)}</div><button class="btn contorno" data-a="rkm-mes" data-v="0">Tentar de novo</button>` : '<div class="centro"><div class="spinner"></div></div>') + '</div>';
  }
  const cnt = { TODOS: lista.length, PENDENTE: 0, PRESENCIAL: 0, REMOTO: 0, IGNORADO: 0 };
  let km = 0, val = 0;
  lista.forEach(e => { cnt[e.status] = (cnt[e.status] || 0) + 1; if (e.status === 'PRESENCIAL') { km += e.km; val += e.valor; } });
  const filtros = [['TODOS', 'Todos'], ['PENDENTE', 'Pendentes'], ['PRESENCIAL', 'Presenciais'], ['REMOTO', 'Remotos'], ['IGNORADO', 'Ignorados']];
  h += `<div class="chips" data-rola="rkm-f">${filtros.map(([k, t]) => `<button class="chip${ui.filtro === k ? ' sel' : ''}" data-a="rkm-filtro" data-v="${k}">${t} · ${cnt[k] || 0}</button>`).join('')}</div>
    <div class="numeros" style="margin-top:10px"><div class="num"><b>${cnt.PRESENCIAL}</b><span>Presenciais</span></div><div class="num"><b>${rkmKm(km)}</b><span>KM</span></div>
      <div class="num"><b style="color:var(--verde)">${rkmBrl(val)}</b><span>Reembolso</span></div></div>
    <button class="btn contorno largo" style="margin-top:10px" data-a="rkm-manual">${rkmI(IC.mais)} Visita manual</button>
    ${ui.mesCarregando ? '<div class="pequeno" style="margin-top:6px">Atualizando…</div>' : ''}</div><div class="divisor"></div>`;
  const vis = lista.filter(e => ui.filtro === 'TODOS' || e.status === ui.filtro);
  if (!vis.length) return h + '<div class="vazio">Nada por aqui neste mês.</div>';
  let dia = '';
  vis.forEach(e => {
    if (e.data !== dia) { dia = e.data; h += `<div class="sec-t">${esc(rkmDia(e.data))}</div>`; }
    h += `<button class="cartao" style="display:flex;gap:10px;width:calc(100% - 24px);text-align:left;align-items:flex-start" data-a="rkm-evento" data-k="${esc(e.chave)}">
      <span class="pequeno" style="width:42px;flex:none;padding-top:2px">${esc(e.inicio || '—')}</span>
      <span style="flex:1;min-width:0"><b style="display:block;font-weight:600;word-break:break-word">${esc(e.titulo)}${e.removido ? ' <span class="pequeno">(removido da agenda)</span>' : ''}${e.origem === 'MANUAL' ? ' <span class="pequeno">(manual)</span>' : ''}</b>
        <span class="pequeno">${e.cliente ? esc(e.cliente + (e.unidade ? ' – ' + e.unidade : '')) : 'sem cliente'}${e.status === 'PRESENCIAL' ? ' · <b>' + rkmKm(e.km) + '</b>' : ''}</span></span>
      ${selo(RKM_ST[e.status] || e.status, RKM_HEX[e.status])}
    </button>`;
  });
  return h + '<div style="height:24px"></div>';
}

// ---------- Clientes

async function rkmCarregarSug(m, st) {
  st.ui.sugCarregando = true;
  try { st.ui.sug = await api('rkmSugestoes'); } catch (e) { st.ui.sug = { erro: mensagemAmigavel(e) }; }
  st.ui.sugCarregando = false; redesenhar(m);
}

function rkmListaClientes(st) {
  const q = semAcento(st.ui.busca || '');
  const l = (st.dados.clientes || []).filter(c => !q || semAcento(`${c.nome} ${c.unidade} ${c.palavras}`).includes(q));
  if (!(st.dados.clientes || []).length) return '<div class="vazio" style="text-align:center"><div style="font-size:30px">📍</div><b>Nenhum cliente cadastrado</b><div class="pequeno" style="margin-top:6px">Cadastre o cliente (ou cada unidade) com o KM por visita. As palavras-chave fazem o app reconhecer o cliente pelo título da agenda.</div></div>';
  if (!l.length) return '<div class="vazio">Nenhum cliente encontrado.</div>';
  return l.map(c => `<button class="cartao" style="display:flex;gap:10px;width:calc(100% - 24px);text-align:left;align-items:center" data-a="rkm-cli" data-id="${esc(c.id)}">
    <span style="flex:1;min-width:0"><b style="display:block">${esc(c.nome)}${c.unidade ? ` <span class="pequeno" style="font-weight:400">– ${esc(c.unidade)}</span>` : ''}${c.ativo ? '' : ' <span class="selo" style="background:var(--superficie-2)">inativo</span>'}</b>
      <span class="pequeno">${c.palavras ? '🔎 ' + esc(c.palavras) : 'reconhece pelo nome'}</span></span>
    <span class="selo" style="background:${mistura(c.km ? 'var(--verde)' : 'var(--laranja)', 15)};font-size:12px">${c.km ? rkmKm(c.km) : 'sem KM'}</span></button>`).join('');
}

function rkmDesenharClientes(st) {
  const ui = st.ui, s = ui.sug;
  let h = `<div class="secao" style="display:flex;gap:8px;align-items:center"><div style="flex:1">${campoBusca(ui.busca || '', 'Buscar cliente…')}</div>
    <button class="btn primario" data-a="rkm-novo-cli">${rkmI(IC.mais, 16)} Novo</button></div><div id="rkm-lista-cli">${rkmListaClientes(st)}</div>`;
  if (!s) h += ui.sugCarregando ? '<div class="secao pequeno">Buscando possíveis clientes na agenda…</div>' : '';
  else if (s.erro) h += `<div class="secao erro-txt">${esc(s.erro)}</div>`;
  else {
    if (s.sugestoes.length) {
      h += `<div class="sec-t">Possíveis clientes na sua agenda</div><div class="secao pequeno" style="padding-top:0">Títulos no padrão <b>Nome - assunto</b> que ainda não têm cadastro. Só as agendas de clientes cadastrados vão para Pendentes.</div>` +
        s.sugestoes.map((x, i) => `<div class="cartao" style="display:flex;gap:8px;align-items:center"><span style="flex:1;min-width:0"><b style="display:block;word-break:break-word">${esc(x.nome)}</b><span class="pequeno">${x.qtd} agenda(s)</span></span>
          <button class="btn texto pq" data-a="rkm-nao-cli" data-i="${i}">Não é cliente</button><button class="btn contorno pq" data-a="rkm-sug-add" data-i="${i}">+ Cadastrar</button></div>`).join('');
    }
    if (s.naoClientes.length) {
      h += `<button class="sec-t botao${ui.verNao ? ' aberto' : ''}" data-a="rkm-ver-nao"><span>Marcados como não cliente (${s.naoClientes.length})</span>${IC.baixo}</button>` +
        (ui.verNao ? s.naoClientes.map((x, i) => `<div class="cartao" style="display:flex;gap:8px;align-items:center"><span style="flex:1">${esc(x)}</span><button class="btn texto pq" data-a="rkm-desfazer" data-i="${i}">Desfazer</button></div>`).join('') : '');
    }
  }
  return h + '<div style="height:24px"></div>';
}

// ---------- Relatório

async function rkmCarregarRel(m, st) {
  const ui = st.ui;
  if (!ui.relDe || !ui.relAte || ui.relDe > ui.relAte) { ui.rel = { erro: 'Período inválido.' }; redesenhar(m); return; }
  const chave = ui.relDe + ui.relAte;
  ui.relCarregando = chave; redesenhar(m);
  try { const r = await api('rkmRelatorio', { de: ui.relDe, ate: ui.relAte }); if (ui.relCarregando === chave) ui.rel = r; }
  catch (e) { ui.rel = { erro: mensagemAmigavel(e) }; }
  if (ui.relCarregando === chave) ui.relCarregando = ''; redesenhar(m);
}

function rkmDesenharRel(st) {
  const ui = st.ui, r = ui.rel;
  const presets = [['ant', 'Mês anterior'], ['atu', 'Mês atual'], ['per', 'Período']];
  let h = `<div class="secao"><div class="chips" style="margin-top:0">${presets.map(([k, t]) => `<button class="chip${ui.relPreset === k ? ' sel' : ''}" data-a="rkm-preset" data-v="${k}">${t}</button>`).join('')}</div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px"><input id="rkm-de" class="campo" type="date" value="${esc(ui.relDe)}"><span class="pequeno">até</span><input id="rkm-ate" class="campo" type="date" value="${esc(ui.relAte)}"></div></div>`;
  if (!r || ui.relCarregando) return h + '<div class="centro"><div class="spinner"></div></div>';
  if (r.erro) return h + `<div class="secao erro-txt">${esc(r.erro)}</div>`;
  h += `<div class="secao" style="padding-top:0"><div class="numeros"><div class="num"><b>${r.itens.length}</b><span>Visitas</span></div><div class="num"><b>${rkmKm(r.totalKm)}</b><span>KM</span></div>
    <div class="num"><b style="color:var(--verde)">${rkmBrl(r.totalValor)}</b><span>Reembolso</span></div></div></div>`;
  if (!r.valorKm) h += `<div class="dica">${IC.alerta}<div>Valor por KM não definido — o PDF sai só com KM. <a href="#" data-a="rkm-aba" data-v="ajustes">Definir</a></div></div>`;
  h += r.pendentes
    ? `<div class="dica">${IC.alerta}<div style="flex:1"><b>${r.pendentes}</b> agenda(s) do período ainda sem classificação. <a href="#" data-a="rkm-aba" data-v="pendentes">Classificar</a></div></div>`
    : `<div class="dica">${IC.ok}<div>Todas as agendas do período estão classificadas.</div></div>`;
  h += `<div class="secao"><button class="btn primario largo" data-a="rkm-pdf" ${ui.gerandoPdf ? 'disabled' : ''}>${ui.gerandoPdf ? '<span class="spinner p" style="border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> Gerando PDF…' : rkmI(IC.compartilhar) + ' Baixar / compartilhar PDF'}</button></div>`;
  if (r.itens.length) {
    h += '<div class="sec-t">Visitas presenciais</div>' + r.itens.map(i => `<div class="cartao" style="display:flex;gap:10px">
      <span class="pequeno" style="width:42px;flex:none">${rkmBr(i.data).slice(0, 5)}</span>
      <span style="flex:1;min-width:0"><b>${esc(i.cliente)}</b>${i.unidade ? ' – ' + esc(i.unidade) : ''}<span class="pequeno" style="display:block">${esc(i.titulo)}</span></span>
      <span style="text-align:right;white-space:nowrap"><b>${rkmKm(i.km)}</b>${r.valorKm ? `<span class="pequeno" style="display:block">${rkmBrl(i.valor)}</span>` : ''}</span></div>`).join('');
  }
  if ((r.historico || []).length) {
    h += '<div class="sec-t">Gerados anteriormente</div>' + r.historico.map(x => `<div class="cartao" style="display:flex;gap:10px;align-items:center">
      <span style="flex:1"><b>${rkmBr(x.de)} a ${rkmBr(x.ate)}</b><span class="pequeno" style="display:block">${esc(rkmBr(x.geradoEm.slice(0, 10)))} ${esc(x.geradoEm.slice(11))}${x.para ? ' · ' + esc(x.para) : ''}</span></span>
      <span style="text-align:right"><b>${rkmKm(x.totalKm)}</b><span class="pequeno" style="display:block">${rkmBrl(x.totalRS)}</span></span></div>`).join('');
  }
  return h + '<div style="height:24px"></div>';
}

async function rkmBaixarPdf(m, st) {
  const ui = st.ui;
  ui.gerandoPdf = true; redesenhar(m);
  const g = await rkmApi('rkmPdf', { de: ui.relDe, ate: ui.relAte });
  ui.gerandoPdf = false; redesenhar(m);
  if (!g) return;
  const bin = atob(g.base64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: 'application/pdf' });
  let arq = null;
  try { arq = new File([blob], g.nome, { type: 'application/pdf' }); } catch { /* navegador antigo */ }
  const salvar = () => { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = g.nome; document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 4000); };
  if (arq && navigator.canShare && navigator.canShare({ files: [arq] })) {
    try { await navigator.share({ files: [arq], title: g.nome }); } catch (e) { if (e && e.name !== 'AbortError') salvar(); }
  } else salvar();
  toast(`PDF gerado: ${rkmKm(g.totalKm)} · ${rkmBrl(g.totalValor)}`);
  rkmCarregarRel(m, st);
}

// ---------- Ajustes

function rkmDesenharAjustes(st) {
  const a = { ...(st.dados.ajustes || {}) };
  if (a.valorKm) a.valorKm = String(a.valorKm).replace('.', ',');
  const inp = (k, rot, attrs = '', dica = '') => `<label for="aj-${k}">${rot}</label><input id="aj-${k}" data-aj="${k}" class="campo" value="${esc(a[k] || '')}" ${attrs}>${dica ? `<div class="pequeno" style="margin-top:4px">${dica}</div>` : ''}`;
  const chk = (k, rot) => `<button type="button" class="opcao" data-aj-chk="${k}"><span class="check ${String(a[k]).toUpperCase() === 'S' ? 'on' : ''}">${String(a[k]).toUpperCase() === 'S' ? IC.ok : ''}</span><span class="n" style="white-space:normal">${rot}</span></button>`;
  let horas = '';
  for (let i = 6; i <= 22; i++) horas += `<option value="${i}"${String(i) === String(a.horaNotificacao || 18) ? ' selected' : ''}>${pad2(i)}:00</option>`;
  return `<div class="secao"><fieldset class="form-ag" id="rkm-aj">
    <div class="sec-t" style="padding:4px 0 0">Relatório</div>
    ${inp('nome', 'Seu nome (sai no PDF)')}${inp('cargo', 'Cargo / área')}${inp('empresa', 'Empresa')}${inp('valorKm', 'Valor por KM (R$)', 'inputmode="decimal"')}
    <div class="sec-t" style="padding:18px 0 0">Agenda</div>
    ${inp('syncInicio', 'Considerar agendas a partir de', 'type="date"')}
    ${inp('ignorarPalavras', 'Ignorar automaticamente títulos com', '', 'Separe por vírgula. Ex.: Particular, Webinar. Esses entram como "Ignorado" (dá para mudar).')}
    ${chk('incluirDiaInteiro', 'Incluir eventos de dia inteiro')}
    <div class="sec-t" style="padding:18px 0 0">Aviso no celular</div>
    <label for="aj-horaNotificacao">Horário do aviso diário</label><select id="aj-horaNotificacao" data-aj="horaNotificacao" class="campo">${horas}</select>
    ${chk('notificarFimSemana', 'Avisar também no fim de semana')}
    <div class="pequeno" style="margin-top:6px">O aviso só sai se houver agendas a classificar. No dia 1º chega o lembrete para gerar o relatório do mês anterior. Ative em <a href="#/notificacoes">Notificações</a> (web) ou no menu Notificações do APK.</div>
  </fieldset>
  <button class="btn primario largo" style="margin-top:16px" data-a="rkm-salvar-aj" ${st.ui.salvandoAj ? 'disabled' : ''}>${st.ui.salvandoAj ? 'Salvando…' : 'Salvar ajustes'}</button>
  <div class="pequeno" style="margin-top:14px">Dados na planilha base: <a href="${esc(st.dados.planilha || '#')}" target="_blank" rel="noopener">abrir planilha</a>. A agenda é lida da conta ${esc(st.dados.email || '')} a cada 2 h (ou ao tocar em Sincronizar).</div>
  </div>`;
}

// ---------- módulo

MODULOS.push({
  id: 'reembolso',
  titulo: 'Reembolso KM',
  descricao: 'Classificar agendas, clientes, relatório de KM',
  icone: IC.carro,
  arquivo: 'app_reembolso_v25.json',
  uiInicial: () => {
    const [de, ate] = rkmPeriodo('ant');
    return { aba: 'pendentes', verProximos: false, ocupado: {}, sync: { estado: '' }, mes: rkmMesIso(new Date()), mesDados: null, filtro: 'TODOS',
      busca: '', sug: null, verNao: false, relPreset: 'ant', relDe: de, relAte: ate, rel: null, relCarregando: '', ajSujo: {} };
  },
  async ler() {
    const [inicio, pend] = await Promise.all([api('rkmInicio'), api('rkmPendentes')]);
    delete inicio.ok; delete pend.ok;
    return JSON.stringify({ gerado_em: new Date().toISOString(), inicio, pend });
  },
  interpretar: interpretarReembolso,
  aoRota(sub) { if (RKM_ABAS.some(([k]) => k === sub)) estadoDe(this).ui.aba = sub; },
  desenhar(st, { cont, abas, acoes, inteiro }) {
    const ui = st.ui;
    acoes.innerHTML = '';
    abas.innerHTML = `<nav class="abas" style="overflow-x:auto">${RKM_ABAS.map(([k, t]) => `<button class="${ui.aba === k ? 'ativa' : ''}" style="flex:1 0 auto;padding:12px 7px;font-size:14px" data-a="rkm-aba" data-v="${k}">${t}${k === 'pendentes' && st.dados.ateHoje.length ? ` (${st.dados.ateHoje.length})` : ''}</button>`).join('')}</nav>`;
    if (ui.aba === 'clientes') {
      const focado = document.activeElement && document.activeElement.id === 'busca';
      if (!focado || inteiro || !$('#rkm-lista-cli')) { trocarHTML(cont, rkmDesenharClientes(st)); ligarBusca(st, () => { $('#rkm-lista-cli').innerHTML = rkmListaClientes(st); }); }
      if (!ui.sug && !ui.sugCarregando) rkmCarregarSug(this, st);
      return;
    }
    if (ui.aba === 'ajustes') {
      // não apaga o que está sendo digitado
      if (cont.querySelector('#rkm-aj') && !inteiro && !ui.ajRedesenhar) return;
      ui.ajRedesenhar = false;
      trocarHTML(cont, rkmDesenharAjustes(st));
      cont.querySelectorAll('[data-aj-chk]').forEach(b => { b.onclick = () => { const ck = $('.check', b), on = !ck.classList.contains('on'); ck.classList.toggle('on', on); ck.innerHTML = on ? IC.ok : ''; }; });
      return;
    }
    const html = ui.aba === 'agenda' ? rkmDesenharAgenda(st) : ui.aba === 'relatorio' ? rkmDesenharRel(st) : rkmDesenharPend(st);
    trocarHTML(cont, html);
    if (ui.aba === 'agenda' && !ui.mesDados && !ui.mesCarregando && !ui.mesErro) rkmCarregarMes(this, st);
    if (ui.aba === 'relatorio') {
      if (!ui.rel && !ui.relCarregando) rkmCarregarRel(this, st);
      const de = $('#rkm-de'), ate = $('#rkm-ate');
      if (de) de.onchange = ate.onchange = () => { ui.relPreset = 'per'; ui.relDe = de.value; ui.relAte = ate.value; rkmCarregarRel(this, st); };
    }
    if (ui.aba === 'pendentes') {
      cont.onchange = ev => {
        const sel = ev.target.closest('[data-rkm-cli]'); if (!sel) return;
        const e = st.dados.ateHoje.find(x => x.chave === sel.dataset.rkmCli); if (!e) return;
        if (sel.value === '__novo') {
          sel.value = e.clienteId || '';
          rkmFolhaCliente(this, st, null, { nome: rkmSugNome(e.titulo), palavras: rkmSugNome(e.titulo) }, nc => { e.clienteId = nc.id; redesenhar(this); });
          return;
        }
        e.clienteId = sel.value; redesenhar(this);
      };
    } else cont.onchange = null;
  },
  acao(nome, el, st, ev) {
    const ui = st.ui, m = this;
    if (ev.target.closest('[data-link]')) return false;
    const evento = k => [...st.dados.ateHoje, ...st.dados.proximos, ...(ui.mesDados || [])].find(x => x.chave === k);
    switch (nome) {
      case 'rkm-aba':
        ev.preventDefault(); ui.aba = el.dataset.v; ui.ajRedesenhar = true;
        if (ui.aba === 'relatorio') ui.rel = null;
        if (ui.aba === 'clientes') ui.sug = null;
        if (ui.aba === 'agenda') ui.mesErro = '';
        window.scrollTo(0, 0); redesenhar(m, true); return false;
      case 'rkm-proximos': ui.verProximos = !ui.verProximos; return;
      case 'rkm-classe': {
        const e = evento(el.dataset.k); if (!e) return false;
        rkmClassificar(m, st, e, el.dataset.s, e.clienteId);
        return false;
      }
      case 'rkm-evento': { const e = evento(el.dataset.k); if (e) rkmFolhaEvento(m, st, { kmManual: null, ...e }); return false; }
      case 'rkm-sync': rkmSincronizar(m, st); return false;
      case 'rkm-mes': {
        const d = parseDia(ui.mes + '-01'); d.setMonth(d.getMonth() + Number(el.dataset.v));
        ui.mes = rkmMesIso(d); ui.mesDados = null; ui.mesErro = ''; rkmCarregarMes(m, st); return false;
      }
      case 'rkm-filtro': ui.filtro = el.dataset.v; return;
      case 'rkm-manual': rkmFolhaManual(m, st); return false;
      case 'rkm-novo-cli': rkmFolhaCliente(m, st, null, {}, null); return false;
      case 'rkm-cli': rkmFolhaCliente(m, st, rkmCliente(st, el.dataset.id), null, null); return false;
      case 'limpar-busca': ui.busca = ''; $('#busca').value = ''; $('#busca').blur(); $('#rkm-lista-cli').innerHTML = rkmListaClientes(st); return false;
      case 'rkm-sug-add': { const x = ui.sug.sugestoes[+el.dataset.i]; rkmFolhaCliente(m, st, null, { nome: x.nome, palavras: x.nome }, null); return false; }
      case 'rkm-nao-cli': {
        const x = ui.sug.sugestoes[+el.dataset.i]; el.disabled = true;
        rkmApi('rkmNaoCliente', { nome: x.nome }, `"${x.nome}" não é cliente`).then(r => { if (r) { st.dados.pendentes = r.pendentes; rkmCarregarSug(m, st); } else el.disabled = false; });
        return false;
      }
      case 'rkm-desfazer': {
        const x = ui.sug.naoClientes[+el.dataset.i]; el.disabled = true;
        rkmApi('rkmDesfazerNaoCliente', { nome: x }, 'Desfeito · voltou para as sugestões').then(r => { if (r) { rkmCarregarSug(m, st); recarregar(m, true); } else el.disabled = false; });
        return false;
      }
      case 'rkm-ver-nao': ui.verNao = !ui.verNao; redesenhar(m, true); return false;
      case 'rkm-preset':
        ui.relPreset = el.dataset.v;
        if (ui.relPreset !== 'per') [ui.relDe, ui.relAte] = rkmPeriodo(ui.relPreset);
        rkmCarregarRel(m, st); return false;
      case 'rkm-pdf': rkmBaixarPdf(m, st); return false;
      case 'rkm-salvar-aj': rkmSalvarAjustes(m, st); return false;
    }
    return false;
  },
});

async function rkmSalvarAjustes(m, st) {
  const f = {};
  document.querySelectorAll('[data-aj]').forEach(i => { f[i.dataset.aj] = i.value.trim(); });
  document.querySelectorAll('[data-aj-chk]').forEach(b => { f[b.dataset.ajChk] = $('.check', b).classList.contains('on') ? 'S' : 'N'; });
  st.ui.salvandoAj = true; st.ui.ajRedesenhar = true; redesenhar(m);
  const r = await rkmApi('rkmAjustes', { ajustes: f }, 'Ajustes salvos');
  st.ui.salvandoAj = false; st.ui.ajRedesenhar = true;
  if (r) { st.dados.ajustes = r.ajustes; st.dados.clientes = r.clientes; }
  redesenhar(m, true);
}

/** Pede ao motor (conta Sankhya) para ler a agenda e acompanha até a sincronização terminar. */
async function rkmSincronizar(m, st) {
  const ui = st.ui;
  if (ui.sync.estado === 'esperando') return;
  const r = await rkmApi('rkmSincronizar');
  if (!r) return;
  ui.sync = { estado: 'esperando', pedido: r.syncPedido };
  redesenhar(m);
  const inicio = Date.now();
  while (Date.now() - inicio < 7 * 60000) {
    await espera(20000);
    let i;
    try { i = await api('rkmInicio'); } catch { continue; }
    if ((i.ultimaSync || '') >= r.syncPedido || (i.syncErro || '').slice(0, 19) >= r.syncPedido) {
      ui.sync = { estado: '' };
      if ((i.ultimaSync || '') >= r.syncPedido) toast('Agenda sincronizada'); else toast('A sincronização falhou. Veja o aviso em Pendentes.');
      ui.mesDados = null;
      await recarregar(m, true);
      return;
    }
  }
  ui.sync = { estado: '' }; redesenhar(m);
  toast('O motor ainda não respondeu. A agenda atualiza sozinha de 2 em 2 horas.');
}

// ---------------------------------------------------------------- Notificações (push)

/*
 * Cada aparelho se inscreve no servidor com os tipos que quer receber. Quem envia
 * é o GitHub Actions (workflow notificar.yml): Ociosidade depois do relatório
 * diário; Reembolso KM às 18h, se houver agendas a classificar.
 * Android: funciona no Chrome (melhor com o app instalado na tela inicial).
 * iPhone: só com o app instalado na Tela de Início (iOS 16.4 ou mais novo).
 */
function tiposNotificacao() {
  const t = [];
  if (temModulo('ociosidade') && sessao.usuario && sessao.usuario.notifOciosidade) t.push({ id: 'ociosidade', titulo: 'Ociosidade', sub: '1 vez por dia (dias úteis), com o resumo de quem está sem agenda ou com horas livres' });
  if (temModulo('reembolso')) t.push({ id: 'reembolso', titulo: 'Reembolso KM', sub: 'No horário dos Ajustes do Reembolso (padrão 18h), se houver agendas a classificar; no dia 1º, lembrete do relatório' });
  return t;
}
const pushSuportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function bytesDaChave(b64u) {
  const b = (b64u + '='.repeat((4 - b64u.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b), c => c.charCodeAt(0));
}

async function inscricaoAtual() {
  if (!pushSuportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function ativarPush(tipos) {
  if (!pushSuportado()) throw new Error('Este navegador não aceita notificações.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('As notificações estão bloqueadas para o app. Libere nas configurações do navegador (Chrome › Configurações do site › Notificações).');
  const reg = await navigator.serviceWorker.ready;
  const { chave } = await api('pushChave');
  let sub = await reg.pushManager.getSubscription();
  if (sub && sub.options && sub.options.applicationServerKey) {
    const atual = new Uint8Array(sub.options.applicationServerKey), nova = bytesDaChave(chave);
    if (atual.length !== nova.length || atual.some((x, i) => x !== nova[i])) { await sub.unsubscribe(); sub = null; }
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(chave) });
  await api('pushInscrever', { inscricao: sub.toJSON(), tipos, aparelho: nomeAparelho() });
  guardar.gravar('push.tipos', tipos);
}

async function cancelarPushAparelho() {
  const sub = await inscricaoAtual();
  guardar.apagar('push.tipos');
  if (!sub) return;
  try { await api('pushCancelar', { endpoint: sub.endpoint }, { tempo: 8000 }); } finally { await sub.unsubscribe().catch(() => {}); }
}

function telaNotificacoes(app) {
  const disponiveis = tiposNotificacao();
  const ui = { tipos: new Set((guardar.ler('push.tipos') || disponiveis.map(t => t.id)).filter(id => disponiveis.some(t => t.id === id))), ativo: !!guardar.ler('push.tipos'), ocupado: '', erro: '', info: '' };
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const chk = (on, id, txt, sub) => `<button type="button" class="opcao" data-t="${id}"><span class="check ${on ? 'on' : ''}">${on ? IC.ok : ''}</span><span class="n">${esc(txt)}<span class="pequeno" style="display:block;white-space:normal">${esc(sub)}</span></span></button>`;
  const spin = t => `<span class="spinner p" style="border-color:rgba(255,255,255,.4);border-top-color:#fff"></span> ${t}`;
  const desenhar = () => {
    let corpo;
    if (!pushSuportado()) {
      corpo = `<div class="dica">${IC.alerta}<div>${ios && !instaladoNaTela()
        ? 'No iPhone, as notificações só funcionam com o app instalado: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>, e abra o app por lá.'
        : 'Este navegador não aceita notificações. No Android, abra o app no <b>Chrome</b>.'}</div></div>`;
    } else {
      const negado = Notification.permission === 'denied';
      corpo = `
        <div class="secao"><div class="muted">${ui.ativo ? 'Notificações <b>ativas</b> neste aparelho.' : 'Escolha o que quer receber neste aparelho e toque em Ativar.'}</div></div>
        <div class="secao" style="padding-top:0"><div class="form-ag">${disponiveis.map(t => chk(ui.tipos.has(t.id), t.id, t.titulo, t.sub)).join('')}</div></div>
        ${negado ? `<div class="dica">${IC.alerta}<div>As notificações estão bloqueadas para este app. Libere em <b>Chrome › Configurações do site › Notificações</b> e volte aqui.</div></div>` : ''}
        ${!ios && !instaladoNaTela() ? `<div class="dica">${IC.adicionar}<div>Dica: no Chrome, toque em <b>⋮ › Instalar app</b> (ou Adicionar à tela inicial) para receber os avisos como um app normal.</div></div>` : ''}
        <div class="secao" style="display:grid;gap:10px">
          <button class="btn primario largo" id="n-ativar" ${ui.ocupado || !ui.tipos.size ? 'disabled' : ''}>${ui.ocupado === 'ativar' ? spin('Ativando…') : ui.ativo ? 'Salvar escolhas' : 'Ativar notificações'}</button>
          ${ui.ativo ? `<button class="btn contorno largo" id="n-teste" ${ui.ocupado ? 'disabled' : ''}>${ui.ocupado === 'teste' ? 'Enviando…' : 'Enviar notificação de teste'}</button>
            <button class="btn texto" id="n-desativar" style="color:var(--vermelho)" ${ui.ocupado ? 'disabled' : ''}>Desativar neste aparelho</button>` : ''}
          ${ui.info ? `<div class="muted">${esc(ui.info)}</div>` : ''}
          <div class="erro-txt">${esc(ui.erro)}</div>
        </div>`;
    }
    $('#conteudo').innerHTML = corpo;
    const lista = $('#conteudo .form-ag');
    if (lista) lista.onclick = ev => { const b = ev.target.closest('[data-t]'); if (!b || ui.ocupado) return; alternar(ui.tipos, b.dataset.t); desenhar(); };
    const fazer = (qual, fn) => async () => {
      ui.ocupado = qual; ui.erro = ''; ui.info = ''; desenhar();
      try { await fn(); } catch (e) { ui.erro = mensagemAmigavel(e); }
      ui.ocupado = ''; desenhar();
    };
    const at = $('#n-ativar');
    if (at) at.onclick = fazer('ativar', async () => { await ativarPush([...ui.tipos]); ui.ativo = true; toast('Notificações ativas'); });
    const te = $('#n-teste');
    if (te) te.onclick = fazer('teste', async () => {
      const sub = await inscricaoAtual();
      if (!sub) { ui.ativo = false; guardar.apagar('push.tipos'); throw new Error('Este aparelho não está mais inscrito. Toque em Ativar de novo.'); }
      await api('pushTeste', { endpoint: sub.endpoint });
      ui.info = 'Teste enviado. Ele passa pelo GitHub e costuma chegar em 1 ou 2 minutos.';
    });
    const de = $('#n-desativar');
    if (de) de.onclick = fazer('desativar', async () => { await cancelarPushAparelho(); ui.ativo = false; toast('Notificações desativadas'); });
  };
  app.innerHTML = `
    <header class="barra"><button class="icone-btn" data-nav="voltar" aria-label="Voltar">${IC.voltar}</button>
      <div class="titulo"><h1>Notificações</h1><div class="sub">Avisos neste aparelho</div></div>${botaoVisual()}</header>
    <main class="conteudo" id="conteudo"></main>`;
  $('[data-nav="voltar"]').onclick = () => irPara('');
  desenhar();
}

// ---------------------------------------------------------------- início

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* segue sem modo offline */ });
}
aplicarVisual();
mostrar();
/** Pré-carrega os módulos em segundo plano para abrirem na hora. */
async function preCarregar() {
  const lista = MODULOS.filter(m => temModulo(m.id)).filter(m => { const st = estadoDe(m); return !st.carregando && (!st.lidoEm || Date.now() - st.lidoEm > 60000); });
  if (!lista.length) return;
  await recarregar(lista[0]); // o 1º aquece o cache do servidor; os demais vêm juntos
  await Promise.all(lista.slice(1).map(m => recarregar(m)));
}

/*
 * Atualização automática: ao entrar no app (abrir ou voltar para ele), todo
 * módulo cujos dados foram gerados há mais de 3 horas dispara sozinho o
 * "Atualizar agora". Módulos do mesmo workflow (Backlog Base e Comitê) disparam
 * uma vez só. Sem internet, ou se a leitura falhar, não dispara; e o mesmo
 * workflow não é disparado de novo pelo automático em menos de 30 minutos.
 */
const AUTO_LIMITE_MS = 3 * 3600000;
const AUTO_INTERVALO_MS = 30 * 60000;
let autoRodando = false;

function dadosVencidos(st) {
  if (!st.lidoEm || st.erro) return false; // só decide com dados recém-lidos do servidor
  const t = st.dados ? new Date(st.dados.geradoEm).getTime() : NaN;
  return isNaN(t) || Date.now() - t > AUTO_LIMITE_MS;
}

async function atualizarVencidos() {
  if (autoRodando || !sessao.token) return;
  autoRodando = true;
  try {
    const porWf = new Map();
    for (const m of MODULOS.filter(x => x.workflow && temModulo(x.id))) {
      const st = estadoDe(m);
      if (st.atualizacao.tipo === 'andamento' || !dadosVencidos(st)) continue;
      if (Date.now() - (guardar.ler('auto.' + m.workflow) || 0) < AUTO_INTERVALO_MS) continue;
      if (!porWf.has(m.workflow)) porWf.set(m.workflow, []);
      porWf.get(m.workflow).push(m);
    }
    if (!porWf.size) return;
    toast('Dados com mais de 3 h: atualizando automaticamente…');
    await Promise.all([...porWf].map(async ([wf, ms]) => {
      guardar.gravar('auto.' + wf, Date.now());
      const [principal, ...outros] = ms;
      const msg = { tipo: 'andamento', msg: 'Atualização automática em andamento…' };
      outros.forEach(m => { estadoDe(m).atualizacao = msg; redesenhar(m); });
      await atualizarAgora(principal);
      const ok = estadoDe(principal).atualizacao.tipo !== 'falhou';
      await Promise.all(outros.map(async m => {
        const st = estadoDe(m);
        if (ok) await recarregar(m, true);
        st.atualizacao = ok ? { tipo: 'parada' } : { ...estadoDe(principal).atualizacao };
        redesenhar(m);
      }));
    }));
  } finally { autoRodando = false; }
}

if (sessao.token) conferirAcesso().then(preCarregar).then(atualizarVencidos);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && sessao.token) conferirAcesso().then(preCarregar).then(atualizarVencidos);
});
