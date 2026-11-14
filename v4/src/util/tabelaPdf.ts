// PDF de uma tabela (fechamento de produtividade, F4): desenha a tabela num canvas, vira JPEG e entra no PDF de uma
// página de `pdf.ts` (sem biblioteca). Roda só no navegador.
import { baixarArquivo } from './csv';
import { gerarPdf } from './pdf';

export interface TabelaPdf { titulo: string; subtitulo?: string; colunas: { titulo: string; dir?: boolean }[]; linhas: string[][]; destacarUltima?: boolean }

export function baixarTabelaPdf(nome: string, t: TabelaPdf) {
  const esc = 2, fonte = 12, alt = 24, mx = 8;
  const cv = document.createElement('canvas');
  let ctx = cv.getContext('2d')!;
  ctx.font = `600 ${fonte}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const larg = t.colunas.map((c, i) => Math.ceil(Math.max(ctx.measureText(c.titulo).width, ...t.linhas.map(l => ctx.measureText(l[i] ?? '').width))) + 2 * mx);
  const topo = t.subtitulo ? 26 : 6, w = larg.reduce((a, b) => a + b, 0), hTot = topo + alt * (t.linhas.length + 1) + 6;
  cv.width = w * esc; cv.height = hTot * esc;
  ctx = cv.getContext('2d')!;
  ctx.scale(esc, esc);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, hTot);
  ctx.textBaseline = 'middle';
  if (t.subtitulo) { ctx.fillStyle = '#4b5563'; ctx.font = `${fonte}px system-ui, -apple-system, "Segoe UI", sans-serif`; ctx.fillText(t.subtitulo, mx, 12); }
  const linha = (cels: string[], y: number, negrito: boolean, fundo: string | null, cor: string) => {
    if (fundo) { ctx.fillStyle = fundo; ctx.fillRect(0, y, w, alt); }
    ctx.fillStyle = cor;
    ctx.font = `${negrito ? '600 ' : ''}${fonte}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    let x = 0;
    cels.forEach((c, i) => {
      const dir = t.colunas[i]?.dir;
      ctx.textAlign = dir ? 'right' : 'left';
      ctx.fillText(c ?? '', dir ? x + larg[i] - mx : x + mx, y + alt / 2 + 1);
      x += larg[i];
    });
    ctx.fillStyle = '#e5e7eb'; ctx.fillRect(0, y + alt - 1, w, 1);
  };
  linha(t.colunas.map(c => c.titulo), topo, true, '#1f7a45', '#ffffff');
  t.linhas.forEach((l, i) => {
    const ultima = t.destacarUltima && i === t.linhas.length - 1;
    linha(l, topo + alt * (i + 1), !!ultima, ultima ? '#e8f5ee' : i % 2 ? '#f9fafb' : null, '#111827');
  });
  const b64 = cv.toDataURL('image/jpeg', 0.92).split(',')[1];
  const jpeg = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  baixarArquivo(nome + '.pdf', new Blob([gerarPdf(t.titulo, jpeg, cv.width, cv.height) as BlobPart], { type: 'application/pdf' }));
}
