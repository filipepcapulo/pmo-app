// Fechamento de produtividade › Indicadores: horas produtivas, de apoio comercial e internas por consultor e por
// período de fechamento (21–20), sempre com as horas CONSIDERADAS (com ajustes), e o custo pelo valor hora do
// consultor (sem o mínimo). Vem do "Produtividade SK" (tela Indicadores). Papéis dono e fechamento do cofre.
import { useMemo, useState } from 'react';
import { CATS, fech, hm, pct, planilhaIndicadores, resumoIndicadores, ROTULO_CAT, type Cat, type Periodo } from '../api/fechamentoFin';
import { reais } from '../api/financeiro';
import { useCarga } from '../estado/carga';
import { baixarXlsx } from '../util/xlsx';
import { Botao } from './Botao';
import { textoSelecao } from '../util/selecao';
import { SelecaoMultipla } from './SelecaoMultipla';

const COR: Record<Cat, string> = { prod: 'gha-c0', com: 'gha-c1', int: 'gha-c2' };
const TITULO: Record<Cat, string> = { prod: 'Horas produtivas', com: 'Horas de apoio comercial', int: 'Horas internas' };
const AJUDA: Record<Cat, string> = { prod: 'Atendimento a clientes', com: 'Pré-venda', int: 'Atividades internas' };

function Barras({ titulo, itens, valor, formato }: {
  titulo: string; itens: { key: number; label: string; min: Record<Cat, number>; valor: Record<Cat, number> }[]; valor: boolean; formato: (n: number) => string;
}) {
  const [ligadas, setLigadas] = useState<Record<Cat, boolean>>({ prod: true, com: true, int: true });
  const de = (p: (typeof itens)[number], c: Cat) => (ligadas[c] ? (valor ? p.valor[c] : p.min[c]) : 0);
  const totais = itens.map(p => CATS.reduce((a, c) => a + de(p, c), 0));
  const max = Math.max(1, ...totais), soma = totais.reduce((a, b) => a + b, 0);
  const alternar = (c: Cat) => { const n = { ...ligadas, [c]: !ligadas[c] }; if (CATS.some(x => n[x])) setLigadas(n); };
  return (
    <section className="cartao ind-grafico">
      <div className="gha-topo"><div><h2 className="secao">{titulo}</h2>
        <p className="ajuda">{formato(soma)} no intervalo · média {formato(itens.length ? soma / itens.length : 0)} por período</p></div>
        <ul className="gha-legenda">{CATS.map(c => (
          <li key={c}><label className="fin-marcar"><input type="checkbox" checked={ligadas[c]} onChange={() => alternar(c)} /><i className={COR[c]} /> {ROTULO_CAT[c]}</label></li>))}</ul>
      </div>
      <div className="ind-colunas" role="img" aria-label={`${titulo}: ${itens.map((p, i) => `${p.label} ${formato(totais[i])}`).join('; ')}`}>
        {itens.map((p, i) => (
          <div key={p.key} className="ind-coluna" title={`${p.label}\n${CATS.filter(c => ligadas[c]).map(c => `${ROTULO_CAT[c]}: ${formato(de(p, c))}`).join('\n')}\nTotal: ${formato(totais[i])}`}>
            <small>{totais[i] ? formato(totais[i]) : ''}</small>
            <div className="ind-pilha" style={{ height: `${Math.round(totais[i] / max * 100)}%` }}>
              {CATS.filter(c => de(p, c) > 0).map(c => <i key={c} className={COR[c]} style={{ flexGrow: de(p, c) }} />)}
            </div>
            <span>{p.label}</span>
          </div>))}
      </div>
    </section>
  );
}

export function FechamentoIndicadores({ esc, periodos, oculto }: { esc: string; periodos: Periodo[]; oculto: boolean }) {
  // `periodos` vem do mais recente para o mais antigo; o padrão são os 12 últimos já encerrados
  const [ate, setAte] = useState(periodos[Math.min(1, periodos.length - 1)].key);
  const [de, setDe] = useState(periodos[Math.min(12, periodos.length - 1)].key);
  const [consultor, setConsultor] = useState<string[]>([]);
  const c = useCarga(() => fech.indicadores(esc, Math.min(de, ate), Math.max(de, ate)), [esc, de, ate]);
  const d = c.dados;
  const r = useMemo(() => (d ? resumoIndicadores(d, consultor) : null), [d, consultor]);
  const ultimos = (n: number) => { setAte(periodos[1]?.key ?? periodos[0].key); setDe(periodos[Math.min(n, periodos.length - 1)].key); };
  const horas = (min: number) => hm(min);
  const dinheiro = (v: number) => reais(v, oculto);
  return (
    <>
      <div className="barra-filtros">
        <label className="periodo">De
          <select aria-label="De" value={de} onChange={e => setDe(Number(e.target.value))}>{periodos.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
        <label className="periodo">Até
          <select aria-label="Até" value={ate} onChange={e => setAte(Number(e.target.value))}>{periodos.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
        <SelecaoMultipla ocultar rotulo="Consultor" opcoes={(d?.consultores ?? []).map(x => ({ valor: x.id, rotulo: x.nome }))} sel={consultor} aoMudar={setConsultor} />
        <span className="chips">
          {[[1, 'Último'], [3, 'Últimos 3'], [6, 'Últimos 6'], [12, 'Últimos 12']].map(([n, t]) => (
            <button key={n} type="button" className="chip" onClick={() => ultimos(n as number)}>{t}</button>))}
        </span>
        <span className="a-esquerda" />
        <Botao disabled={oculto || !d} title={oculto ? 'Mostre os valores para exportar' : undefined} onClick={() => d && baixarXlsx('Indicadores de produtividade', planilhaIndicadores(d, consultor))}>Excel</Botao>
      </div>
      {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
      {!d && !c.erro && <div className="carregando-tela"><span className="giro" /> Calculando os períodos…</div>}
      {d && r && <>
        <p className="ajuda">{d.periodos[0]?.label} a {d.periodos[d.periodos.length - 1]?.label} · {textoSelecao(consultor, id => d.consultores.find(x => x.id === id)?.nome ?? id) || 'todos os consultores'} · horas consideradas (com ajustes).
          {d.ilegiveis > 0 && <> {d.ilegiveis} registro(s) do cofre não puderam ser decifrados e ficaram de fora.</>}</p>
        <div className="ind-cartoes">
          {CATS.map(cat => {
            const lista = r.ranking.filter(x => x[cat] > 0).sort((a, b) => b[cat] - a[cat]), max = Math.max(1, ...lista.map(x => x[cat]));
            return (
              <section key={cat} className="cartao" data-testid={`ind-${cat}`}>
                <div className="ind-cartao-topo"><div><h2 className="secao"><i className={`ind-ponto ${COR[cat]}`} /> {TITULO[cat]}</h2><p className="ajuda">{AJUDA[cat]}</p></div>
                  <div className="dir"><strong className="ind-numero">{horas(r.cat[cat].min)}</strong><br /><small className="ajuda">{pct(r.total ? r.cat[cat].min / r.total : null)} do total · {r.cat[cat].n} lançamento(s)</small></div></div>
                <ul className="ind-barras">{lista.map(x => (
                  <li key={x.id} title={`${x.nome}: ${horas(x[cat])}`}><span>{x.nome}</span>
                    <div><i className={COR[cat]} style={{ width: `${Math.max(1, Math.round(x[cat] / max * 100))}%` }} /></div><b>{horas(x[cat])}</b></li>))}
                  {lista.length === 0 && <li className="ajuda">Sem horas nesta categoria.</li>}
                </ul>
              </section>);
          })}
        </div>
        <section className="cartao">
          <h2 className="secao">Ranking de produtividade por consultor</h2>
          <div className="tabela-caixa fech-rolagem"><table className="tabela fech-tabela" aria-label="Ranking de produtividade">
            <thead><tr><th>#</th><th>Consultor</th><th className="dir">Produtivas</th><th className="dir">% produt.</th><th className="dir">Total</th><th>Composição</th></tr></thead>
            <tbody>{r.ranking.map((x, i) => (
              <tr key={x.id}>
                <td>{i + 1}</td><td><strong>{x.nome}</strong></td><td className="dir">{horas(x.prod)}</td><td className="dir">{pct(x.total ? x.prod / x.total : null)}</td><td className="dir">{horas(x.total)}</td>
                <td><div className="ind-composicao" title={CATS.map(cat => `${ROTULO_CAT[cat]}: ${horas(x[cat])}`).join(' · ')}>
                  {CATS.filter(cat => x[cat] > 0).map(cat => <i key={cat} className={COR[cat]} style={{ flexGrow: x[cat] }} />)}</div></td>
              </tr>))}
              {r.ranking.length === 0 && <tr><td colSpan={6} className="ajuda">Nenhuma hora no intervalo.</td></tr>}
            </tbody>
          </table></div>
          <ul className="gha-legenda">{CATS.map(cat => <li key={cat}><i className={COR[cat]} /> {ROTULO_CAT[cat]}</li>)}</ul>
        </section>
        <Barras titulo="Total de horas por período" itens={r.porPeriodo} valor={false} formato={horas} />
        {oculto ? <p className="ajuda">O custo por período aparece com <strong>Mostrar valores</strong>.</p>
          : <Barras titulo="Custo por período (valor hora do consultor, sem o mínimo)" itens={r.porPeriodo} valor formato={dinheiro} />}
        <p className="ajuda">Categoria: OS é produtiva (serviço que começa com "GER-" é interna); planilha e apontamento do app seguem o cliente — "Comercial" é apoio comercial; Interno, SK, BPMS, Treinamento, Célula e afins são internas.</p>
      </>}
    </>
  );
}
