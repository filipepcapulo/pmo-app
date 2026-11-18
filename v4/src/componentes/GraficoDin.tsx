// Gráfico dos painéis dinâmicos (barras agrupadas ou linhas), em SVG, sem biblioteca. Um eixo só; até 8 séries em ordem
// fixa de cor (a 9ª em diante chega aqui já somada em "Outros"); legenda com 2+ séries; dica ao passar o mouse; e a
// visão em tabela, que é o caminho para quem não distingue as cores.
import { useState } from 'react';
import { fmt, type DadosGrafico } from '../api/paineis';

const L = 720, A = 260, M = { e: 46, d: 12, c: 12, b: 34 };

/** Passo "redondo" para ~4 marcas no eixo Y. */
export function passoEixo(maximo: number): number {
  if (maximo <= 0) return 1;
  const bruto = maximo / 4, pot = 10 ** Math.floor(Math.log10(bruto)), f = bruto / pot;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pot;
}

export function GraficoDin({ dados, tipo, rotuloY, comLegenda }: { dados: DadosGrafico; tipo: 'barras' | 'linhas'; rotuloY: string; comLegenda: boolean }) {
  const [foco, setFoco] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const { categorias, series } = dados;
  if (!categorias.length) return <p className="ajuda">Sem dados para este gráfico com os filtros e o período escolhidos.</p>;
  const passo = passoEixo(dados.maximo), topo = Math.max(passo, Math.ceil(dados.maximo / passo) * passo);
  const larg = L - M.e - M.d, alt = A - M.c - M.b, banda = larg / categorias.length;
  const y = (v: number) => M.c + alt - (v / topo) * alt;
  const cx = (i: number) => M.e + banda * (i + 0.5);
  const marcas = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo);
  const cada = Math.max(1, Math.ceil(categorias.length / Math.max(1, Math.floor(larg / 62))));
  // barras: no máximo 24px cada, 2px de respiro entre vizinhas; o que sobra da banda fica de ar
  const nb = Math.max(1, series.length), lb = Math.max(2, Math.min(24, (banda * 0.8 - 2 * (nb - 1)) / nb)), grupo = lb * nb + 2 * (nb - 1);
  const nomeSerie = (s: string) => s || rotuloY;
  return (
    <div className="gd">
      <div className="gd-topo">
        {comLegenda && series.length > 1
          ? <ul className="gd-legenda" aria-label="Séries">{series.map((s, i) => <li key={s.nome}><span className={`gd-cor gd-s${i + 1}`} />{nomeSerie(s.nome)}</li>)}</ul>
          : <span className="ajuda">{rotuloY}</span>}
        <button type="button" className="link" onClick={() => setTabela(v => !v)} aria-pressed={tabela}>{tabela ? 'Ver gráfico' : 'Ver tabela'}</button>
      </div>
      {tabela ? (
        <div className="tabela-rolagem">
          <table className="tabela gd-tabela">
            <thead><tr><th> </th>{series.map(s => <th key={s.nome} className="num">{nomeSerie(s.nome)}</th>)}</tr></thead>
            <tbody>{categorias.map((c, i) => <tr key={c.chave}><th scope="row">{c.rotulo}</th>{series.map(s => <td key={s.nome} className="num">{fmt(s.valores[i])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="gd-area" onMouseLeave={() => setFoco(null)}>
          <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={`${rotuloY} — ${categorias.length} pontos, ${series.length} série(s). Use "Ver tabela" para os valores.`}>
            {marcas.map(v => <g key={v}><line className="gd-grade" x1={M.e} x2={L - M.d} y1={y(v)} y2={y(v)} /><text className="gd-eixo" x={M.e - 6} y={y(v) + 4} textAnchor="end">{fmt(v)}</text></g>)}
            {categorias.map((c, i) => i % cada === 0 && <text key={c.chave} className="gd-eixo" x={cx(i)} y={A - M.b + 16} textAnchor="middle">{c.rotulo.length > 12 ? c.rotulo.slice(0, 11) + '…' : c.rotulo}</text>)}
            {foco !== null && <rect className="gd-foco" x={M.e + banda * foco} y={M.c} width={banda} height={alt} />}
            {tipo === 'barras'
              ? series.map((s, si) => s.valores.map((v, i) => {
                if (v <= 0) return null;
                const x = cx(i) - grupo / 2 + si * (lb + 2), h = Math.max(1, M.c + alt - y(v)), r = Math.min(4, lb / 2, h);
                return <path key={`${si}-${i}`} className={`gd-s${si + 1}`} d={`M${x},${y(0)} v${-(h - r)} q0,${-r} ${r},${-r} h${lb - 2 * r} q${r},0 ${r},${r} v${h - r} z`} />;
              }))
              : series.map((s, si) => (
                <g key={s.nome}>
                  <polyline className={`gd-linha gd-s${si + 1}`} points={s.valores.map((v, i) => `${cx(i)},${y(v)}`).join(' ')} />
                  {(categorias.length <= 40 || foco !== null) && s.valores.map((v, i) => (categorias.length <= 40 || i === foco)
                    && <circle key={i} className={`gd-ponto gd-s${si + 1}`} cx={cx(i)} cy={y(v)} r={i === foco ? 5 : 4} />)}
                </g>
              ))}
            <line className="gd-base" x1={M.e} x2={L - M.d} y1={y(0)} y2={y(0)} />
            {categorias.map((c, i) => <rect key={c.chave} className="gd-alvo" x={M.e + banda * i} y={M.c} width={banda} height={alt + M.b}
              tabIndex={0} aria-label={`${c.rotulo}: ${series.map(s => `${nomeSerie(s.nome)} ${fmt(s.valores[i])}`).join('; ')}`}
              onMouseEnter={() => setFoco(i)} onFocus={() => setFoco(i)} onBlur={() => setFoco(null)} />)}
          </svg>
          {foco !== null && (
            <div className="gd-dica" role="status" style={{ left: `${(cx(foco) / L) * 100}%` }} data-lado={foco > categorias.length / 2 ? 'esq' : 'dir'}>
              <strong>{categorias[foco].rotulo}</strong>
              {series.map((s, i) => <span key={s.nome}><span className={`gd-cor gd-s${i + 1}`} />{nomeSerie(s.nome)} <b>{fmt(s.valores[foco])}</b></span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
