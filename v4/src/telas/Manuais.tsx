// Manuais (#/manuais e #/manuais/<id>): os manuais da função (consultor vê os do consultor; as demais funções, todos) e
// os dos módulos que a pessoa enxerga no menu; busca nos manuais e leitura com índice, destaque do que foi buscado e
// impressão. O catálogo é src/manuais. Quem tem `doc_tecnica.ver` vê também a documentação técnica do projeto, que vem
// do banco (#/manuais/tec-<id>) e não está no pacote da PWA.
import { createContext, Fragment, useContext, useMemo, useState, type ReactNode } from 'react';
import { caminhoDoLink, docsTecnicos, idTecnico, PERMISSAO_DOC_TECNICA, PREFIXO_TEC } from '../api/docsTecnicos';
import { Botao } from '../componentes/Botao';
import { Icone } from '../componentes/Icone';
import { imagemManual, manuaisVisiveis, type Manual } from '../manuais';
import { buscarNoDocumento, documento, normalizar, type Bloco, type Documento, type Trecho } from '../manuais/markdown';
import { useCarga } from '../estado/carga';
import { usePode } from '../estado/equipe';
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

/** Na documentação técnica os links entre documentos ("banco.md") abrem o outro documento dentro do app. */
const Tecnico = createContext(false);

function Trechos({ ts, palavras }: { ts: Trecho[]; palavras: string[] }) {
  const tecnico = useContext(Tecnico);
  return <>{ts.map((t, i) => {
    const v = marcar(t.v, palavras);
    if (t.t === 'negrito') return <strong key={i}>{v}</strong>;
    if (t.t === 'italico') return <em key={i}>{v}</em>;
    if (t.t === 'codigo') return <code key={i}>{v}</code>;
    if (t.t === 'link' && tecnico) {
      const caminho = caminhoDoLink(t.url);
      if (caminho) return <a key={i} href={hashDe(caminho)}>{v}</a>;
      if (!/^https?:/.test(t.url)) return <code key={i}>{v}</code>;   // arquivo fora da pasta: só o nome
    }
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
    case 'codigo': return <pre className="manual-codigo"><code>{b.texto}</code></pre>;
    case 'citacao': return <blockquote className="manual-citacao"><Trechos ts={b.trechos} palavras={palavras} /></blockquote>;
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

/** Um documento técnico: o texto vem do banco, que confere a permissão a cada leitura. */
function DocTecnicoTela({ id }: { id: string }) {
  const esc = useSessao().eu!.escritorio_id!;
  const c = useCarga(() => docsTecnicos.ler(esc, id), [esc, id]);
  const doc = useMemo(() => (c.dados ? documento(c.dados.texto) : null), [c.dados]);
  if (c.erro) return <div className="vazio-tela"><h2>Documento não disponível</h2><p>{c.erro} <a href={hashDe('manuais')}>Ver os manuais</a></p></div>;
  if (!c.dados || !doc) return <div className="carregando-tela"><span className="giro" /> Carregando…</div>;
  const manual: Manual = { id: PREFIXO_TEC + c.dados.id, titulo: c.dados.titulo, resumo: c.dados.resumo, para: 'modulo', texto: c.dados.texto };
  return <Tecnico.Provider value><Leitura manual={manual} doc={doc} termoInicial="" /></Tecnico.Provider>;
}

/** Cartões da documentação técnica na lista de manuais (só é montado para quem tem a permissão). */
function SecaoTecnica() {
  const esc = useSessao().eu!.escritorio_id!;
  const c = useCarga(() => docsTecnicos.lista(esc), [esc]);
  if (c.erro || (c.dados && c.dados.length === 0)) return null;
  return (
    <section aria-label="Documentação técnica" data-testid="docs-tecnicos">
      <h2 className="secao">Documentação técnica</h2>
      <p className="ajuda">Como o sistema foi construído. Acesso restrito: só aparece para quem o Admin liberou em Equipe › Acessos (funcionalidade "Ler a documentação técnica do projeto").</p>
      {!c.dados ? <p className="ajuda"><span className="giro" /> Carregando…</p> : (
        <div className="grade-atalhos">
          {c.dados.map(d => (
            <a key={d.id} className="atalho manual-atalho" href={hashDe(`manuais/${PREFIXO_TEC}${d.id}`)}>
              <span className="atalho-icone"><Icone nome="cadeado" tam={24} /></span>
              <span className="atalho-nome">{d.titulo}<small className="ajuda">{d.resumo}</small></span>
              <Icone nome="seta" tam={18} className="atalho-seta" />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

export function Manuais({ id }: { id?: string }) {
  const { eu } = useSessao();
  const pode = usePode();
  const lista = useMemo(() => manuaisVisiveis(eu?.perfil, undefined, { permissoes: eu?.permissoes, fin: eu?.fin }), [eu?.perfil, eu?.permissoes, eu?.fin]);
  const docs = useMemo(() => new Map(lista.map(m => [m.id, documento(m.texto)])), [lista]);
  const [termo, setTermo] = useState('');
  const tec = idTecnico(id);
  if (tec) return <DocTecnicoTela id={tec} />;
  if (id) {
    const m = lista.find(x => x.id === id);
    if (!m) return <div className="vazio-tela"><h2>Manual não encontrado</h2><p>Este manual não existe ou é de um módulo que você não acessa. <a href={hashDe('manuais')}>Ver os manuais</a></p></div>;
    return <Leitura manual={m} doc={docs.get(m.id)!} termoInicial="" />;
  }
  const achados = termo.trim().length > 1
    ? lista.flatMap(m => buscarNoDocumento(docs.get(m.id)!, termo).map(a => ({ m, ...a }))) : null;
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Manuais</h1><p className="ajuda">Como usar o PMO na sua função. Abra um manual para ler com índice, buscar e imprimir.</p></div>
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
        <>
          {[{ t: 'Da sua função', l: lista.filter(m => m.para !== 'modulo') }, { t: 'Por módulo', l: lista.filter(m => m.para === 'modulo') }]
            .filter(g => g.l.length > 0).map(g => (
              <section key={g.t} aria-label={g.t}>
                <h2 className="secao">{g.t}</h2>
                <div className="grade-atalhos">
                  {g.l.map(m => (
                    <a key={m.id} className="atalho manual-atalho" href={hashDe(`manuais/${m.id}`)}>
                      <span className="atalho-icone"><Icone nome="livro" tam={24} /></span>
                      <span className="atalho-nome">{m.titulo}<small className="ajuda">{m.resumo}</small></span>
                      <Icone nome="seta" tam={18} className="atalho-seta" />
                    </a>
                  ))}
                </div>
              </section>
            ))}
          {pode(PERMISSAO_DOC_TECNICA) && <SecaoTecnica />}
        </>
      )}
    </div>
  );
}
