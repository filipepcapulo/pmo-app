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

import { andarColunas, barrasAusencia, colunasGantt, conflita, inicioColuna, posicaoBarra, type PedidoAusencia } from './ausencias';
import type { Ausencia, TarefaGrade } from './equipe';

describe('Gantt das ausências (4.10.0)', () => {
  const t = (id: string, consultor_id: string, data: string, x: Partial<TarefaGrade> = {}) =>
    ({ id, versao: 1, data, periodo: 'manha', hora_ini: null, hora_fim: null, horas_previstas: 4, modalidade: null, status: 'planejada', nome: 'T ' + id,
      consultor_id, demanda_id: 'd', demanda: 'D', projeto_id: 'p', projeto: 'P', cliente: 'C', ...x }) as TarefaGrade;
  const a = (x: Partial<Ausencia>) => ({ id: 'a1', versao: 1, consultor_id: 'u1', de: '2026-12-21', ate: '2026-12-23', tipo: 'folga', ...x }) as Ausencia;

  it('monta as colunas por dia, semana, quinzena e mês', () => {
    expect(colunasGantt('2026-11-16', 'dia', 3).map(c => c.rotulo)).toEqual(['16', '17', '18']);
    const s = colunasGantt('2026-11-18', 'semana', 2);
    expect(s.map(c => [c.de, c.ate])).toEqual([['2026-11-16', '2026-11-22'], ['2026-11-23', '2026-11-29']]);
    const q = colunasGantt('2026-01-20', 'quinzena', 4);
    expect(q.map(c => [c.de, c.ate])).toEqual([['2026-01-16', '2026-01-31'], ['2026-02-01', '2026-02-15'], ['2026-02-16', '2026-02-28'], ['2026-03-01', '2026-03-15']]);
    expect(q[0].rotulo).toBe('16–31');
    const m = colunasGantt('2026-11-16', 'mes', 3);
    expect(m.map(c => [c.de, c.ate, c.rotulo, c.grupo])).toEqual([['2026-11-01', '2026-11-30', 'nov', '2026'], ['2026-12-01', '2026-12-31', 'dez', '2026'], ['2027-01-01', '2027-01-31', 'jan', '2027']]);
  });
  it('anda para trás e para a frente em qualquer escala', () => {
    expect(inicioColuna('2026-11-18', 'quinzena')).toBe('2026-11-16');
    expect(andarColunas('2026-01-01', 'quinzena', -1)).toBe('2025-12-16');
    expect(andarColunas('2026-01-16', 'quinzena', -3)).toBe('2025-12-01');
    expect(andarColunas('2026-12-16', 'quinzena', 1)).toBe('2027-01-01');
    expect(andarColunas('2026-01-01', 'mes', -1)).toBe('2025-12-01');
    expect(andarColunas('2026-11-16', 'semana', 4)).toBe('2026-12-14');
  });
  it('conflito: só tarefa em aberto da mesma pessoa dentro da ausência', () => {
    const aus = { consultor_id: 'u1', de: '2026-12-21', ate: '2026-12-23', hora_ini: null, hora_fim: null };
    expect(conflita(aus, t('1', 'u1', '2026-12-22'))).toBe(true);
    expect(conflita(aus, t('2', 'u1', '2026-12-22', { status: 'em_andamento' }))).toBe(true);
    expect(conflita(aus, t('3', 'u1', '2026-12-22', { status: 'concluida' }))).toBe(false);
    expect(conflita(aus, t('4', 'u2', '2026-12-22'))).toBe(false);
    expect(conflita(aus, t('5', 'u1', '2026-12-24'))).toBe(false);
  });
  it('ausência de parte do dia só conflita quando os horários se cruzam', () => {
    const aus = { consultor_id: 'u1', de: '2026-12-21', ate: '2026-12-21', hora_ini: '14:00', hora_fim: '16:00' };
    expect(conflita(aus, t('1', 'u1', '2026-12-21', { periodo: 'manha' }))).toBe(false);
    expect(conflita(aus, t('2', 'u1', '2026-12-21', { periodo: 'tarde' }))).toBe(true);
    expect(conflita(aus, t('3', 'u1', '2026-12-21', { periodo: 'livre', hora_ini: '16:00:00', hora_fim: '18:00:00' }))).toBe(false);
    expect(conflita(aus, t('4', 'u1', '2026-12-21', { periodo: 'livre' }))).toBe(true);
  });
  it('junta aprovadas e pendentes sem repetir e conta as tarefas uma vez', () => {
    const pend = [{ id: 'p1', consultor_id: 'u2', de: '2026-12-28', ate: '2026-12-29', tipo: 'licenca', motivo: 'm', hora_ini: null, hora_fim: null, situacao: 'pendente' },
      { id: 'p2', consultor_id: 'u2', de: '2026-12-30', ate: '2026-12-30', tipo: 'folga', motivo: 'm', hora_ini: null, hora_fim: null, situacao: 'recusada' }] as PedidoAusencia[];
    const tar = [t('1', 'u1', '2026-12-22'), t('1', 'u1', '2026-12-22'), t('2', 'u2', '2026-12-29')];
    const b = barrasAusencia([a({}), a({})], pend, tar);
    expect(b.map(x => [x.consultor_id, x.pendente, x.conflitos.length])).toEqual([['u1', false, 1], ['u2', true, 1]]);
  });
  it('corta a barra na janela', () => {
    expect(posicaoBarra({ de: '2026-12-21', ate: '2026-12-23' }, '2026-12-22', '2026-12-31')).toEqual({ inicio: 0, dias: 2 });
    expect(posicaoBarra({ de: '2026-12-21', ate: '2026-12-23' }, '2026-12-01', '2026-12-31')).toEqual({ inicio: 20, dias: 3 });
    expect(posicaoBarra({ de: '2026-12-21', ate: '2026-12-23' }, '2027-01-01', '2027-01-31')).toBeNull();
  });
});
