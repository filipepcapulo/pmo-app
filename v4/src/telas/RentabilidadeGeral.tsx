// Relatórios › Rentabilidade geral (#/rentabilidade-geral, V4 0091): faturado × custo de todo o escritório num intervalo,
// em uma tela só — por período, por cliente, por projeto e por consultor. Clicar em uma barra ou linha desce para o nível
// de baixo (a escolha vira um item da trilha e todos os gráficos passam a mostrar só aquele recorte). Só para os papéis
// Dono e Rentabilidade do cofre; os valores começam ocultos e cada consulta fica registrada no cofre.
import { useEffect, useMemo, useState } from 'react';
import { reais } from '../api/financeiro';
import { faixaMargem, horasDe, pctMargem } from '../api/rentabilidade';
import {
  agrupar, aplicarFiltro, filtrar, intervaloPadrao, nomeDe, planilhaGeral, proximoNivel, rentaGeral, ROTULO_DIMENSAO, somar,
  type Agrupamento, type Dimensao, type FiltroGeral, type Grupo, type Soma,
} from '../api/rentabilidadeGeral';
import { hojeIso } from '../api/projeto';
import { Botao } from '../componentes/Botao';
import { useCarga } from '../estado/carga';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { baixarXlsx } from '../util/xlsx';

const semAcesso = (erro: string | null) => !!erro && /autorizados do Financeiro/.test(erro);
const ORDEM_TRILHA: Dimensao[] = ['cliente', 'projeto', 'consultor', 'tempo'];
const LIMITE = 8;

function Margem({ g, oculto }: { g: Soma; oculto: boolean }) {
  if (!g.faturado && !g.custo) return <>—</>;
  const i = { margem: g.faturado ? g.margem : null, margem_pct: g.margem_pct };
  if (i.margem === null) return <span title="Sem valor/hora vendido: não há faturado para comparar">sem faturado</span>;
  return <span className={oculto ? undefined : `renta-${faixaMargem(i)}`}>{reais(g.margem, oculto)} <small>({pctMargem(g.margem_pct, oculto)})</small></span>;
}

const Legenda = () => (
  <ul className="gha-legenda rg-legenda"><li><i className="gha-c0" /> Faturado</li><li><i className="gha-c1" /> Custo</li></ul>
);

/** Colunas faturado × custo por período; clicar numa coluna filtra o período. */
function GraficoPeriodo({ grupos, escolhido, aoEscolher }: { grupos: Grupo[]; escolhido?: string; aoEscolher: (id: string) => void }) {
  const max = Math.max(1, ...grupos.flatMap(g => [g.faturado, g.custo]));
  return (
    <div className="rg-colunas" role="group" aria-label="Faturado e custo por período">
      {grupos.map(g => (
        <button key={g.id} type="button" className={`rg-coluna${escolhido === g.id ? ' escolhido' : ''}`} aria-pressed={escolhido === g.id} onClick={() => aoEscolher(g.id)}
          title={`${g.nome}\nFaturado: ${reais(g.faturado)}\nCusto: ${reais(g.custo)}\nMargem: ${reais(g.margem)} (${pctMargem(g.margem_pct)})\n${horasDe(g.min)}`}
          aria-label={`${g.nome}: faturado ${reais(g.faturado)}, custo ${reais(g.custo)}, margem ${pctMargem(g.margem_pct)}`}>
          <small className={`renta-${faixaMargem({ margem: g.faturado ? g.margem : null, margem_pct: g.margem_pct })}`}>{g.faturado ? pctMargem(g.margem_pct) : ''}</small>
          <span className="rg-par">
            <i className="gha-c0" style={{ height: `${Math.round(g.faturado / max * 100)}%` }} />
            <i className="gha-c1" style={{ height: `${Math.round(g.custo / max * 100)}%` }} />
          </span>
          <span className="rg-rotulo">{g.nome}</span>
        </button>))}
    </div>
  );
}

/** Barras horizontais faturado × custo de uma dimensão; clicar numa linha desce de nível. */
function GraficoDimensao({ dim, grupos, escolhido, aoEscolher }: { dim: Dimensao; grupos: Grupo[]; escolhido?: string; aoEscolher: (id: string) => void }) {
  const [todos, setTodos] = useState(false);
  const max = Math.max(1, ...grupos.flatMap(g => [g.faturado, g.custo]));
  const mostrados = todos ? grupos : grupos.slice(0, LIMITE);
  return (
    <section className="cartao rg-cartao" data-testid={`rg-${dim}`}>
      <div className="gha-topo"><h2 className="secao">Por {ROTULO_DIMENSAO[dim].toLowerCase()}</h2><small className="ajuda">{grupos.length} no recorte</small></div>
      {grupos.length === 0 ? <p className="ajuda">Sem horas no recorte.</p> : (
        <ul className="rg-linhas">
          {mostrados.map(g => (
            <li key={g.id}>
              <button type="button" className={`rg-linha${escolhido === g.id ? ' escolhido' : ''}`} aria-pressed={escolhido === g.id} onClick={() => aoEscolher(g.id)}
                title={`${g.nome}\nFaturado: ${reais(g.faturado)}\nCusto: ${reais(g.custo)}\nMargem: ${reais(g.margem)} (${pctMargem(g.margem_pct)})\n${horasDe(g.min)}`}>
                <span className="rg-nome">{g.nome}</span>
                <span className="rg-barras">
                  <i className="gha-c0" style={{ width: `${g.faturado ? Math.max(1, Math.round(g.faturado / max * 100)) : 0}%` }} />
                  <i className="gha-c1" style={{ width: `${g.custo ? Math.max(1, Math.round(g.custo / max * 100)) : 0}%` }} />
                </span>
                <span className="rg-num"><b>{reais(g.faturado)}</b>
                  <small className={`renta-${faixaMargem({ margem: g.faturado ? g.margem : null, margem_pct: g.margem_pct })}`}>{g.faturado ? pctMargem(g.margem_pct) : 'sem faturado'}</small></span>
              </button>
            </li>))}
        </ul>
      )}
      {grupos.length > LIMITE && <button type="button" className="link" onClick={() => setTodos(!todos)}>{todos ? `Mostrar só os ${LIMITE} maiores` : `Ver todos (${grupos.length})`}</button>}
    </section>
  );
}

export function RentabilidadeGeral() {
  const esc = useSessao().eu!.escritorio_id!;
  const hoje = hojeIso();
  const [intervalo, setIntervalo] = useState(() => intervaloPadrao(hoje));
  const [campos, setCampos] = useState(intervalo);
  const [ag, setAg] = useState<Agrupamento>('mes');
  const [f, setF] = useState<FiltroGeral>({});
  const [oculto, setOculto] = useState(true);
  const [detalhe, setDetalhe] = useState<Dimensao | null>(null);   // null = segue o nível de baixo da trilha
  const c = useCarga(() => rentaGeral.ler(esc, intervalo.ini, intervalo.fim), [esc, intervalo.ini, intervalo.fim]);
  const d = c.dados;

  // mudou o intervalo: itens da trilha que não existem mais no resultado saem
  useEffect(() => {
    if (!d) return;
    setF(a => {
      const n: FiltroGeral = { ...a };
      if (n.cliente && !d.clientes.some(x => x.id === n.cliente)) delete n.cliente;
      if (n.projeto && !d.projetos.some(x => x.id === n.projeto)) delete n.projeto;
      if (n.consultor && !d.pessoas.some(x => x.id === n.consultor)) delete n.consultor;
      if (n.tempo && !d.celulas.some(x => (ag === 'mes' ? x.mes : String(x.periodo)) === n.tempo)) delete n.tempo;
      return Object.keys(n).length === Object.keys(a).length ? a : n;
    });
  }, [d, ag]);

  const recorte = useMemo(() => (d ? filtrar(d.celulas, f, ag) : []), [d, f, ag]);
  const total = useMemo(() => somar(recorte), [recorte]);
  // cada gráfico mostra o recorte SEM o filtro da própria dimensão: o item escolhido aparece destacado entre os irmãos
  const de = (dim: Dimensao) => { if (!d) return []; const { [dim]: _fora, ...resto } = f; return agrupar(d, filtrar(d.celulas, resto, ag), dim, ag); };
  const porTempo = useMemo(() => de('tempo'), [d, f, ag]);       // eslint-disable-line react-hooks/exhaustive-deps
  const porCliente = useMemo(() => de('cliente'), [d, f, ag]);   // eslint-disable-line react-hooks/exhaustive-deps
  const porProjeto = useMemo(() => de('projeto'), [d, f, ag]);   // eslint-disable-line react-hooks/exhaustive-deps
  const porConsultor = useMemo(() => de('consultor'), [d, f, ag]); // eslint-disable-line react-hooks/exhaustive-deps
  const dimDetalhe = detalhe ?? proximoNivel(f);
  const linhasDetalhe = useMemo(() => (d ? agrupar(d, recorte, dimDetalhe, ag) : []), [d, recorte, dimDetalhe, ag]);

  const escolher = (dim: Dimensao, id: string) => { if (d) { setF(a => aplicarFiltro(d, a, dim, id)); setDetalhe(null); } };
  const trocarAgrupamento = (novo: Agrupamento) => { setAg(novo); setF(a => { const { tempo: _t, ...resto } = a; return resto; }); };
  const aplicar = (i: { ini: string; fim: string }) => { if (i.ini && i.fim && i.ini <= i.fim) { setCampos(i); setIntervalo(i); } };
  const ultimos = (meses: number) => aplicar(intervaloPadrao(hoje, meses));
  const trilha = ORDEM_TRILHA.filter(dim => f[dim]);

  if (semAcesso(c.erro)) {
    return <div className="vazio-tela"><h2>Sem acesso</h2><p>A rentabilidade geral é só para quem tem o papel Dono ou Rentabilidade no cofre financeiro.</p></div>;
  }
  return (
    <div className="pagina rg" data-testid="rentabilidade-geral">
      <header className="pagina-topo">
        <div><h1>Rentabilidade geral</h1>
          <p className="ajuda">Faturado = horas executadas × valor/hora médio vendido do projeto. Custo = horas executadas × remuneração vigente na data. Clique em uma barra para descer de nível. Cada consulta fica registrada no cofre.</p></div>
        <Botao onClick={() => setOculto(!oculto)} aria-pressed={!oculto}>{oculto ? 'Mostrar valores' : 'Ocultar valores'}</Botao>
      </header>

      <div className="barra-filtros">
        <label className="periodo">De <input type="date" aria-label="De" value={campos.ini} max={campos.fim} onChange={e => setCampos({ ...campos, ini: e.target.value })} onBlur={() => aplicar(campos)} /></label>
        <label className="periodo">Até <input type="date" aria-label="Até" value={campos.fim} min={campos.ini} onChange={e => setCampos({ ...campos, fim: e.target.value })} onBlur={() => aplicar(campos)} /></label>
        <span className="chips">
          {[[3, 'Últimos 3 meses'], [6, 'Últimos 6'], [12, 'Últimos 12']].map(([n, t]) => (
            <button key={n} type="button" className="chip" onClick={() => ultimos(n as number)}>{t}</button>))}
          <button type="button" className="chip" onClick={() => aplicar({ ini: `${hoje.slice(0, 4)}-01-01`, fim: hoje })}>Este ano</button>
        </span>
        <label className="periodo">Período por
          <select aria-label="Período por" value={ag} onChange={e => trocarAgrupamento(e.target.value as Agrupamento)}>
            <option value="mes">Mês</option><option value="periodo">Fechamento (21–20)</option>
          </select></label>
      </div>

      {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
      {!d && !c.erro && <div className="carregando-tela"><span className="giro" /> Calculando a rentabilidade…</div>}
      {d && <>
        <nav className="rg-trilha" aria-label="Recorte">
          <button type="button" className={`rg-nivel${trilha.length ? '' : ' atual'}`} onClick={() => { setF({}); setDetalhe(null); }}>Geral</button>
          {trilha.map(dim => (
            <span key={dim} className="rg-nivel atual" data-testid={`rg-trilha-${dim}`}>
              <small>{ROTULO_DIMENSAO[dim]}</small> {nomeDe(d, dim, f[dim]!, ag)}
              <button type="button" aria-label={`Tirar ${ROTULO_DIMENSAO[dim].toLowerCase()} do recorte`} onClick={() => escolher(dim, f[dim]!)}>×</button>
            </span>))}
          {f.projeto && <a className="link" href={hashDe(caminhoEntidade('projeto', f.projeto))}>Abrir o projeto (rentabilidade por demanda) ›</a>}
          {f.cliente && !f.projeto && <a className="link" href={hashDe(caminhoEntidade('cliente', f.cliente))}>Abrir o cliente ›</a>}
        </nav>

        <section className="cartao renta">
          <div className="indicadores" aria-label="Indicadores do recorte">
            <div className="indicador"><small>Faturado</small><strong data-testid="rg-faturado">{reais(total.faturado, oculto)}</strong></div>
            <div className="indicador"><small>Custo</small><strong data-testid="rg-custo">{reais(total.custo, oculto)}</strong></div>
            <div className="indicador"><small>Margem</small><strong data-testid="rg-margem"><Margem g={total} oculto={oculto} /></strong></div>
            <div className="indicador"><small>Horas executadas</small><strong data-testid="rg-horas">{horasDe(total.min)}</strong></div>
            <div className="indicador"><small>Faturado/hora · custo/hora</small>
              <strong className="renta-menor">{reais(total.min - total.min_sem_valor > 0 ? total.faturado / ((total.min - total.min_sem_valor) / 60) : null, oculto)} · {reais(total.min - total.min_sem_custo > 0 ? total.custo / ((total.min - total.min_sem_custo) / 60) : null, oculto)}</strong></div>
          </div>
          {d.pendencias.length > 0 && <div className="fech-alerta" role="status"><strong>Atenção (intervalo inteiro):</strong><ul>{d.pendencias.map(p => <li key={p}>{p}</li>)}</ul></div>}
        </section>

        {d.celulas.length === 0 ? <p className="ajuda">Nenhuma hora apontada no intervalo.</p> : oculto ? (
          <section className="cartao"><p className="ajuda">Os gráficos mostram valores. Use <strong>Mostrar valores</strong> quando estiver em um lugar reservado.</p></section>
        ) : <>
          <section className="cartao rg-cartao" data-testid="rg-tempo">
            <div className="gha-topo"><div><h2 className="secao">Por período — faturado × custo</h2>
              <p className="ajuda">{ag === 'mes' ? 'Mês civil' : 'Período de fechamento (21 a 20)'} · o percentual em cima é a margem</p></div><Legenda /></div>
            <GraficoPeriodo grupos={porTempo} escolhido={f.tempo} aoEscolher={id => escolher('tempo', id)} />
          </section>
          <div className="rg-grade">
            <GraficoDimensao dim="cliente" grupos={porCliente} escolhido={f.cliente} aoEscolher={id => escolher('cliente', id)} />
            <GraficoDimensao dim="projeto" grupos={porProjeto} escolhido={f.projeto} aoEscolher={id => escolher('projeto', id)} />
            <GraficoDimensao dim="consultor" grupos={porConsultor} escolhido={f.consultor} aoEscolher={id => escolher('consultor', id)} />
          </div>
        </>}

        {d.celulas.length > 0 && (
          <section className="cartao" data-testid="rg-detalhe">
            <div className="gha-topo">
              <div><h2 className="secao">Detalhamento</h2>
                <div className="segmentos" role="tablist" aria-label="Detalhar por">
                  {(['cliente', 'projeto', 'consultor', 'tempo'] as Dimensao[]).map(dim => (
                    <button key={dim} type="button" role="tab" aria-selected={dimDetalhe === dim} onClick={() => setDetalhe(dim)}>{ROTULO_DIMENSAO[dim]}</button>))}
                </div></div>
              <Botao disabled={oculto} title={oculto ? 'Mostre os valores para exportar' : undefined}
                onClick={() => baixarXlsx(`Rentabilidade por ${ROTULO_DIMENSAO[dimDetalhe].toLowerCase()}`, planilhaGeral(dimDetalhe, linhasDetalhe, total))}>Excel</Botao>
            </div>
            <div className="tabela-caixa fech-rolagem"><table className="tabela fech-tabela" aria-label={`Rentabilidade por ${ROTULO_DIMENSAO[dimDetalhe].toLowerCase()}`}>
              <thead><tr><th>{ROTULO_DIMENSAO[dimDetalhe]}</th><th className="dir">Horas</th><th className="dir">Faturado</th><th className="dir">Custo</th><th className="dir">Margem</th><th /></tr></thead>
              <tbody>{linhasDetalhe.map(g => (
                <tr key={g.id}>
                  <td><button type="button" className="link" onClick={() => escolher(dimDetalhe, g.id)} title="Descer para este nível">{g.nome}</button>
                    {g.min_sem_valor > 0 && <> <span className="pilula pilula-neutra" title="Horas em projeto sem valor/hora informado nos pedidos">sem valor</span></>}
                    {g.min_sem_custo > 0 && <> <span className="pilula pilula-neutra" title="Horas sem período de remuneração vigente na data">sem custo</span></>}</td>
                  <td className="dir">{horasDe(g.min)}</td><td className="dir">{reais(g.faturado, oculto)}</td><td className="dir">{reais(g.custo, oculto)}</td>
                  <td className="dir"><Margem g={g} oculto={oculto} /></td>
                  <td>{(dimDetalhe === 'cliente' || dimDetalhe === 'projeto') && <a className="link" href={hashDe(caminhoEntidade(dimDetalhe, g.id))}>Abrir</a>}</td>
                </tr>))}</tbody>
              <tfoot><tr><td><strong>Total do recorte</strong></td><td className="dir">{horasDe(total.min)}</td><td className="dir">{reais(total.faturado, oculto)}</td>
                <td className="dir">{reais(total.custo, oculto)}</td><td className="dir"><strong><Margem g={total} oculto={oculto} /></strong></td><td /></tr></tfoot>
            </table></div>
          </section>
        )}
      </>}
    </div>
  );
}
