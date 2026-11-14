// Markdown simples dos manuais → blocos (sem HTML cru: a tela monta os elementos, nada vai por innerHTML).
// Aceita: # título, ## seção, ### subtítulo, parágrafo, - lista, 1. lista numerada, | tabela |, ![legenda](arquivo)
// e, dentro do texto, **negrito**, *itálico*, `código` e [link](url).

export type Trecho = { t: 'texto' | 'negrito' | 'italico' | 'codigo'; v: string } | { t: 'link'; v: string; url: string };
export type Bloco =
  | { tipo: 'titulo'; nivel: 1 | 2 | 3; texto: string; id: string }
  | { tipo: 'paragrafo'; trechos: Trecho[] }
  | { tipo: 'lista'; numerada: boolean; itens: Trecho[][] }
  | { tipo: 'tabela'; cabecalho: Trecho[][]; linhas: Trecho[][][] }
  | { tipo: 'imagem'; src: string; legenda: string };

export interface Secao { id: string; titulo: string; blocos: Bloco[] }
export interface Documento { titulo: string; abertura: Bloco[]; secoes: Secao[] }

/** Sem acento e em minúsculas (busca e âncoras). */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const ancora = (s: string) => normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Texto de uma linha → trechos com negrito/itálico/código/link. */
export function trechos(linha: string): Trecho[] {
  const r: Trecho[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((\S+?)\)/g;
  let i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(linha))) {
    if (m.index > i) r.push({ t: 'texto', v: linha.slice(i, m.index) });
    if (m[1] !== undefined) r.push({ t: 'negrito', v: m[1] });
    else if (m[2] !== undefined) r.push({ t: 'italico', v: m[2] });
    else if (m[3] !== undefined) r.push({ t: 'codigo', v: m[3] });
    else r.push({ t: 'link', v: m[4], url: m[5] });
    i = m.index + m[0].length;
  }
  if (i < linha.length) r.push({ t: 'texto', v: linha.slice(i) });
  return r;
}

const celulas = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => trechos(c.trim()));

/** Markdown → blocos. */
export function blocos(md: string): Bloco[] {
  const out: Bloco[] = [];
  const ls = md.replace(/\r/g, '').split('\n');
  const usados = new Map<string, number>();
  const idUnico = (t: string) => { const b = ancora(t) || 'secao'; const n = usados.get(b) ?? 0; usados.set(b, n + 1); return n ? `${b}-${n + 1}` : b; };
  for (let i = 0; i < ls.length;) {
    const l = ls[i];
    if (!l.trim()) { i++; continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(l);
    if (h) { out.push({ tipo: 'titulo', nivel: h[1].length as 1 | 2 | 3, texto: h[2].trim(), id: idUnico(h[2].trim()) }); i++; continue; }
    const img = /^!\[(.*?)\]\((\S+?)\)\s*$/.exec(l.trim());
    if (img) { out.push({ tipo: 'imagem', legenda: img[1], src: img[2] }); i++; continue; }
    if (l.trim().startsWith('|')) {
      const tab: string[] = [];
      while (i < ls.length && ls[i].trim().startsWith('|')) tab.push(ls[i++]);
      const corpo = tab.slice(1).filter(x => !/^\s*\|?\s*:?-{2,}/.test(x));
      out.push({ tipo: 'tabela', cabecalho: celulas(tab[0]), linhas: corpo.map(celulas) });
      continue;
    }
    const item = /^\s*(-|\*|\d+\.)\s+(.*)$/;
    if (item.test(l) && !/^\*\S.*\*$/.test(l.trim())) {
      const numerada = /^\s*\d+\./.test(l);
      const itens: Trecho[][] = [];
      while (i < ls.length && item.test(ls[i]) && /^\s*\d+\./.test(ls[i]) === numerada) itens.push(trechos(item.exec(ls[i++])![2]));
      out.push({ tipo: 'lista', numerada, itens });
      continue;
    }
    const par: string[] = [];
    while (i < ls.length && ls[i].trim() && !/^(#{1,3}\s|!\[|\|)/.test(ls[i].trim()) && !(item.test(ls[i]) && !/^\*\S.*\*$/.test(ls[i].trim()))) par.push(ls[i++].trim());
    out.push({ tipo: 'paragrafo', trechos: trechos(par.join(' ')) });
  }
  return out;
}

/** Documento em seções (cada ## abre uma): é o índice da leitura e a unidade da busca. */
export function documento(md: string): Documento {
  const bs = blocos(md);
  const doc: Documento = { titulo: '', abertura: [], secoes: [] };
  for (const b of bs) {
    if (b.tipo === 'titulo' && b.nivel === 1 && !doc.titulo) { doc.titulo = b.texto; continue; }
    if (b.tipo === 'titulo' && b.nivel === 2) { doc.secoes.push({ id: b.id, titulo: b.texto, blocos: [] }); continue; }
    (doc.secoes.length ? doc.secoes[doc.secoes.length - 1].blocos : doc.abertura).push(b);
  }
  return doc;
}

const textoTrechos = (ts: Trecho[]) => ts.map(t => t.v).join('');
/** Texto corrido de um bloco (para a busca). */
export function textoBloco(b: Bloco): string {
  switch (b.tipo) {
    case 'titulo': return b.texto;
    case 'paragrafo': return textoTrechos(b.trechos);
    case 'lista': return b.itens.map(textoTrechos).join(' ');
    case 'tabela': return [b.cabecalho, ...b.linhas].map(l => l.map(textoTrechos).join(' ')).join(' ');
    case 'imagem': return b.legenda;
  }
}

export interface Achado { secao: Secao; trecho: string }

/** Seções que têm todas as palavras do termo (sem acento), com um trecho em volta da 1ª ocorrência. */
export function buscarNoDocumento(doc: Documento, termo: string): Achado[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  if (!palavras.length) return [];
  const r: Achado[] = [];
  for (const s of doc.secoes) {
    const texto = [s.titulo, ...s.blocos.map(textoBloco)].join(' ');
    const n = normalizar(texto);
    if (!palavras.every(p => n.includes(p))) continue;
    const pos = n.indexOf(palavras[0]);
    const ini = Math.max(0, pos - 50);
    r.push({ secao: s, trecho: (ini > 0 ? '…' : '') + texto.slice(ini, pos + 90).trim() + (pos + 90 < texto.length ? '…' : '') });
  }
  return r;
}
