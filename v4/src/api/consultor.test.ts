import { describe, expect, it } from 'vitest';
import { diasDaSemana, horarioSugerido, horasApontadas, inicioSemana, nomeDia, podeApontar } from './consultor';

describe('apontamento', () => {
  it('horas = fim − início − intervalo', () => {
    expect(horasApontadas('08:00', '12:30', 30)).toBe(4);
    expect(horasApontadas('08:00', '18:00', 120)).toBe(8);
    expect(horasApontadas('08:10', '09:00', 0)).toBe(0.83);
  });
  it('sem horário válido não há horas', () => {
    expect(horasApontadas('', '12:00', 0)).toBeNull();
    expect(horasApontadas('12:00', '08:00', 0)).toBeNull();
    expect(horasApontadas('08:00', '09:00', 60)).toBeNull();
    expect(horasApontadas('08:00', '09:00', Number.NaN)).toBeNull();
  });
  it('sugere o horário da agenda; dia desconta o almoço de 2 h', () => {
    expect(horarioSugerido('dia')).toEqual({ ini: '08:00', fim: '18:00', intervalo: 120 });
    expect(horarioSugerido('tarde')).toEqual({ ini: '14:00', fim: '18:00', intervalo: 0 });
    expect(horarioSugerido('livre', '09:00:00', '10:30:00')).toEqual({ ini: '09:00', fim: '10:30', intervalo: 0 });
  });
  it('só aponta tarefa que já chegou e foi executável', () => {
    expect(podeApontar({ data: '2026-10-31', status: 'planejada' }, '2026-10-31')).toBe(true);
    expect(podeApontar({ data: '2026-11-01', status: 'planejada' }, '2026-10-31')).toBe(false);
    expect(podeApontar({ data: '2026-10-30', status: 'cancelada' }, '2026-10-31')).toBe(false);
    expect(podeApontar({ data: '2026-10-30', status: 'nao_executada' }, '2026-10-31')).toBe(false);
  });
});

describe('semana', () => {
  it('começa na segunda, também quando a data é domingo', () => {
    expect(inicioSemana('2026-10-31')).toBe('2026-10-26');   // sábado
    expect(inicioSemana('2026-11-01')).toBe('2026-10-26');   // domingo
    expect(inicioSemana('2026-10-26')).toBe('2026-10-26');   // segunda
    expect(diasDaSemana('2026-10-28')).toHaveLength(7);
    expect(diasDaSemana('2026-10-28')[6]).toBe('2026-11-01');
  });
  it('nome do dia', () => {
    expect(nomeDia('2026-10-31')).toBe('sábado');
    expect(nomeDia('2026-10-26')).toBe('segunda-feira');
  });
});
