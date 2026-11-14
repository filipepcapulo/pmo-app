import { describe, expect, it } from 'vitest';
import { comparar, dataTotalChat, decodificar, lerArquivoTotalChat, lerCsvTexto, mesModa, metricas, nomeEmpresa, rotuloMes, semanaIso, type LinhaWa } from './whatsapp';

const CAB = 'UltimaMensagemPor;Contato;Telefone;NomeFonte;MotivoEncerramento;AtendenteEncerramento;HrInicio;HrFim;TempoAtendimento (min);TempoAtendimento;TempoAtendimentoFormatado';

describe('whatsapp — leitura do CSV do Total Chat', () => {
  it('data MM/DD/AAAA vira ISO; inválida vira null', () => {
    expect(dataTotalChat('08/03/2026 09:05:00')).toBe('2026-08-03T09:05:00');
    expect(dataTotalChat('13/03/2026 09:05:00')).toBeNull();
    expect(dataTotalChat('02/30/2026 09:05:00')).toBeNull();
    expect(dataTotalChat('')).toBeNull();
  });
  it('CSV com aspas, ";" e quebra dentro do campo', () => {
    expect(lerCsvTexto('a;b\r\n"x;1";"di""z\nnova"\n\n')).toEqual([['a', 'b'], ['x;1', 'di"z\nnova']]);
  });
  it('UTF-8 com BOM e Windows-1252', () => {
    expect(decodificar(new Uint8Array([0xEF, 0xBB, 0xBF, 0x43, 0xC3, 0xA1]))).toBe('Cá');
    expect(decodificar(new Uint8Array([0x43, 0xE1]))).toBe('Cá');
  });
  it('lê o arquivo: colunas, linhas sem data ignoradas e mês pela moda (RN-02/RN-03)', () => {
    const csv = [CAB,
      'Cliente;CLM Fernanda (TI);(67) 9;WhatsApp;Fim;Ana Teste;07/31/2026 17:00:00;;;30;',
      'Cliente;CLM Fernanda (TI);(67) 9;WhatsApp;Fim;Ana Teste;08/03/2026 09:00:00;;;12,5;',
      'Cliente;CG TELHAS Pedro;(67) 9;WhatsApp;Fim;Caio Teste;08/04/2026 10:00:00;;;150;',
      'Cliente;Sem data;(67) 9;WhatsApp;Fim;Caio Teste;;;;5;'].join('\n');
    const r = lerArquivoTotalChat(csv);
    expect(r.mes).toBe('2026-08');
    expect(r.ignoradas).toBe(1);
    expect(r.linhas).toEqual([
      ['CLM Fernanda (TI)', 'Ana Teste', '2026-07-31T17:00:00', 30],
      ['CLM Fernanda (TI)', 'Ana Teste', '2026-08-03T09:00:00', 12.5],
      ['CG TELHAS Pedro', 'Caio Teste', '2026-08-04T10:00:00', 150]]);
  });
  it('recusa CSV sem as colunas ou sem nenhuma data válida', () => {
    expect(() => lerArquivoTotalChat('Contato;HrInicio\nX;08/03/2026 09:00:00')).toThrow(/AtendenteEncerramento/);
    expect(() => lerArquivoTotalChat(`${CAB}\nC;X;1;W;F;A;;;;3;`)).toThrow(/data de início válida/);
  });
  it('moda empatada fica com o mês mais recente (igual ao banco)', () => {
    expect(mesModa([['a', '', '2026-08-01T00:00:00', 1], ['b', '', '2026-09-01T00:00:00', 1]])).toBe('2026-09');
  });
});

describe('whatsapp — regras do relatório', () => {
  it('cliente = palavras iniciais em maiúsculas, com apelidos', () => {
    expect(nomeEmpresa('MS DIAGNOSTICA Claudia - Fiscal')).toBe('MS DIAGNOSTICA');
    expect(nomeEmpresa('CLM Fernanda (TI)')).toBe('CLM');
    expect(nomeEmpresa('Filipe Capulo Sankhya')).toBe('Filipe Capulo Sankhya');
    expect(nomeEmpresa('BIOMED/MS Joana')).toBe('BIOMED MS');
    expect(nomeEmpresa('BIOMED SP SP Rui')).toBe('BIOMED SP');
    expect(nomeEmpresa('PMO | CS Bia')).toBe('PMO');
  });
  it('semana ISO e rótulo do mês', () => {
    expect(semanaIso('2026-01-01')).toBe(1);
    expect(semanaIso('2026-08-03')).toBe(32);
    expect(semanaIso('2027-01-01')).toBe(53);
    expect(rotuloMes('2026-09')).toBe('Setembro/2026');
  });

  const ago: LinhaWa[] = [
    ['CLM Fernanda', 'Ana Teste', '2026-08-03T09:00:00', 10],
    ['CLM Fernanda', 'Ana Teste', '2026-08-03T10:00:00', 30],
    ['CG TELHAS Pedro', 'Caio Teste', '2026-08-04T10:00:00', 150],
    ['PMO | CS Bia', 'Caio Teste', '2026-08-05T11:00:00', 1500],
  ];
  const set: LinhaWa[] = [
    ['CLM Fernanda', 'Ana Teste', '2026-09-01T09:00:00', 20],
    ['NOVO Joao', 'Ana Teste', '2026-09-02T15:00:00', 200],
    ['NOVO Joao', 'Caio Teste', '2026-09-02T16:00:00', 10],
  ];
  it('métricas: PMO fora do ranking mas dentro dos KPIs', () => {
    const m = metricas(ago);
    expect(m.n).toBe(4);
    expect(m.mediana).toBe(90);
    expect(m.contatos).toBe(3);
    expect(m.gt2h).toBe(50);
    expect(m.gt24h).toBe(1);
    expect(m.dist).toEqual([25, 25, 50]);
    expect(m.top).toEqual([['CLM', 2], ['CG TELHAS', 1]]);
    expect(m.topShare).toBe(100);
    expect(metricas(ago, []).top.map(t => t[0])).toContain('PMO');
  });
  it('comparação: cartões com cor de piora, destaques, parceiros ordenados pelo mês atual', () => {
    const c = comparar('2026-08', '2026-09', ago, set);
    expect(c.la).toBe('Ago');
    expect(c.lb).toBe('Set');
    expect(c.cartoes[0]).toMatchObject({ va: '4', vb: '3', variacao: '-25,0%', ruim: true });
    expect(c.cartoes[1]).toMatchObject({ va: '90,0 min', vb: '20,0 min', ruim: false });
    expect(c.cartoes[3].variacao).toBe('-16,7 p.p.');
    expect(c.destaques[0]).toBe('Volume caiu 25,0% (4 → 3), com 1 contatos únicos a menos.');
    expect(c.destaques[2]).toBe('Ana Teste concentra 67% do volume em Set.');
    expect(c.destaques[3]).toContain('1 clientes novos e 1 que não voltaram');
    expect(c.parceiros).toEqual([
      { nome: 'NOVO', a: 0, b: 2, dif: 2 }, { nome: 'CLM', a: 2, b: 1, dif: -1 }, { nome: 'CG TELHAS', a: 1, b: 0, dif: -1 }]);
    expect(c.pico).toEqual({ dia: '03/08', n: 2 }); // empate: o dia mais antigo
    expect(c.atendentes).toEqual([{ nome: 'Ana Teste', a: 2, b: 2 }, { nome: 'Caio Teste', a: 2, b: 1 }]);
    expect(c.variacoes[0]).toEqual({ nome: 'NOVO', a: 0, b: 2 });
  });
});
