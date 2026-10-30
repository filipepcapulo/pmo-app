import { describe, expect, it } from 'vitest';
import { ordenar, paginar } from './paginacao';
import { traduzirErro } from '../api/mensagens';

describe('tabela', () => {
  const linhas = Array.from({ length: 42 }, (_, i) => ({ n: i + 1 }));
  it('pagina 10/15/30/50', () => {
    expect(paginar(linhas, 1, 10).rotulo).toBe('1–10 de 42');
    expect(paginar(linhas, 5, 10).itens.length).toBe(2);
    expect(paginar(linhas, 9, 15).pagina).toBe(3);
    expect(paginar(linhas, 1, 50).paginas).toBe(1);
    expect(paginar([], 1, 10).rotulo).toBe('0 de 0');
  });
  it('ordena texto com acento e número', () => {
    const r = ordenar([{ a: 'Érica' }, { a: 'ana' }, { a: 'Bruno' }], 'a', false).map(x => x.a);
    expect(r).toEqual(['ana', 'Bruno', 'Érica']);
    expect(ordenar(linhas, 'n', true)[0].n).toBe(42);
  });
  it('erro do banco mostra só o texto', () => {
    expect(traduzirErro({ message: 'ESCRITORIO: você não tem acesso a este escritório' }))
      .toEqual({ codigo: 'ESCRITORIO', mensagem: 'você não tem acesso a este escritório' });
    expect(traduzirErro(new TypeError('Failed to fetch')).codigo).toBe('REDE');
  });
});
