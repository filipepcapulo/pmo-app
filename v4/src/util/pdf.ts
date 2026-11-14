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
  const partes: Uint8Array[] = [];
  let pos = 0;
  const poe = (p: string | Uint8Array) => { const b = typeof p === 'string' ? latin1(p) : p; partes.push(b); pos += b.length; };
  poe('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pos); poe(`${i + 1} 0 obj\n`); o.forEach(poe); poe('\nendobj\n'); });
  const xref = pos;
  poe(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join(''));
  poe(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const saida = new Uint8Array(pos);
  let k = 0;
  for (const p of partes) { saida.set(p, k); k += p.length; }
  return saida;
}
