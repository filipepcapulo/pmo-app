// Relatórios › Rentabilidade geral (#/rentabilidade-geral, V4 0091): faturado × custo de todo o escritório num intervalo,
// em uma tela só — por período, por cliente, por projeto e por consultor. Clicar em uma barra ou linha desce para o nível
// de baixo (a escolha vira um item da trilha e todos os gráficos passam a mostrar só aquele recorte). Só para os papéis
// Dono e Rentabilidade do cofre; os valores começam ocultos e cada consulta fica registrada no cofre.
// Tipos de OS (0094): o campo Apontamento da tarefa diz se a hora é cobrada do cliente. O botão "Tipos de OS" abre o
// cadastro (o que conta no faturado); o que não conta entra só com o custo e ganha o quadro "Por tipo de OS".
import { useEffect, useMemo, useState } from 'react';
import { reais } from '../api/financeiro';
import { faixaMargem, horasDe, pctMargem } from '../api/rentabilidade';
import {
  acumular, agrupar, aplicarFiltro, filtrar, intervaloPadrao, nomeDe, minSemReceita, modoDoTipo, planilhaGeral, proximoNivel, rentaGeral, ROTULO_DIMENSAO, ROTULO_MODO, soCusto, somar,
  type Agrupamento, type Dimensao, type FiltroGeral, type Grupo, type ModoFatura, type Soma, type TipoOs,
} from '../api/rentabilidadeGeral';
import { hojeIso } from '../api/projeto';
import { traduzirErro } from '../api/mensagens';
import { Botao } from '../componentes/Botao';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { baixarXlsx } from '../util/xlsx';

const semAcesso = (erro: string | null) => !!erro && /autorizados do Financeiro/.test(erro);
const ORDEM_TRILHA: Dimensao[] = ['cliente', 'projeto', 'consultor', 'tipo', 'tempo'];
const LIMITE = 8;
/** "Desde o início": data anterior a qualquer apontamento do app e do histórico importado. */
const INICIO = '2020-01-01';

function Margem({ g, oculto }: { g: Soma; oculto: boolean }) {
  if (!g.faturado && !g.custo) return <>—</>;
  // tipo de OS que não conta no faturado: receita zero é a resposta certa, e a margem é o custo com sinal trocado
  if (soCusto(g)) return <span className={oculto ? undefined : 'renta-negativa'} title="Tipo de OS que não conta no faturado: só o custo">{reais(g.margem, oculto)} <small>(só custo)</small></span>;
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

/** Valor curto para o eixo: 1.250.000 → "1,25 mi"; 50.000 → "50 mil". */
const curto = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi` : v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }));
/** Topo e passo "redondos" do eixo (4 a 5 divisões). */
function eixo(max: number) {
  const bruto = Math.max(1, max) / 4, p = 10 ** Math.floor(Math.log10(bruto)), m = bruto / p;
  const passo = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  return { passo, topo: Math.ceil(Math.max(1, max) / passo) * passo };
}

/** Linha do tempo acumulada: faturado e custo somados desde o início do intervalo. Onde as linhas se cruzam, o recorte
 *  passa a dar lucro (faturado acima do custo) ou prejuízo. */
function GraficoAcumulado({ grupos }: { grupos: Grupo[] }) {
  const { pontos, cruzamentos } = useMemo(() => acumular(grupos), [grupos]);
  if (pontos.length === 0) return <p className="ajuda">Sem horas no recorte.</p>;
  const W = 720, H = 260, E = 58, D = 18, T = 16, B = 28, n = pontos.length;
  const { passo, topo } = eixo(Math.max(...pontos.flatMap(p => [p.faturado, p.custo])));
  const x = (i: number) => (n === 1 ? E + (W - E - D) / 2 : E + i * (W - E - D) / (n - 1));
  const y = (v: number) => T + (1 - Math.max(0, v) / topo) * (H - T - B);
  const caminho = (campo: 'faturado' | 'custo') => pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[campo]).toFixed(1)}`).join(' ');
  const cadaRotulo = Math.ceil(n / 12), ult = pontos[n - 1];
  const marcas = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo);
  const nomeCruz = (c: { indice: number; t: number }) => (c.t === 0 ? pontos[c.indice - 1].nome : pontos[c.indice].nome);
  return (
    <>
      <svg className="rg-acum" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Acumulado até ${ult.nome}: faturado ${reais(ult.faturado)}, custo ${reais(ult.custo)}, margem ${reais(ult.margem)}`}>
        {marcas.map(v => (
          <g key={v}><line className="rg-acum-grade" x1={E} x2={W - D} y1={y(v)} y2={y(v)} />
            <text className="rg-acum-eixo" x={E - 6} y={y(v) + 4} textAnchor="end">{curto(v)}</text></g>))}
        {pontos.map((p, i) => (i % cadaRotulo === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= cadaRotulo) && (
          <text key={p.id} className="rg-acum-eixo" x={x(i)} y={H - 8} textAnchor={i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}>{p.nome}</text>))}
        <path className="rg-acum-linha rg-acum-fat" d={caminho('faturado')} />
        <path className="rg-acum-linha rg-acum-custo" d={caminho('custo')} />
        {pontos.map((p, i) => (
          <g key={p.id} className="rg-acum-ponto">
            <title>{`${p.nome} (acumulado)\nFaturado: ${reais(p.faturado)}\nCusto: ${reais(p.custo)}\nMargem: ${reais(p.margem)} (${pctMargem(p.margem_pct)})`}</title>
            <rect x={x(i) - 12} y={T} width={24} height={H - T - B} fill="transparent" />
            <circle className="gha-c1" cx={x(i)} cy={y(p.custo)} r={3.5} />
            <circle className="gha-c0" cx={x(i)} cy={y(p.faturado)} r={3.5} />
          </g>))}
        {cruzamentos.map(c => {
          const cx = x(c.indice - 1) + c.t * (x(c.indice) - x(c.indice - 1));
          return (
            <g key={c.indice} className={`rg-acum-cruz ${c.sentido}`}>
              <title>{c.sentido === 'positivo' ? `Em ${nomeCruz(c)} o faturado acumulado passa o custo (${reais(c.valor)})` : `Em ${nomeCruz(c)} o custo acumulado passa o faturado (${reais(c.valor)})`}</title>
              <line x1={cx} x2={cx} y1={T} y2={H - B} /><circle cx={cx} cy={y(c.valor)} r={6} />
            </g>);
        })}
      </svg>
      <p className="rg-acum-resumo" data-testid="rg-acum-resumo">
        Acumulado até {ult.nome}: faturado <b>{reais(ult.faturado)}</b> · custo <b>{reais(ult.custo)}</b> · margem{' '}
        <b className={`renta-${faixaMargem({ margem: ult.faturado ? ult.margem : null, margem_pct: ult.margem_pct })}`}>{reais(ult.margem)}{ult.faturado ? ` (${pctMargem(ult.margem_pct)})` : ''}</b>
      </p>
      <ul className="rg-acum-cruzes" data-testid="rg-acum-cruzamentos">
        {cruzamentos.map(c => (
          <li key={c.indice} className={c.sentido === 'positivo' ? 'renta-boa' : 'renta-negativa'}>
            {c.sentido === 'positivo' ? `Em ${nomeCruz(c)} o faturado acumulado passa o custo: o recorte começa a dar lucro.` : `Em ${nomeCruz(c)} o custo acumulado passa o faturado: o recorte entra no prejuízo.`}</li>))}
        {cruzamentos.length === 0 && <li className="ajuda">{ult.margem === 0 ? 'Faturado e custo acumulados estão empatados.'
          : `As linhas não se cruzam no intervalo: o ${ult.margem > 0 ? 'faturado' : 'custo'} acumulado fica sempre acima do ${ult.margem > 0 ? 'custo' : 'faturado'}.`}</li>}
      </ul>
    </>
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
                  <small className={soCusto(g) ? 'renta-negativa' : `renta-${faixaMargem({ margem: g.faturado ? g.margem : null, margem_pct: g.margem_pct })}`}>{g.faturado ? pctMargem(g.margem_pct) : soCusto(g) ? 'só custo' : 'sem faturado'}</small></span>
              </button>
            </li>))}
        </ul>
      )}
      {grupos.length > LIMITE && <button type="button" className="link" onClick={() => setTodos(!todos)}>{todos ? `Mostrar só os ${LIMITE} maiores` : `Ver todos (${grupos.length})`}</button>}
    </section>
  );
}

/** Cadastro: cada tipo de OS (campo Apontamento da tarefa), como entra no faturado (sim, segue o pedido, não) e se entra
 *  no custo. Cada mudança grava na hora. */
const TEXTO_MODO: Record<ModoFatura, string> = { sim: 'conta no faturado', pedido: 'segue o pedido de horas', nao: 'não conta no faturado' };
function CadastroTipos({ aoFechar }: { aoFechar: (mudou: boolean) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const c = useCarga(() => rentaGeral.tipos(esc), [esc]);
  const [mudou, setMudou] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [novo, setNovo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const gravar = async (chave: string, fn: () => Promise<unknown>, msg: string) => {
    setOcupado(chave); setErro(null);
    try { await fn(); setMudou(true); avisar(msg, 'ok'); await c.recarregar(); }
    catch (e) { setErro(traduzirErro(e).mensagem); }
    setOcupado(null);
  };
  const mudarModo = (t: TipoOs, modo: ModoFatura) => gravar(t.chave, () => rentaGeral.tipoSalvar(esc, t.nome, { modo }), `${t.nome}: ${TEXTO_MODO[modo]}`);
  const mudarCusto = (t: TipoOs, custo: boolean) => gravar(t.chave, () => rentaGeral.tipoSalvar(esc, t.nome, { custo }), custo ? `${t.nome}: entra no custo` : `${t.nome}: fora do custo, só conta as horas`);
  const adicionar = () => {
    const nome = novo.trim();
    if (!nome) { setErro('Informe o nome do tipo.'); return; }
    void gravar('novo', () => rentaGeral.tipoSalvar(esc, nome, { modo: 'nao' }), `${nome}: cadastrado como só custo`).then(() => setNovo(''));
  };
  return (
    <Popup aberto titulo="Tipos de OS: faturado e custo" aoFechar={() => aoFechar(mudou)} largura={760}
      rodape={<Botao variante="primario" onClick={() => aoFechar(mudou)}>Fechar</Botao>}>
      <p className="ajuda">O tipo é o campo <strong>Apontamento</strong> da tarefa (OS Experience, Faturado, Bonificado…). Em <strong>Faturado</strong>: <em>Sim</em> = a hora é sempre cobrada; <em>Segue o pedido</em> = vale o pedido de horas do projeto (a parte vendida em pedido <strong>bonificado</strong> não fatura); <em>Não</em> = o cliente não paga (bonificado, trabalho interno). Desmarque <strong>Entra no custo</strong> para o que só deve ser contado em horas (retrabalho, treinamento, ajuste). Vale para a Rentabilidade geral e para a aba Rentabilidade das fichas.</p>
      {c.erro && <p className="msg-erro" role="alert">{c.erro}</p>}
      {!c.dados && !c.erro && <p className="ajuda"><span className="giro" /> Carregando…</p>}
      {c.dados && (
        <div className="tabela-caixa"><table className="tabela" aria-label="Tipos de OS">
          <thead><tr><th>Tipo de OS</th><th className="dir">Apontamentos</th><th>Faturado</th><th>Entra no custo</th><th /></tr></thead>
          <tbody>{c.dados.map(t => (
            <tr key={t.chave}>
              <td><strong>{t.nome}</strong>{!t.do_campo && t.apontamentos === 0 && <> <span className="pilula pilula-neutra" title="Cadastrado aqui; não é uma opção do campo nem está em uso">cadastrado</span></>}</td>
              <td className="dir">{t.apontamentos.toLocaleString('pt-BR')}</td>
              <td><select value={modoDoTipo(t)} disabled={ocupado !== null} aria-label={`Faturado de ${t.nome}`} onChange={e => void mudarModo(t, e.target.value as ModoFatura)}>
                {(['sim', 'pedido', 'nao'] as ModoFatura[]).map(m => <option key={m} value={m}>{ROTULO_MODO[m]}</option>)}</select></td>
              <td><label className="check"><input type="checkbox" checked={t.custo !== false} disabled={ocupado !== null} aria-label={`${t.nome} entra no custo`}
                onChange={e => void mudarCusto(t, e.target.checked)} /> {t.custo !== false ? 'Sim' : 'Não: só horas'}</label></td>
              <td>{t.cadastrado && !t.do_campo && t.apontamentos === 0 && <button type="button" className="link" disabled={ocupado !== null}
                onClick={() => void gravar(t.chave, () => rentaGeral.tipoRemover(esc, t.nome), `${t.nome}: removido`)}>Remover</button>}</td>
            </tr>))}
            {c.dados.length === 0 && <tr><td colSpan={5} className="ajuda">Nenhum tipo encontrado.</td></tr>}
          </tbody>
        </table></div>
      )}
      <div className="linha rg-novo-tipo">
        <input type="text" value={novo} maxLength={80} placeholder="Outro tipo que não é faturado (ex.: Garantia)" aria-label="Nome do tipo novo"
          onChange={e => setNovo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } }} />
        <Botao carregando={ocupado === 'novo'} onClick={adicionar}>+ Adicionar como só custo</Botao>
      </div>
      {erro && <p className="msg-erro" role="alert">{erro}</p>}
      <p className="ajuda">Tipo novo que aparecer no campo já entra contando no faturado e no custo, até ser mudado aqui. O pedido bonificado é marcado no próprio pedido (ficha do projeto › Horas › Pedidos de horas). Cada mudança fica registrada no cofre.</p>
    </Popup>
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
  const [tiposAberto, setTiposAberto] = useState(false);
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
      if (n.tipo && !(d.tipos ?? []).some(x => x.id === n.tipo)) delete n.tipo;
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
  const porTipo = useMemo(() => de('tipo'), [d, f, ag]);           // eslint-disable-line react-hooks/exhaustive-deps
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
          <p className="ajuda">Faturado = horas executadas × valor/hora médio vendido do projeto. Custo = horas executadas × remuneração vigente na data. Tipo de OS que não conta no faturado (bonificado, interno) ou hora de pedido bonificado entra só com o custo; tipo fora do custo só conta as horas. Clique em uma barra para descer de nível. Cada consulta fica registrada no cofre.</p></div>
        <div className="linha">
          <Botao onClick={() => setTiposAberto(true)}>Tipos de OS</Botao>
          <Botao onClick={() => setOculto(!oculto)} aria-pressed={!oculto}>{oculto ? 'Mostrar valores' : 'Ocultar valores'}</Botao>
        </div>
      </header>

      <div className="barra-filtros">
        <label className="periodo">De <input type="date" aria-label="De" value={campos.ini} max={campos.fim} onChange={e => setCampos({ ...campos, ini: e.target.value })} onBlur={() => aplicar(campos)} /></label>
        <label className="periodo">Até <input type="date" aria-label="Até" value={campos.fim} min={campos.ini} onChange={e => setCampos({ ...campos, fim: e.target.value })} onBlur={() => aplicar(campos)} /></label>
        <span className="chips">
          {[[3, 'Últimos 3 meses'], [6, 'Últimos 6'], [12, 'Últimos 12']].map(([n, t]) => (
            <button key={n} type="button" className="chip" onClick={() => ultimos(n as number)}>{t}</button>))}
          <button type="button" className="chip" onClick={() => aplicar({ ini: `${hoje.slice(0, 4)}-01-01`, fim: hoje })}>Este ano</button>
          <button type="button" className="chip" title="Todo o histórico de horas (para o acumulado desde o primeiro apontamento)" onClick={() => aplicar({ ini: INICIO, fim: hoje })}>Desde o início</button>
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
            {total.min_nao_fatura > 0 && <div className="indicador"><small>Horas não faturadas (tipo de OS)</small><strong data-testid="rg-nao-fatura">{horasDe(total.min_nao_fatura)}</strong></div>}
            {total.min_bonificado > 0 && <div className="indicador"><small>Horas em pedido bonificado (sem receita)</small><strong data-testid="rg-bonificado">{horasDe(total.min_bonificado)}</strong></div>}
            {total.min_fora_custo > 0 && <div className="indicador"><small>Horas sem custo (retrabalho, treinamento…)</small><strong data-testid="rg-fora-custo">{horasDe(total.min_fora_custo)}</strong></div>}
            <div className="indicador"><small>Faturado/hora · custo/hora</small>
              <strong className="renta-menor">{reais(total.min - total.min_sem_valor - minSemReceita(total) > 0 ? total.faturado / ((total.min - total.min_sem_valor - minSemReceita(total)) / 60) : null, oculto)} · {reais(total.min - total.min_sem_custo - total.min_fora_custo > 0 ? total.custo / ((total.min - total.min_sem_custo - total.min_fora_custo) / 60) : null, oculto)}</strong></div>
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
          <section className="cartao rg-cartao" data-testid="rg-acumulado">
            <div className="gha-topo"><div><h2 className="secao">Acumulado{f.projeto ? ` de ${nomeDe(d, 'projeto', f.projeto, ag)}` : f.cliente ? ` de ${nomeDe(d, 'cliente', f.cliente, ag)}` : ''} — faturado × custo na linha do tempo</h2>
              <p className="ajuda">Cada ponto soma tudo desde {porTempo[0]?.nome ?? 'o início do intervalo'}. Onde as linhas se cruzam, o acumulado vira lucro ou prejuízo.{!f.cliente && ' Escolha um cliente para ver o acumulado dele.'}</p></div><Legenda /></div>
            <GraficoAcumulado grupos={porTempo} />
          </section>
          <div className="rg-grade">
            <GraficoDimensao dim="cliente" grupos={porCliente} escolhido={f.cliente} aoEscolher={id => escolher('cliente', id)} />
            <GraficoDimensao dim="projeto" grupos={porProjeto} escolhido={f.projeto} aoEscolher={id => escolher('projeto', id)} />
            <GraficoDimensao dim="consultor" grupos={porConsultor} escolhido={f.consultor} aoEscolher={id => escolher('consultor', id)} />
            <GraficoDimensao dim="tipo" grupos={porTipo} escolhido={f.tipo} aoEscolher={id => escolher('tipo', id)} />
          </div>
        </>}

        {d.celulas.length > 0 && (
          <section className="cartao" data-testid="rg-detalhe">
            <div className="gha-topo">
              <div><h2 className="secao">Detalhamento</h2>
                <div className="segmentos" role="tablist" aria-label="Detalhar por">
                  {(['cliente', 'projeto', 'consultor', 'tipo', 'tempo'] as Dimensao[]).map(dim => (
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
                    {g.min_sem_custo > 0 && <> <span className="pilula pilula-neutra" title="Horas sem período de remuneração vigente na data">sem custo</span></>}
                    {g.min_nao_fatura > 0 && <> <span className="pilula pilula-neutra" title={`${horasDe(g.min_nao_fatura)} de tipo de OS que não conta no faturado: só custo`}>{g.min_nao_fatura >= g.min ? 'não fatura' : 'parte não fatura'}</span></>}
                    {g.min_bonificado > 0 && <> <span className="pilula pilula-neutra" title={`${horasDe(g.min_bonificado)} em pedido bonificado: sem receita`}>bonificado</span></>}
                    {g.min_fora_custo > 0 && <> <span className="pilula pilula-neutra" title={`${horasDe(g.min_fora_custo)} de tipo de OS que não entra no custo`}>{g.min_fora_custo >= g.min ? 'fora do custo' : 'parte fora do custo'}</span></>}</td>
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
      {tiposAberto && <CadastroTipos aoFechar={mudou => { setTiposAberto(false); if (mudou) void c.recarregar(); }} />}
    </div>
  );
}
