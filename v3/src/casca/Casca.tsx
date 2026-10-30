// Casca do v3: topo (abas por módulo aberto, busca, escritório, tema, tela cheia, sair) e menu lateral por área
// (recolhível, com Favoritos). As abas ficam na faixa do topo; a busca encosta nos botões à direita. A rota (#/…) manda: abrir um link abre/ativa a aba; clicar na aba muda a rota.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BuscaGlobal } from '../componentes/BuscaGlobal';
import { ErroTela } from '../componentes/ErroTela';
import { useFavoritos } from '../estado/favoritos';
import { useSessao } from '../estado/sessao';
import { abrir, fechar, lerAbasSalvas, renomear, type EstadoAbas } from '../estado/abas';
import { AREAS, caminhoDoHash, caminhoEntidade, ENTIDADES, hashDe, lerRota, modulosVisiveis } from '../estado/rotas';
import { aplicarTema, lerTema, proximoTema } from '../estado/tema';
import { ClienteTela } from '../telas/ClienteTela';
import { Clientes } from '../telas/Clientes';
import { Componentes } from '../telas/Componentes';
import { EmConstrucao, NaoEncontrada } from '../telas/EmConstrucao';
import { EntidadeTela } from '../telas/EntidadeTela';
import { Equipe } from '../telas/Equipe';
import { Inicio } from '../telas/Inicio';
import { Modelos } from '../telas/Modelos';
import { ProjetoTela } from '../telas/ProjetoTela';
import { Projetos } from '../telas/Projetos';
import { VERSAO } from '../versao';

const lerLS = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* */ } };
const celular = () => window.matchMedia('(max-width: 767px)').matches;
// títulos conhecidos ao navegar (busca/favoritos), usados na aba de um link profundo
const titulosConhecidos = new Map<string, string>();

function tituloDe(caminho: string): string {
  const r = lerRota(caminho);
  if (r.tipo === 'modulo') return r.modulo.titulo;
  if (r.tipo === 'entidade') return titulosConhecidos.get(caminho) ?? ENTIDADES[r.entidade].titulo;
  return 'Não encontrado';
}

export function Casca() {
  const { eu, trocarEscritorio, sair } = useSessao();
  const fav = useFavoritos();
  const esc = eu!.escritorio_id ?? 'sem';
  const chaveAbas = `pmo3.abas.${esc}`;
  const [abas, setAbas] = useState<EstadoAbas>(() => lerAbasSalvas(lerLS(chaveAbas)));
  const [recolhido, setRecolhido] = useState(() => lerLS('pmo3.menu') === 'recolhido');
  const [menuCel, setMenuCel] = useState(false);
  const [favAberto, setFavAberto] = useState(() => lerLS('pmo3.menu.fav') !== 'fechado');
  const [busca, setBusca] = useState(false);
  const [tema, setTema] = useState(lerTema);
  const [telaCheia, setTelaCheia] = useState(false);
  const [trocando, setTrocando] = useState(false);

  // troca de escritório: cada escritório guarda as suas abas
  useEffect(() => { setAbas(lerAbasSalvas(lerLS(chaveAbas))); }, [chaveAbas]);
  useEffect(() => { gravarLS(chaveAbas, JSON.stringify(abas)); }, [abas, chaveAbas]);
  useEffect(() => { gravarLS('pmo3.menu', recolhido ? 'recolhido' : 'aberto'); }, [recolhido]);
  useEffect(() => { gravarLS('pmo3.menu.fav', favAberto ? 'aberto' : 'fechado'); }, [favAberto]);
  useEffect(() => { aplicarTema(tema); }, [tema]);

  // rota → aba
  useEffect(() => {
    const aplicar = () => {
      const c = caminhoDoHash(location.hash);
      if (c === null) return;
      setAbas(a => abrir(a, { caminho: c, titulo: a.abas.find(x => x.caminho === c)?.titulo ?? tituloDe(c) }));
      if (celular()) setMenuCel(false);
    };
    // depois do login por link o hash é o #access_token (já lido pelo Supabase): volta para a aba ativa
    if (caminhoDoHash(location.hash) === null) history.replaceState(null, '', location.pathname + hashDe(abas.ativa ?? 'inicio'));
    else if (!location.hash && abas.ativa) history.replaceState(null, '', hashDe(abas.ativa));
    aplicar();
    window.addEventListener('hashchange', aplicar);
    return () => window.removeEventListener('hashchange', aplicar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveAbas]);

  // a aba ativa fica à vista na faixa do topo (no celular a faixa rola na horizontal)
  useEffect(() => {
    document.querySelector('.abas .aba.ativa')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [abas.ativa]);

  // sem aba aberta: volta ao início
  useEffect(() => { if (abas.ativa === null) location.hash = hashDe('inicio'); }, [abas.ativa]);

  // atalhos: Ctrl+K ou "/" busca; Esc sai da tela cheia
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !digitando)) { e.preventDefault(); setBusca(true); }
      else if (e.key === 'Escape' && telaCheia && !document.querySelector('.popup')) setTelaCheia(false);
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [telaCheia]);
  useEffect(() => {
    const saiu = () => { if (!document.fullscreenElement) setTelaCheia(false); };
    document.addEventListener('fullscreenchange', saiu);
    return () => document.removeEventListener('fullscreenchange', saiu);
  }, []);
  const alternarTelaCheia = () => {
    const nova = !telaCheia;
    setTelaCheia(nova);
    if (nova) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  const ir = useCallback((caminho: string, titulo?: string) => {
    if (titulo) titulosConhecidos.set(caminho, titulo);
    if (location.hash === hashDe(caminho)) setAbas(a => abrir(a, { caminho, titulo: titulo ?? tituloDe(caminho) }));
    else location.hash = hashDe(caminho);
  }, []);
  const fecharAba = (c: string) => {
    const novo = fechar(abas, c);
    setAbas(novo);
    if (novo.ativa && novo.ativa !== abas.ativa) history.replaceState(null, '', hashDe(novo.ativa));
  };

  const mods = useMemo(() => modulosVisiveis(eu!.permissoes), [eu]);
  const conteudo = (caminho: string, titulo: string): ReactNode => {
    const r = lerRota(caminho);
    if (r.tipo === 'desconhecida') return <NaoEncontrada caminho={caminho} />;
    if (r.tipo === 'entidade') {
      const aoRenomear = (t: string) => setAbas(a => renomear(a, caminho, t));
      if (r.entidade === 'cliente') return <ClienteTela id={r.id} aoRenomear={aoRenomear} ir={ir} />;
      if (r.entidade === 'projeto') return <ProjetoTela id={r.id} aoRenomear={aoRenomear} />;
      return <EntidadeTela entidade={r.entidade} id={r.id} titulo={titulo} aoRenomear={aoRenomear} />;
    }
    if (!mods.includes(r.modulo)) return <div className="vazio-tela"><h2>Sem acesso</h2><p>Você não tem permissão para {r.modulo.titulo}.</p></div>;
    if (r.modulo.id === 'inicio') return <Inicio />;
    if (r.modulo.id === 'componentes') return <Componentes />;
    if (r.modulo.id === 'clientes') return <Clientes ir={ir} />;
    if (r.modulo.id === 'projetos') return <Projetos ir={ir} />;
    if (r.modulo.id === 'modelos') return <Modelos />;
    if (r.modulo.id === 'equipe') return <Equipe />;
    return <EmConstrucao titulo={r.modulo.titulo} etapa={r.modulo.etapa} />;
  };

  const escAtual = eu!.escritorios.find(e => e.id === eu!.escritorio_id);
  return (
    <div className={`casca${recolhido ? ' recolhido' : ''}${menuCel ? ' menu-cel-aberto' : ''}${telaCheia ? ' tela-cheia' : ''}`}>
      <header className="topo">
        <button type="button" className="topo-bt" aria-label="Menu" aria-expanded={celular() ? menuCel : !recolhido}
          onClick={() => (celular() ? setMenuCel(!menuCel) : setRecolhido(!recolhido))}>☰</button>
        <a className="topo-marca" href={hashDe('inicio')}>PMO <span>v3</span></a>
        <div className="abas" role="tablist" aria-label="Abas abertas">
          {abas.abas.map(a => (
            <div key={a.caminho} className={`aba${a.caminho === abas.ativa ? ' ativa' : ''}`}>
              <button type="button" role="tab" aria-selected={a.caminho === abas.ativa} title={a.titulo}
                onClick={() => ir(a.caminho)}>{a.titulo}</button>
              <button type="button" className="aba-x" aria-label={`Fechar ${a.titulo}`} onClick={() => fecharAba(a.caminho)}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="topo-busca" onClick={() => setBusca(true)} aria-label="Buscar (Ctrl+K)">
          <span aria-hidden>⌕</span><span className="so-pc"> Buscar…</span><kbd className="so-pc">Ctrl K</kbd>
        </button>
        <div className="topo-dir">
          {eu!.escritorios.length > 1 ? (
            <select className="topo-esc" aria-label="Escritório" value={eu!.escritorio_id ?? ''} disabled={trocando}
              onChange={async e => { setTrocando(true); await trocarEscritorio(e.target.value); setTrocando(false); }}>
              {eu!.escritorios.map(e => <option key={e.id} value={e.id}>{e.sigla}</option>)}
            </select>
          ) : <span className="topo-esc-fixo" title={escAtual?.nome}>{escAtual?.sigla}</span>}
          <button type="button" className="topo-bt" aria-label={`Tema: ${tema}`} title={`Tema: ${tema}`}
            onClick={() => setTema(proximoTema(tema))}>{tema === 'escuro' ? '☾' : tema === 'claro' ? '☀' : '◐'}</button>
          <button type="button" className="topo-bt" aria-label="Tela cheia" aria-pressed={telaCheia} onClick={alternarTelaCheia}>⛶</button>
          <button type="button" className="topo-avatar" style={{ background: eu!.usuario.cor ?? undefined }}
            title={`${eu!.usuario.nome} — sair`} aria-label="Sair" onClick={() => { if (confirm('Sair do PMO v3?')) sair(); }}>
            {eu!.usuario.iniciais ?? eu!.usuario.nome.slice(0, 2).toUpperCase()}
          </button>
        </div>
      </header>

      <nav className="menu" aria-label="Menu principal">
        <div className="menu-rolagem">
          <section className="menu-grupo">
            <button type="button" className="menu-titulo" aria-expanded={favAberto} onClick={() => setFavAberto(!favAberto)}>
              <span className="menu-icone">★</span><span className="menu-texto">Favoritos</span>
            </button>
            {favAberto && (fav.lista.length === 0
              ? <p className="menu-vazio menu-texto">Marque ☆ num item para ele aparecer aqui.</p>
              : fav.lista.map(f => {
                const c = caminhoEntidade(f.entidade, f.entidade_id);
                return (
                  <a key={c} href={hashDe(c)} className={`menu-item${abas.ativa === c ? ' ativo' : ''}`} title={f.nome}
                    onClick={() => titulosConhecidos.set(c, f.nome)}>
                    <span className="menu-icone">·</span><span className="menu-texto">{f.nome}</span>
                  </a>
                );
              }))}
          </section>
          {AREAS.map(a => {
            const lista = mods.filter(m => m.area === a.id);
            if (!lista.length) return null;
            return (
              <section key={a.id} className="menu-grupo">
                <h3 className="menu-area menu-texto">{a.titulo}</h3>
                {lista.map(m => (
                  <a key={m.id} href={hashDe(m.id)} title={m.titulo}
                    className={`menu-item${abas.ativa === m.id ? ' ativo' : ''}${abas.abas.some(x => x.caminho === m.id) ? ' aberto' : ''}`}>
                    <span className="menu-icone">{m.icone}</span><span className="menu-texto">{m.titulo}</span>
                  </a>
                ))}
              </section>
            );
          })}
        </div>
        <footer className="menu-rodape menu-texto">
          <a href="../">App atual (2.x)</a>
          <small>v{VERSAO}</small>
        </footer>
      </nav>
      <div className="menu-veu" onClick={() => setMenuCel(false)} aria-hidden />

      <div className="area">
        <main className="conteudo">
          {abas.abas.map(a => (
            <div key={esc + a.caminho} role="tabpanel" hidden={a.caminho !== abas.ativa} className="painel">
              <ErroTela nome={a.caminho}>{conteudo(a.caminho, a.titulo)}</ErroTela>
            </div>
          ))}
        </main>
      </div>
      {telaCheia && <button type="button" className="sair-tela-cheia" onClick={alternarTelaCheia}>Sair da tela cheia</button>}
      <BuscaGlobal aberto={busca} aoFechar={() => setBusca(false)} aoAbrir={ir} />
    </div>
  );
}
