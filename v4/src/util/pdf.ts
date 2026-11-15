// PDF de uma página com título + uma imagem JPEG (o Gantt), sem biblioteca: objetos PDF 1.4 escritos à mão.
// A página tem a largura de um A4 deitado (842 pt) e a altura que a imagem pedir (mínimo A4).

const latin1 = (s: string) => Uint8Array.from([...s].map(c => { const n = c.charCodeAt(0); return n < 256 ? n : 63; }));
const textoPdf = (s: string) => s.replace(/[\\()]/g, m => '\\' + m);

/** Monta o PDF a partir dos bytes do JPEG e do seu tamanho em pixels. */
export function gerarPdf(titulo: string, jpeg: Uint8Array, largPx: number, altPx: number): Uint8Array {
  const margem = 24, W = 842, topo = 40;
  const esc = (W - 2 * margem) / largPx;
  const iw = largPx * esc, ih = altPx * esc;
  const H = Math.max(595, Math.ceil(ih + topo + 2 * margem));
  const conteudo = `BT /F1 13 Tf ${margem} ${H - margem - 12} Td (${textoPdf(titulo)}) Tj ET\n`
    + `q ${iw.toFixed(2)} 0 0 ${ih.toFixed(2)} ${margem} ${(H - margem - topo - ih).toFixed(2)} cm /Im0 Do Q\n`;
  const objs: (string | Uint8Array)[][] = [
    ['<< /Type /Catalog /Pages 2 0 R >>'],
    ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>'],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 6 0 R >> /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`],
    [`<< /Length ${latin1(conteudo).length} >>\nstream\n`, latin1(conteudo), '\nendstream'],
    [`<< /Type /XObject /Subtype /Image /Width ${largPx} /Height ${altPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, '\nendstream'],
    ['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'],
  ];
  return serializar(objs);
}


/** Escreve os objetos numerados (1…n), a tabela xref e o trailer; `info` é o número do objeto /Info, se houver. */
function serializar(objs: (string | Uint8Array)[][], info?: number): Uint8Array {
  const partes: Uint8Array[] = [];
  let pos = 0;
  const poe = (p: string | Uint8Array) => { const b = typeof p === 'string' ? latin1(p) : p; partes.push(b); pos += b.length; };
  poe('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pos); poe(`${i + 1} 0 obj\n`); o.forEach(poe); poe('\nendobj\n'); });
  const xref = pos;
  poe(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join(''));
  poe(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R${info ? ` /Info ${info} 0 R` : ''} >>\nstartxref\n${xref}\n%%EOF\n`);
  const saida = new Uint8Array(pos);
  let k = 0;
  for (const p of partes) { saida.set(p, k); k += p.length; }
  return saida;
}

const CP1252: Record<number, number> = { 0x20ac: 0x80, 0x201a: 0x82, 0x192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x2c6: 0x88, 0x2030: 0x89, 0x160: 0x8a,
  0x2039: 0x8b, 0x152: 0x8c, 0x17d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2dc: 0x98, 0x2122: 0x99, 0x161: 0x9a,
  0x203a: 0x9b, 0x153: 0x9c, 0x17e: 0x9e, 0x178: 0x9f, 0x202f: 0xa0, 0x2009: 0x20 };
/** Texto pronto para um `(…) Tj` com fonte WinAnsi: travessão, reticências, aspas curvas etc. no código certo; o que não existe vira "?". */
export const textoWinAnsi = (s: string) => textoPdf([...s].map(c => { const n = c.codePointAt(0)!; return n < 256 && (n < 0x80 || n > 0x9f) ? c : CP1252[n] ? String.fromCharCode(CP1252[n]) : '?'; }).join(''));

/**
 * PDF de várias páginas A4 deitadas (842 × 595 pt) com texto de verdade (V4 4.3.0: relatório por consultor): cada página
 * é o seu fluxo de conteúdo já montado; as fontes são /F1 Helvetica e /F2 Helvetica-Bold (WinAnsi).
 */
export function gerarPdfTexto(titulo: string, conteudos: string[]): Uint8Array {
  const W = 842, H = 595, n = conteudos.length, f1 = 3 + 2 * n, f2 = f1 + 1;
  const objs: (string | Uint8Array)[][] = [
    ['<< /Type /Catalog /Pages 2 0 R >>'],
    [`<< /Type /Pages /Kids [${conteudos.map((_, i) => `${3 + 2 * i} 0 R`).join(' ')}] /Count ${n} >>`],
  ];
  conteudos.forEach((c, i) => {
    objs.push([`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${4 + 2 * i} 0 R >>`]);
    objs.push([`<< /Length ${latin1(c).length} >>\nstream\n`, latin1(c), '\nendstream']);
  });
  objs.push(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>']);
  objs.push(['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']);
  objs.push([`<< /Title (${textoWinAnsi(titulo)}) >>`]);
  return serializar(objs, objs.length);
}
