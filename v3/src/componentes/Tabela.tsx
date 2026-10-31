// Tabela paginada (10/15/30/50) no padrão das grades dos dashboards Sankhya: toda coluna ordena pelo cabeçalho
// (▴/▾), arrastar o título move a coluna e o botão "Colunas" mostra/oculta e reordena (também no celular). O layout
// fica salvo neste navegador, por tabela. Os dados chegam já filtrados (a API pagina no banco quando a lista é grande).
import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { alternar, deslocar, gravarLayout, lerLayout, mover, normalizar, type Layout } from '../estado/colunas';
import { ordenar, paginar, TAMANHOS } from '../estado/paginacao';
import { Icone } from './Icone';
import { Popup } from './Popup';

export interface Coluna<T> {
  chave: string; titulo: string; render?: (l: T) => ReactNode; alinhar?: 'dir';
  /** Valor de ordenação quando o campo não basta (ex.: nome da pessoa a partir do id). */
  ordem?: (l: T) => unknown;
  /** Coluna de ação: fica no fim, não ordena, não move e não some. */
  fixa?: boolean;
}

export function Tabela<T extends Record<string, unknown>>({ id, colunas, linhas, chave, tamanhoInicial = 10, vazio = 'Nada para mostrar.', aoClicar }: {
  /** Nome do layout salvo; sem ele, vale o conjunto de colunas. */
  id?: string; colunas: Coluna<T>[]; linhas: T[]; chave: (l: T) => string; tamanhoInicial?: number; vazio?: string; aoClicar?: (l: T) => void;
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
  useEffect(() => setPagina(1), [linhas.length, tamanho]);
  useEffect(() => setSalvo(lerLayout(idLayout)), [idLayout]);

  const layout = useMemo(() => normalizar(chaves.split(','), salvo), [chaves, salvo]);
  const porChave = new Map(colunas.map(c => [c.chave, c]));
  const visiveis = [...layout.ordem.filter(k => !layout.ocultas.includes(k)).map(k => porChave.get(k)!), ...colunas.filter(c => c.fixa)];
  const trocar = (l: Layout | null) => { gravarLayout(idLayout, l); setSalvo(l); };

  const colOrd = ord.chave ? porChave.get(ord.chave) : undefined;
  const p = paginar(ordenar(linhas, colOrd ? (colOrd.ordem ?? colOrd.chave) : null, ord.desc), pagina, tamanho);
  const ordenarPor = (k: string) => { setOrd(o => ({ chave: k, desc: o.chave === k ? !o.desc : false })); setPagina(1); };

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

  return (
    <div className="tabela-caixa">
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead>
            <tr>{visiveis.map(c => {
              const alvo = arrasto?.para === c.chave ? (arrasto.depois ? ' drop-dir' : ' drop-esq') : '';
              const cls = `${c.alinhar === 'dir' ? 'dir' : ''}${c.fixa ? '' : ' movel'}${arrasto?.de === c.chave ? ' drag-origem' : ''}${alvo}`.trim();
              return (
                <th key={c.chave} className={cls || undefined} data-k={c.chave}
                  aria-sort={c.fixa ? undefined : ord.chave === c.chave ? (ord.desc ? 'descending' : 'ascending') : 'none'}
                  draggable={!c.fixa} title={c.fixa ? undefined : 'Clique para ordenar; arraste para mudar a coluna de lugar'}
                  onDragStart={c.fixa ? undefined : e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.chave); setArrasto({ de: c.chave }); }}
                  onDragOver={e => sobre(e, c.chave)} onDrop={soltar} onDragEnd={() => setArrasto(null)}>
                  {c.fixa ? <span className="so-leitor">{c.titulo}</span> : (
                    <button type="button" onClick={() => ordenarPor(c.chave)}>
                      {c.titulo}<span className="th-ordem" aria-hidden>{ord.chave === c.chave ? (ord.desc ? '▾' : '▴') : ''}</span>
                    </button>
                  )}
                </th>
              );
            })}</tr>
          </thead>
          <tbody>
            {p.itens.length === 0 && <tr><td colSpan={visiveis.length} className="tabela-vazia">{vazio}</td></tr>}
            {p.itens.map(l => (
              <tr key={chave(l)} onClick={aoClicar ? () => aoClicar(l) : undefined} className={aoClicar ? 'clicavel' : undefined}>
                {visiveis.map(c => <td key={c.chave} className={c.alinhar === 'dir' ? 'dir' : undefined}>{c.render ? c.render(l) : String(l[c.chave] ?? '')}</td>)}
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
            <button type="button" className="link tabela-colunas" onClick={() => setSeletor(true)}>
              <Icone nome="grade" tam={14} /> Colunas{layout.ocultas.length ? ` (${layout.ocultas.length} oculta${layout.ocultas.length > 1 ? 's' : ''})` : ''}
            </button>
          )}
        </span>
        <span className="tabela-rotulo">{p.rotulo}</span>
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
    </div>
  );
}
