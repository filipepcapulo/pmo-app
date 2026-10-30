// Tabela paginada (10/15/30/50) com ordenação pelo cabeçalho. Os dados chegam já filtrados (a API pagina no banco
// quando a lista é grande; aqui é a página da tela).
import { useEffect, useState, type ReactNode } from 'react';
import { ordenar, paginar, TAMANHOS } from '../estado/paginacao';

export interface Coluna<T> { chave: keyof T & string; titulo: string; render?: (l: T) => ReactNode; alinhar?: 'dir' }

export function Tabela<T extends Record<string, unknown>>({ colunas, linhas, chave, tamanhoInicial = 10, vazio = 'Nada para mostrar.', aoClicar }: {
  colunas: Coluna<T>[]; linhas: T[]; chave: (l: T) => string; tamanhoInicial?: number; vazio?: string; aoClicar?: (l: T) => void;
}) {
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(tamanhoInicial);
  const [ord, setOrd] = useState<{ chave: string | null; desc: boolean }>({ chave: null, desc: false });
  useEffect(() => setPagina(1), [linhas.length, tamanho]);
  const p = paginar(ordenar(linhas, ord.chave, ord.desc), pagina, tamanho);
  return (
    <div className="tabela-caixa">
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead>
            <tr>{colunas.map(c => (
              <th key={c.chave} className={c.alinhar === 'dir' ? 'dir' : undefined}
                aria-sort={ord.chave === c.chave ? (ord.desc ? 'descending' : 'ascending') : 'none'}>
                <button type="button" onClick={() => { setOrd(o => ({ chave: c.chave, desc: o.chave === c.chave ? !o.desc : false })); setPagina(1); }}>
                  {c.titulo}{ord.chave === c.chave ? (ord.desc ? ' ▾' : ' ▴') : ''}
                </button>
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {p.itens.length === 0 && <tr><td colSpan={colunas.length} className="tabela-vazia">{vazio}</td></tr>}
            {p.itens.map(l => (
              <tr key={chave(l)} onClick={aoClicar ? () => aoClicar(l) : undefined} className={aoClicar ? 'clicavel' : undefined}>
                {colunas.map(c => <td key={c.chave} className={c.alinhar === 'dir' ? 'dir' : undefined}>{c.render ? c.render(l) : String(l[c.chave] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tabela-rodape">
        <label>Por página{' '}
          <select value={tamanho} onChange={e => setTamanho(Number(e.target.value))} aria-label="Linhas por página">
            {TAMANHOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <span className="tabela-rotulo">{p.rotulo}</span>
        <span className="tabela-nav">
          <button type="button" className="bt bt-fantasma" disabled={p.pagina <= 1} onClick={() => setPagina(p.pagina - 1)} aria-label="Página anterior">‹</button>
          <span>{p.pagina}/{p.paginas}</span>
          <button type="button" className="bt bt-fantasma" disabled={p.pagina >= p.paginas} onClick={() => setPagina(p.pagina + 1)} aria-label="Próxima página">›</button>
        </span>
      </div>
    </div>
  );
}
