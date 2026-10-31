// Tabela paginada (10/15/30/50) no padrão das grades dos dashboards Sankhya: toda coluna ordena pelo cabeçalho
// (▴/▾), tem funil de filtro (condição + lista de valores, os filtros se somam), alça para a largura (duplo clique
// restaura) e muda de lugar arrastando o título; o botão "Colunas" mostra/oculta e reordena (também no celular) e
// "Excel" baixa um .xlsx (e "CSV" um .csv) das linhas filtradas, na ordem e com as colunas da tela. Layout salvo neste navegador.
import { useEffect, useMemo, useState, type DragEvent, type PointerEvent as PE, type ReactNode } from 'react';
import { alternar, deslocar, gravarLayout, lerLayout, mover, normalizar, type Layout } from '../estado/colunas';
import { ativo, deduzirTipo, normal, OPS_NUMERO, OPS_TEXTO, passa, type Filtro, type Operador, type TipoColuna } from '../estado/filtro';
import { ordenar, paginar, TAMANHOS, valorOrdem } from '../estado/paginacao';
import { baixarCsv } from '../util/csv';
import { baixarXlsx, type TipoXlsx } from '../util/xlsx';
import { Icone } from './Icone';
import { Popup } from './Popup';

export interface Coluna<T> {
  chave: string; titulo: string; render?: (l: T) => ReactNode; alinhar?: 'dir';
  /** Valor do campo para filtro de número/data e para o Excel (padrão: o campo `chave`). */
  valor?: (l: T) => unknown;
  /** Texto como aparece na célula, para o filtro e o Excel (padrão: o valor formatado). */
  texto?: (l: T) => string;
  /** Valor de ordenação quando o campo não basta (ex.: nome da pessoa a partir do id). */
  ordem?: (l: T) => unknown;
  /** Coluna de ação: fica no fim, não ordena, não filtra, não move, não some e não vai para o Excel. */
  fixa?: boolean;
}

const LARG_MIN = 40, LARG_PADRAO = 140, MAX_VALORES = 500;
const dataBR = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/** Valor bruto da coluna (primitivo). */
function valorDe<T extends Record<string, unknown>>(c: Coluna<T>, l: T): unknown {
  return c.valor ? c.valor(l) : l[c.chave];
}
/** Texto da célula: o informado pela coluna, o rótulo de ordenação (quando é texto) ou o campo formatado. */
function textoDe<T extends Record<string, unknown>>(c: Coluna<T>, l: T): string {
  if (c.texto) return c.texto(l) ?? '';
  if (c.ordem) { const o = c.ordem(l); if (typeof o === 'string') return o; }
  const v = valorDe(c, l);
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(x => (x && typeof x === 'object' ? (x as { nome?: string }).nome ?? '' : String(x))).join(', ');
  if (typeof v === 'object') return String((v as { nome?: unknown }).nome ?? '');
  if (typeof v === 'number') return v.toLocaleString('pt-BR');
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? dataBR(String(v)) : String(v);
}

export function Tabela<T extends Record<string, unknown>>({ id, nome, colunas, linhas, chave, tamanhoInicial = 10, vazio = 'Nada para mostrar.', aoClicar }: {
  /** Nome do layout salvo; sem ele, vale o conjunto de colunas. */
  id?: string;
  /** Nome do arquivo/aba do Excel (padrão: o id). */
  nome?: string;
  colunas: Coluna<T>[]; linhas: T[]; chave: (l: T) => string; tamanhoInicial?: number; vazio?: string; aoClicar?: (l: T) => void;
}) {
  const moveis = colunas.filter(c => !c.fixa);
  const idLayout = id ?? moveis.map(c => c.chave).join(',');
  const chaves = moveis.map(c => c.chave).join(',');
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(tamanhoInicial);
  const [ord, setOrd] = useState<{ chave: string | null; desc: boolean }>({ chave: null, desc: false });
  const [salvo, setSalvo] = useState<Partial<Layout> | null>(() => lerLayout(idLayout));
  const [seletor, setSeletor] = useState(false);
  const [arrasto, setArrasto] = useState<{ de: string; para?: string; depois?: boolean } | null>(null);
  const [filtros, setFiltros] = useState<Record<string, Filtro>>({});
  const [funil, setFunil] = useState<string | null>(null);
  const [larg, setLarg] = useState<Record<string, number> | null>(null);   // largura durante o arraste da alça
  useEffect(() => setPagina(1), [linhas.length, tamanho, filtros]);
  useEffect(() => setSalvo(lerLayout(idLayout)), [idLayout]);

  const layout = useMemo(() => normalizar(chaves.split(','), salvo), [chaves, salvo]);
  const porChave = new Map(colunas.map(c => [c.chave, c]));
  const visiveis = [...layout.ordem.filter(k => !layout.ocultas.includes(k)).map(k => porChave.get(k)!), ...colunas.filter(c => c.fixa)];
  const trocar = (l: Layout | null) => { gravarLayout(idLayout, l); setSalvo(l); };
  const tipos = useMemo(() => new Map(moveis.map(c => [c.chave, deduzirTipo(linhas.slice(0, 200).map(l => valorDe(c, l)))])),
    [linhas, chaves]); // eslint-disable-line react-hooks/exhaustive-deps

  // filtros das colunas (somam); 'exceto' = coluna do funil aberto, para a lista de valores dela
  const filtradas = (exceto?: string) => linhas.filter(l => Object.entries(filtros).every(([k, f]) => {
    const c = porChave.get(k);
    return !c || k === exceto || !ativo(f) || passa(f, tipos.get(k) ?? 'S', textoDe(c, l), valorDe(c, l));
  }));
  const comFiltro = Object.values(filtros).some(ativo);
  const base = comFiltro ? filtradas() : linhas;
  const colOrd = ord.chave ? porChave.get(ord.chave) : undefined;
  const ordenadas = ordenar(base, colOrd ? (colOrd.ordem ?? ((l: T) => valorOrdem(valorDe(colOrd, l)))) : null, ord.desc);
  const p = paginar(ordenadas, pagina, tamanho);
  const ordenarPor = (k: string) => { setOrd(o => ({ chave: k, desc: o.chave === k ? !o.desc : false })); setPagina(1); };

  // larguras: no <colgroup> (com table-layout fixo), uma por coluna visível; sem nenhuma salva, a tabela se ajusta sozinha
  const largs = larg ?? layout.larguras;
  const largDe = (k: string) => largs?.[k] ?? LARG_PADRAO;
  const iniciarLargura = (e: PE<HTMLElement>, k: string) => {
    e.preventDefault(); e.stopPropagation();
    const ths = [...(e.currentTarget.closest('tr')?.children ?? [])] as HTMLElement[];
    const atual: Record<string, number> = {};
    visiveis.forEach((c, i) => { atual[c.chave] = largs?.[c.chave] ?? Math.max(LARG_MIN, Math.round(ths[i]?.getBoundingClientRect().width ?? LARG_PADRAO)); });
    const x0 = e.clientX, w0 = atual[k];
    let ultimo = atual;
    document.body.classList.add('redimensionando');
    const mexer = (ev: PointerEvent) => { ultimo = { ...atual, [k]: Math.min(1200, Math.max(LARG_MIN, Math.round(w0 + ev.clientX - x0))) }; setLarg(ultimo); };
    const soltar = () => {
      document.removeEventListener('pointermove', mexer);
      document.removeEventListener('pointerup', soltar);
      document.body.classList.remove('redimensionando');
      setLarg(null);
      trocar({ ...layout, larguras: ultimo });
    };
    document.addEventListener('pointermove', mexer);
    document.addEventListener('pointerup', soltar);
  };
  const restaurarLarguras = () => { const { larguras: _, ...resto } = layout; trocar(resto); };

  // arrastar o título (mouse): a barra verde marca se a coluna vai antes ou depois da que está sob o ponteiro
  const sobre = (e: DragEvent, k: string) => {
    if (!arrasto || arrasto.de === k || porChave.get(k)?.fixa) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const depois = e.clientX > r.left + r.width / 2;
    if (arrasto.para !== k || arrasto.depois !== depois) setArrasto({ ...arrasto, para: k, depois });
  };
  const soltar = (e: DragEvent) => {
    e.preventDefault();
    if (arrasto?.para) trocar({ ...layout, ordem: mover(layout.ordem, arrasto.de, arrasto.para, arrasto.depois) });
    setArrasto(null);
  };

  const excel = () => {
    const cols = visiveis.filter(c => !c.fixa);
    const tipo = (c: Coluna<T>): TipoXlsx => {
      const t = tipos.get(c.chave);
      if (t === 'D') return 'D';
      if (t !== 'N') return 'S';
      return ordenadas.every(l => { const v = valorDe(c, l); return v == null || Number.isInteger(v); }) ? 'I' : 'V';
    };
    const ts = cols.map(tipo);
    const arq = nome ?? id ?? 'tabela';
    baixarXlsx(`${arq}_${new Date().toISOString().slice(0, 10)}`, {
      aba: arq, colunas: cols.map((c, j) => ({ titulo: c.titulo, tipo: ts[j] })),
      linhas: ordenadas.map(l => cols.map((c, j) => (ts[j] === 'S' ? textoDe(c, l) : valorDe(c, l)))),
    });
  };
  // CSV (";" e vírgula decimal): o texto de cada célula, como na tela
  const csv = () => {
    const cols = visiveis.filter(c => !c.fixa);
    baixarCsv(nome ?? id ?? 'tabela', cols.map(c => c.titulo), ordenadas.map(l => cols.map(c => textoDe(c, l))));
  };

  const fixa = !!largs;
  const colFunil = funil ? porChave.get(funil) : undefined;
  return (
    <div className="tabela-caixa">
      <div className="tabela-rolagem">
        <table className={`tabela${fixa ? ' fixa' : ''}`} style={fixa ? { width: visiveis.reduce((s, c) => s + largDe(c.chave), 0) } : undefined}>
          {fixa && <colgroup>{visiveis.map(c => <col key={c.chave} style={{ width: largDe(c.chave) }} />)}</colgroup>}
          <thead>
            <tr>{visiveis.map(c => {
              const alvo = arrasto?.para === c.chave ? (arrasto.depois ? ' drop-dir' : ' drop-esq') : '';
              const cls = `${c.alinhar === 'dir' ? 'dir' : ''}${c.fixa ? '' : ' movel'}${arrasto?.de === c.chave ? ' drag-origem' : ''}${alvo}`.trim();
              const filtrada = ativo(filtros[c.chave]);
              return (
                <th key={c.chave} className={cls || undefined} data-k={c.chave}
                  aria-sort={c.fixa ? undefined : ord.chave === c.chave ? (ord.desc ? 'descending' : 'ascending') : 'none'}
                  draggable={!c.fixa} title={c.fixa ? undefined : 'Clique para ordenar; arraste para mudar a coluna de lugar'}
                  onDragStart={c.fixa ? undefined : e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.chave); setArrasto({ de: c.chave }); }}
                  onDragOver={e => sobre(e, c.chave)} onDrop={soltar} onDragEnd={() => setArrasto(null)}>
                  {c.fixa ? <span className="so-leitor">{c.titulo}</span> : (
                    <span className="th-c">
                      <button type="button" className="th-tit" onClick={() => ordenarPor(c.chave)}>
                        {c.titulo}<span className="th-ordem" aria-hidden>{ord.chave === c.chave ? (ord.desc ? '▾' : '▴') : ''}</span>
                      </button>
                      <button type="button" className={`fb${filtrada ? ' ativo' : ''}`} aria-label={`Filtrar ${c.titulo}`} aria-pressed={filtrada}
                        title={filtrada ? 'Filtro aplicado nesta coluna' : 'Filtrar esta coluna'} onClick={() => setFunil(c.chave)}>
                        <Icone nome="funil" tam={12} cheio={filtrada} />
                      </button>
                    </span>
                  )}
                  <i className="rz" title="Arraste para ajustar a largura; duplo clique restaura" draggable
                    onDragStart={e => { e.preventDefault(); e.stopPropagation(); }}
                    onPointerDown={e => iniciarLargura(e, c.chave)} onDoubleClick={restaurarLarguras} />
                </th>
              );
            })}</tr>
          </thead>
          <tbody>
            {p.itens.length === 0 && <tr><td colSpan={visiveis.length} className="tabela-vazia">{comFiltro ? 'Nenhuma linha com os filtros aplicados.' : vazio}</td></tr>}
            {p.itens.map(l => (
              <tr key={chave(l)} onClick={aoClicar ? () => aoClicar(l) : undefined} className={aoClicar ? 'clicavel' : undefined}>
                {visiveis.map(c => <td key={c.chave} className={c.alinhar === 'dir' ? 'dir' : undefined}>{c.render ? c.render(l) : textoDe(c, l)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tabela-rodape">
        <span className="tabela-rodape-esq">
          <label>Por página{' '}
            <select value={tamanho} onChange={e => setTamanho(Number(e.target.value))} aria-label="Linhas por página">
              {TAMANHOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {moveis.length > 1 && (
            <button type="button" className="link tabela-acao" onClick={() => setSeletor(true)}>
              <Icone nome="grade" tam={14} /> Colunas{layout.ocultas.length ? ` (${layout.ocultas.length} oculta${layout.ocultas.length > 1 ? 's' : ''})` : ''}
            </button>
          )}
          <button type="button" className="link tabela-acao" onClick={excel} disabled={!ordenadas.length} title="Baixar as linhas filtradas em Excel (.xlsx)">
            <Icone nome="baixar" tam={14} /> Excel
          </button>
          <button type="button" className="link tabela-acao" onClick={csv} disabled={!ordenadas.length} title="Baixar as linhas filtradas em CSV">
            <Icone nome="baixar" tam={14} /> CSV
          </button>
        </span>
        <span className="tabela-rotulo">
          {comFiltro ? <>{base.length.toLocaleString('pt-BR')} de {linhas.length.toLocaleString('pt-BR')} registros ·{' '}
            <button type="button" className="link" onClick={() => setFiltros({})}>Limpar filtros</button> · </> : null}
          {p.rotulo}
        </span>
        <span className="tabela-nav">
          <button type="button" className="bt bt-fantasma" disabled={p.pagina <= 1} onClick={() => setPagina(p.pagina - 1)} aria-label="Página anterior">‹</button>
          <span>{p.pagina}/{p.paginas}</span>
          <button type="button" className="bt bt-fantasma" disabled={p.pagina >= p.paginas} onClick={() => setPagina(p.pagina + 1)} aria-label="Próxima página">›</button>
        </span>
      </div>
      <Popup aberto={seletor} titulo="Colunas" aoFechar={() => setSeletor(false)} largura={420}
        rodape={<>
          <button type="button" className="bt bt-fantasma" onClick={() => trocar(null)}>Restaurar padrão</button>
          <button type="button" className="bt bt-primario" onClick={() => setSeletor(false)}>Pronto</button>
        </>}>
        <p className="ajuda">Marque as colunas que aparecem e use ↑ ↓ para a ordem. Na tela, arrastar o título também muda a coluna de lugar.</p>
        <ol className="lista-colunas">
          {layout.ordem.map((k, i) => {
            const c = porChave.get(k)!, vis = !layout.ocultas.includes(k);
            return (
              <li key={k} className={vis ? undefined : 'oculta'}>
                <label><input type="checkbox" checked={vis} onChange={() => trocar(alternar(layout, k))}
                  disabled={vis && layout.ordem.length - layout.ocultas.length <= 1} /> {c.titulo}</label>
                <button type="button" className="seta-col" aria-label={`Subir ${c.titulo}`} disabled={i === 0}
                  onClick={() => trocar({ ...layout, ordem: deslocar(layout.ordem, k, -1) })}>↑</button>
                <button type="button" className="seta-col" aria-label={`Descer ${c.titulo}`} disabled={i === layout.ordem.length - 1}
                  onClick={() => trocar({ ...layout, ordem: deslocar(layout.ordem, k, 1) })}>↓</button>
              </li>
            );
          })}
        </ol>
      </Popup>
      {colFunil && (
        <FiltroColuna key={colFunil.chave} titulo={colFunil.titulo} tipo={tipos.get(colFunil.chave) ?? 'S'} atual={filtros[colFunil.chave]}
          valores={filtradas(colFunil.chave).map(l => textoDe(colFunil, l))}
          aoFechar={() => setFunil(null)}
          aoAplicar={f => { setFiltros(fs => { const n = { ...fs }; if (f && ativo(f)) n[colFunil.chave] = f; else delete n[colFunil.chave]; return n; }); setFunil(null); }} />
      )}
    </div>
  );
}

/** Popup do funil: condição (texto/número/data) + lista de valores distintos com contagem, pesquisa e "Selecionar todos". */
function FiltroColuna({ titulo, tipo, atual, valores, aoFechar, aoAplicar }: {
  titulo: string; tipo: TipoColuna; atual?: Filtro; valores: string[]; aoFechar: () => void; aoAplicar: (f: Filtro | null) => void;
}) {
  const ops = tipo === 'S' ? OPS_TEXTO : OPS_NUMERO;
  const [op, setOp] = useState<Operador>(atual?.op ?? (tipo === 'S' ? 'ct' : 'eq'));
  const [v, setV] = useState(atual?.v ?? '');
  const [v2, setV2] = useState(atual?.v2 ?? '');
  const [busca, setBusca] = useState('');
  const { todos, cont } = useMemo(() => {
    const cont = new Map<string, number>();
    for (const t of valores) cont.set(t, (cont.get(t) ?? 0) + 1);
    const col = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
    return { todos: [...cont.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : col.compare(a, b))), cont };
  }, [valores]);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(atual?.valores ?? todos));
  const vis = todos.filter(t => !busca.trim() || normal(t).includes(normal(busca))).slice(0, MAX_VALORES);
  const todosVis = vis.length > 0 && vis.every(t => marcados.has(t));
  const tipoCampo = tipo === 'D' ? 'date' : 'text';
  const aplicar = () => aoAplicar({ op, v: v.trim(), v2: v2.trim(), valores: todos.some(t => !marcados.has(t)) ? todos.filter(t => marcados.has(t)) : undefined });
  return (
    <Popup aberto titulo={`Filtrar: ${titulo}`} aoFechar={aoFechar} largura={380}
      rodape={<>
        <button type="button" className="bt bt-fantasma" onClick={() => aoAplicar(null)}>Limpar filtro</button>
        <button type="button" className="bt bt-primario" onClick={aplicar}>Aplicar</button>
      </>}>
      <form className="filtro-col" onSubmit={e => { e.preventDefault(); aplicar(); }}>
        <label className="filtro-rot">Condição
          <select value={op} onChange={e => setOp(e.target.value as Operador)}>{ops.map(([k, r]) => <option key={k} value={k}>{r}</option>)}</select>
        </label>
        {op !== 'bl' && op !== 'nb' && (
          <span className="filtro-vals">
            <input type={tipoCampo} inputMode={tipo === 'N' ? 'decimal' : undefined} aria-label="Valor" placeholder="Valor" value={v} onChange={e => setV(e.target.value)} />
            {op === 'bt' && <input type={tipoCampo} inputMode={tipo === 'N' ? 'decimal' : undefined} aria-label="Até" placeholder="e" value={v2} onChange={e => setV2(e.target.value)} />}
          </span>
        )}
        <span className="filtro-rot filtro-sep">Valores</span>
        <input type="search" placeholder="Pesquisar valores…" aria-label="Pesquisar valores" value={busca} onChange={e => setBusca(e.target.value)} />
        <label className="filtro-todos"><input type="checkbox" checked={todosVis}
          onChange={() => setMarcados(m => { const n = new Set(m); vis.forEach(t => (todosVis ? n.delete(t) : n.add(t))); return n; })} /> (Selecionar todos)</label>
        <div className="filtro-lista" role="group" aria-label="Valores">
          {vis.map(t => (
            <label key={t}><input type="checkbox" checked={marcados.has(t)}
              onChange={() => setMarcados(m => { const n = new Set(m); if (n.has(t)) n.delete(t); else n.add(t); return n; })} />
              <span>{t === '' ? '(vazio)' : t}</span><i>{cont.get(t)}</i></label>
          ))}
        </div>
        <small className="ajuda">{todos.length > MAX_VALORES ? `Mostrando ${MAX_VALORES} de ${todos.length} valores; use a pesquisa ou a condição.` : `${todos.length} valores`}</small>
        <button type="submit" hidden />
      </form>
    </Popup>
  );
}
