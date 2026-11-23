// Relatórios › Painéis (#/paineis, V4 4.13.0): relatórios montados pelo usuário — tabela com agrupamento (descida de nível),
// linha do tempo e painel de gráficos. Os dados vêm sempre do banco, com os nomes do app, e só o que a pessoa já enxerga
// (api.v4_relatorio_din_dados); quem tem relatorio_dinamico.editar cria, grava e compartilha.
import { useEffect, useMemo, useState } from 'react';
import {
  agrupar, campoDe, camposDe, configInicial, dadosGrafico, ENTIDADE, filtrar, fmt, fonteDe, FONTES, fontesDoPainel, GRANULARIDADES, graficoInicial, idDaLinha,
  JANELA_PADRAO, linhaDoTempo, normalizar, num, paineisApi, periodoDe, rotuloCampo, sanear, TIPOS_PAINEL, valoresDe,
  type ConfigGrafico, type ConfigGraficos, type ConfigLinhaTempo, type ConfigPainel, type ConfigTabela, type Filtros, type Fonte, type Granularidade,
  type Linha, type NoGrupo, type Painel, type TipoPainel,
} from '../api/paineis';
import { data as dataBr } from '../api/cadastros';
import { hojeIso } from '../api/projeto';
import { Botao } from '../componentes/Botao';
import { Campo } from '../componentes/Campo';
import { EscolhaChips } from '../componentes/Chips';
import { GraficoDin } from '../componentes/GraficoDin';
import { Popup } from '../componentes/Popup';
import { SelecaoMultipla } from '../componentes/SelecaoMultipla';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { baixarCsv, nomeArquivo } from '../util/csv';
import { marcadosDe } from '../util/selecao';

type Rascunho = Pick<Painel, 'nome' | 'tipo' | 'config' | 'compartilhado'> & Partial<Pick<Painel, 'id' | 'versao' | 'meu'>>;
const rotuloTipo = (t: TipoPainel) => TIPOS_PAINEL.find(x => x.valor === t)?.rotulo ?? t;
const MAX_FOLHAS = 200, MAX_LINHAS = 500;

export function Paineis() {
  const esc = useSessao().eu!.escritorio_id!;
  const c = useCarga(() => paineisApi.listar(esc), [esc]);
  const [aberto, setAberto] = useState<Rascunho | null>(null);
  const [novo, setNovo] = useState<{ nome: string; tipo: TipoPainel } | null>(null);
  const pode = !!c.dados?.pode_editar;
  if (aberto) return <PainelVisao key={aberto.id ?? 'novo'} inicial={aberto} podeEditar={pode} aoVoltar={() => { setAberto(null); c.recarregar(); }} />;
  const itens = c.dados?.itens ?? [];
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Painéis</h1><p className="ajuda">Relatórios montados por você: tabela com agrupamento, linha do tempo e gráficos. Os dados são os do app e seguem o que cada pessoa pode ver.</p></div>
        {pode && <Botao variante="primario" onClick={() => setNovo({ nome: '', tipo: 'tabela' })}>+ Novo painel</Botao>}
      </header>
      {c.erro && <p className="erro">{c.erro}</p>}
      {!c.dados && !c.erro && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {c.dados && itens.length === 0 && <div className="vazio-tela"><h2>Nenhum painel ainda</h2><p>{pode ? 'Crie o primeiro em “+ Novo painel”.' : 'Quando alguém compartilhar um painel, ele aparece aqui.'}</p></div>}
      <div className="grade-cartoes">
        {itens.map(p => (
          <button key={p.id} type="button" className="cartao pd-cartao" data-testid="painel-cartao" onClick={() => setAberto({ ...p, config: sanear(p.tipo, p.config) })}>
            <strong>{p.nome}</strong>
            <span className="linha"><span className="pilula pilula-neutra">{rotuloTipo(p.tipo)}</span>
              {p.compartilhado && <span className="pilula pilula-neutra">Compartilhado</span>}{!p.meu && <span className="pilula pilula-neutra">De outra pessoa</span>}</span>
            <small className="ajuda">Atualizado em {dataBr(p.atualizado_em.slice(0, 10))}</small>
          </button>
        ))}
      </div>
      <Popup aberto={!!novo} titulo="Novo painel" aoFechar={() => setNovo(null)}
        rodape={<><Botao onClick={() => setNovo(null)}>Cancelar</Botao>
          <Botao variante="primario" disabled={(novo?.nome.trim().length ?? 0) < 2} onClick={() => { setAberto({ nome: novo!.nome.trim(), tipo: novo!.tipo, config: configInicial(novo!.tipo), compartilhado: false, meu: true }); setNovo(null); }}>Montar</Botao></>}>
        {novo && <>
          <Campo rotulo="Nome" valor={novo.nome} aoMudar={v => setNovo({ ...novo, nome: v })} obrigatorio maxLength={80} placeholder="Ex.: Agenda da semana por consultor" />
          <EscolhaChips rotulo="Formato" valor={novo.tipo} opcoes={TIPOS_PAINEL} aoMudar={v => setNovo({ ...novo, tipo: v as TipoPainel })} />
        </>}
      </Popup>
    </div>
  );
}

function useDados(esc: string, fontes: Fonte[], de: string, ate: string) {
  const [dados, setDados] = useState<Partial<Record<Fonte, Linha[]>>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [cortado, setCortado] = useState(false);
  const chave = `${[...fontes].sort().join(',')}|${de}|${ate}`;
  useEffect(() => {
    let vivo = true;
    setCarregando(true); setErro(null);
    Promise.all(fontes.map(f => paineisApi.dados(esc, f, de, ate))).then(rs => {
      if (!vivo) return;
      setDados(Object.fromEntries(rs.map(r => [r.fonte, normalizar(r.fonte, r.linhas)])));
      setCortado(rs.some(r => r.cortado)); setCarregando(false);
    }).catch(e => { if (vivo) { setErro((e as Error).message); setCarregando(false); } });
    return () => { vivo = false; };
  }, [esc, chave]);  // eslint-disable-line react-hooks/exhaustive-deps
  return { dados, erro, carregando, cortado };
}

function PainelVisao({ inicial, podeEditar, aoVoltar }: { inicial: Rascunho; podeEditar: boolean; aoVoltar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [p, setP] = useState<Rascunho>(inicial);
  const [salvo, setSalvo] = useState(() => JSON.stringify([inicial.nome, inicial.config, inicial.compartilhado]));
  const [config, setConfig] = useState(!inicial.id);
  const [gravando, setGravando] = useState(false);
  const meu = p.meu !== false, edita = podeEditar && meu;
  const mudou = JSON.stringify([p.nome, p.config, p.compartilhado]) !== salvo;
  const janela = p.config.janela ?? JANELA_PADRAO;
  const { de, ate } = periodoDe(janela, hojeIso());
  const fontes = useMemo(() => fontesDoPainel(p.tipo, p.config), [p.tipo, p.config]);
  const d = useDados(esc, fontes, de, ate);
  const mudar = (c: Partial<ConfigPainel>) => setP(x => ({ ...x, config: { ...x.config, ...c } as ConfigPainel }));
  const gravar = async () => {
    setGravando(true);
    try {
      const r = await paineisApi.salvar(esc, { ...(p.id ? { id: p.id, versao: p.versao } : { tipo: p.tipo }), nome: p.nome.trim(), config: p.config, compartilhado: p.compartilhado });
      setP(x => ({ ...x, id: String(r.id), versao: r.versao, meu: true }));
      setSalvo(JSON.stringify([p.nome, p.config, p.compartilhado]));
      avisar('Painel gravado', 'ok');
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const excluir = async () => {
    if (!p.id || !confirm(`Excluir o painel "${p.nome}"?`)) return;
    try { await paineisApi.salvar(esc, { id: p.id, versao: p.versao, excluir: true }); avisar('Painel excluído', 'ok'); aoVoltar(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
  };
  return (
    <div className="pagina pagina-larga">
      <header className="pagina-topo">
        <div>
          <button type="button" className="link" onClick={() => { if (!mudou || !edita || confirm('Sair sem gravar as mudanças?')) aoVoltar(); }}>‹ Painéis</button>
          <h1>{p.nome} <span className="pilula pilula-neutra">{rotuloTipo(p.tipo)}</span></h1>
          <p className="ajuda">Período: {dataBr(de)} a {dataBr(ate)} · dados do app, só o que você pode ver{d.cortado ? ' · há mais linhas do que o limite: reduza o período' : ''}</p>
        </div>
        <div className="linha">
          <Botao onClick={() => setConfig(v => !v)} aria-pressed={config}>{config ? 'Fechar configuração' : 'Configurar'}</Botao>
          {edita && p.id && <Botao variante="perigo" onClick={excluir}>Excluir</Botao>}
          {edita && <Botao variante="primario" carregando={gravando} disabled={!mudou && !!p.id} onClick={gravar}>Gravar</Botao>}
        </div>
      </header>
      {config && (
        <section className="cartao pd-config" aria-label="Configuração do painel">
          {!edita && <p className="ajuda">{meu ? 'Você pode ajustar para ver de outro jeito, mas não tem permissão para gravar painéis.' : 'Painel de outra pessoa: os ajustes valem só enquanto a tela estiver aberta.'}</p>}
          <div className="grade-campos">
            {edita && <Campo rotulo="Nome" valor={p.nome} aoMudar={v => setP({ ...p, nome: v })} maxLength={80} />}
            <Campo rotulo="Dias para trás" tipo="number" valor={String(janela.antes)} aoMudar={v => mudar({ janela: { ...janela, antes: Number(v) || 0 } })} inputMode="numeric" ajuda="A partir de hoje." />
            <Campo rotulo="Dias para frente" tipo="number" valor={String(janela.depois)} aoMudar={v => mudar({ janela: { ...janela, depois: Number(v) || 0 } })} inputMode="numeric" ajuda="Até 400 dias no total." />
          </div>
          {edita && <label className="check"><input type="checkbox" checked={p.compartilhado} onChange={e => setP({ ...p, compartilhado: e.target.checked })} /> Compartilhar com o escritório (cada pessoa vê só os dados que já pode ver)</label>}
          {p.tipo === 'tabela' && <ConfigTabelaForm c={p.config as ConfigTabela} linhas={d.dados[(p.config as ConfigTabela).fonte] ?? []} mudar={mudar} />}
          {p.tipo === 'linha_tempo' && <ConfigTempoForm c={p.config as ConfigLinhaTempo} linhas={d.dados[(p.config as ConfigLinhaTempo).fonte] ?? []} mudar={mudar} />}
          {p.tipo === 'graficos' && <ConfigGraficosForm c={p.config as ConfigGraficos} dados={d.dados} mudar={mudar} />}
        </section>
      )}
      {d.erro && <p className="erro">{d.erro}</p>}
      {d.carregando && <div className="carregando-tela"><span className="giro" /> Carregando os dados…</div>}
      {!d.carregando && !d.erro && <>
        {p.tipo === 'tabela' && <TabelaDin nome={p.nome} c={p.config as ConfigTabela} linhas={d.dados[(p.config as ConfigTabela).fonte] ?? []} />}
        {p.tipo === 'linha_tempo' && <TempoDin c={p.config as ConfigLinhaTempo} linhas={d.dados[(p.config as ConfigLinhaTempo).fonte] ?? []} />}
        {p.tipo === 'graficos' && (
          <div className="pd-graficos">
            {(p.config as ConfigGraficos).graficos.map((g, i) => {
              const dg = dadosGrafico(filtrar(d.dados[g.fonte] ?? [], g.filtros), g, campoDe(g.fonte, g.x)?.tipo === 'data');
              return (
                <section key={i} className="cartao pd-grafico" data-testid="painel-grafico">
                  <h2>{g.titulo || `${rotuloCampo(g.fonte, g.medida)} por ${rotuloCampo(g.fonte, g.x)}`}</h2>
                  <GraficoDin dados={dg} tipo={g.tipo} rotuloY={`${rotuloCampo(g.fonte, g.medida)} · ${fonteDe(g.fonte).rotulo}`} comLegenda={!!g.serie} />
                </section>
              );
            })}
          </div>
        )}
      </>}
    </div>
  );
}

// ---------------------------------------------------------------- configuração
const op = (cs: { chave: string; rotulo: string }[]) => cs.map(c => ({ valor: c.chave, rotulo: c.rotulo }));
const opMedida = (f: Fonte) => [{ valor: 'contagem', rotulo: 'Quantidade (contagem)' }, ...camposDe(f, 'numero').map(c => ({ valor: c.chave, rotulo: `Soma de ${c.rotulo}` }))];

function FiltrosForm({ fonte, filtros, linhas, aoMudar }: { fonte: Fonte; filtros: Filtros | undefined; linhas: Linha[]; aoMudar: (f: Filtros) => void }) {
  const f = filtros ?? {};
  const usados = Object.keys(f);
  const livres = camposDe(fonte, 'texto').filter(c => !usados.includes(c.chave));
  return (
    <fieldset className="grupo pd-filtros">
      <legend>Filtros</legend>
      <div className="linha">
        {usados.map(k => (
          <span key={k} className="pd-filtro">
            <SelecaoMultipla ocultar rotulo={rotuloCampo(fonte, k)} opcoes={[...new Set([...valoresDe(linhas, k), ...marcadosDe(f[k])])]} sel={f[k]} aoMudar={s => aoMudar({ ...f, [k]: s })} />
            <button type="button" className="link" aria-label={`Tirar o filtro ${rotuloCampo(fonte, k)}`} onClick={() => { const { [k]: _fora, ...resto } = f; aoMudar(resto); }}>×</button>
          </span>
        ))}
        {livres.length > 0 && (
          <select aria-label="Adicionar filtro" value="" onChange={e => { if (e.target.value) aoMudar({ ...f, [e.target.value]: [] }); }}>
            <option value="">+ Filtrar por…</option>
            {livres.map(c => <option key={c.chave} value={c.chave}>{c.rotulo}</option>)}
          </select>
        )}
      </div>
    </fieldset>
  );
}
function FonteCampo({ valor, aoMudar }: { valor: Fonte; aoMudar: (f: Fonte) => void }) {
  return <Campo rotulo="Dados" tipo="select" valor={valor} aoMudar={v => aoMudar(v as Fonte)} opcoes={FONTES.map(f => ({ valor: f.valor, rotulo: f.rotulo }))} ajuda={fonteDe(valor).detalhe} />;
}
/** Lista ordenada de campos (a ordem do clique é a ordem das colunas / dos níveis). */
function CamposOrdenados({ rotulo, fonte, sel, aoMudar, maximo }: { rotulo: string; fonte: Fonte; sel: string[]; aoMudar: (s: string[]) => void; maximo?: number }) {
  const mover = (i: number, para: number) => { const n = [...sel]; const [x] = n.splice(i, 1); n.splice(para, 0, x); aoMudar(n); };
  const livres = camposDe(fonte).filter(c => !sel.includes(c.chave));
  return (
    <fieldset className="grupo pd-ordenados">
      <legend>{rotulo}</legend>
      <ol>
        {sel.map((k, i) => (
          <li key={k}>
            <span>{rotuloCampo(fonte, k)}</span>
            <button type="button" className="link" disabled={i === 0} aria-label={`Subir ${rotuloCampo(fonte, k)}`} onClick={() => mover(i, i - 1)}>↑</button>
            <button type="button" className="link" disabled={i === sel.length - 1} aria-label={`Descer ${rotuloCampo(fonte, k)}`} onClick={() => mover(i, i + 1)}>↓</button>
            <button type="button" className="link" aria-label={`Tirar ${rotuloCampo(fonte, k)}`} onClick={() => aoMudar(sel.filter(x => x !== k))}>×</button>
          </li>
        ))}
      </ol>
      {livres.length > 0 && (!maximo || sel.length < maximo) && (
        <select aria-label={`Adicionar em ${rotulo}`} value="" onChange={e => { if (e.target.value) aoMudar([...sel, e.target.value]); }}>
          <option value="">+ Adicionar campo…</option>
          {livres.map(c => <option key={c.chave} value={c.chave}>{c.rotulo}</option>)}
        </select>
      )}
    </fieldset>
  );
}
function ConfigTabelaForm({ c, linhas, mudar }: { c: ConfigTabela; linhas: Linha[]; mudar: (c: Partial<ConfigPainel>) => void }) {
  return (
    <>
      <FonteCampo valor={c.fonte} aoMudar={f => mudar(sanear('tabela', { ...c, fonte: f, colunas: [], grupos: [], filtros: {} }))} />
      <div className="pd-duas">
        <CamposOrdenados rotulo="Colunas" fonte={c.fonte} sel={c.colunas} aoMudar={s => mudar({ colunas: s })} />
        <CamposOrdenados rotulo="Agrupar por (descida de nível)" fonte={c.fonte} sel={c.grupos} aoMudar={s => mudar({ grupos: s })} maximo={4} />
      </div>
      <FiltrosForm fonte={c.fonte} filtros={c.filtros} linhas={linhas} aoMudar={f => mudar({ filtros: f })} />
    </>
  );
}
function ConfigTempoForm({ c, linhas, mudar }: { c: ConfigLinhaTempo; linhas: Linha[]; mudar: (c: Partial<ConfigPainel>) => void }) {
  return (
    <>
      <FonteCampo valor={c.fonte} aoMudar={f => mudar(sanear('linha_tempo', { ...c, fonte: f, filtros: {} }))} />
      <div className="grade-campos">
        <Campo rotulo="Uma linha por" tipo="select" valor={c.linha} aoMudar={v => mudar({ linha: v })} opcoes={op(camposDe(c.fonte, 'texto'))} />
        <Campo rotulo="Data usada" tipo="select" valor={c.campoData} aoMudar={v => mudar({ campoData: v })} opcoes={op(camposDe(c.fonte, 'data'))} />
        <Campo rotulo="Agrupar as datas por" tipo="select" valor={c.gran} aoMudar={v => mudar({ gran: v as Granularidade })} opcoes={GRANULARIDADES} />
        <Campo rotulo="Valor da célula" tipo="select" valor={c.medida} aoMudar={v => mudar({ medida: v })} opcoes={opMedida(c.fonte)} />
      </div>
      <FiltrosForm fonte={c.fonte} filtros={c.filtros} linhas={linhas} aoMudar={f => mudar({ filtros: f })} />
    </>
  );
}
function ConfigGraficosForm({ c, dados, mudar }: { c: ConfigGraficos; dados: Partial<Record<Fonte, Linha[]>>; mudar: (c: Partial<ConfigPainel>) => void }) {
  const troca = (i: number, g: Partial<ConfigGrafico>) => mudar({ graficos: c.graficos.map((x, j) => (j === i ? { ...x, ...g } : x)) });
  return (
    <>
      {c.graficos.map((g, i) => {
        const xData = campoDe(g.fonte, g.x)?.tipo === 'data';
        return (
          <fieldset key={i} className="grupo pd-grafico-config">
            <legend>Gráfico {i + 1}</legend>
            <div className="grade-campos">
              <Campo rotulo="Título" valor={g.titulo} aoMudar={v => troca(i, { titulo: v })} maxLength={80} />
              <Campo rotulo="Tipo" tipo="select" valor={g.tipo} aoMudar={v => troca(i, { tipo: v as 'barras' | 'linhas' })} opcoes={[{ valor: 'barras', rotulo: 'Barras' }, { valor: 'linhas', rotulo: 'Linhas' }]} />
              <FonteCampo valor={g.fonte} aoMudar={f => mudar({ graficos: (sanear('graficos', { graficos: c.graficos.map((x, j) => (j === i ? { ...x, fonte: f, filtros: {}, serie: null } : x)) }) as ConfigGraficos).graficos })} />
              <Campo rotulo="Eixo X" tipo="select" valor={g.x} aoMudar={v => troca(i, { x: v })} opcoes={op(camposDe(g.fonte).filter(k => k.tipo !== 'numero'))} />
              {xData && <Campo rotulo="Agrupar as datas por" tipo="select" valor={g.gran} aoMudar={v => troca(i, { gran: v as Granularidade })} opcoes={GRANULARIDADES} />}
              <Campo rotulo="Eixo Y" tipo="select" valor={g.medida} aoMudar={v => troca(i, { medida: v })} opcoes={opMedida(g.fonte)} />
              <Campo rotulo="Uma série por" tipo="select" valor={g.serie ?? ''} aoMudar={v => troca(i, { serie: v || null })}
                opcoes={[{ valor: '', rotulo: '— uma série só —' }, ...op(camposDe(g.fonte, 'texto').filter(k => k.chave !== g.x))]} ajuda="Até 8 cores; o que passar disso soma em “Outros”." />
            </div>
            <FiltrosForm fonte={g.fonte} filtros={g.filtros} linhas={dados[g.fonte] ?? []} aoMudar={f => troca(i, { filtros: f })} />
            {c.graficos.length > 1 && <Botao variante="fantasma" onClick={() => mudar({ graficos: c.graficos.filter((_, j) => j !== i) })}>Tirar este gráfico</Botao>}
          </fieldset>
        );
      })}
      {c.graficos.length < 8 && <Botao onClick={() => mudar({ graficos: [...c.graficos, graficoInicial()] })}>+ Gráfico</Botao>}
    </>
  );
}

// ---------------------------------------------------------------- tabela com descida de nível
const celula = (fonte: Fonte, k: string, l: Linha) => {
  const v = l[k], campo = campoDe(fonte, k);
  if (v === null || v === undefined) return '—';
  return campo?.tipo === 'data' ? dataBr(String(v)) : campo?.tipo === 'numero' && k !== 'numero' ? fmt(num(v)) : String(v);
};
function TabelaDin({ nome, c, linhas }: { nome: string; c: ConfigTabela; linhas: Linha[] }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const filtradas = useMemo(() => filtrar(linhas, c.filtros), [linhas, c.filtros]);
  const ehNum = (k: string) => campoDe(c.fonte, k)?.tipo === 'numero' && k !== 'numero';
  // as colunas de número vão para o fim, para o total do grupo cair embaixo do título delas
  const textos = c.colunas.filter(k => !ehNum(k)), numericos = c.colunas.filter(ehNum);
  const somaveis = textos.length ? numericos : numericos.slice(1), ordem = [...textos, ...numericos];
  const larguraTitulo = ordem.length - somaveis.length;
  const arvore = useMemo(() => agrupar(filtradas, c.grupos, numericos), [filtradas, c.grupos.join(','), numericos.join(',')]);  // eslint-disable-line react-hooks/exhaustive-deps
  const alternar = (k: string) => setAbertos(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const todos = (nos: NoGrupo[]): string[] => nos.flatMap(x => [x.chave, ...todos(x.filhos)]);
  const total = (k: string) => filtradas.reduce((s, l) => s + num(l[k]), 0);
  const linhaDados = (l: Linha, nivel: number, i: number) => (
    <tr key={`${idDaLinha(c.fonte, l)}-${i}`} className="pd-folha">
      {ordem.map((k, j) => <td key={k} className={ehNum(k) ? 'num' : undefined} style={j === 0 ? { paddingLeft: 12 + nivel * 18 } : undefined}>
        {j === 0 && idDaLinha(c.fonte, l) ? <a href={hashDe(caminhoEntidade(ENTIDADE[c.fonte], idDaLinha(c.fonte, l)))}>{celula(c.fonte, k, l)}</a> : celula(c.fonte, k, l)}</td>)}
    </tr>
  );
  const renderNo = (no: NoGrupo, nivel: number): React.ReactNode[] => {
    const ab = abertos.has(no.chave);
    return [
      <tr key={no.chave} className={`pd-grupo pd-n${Math.min(nivel, 3)}`} data-testid="painel-grupo">
        <th scope="row" colSpan={larguraTitulo} style={{ paddingLeft: 12 + nivel * 18 }}>
          <button type="button" aria-expanded={ab} onClick={() => alternar(no.chave)}>{ab ? '▾' : '▸'} <small>{rotuloCampo(c.fonte, no.campo)}:</small> {no.valor} <span className="pilula pilula-neutra">{no.n}</span></button>
        </th>
        {somaveis.map(k => <td key={k} className="num"><strong>{fmt(no.somas[k])}</strong></td>)}
      </tr>,
      ...(ab ? (no.filhos.length ? no.filhos.flatMap(f => renderNo(f, nivel + 1))
        : [...no.linhas.slice(0, MAX_FOLHAS).map((l, i) => linhaDados(l, nivel + 1, i)),
          ...(no.linhas.length > MAX_FOLHAS ? [<tr key={no.chave + '+'}><td colSpan={ordem.length} className="ajuda">… e mais {no.linhas.length - MAX_FOLHAS} linhas (exporte para ver todas).</td></tr>] : [])]) : []),
    ];
  };
  return (
    <section className="cartao" data-testid="painel-tabela">
      <div className="pagina-topo">
        <p className="ajuda">{filtradas.length} {filtradas.length === 1 ? 'linha' : 'linhas'}{c.grupos.length ? ` · agrupado por ${c.grupos.map(g => rotuloCampo(c.fonte, g)).join(' › ')}` : ''}</p>
        <div className="linha">
          {c.grupos.length > 0 && <><Botao variante="fantasma" onClick={() => setAbertos(new Set(todos(arvore)))}>Abrir tudo</Botao><Botao variante="fantasma" onClick={() => setAbertos(new Set())}>Fechar tudo</Botao></>}
          <Botao disabled={!filtradas.length} onClick={() => baixarCsv(nomeArquivo(nome), ordem.map(k => rotuloCampo(c.fonte, k)), filtradas.map(l => ordem.map(k => l[k] ?? '')))}>CSV</Botao>
        </div>
      </div>
      {filtradas.length === 0 ? <p className="ajuda">Nada para mostrar com os filtros e o período escolhidos.</p> : (
        <div className="tabela-rolagem">
          <table className="tabela pd-tabela">
            <thead><tr>{ordem.map(k => <th key={k} className={ehNum(k) ? 'num' : undefined}>{rotuloCampo(c.fonte, k)}</th>)}</tr></thead>
            <tbody>
              {c.grupos.length ? arvore.flatMap(no => renderNo(no, 0)) : filtradas.slice(0, MAX_LINHAS).map((l, i) => linhaDados(l, 0, i))}
              {!c.grupos.length && filtradas.length > MAX_LINHAS && <tr><td colSpan={ordem.length} className="ajuda">… e mais {filtradas.length - MAX_LINHAS} linhas (agrupe ou exporte para ver todas).</td></tr>}
            </tbody>
            {somaveis.length > 0 && (
              <tfoot><tr><th scope="row" colSpan={larguraTitulo}>Total</th>{somaveis.map(k => <td key={k} className="num"><strong>{fmt(total(k))}</strong></td>)}</tr></tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- linha do tempo
function TempoDin({ c, linhas }: { c: ConfigLinhaTempo; linhas: Linha[] }) {
  const m = useMemo(() => linhaDoTempo(filtrar(linhas, c.filtros), c), [linhas, c]);
  if (!m.linhas.length) return <section className="cartao"><p className="ajuda">Nada para mostrar com os filtros e o período escolhidos.</p></section>;
  // uma cor só, do claro ao escuro: quanto maior o valor, mais forte
  const fundo = (v: number) => (v > 0 && m.maximo > 0 ? { background: `color-mix(in srgb, var(--pd-seq) ${Math.round(12 + 58 * (v / m.maximo))}%, transparent)` } : undefined);
  return (
    <section className="cartao" data-testid="painel-tempo">
      <p className="ajuda">{rotuloCampo(c.fonte, c.medida)} por {rotuloCampo(c.fonte, c.linha)} · {rotuloCampo(c.fonte, c.campoData)} por {GRANULARIDADES.find(g => g.valor === c.gran)?.rotulo.toLowerCase()}
        {m.semData > 0 ? ` · ${m.semData} sem data ficaram de fora` : ''}</p>
      <div className="tabela-rolagem">
        <table className="tabela pd-tempo">
          <thead><tr><th>{rotuloCampo(c.fonte, c.linha)}</th>{m.colunas.map(k => <th key={k.chave} className="num">{k.rotulo}</th>)}<th className="num">Total</th></tr></thead>
          <tbody>
            {m.linhas.map(l => (
              <tr key={l.nome}><th scope="row">{l.nome}</th>
                {m.colunas.map(k => <td key={k.chave} className="num" style={fundo(l.celulas[k.chave] ?? 0)}>{l.celulas[k.chave] ? fmt(l.celulas[k.chave]) : ''}</td>)}
                <td className="num"><strong>{fmt(l.total)}</strong></td></tr>
            ))}
          </tbody>
          <tfoot><tr><th scope="row">Total</th>{m.colunas.map(k => <td key={k.chave} className="num"><strong>{fmt(m.totais[k.chave] ?? 0)}</strong></td>)}<td className="num"><strong>{fmt(m.total)}</strong></td></tr></tfoot>
        </table>
      </div>
    </section>
  );
}
