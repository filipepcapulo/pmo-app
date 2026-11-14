// Casca da V4: topo (abas por módulo aberto, busca, escritório, tema, tela cheia, sair) e menu lateral por área
// (recolhível, com Favoritos e o nome do item ao passar o mouse). As abas ficam na faixa do topo. A rota (#/…) manda: tela do
// menu abre/ativa a aba dela; navegar por dentro (cliente → projeto → demanda) fica na MESMA aba, com trilha para voltar;
// Ctrl/⌘+clique (ou o botão do item) abre outra aba da mesma tela.
// O Início é o fundo: fica sempre montado e aparece quando nenhuma aba está ativa.
import { useCallback, useEffect, useMemo, useState, type MouseEvent as CliqueReact, type ReactNode } from 'react';
import { AbasTopo } from '../componentes/AbasTopo';
import { BuscaGlobal } from '../componentes/BuscaGlobal';
import { ErroTela } from '../componentes/ErroTela';
import { Icone } from '../componentes/Icone';
import { Notificacoes } from '../componentes/Notificacoes';
import { useFavoritos } from '../estado/favoritos';
import { useSessao } from '../estado/sessao';
import { abaAtiva, abrirNova, ativar, caminhoAtivo, caminhoDa, fechar, fecharTodas, INICIO, lerAbasSalvas, moduloDe, mover, navegar, renomear, type Aba, type EstadoAbas } from '../estado/abas';
import { useFecharSuspensosFora } from '../util/fecharFora';
import { Etapas } from '../telas/Etapas';
import { AREAS, caminhoDoHash, caminhoEntidade, ENTIDADES, hashDe, lerRota, modulosVisiveis } from '../estado/rotas';
import { aplicarTema, lerTema, proximoTema } from '../estado/tema';
import { AgendaEquipe } from '../telas/AgendaEquipe';
import { ChamadoTela } from '../telas/ChamadoTela';
import { Chamados } from '../telas/Chamados';
import { ClienteTela } from '../telas/ClienteTela';
import { Clientes } from '../telas/Clientes';
import { Componentes } from '../telas/Componentes';
import { Mcp } from '../telas/Mcp';
import { SyncClickup } from '../telas/SyncClickup';
import { SyncExperience } from '../telas/SyncExperience';
import { Fechamento, MeuFechamento } from '../telas/Fechamento';
import { Financeiro } from '../telas/Financeiro';
import { Sugestoes } from '../telas/Sugestoes';
import { AceiteOs } from '../telas/AceiteOs';
import { DemandaTela } from '../telas/DemandaTela';
import { Demandas } from '../telas/Demandas';
import { Consultor } from '../telas/Consultor';
import { Desvios } from '../telas/Desvios';
import { EnvioAgendas } from '../telas/EnvioAgendas';
import { EmConstrucao, NaoEncontrada } from '../telas/EmConstrucao';
import { Produtividade } from '../telas/Produtividade';
import { Ferias } from '../telas/Ferias';
import { Reembolso } from '../telas/Reembolso';
import { NotificacoesAparelho } from '../telas/NotificacoesAparelho';
import { Ociosidade } from '../telas/Ociosidade';
import { Portfolio } from '../telas/Portfolio';
import { Equipe } from '../telas/Equipe';
import { Inicio } from '../telas/Inicio';
import { Manuais } from '../telas/Manuais';
import { MANUAIS } from '../manuais';
import { Modelos } from '../telas/Modelos';
import { Organograma } from '../telas/Organograma';
import { ProjetoTela } from '../telas/ProjetoTela';
import { Projetos } from '../telas/Projetos';
import { TarefaTela } from '../telas/TarefaTela';
import { VERSAO } from '../versao';

const lerLS = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* */ } };
const celular = () => window.matchMedia('(max-width: 767px)').matches;
// títulos conhecidos ao navegar (busca/favoritos), usados na aba de um link profundo
const titulosConhecidos = new Map<string, string>();

function tituloDe(caminho: string): string {
  const r = lerRota(caminho);
  if (r.tipo === 'modulo') return r.parametro ? MANUAIS.find(m => m.id === r.parametro)?.titulo ?? r.modulo.titulo : r.modulo.titulo;
  if (r.tipo === 'entidade') return titulosConhecidos.get(caminho) ?? ENTIDADES[r.entidade].titulo;
  return 'Não encontrado';
}

export function Casca() {
  const { eu, trocarEscritorio, sair } = useSessao();
  const fav = useFavoritos();
  const esc = eu!.escritorio_id ?? 'sem';
  const chaveAbas = `pmo4.abas.${esc}`;
  const [abas, setAbas] = useState<EstadoAbas>(() => lerAbasSalvas(lerLS(chaveAbas)));
  const [recolhido, setRecolhido] = useState(() => lerLS('pmo4.menu') === 'recolhido');
  const [menuCel, setMenuCel] = useState(false);
  const [favAberto, setFavAberto] = useState(() => lerLS('pmo4.menu.fav') !== 'fechado');
  const [busca, setBusca] = useState(false);
  const [tema, setTema] = useState(lerTema);
  const [telaCheia, setTelaCheia] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [dica, setDica] = useState<{ texto: string; topo: number } | null>(null);
  useFecharSuspensosFora();

  // troca de escritório: cada escritório guarda as suas abas
  useEffect(() => { setAbas(lerAbasSalvas(lerLS(chaveAbas))); }, [chaveAbas]);
  useEffect(() => { gravarLS(chaveAbas, JSON.stringify(abas)); }, [abas, chaveAbas]);
  useEffect(() => { gravarLS('pmo4.menu', recolhido ? 'recolhido' : 'aberto'); }, [recolhido]);
  useEffect(() => { gravarLS('pmo4.menu.fav', favAberto ? 'aberto' : 'fechado'); }, [favAberto]);
  useEffect(() => { aplicarTema(tema); }, [tema]);

  // rota → aba
  useEffect(() => {
    const aplicar = () => {
      const c = caminhoDoHash(location.hash);
      if (c === null) return;
      setAbas(a => navegar(a, { caminho: c, titulo: tituloDe(c) }));
      if (celular()) setMenuCel(false);
    };
    // depois do login por link o hash é o #access_token (já lido pelo Supabase): volta para a aba ativa
    if (caminhoDoHash(location.hash) === null) history.replaceState(null, '', location.pathname + hashDe(caminhoAtivo(abas)));
    else if (!location.hash && abas.ativa) history.replaceState(null, '', hashDe(caminhoAtivo(abas)));
    aplicar();
    window.addEventListener('hashchange', aplicar);
    return () => window.removeEventListener('hashchange', aplicar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveAbas]);

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
    if (location.hash === hashDe(caminho)) setAbas(a => navegar(a, { caminho, titulo: titulo ?? tituloDe(caminho) }));
    else location.hash = hashDe(caminho);
  }, []);
  /** Outra aba da mesma tela (Ctrl/⌘+clique, botão do meio ou o botão do item do menu). */
  const abrirOutra = useCallback((caminho: string, titulo?: string) => {
    if (titulo) titulosConhecidos.set(caminho, titulo);
    setAbas(a => abrirNova(a, { caminho, titulo: titulo ?? tituloDe(caminho) }));
    if (location.hash !== hashDe(caminho)) location.hash = hashDe(caminho);
  }, []);
  const ativarAba = (id: string) => {
    const aba = abas.abas.find(a => a.id === id);
    if (!aba) return;
    setAbas(a => ativar(a, id));
    if (location.hash !== hashDe(caminhoDa(aba))) location.hash = hashDe(caminhoDa(aba));
  };
  const fecharAba = (id: string) => {
    const novo = fechar(abas, id);
    setAbas(novo);
    if (novo.ativa && novo.ativa !== abas.ativa) history.replaceState(null, '', hashDe(caminhoAtivo(novo)));
  };
  const cliqueMenu = (e: CliqueReact, caminho: string, titulo: string) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) { e.preventDefault(); abrirOutra(caminho, titulo); }
  };
  // menu recolhido: nome do item ao passar o mouse (ou ao focar pelo teclado)
  const mostrarDica = (e: { target: EventTarget | null }) => {
    const el = (e.target as HTMLElement | null)?.closest?.('[data-dica]') as HTMLElement | null;
    if (!recolhido || celular() || !el) { if (dica) setDica(null); return; }
    const r = el.getBoundingClientRect();
    const texto = el.dataset.dica ?? '';
    if (dica?.texto !== texto || dica.topo !== r.top + r.height / 2) setDica({ texto, topo: r.top + r.height / 2 });
  };
  const fecharTudo = () => {
    setAbas(fecharTodas());
    history.replaceState(null, '', hashDe(INICIO));
  };

  const mods = useMemo(() => modulosVisiveis(eu!.permissoes, eu!.fin), [eu]);
  const conteudo = (caminho: string, aba?: Aba): ReactNode => {
    const r = lerRota(caminho);
    if (r.tipo === 'desconhecida') return <NaoEncontrada caminho={caminho} />;
    if (r.tipo === 'entidade') {
      const aoRenomear = (t: string) => { titulosConhecidos.set(caminho, t); if (aba) setAbas(a => renomear(a, aba.id, caminho, t)); };
      if (r.entidade === 'cliente') return <ClienteTela id={r.id} aoRenomear={aoRenomear} ir={ir} />;
      if (r.entidade === 'projeto') return <ProjetoTela id={r.id} aoRenomear={aoRenomear} />;
      if (r.entidade === 'demanda') return <DemandaTela id={r.id} aoRenomear={aoRenomear} />;
      if (r.entidade === 'tarefa') return <TarefaTela id={r.id} aoRenomear={aoRenomear} />;
      return <ChamadoTela id={r.id} aoRenomear={aoRenomear} />;
    }
    if (!mods.includes(r.modulo)) return <div className="vazio-tela"><h2>Sem acesso</h2><p>Você não tem permissão para {r.modulo.titulo}.</p></div>;
    if (r.modulo.id === 'inicio') return <Inicio />;
    if (r.modulo.id === 'manuais') return <Manuais id={r.parametro} />;
    if (r.modulo.id === 'notificacoes') return <NotificacoesAparelho />;
    if (r.modulo.id === 'sugestoes') return <Sugestoes />;
    if (r.modulo.id === 'financeiro') return <Financeiro />;
    if (r.modulo.id === 'fechamento') return <Fechamento />;
    if (r.modulo.id === 'meu-fechamento') return <MeuFechamento />;
    if (r.modulo.id === 'componentes') return <Componentes />;
    if (r.modulo.id === 'sync-experience') return <SyncExperience />;
    if (r.modulo.id === 'sync-clickup') return <SyncClickup />;
    if (r.modulo.id === 'mcp') return <Mcp />;
    if (r.modulo.id === 'aceite-os') return <AceiteOs parametro={r.parametro} />;
    if (r.modulo.id === 'clientes') return <Clientes ir={ir} />;
    if (r.modulo.id === 'projetos') return <Projetos ir={ir} />;
    if (r.modulo.id === 'modelos') return <Modelos />;
    if (r.modulo.id === 'etapas') return <Etapas />;
    if (r.modulo.id === 'equipe') return <Equipe />;
    if (r.modulo.id === 'organograma') return <Organograma />;
    if (r.modulo.id === 'demandas') return <Demandas />;
    if (r.modulo.id === 'agenda') return <AgendaEquipe />;
    if (r.modulo.id === 'chamados') return <Chamados ir={ir} parametro={r.parametro} />;
    if (r.modulo.id === 'consultor') return <Consultor />;
    if (r.modulo.id === 'desvios') return <Desvios />;
    if (r.modulo.id === 'envio-agendas') return <EnvioAgendas />;
    if (r.modulo.id === 'produtividade') return <Produtividade />;
    if (r.modulo.id === 'ociosidade') return <Ociosidade />;
    if (r.modulo.id === 'portfolio') return <Portfolio />;
    if (r.modulo.id === 'ferias') return <Ferias />;
    if (r.modulo.id === 'reembolso') return <Reembolso parametro={r.parametro} />;
    return <EmConstrucao titulo={r.modulo.titulo} etapa={r.modulo.etapa} />;
  };

  const escAtual = eu!.escritorios.find(e => e.id === eu!.escritorio_id);
  const ativa = abaAtiva(abas);
  const cAtivo = caminhoAtivo(abas);
  const telaAtiva = ativa ? moduloDe(ativa.pilha[0].caminho) : abas.ativa === INICIO ? INICIO : null;
  const telasAbertas = new Set(abas.abas.map(a => moduloDe(a.pilha[0].caminho)));
  return (
    <div className={`casca${recolhido ? ' recolhido' : ''}${menuCel ? ' menu-cel-aberto' : ''}${telaCheia ? ' tela-cheia' : ''}`}>
      <header className="topo">
        <button type="button" className="topo-bt" aria-label="Menu" aria-expanded={celular() ? menuCel : !recolhido}
          onClick={() => (celular() ? setMenuCel(!menuCel) : setRecolhido(!recolhido))}><Icone nome="menu" tam={22} /></button>
        <a className="topo-marca" href={hashDe('inicio')}>PMO <span>v4</span></a>
        <AbasTopo abas={abas.abas} ativa={abas.ativa} aoIr={ativarAba} aoFechar={fecharAba} aoFecharTodas={fecharTudo}
          aoDuplicar={id => { const a = abas.abas.find(x => x.id === id); if (a) abrirOutra(caminhoDa(a), a.pilha.at(-1)!.titulo); }}
          aoMover={(id, alvo, depois) => setAbas(a => mover(a, id, alvo, depois))} />
        <button type="button" className="topo-busca" onClick={() => setBusca(true)} aria-label="Buscar (Ctrl+K)">
          <Icone nome="busca" tam={18} /><span className="so-pc">Buscar…</span><kbd className="so-pc">Ctrl K</kbd>
        </button>
        <div className="topo-dir">
          {eu!.escritorios.length > 1 ? (
            <select className="topo-esc" aria-label="Escritório" value={eu!.escritorio_id ?? ''} disabled={trocando}
              onChange={async e => { setTrocando(true); await trocarEscritorio(e.target.value); setTrocando(false); }}>
              {eu!.escritorios.map(e => <option key={e.id} value={e.id}>{e.sigla}</option>)}
            </select>
          ) : <span className="topo-esc-fixo" title={escAtual?.nome}>{escAtual?.sigla}</span>}
          <Notificacoes />
          <button type="button" className="topo-bt" aria-label={`Tema: ${tema}`} title={`Tema: ${tema}`}
            onClick={() => setTema(proximoTema(tema))}><Icone nome={tema === 'escuro' ? 'lua' : tema === 'claro' ? 'sol' : 'auto'} /></button>
          <button type="button" className="topo-bt" aria-label="Tela cheia" aria-pressed={telaCheia} onClick={alternarTelaCheia}><Icone nome="expandir" /></button>
          <button type="button" className="topo-avatar" style={{ background: eu!.usuario.cor ?? undefined }}
            title={`${eu!.usuario.nome} — sair`} aria-label="Sair" onClick={() => { if (confirm('Sair do PMO v4?')) sair(); }}>
            {eu!.usuario.iniciais ?? eu!.usuario.nome.slice(0, 2).toUpperCase()}
          </button>
        </div>
      </header>

      <nav className="menu" aria-label="Menu principal" onMouseOver={mostrarDica} onFocus={mostrarDica} onMouseLeave={() => setDica(null)} onBlur={() => setDica(null)}>
        <div className="menu-rolagem">
          <section className="menu-grupo">
            <button type="button" className="menu-titulo" data-dica="Favoritos" aria-expanded={favAberto} onClick={() => setFavAberto(!favAberto)}>
              <span className="menu-icone"><Icone nome="estrela" cheio /></span><span className="menu-texto">Favoritos</span><Icone nome="baixo" tam={16} className={`menu-chev menu-texto${favAberto ? ' aberto' : ''}`} />
            </button>
            {favAberto && (fav.lista.length === 0
              ? <p className="menu-vazio menu-texto">Marque ☆ num item para ele aparecer aqui.</p>
              : fav.lista.map(f => {
                const c = caminhoEntidade(f.entidade, f.entidade_id);
                return (
                  <a key={c} href={hashDe(c)} className={`menu-item${cAtivo === c ? ' ativo' : ''}`} title={recolhido ? undefined : f.nome} data-dica={f.nome}
                    onClick={e => { titulosConhecidos.set(c, f.nome); cliqueMenu(e, c, f.nome); }} onAuxClick={e => cliqueMenu(e, c, f.nome)}>
                    <span className="menu-icone"><Icone nome="estrela" tam={16} /></span><span className="menu-texto">{f.nome}</span>
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
                  <div key={m.id} className="menu-linha">
                    <a href={hashDe(m.id)} title={recolhido ? undefined : m.titulo} data-dica={m.titulo}
                      className={`menu-item${telaAtiva === m.id ? ' ativo' : ''}${telasAbertas.has(m.id) ? ' aberto' : ''}`}
                      onClick={e => cliqueMenu(e, m.id, m.titulo)} onAuxClick={e => cliqueMenu(e, m.id, m.titulo)}>
                      <span className="menu-icone"><Icone nome={m.icone} /></span><span className="menu-texto">{m.titulo}</span>
                    </a>
                    {m.id !== INICIO && (
                      <button type="button" className="menu-outra menu-texto" title={`Abrir ${m.titulo} em outra aba`} aria-label={`Abrir ${m.titulo} em outra aba`}
                        onClick={() => abrirOutra(m.id, m.titulo)}><Icone nome="copia" tam={14} /></button>
                    )}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
        <footer className="menu-rodape menu-texto">
          <small>v{VERSAO}</small>
        </footer>
      </nav>
      <div className="menu-veu" onClick={() => setMenuCel(false)} aria-hidden />
      {dica && recolhido && <div className="menu-dica" role="tooltip" style={{ top: dica.topo }}>{dica.texto}</div>}

      <div className="area">
        <main className="conteudo">
          <div role="tabpanel" hidden={abas.ativa !== null && abas.ativa !== INICIO} className="painel">
            <ErroTela nome={INICIO}>{conteudo(INICIO)}</ErroTela>
          </div>
          {abas.abas.flatMap(a => a.pilha.map((p, i) => {
            const visivel = a.id === abas.ativa && i === a.pilha.length - 1;
            return (
              <div key={`${esc}${a.id}:${i}:${p.caminho}`} role="tabpanel" hidden={!visivel} className="painel" data-caminho={p.caminho}>
                {a.pilha.length > 1 && visivel && (
                  <nav className="trilha" aria-label="Caminho nesta aba">
                    <a className="trilha-voltar" href={hashDe(a.pilha[i - 1].caminho)} aria-label="Voltar"><Icone nome="esquerda" tam={16} /> Voltar</a>
                    {a.pilha.map((x, j) => (j < i
                      ? <span key={j} className="trilha-item"><a href={hashDe(x.caminho)} title={x.titulo}>{x.titulo}</a><span aria-hidden> › </span></span>
                      : <span key={j} className="trilha-item atual" aria-current="page" title={x.titulo}>{x.titulo}</span>))}
                  </nav>
                )}
                <ErroTela nome={p.caminho}>{conteudo(p.caminho, a)}</ErroTela>
              </div>
            );
          }))}
        </main>
      </div>
      {telaCheia && <button type="button" className="sair-tela-cheia" onClick={alternarTelaCheia}>Sair da tela cheia</button>}
      <BuscaGlobal aberto={busca} aoFechar={() => setBusca(false)} aoAbrir={ir} />
    </div>
  );
}
