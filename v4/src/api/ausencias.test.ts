import { describe, expect, it } from 'vitest';
import { erroPedido, montarPedido, periodoPedido, ROTULO_SITUACAO } from './ausencias';

const base = { de: '2026-12-10', ate: '2026-12-12', tipo: 'folga' as const, motivo: 'Consulta', parcial: false, hora_ini: '', hora_fim: '' };

describe('pedidos de ausência (0090)', () => {
  it('confere o formulário com as regras do banco', () => {
    const hoje = '2026-11-14';
    expect(erroPedido(base, hoje)).toBeNull();
    expect(erroPedido({ ...base, de: '' }, hoje)).toMatch(/data/);
    expect(erroPedido({ ...base, ate: '2026-12-09' }, hoje)).toMatch(/anterior/);
    expect(erroPedido({ ...base, ate: '2027-04-10' }, hoje)).toMatch(/3 meses/);
    expect(erroPedido({ ...base, de: '2026-10-01', ate: '2026-10-01' }, hoje)).toMatch(/30 dias/);
    expect(erroPedido({ ...base, de: '2026-10-20', ate: '2026-10-20' }, hoje)).toBeNull();   // passado recente (atestado) pode
    expect(erroPedido({ ...base, motivo: ' a ' }, hoje)).toMatch(/motivo/);
    expect(erroPedido({ ...base, parcial: true }, hoje)).toMatch(/horário/);
    expect(erroPedido({ ...base, parcial: true, hora_ini: '10:00', hora_fim: '09:00' }, hoje)).toMatch(/depois do início/);
    expect(erroPedido({ ...base, parcial: true, hora_ini: '08:00', hora_fim: '10:00', ate: '' }, hoje)).toBeNull();
  });
  it('o que vai para o banco: nunca o consultor; parte do dia é um dia só com horário', () => {
    expect(montarPedido({ ...base, motivo: '  Consulta  ' })).toEqual({ de: '2026-12-10', ate: '2026-12-12', tipo: 'folga', motivo: 'Consulta' });
    expect(montarPedido({ ...base, ate: '' })).toMatchObject({ de: '2026-12-10', ate: '2026-12-10' });
    const p = montarPedido({ ...base, parcial: true, hora_ini: '08:00', hora_fim: '10:00' });
    expect(p).toEqual({ de: '2026-12-10', ate: '2026-12-10', tipo: 'folga', motivo: 'Consulta', hora_ini: '08:00', hora_fim: '10:00' });
    expect(Object.keys(p)).not.toContain('consultor_id');
  });
  it('textos da lista', () => {
    expect(periodoPedido({ de: '2026-12-10', ate: '2026-12-10', hora_ini: null, hora_fim: null })).toBe('10/12/2026');
    expect(periodoPedido({ de: '2026-12-10', ate: '2026-12-12', hora_ini: null, hora_fim: null })).toBe('10/12/2026 a 12/12/2026');
    expect(periodoPedido({ de: '2026-12-10', ate: '2026-12-10', hora_ini: '08:00:00', hora_fim: '10:00:00' })).toBe('10/12/2026 · 08:00 às 10:00');
    expect(ROTULO_SITUACAO.pendente).toBe('Aguardando aprovação');
  });
});
