import { describe, expect, it } from 'vitest';
import { ativo, deduzirTipo, numeroBR, passa } from './filtro';
import { gerarXlsx } from '../util/xlsx';

describe('filtro por coluna', () => {
  it('texto sem acento e sem caixa', () => {
    expect(passa({ op: 'ct', v: 'joao' }, 'S', 'João Silva', null)).toBe(true);
    expect(passa({ op: 'nc', v: 'SILVA' }, 'S', 'João Silva', null)).toBe(false);
    expect(passa({ op: 'sw', v: 'jo' }, 'S', 'João', null)).toBe(true);
    expect(passa({ op: 'ew', v: 'ão' }, 'S', 'João', null)).toBe(true);
    expect(passa({ op: 'bl' }, 'S', '', null)).toBe(true);
    expect(passa({ op: 'nb' }, 'S', '', null)).toBe(false);
  });
  it('número e data pelo valor do campo; entre aceita a ordem trocada', () => {
    expect(passa({ op: 'gt', v: '10' }, 'N', '12 h', 12)).toBe(true);
    expect(passa({ op: 'le', v: '1.234,5' }, 'N', '', 1234.5)).toBe(true);
    expect(passa({ op: 'bt', v: '20', v2: '10' }, 'N', '', 15)).toBe(true);
    expect(passa({ op: 'bt', v: '2026-10-01', v2: '2026-10-31' }, 'D', '15/10/2026', '2026-10-15')).toBe(true);
    expect(passa({ op: 'lt', v: '2026-10-01' }, 'D', '15/10/2026', '2026-10-15')).toBe(false);
    expect(passa({ op: 'eq', v: '5' }, 'N', '—', null)).toBe(false);
  });
  it('lista de valores marcados soma com a condição', () => {
    expect(passa({ op: 'ct', valores: ['GP', 'Admin'] }, 'S', 'GP', null)).toBe(true);
    expect(passa({ op: 'ct', valores: ['GP'] }, 'S', 'Admin', null)).toBe(false);
    expect(ativo({ op: 'ct' })).toBe(false);
    expect(ativo({ op: 'ct', valores: [] })).toBe(true);
  });
  it('tipo pelo conteúdo e número BR', () => {
    expect(deduzirTipo([1, null, 2.5])).toBe('N');
    expect(deduzirTipo(['2026-10-01', ''])).toBe('D');
    expect(deduzirTipo(['a', 1])).toBe('S');
    expect(numeroBR('1.234,56')).toBe(1234.56);
    expect(numeroBR('x')).toBeNull();
  });
});

describe('Excel (.xlsx)', () => {
  it('gera o zip com a planilha, número como número e data como série', () => {
    const b = gerarXlsx({ aba: 'Clientes', colunas: [{ titulo: 'Nome' }, { titulo: 'Horas', tipo: 'V' }, { titulo: 'Data', tipo: 'D' }],
      linhas: [['Ana & Cia', 12.5, '2026-10-30'], ['Zé', null, '']] });
    expect([...b.slice(0, 4)]).toEqual([0x50, 0x4B, 0x03, 0x04]);
    const t = new TextDecoder().decode(b);
    expect(t).toContain('xl/worksheets/sheet1.xml');
    expect(t).toContain('Ana &amp; Cia');
    expect(t).toContain('<c r="B2" s="3"><v>12.5</v></c>');
    expect(t).toContain('<c r="C2" s="6"><v>46325</v></c>');
    expect(t).toContain('<autoFilter ref="A1:C3"/>');
    expect(t).toContain('<sheet name="Clientes"');
  });
});
