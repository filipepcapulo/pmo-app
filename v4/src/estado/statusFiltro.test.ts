import { describe, expect, it } from 'vitest';
import { bancoDoStatus, selDeStatus, STATUS_PADRAO } from './statusFiltro';
import { ABERTAS, TODOS } from '../api/relatorios';

describe('filtro de Status no padrão de pílula (4.28.0)', () => {
  it('padrão = demandas abertas; nada marcado = todos', () => {
    expect([...bancoDoStatus(STATUS_PADRAO)].sort()).toEqual([...ABERTAS].sort());
    expect(bancoDoStatus([])).toEqual(TODOS);
  });
  it('Exibir e Ocultar viram a lista de status do banco ("Não iniciado" = backlog + planejada)', () => {
    expect(bancoDoStatus(['nao_iniciado'])).toEqual(['backlog', 'planejada']);
    expect(bancoDoStatus(['!', 'concluida', 'cancelada']).sort()).toEqual([...ABERTAS].sort());
  });
  it('lê a escolha nova e converte a antiga (status do banco)', () => {
    expect(selDeStatus(null)).toEqual(STATUS_PADRAO);
    expect(selDeStatus(['!', 'cancelada'])).toEqual(['!', 'cancelada']);
    expect(selDeStatus(['backlog', 'planejada', 'concluida'])).toEqual(['nao_iniciado', 'concluida']);
    expect(selDeStatus(TODOS)).toEqual([]);
    expect(selDeStatus(['lixo'])).toEqual(STATUS_PADRAO);
  });
});
