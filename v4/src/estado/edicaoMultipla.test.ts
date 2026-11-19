import { describe, expect, it } from 'vitest';
import { opcoesStatusLote, planoLote, resumoSelecao, SEM_CAMPOS, statusDoItem, type ItemLote } from './edicaoMultipla';

const dem = (id: string, x: Partial<ItemLote> = {}): ItemLote => ({ tipo: 'demanda', id, nome: 'D ' + id, status: 'backlog', etapa_id: null, responsavel_id: null, ...x });
const tar = (id: string, x: Partial<ItemLote> = {}): ItemLote => ({ tipo: 'tarefa', id, nome: 'T ' + id, status: 'planejada', etapa_id: null, responsavel_id: 'u1', demanda_id: 'd1', ...x });

describe('edição múltipla', () => {
  it('opções de status: demandas, tarefas e os dois (só os comuns)', () => {
    expect(opcoesStatusLote(true, false).map(o => o.valor)).toEqual(['nao_iniciado', 'em_andamento', 'em_validacao', 'concluida', 'cancelada', 'pausada']);
    expect(opcoesStatusLote(false, true)).toEqual([{ valor: 'nao_iniciado', rotulo: 'Não iniciada' }, { valor: 'em_andamento', rotulo: 'Em andamento' },
      { valor: 'concluida', rotulo: 'Concluída' }, { valor: 'cancelada', rotulo: 'Cancelada' }, { valor: 'nao_executada', rotulo: 'Não executada' }]);
    expect(opcoesStatusLote(true, true).map(o => o.valor)).toEqual(['nao_iniciado', 'em_andamento', 'concluida', 'cancelada']);
  });

  it('status do banco por nível; "Não iniciado" mantém backlog/planejada da demanda', () => {
    expect(statusDoItem(dem('1', { status: 'planejada' }), 'nao_iniciado')).toBe('planejada');
    expect(statusDoItem(dem('1', { status: 'em_andamento' }), 'nao_iniciado')).toBe('backlog');
    expect(statusDoItem(dem('1'), 'pausada')).toBe('pausada');
    expect(statusDoItem(dem('1'), 'nao_executada')).toBeNull();
    expect(statusDoItem(tar('1'), 'nao_iniciado')).toBe('planejada');
    expect(statusDoItem(tar('1'), 'em_validacao')).toBeNull();
  });

  it('plano: só os campos escolhidos e só quem muda', () => {
    const itens = [dem('1'), dem('2', { status: 'concluida' }), tar('3'), tar('4', { status: 'concluida' })];
    const p = planoLote(itens, { ...SEM_CAMPOS, status: 'concluida' });
    expect(p.iguais).toBe(2);
    expect(p.gravar.map(g => [g.item.id, g.dados, g.etapaTarefa, g.concluiu])).toEqual([['1', { status: 'concluida' }, null, true], ['3', { status: 'concluida' }, null, true]]);
  });

  it('plano: responsável e etapa (demanda grava etapa_id; tarefa usa a definição de etapa)', () => {
    const p = planoLote([dem('1', { responsavel_id: 'u2', etapa_id: 'e1' }), tar('2', { etapa_id: 'e2' }), tar('3', { responsavel_id: 'u2', etapa_id: 'e1' })],
      { status: '', etapa: 'e1', responsavel: 'u2' });
    expect(p.iguais).toBe(2);
    expect(p.gravar).toEqual([{ item: expect.objectContaining({ id: '2' }), dados: { responsavel_id: 'u2' }, etapaTarefa: 'e1', concluiu: false }]);
    const q = planoLote([dem('1')], { status: '', etapa: 'e1', responsavel: 'u2' });
    expect(q.gravar[0].dados).toEqual({ responsavel_id: 'u2', etapa_id: 'e1' });
    expect(q.gravar[0].etapaTarefa).toBeNull();
  });

  it('plano: nada escolhido não grava nada; status que não existe no nível é ignorado', () => {
    expect(planoLote([dem('1'), tar('2')], SEM_CAMPOS)).toEqual({ gravar: [], iguais: 2 });
    expect(planoLote([tar('2')], { ...SEM_CAMPOS, status: 'em_validacao' }).gravar).toEqual([]);
  });

  it('resumo da seleção', () => {
    expect(resumoSelecao([dem('1')])).toBe('1 demanda');
    expect(resumoSelecao([dem('1'), dem('2'), tar('3')])).toBe('2 demandas · 1 tarefa');
    expect(resumoSelecao([tar('3'), tar('4')])).toBe('2 tarefas');
  });
});
