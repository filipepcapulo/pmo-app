// Exportação Excel (.xlsx) sem biblioteca externa — porte do `utils/XlsxUtils.js` das grades dos dashboards Sankhya
// (Consulta Produtos). Gera o pacote OOXML mínimo (zip sem compressão) no navegador: número como número, data como
// data, cabeçalho escuro em negrito congelado, autofiltro e largura de coluna pelo conteúdo. Funciona offline.
//
// Tipos de coluna: 'S' texto | 'I' inteiro (código, sem milhar) | 'V' decimal 2 casas | 'P' preço (2 a 4 casas)
//                  'Q' quantidade (até 4 casas) | 'D' data (aceita dd/mm/aaaa, aaaa-mm-dd ou Date)
export type TipoXlsx = 'S' | 'I' | 'V' | 'P' | 'Q' | 'D';
export interface Planilha { aba?: string; colunas: { titulo: string; tipo?: TipoXlsx; largura?: number }[]; linhas: unknown[][] }

/** Estilos (índice em cellXfs do styles.xml). */
const ESTILO = { S: 0, CAB: 1, I: 2, V: 3, P: 4, Q: 5, D: 6 };

const enc = new TextEncoder();

/** Tabela CRC-32 do zip. */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** Zip "store" (sem compressão): [{ nome, bytes }] → Uint8Array. */
function zip(arquivos: { nome: string; bytes: Uint8Array }[]) {
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let pos = 0;
  arquivos.forEach(({ nome, bytes }) => {
    const n = enc.encode(nome);
    const crc = crc32(bytes);
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034B50, true);
    loc.setUint16(4, 20, true);
    loc.setUint16(6, 0x0800, true);          // nomes em UTF-8
    loc.setUint16(8, 0, true);               // store
    loc.setUint16(10, 0, true);
    loc.setUint16(12, 0x21, true);           // 01/01/1980
    loc.setUint32(14, crc, true);
    loc.setUint32(18, bytes.length, true);
    loc.setUint32(22, bytes.length, true);
    loc.setUint16(26, n.length, true);
    loc.setUint16(28, 0, true);
    partes.push(new Uint8Array(loc.buffer), n, bytes);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014B50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, 0, true);
    cen.setUint16(14, 0x21, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, bytes.length, true);
    cen.setUint32(24, bytes.length, true);
    cen.setUint16(28, n.length, true);
    cen.setUint32(42, pos, true);
    central.push(new Uint8Array(cen.buffer), n);
    pos += 30 + n.length + bytes.length;
  });
  const tamCentral = central.reduce((a, b) => a + b.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054B50, true);
  fim.setUint16(8, arquivos.length, true);
  fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamCentral, true);
  fim.setUint32(16, pos, true);
  const todos = [...partes, ...central, new Uint8Array(fim.buffer)];
  const out = new Uint8Array(todos.reduce((a, b) => a + b.length, 0));
  let o = 0;
  todos.forEach((b) => { out.set(b, o); o += b.length; });
  return out;
}

/** Escapa texto para XML (remove caracteres de controle inválidos). */
function xml(v: unknown) {
  return String(v ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);
}

/** Coluna Excel (0 → A, 26 → AA). */
function letra(i: number) {
  let s = '';
  let n = i + 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Número do banco/tela ('1.234,56', '1234.56', 12) → número; vazio/inválido → null. */
function numero(v: unknown) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let t = String(v ?? '').trim();
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const x = Number(t);
  return Number.isFinite(x) ? x : null;
}

/** Data → número de série do Excel (dias desde 30/12/1899); inválida → null. */
function serial(v: unknown) {
  let d: number | null = null;
  if (v instanceof Date) d = Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
  else {
    const t = String(v ?? '').trim();
    let m: RegExpExecArray | null = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
    if (m) d = Date.UTC(+m[3], +m[2] - 1, +m[1]);
    else if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t))) d = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  }
  return d == null ? null : Math.round((d - Date.UTC(1899, 11, 30)) / 86400000);
}

function celula(ref: string, v: unknown, tipo: TipoXlsx) {
  if (v == null || v === '') return '';
  if (tipo === 'D') {
    const s = serial(v);
    return s == null ? `<c r="${ref}" t="inlineStr"><is><t>${xml(v)}</t></is></c>` : `<c r="${ref}" s="${ESTILO.D}"><v>${s}</v></c>`;
  }
  if (tipo === 'I' || tipo === 'V' || tipo === 'P' || tipo === 'Q') {
    const x = numero(v);
    if (x != null) return `<c r="${ref}" s="${ESTILO[tipo]}"><v>${x}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00##"/><numFmt numFmtId="166" formatCode="#,##0.####"/><numFmt numFmtId="167" formatCode="0"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Gera o .xlsx (bytes). */
export function gerarXlsx({ aba = 'Dados', colunas, linhas }: Planilha): Uint8Array {
  const tipos = colunas.map(c => c.tipo || 'S');
  const larg = colunas.map((c, j) => c.largura || Math.min(60, Math.max(8, String(c.titulo).length + 2,
    ...linhas.slice(0, 300).map(l => String(l[j] ?? '').length + 1))));
  const ult = letra(Math.max(colunas.length - 1, 0));
  const cab = `<row r="1">${colunas.map((c, j) => `<c r="${letra(j)}1" t="inlineStr" s="${ESTILO.CAB}"><is><t>${xml(c.titulo)}</t></is></c>`).join('')}</row>`;
  const corpo = linhas.map((l, i) => {
    const r = i + 2;
    return `<row r="${r}">${colunas.map((_, j) => celula(`${letra(j)}${r}`, l[j], tipos[j])).join('')}</row>`;
  }).join('');
  const planilha = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${larg.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${cab}${corpo}</sheetData>
<autoFilter ref="A1:${ult}${linhas.length + 1}"/>
</worksheet>`;
  const nomeAba = xml(String(aba).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Dados');
  const arquivos: [string, string][] = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nomeAba}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${nomeAba}'!$A$1:$${ult}$${linhas.length + 1}</definedName></definedNames></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', ESTILOS],
    ['xl/worksheets/sheet1.xml', planilha],
  ];
  return zip(arquivos.map(([nome, txt]) => ({ nome, bytes: enc.encode(txt) })));
}

/** Gera e baixa o .xlsx (".xlsx" é acrescentado ao nome se faltar). */
export function baixarXlsx(nome: string, dados: Planilha) {
  const arq = /\.xlsx$/i.test(nome) ? nome : `${nome}.xlsx`;
  const blob = new Blob([gerarXlsx(dados) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = arq;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
