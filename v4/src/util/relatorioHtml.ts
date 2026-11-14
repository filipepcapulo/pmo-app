// Relatório HTML num arquivo só (módulo 09 da Central, RF-05): para guardar, mandar por e-mail ou imprimir. Sem script,
// sem recurso externo: CSS embutido no padrão visual do 2.x (verde, cabeçalhos em maiúsculas) e quebra de página boa
// na impressão. Tudo o que vem dos dados passa pelo escape.
import { baixarArquivo, nomeArquivo } from './csv';

export type Celula = string | number | null | undefined;
export interface SecaoRelatorio { titulo: string; linhas: Celula[][] }
export interface Relatorio { titulo: string; filtros: string[]; colunas: string[]; secoes: SecaoRelatorio[]; geradoEm?: Date }

export const escapar = (v: Celula) =>
  v == null ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CSS = `body{font-family:Arial,Helvetica,sans-serif;color:#1f2933;margin:24px;font-size:13px}
h1{color:#1f7a45;font-size:20px;margin:0 0 4px}.meta{color:#5f6b76;margin:0 0 16px}
h2{font-size:14px;text-transform:uppercase;letter-spacing:.03em;color:#1f7a45;margin:20px 0 6px}
table{border-collapse:collapse;width:100%;margin-bottom:8px}th,td{padding:6px 8px;border-bottom:1px solid #e3e7eb;text-align:left;vertical-align:top}
th{background:#1f7a45;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.03em}
tr:nth-child(even) td{background:#f6f8f9}.total{font-weight:600;margin-top:16px}
@media print{body{margin:10mm}h2{break-after:avoid}tr{break-inside:avoid}}`;

export function relatorioHtml(r: Relatorio): string {
  const quando = (r.geradoEm ?? new Date()).toLocaleString('pt-BR');
  const total = r.secoes.reduce((s, x) => s + x.linhas.length, 0);
  const cab = `<tr>${r.colunas.map(c => `<th>${escapar(c)}</th>`).join('')}</tr>`;
  const secoes = r.secoes.map(s => `<h2>${escapar(s.titulo)} (${s.linhas.length})</h2><table><thead>${cab}</thead><tbody>${
    s.linhas.map(l => `<tr>${l.map(c => `<td>${escapar(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('\n');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>${escapar(r.titulo)}</title><style>${CSS}</style></head><body>`
    + `<h1>${escapar(r.titulo)}</h1><p class="meta">Gerado em ${escapar(quando)}${r.filtros.length ? ` · ${r.filtros.map(escapar).join(' · ')}` : ''}</p>`
    + (total ? secoes : '<p>Nenhum item com esse filtro.</p>')
    + `<p class="total">Total: ${total} item(ns)</p></body></html>`;
}

export function baixarRelatorioHtml(r: Relatorio) {
  const d = (r.geradoEm ?? new Date()).toISOString().slice(0, 10);
  baixarArquivo(`${nomeArquivo(r.titulo)}_${d}.html`, new Blob([relatorioHtml(r)], { type: 'text/html;charset=utf-8' }));
}
