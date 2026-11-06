// 0051 / 3.16.0: tipo "Presencial na Unidade Sankhya" e rodapé de autoria do cartão flutuante da Agenda da equipe.
import { describe, expect, it } from 'vitest';
import { rotuloAgenda } from './equipe';
import { MODALIDADES, rotuloAutoria, rotuloModalidade } from './execucao';

describe('tipo de agenda', () => {
  it('tem "Presencial na Unidade Sankhya" além das opções de antes', () => {
    expect(MODALIDADES.map(m => m.valor)).toEqual(['', 'remoto', 'interno', 'presencial', 'unidade']);
    expect(rotuloModalidade('unidade')).toBe('Presencial na Unidade Sankhya');
    expect(rotuloModalidade('presencial')).toBe('Presencial no cliente');
  });
  it('pílula curta da grade/Kanban', () => {
    expect(rotuloAgenda('unidade')).toBe('Unidade Sankhya');
    expect(rotuloAgenda('presencial')).toBe('Presencial');
    expect(rotuloAgenda(null)).toBe('');
  });
});

describe('rotuloAutoria', () => {
  it('criou, editou e ClickUp, com a data dd/mm', () => {
    expect(rotuloAutoria({ acao: 'criou', id: 'u', nome: 'Ana', em: '2026-11-05T13:00:00Z' })).toBe('Criada por Ana · 05/11');
    expect(rotuloAutoria({ acao: 'editou', id: 'u', nome: 'Bia', em: '2026-11-06T18:00:00Z' })).toBe('Editada por Bia · 06/11');
    expect(rotuloAutoria({ acao: 'clickup', id: null, nome: 'Caio', em: '2026-11-01T10:00:00Z' })).toBe('Criada no ClickUp por Caio · 01/11');
    expect(rotuloAutoria({ acao: 'clickup', id: null, nome: null, em: null })).toBe('Criada no ClickUp');
  });
  it('sem autoria: vazio (o rodapé não aparece)', () => {
    expect(rotuloAutoria(null)).toBe('');
    expect(rotuloAutoria(undefined)).toBe('');
  });
});
