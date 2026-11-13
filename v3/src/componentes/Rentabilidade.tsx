// Aba "Rentabilidade" das fichas de Cliente, Projeto e Demanda (F5): receita × custo × margem, calculados na Edge
// Function `financeiro`. Só é montada para quem tem o papel Dono ou Rentabilidade no cofre (Admin e GP não herdam); o
// banco confere de novo e registra cada consulta. Os valores começam ocultos (botão Mostrar valores).
import { useState } from 'react';
import { data, horas } from '../api/cadastros';
import { reais } from '../api/financeiro';
import { faixaMargem, horasDe, pctMargem, renta, ROTULO_GRUPO, type Indicadores, type TipoAlvo } from '../api/rentabilidade';
import { useCarga } from '../estado/carga';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';

const semAcesso = (erro: string | null) => !!erro && /autorizados do Financeiro/.test(erro);

function Margem({ i, oculto }: { i: Indicadores; oculto: boolean }) {
  if (i.margem === null) return <>—</>;
  return <span className={oculto ? undefined : `renta-${faixaMargem(i)}`}>{reais(i.margem, oculto)} <small>({pctMargem(i.margem_pct, oculto)})</small></span>;
}

export function Rentabilidade({ tipo, id, geracao }: { tipo: TipoAlvo; id: string; geracao?: unknown }) {
  const esc = useSessao().eu!.escritorio_id!;
  const [oculto, setOculto] = useState(true);
  const c = useCarga(() => renta.ler(esc, tipo, id), [esc, tipo, id, geracao]);
  if (semAcesso(c.erro)) return <section className="cartao"><p className="ajuda">A rentabilidade é só para quem tem o papel Dono ou Rentabilidade no cofre financeiro.</p></section>;
  if (c.erro) return <section className="cartao"><p className="msg-erro" role="alert">{c.erro}</p></section>;
  const d = c.dados;
  if (!d) return <div className="carregando-tela"><span className="giro" /> Calculando…</div>;
  const t = d.total, demanda = tipo === 'demanda';
  return (
    <div className="renta" data-testid="rentabilidade">
      <section className="cartao">
        <div className="pagina-topo">
          <div><h2 className="secao">Rentabilidade</h2>
            <p className="ajuda">{demanda
              ? 'Receita = horas executadas × valor/hora médio dos pedidos do projeto. Custo = horas executadas × remuneração vigente na data.'
              : 'Receita = horas dos pedidos × valor/hora vendido. Custo = horas executadas × remuneração vigente na data. A margem compara as horas já executadas.'} Cada consulta fica registrada no cofre.</p></div>
          <Botao onClick={() => setOculto(!oculto)} aria-pressed={!oculto}>{oculto ? 'Mostrar valores' : 'Ocultar valores'}</Botao>
        </div>
        <div className="indicadores" aria-label="Indicadores de rentabilidade">
          {!demanda && <div className="indicador"><small>Receita contratada{t.horas_pedidos !== null ? ` · ${horas(t.horas_pedidos)}` : ''}</small><strong data-testid="renta-receita">{reais(t.receita, oculto)}</strong></div>}
          <div className="indicador"><small>Receita das horas executadas · {horasDe(t.min)}</small><strong data-testid="renta-receita-exec">{reais(t.receita_exec, oculto)}</strong></div>
          <div className="indicador"><small>Custo das horas executadas</small><strong data-testid="renta-custo">{reais(t.custo, oculto)}</strong></div>
          <div className="indicador"><small>Margem</small><strong data-testid="renta-margem"><Margem i={t} oculto={oculto} /></strong></div>
          {!demanda && <div className="indicador"><small>Sobra do contrato (receita − custo)</small><strong data-testid="renta-sobra">{reais(t.sobra, oculto)}</strong></div>}
          <div className="indicador"><small>Valor/hora médio vendido · custo/hora</small><strong className="renta-menor">{reais(t.vh_medio, oculto)} · {reais(t.custo_hora, oculto)}</strong></div>
        </div>
        {oculto && <p className="ajuda">Os valores estão ocultos. Use <strong>Mostrar valores</strong> quando estiver em um lugar reservado.</p>}
        {d.pendencias.length > 0 && <div className="fech-alerta" role="status"><strong>Atenção:</strong><ul>{d.pendencias.map(p => <li key={p}>{p}</li>)}</ul></div>}
      </section>

      {d.grupos.length > 0 && (
        <section className="cartao">
          <h2 className="secao">Por {ROTULO_GRUPO[tipo].toLowerCase()}</h2>
          <div className="tabela-caixa fech-rolagem"><table className="tabela fech-tabela" aria-label={`Rentabilidade por ${ROTULO_GRUPO[tipo].toLowerCase()}`}>
            <thead><tr><th>{ROTULO_GRUPO[tipo]}</th>{tipo === 'cliente' && <><th className="dir">Contratadas</th><th className="dir">Receita contratada</th></>}
              <th className="dir">Executadas</th><th className="dir">Receita executada</th><th className="dir">Custo</th><th className="dir">Margem</th></tr></thead>
            <tbody>{d.grupos.map(g => (
              <tr key={g.id}>
                <td><a href={hashDe(caminhoEntidade(g.tipo, g.id))}>{g.nome}</a>
                  {g.pedidos_sem_valor > 0 && <> <span className="pilula pilula-neutra" title="Pedido de horas sem valor/hora informado">sem valor</span></>}
                  {g.min_sem_custo > 0 && <> <span className="pilula pilula-neutra" title="Horas executadas sem período de remuneração vigente na data">sem custo</span></>}</td>
                {tipo === 'cliente' && <><td className="dir">{horas(g.horas_pedidos)}</td><td className="dir">{reais(g.receita, oculto)}</td></>}
                <td className="dir">{horasDe(g.min)}</td><td className="dir">{reais(g.receita_exec, oculto)}</td><td className="dir">{reais(g.custo, oculto)}</td>
                <td className="dir"><Margem i={g} oculto={oculto} /></td>
              </tr>))}</tbody>
            <tfoot><tr><td><strong>Total</strong></td>{tipo === 'cliente' && <><td className="dir">{horas(t.horas_pedidos)}</td><td className="dir">{reais(t.receita, oculto)}</td></>}
              <td className="dir">{horasDe(t.min)}</td><td className="dir">{reais(t.receita_exec, oculto)}</td><td className="dir">{reais(t.custo, oculto)}</td>
              <td className="dir"><strong><Margem i={t} oculto={oculto} /></strong></td></tr></tfoot>
          </table></div>
        </section>
      )}

      {d.pedidos.length > 0 && (
        <section className="cartao">
          <h2 className="secao">Pedidos de horas</h2>
          {tipo === 'projeto'
            ? <p className="ajuda">O valor/hora é informado no pedido, em Horas › Pedidos de horas.</p>
            : <p className="ajuda">O valor/hora é informado no pedido, na aba Horas do projeto.</p>}
          <div className="tabela-caixa fech-rolagem"><table className="tabela fech-tabela" aria-label="Pedidos de horas com valor">
            <thead><tr><th>Nº do pedido</th><th>Data</th><th className="dir">Horas</th><th className="dir">Valor/hora</th><th className="dir">Total</th></tr></thead>
            <tbody>{d.pedidos.map(p => (
              <tr key={p.id}><td>{p.numero}</td><td>{data(p.data)}</td><td className="dir">{horas(p.horas)}</td>
                <td className="dir">{p.valor_hora === null ? <span className="pilula pilula-neutra">sem valor</span> : reais(p.valor_hora, oculto)}</td>
                <td className="dir">{reais(p.total, oculto)}</td></tr>))}</tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}
