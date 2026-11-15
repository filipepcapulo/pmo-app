// V4 4.3.0: relatório de produtividade por consultor (PDFs do Fechamento)
import { describe, expect, it } from 'vitest';
import { nomesArquivoRelatorio, periodoDaChave, relatorioConsultor, rotuloRecorte, type LinhaFech, type ResumoFech } from './fechamentoFin';
import { conteudoPagina, paginar, quebrar } from '../util/documentoPdf';
import { gerarPdfTexto } from '../util/pdf';

const P = periodoDaChave(202610);
const resumo = (o: Partial<ResumoFech> = {}): ResumoFech => ({
  usuario_id: 'u1', nome: 'Ana Souza', reg: 'CLT', vh: 100, vhi: 0, fixo: 0, metaH: 154, p_hn: 120, p_he: 0, p_tot: 120, o_hn: 480, o_he: 60, o_tot: 540, aj: 0, ajN: 0,
  t_hn: 600, t_he: 60, t_tot: 660, v_hn: 1000, v_he: 200, soma: 1200, minimo: false, total: 1200, meta: 660 / 60 / 154, pPlan: 120 / 660, semVig: 0,
  taxas: [{ vh: 100, int: false, min: 600 }], atendimentos: 3, cat: { prod: 540, com: 0, int: 120 }, ...o });
const linha = (o: Partial<LinhaFech> & { id: string }): LinhaFech => ({
  data: '2026-10-05', orig: 'OS', cli: 'Almont', serv: 'Implantação', os: '123', desc: 'Parametrização fiscal', hi: '08:00', hf: '12:00', hn0: 240, he0: 0, hn: 240, he: 0,
  aj: false, ajobs: '', ajpor: '', ajem: '', rate: 100, valor: 400, cat: 'prod', semVig: false, reg: 'CLT', ...o });
const linhas = [
  linha({ id: 'b', data: '2026-10-06', hn: 240, he: 60, hf: '19:00' }),
  linha({ id: 'a', data: '2026-09-22' }),
  linha({ id: 'p', orig: 'Planilha', os: '', serv: '', desc: 'Reunião interna', cli: 'Interno', hn: 120, hn0: 120, cat: 'int' }),
];
const tab = (d: ReturnType<typeof relatorioConsultor>, t: string) => d.tabelas.find(x => x.titulo?.startsWith(t))!;

describe('relatorioConsultor', () => {
  it('título com nome e período; a modalidade não aparece em lugar nenhum', () => {
    const d = relatorioConsultor(resumo(), linhas, P);
    expect(d.titulo).toBe('Relatório de produtividade — Ana Souza');
    expect(d.subtitulo).toBe('Período: 21/09/2026 a 20/10/2026 (SET-OUT26)');
    expect(JSON.stringify(d)).not.toMatch(/\b(CLT|PJ|COOP)\b|Modalidade|Regime/);
  });
  it('resumo de horas: Planilha, OS e total; ajustes viram nota', () => {
    const d = relatorioConsultor(resumo({ ajN: 1, aj: -30 }), linhas, P);
    expect(tab(d, 'Resumo').linhas).toEqual([['Planilha / app', '2:00', '0:00', '2:00'], ['OS (Sankhya)', '8:00', '1:00', '9:00'], ['Total geral', '10:00', '1:00', '11:00']]);
    expect(tab(d, 'Resumo').nota).toMatch(/1 atendimento\(s\) com ajuste de horas \(-0:30\)/);
  });
  it('valores com um valor hora: sem Fixo para quem não tem; com Fixo e "(mínimo)" para quem tem', () => {
    const v = tab(relatorioConsultor(resumo(), linhas, P), 'Valores');
    expect(v.colunas.map(c => c.titulo)).toEqual(['Valor hora', 'Valor normal', 'Valor extra', 'Valor total', 'Meta']);
    const f = tab(relatorioConsultor(resumo({ fixo: 3000, minimo: true, total: 3000 }), linhas, P), 'Valores');
    expect(f.colunas.map(c => c.titulo)).toEqual(['Valor hora', 'Fixo', 'Valor normal', 'Valor extra', 'Valor total', 'Meta']);
    expect(f.linhas[0][4]).toMatch(/3\.000,00 \(mínimo\)$/);
  });
  it('valor hora interno: quadro por tipo de trabalho e a tabela principal sem Valor hora / Valor normal', () => {
    const ls = linhas.map(l => (l.orig === 'Planilha' ? { ...l, rate: 40 } : l));
    const d = relatorioConsultor(resumo({ vhi: 40, taxas: [{ vh: 100, int: false, min: 480 }, { vh: 40, int: true, min: 120 }] }), ls, P);
    const q = tab(d, 'Valores — valor hora diferente');
    expect(q.linhas.map(l => l[0])).toEqual(['Planilha / app (interno)', 'OS (Sankhya / cliente)', 'Total normal']);
    expect(q.linhas[0].slice(1, 2)).toEqual(['2:00']);
    expect(d.tabelas.filter(t => t.titulo === 'Valores')[0].colunas.map(c => c.titulo)).toEqual(['Valor extra', 'Valor total', 'Meta']);
  });
  it('atendimentos: OS e planilha separados, por data, com total; descrição cortada em 250 e o ajuste anotado', () => {
    const longa = 'x'.repeat(400);
    const d = relatorioConsultor(resumo(), [...linhas, linha({ id: 'z', data: '2026-10-10', desc: longa, aj: true, ajobs: 'Desconto retroativo' })], P);
    const os = tab(d, 'Atendimentos — OS');
    expect(os.titulo).toBe('Atendimentos — OS (Sankhya) · 3');
    expect(os.linhas.map(l => l[0])).toEqual(['22/09/2026', '06/10/2026', '10/10/2026', 'Total']);
    expect(os.linhas[1][3]).toBe('5:00');
    expect(os.linhas[3][3]).toBe('13:00');
    expect(os.linhas[2][4].length).toBeLessThan(300);
    expect(os.linhas[2][4]).toMatch(/… \[Ajuste: Desconto retroativo\]$/);
    expect(os.linhas[0][4]).toBe('Implantação — Parametrização fiscal');
    expect(tab(d, 'Apontamentos — Planilha').linhas).toEqual([['05/10/2026', 'Interno', '2:00', 'Reunião interna'], ['Total', '', '2:00', '']]);
  });
  it('sem atendimentos: tabelas vazias com aviso', () => {
    const d = relatorioConsultor(resumo({ t_tot: 0 }), [], P);
    expect(tab(d, 'Atendimentos — OS').linhas).toEqual([]);
    expect(tab(d, 'Atendimentos — OS').vazio).toBe('Nenhuma OS no período.');
  });
  it('nome do arquivo: primeiro nome; nome completo quando repete; intervalo vira datas', () => {
    expect(nomesArquivoRelatorio(['Ana Souza', 'Bruno Lima', 'Ana Paula/Reis'], 'SET-OUT26'))
      .toEqual(['Relatorio Produtividade - Ana Souza (SET-OUT26)', 'Relatorio Produtividade - Bruno (SET-OUT26)', 'Relatorio Produtividade - Ana Paula Reis (SET-OUT26)']);
    expect(rotuloRecorte(P)).toBe('SET-OUT26');
    expect(rotuloRecorte({ key: 0, label: 'Intervalo', ini: '2026-10-01', fim: '2026-10-15' }, true)).toBe('01-10-2026 a 15-10-2026');
  });
});

describe('PDF de várias páginas', () => {
  it('quebrar: cabe por palavras e corta palavra maior que a linha', () => {
    const medir = (s: string) => s.length;
    expect(quebrar('um dois tres quatro', 8, medir)).toEqual(['um dois', 'tres', 'quatro']);
    expect(quebrar('abcdefghij', 4, medir)).toEqual(['abcd', 'efgh', 'ij']);
    expect(quebrar('', 4, medir)).toEqual(['']);
  });
  it('paginar: quebra de página repete o cabeçalho da tabela e numera as páginas', () => {
    const medida = (t: string, tam: number) => t.length * tam * 0.5;
    const doc = { titulo: 'T', tabelas: [{ titulo: 'Lista', colunas: [{ titulo: 'Data' }, { titulo: 'Descrição', quebra: true }],
      linhas: Array.from({ length: 80 }, (_, i) => [`dia ${i}`, 'palavra '.repeat(60)]) }], rodape: 'PMO' };
    const ps = paginar(doc, medida);
    expect(ps.length).toBeGreaterThan(2);
    const textos = (i: number) => ps[i].flatMap(o => (o.t === 't' ? [o.s] : []));
    for (let i = 0; i < ps.length; i++) {
      expect(textos(i)).toContain('Descrição');
      expect(textos(i)).toContain(`Página ${i + 1} de ${ps.length}`);
      for (const o of ps[i]) expect(o.y).toBeLessThanOrEqual(842 - 28);
    }
    expect(ps.flatMap((_, i) => textos(i)).filter(t => /^dia \d+$/.test(t)).length).toBe(80);
  });
  it('conteudoPagina + gerarPdfTexto: texto selecionável em WinAnsi, alinhado à direita, A4 em retrato e xref certo', () => {
    const c = conteudoPagina([{ t: 'r', x: 28, y: 100, w: 50, h: 10, cor: '#ff0000' },
      { t: 't', s: 'Ação — (R$ 1,00)…', x: 200, y: 105, tam: 10, negrito: true, cor: '#000000', larg: 60, dir: true }]);
    expect(c).toContain('1 0 0 rg 28 732 50 10 re f');
    expect(c).toContain('BT /F2 10 Tf 0 0 0 rg 140 733.5 Td (A\xE7\xE3o \x97 \\(R$ 1,00\\)\x85) Tj ET');
    const txt = new TextDecoder('latin1').decode(gerarPdfTexto('Relatório (Ana)', [c, c]));
    expect(txt.startsWith('%PDF-1.4')).toBe(true);
    expect(txt).toContain('/Kids [3 0 R 5 0 R] /Count 2');
    expect(txt.match(/\/MediaBox \[0 0 595 842\]/g)?.length).toBe(2);
    expect(txt).toContain('/BaseFont /Helvetica-Bold');
    expect(txt).toContain('/Title (Relat\xF3rio \\(Ana\\))');
    const xref = Number(/startxref\n(\d+)/.exec(txt)![1]);
    expect(txt.slice(xref, xref + 4)).toBe('xref');
    const off = [...txt.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map(m => Number(m[1]));
    expect(off.length).toBe(9);
    off.forEach((o, i) => expect(txt.slice(o, o + 8)).toBe(`${i + 1} 0 obj\n`));
  });
});
