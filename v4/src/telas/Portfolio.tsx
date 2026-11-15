// Portfólio de projetos (#/portfolio, V11a): como o módulo do 2.x — cartões por fase e gráfico por GP (tocar filtra),
// Gantt dos projetos com o Go Live (losango; vermelho = vencido em aberto, barra laranja = etapa vencida), grade e riscos.
// 3.13.0: fases e GPs em seleção múltipla; Avulso só no Gantt com cronograma; a tabela sinaliza o cliente com plano de
// ação aberto e o "+ Plano" abre o mesmo 5W2H da Tela de Projeto.
// 3.25.0 (V13c-1): saldo dos pedidos do Experience × horas agendadas (seção própria e coluna "Pedido" na tabela).
// V4 4.2.0: barra de filtros no topo (acima dos cartões) com os mesmos filtros da tela de Demandas + GP; os filtros de
// demanda (status, etapa, responsável, tipo, prioridade, só atrasadas) mostram os projetos que têm demanda assim.
import { useEffect, useMemo, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { PRIORIDADES, STATUS_V4, todasDemandas } from '../api/execucao';
import { ABERTAS, lerStatus, rotuloStatus, TODOS } from '../api/relatorios';
import { BarraFiltros } from '../componentes/BarraFiltros';
import { FiltrosSalvos } from '../componentes/FiltrosSalvos';
import { useEquipe } from '../estado/equipe';
import { useEtapas } from '../estado/etapas';
import { filtraPorDemanda, filtrarPortfolio, NIVEIS_FILTRO, opcoesNomeadas, opcoesPessoas, PADRAO_PORTFOLIO, SEM, TIPOS_DEMANDA, useFiltroLista } from '../estado/filtrosLista';
import { diaNum } from '../api/projeto';
import { alternar, fasesDe, gpsDe, janelaGantt, paraGantt, planosPorCliente, porGp, portfolio, SEM_GP, type ProjetoPortfolio, type RiscoPortfolio } from '../api/portfolio';
import type { DemandaProjeto } from '../api/projeto';
import { Popup5W2H } from '../componentes/Popup5W2H';
import { SaldoPedidos, SeloSituacao } from '../componentes/SaldoPedidos';
import { pedidos, porProjeto } from '../api/pedidos';
import { SelecaoMultipla } from '../componentes/SelecaoMultipla';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { usePode } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const COR_NIVEL = { critico: 'var(--vermelho)', alto: 'var(--laranja)', moderado: 'var(--texto-2)' };
const ROT_NIVEL = { critico: 'Crítico', alto: 'Alto', moderado: 'Moderado' };
const CHAVE_STATUS = 'pmo4.portfolio.status';
const mesmos = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));
const linkProjeto = (id: string, nome: string) => <a href={hashDe(caminhoEntidade('projeto', id))}>{nome}</a>;

function GanttPortfolio({ ps, hoje }: { ps: ProjetoPortfolio[]; hoje: string }) {
  if (!ps.length) return <p className="ajuda">Nenhum projeto.</p>;
  const j = janelaGantt(ps, hoje);
  const total = diaNum(j.fim) - diaNum(j.ini) + 15;
  const x = (iso: string) => `${Math.max(0, Math.min(100, ((diaNum(iso) - diaNum(j.ini)) / total) * 100))}%`;
  const meses: string[] = [];
  for (let a = +j.ini.slice(0, 4), m = +j.ini.slice(5, 7) - 1; ; m++) {
    const iso = new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10);
    if (iso > j.fim) break;
    meses.push(iso);
  }
  return (
    <div className="pf-gantt" role="table" aria-label="Gantt dos projetos">
      <div className="pf-g-linha pf-g-cab" role="row">
        <span className="pf-g-rot" />
        <span className="pf-g-trilha">{meses.map(m => <span key={m} className="pf-g-mes" style={{ left: x(m) }}>{MESES[+m.slice(5, 7) - 1]}/{m.slice(2, 4)}</span>)}</span>
      </div>
      {ps.map(p => {
        let a = p.inicio ?? p.golive ?? p.fim, b = p.fim ?? p.golive ?? p.inicio;
        if (a && b && b < a) [a, b] = [b, a];
        return (
          <div key={p.id} className="pf-g-linha" role="row">
            <span className="pf-g-rot" title={`${p.cliente} — ${p.nome}`}><small>{p.cliente}</small>{linkProjeto(p.id, p.nome)}</span>
            <span className="pf-g-trilha">
              <span className="pf-g-hoje" style={{ left: x(hoje) }} />
              {a && b && <span className={`pf-g-barra${p.atraso === 'etapa' ? ' atraso' : ''}`} style={{ left: x(a), width: `calc(${x(b)} - ${x(a)} + 4px)` }}
                title={`${data(a)} a ${data(b)}${p.etapas_atrasadas.length ? ` · etapas vencidas: ${p.etapas_atrasadas.join(', ')}` : ''}`} />}
              {p.golive && <span className={`pf-g-gl${p.golive_ok ? ' ok' : p.atraso === 'golive' ? ' vencido' : ''}`} style={{ left: x(p.golive) }}
                title={`Go Live ${data(p.golive)}${p.golive_ok ? ' (concluído)' : ''}`} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Portfolio() {
  const esc = useSessao().eu!.escritorio_id!;
  const ed = useEdicao();
  const c = useCarga(() => portfolio.ler(esc), [esc, ed.geracao]);
  const ped = useCarga(() => pedidos.ultima(esc), [esc, ed.geracao]);
  const situacoes = useMemo(() => porProjeto(ped.dados?.linhas ?? []), [ped.dados]);
  const pode = usePode();
  const { porId } = useEquipe();
  const et = useEtapas();
  const { f, mudar, limpar, aplicar, ativos } = useFiltroLista('portfolio', PADRAO_PORTFOLIO);
  const [status, setStatus] = useState<string[]>(() => { try { return lerStatus(localStorage.getItem(CHAVE_STATUS)); } catch { return ABERTAS; } });
  useEffect(() => { try { localStorage.setItem(CHAVE_STATUS, JSON.stringify(status)); } catch { /* sem armazenamento */ } }, [status]);
  const trocar = (banco: string[]) => setStatus(l => {
    const n = banco.every(v => l.includes(v)) ? l.filter(x => !banco.includes(x)) : [...new Set([...l, ...banco])];
    return n.length ? TODOS.filter(x => n.includes(x)) : l;
  });
  const [plano, setPlano] = useState<Partial<DemandaProjeto> | null>(null);
  // demandas dos status escolhidos: dão as opções de etapa/responsável e dizem que projeto tem demanda que passa no filtro
  const dem = useCarga(() => todasDemandas(esc, status.length === TODOS.length ? null : status), [esc, status.join(), ed.geracao]);
  const demandas = useMemo(() => (dem.dados ? dem.dados.itens.map(d => ({ ...d, etapa_app_id: et.idDe(d) })) : null), [dem.dados, et]);
  const ps = c.dados?.projetos ?? [];
  const statusFora = !mesmos(status, ABERTAS);
  // "Abertas" (padrão) e "Todas" não restringem sozinhas: projeto sem demanda continua na lista
  const statusRestringe = statusFora && status.length !== TODOS.length;
  const fases = f.fases, gpsSel = f.gps;
  const setFases = (v: string[]) => mudar({ fases: v }), setGps = (v: string[]) => mudar({ gps: v });
  const doGp = useMemo(() => filtrarPortfolio(ps, demandas, f, statusRestringe, { fases: true }, SEM_GP), [ps, demandas, f, statusRestringe]);
  const daFase = useMemo(() => filtrarPortfolio(ps, demandas, f, statusRestringe, { gps: true }, SEM_GP), [ps, demandas, f, statusRestringe]);
  const lista = useMemo(() => filtrarPortfolio(ps, demandas, f, statusRestringe, {}, SEM_GP), [ps, demandas, f, statusRestringe]);
  const ops = useMemo(() => {
    const ds = demandas ?? [];
    return {
      etapas: [...et.lista.filter(e => e.ativo || ds.some(d => d.etapa_app_id === e.id)).map(e => ({ valor: e.id, rotulo: e.nome })),
        ...(ds.some(d => !d.etapa_app_id) ? [{ valor: SEM, rotulo: '(sem etapa)' }] : [])],
      responsaveis: opcoesPessoas(ds.map(d => d.responsavel_id), id => porId.get(id)?.nome),
      clientes: opcoesNomeadas(ps.map(p => [p.cliente_id, p.cliente])),
      projetos: opcoesNomeadas(ps.filter(p => !f.clientes.length || f.clientes.includes(p.cliente_id)).map(p => [p.id, `${p.cliente} · ${p.nome}`])),
    };
  }, [demandas, ps, porId, f.clientes, et]);
  const limparTudo = () => { limpar(); setStatus(ABERTAS); };
  const aguardaDemandas = filtraPorDemanda(f, statusRestringe) && !demandas;
  const planos = useMemo(() => planosPorCliente(c.dados?.riscos ?? [], ps), [c.dados, ps]);
  const podePlano = pode('demanda.criar');
  const barras = porGp(daFase), max = Math.max(1, ...barras.map(b => b.n));
  const colunas = useMemo<Coluna<ProjetoPortfolio>[]>(() => [
    { chave: 'cliente', titulo: 'Cliente', render: p => (planos.get(p.cliente_id)
      ? <span className="pf-cli">{p.cliente} <span className="pilula pf-plano" title="Cliente com plano de ação aberto (5W2H)">{planos.get(p.cliente_id)} plano{planos.get(p.cliente_id)! > 1 ? 's' : ''} de ação</span></span>
      : p.cliente) },
    { chave: 'nome', titulo: 'Projeto', render: p => linkProjeto(p.id, p.nome), texto: p => p.nome },
    { chave: 'fase', titulo: 'Fase' },
    { chave: 'gp', titulo: 'GP', texto: p => p.gp ?? SEM_GP },
    { chave: 'inicio', titulo: 'Início', texto: p => data(p.inicio), valor: p => p.inicio },
    { chave: 'fim', titulo: 'Fim', texto: p => data(p.fim), valor: p => p.fim },
    { chave: 'golive', titulo: 'Go Live', valor: p => p.golive, texto: p => (p.golive ? data(p.golive) + (p.golive_ok ? ' ✓' : '') : 'Sem Go Live') },
    { chave: 'atraso', titulo: 'Atraso', texto: p => (p.atraso === 'golive' ? 'Go Live vencido' : p.atraso === 'etapa' ? 'Etapa vencida' : ''),
      render: p => (p.atraso ? <span className="pilula" style={{ background: p.atraso === 'golive' ? 'var(--vermelho)' : 'var(--laranja)', color: '#fff' }}>{p.atraso === 'golive' ? 'Go Live vencido' : 'Etapa vencida'}</span> : null) },
    { chave: 'horas_pedidas', titulo: 'Pedidas', alinhar: 'dir', texto: p => horas(p.horas_pedidas), valor: p => p.horas_pedidas },
    { chave: 'horas_agendadas', titulo: 'Agendadas', alinhar: 'dir', texto: p => horas(p.horas_agendadas), valor: p => p.horas_agendadas },
    { chave: 'horas_executadas', titulo: 'Executadas', alinhar: 'dir', texto: p => horas(p.horas_executadas), valor: p => p.horas_executadas },
    { chave: 'demandas_abertas', titulo: 'Demandas abertas', alinhar: 'dir' },
    { chave: 'pedido', titulo: 'Pedido (Experience)', texto: p => situacoes.get(p.id)?.situacao ?? '', ordem: p => situacoes.get(p.id)?.situacao ?? 'ZZ',
      render: p => { const l = situacoes.get(p.id); return l ? <span title={l.observacao || undefined}><SeloSituacao s={l.situacao} /></span> : null; } },
    { chave: 'plano', titulo: 'Plano de ação', texto: p => (planos.get(p.cliente_id) ? 'Sim' : ''), valor: p => planos.get(p.cliente_id) ?? 0,
      render: p => (podePlano ? <button type="button" className="link" aria-label={`Novo plano de ação em ${p.nome}`} onClick={() => setPlano({ projeto_id: p.id })}>+ Plano</button> : null) },
  ], [planos, podePlano, situacoes]);
  const colRiscos = useMemo<Coluna<RiscoPortfolio>[]>(() => [
    { chave: 'nivel', titulo: 'Nível', texto: r => ROT_NIVEL[r.nivel], render: r => <span className="pilula" style={{ background: COR_NIVEL[r.nivel], color: '#fff' }}>{ROT_NIVEL[r.nivel]}</span> },
    { chave: 'nome', titulo: 'Plano de ação', render: r => <a href={hashDe(caminhoEntidade('demanda', r.demanda_id))}>{r.nome}</a>, texto: r => r.nome },
    { chave: 'cliente', titulo: 'Cliente' },
    { chave: 'projeto', titulo: 'Projeto' },
    { chave: 'responsavel', titulo: 'Responsável' },
    { chave: 'vencimento', titulo: 'Vencimento', texto: r => data(r.vencimento), valor: r => r.vencimento },
    { chave: 'dias', titulo: 'Dias', alinhar: 'dir', texto: r => (r.dias == null ? '' : r.dias < 0 ? `venceu há ${-r.dias}` : String(r.dias)) },
  ], []);
  return (
    <div className="pagina pagina-larga">
      <header className="pagina-topo"><div><h1>Portfólio de projetos</h1><p className="ajuda">Projetos ativos por fase e GP, Go Live, atraso, horas e riscos ativos. Os filtros são os mesmos da tela de Demandas: status, etapa, responsável, tipo, prioridade e "só atrasadas" mostram os projetos que têm demanda assim. Toque nos cartões e nas barras para filtrar (vários de uma vez). No Gantt, projeto Avulso só aparece com cronograma.</p></div></header>
      <BarraFiltros nome="projetos" n={c.dados ? lista.length : null} total={c.dados ? ps.length : null} ativos={ativos + (statusFora ? 1 : 0)} aoLimpar={limparTudo}>
        <input type="search" value={f.texto} onChange={e => mudar({ texto: e.target.value })} placeholder="Buscar projeto, cliente, GP ou fase" aria-label="Buscar projeto" />
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
        <SelecaoMultipla rotulo="Fase" opcoes={fasesDe(ps)} sel={f.fases} aoMudar={setFases} />
        <SelecaoMultipla rotulo="GP" opcoes={gpsDe(ps)} sel={f.gps} aoMudar={setGps} />
        <SelecaoMultipla rotulo="Etapa" opcoes={ops.etapas} sel={f.etapas} aoMudar={v => mudar({ etapas: v })} />
        <SelecaoMultipla rotulo="Responsável" opcoes={ops.responsaveis} sel={f.responsaveis} aoMudar={v => mudar({ responsaveis: v })} />
        <SelecaoMultipla rotulo="Cliente" opcoes={ops.clientes} sel={f.clientes} aoMudar={v => mudar({ clientes: v })} />
        <SelecaoMultipla rotulo="Projeto" opcoes={ops.projetos} sel={f.projetos} aoMudar={v => mudar({ projetos: v })} />
        <SelecaoMultipla rotulo="Tipo" opcoes={TIPOS_DEMANDA} sel={f.tipos} aoMudar={v => mudar({ tipos: v })} />
        <SelecaoMultipla rotulo="Prioridade" opcoes={PRIORIDADES} sel={f.prioridades} aoMudar={v => mudar({ prioridades: v })} />
        <label className="check"><input type="checkbox" checked={f.atrasadas} onChange={e => mudar({ atrasadas: e.target.checked })} /> Só atrasadas</label>
        <FiltrosSalvos tela="portfolio" atuais={{ ...f, statusLista: status }}
          aoAplicar={x => { aplicar(x); setStatus(Array.isArray(x.statusLista) ? lerStatus(JSON.stringify(x.statusLista)) : ABERTAS); }} />
        <span className="filtro-nivel" role="group" aria-label="Nível em que os filtros são aplicados" title="Vale para os filtros de demanda (status, etapa, responsável, tipo, prioridade, só atrasadas)">
          Aplicar filtros em
          <span className="filtro-nivel-ops">
            {NIVEIS_FILTRO.map(n => <button key={n.valor || 'todos'} type="button" aria-pressed={(f.nivel || '') === n.valor} onClick={() => mudar({ nivel: n.valor })}>{n.rotulo}</button>)}
          </span>
        </span>
      </BarraFiltros>
      {dem.erro && <p className="msg-erro">{dem.erro}</p>}
      {aguardaDemandas && !dem.erro && <p className="ajuda"><span className="giro" /> Carregando as demandas para aplicar o filtro…</p>}
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.dados && <>
        <section className="indicadores" aria-label="Projetos por fase">
          <button type="button" className={`indicador pf-card${fases.length === 0 ? ' sel' : ''}`} onClick={() => setFases([])}><small>Projetos</small><strong style={{ color: 'var(--verde)' }} data-testid="pf-total">{doGp.length}</strong></button>
          {fasesDe(ps).map(f => (
            <button key={f} type="button" className={`indicador pf-card${fases.includes(f) ? ' sel' : ''}`} aria-pressed={fases.includes(f)} onClick={() => setFases(alternar(fases, f))}>
              <small>{f}</small><strong>{doGp.filter(p => p.fase === f).length}</strong>
            </button>
          ))}
        </section>
        <div className="pf-dupla">
          <section className="cartao">
            <h2 className="secao">Projetos por GP</h2>
            <div className="pf-gp">
              {barras.map(b => (
                <button key={b.gp} type="button" aria-pressed={gpsSel.includes(b.gp)} className={`pf-gp-l${gpsSel.includes(b.gp) ? ' sel' : ''}${gpsSel.length && !gpsSel.includes(b.gp) ? ' apagado' : ''}`} onClick={() => setGps(alternar(gpsSel, b.gp))}>
                  <span className="pf-gp-nome">{b.gp}</span>
                  <span className="pf-gp-trilha"><i style={{ width: `${(b.n / max) * 100}%` }} /></span>
                  <b>{b.n}</b><small className="excecao">{b.atrasados ? `${b.atrasados} atrasado${b.atrasados > 1 ? 's' : ''}` : ''}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="cartao">
            <h2 className="secao">Riscos ativos ({c.dados.riscos.length})</h2>
            {c.dados.riscos.length
              ? <Tabela id="portfolio-riscos" nome="Riscos ativos" colunas={colRiscos} linhas={c.dados.riscos} chave={r => r.demanda_id} tamanhoInicial={10} />
              : <p className="ajuda">Nenhum plano de ação aberto.</p>}
          </section>
        </div>
        <SaldoPedidos />
        <section className="cartao"><h2 className="secao">Cronograma</h2><GanttPortfolio ps={paraGantt(lista)} hoje={c.dados.hoje} /></section>
        <section className="cartao">
          <Tabela id="portfolio" nome="Portfólio de projetos" colunas={colunas} linhas={lista} chave={p => p.id} tamanhoInicial={15} vazio="Nenhum projeto encontrado." />
        </section>
      </>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      <Popup5W2H plano={plano} aoFechar={() => setPlano(null)} aoGravar={() => { setPlano(null); ed.mudou(); }} />
    </div>
  );
}
