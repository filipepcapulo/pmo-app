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

const VERSAO_WEB = '2.0.2';
// URL da implantação do servidor (Apps Script > Implantar > App da Web). Não é segredo:
// sem um e-mail autorizado e o código enviado por e-mail, ela não devolve nada.
const SERVIDOR = 'https://script.google.com/macros/s/AKfycbzTcboB69tml5f_quYwfbVA1n0MDUTrZ8y3gA3EQsydEHA-5EWWHh-BHLy9dbMJnMUw/exec';

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
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  sair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/></svg>',
  chave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/></svg>',
  lapis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
  adicionar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
};

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2200);
}

// ---------------------------------------------------------------- servidor

class ErroApi extends Error {
  constructor(codigo, msg, extra) { super(msg || codigo); this.codigo = codigo; Object.assign(this, extra || {}); }
}

const sessao = {
  get token() { return guardar.ler('sessao') || ''; },
  get usuario() { return guardar.ler('usuario') || null; },
};
const pode = p => !!(sessao.usuario && sessao.usuario[p]);
const temModulo = id => !!(sessao.usuario && (sessao.usuario.modulos || []).includes(id));

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
    const json = await lerArquivoServidor(m.arquivo, forcar);
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
  if (st.atualizacao.tipo === 'andamento') return;
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
  const m = MODULOS.find(x => x.id === r && temModulo(x.id));
  moduloAtual = m || null;
  if (!m) { telaInicio(app); return; }
  app.innerHTML = `
    <header class="barra">
      <button class="icone-btn" data-nav="voltar" aria-label="Voltar">${IC.voltar}</button>
      <div class="titulo"><h1>${esc(m.titulo)}</h1><div class="sub" id="sub"></div></div>
      <div id="acoes-barra"></div>
      <button class="icone-btn" id="btn-recarregar" aria-label="Recarregar">${IC.recarregar}</button>
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
      <header class="barra"><div class="titulo inicio"><h1>PMO BP-MS</h1></div></header>
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
  if (pode('admin')) extras.push({ id: 'permissoes', titulo: 'Permissões', descricao: 'Quem pode acessar o app e o quê', icone: IC.chave });
  app.innerHTML = `
    <header class="barra">
      <div class="titulo inicio"><h1>PMO BP-MS</h1><div class="sub">${esc(u.nome || u.email)}</div></div>
      <button class="icone-btn" id="sair" aria-label="Sair">${IC.sair}</button>
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
 * e Apontamento "OS Experience" por padrão; vários dias = uma subtarefa por dia.
 * O servidor grava, lê a tarefa de volta e confere campo a campo — o resultado
 * (ok / parcial / erro) aparece no fim e fica no histórico do aparelho.
 */

const PERIODOS_RAPIDOS = [['08h-12h', 'Manhã'], ['13h-17h', 'Tarde'], ['08h-18h', 'Dia inteiro']];
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
  const fixo = { '08h-12h': 4, '13h-17h': 4, '08h-18h': 8 }[p];
  if (fixo) return fixo;
  const m = /^(\d{1,2})h-(\d{1,2})h$/.exec(p || '');
  if (!m) return 0;
  let h = +m[2] - +m[1];
  if (+m[1] <= 12 && +m[2] >= 13) h -= 1;
  return Math.max(0, Math.min(8, h));
}

function registrarHistorico(item) {
  const h = guardar.ler('historico') || [];
  h.unshift(item);
  guardar.gravar('historico', h.slice(0, 60));
}

/**
 * inicial: { id } para editar; ou { pai: {id, nome, local}, consultorId, data, parceiro, cliente } para agendar.
 */
async function abrirFormAgenda(inicial = {}) {
  const editando = !!inicial.id;
  if (!pode(editando ? 'editar' : 'agendar')) { toast('Seu acesso não permite ' + (editando ? 'editar' : 'agendar') + '.'); return; }
  const f = {
    op: uuid(), estado: 'carregando', erro: '', resultado: null,
    id: inicial.id || '', paiId: inicial.pai?.id || '', paiNome: inicial.pai?.nome || '', paiLocal: inicial.pai?.local || '',
    pastaId: '', demandas: null, carregandoDemandas: false,
    titulo: '', consultorId: inicial.consultorId || '', datas: [inicial.data && inicial.data >= isoHoje() ? inicial.data : isoHoje()],
    periodo: '08h-12h', agenda: 'Remoto', apontamento: 'OS Experience', parceiroId: '', detalhamento: '', status: '',
  };
  let ops = null;
  abrirFolha('<h3>' + (editando ? 'Editar agenda' : 'Agendar') + '</h3><div class="corpo" id="fa"></div><div class="rodape-f" id="fa-rod"></div>', raiz => {
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
      if (!f.datas.length) faltam.push('data');
      if (!f.periodo) faltam.push('período');
      if (!editando && !f.paiId) faltam.push('demanda');
      if (faltam.length) { f.erro = 'Preencha: ' + faltam.join(', ') + '.'; desenhar(); return; }
      f.estado = 'salvando'; f.erro = ''; desenhar();
      const dados = {
        id: f.id || undefined, paiId: f.paiId || undefined, titulo: f.titulo.trim(), consultorId: f.consultorId,
        datas: [...f.datas].sort(), periodo: f.periodo, agenda: f.agenda, apontamento: f.apontamento,
        parceiroId: f.parceiroId, detalhamento: f.detalhamento,
      };
      const consultor = (ops.consultores.find(c => c.id === f.consultorId) || {}).nome || '';
      try {
        const r = await api('agendaSalvar', { idOperacao: f.op, dados }, { tempo: 120000 });
        f.resultado = r; f.estado = 'resultado';
        registrarHistorico({ em: Date.now(), modo: editando ? 'editar' : 'incluir', titulo: dados.titulo, consultor, datas: dados.datas,
          periodo: dados.periodo, demanda: f.paiNome, situacao: r.situacao,
          resultados: r.resultados.map(x => ({ id: x.id, url: x.url, data: x.data, situacao: x.situacao, erro: x.erro, naoConfirmados: x.naoConfirmados })) });
        if (r.agendaAtualizando) {
          const ag = MODULOS.find(m => m.id === 'agenda');
          if (ag) { const st = estadoDe(ag); st.lidoEm = 0; setTimeout(() => { if (moduloAtual === ag) acompanharSeRodando(ag); }, 4000); }
        }
      } catch (e) {
        f.estado = 'resultado';
        f.resultado = { situacao: e.codigo === 'REDE' ? 'incerto' : 'erro', erro: mensagemAmigavel(e), resultados: [] };
        registrarHistorico({ em: Date.now(), modo: editando ? 'editar' : 'incluir', titulo: dados.titulo, consultor, datas: dados.datas,
          periodo: dados.periodo, demanda: f.paiNome, situacao: f.resultado.situacao, erro: f.resultado.erro, resultados: [] });
      }
      desenhar();
    },
    voltar() { f.estado = 'editando'; f.resultado = null; desenhar(); },
    novo() { f.op = uuid(); f.estado = 'editando'; f.resultado = null; f.titulo = ''; f.detalhamento = ''; desenhar(); },
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
    } else {
      f.parceiroId = parceiroPorNome(ops, inicial.parceiro, inicial.cliente);
    }
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
      ? `<button class="btn contorno" data-x="fechar">Fechar</button>${editando ? '' : '<button class="btn primario" data-x="novo">Agendar outro</button>'}`
      : `<button class="btn contorno" data-x="voltar">Voltar ao formulário</button><button class="btn primario" data-x="salvar">Tentar de novo</button>`;
  } else {
    const salvando = f.estado === 'salvando';
    const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
    let demanda;
    if (editando || f.paiId && f.paiNome) {
      demanda = `<div class="caixa-dem"><div class="pequeno">${esc(f.paiLocal)}</div><b>${esc(f.paiNome || 'Demanda')}</b>
        ${!editando ? '<button class="btn texto" data-x="trocar-dem" style="padding:4px 0">Trocar demanda</button>' : ''}</div>`;
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
    corpo.innerHTML = `
      ${f.aviso ? `<div class="aviso andamento" style="margin:0 0 8px">${esc(f.aviso)}</div>` : ''}
      <fieldset ${salvando ? 'disabled' : ''} class="form-ag">
        <label>Demanda (tarefa-pai)</label>${demanda}
        <label for="fa-titulo">Título da agenda *</label>
        <input id="fa-titulo" class="campo" type="text" value="${esc(f.titulo)}" placeholder="O que será feito" autocomplete="off">
        <label for="fa-cons">Consultor *</label>
        <select id="fa-cons" class="campo">${opt('', 'Escolha…', !f.consultorId)}${ops.consultores.map(c => opt(c.id, c.nome, c.id === f.consultorId)).join('')}</select>
        <label>${editando ? 'Data *' : 'Data(s) * — uma agenda por dia'}</label>
        <div class="linha-datas">
          <input id="fa-data" class="campo" type="date" value="${esc(f.datas[f.datas.length - 1] || '')}">
          ${editando ? '' : '<button class="btn contorno pq" data-x="add-data" type="button">+ dia</button>'}
        </div>
        ${!editando && f.datas.length > 1 ? `<div class="chips" style="flex-wrap:wrap">${[...f.datas].sort().map(d => `<button class="chip sel" type="button" data-x="rem-data" data-d="${d}">${esc(dataTitulo(d))} ${IC.x}</button>`).join('')}</div>` : ''}
        <label>Período *</label>
        <div class="chips seg">${PERIODOS_RAPIDOS.map(([v, t]) => `<button type="button" class="chip${f.periodo === v ? ' sel' : ''}" data-x="periodo" data-v="${v}">${t}<small>${v}</small></button>`).join('')}
          <button type="button" class="chip${periodoOutro || f.outroPeriodo ? ' sel' : ''}" data-x="periodo-outro">Outro</button></div>
        ${periodoOutro || f.outroPeriodo ? `<select id="fa-per" class="campo" style="margin-top:8px">${opt('', 'Escolha o horário…', !f.periodo)}${ops.periodos.map(p => opt(p, `${p} (${horas(horasPeriodo(p))})`, p === f.periodo)).join('')}</select>` : ''}
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
    liga('fa-per', v => { f.periodo = v; }, 'change');
    liga('fa-data', v => { if (!v) return; if (editando || f.datas.length <= 1) f.datas = [v]; else f.datas[f.datas.length - 1] = v; f.datas = [...new Set(f.datas)]; }, 'change');
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
    if (x === 'periodo') { f.periodo = b.dataset.v; f.outroPeriodo = false; }
    if (x === 'periodo-outro') { f.outroPeriodo = true; if (PERIODOS_RAPIDOS.some(p => p[0] === f.periodo)) f.periodo = ''; }
    if (x === 'agenda') f.agenda = b.dataset.v;
    if (x === 'add-data') {
      const ult = [...f.datas].sort().pop() || isoHoje();
      const d = parseDia(ult); d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      f.datas.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
    }
    if (x === 'rem-data') { f.datas = f.datas.filter(d => d !== b.dataset.d); if (!f.datas.length) f.datas = [isoHoje()]; }
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
      <div><b>${esc(dataTitulo(x.data))}</b>
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
      ${pode('agendar') ? `<button class="icone-btn" id="novo" aria-label="Agendar">${IC.mais}</button>` : ''}</header>
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

const NOMES_MODULOS = { agenda: 'Agenda dos Consultores', ociosidade: 'Ociosidade', demandas: 'Demandas', backlog: 'Backlog Base', comite: 'Comitê de Personalizações' };

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
      <button class="icone-btn" id="novo" aria-label="Incluir e-mail">${IC.mais}</button></header>
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
  return partes.join(' · ');
}

function folhaUsuario(u, aoSalvar) {
  const novo = !u;
  const eu = sessao.usuario.email;
  const d = u ? { ...u, modulos: [...u.modulos] } : { email: '', nome: '', ativo: true, admin: false, agendar: false, editar: false, modulos: ['agenda'] };
  const chk = (on, attr, txt, sub = '') => `<button type="button" class="opcao" ${attr}><span class="check ${on ? 'on' : ''}">${on ? IC.ok : ''}</span><span class="n">${txt}${sub ? `<span class="pequeno" style="display:block;white-space:normal">${sub}</span>` : ''}</span></button>`;
  const desenhar = (erro = '', ocupado = false) => {
    const completo = d.admin && d.agendar && d.editar && d.modulos.length === Object.keys(NOMES_MODULOS).length;
    $('#fu').innerHTML = `
      <fieldset class="form-ag" ${ocupado ? 'disabled' : ''}>
      <label for="fu-email">E-mail *</label>
      <input id="fu-email" class="campo" type="email" value="${esc(d.email)}" ${novo ? '' : 'disabled'} placeholder="nome@sankhya.com.br" autocapitalize="off">
      <label for="fu-nome">Nome</label>
      <input id="fu-nome" class="campo" type="text" value="${esc(d.nome)}" placeholder="Opcional">
      <label>Acesso</label>
      ${chk(completo, 'data-p="completo"', '<b>Permissão completa</b>', 'Todos os módulos, agendar, editar e administrar permissões')}
      <label>Módulos que pode ver</label>
      ${Object.entries(NOMES_MODULOS).map(([k, t]) => chk(d.modulos.includes(k), `data-m="${k}"`, t)).join('')}
      <label>Ações</label>
      ${chk(d.agendar, 'data-p="agendar"', 'Agendar no ClickUp', 'Criar agendas pelo app')}
      ${chk(d.editar, 'data-p="editar"', 'Editar agendas no ClickUp')}
      ${chk(d.admin, 'data-p="admin"', 'Administrador', 'Pode cadastrar e-mails e mudar permissões')}
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
      if (p === 'completo') {
        const on = !(d.admin && d.agendar && d.editar && d.modulos.length === Object.keys(NOMES_MODULOS).length);
        Object.assign(d, { admin: on, agendar: on, editar: on, modulos: on ? Object.keys(NOMES_MODULOS) : ['agenda'] });
      }
      if (p === 'agendar' || p === 'editar' || p === 'admin') d[p] = !d[p];
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

function cardItem(item, chave, aberto, compacto = false) {
  const meta = [item.periodo, item.agenda].filter(Boolean).join(' · ');
  return `<div role="button" tabindex="0" class="card-item${compacto ? ' compacto' : ''}" style="background:${corTurno(item.turno)}" data-a="card" data-k="${esc(chave)}">
    <div class="cli"><span>${esc(item.cliente)}</span><span>${horas(item.horas)}</span></div>
    <div class="tar">${esc(item.tarefa)}</div>
    ${meta ? `<div class="meta">${esc(meta)}</div>` : ''}
    ${aberto
      ? (item.detalhamento ? `<div class="det">${esc(item.detalhamento)}</div>` : '') +
        `<div class="acoes-card">${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener" data-link>Abrir no ClickUp</a>` : ''}${botaoEditar(item.url, 'btn-card')}</div>`
      : (item.detalhamento && !compacto ? '<div class="dica-det">Toque para ver o detalhamento</div>' : '')}
  </div>`;
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

function agendaPorDia(st) {
  const d = st.dados, ui = st.ui, hoje = isoHoje();
  const dia = ui.dia;
  const total = d.consultores.reduce((s, c) => s + diaDe(c, dia).horas, 0);
  const sem = d.consultores.filter(c => diaDe(c, dia).horas === 0).length;
  return `
    <div class="dias" data-rola="dias">
      ${d.dias.map(dk => `<button class="chip-dia${dk === dia ? ' sel' : ''}${dk === hoje ? ' hoje' : ''}${fimDeSemana(dk) ? ' fds' : ''}" data-a="dia" data-dk="${dk}">
        <small>${letraDia(dk)}</small><b>${numeroDia(dk)}</b></button>`).join('')}
    </div>
    <div class="secao" style="padding-top:0">
      <h2 class="dia-titulo">${esc(diaExtenso(dia))}</h2>
      <div class="muted">${horas(total)} alocadas · ${sem} sem agenda</div>
      ${st.erro ? `<div class="erro-txt">Não consegui buscar dados novos: ${esc(st.erro)}</div>` : ''}
    </div>
    <div class="divisor"></div>
    ${d.consultores.map(c => {
      const dc = diaDe(c, dia);
      const tem = dc.itens.length > 0;
      const aberto = tem && ui.abertos.has(c.id);
      const clientes = [...new Set(dc.itens.map(i => i.cliente))].join(', ');
      return `<div>
        <button class="linha-c${aberto ? ' aberto' : ''}" data-a="consultor" data-id="${esc(c.id)}" ${tem ? '' : 'disabled'}>
          ${avatar(c)}
          <span class="nome"><b>${esc(c.nome)}</b><span>${tem ? esc(clientes) : 'Sem agenda'}</span></span>
          ${seloHoras(dc.horas, 'min-width:56px')}
          ${tem ? IC.baixo : '<span style="width:22px"></span>'}
        </button>
        ${aberto ? `<div class="itens-c">
          ${dc.itens.map((it, i) => { const k = `${c.id}|${dia}|${i}`; return cardItem(it, k, ui.cards.has(k)); }).join('')}
          <button class="btn texto" data-a="exportar" data-id="${esc(c.id)}">${IC.compartilhar.replace('<svg', '<svg width="16" height="16"')} Enviar agenda</button>
          ${pode('agendar') ? `<button class="btn texto" data-a="agendar" data-id="${esc(c.id)}">${IC.mais.replace('<svg', '<svg width="16" height="16"')} Agendar</button>` : ''}
        </div>` : ''}
        <div class="divisor" style="opacity:.6"></div>
      </div>`;
    }).join('')}`;
}

function agendaGrade(st) {
  const d = st.dados, ui = st.ui, hoje = isoHoje();
  const larga = ui.abertosGrade.size > 0;
  return `
    <div class="grade-wrap" data-rola="grade">
      <table class="grade${larga ? ' larga' : ''}">
        <thead><tr><th class="col-nome" style="text-align:left">Consultor</th>
          ${d.dias.map(dk => `<th class="dia${dk === hoje ? ' hoje' : ''}${fimDeSemana(dk) ? ' fds' : ''}" data-dk="${dk}"><span>${letraDia(dk)} ${numeroDia(dk)}</span></th>`).join('')}
        </tr></thead>
        <tbody>
        ${d.consultores.map(c => {
          const aberto = ui.abertosGrade.has(c.id);
          return `<tr>
              <td class="col-nome"><button class="nome-grade${aberto ? ' aberto' : ''}" data-a="grade" data-id="${esc(c.id)}">${avatar(c, 26)}<b>${esc(c.nome)}</b>${IC.baixo}</button></td>
              ${d.dias.map(dk => `<td class="cel"><button style="width:100%" data-a="grade" data-id="${esc(c.id)}" data-dk="${dk}">${seloHoras(diaDe(c, dk).horas, 'display:block')}</button></td>`).join('')}
            </tr>
            ${aberto ? `<tr class="expandida">
              <td class="col-nome"><button class="btn texto" style="font-size:13px" data-a="exportar" data-id="${esc(c.id)}">Enviar agenda</button></td>
              ${d.dias.map(dk => `<td class="cel">${diaDe(c, dk).itens.map((it, i) => { const k = `g|${c.id}|${dk}|${i}`; return cardItem(it, k, ui.cards.has(k), true); }).join('')}</td>`).join('')}
            </tr>` : ''}`;
        }).join('')}
        </tbody>
      </table>
    </div>
    <div class="legenda">
      ${[[0, 'livre'], [4, '≤7h'], [8, '8h'], [10, '≤12h'], [13, '>12h']].map(([h, r]) => { const [f, t] = coresHoras(h); return `<span style="background:${f};color:${t}">${r}</span>`; }).join('')}
    </div>
    <p class="muted" style="padding:0 16px">Toque no consultor (ou numa célula) para abrir as agendas de cada dia · toque num card para ver o detalhamento.</p>`;
}

MODULOS.push({
  id: 'agenda',
  titulo: 'Agenda dos Consultores',
  descricao: 'Carga de trabalho de hoje até os próximos 10 dias',
  icone: IC.calendario,
  workflow: 'carga_trabalho.yml',
  arquivo: 'app_carga_trabalho.json',
  etapa: 'Buscando as agendas no ClickUp…',
  uiInicial: () => ({ aba: 0, dia: null, abertos: new Set(), abertosGrade: new Set(), cards: new Set(), rolarPara: null, centralizarDia: true }),
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
      if (th && wrap) wrap.scrollTo({ left: th.offsetLeft - 132, behavior: 'smooth' });
      ui.rolarPara = null;
    }
  },
  acao(nome, el, st, ev) {
    const ui = st.ui;
    switch (nome) {
      case 'aba': ui.aba = +el.dataset.v; if (ui.aba === 0) ui.centralizarDia = true; window.scrollTo(0, 0); return;
      case 'dia': ui.dia = el.dataset.dk; return;
      case 'consultor': alternar(ui.abertos, el.dataset.id); return;
      case 'card': if (ev.target.closest('[data-link]')) return false; alternar(ui.cards, el.dataset.k); return;
      case 'editar': abrirFormAgenda({ id: el.dataset.id }); return false;
      case 'agendar': abrirFormAgenda({ consultorId: el.dataset.id || '', data: ui.aba === 0 ? ui.dia : isoHoje() }); return false;
      case 'grade':
        if (el.dataset.dk && !ui.abertosGrade.has(el.dataset.id)) ui.rolarPara = el.dataset.dk;
        alternar(ui.abertosGrade, el.dataset.id);
        return;
      case 'exportar': folhaExportarAgenda(st.dados.consultores.find(c => c.id === el.dataset.id), st.dados); return false;
      case 'escolher': folhaEscolherConsultor(st.dados); return false;
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
      subtarefas: (o.subtarefas || []).map(a => ({
        nome: a.nome || '', consultores: txts(a.consultores), data: a.data || '', horas: Number(a.horas) || 0, periodo: a.periodo || '',
        status: a.status || '', statusCor: a.status_cor || '', realizada: !!a.realizada, detalhamento: a.detalhamento || '', url: a.url || '',
      })),
    })),
  }));
  return { titulo: r.titulo || '', geradoEm: r.gerado_em || '', hoje: r.hoje || '', grupos, qtd: soma(grupos, g => g.itens.length) };
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
  const grupos = d.grupos.map(g => ({ ...g, itens: g.itens.filter(x => (!ui.soAtrasadas || x.atrasada) && (!t ||
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
      const atrasadas = soma(d.grupos, g => g.itens.filter(x => x.atrasada).length);
      const topo = `<div class="secao">
        <div class="numeros rola" data-rola="nums"><div class="num"><b style="color:var(--verde)">${d.qtd}</b><span>Total</span></div>
          ${d.grupos.map(g => `<div class="num"><b style="color:${cor(g.cor, 'var(--texto)')}">${g.itens.length}</b><span>${esc(g.nome)}</span></div>`).join('')}</div>
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
            if (t) { abrirFormAgenda({ pai: { id: t.id, nome: t.nome, local: [t.pasta, t.lista].filter(Boolean).join(' › ') }, parceiro: t.parceiro, cliente: t.pasta }); return false; }
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

MODULOS.push(moduloTarefas({
  id: 'comite',
  titulo: 'Comitê de Personalizações',
  descricao: 'Personalizações em aberto, por prioridade',
  icone: IC.ferramenta,
  arquivo: 'app_comite.json',
  textoVazio: 'Nenhuma personalização em aberto no Comitê.',
  mostrarEspaco: true,
  mostrarPrioridade: false,
}));

// ---------------------------------------------------------------- início

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* segue sem modo offline */ });
}
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
