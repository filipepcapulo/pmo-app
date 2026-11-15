// Documento em PDF de várias páginas (V4 4.3.0: relatório de produtividade por consultor): título, subtítulo e tabelas
// com quebra de linha nas células e quebra de página (o cabeçalho da tabela se repete). O PDF sai com texto de verdade
// (Helvetica; leve e selecionável), sem biblioteca; o canvas só mede a largura dos textos. A4 em retrato. Roda só no navegador.
import { baixarArquivo } from './csv';
import { gerarPdfTexto, textoWinAnsi } from './pdf';

export interface ColunaDoc { titulo: string; dir?: boolean; /** texto longo: ocupa a sobra da largura e quebra linha */ quebra?: boolean }
export interface TabelaDoc { titulo?: string; colunas: ColunaDoc[]; linhas: string[][]; destacarUltima?: boolean; nota?: string; /** texto quando não há linhas */ vazio?: string }
export interface DocumentoPdf { titulo: string; subtitulo?: string; tabelas: TabelaDoc[]; rodape?: string }

/** Quebra o texto em linhas que caibam em `larg` (palavra maior que a linha é cortada no meio). */
export function quebrar(texto: string, larg: number, medir: (s: string) => number): string[] {
  const out: string[] = [];
  for (const par of texto.split('\n')) {
    let atual = '';
    for (let palavra of par.split(/\s+/).filter(Boolean)) {
      while (medir(palavra) > larg && palavra.length > 1) {
        if (atual) { out.push(atual); atual = ''; }
        let n = palavra.length - 1;
        while (n > 1 && medir(palavra.slice(0, n)) > larg) n--;
        out.push(palavra.slice(0, n));
        palavra = palavra.slice(n);
      }
      const tenta = atual ? `${atual} ${palavra}` : palavra;
      if (medir(tenta) <= larg) atual = tenta; else { out.push(atual); atual = palavra; }
    }
    out.push(atual);
  }
  return out;
}

const W = 595, H = 842, M = 28, PAD = 5, LINHA = 11, TAM = 8.5, RODAPE = 18;
/** O que desenhar numa página, em pontos, com o y de cima para baixo. */
type Op = { t: 'r'; x: number; y: number; w: number; h: number; cor: string }
  | { t: 't'; s: string; x: number; y: number; tam: number; negrito: boolean; cor: string; larg: number; dir: boolean };
type Medir = (s: string, tam: number, negrito: boolean) => number;

/** Distribui o documento em páginas: cada página é a lista do que desenhar. */
export function paginar(doc: DocumentoPdf, medida: Medir): Op[][] {
  const paginas: Op[][] = [[]];
  const util = W - 2 * M, fundo = H - M - RODAPE;
  let y = M;
  const op = (o: Op) => paginas[paginas.length - 1].push(o);
  const nova = () => { paginas.push([]); y = M; };
  /** `yy` é o meio da linha do texto. */
  const texto = (s: string, x: number, yy: number, tam: number, negrito: boolean, cor: string, dir = false) => {
    if (s) op({ t: 't', s, x, y: yy, tam, negrito, cor, larg: medida(s, tam, negrito), dir });
  };
  const medir = (tam: number, negrito = false) => (s: string) => medida(s, tam, negrito);

  texto(doc.titulo, M, y + 9, 15, true, '#111827'); y += 22;
  if (doc.subtitulo) { texto(doc.subtitulo, M, y + 6, 10, false, '#4b5563'); y += 16; }
  op({ t: 'r', x: M, y: y + 2, w: util, h: 1.5, cor: '#1f7a45' }); y += 12;

  for (const t of doc.tabelas) {
    const mN = medir(TAM), mB = medir(TAM, true);
    // larguras: colunas comuns pelo conteúdo; as de texto longo dividem a sobra
    const nat = t.colunas.map((c, i) => (c.quebra ? 0 : Math.ceil(Math.max(mB(c.titulo), ...t.linhas.map(l => mB(l[i] ?? '')))) + 2 * PAD));
    const flex = t.colunas.filter(c => c.quebra).length;
    const sobra = Math.max(120 * flex, util - nat.reduce((a, b) => a + b, 0));
    const larg = t.colunas.map((c, i) => (c.quebra ? sobra / flex : nat[i]));
    const total = Math.min(util, larg.reduce((a, b) => a + b, 0));
    const celulas = (l: string[], negrito: boolean) => l.map((v, i) => (t.colunas[i]?.quebra ? quebrar(v ?? '', larg[i] - 2 * PAD, negrito ? mB : mN) : [v ?? '']));
    const altura = (cs: string[][]) => Math.max(...cs.map(c => c.length), 1) * LINHA + 2 * PAD - 2;
    const linha = (cs: string[][], negrito: boolean, bg: string | null, cor: string) => {
      const h = altura(cs);
      if (bg) op({ t: 'r', x: M, y, w: total, h, cor: bg });
      op({ t: 'r', x: M, y: y + h - 0.5, w: total, h: 0.5, cor: '#e5e7eb' });
      let x = M;
      cs.forEach((ls, i) => {
        const dir = !!t.colunas[i]?.dir;
        ls.forEach((s, k) => texto(s, dir ? x + larg[i] - PAD : x + PAD, y + PAD - 1 + LINHA / 2 + k * LINHA, TAM, negrito, cor, dir));
        x += larg[i];
      });
      y += h;
    };
    const cab = () => linha(celulas(t.colunas.map(c => c.titulo), true), true, '#1f7a45', '#ffffff');
    const corpo = t.linhas.map((l, i) => ({ cs: celulas(l, !!t.destacarUltima && i === t.linhas.length - 1), i }));
    // o título não fica sozinho no pé da página: precisa caber com o cabeçalho e a primeira linha
    const inicio = (t.titulo ? 20 : 0) + (corpo[0] ? LINHA + 2 * PAD + altura(corpo[0].cs) : 16);
    if (y + inicio > fundo) nova();
    if (t.titulo) { texto(t.titulo, M, y + 8, 10.5, true, '#1f7a45'); y += 20; }
    if (!t.linhas.length && t.vazio) { texto(t.vazio, M, y + 6, TAM, false, '#6b7280'); y += 16; }
    else {
      cab();
      for (const { cs, i } of corpo) {
        if (y + altura(cs) > fundo) { nova(); cab(); }
        const ultima = !!t.destacarUltima && i === t.linhas.length - 1;
        linha(cs, ultima, ultima ? '#e8f5ee' : i % 2 ? '#f9fafb' : null, '#111827');
      }
    }
    if (t.nota) {
      const ls = quebrar(t.nota, util, medir(7.5));
      if (y + ls.length * 10 + 4 > fundo) nova();
      ls.forEach((s, k) => texto(s, M, y + 9 + k * 10, 7.5, false, '#6b7280'));
      y += ls.length * 10 + 4;
    }
    y += 12;
  }
  paginas.forEach((p, i) => {
    const rot = `Página ${i + 1} de ${paginas.length}`;
    if (doc.rodape) p.push({ t: 't', s: doc.rodape, x: M, y: H - M - 4, tam: 7.5, negrito: false, cor: '#6b7280', larg: 0, dir: false });
    p.push({ t: 't', s: rot, x: W - M, y: H - M - 4, tam: 7.5, negrito: false, cor: '#6b7280', larg: medida(rot, 7.5, false), dir: true });
  });
  return paginas;
}

const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const rgb = (hex: string) => [1, 3, 5].map(i => n2(parseInt(hex.slice(i, i + 2), 16) / 255)).join(' ');
/** Fluxo de conteúdo PDF de uma página (o y do PDF cresce para cima; a linha de base fica um pouco abaixo do meio do texto). */
export const conteudoPagina = (ops: Op[]) => ops.map(o => (o.t === 'r'
  ? `${rgb(o.cor)} rg ${n2(o.x)} ${n2(H - o.y - o.h)} ${n2(o.w)} ${n2(o.h)} re f`
  : `BT /F${o.negrito ? 2 : 1} ${o.tam} Tf ${rgb(o.cor)} rg ${n2(o.dir ? o.x - o.larg : o.x)} ${n2(H - o.y - o.tam * 0.35)} Td (${textoWinAnsi(o.s)}) Tj ET`)).join('\n') + '\n';

/** Monta o documento e devolve os bytes do PDF. A largura dos textos é medida no canvas com Helvetica/Arial (mesmas métricas da fonte do PDF). */
export function gerarDocumentoPdf(doc: DocumentoPdf): Uint8Array {
  const ctx = document.createElement('canvas').getContext('2d')!;
  const medida: Medir = (s, tam, negrito) => { ctx.font = `${negrito ? 'bold ' : ''}${tam}px Helvetica, Arial, sans-serif`; return ctx.measureText(s).width; };
  return gerarPdfTexto(doc.titulo, paginar(doc, medida).map(conteudoPagina));
}

export function baixarDocumentoPdf(nome: string, doc: DocumentoPdf) {
  baixarArquivo(nome + '.pdf', new Blob([gerarDocumentoPdf(doc) as BlobPart], { type: 'application/pdf' }));
}
