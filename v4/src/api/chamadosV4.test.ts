import { describe, expect, it } from 'vitest';
import { disponibilidade, duasSemanas, exigenciaDoMovimento, tarefasDosHorarios } from './chamadosV4';
import type { Grade } from './equipe';

const t = (o: Record<string, unknown>) => ({ id: 'x', versao: 1, data: '2026-11-17', periodo: 'manha', hora_ini: null, hora_fim: null, horas_previstas: 4, modalidade: null,
  status: 'planejada', nome: 'Visita', consultor_id: 'ana', demanda_id: 'd', demanda: 'D', projeto_id: 'p', projeto: 'P', cliente: 'ACME', ...o });

describe('fluxo do chamado (V4)', () => {
  it('duas semanas: segunda a sexta da semana atual e da próxima, mesmo com hoje no sábado', () => {
    expect(duasSemanas('2026-11-14')).toEqual([
      ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'],
      ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']]);
    expect(duasSemanas('2026-11-16')[0][0]).toBe('2026-11-16');
  });

  it('disponibilidade: livre, ocupado (manhã, tarde, dia e horário livre), ausente e passado', () => {
    const grade = { tarefas: [t({}), t({ id: 'y', data: '2026-11-18', periodo: 'dia' }), t({ id: 'z', data: '2026-11-19', periodo: 'livre', hora_ini: '13:00:00', hora_fim: '16:00:00' }),
      t({ id: 'c', data: '2026-11-20', status: 'cancelada' }), t({ id: 'o', data: '2026-11-16', consultor_id: 'bia' }), t({ id: 'n', data: '2026-11-16', periodo: 'noite' })],
      ausencias: [{ id: 'a', versao: 1, consultor_id: 'ana', de: '2026-11-23', ate: '2026-11-24', tipo: 'ferias' },
        { id: 'b', versao: 1, consultor_id: 'ana', de: '2026-11-25', ate: '2026-11-25', tipo: 'folga', hora_ini: '08:00:00', hora_fim: '12:00:00' }] } as unknown as Grade;
    const [s1, s2] = disponibilidade(grade, 'ana', '2026-11-17');
    const e = (s: typeof s1, turno: 'manha' | 'tarde') => s[turno].map(c => c.estado);
    expect(e(s1, 'manha')).toEqual(['passado', 'ocupado', 'ocupado', 'livre', 'livre']);
    expect(e(s1, 'tarde')).toEqual(['passado', 'livre', 'ocupado', 'ocupado', 'livre']);
    expect(e(s2, 'manha')).toEqual(['ausente', 'ausente', 'ausente', 'livre', 'livre']);
    expect(e(s2, 'tarde')).toEqual(['ausente', 'ausente', 'livre', 'livre', 'livre']);
    expect(s1.manha[1].itens).toEqual(['ACME · Visita']);
    expect(s2.manha[0].itens).toEqual(['Férias']);
  });

  it('horários escolhidos: manhã + tarde do mesmo dia viram um dia', () => {
    expect(tarefasDosHorarios([{ data: '2026-11-18', turno: 'tarde' }, { data: '2026-11-17', turno: 'manha' }, { data: '2026-11-18', turno: 'manha' }]))
      .toEqual([{ data: '2026-11-17', periodo: 'manha' }, { data: '2026-11-18', periodo: 'dia' }]);
  });

  it('o que cada movimento do kanban pede', () => {
    const c = { tarefas_abertas: 0, ticket: null, localizacao: 'backlog_consultores' as const };
    expect(exigenciaDoMovimento(c, 'atribuido')).toBe('alocar');
    expect(exigenciaDoMovimento({ ...c, tarefas_abertas: 1 }, 'atribuido')).toBe('nada');
    expect(exigenciaDoMovimento({ ...c, tarefas_abertas: 1, localizacao: 'atribuido' }, 'backlog_consultores')).toBe('bloqueado');
    expect(exigenciaDoMovimento(c, 'service_desk')).toBe('ticket');
    expect(exigenciaDoMovimento({ ...c, ticket: '123' }, 'service_desk')).toBe('nada');
    expect(exigenciaDoMovimento(c, 'concluido')).toBe('confirmar');
    expect(exigenciaDoMovimento(c, 'em_validacao')).toBe('nada');
    expect(exigenciaDoMovimento(c, 'backlog_consultores')).toBe('nada');
  });
});
