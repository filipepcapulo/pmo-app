// Gráfico de barras da Produtividade (F2): uma barra por dia com as horas executadas acumuladas desde o início do período,
// empilhada por tipo de OS (campo "Apontamento" da tarefa). SVG feito à mão, sem biblioteca; a regra de acumular e
// empilhar fica em api/produtividadeGrafico.ts. Passar o mouse (ou tocar) num dia mostra os valores; "Ver em tabela"
// traz os mesmos números para leitor de tela e para conferência.
import { useEffect, useMemo, useRef, useState } from 'react';
import { data, horas } from '../api/cadastros';
import { hojeIso } from '../api/projeto';
import { acumular, marcasEixo, produtividadeGrafico, type BarraGrafico } from '../api/produtividadeGrafico';
import { useCarga } from '../estado/carga';
import { useEdicao } from '../estado/edicao';

const ALT = 240, M = { cima: 18, dir: 12, baixo: 24, esq: 40 }, PASSO_MIN = 6;
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Retângulo com os cantos de cima arredondados (a ponta da barra); a base fica reta, apoiada no eixo. */
function topo(x: number, y: number, l: number, a: number, r: number) {
  const k = Math.max(0, Math.min(r, l / 2, a));
  return `M${x},${y + a}V${y + k}Q${x},${y} ${x + k},${y}H${x + l - k}Q${x + l},${y} ${x + l},${y + k}V${y + a}Z`;
}

export function GraficoHorasAcumuladas({ escritorio, de, ate, consultores }: {
  escritorio: string; de: string; ate: string;
  /** Com produtividade.ver_todos: a lista para escolher um consultor. Sem ela (undefined), o banco devolve só o próprio. */
  consultores?: { id: string; nome: string }[];
}) {
  const ed = useEdicao();
  const [consultor, setConsultor] = useState('');
  const c = useCarga(() => produtividadeGrafico.ler(escritorio, de, ate, consultor), [escritorio, de, ate, consultor, ed.geracao]);
  const g = useMemo(() => (c.dados ? acumular(c.dados, hojeIso()) : null), [c.dados]);

  const caixa = useRef<HTMLDivElement>(null);
  const [larg, setLarg] = useState(640);
  useEffect(() => {
    const el = caixa.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const o = new ResizeObserver(() => setLarg(Math.max(280, Math.floor(el.clientWidth))));
    o.observe(el);
    return () => o.disconnect();
  }, []);
  const [foco, setFoco] = useState<number | null>(null);
  useEffect(() => setFoco(null), [c.dados]);

  const n = g?.barras.length ?? 0;
  const W = Math.max(larg, M.esq + M.dir + n * PASSO_MIN), plotL = W - M.esq - M.dir, plotA = ALT - M.cima - M.baixo;
  const passo = n ? plotL / n : plotL, lb = Math.max(2, Math.min(22, passo - (passo >= 8 ? 2 : 1)));
  const marcas = marcasEixo(g?.total ?? 0), teto = marcas[marcas.length - 1] || 1;
  const y = (v: number) => M.cima + plotA - (v / teto) * plotA;
  const cada = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotL / 44))));
  const ultima = g ? g.barras.reduce((u, b, i) => (!b.futuro ? i : u), -1) : -1;
  const b: BarraGrafico | null = foco != null && g ? g.barras[foco] ?? null : null;
  const nome = consultores?.find(k => k.id === consultor)?.nome;
  const resumo = g ? `Horas executadas acumuladas de ${data(de)} a ${data(ate)}${nome ? `, ${nome}` : ''}: ${horas(g.total)} no período` +
    (g.series.length ? ` (${g.series.map(s => `${s.tipo} ${horas(s.horas)}`).join('; ')})` : '') + '. Detalhe por dia em "Ver em tabela".' : '';
  const comHoras = g ? g.barras.filter(x => x.doDia > 0) : [];

  return (
    <section className="cartao gha" aria-label="Gráfico de horas executadas acumuladas" data-testid="grafico-horas">
      <header className="gha-topo">
        <div>
          <h2>Horas executadas acumuladas</h2>
          <p className="ajuda">Por dia, somando desde {diaMes(de)}; cores = tipo de OS (campo Apontamento da tarefa).</p>
        </div>
        {consultores && consultores.length > 1 && (
          <label className="ajuda">Consultor{' '}
            <select value={consultor} onChange={e => setConsultor(e.target.value)} aria-label="Consultor do gráfico">
              <option value="">Toda a equipe</option>
              {consultores.map(k => <option key={k.id} value={k.id}>{k.nome}</option>)}
            </select>
          </label>
        )}
      </header>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      <div className="gha-caixa" ref={caixa}>
        {g && g.total > 0 && (
          <div className="gha-rolagem">
            <svg width={W} height={ALT} viewBox={`0 0 ${W} ${ALT}`} role="img" aria-label={resumo} onPointerLeave={() => setFoco(null)}>
              {marcas.map(v => (
                <g key={v}>
                  <line className={v ? 'gha-grade' : 'gha-base'} x1={M.esq} x2={W - M.dir} y1={y(v)} y2={y(v)} />
                  <text className="gha-eixo" x={M.esq - 6} y={y(v) + 4} textAnchor="end">{v.toLocaleString('pt-BR')}{v === teto ? ' h' : ''}</text>
                </g>
              ))}
              {g.barras.map((d, i) => {
                const x = M.esq + i * passo + (passo - lb) / 2;
                let base = 0;
                return (
                  <g key={d.dia} className={foco != null && foco !== i ? 'gha-apagada' : undefined}>
                    {d.fatias.map((f, j) => {
                      const y1 = y(base + f.acumulado), a = y(base) - y1, vao = j > 0 && a > 3 ? 1.5 : 0;
                      base += f.acumulado;
                      return j === d.fatias.length - 1
                        ? <path key={f.tipo} className={`gha-c${f.cor}`} d={topo(x, y1, lb, Math.max(a - vao, 0.5), 3)} />
                        : <rect key={f.tipo} className={`gha-c${f.cor}`} x={x} y={y1} width={lb} height={Math.max(a - vao, 0.5)} />;
                    })}
                    {i % cada === 0 && <text className="gha-eixo" x={M.esq + i * passo + passo / 2} y={ALT - 7} textAnchor="middle">{diaMes(d.dia)}</text>}
                    {i === ultima && <text className="gha-rotulo" x={Math.min(x + lb / 2, W - M.dir - 18)} y={y(d.acumulado) - 5} textAnchor="middle">{horas(d.acumulado)}</text>}
                    <rect className="gha-alvo" x={M.esq + i * passo} y={M.cima} width={passo} height={plotA} data-dia={d.dia}
                      onPointerEnter={() => setFoco(i)} onPointerDown={() => setFoco(i)} />
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        {b && !b.futuro && (
          <div className="gha-dica" role="status" style={{ left: `${Math.min(Math.max(((M.esq + (foco! + 0.5) * passo) / W) * 100, 22), 78)}%` }}>
            <strong>{data(b.dia)}</strong>
            <span>No dia: {horas(b.doDia)} · acumulado: <b>{horas(b.acumulado)}</b></span>
            {b.fatias.map(f => (
              <span key={f.tipo} className="gha-dica-linha"><i className={`gha-c${f.cor}`} />{f.tipo}<b>{horas(f.acumulado)}</b></span>
            ))}
          </div>
        )}
        {g && g.total === 0 && !c.carregando && <p className="ajuda gha-vazio">Nenhuma hora executada neste período.</p>}
        {c.carregando && !g && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      </div>
      {g && g.series.length > 0 && (
        <>
          <ul className="gha-legenda" aria-label="Tipos de OS">
            {g.series.map(s => (
              <li key={s.tipo}><i className={`gha-c${s.cor}`} />{s.tipo} <b>{horas(s.horas)}</b>
                <small>{g.total ? Math.round((s.horas / g.total) * 100) : 0}%</small></li>
            ))}
          </ul>
          <details className="gha-tabela">
            <summary>Ver em tabela</summary>
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead><tr><th>Dia</th>{g.series.map(s => <th key={s.tipo} className="dir">{s.tipo}</th>)}<th className="dir">No dia</th><th className="dir">Acumulado</th></tr></thead>
                <tbody>
                  {comHoras.map(d => (
                    <tr key={d.dia}><td>{data(d.dia)}</td>
                      {g.series.map(s => <td key={s.tipo} className="dir">{horas(d.fatias.find(f => f.tipo === s.tipo)?.doDia ?? 0)}</td>)}
                      <td className="dir">{horas(d.doDia)}</td><td className="dir"><strong>{horas(d.acumulado)}</strong></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
