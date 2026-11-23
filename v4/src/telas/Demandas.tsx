// V4: filtros de Etapa (cadastro de etapas do app) e Status (Não iniciado, Em andamento, Em validação, Concluído, Cancelado,
// Suspenso); o Nível (demandas, subdemandas ou os dois) fica destacado no fim da barra e vale para TODOS os filtros.
// 4.16.0: duas abas com a mesma barra de filtros — Gráfico (barras com a quantidade por cliente, em ordem alfabética; clicar
// na barra mostra embaixo as demandas do cliente) e Lista (a visão de sempre). A aba fica guardada no aparelho.
// 4.18.0: o gráfico conta no nível escolhido em "Aplicar filtros em".
// 4.18.0: um botão só ("Recolher tudo"/"Expandir tudo", acima dos projetos) recolhe as subdemandas de todas as demandas em tela.
// 4.17.0: a barra do cliente é empilhada por etapa, com a cor da etapa do cadastro (legenda acima das barras).
// 4.23.0: edição múltipla — marcar demandas, subdemandas e tarefas e trocar Status, Etapa ou Responsável de todas de uma vez.
// Módulo Demandas (#/demandas): todas as demandas/subdemandas visíveis, agrupadas por cliente · projeto, com a barra
// de horas e as mesmas ações (popup único) de qualquer tela. Filtros por status (vários, guardados no aparelho — V13a-5,
// módulo 09 da Central), fase do projeto, etapa, responsável, tipo, prioridade, cliente, projeto, atrasadas e texto
// (3.36.0: a lista inteira é carregada e filtrada na tela); "Relatório HTML" baixa o que está na tela.
import { useEffect, useMemo, useState } from 'react';
import { api, FASES, projetoInativo } from '../api/cadastros';
import { consultor } from '../api/consultor';
import { arvoreDemandas, PRIORIDADES, STATUS_V4, todasDemandas, type DemandaLinha } from '../api/execucao';
import { useEtapas } from '../estado/etapas';
import { ArvoreDemandas, itemLoteDemanda } from '../componentes/ArvoreDemandas';
import { AcoesEdicaoMultipla, EdicaoMultipla } from '../componentes/EdicaoMultipla';
import { BarraFiltros } from '../componentes/BarraFiltros';
import { Botao } from '../componentes/Botao';
import { Icone } from '../componentes/Icone';
import { FiltrosSalvos } from '../componentes/FiltrosSalvos';
import { SelecaoMultipla } from '../componentes/SelecaoMultipla';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { useEquipe, usePode } from '../estado/equipe';
import { contarPorCliente, filtrarDemandas, itensDoNivel, NIVEIS_FILTRO, SEM, opcoesNomeadas, opcoesPessoas, opcoesTexto, PADRAO_DEMANDAS_TELA, SIT_PROJETO, TIPOS_DEMANDA, useFiltroLista } from '../estado/filtrosLista';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Resumo } from '../componentes/Resumo';
import { ABERTAS, lerStatus, relatorioDemandas, rotuloStatus, TODOS } from '../api/relatorios';
import { baixarRelatorioHtml } from '../util/relatorioHtml';

const CHAVE_STATUS = 'pmo4.demandas.status';
const CHAVE_ABA = 'pmo4.demandas.aba';
type Aba = 'grafico' | 'lista';
const ABAS: [Aba, string][] = [['grafico', 'Gráfico'], ['lista', 'Lista']];
const PROJETOS_POR_VEZ = 40;
const mesmos = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));

export function Demandas({ minhas }: { minhas?: boolean }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const ed = useEdicao();
  const { porId } = useEquipe();
  const et = useEtapas();
  const [status, setStatus] = useState<string[]>(() => { try { return lerStatus(localStorage.getItem(CHAVE_STATUS)); } catch { return ABERTAS; } });
  useEffect(() => { try { localStorage.setItem(CHAVE_STATUS, JSON.stringify(status)); } catch { /* sem armazenamento */ } }, [status]);
  // um status da V4 pode valer por mais de um do banco ("Não iniciado" = backlog + planejada)
  const trocar = (banco: string[]) => setStatus(l => {
    const n = banco.every(v => l.includes(v)) ? l.filter(x => !banco.includes(x)) : [...new Set([...l, ...banco])];
    return n.length ? TODOS.filter(x => n.includes(x)) : l;
  });
  const { f, mudar, limpar, aplicar, ativos } = useFiltroLista(minhas ? 'minhas-demandas' : 'demandas', PADRAO_DEMANDAS_TELA);
  const [mostrar, setMostrar] = useState(PROJETOS_POR_VEZ);
  // "Minhas demandas" (dentro de Minha agenda) continua só com a lista
  const [aba, setAba] = useState<Aba>(() => { try { return !minhas && localStorage.getItem(CHAVE_ABA) !== 'lista' ? 'grafico' : 'lista'; } catch { return minhas ? 'lista' : 'grafico'; } });
  const trocarAba = (a: Aba) => { setAba(a); setMostrar(PROJETOS_POR_VEZ); try { localStorage.setItem(CHAVE_ABA, a); } catch { /* sem armazenamento */ } };
  const [clienteSel, setClienteSel] = useState<string | null>(null);
  const filtro = status.length === TODOS.length ? null : status;
  const c = useCarga(() => (minhas ? consultor.demandas(esc, filtro, null) : todasDemandas(esc, filtro)),
    [esc, minhas, status.join(), ed.geracao]);
  // 4.26.0: situação dos projetos (para o filtro Projetos ativos/inativos); projeto fora da lista conta como ativo
  const pr = useCarga(() => api.projetos(esc), [esc, ed.geracao]);
  const inativos = useMemo(() => new Set((pr.dados ?? []).filter(p => projetoInativo(p.situacao)).map(p => p.id)), [pr.dados]);
  const todas = useMemo(() => (c.dados?.itens ?? []).map(d => ({ ...d, etapa_app_id: et.idDe(d), etapa_nome: et.de(d)?.nome ?? d.etapa, projeto_inativo: inativos.has(d.projeto_id) })), [c.dados, et, inativos]);
  const itens = useMemo(() => filtrarDemandas(todas, f), [todas, f]);
  useEffect(() => setMostrar(PROJETOS_POR_VEZ), [f, status]);
  const grupos = useMemo(() => {
    const m = new Map<string, { cliente_id: string; cliente: string; projeto: string; projeto_id: string; itens: DemandaLinha[] }>();
    for (const d of itens) {
      const g = m.get(d.projeto_id) ?? { cliente_id: d.cliente_id, cliente: d.cliente, projeto: d.projeto, projeto_id: d.projeto_id, itens: [] };
      g.itens.push(d);
      m.set(d.projeto_id, g);
    }
    return [...m.values()];
  }, [itens]);
  // 4.18.0: o gráfico conta no nível escolhido em "Aplicar filtros em" (só demandas, só subdemandas ou os dois)
  const contados = useMemo(() => itensDoNivel(itens, f.nivel, todas), [itens, f.nivel, todas]);
  const oQue = f.nivel === 'demanda' ? 'demanda(s)' : f.nivel === 'subdemanda' ? 'subdemanda(s)' : 'demanda(s)/subdemanda(s)';
  const porCliente = useMemo(() => contarPorCliente(contados, et.lista.map(e => e.id)), [contados, et.lista]);
  // etapas que aparecem no gráfico (na ordem do cadastro; "sem etapa" por último), para a legenda e as cores dos pedaços
  const etapaDoGrafico = (id: string | null) => { const e = id ? et.porId.get(id) : null; return { nome: e?.nome ?? 'Sem etapa', cor: e?.cor ?? null }; };
  const legenda = useMemo(() => {
    const ids = new Set(porCliente.flatMap(x => x.etapas.map(e => e.id)));
    return [...et.lista.filter(e => ids.has(e.id)).map(e => e.id as string | null), ...(ids.has(null) ? [null] : [])];
  }, [porCliente, et.lista]);
  const maior = Math.max(1, ...porCliente.map(x => x.n));
  // o cliente escolhido no gráfico sai da seleção quando os filtros o tiram da tela
  const escolhido = aba === 'grafico' ? porCliente.find(x => x.cliente_id === clienteSel) ?? null : null;
  const visiveis = aba === 'grafico' ? grupos.filter(g => g.cliente_id === escolhido?.cliente_id) : grupos;
  // recolher/expandir tudo: vale para todas as demandas com subdemanda em tela (inclusive as que "Mostrar mais" ainda vai trazer)
  const [fechadas, setFechadas] = useState<Set<string>>(new Set());
  const comFilhas = useMemo(() => visiveis.flatMap(g => arvoreDemandas(g.itens).filter(x => x.filhas.length).map(x => x.item.id)), [visiveis]);
  const tudoFechado = comFilhas.length > 0 && comFilhas.every(id => fechadas.has(id));
  // edição múltipla: "Selecionar tudo" vale para as demandas e subdemandas dos projetos que estão na tela agora
  const emTela = useMemo(() => visiveis.slice(0, mostrar).flatMap(g => g.itens.map(d => itemLoteDemanda(d, d.etapa_app_id ?? null))), [visiveis, mostrar]);
  const ops = useMemo(() => ({
    fases: opcoesTexto(todas.map(d => d.fase), FASES.filter(x => todas.some(d => d.fase === x))),
    etapas: [...et.lista.filter(e => e.ativo || todas.some(d => d.etapa_app_id === e.id)).map(e => ({ valor: e.id, rotulo: e.nome })),
      ...(todas.some(d => !d.etapa_app_id) ? [{ valor: SEM, rotulo: '(sem etapa)' }] : [])],
    responsaveis: opcoesPessoas(todas.map(d => d.responsavel_id), id => porId.get(id)?.nome),
    clientes: opcoesNomeadas(todas.map(d => [d.cliente_id, d.cliente])),
    projetos: opcoesNomeadas(todas.filter(d => (!f.clientes.length || f.clientes.includes(d.cliente_id)) && (!f.sitProjeto || (f.sitProjeto === 'inativos') === d.projeto_inativo)).map(d => [d.projeto_id, `${d.cliente} · ${d.projeto}`])),
  }), [todas, porId, f.clientes, f.sitProjeto, et]);
  const statusFora = !mesmos(status, ABERTAS);
  const limparTudo = () => { limpar(); setStatus(ABERTAS); };
  const descricao = [`Status: ${rotuloStatus(status)}`,
    f.fases.length ? `Fase: ${f.fases.join(', ')}` : '', f.etapas.length ? `Etapa: ${f.etapas.map(e => ops.etapas.find(o => o.valor === e)?.rotulo ?? e).join(', ')}` : '',
    f.responsaveis.length ? `Responsável: ${f.responsaveis.map(r => ops.responsaveis.find(o => o.valor === r)?.rotulo ?? r).join(', ')}` : '',
    f.nivel ? `Nível dos filtros: ${NIVEIS_FILTRO.find(n => n.valor === f.nivel)?.rotulo ?? f.nivel}` : '',
    f.tipos.length ? `Tipo: ${f.tipos.map(t => TIPOS_DEMANDA.find(o => o.valor === t)?.rotulo ?? t).join(', ')}` : '',
    f.prioridades.length ? `Prioridade: ${f.prioridades.map(t => PRIORIDADES.find(o => o.valor === t)?.rotulo ?? t).join(', ')}` : '',
    f.clientes.length ? `Cliente: ${f.clientes.map(t => ops.clientes.find(o => o.valor === t)?.rotulo ?? t).join(', ')}` : '',
    f.projetos.length ? `Projeto: ${f.projetos.map(t => ops.projetos.find(o => o.valor === t)?.rotulo ?? t).join(', ')}` : '',
    f.sitProjeto ? SIT_PROJETO.find(o => o.valor === f.sitProjeto)?.rotulo ?? '' : '',
    f.atrasadas ? 'Só atrasadas' : '', f.texto.trim() ? `Busca: ${f.texto.trim()}` : '', minhas ? 'Minhas demandas' : ''].filter(Boolean);
  return (
    <div className={minhas ? undefined : 'pagina'}>
      {!minhas && <header className="pagina-topo">
        <div><h1>Demandas</h1><p className="ajuda">{c.dados ? `${c.dados.total} demanda(s)/subdemanda(s)` : ''}</p></div>
        <div className="linha">
          {pode('tarefa.criar') && <Botao onClick={() => ed.tarefa({})}>+ Tarefa</Botao>}
          {pode('demanda.criar') && <Botao variante="primario" onClick={() => ed.demanda({})}>+ Demanda</Botao>}
        </div>
      </header>}
      {!minhas && <div className="segmentos" role="tablist" aria-label="Visões de demandas">
        {ABAS.map(([v, r]) => <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => trocarAba(v)}>{r}</button>)}
      </div>}
      <BarraFiltros nome="demandas" n={c.dados ? itens.length : null} total={c.dados ? todas.length : null} ativos={ativos + (statusFora ? 1 : 0)} aoLimpar={limparTudo}>
        <input type="search" value={f.texto} onChange={e => mudar({ texto: e.target.value })} placeholder="Buscar demanda, cliente, projeto ou etapa" aria-label="Buscar demanda" />
        <details className="filtro-status">
          <summary>Status: {rotuloStatus(status)}</summary>
          <div className="filtro-status-caixa">
            <div className="linha">
              <button type="button" className="link" onClick={() => setStatus(ABERTAS)}>Abertas</button>
              <button type="button" className="link" onClick={() => setStatus(TODOS)}>Todas</button>
            </div>
            {STATUS_V4.map(s => <label key={s.valor} className="check"><input type="checkbox" checked={s.banco.every(v => status.includes(v))} onChange={() => trocar(s.banco)} /> {s.rotulo}</label>)}
          </div>
        </details>
        <SelecaoMultipla rotulo="Fase" opcoes={ops.fases} sel={f.fases} aoMudar={v => mudar({ fases: v })} />
        <SelecaoMultipla rotulo="Etapa" opcoes={ops.etapas} sel={f.etapas} aoMudar={v => mudar({ etapas: v })} />
        <SelecaoMultipla rotulo="Responsável" opcoes={ops.responsaveis} sel={f.responsaveis} aoMudar={v => mudar({ responsaveis: v })} />
        <SelecaoMultipla rotulo="Cliente" opcoes={ops.clientes} sel={f.clientes} aoMudar={v => mudar({ clientes: v })} />
        <SelecaoMultipla rotulo="Projeto" opcoes={ops.projetos} sel={f.projetos} aoMudar={v => mudar({ projetos: v })} />
        <select aria-label="Situação do projeto" value={f.sitProjeto} onChange={e => mudar({ sitProjeto: e.target.value })}>
          {SIT_PROJETO.map(o => <option key={o.valor || 'todos'} value={o.valor}>{o.rotulo}</option>)}
        </select>
        <SelecaoMultipla rotulo="Tipo" opcoes={TIPOS_DEMANDA} sel={f.tipos} aoMudar={v => mudar({ tipos: v })} />
        <SelecaoMultipla rotulo="Prioridade" opcoes={PRIORIDADES} sel={f.prioridades} aoMudar={v => mudar({ prioridades: v })} />
        <label className="check"><input type="checkbox" checked={f.atrasadas} onChange={e => mudar({ atrasadas: e.target.checked })} /> Só atrasadas</label>
        {!minhas && <FiltrosSalvos tela="demandas" atuais={{ ...f, statusLista: status }}
          aoAplicar={x => { aplicar(x); setStatus(Array.isArray(x.statusLista) ? lerStatus(JSON.stringify(x.statusLista)) : ABERTAS); }} />}
        <Botao disabled={!itens.length} onClick={() => baixarRelatorioHtml(relatorioDemandas(itens, descricao))}>Relatório HTML</Botao>
        <span className="filtro-nivel" role="group" aria-label="Nível em que os filtros são aplicados" title="Vale para todos os filtros acima">
          Aplicar filtros em
          <span className="filtro-nivel-ops">
            {NIVEIS_FILTRO.map(n => <button key={n.valor || 'todos'} type="button" aria-pressed={(f.nivel || '') === n.valor} onClick={() => mudar({ nivel: n.valor })}>{n.rotulo}</button>)}
          </span>
        </span>
        <span className="legenda-barra"><span className="leg leg-real">real (OS/app)</span><span className="leg leg-plan">planejado</span></span>
      </BarraFiltros>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {c.dados && grupos.length === 0 && <p className="ajuda">Nenhuma demanda com esse filtro.</p>}
      {c.dados && c.dados.total > todas.length && <p className="ajuda">Carregadas {todas.length} de {c.dados.total}; refine o status.</p>}
      {aba === 'grafico' && porCliente.length > 0 && (
        <section className="cartao gcli" aria-label="Quantidade de demandas por cliente">
          <h2 className="secao">Quantidade por cliente <small className="ajuda">· {contados.length} {oQue} · {porCliente.length} cliente(s) · clique na barra para ver as demandas</small></h2>
          <ul className="gcli-legenda" aria-label="Cores das etapas">
            {legenda.map(id => { const e = etapaDoGrafico(id); return <li key={id ?? 'sem'}><i className={e.cor ? undefined : 'gcli-sem'} style={e.cor ? { background: e.cor } : undefined} />{e.nome}</li>; })}
          </ul>
          <ul className="gcli-lista">
            {porCliente.map(x => (
              <li key={x.cliente_id}>
                <button type="button" className="gcli-linha" aria-pressed={escolhido?.cliente_id === x.cliente_id}
                  aria-label={`${x.cliente}: ${x.n} ${oQue} — ${x.etapas.map(e => `${etapaDoGrafico(e.id).nome}: ${e.n}`).join(', ')}`} onClick={() => { setClienteSel(v => (v === x.cliente_id ? null : x.cliente_id)); setMostrar(PROJETOS_POR_VEZ); }}>
                  <span className="gcli-nome" title={x.cliente}>{x.cliente}</span>
                  <span className="gcli-trilho"><span className="gcli-barra" style={{ width: `${(x.n / maior) * 100}%` }}>
                    {x.etapas.map(e => { const g = etapaDoGrafico(e.id); return <span key={e.id ?? 'sem'} className={`gcli-seg${g.cor ? '' : ' gcli-sem'}`} data-n={e.n} title={`${g.nome}: ${e.n}`} style={{ flexGrow: e.n, ...(g.cor ? { background: g.cor } : {}) }} />; })}
                  </span></span>
                  <b className="gcli-n">{x.n}</b>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {escolhido && <h2 className="secao gcli-titulo">{escolhido.cliente} <small className="ajuda">· {escolhido.n} {oQue}</small></h2>}
      <EdicaoMultipla chave={JSON.stringify([f, status, aba, escolhido?.cliente_id ?? null])}>
      {emTela.length > 0 && (
        <div className="arvore-acoes arvore-acoes-tela">
          {comFilhas.length > 0 && <button type="button" className="link" data-testid="recolher-todas" title="Vale para todas as demandas em tela"
            onClick={() => setFechadas(tudoFechado ? new Set() : new Set(comFilhas))}>
            <Icone nome={tudoFechado ? 'seta' : 'baixo'} tam={14} /> {tudoFechado ? 'Expandir tudo' : 'Recolher tudo'}
          </button>}
          <AcoesEdicaoMultipla todos={emTela} />
        </div>
      )}
      {visiveis.slice(0, mostrar).map(g => (
        <section key={g.projeto_id} className="cartao">
          <h2 className="secao"><Resumo tipo="projeto" id={g.projeto_id}><a href={hashDe(caminhoEntidade('projeto', g.projeto_id))}>{g.cliente} · {g.projeto}</a></Resumo></h2>
          <ArvoreDemandas demandas={g.itens} fechadas={fechadas} aoFechar={setFechadas} />
        </section>
      ))}
      </EdicaoMultipla>
      {visiveis.length > mostrar && (
        <p><Botao onClick={() => setMostrar(n => n + PROJETOS_POR_VEZ)}>Mostrar mais projetos ({visiveis.length - mostrar} restantes)</Botao></p>
      )}
    </div>
  );
}
