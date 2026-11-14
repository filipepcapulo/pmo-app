// CSV para abrir no Excel em português: separador ";", vírgula decimal, BOM UTF-8 (acentos) e quebra CRLF.

/** Uma célula: aspas quando tem separador, aspas ou quebra; número com vírgula decimal. */
function celula(v: unknown): string {
  if (v == null) return '';
  const s = typeof v === 'number' ? String(v).replace('.', ',') : typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function gerarCsv(cabecalho: string[], linhas: unknown[][]): string {
  return '\uFEFF' + [cabecalho, ...linhas].map(l => l.map(celula).join(';')).join('\r\n') + '\r\n';
}

/** Nome de arquivo seguro: sem acento nem símbolo, espaços viram "_" ("Almont · P1 Implantação" → "Almont_P1_Implantacao"). */
export const nomeArquivo = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\- ]+/g, ' ').trim().replace(/\s+/g, '_') || 'arquivo';

/** Baixa um arquivo gerado no navegador. */
export function baixarArquivo(nome: string, conteudo: Blob) {
  const url = URL.createObjectURL(conteudo);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function baixarCsv(nome: string, cabecalho: string[], linhas: unknown[][]) {
  const arq = /\.csv$/i.test(nome) ? nome : `${nome}_${new Date().toISOString().slice(0, 10)}.csv`;
  baixarArquivo(arq, new Blob([gerarCsv(cabecalho, linhas)], { type: 'text/csv;charset=utf-8' }));
}
