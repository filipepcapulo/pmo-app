// Portfólio de projetos (#/portfolio, V11a): como o módulo do 2.x — cartões por fase e gráfico por GP (tocar filtra),
// Gantt dos projetos com o Go Live (losango; vermelho = vencido em aberto, barra laranja = etapa vencida), grade e riscos.
import { useMemo, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { diaNum } from '../api/projeto';
import { fasesDe, filtrar, janelaGantt, porGp, portfolio, SEM_GP, type ProjetoPortfolio, type RiscoPortfolio } from '../api/portfolio';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const COR_NIVEL = { critico: 'var(--vermelho)', alto: 'var(--laranja)', moderado: 'var(--texto-2)' };
const ROT_NIVEL = { critico: 'Crítico', alto: 'Alto', moderado: 'Moderado' };
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
  const [fase, setFase] = useState('');
  const [gp, setGp] = useState('');
  const [texto, setTexto] = useState('');
  const ps = c.dados?.projetos ?? [];
  const doGp = useMemo(() => filtrar(ps, { gp }), [ps, gp]);
  const daFase = useMemo(() => filtrar(ps, { fase }), [ps, fase]);
  const lista = useMemo(() => filtrar(ps, { fase, gp, texto }), [ps, fase, gp, texto]);
  const barras = porGp(daFase), max = Math.max(1, ...barras.map(b => b.n));
  const colunas = useMemo<Coluna<ProjetoPortfolio>[]>(() => [
    { chave: 'cliente', titulo: 'Cliente' },
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
  ], []);
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
      <header className="pagina-topo"><div><h1>Portfólio de projetos</h1><p className="ajuda">Projetos ativos por fase e GP, Go Live, atraso, horas e riscos ativos. Toque num cartão ou numa barra para filtrar.</p></div></header>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.dados && <>
        <section className="indicadores" aria-label="Projetos por fase">
          <button type="button" className={`indicador pf-card${fase === '' ? ' sel' : ''}`} onClick={() => setFase('')}><small>Projetos</small><strong style={{ color: 'var(--verde)' }} data-testid="pf-total">{doGp.length}</strong></button>
          {fasesDe(ps).map(f => (
            <button key={f} type="button" className={`indicador pf-card${fase === f ? ' sel' : ''}`} aria-pressed={fase === f} onClick={() => setFase(fase === f ? '' : f)}>
              <small>{f}</small><strong>{doGp.filter(p => p.fase === f).length}</strong>
            </button>
          ))}
        </section>
        <div className="pf-dupla">
          <section className="cartao">
            <h2 className="secao">Projetos por GP</h2>
            <div className="pf-gp">
              {barras.map(b => (
                <button key={b.gp} type="button" className={`pf-gp-l${gp === b.gp ? ' sel' : ''}${gp && gp !== b.gp ? ' apagado' : ''}`} onClick={() => setGp(gp === b.gp ? '' : b.gp)}>
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
        <div className="barra-filtros">
          <input type="search" placeholder="Buscar projeto, cliente, GP ou fase" value={texto} onChange={e => setTexto(e.target.value)} aria-label="Buscar projeto" />
          {(fase || gp || texto) && <button type="button" className="link" onClick={() => { setFase(''); setGp(''); setTexto(''); }}>Limpar filtros</button>}
        </div>
        <section className="cartao"><h2 className="secao">Cronograma</h2><GanttPortfolio ps={lista} hoje={c.dados.hoje} /></section>
        <section className="cartao">
          <Tabela id="portfolio" nome="Portfólio de projetos" colunas={colunas} linhas={lista} chave={p => p.id} tamanhoInicial={15} vazio="Nenhum projeto encontrado." />
        </section>
      </>}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
    </div>
  );
}
