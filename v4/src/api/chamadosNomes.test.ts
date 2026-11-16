// Uma língua só (4.11.1): a fila do chamado, a localização do fluxo e a etapa sugerida usam os mesmos nomes.
import { describe, expect, it } from 'vitest';
import { ETAPAS, FILAS, rotuloFila } from './chamados';
import { rotuloLocal } from './chamadosV4';

describe('nomes dos backlogs de chamados', () => {
  it('fila = localização do fluxo: Backlog Consultores e Backlog Personalização', () => {
    expect(rotuloFila('base')).toBe(rotuloLocal('backlog_consultores'));
    expect(rotuloFila('dev')).toBe(rotuloLocal('backlog_personalizacao'));
    expect(FILAS.map(f => f.rotulo)).toEqual(['Backlog Consultores', 'Backlog Personalização']);
  });
  it('a etapa do formulário aponta para os mesmos nomes', () => {
    expect(ETAPAS.map(e => e.detalhe)).toEqual(FILAS.map(f => f.rotulo));
  });
});
