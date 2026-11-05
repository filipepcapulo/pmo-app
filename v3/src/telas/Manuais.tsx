// Manuais (#/manuais e #/manuais/<id>): lista dos manuais da função (consultor vê os do consultor; as demais funções,
// todos), busca nos manuais e leitura com índice, destaque do que foi buscado e impressão. O catálogo é src/manuais.
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Botao } from '../componentes/Botao';
import { Icone } from '../componentes/Icone';
import { imagemManual, manuaisVisiveis, type Manual } from '../manuais';
import { buscarNoDocumento, documento, normalizar, type Bloco, type Documento, type Trecho } from '../manuais/markdown';
import { hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

/** Marca as palavras buscadas no texto (sem acento: "conferencia" acha "Conferência"). */
function marcar(texto: string, palavras: string[]): ReactNode {
  if (!palavras.length) return texto;
  const n = [...texto].map(c => normalizar(c) || ' ').join('');
  if (n.length !== texto.length) return texto;
  const faixas: [number, number][] = [];
  for (const p of palavras) for (let i = n.indexOf(p); i >= 0; i = n.indexOf(p, i + p.length)) faixas.push([i, i + p.length]);
  if (!faixas.length) return texto;
  faixas.sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let pos = 0;
  for (const [a, b] of faixas) {
    if (a < pos) continue;
    if (a > pos) out.push(texto.slice(pos, a));
    out.push(<mark key={a}>{texto.slice(a, b)}</mark>);
    pos = b;
  }
  out.push(texto.slice(pos));
  return out;
}

function Trechos({ ts, palavras }: { ts: Trecho[]; palavras: string[] }) {
  return <>{ts.map((t, i) => {
    const v = marcar(t.v, palavras);
    if (t.t === 'negrito') return <strong key={i}>{v}</strong>;
    if (t.t === 'italico') return <em key={i}>{v}</em>;
    if (t.t === 'codigo') return <code key={i}>{v}</code>;
    if (t.t === 'link') return <a key={i} href={t.url} target="_blank" rel="noopener noreferrer">{v}</a>;
    return <Fragment key={i}>{v}</Fragment>;
  })}</>;
}

function BlocoManual({ b, manual, palavras }: { b: Bloco; manual: string; palavras: string[] }) {
  switch (b.tipo) {
    case 'titulo': return <h4 id={`manual-${manual}-${b.id}`}>{marcar(b.texto, palavras)}</h4>;
    case 'paragrafo': return <p><Trechos ts={b.trechos} palavras={palavras} /></p>;
    case 'lista': {
      const Tag = b.numerada ? 'ol' : 'ul';
      return <Tag>{b.itens.map((it, i) => <li key={i}><Trechos ts={it} palavras={palavras} /></li>)}</Tag>;
    }
    case 'tabela': return (
      <div className="manual-tabela"><table>
        <thead><tr>{b.cabecalho.map((c, i) => <th key={i}><Trechos ts={c} palavras={palavras} /></th>)}</tr></thead>
        <tbody>{b.linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j}><Trechos ts={c} palavras={palavras} /></td>)}</tr>)}</tbody>
      </table></div>
    );
    case 'imagem': return (
      <figure className="manual-figura"><img src={imagemManual(manual, b.src)} alt={b.legenda} /></figure>
    );
  }
}

const rolarPara = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function Leitura({ manual, doc, termoInicial }: { manual: Manual; doc: Documento; termoInicial: string }) {
  const [termo, setTermo] = useState(termoInicial);
  const palavras = useMemo(() => normalizar(termo).split(/\s+/).filter(p => p.length > 1), [termo]);
  const achados = useMemo(() => (palavras.length ? buscarNoDocumento(doc, termo) : null), [doc, termo, palavras.length]);
  const idSecao = (s: string) => `manual-${manual.id}-${s}`;
  return (
    <div className="pagina manual">
      <header className="pagina-topo manual-topo">
        <div>
          <a className="link" href={hashDe('manuais')}>‹ Manuais</a>
          <h1>{doc.titulo || manual.titulo}</h1>
        </div>
        <div className="linha manual-acoes">
          <input type="search" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar neste manual" aria-label="Buscar neste manual" />
          <Botao onClick={() => window.print()}><Icone nome="imprimir" tam={18} /> Imprimir</Botao>
        </div>
      </header>
      <div className="manual-corpo">
        <nav className="manual-indice cartao" aria-label="Índice do manual">
          <strong>Índice</strong>
          {achados && <p className="ajuda">{achados.length ? `${achados.length} seção(ões) com “${termo.trim()}”` : `Nada com “${termo.trim()}”.`}</p>}
          <ol>
            {doc.secoes.map(s => {
              const tem = !achados || achados.some(a => a.secao.id === s.id);
              return <li key={s.id} className={tem ? '' : 'manual-apagado'}>
                <button type="button" className="link" onClick={() => rolarPara(idSecao(s.id))}>{s.titulo}</button>
              </li>;
            })}
          </ol>
        </nav>
        <article className="manual-texto cartao" data-testid="manual-texto">
          {doc.abertura.map((b, i) => <BlocoManual key={i} b={b} manual={manual.id} palavras={palavras} />)}
          {doc.secoes.map(s => (
            <section key={s.id} id={idSecao(s.id)} className="manual-secao">
              <h2>{marcar(s.titulo, palavras)}</h2>
              {s.blocos.map((b, i) => <BlocoManual key={i} b={b} manual={manual.id} palavras={palavras} />)}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

export function Manuais({ id }: { id?: string }) {
  const { eu } = useSessao();
  const lista = useMemo(() => manuaisVisiveis(eu?.perfil), [eu?.perfil]);
  const docs = useMemo(() => new Map(lista.map(m => [m.id, documento(m.texto)])), [lista]);
  const [termo, setTermo] = useState('');
  if (id) {
    const m = lista.find(x => x.id === id);
    if (!m) return <div className="vazio-tela"><h2>Manual não encontrado</h2><p>Este manual não existe ou não é da sua função. <a href={hashDe('manuais')}>Ver os manuais</a></p></div>;
    return <Leitura manual={m} doc={docs.get(m.id)!} termoInicial="" />;
  }
  const achados = termo.trim().length > 1
    ? lista.flatMap(m => buscarNoDocumento(docs.get(m.id)!, termo).map(a => ({ m, ...a }))) : null;
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Manuais</h1><p className="ajuda">Como usar o PMO v3 na sua função. Abra um manual para ler com índice, buscar e imprimir.</p></div>
      </header>
      <div className="barra-filtros">
        <input type="search" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar nos manuais" aria-label="Buscar nos manuais" />
      </div>
      {achados ? (
        <section className="cartao" aria-label="Resultado da busca">
          {achados.length === 0 ? <p className="ajuda">Nada encontrado com “{termo.trim()}”.</p> : (
            <ul className="manual-achados">
              {achados.map(a => (
                <li key={a.m.id + a.secao.id}>
                  <a href={hashDe(`manuais/${a.m.id}`)}><strong>{a.m.titulo}</strong> · {a.secao.titulo}</a>
                  <small className="ajuda">{a.trecho}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="grade-atalhos">
          {lista.map(m => (
            <a key={m.id} className="atalho manual-atalho" href={hashDe(`manuais/${m.id}`)}>
              <span className="atalho-icone"><Icone nome="livro" tam={24} /></span>
              <span className="atalho-nome">{m.titulo}<small className="ajuda">{m.resumo}</small></span>
              <Icone nome="seta" tam={18} className="atalho-seta" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
