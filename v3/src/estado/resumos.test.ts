import { describe, expect, it, vi } from 'vitest';
import { criarResumos, LOTE, type Pedido, type Respostas, type Resumo } from './resumos';

const res = (nome: string) => ({ nome } as Resumo);
const espera = () => new Promise(r => setTimeout(r, 40));
const vazio: Respostas = { clientes: {}, projetos: {}, demandas: {} };

describe('resumos em lote', () => {
  it('pedidos do mesmo instante viram uma chamada só e repetir não chama de novo', async () => {
    const buscar = vi.fn(async (p: Pedido) => ({ ...vazio, clientes: { [p.cliente[0]]: res('Almont') }, demandas: { d1: res('Dem') } }));
    const l = criarResumos(buscar);
    l.pedir('cliente', 'c1', 0); l.pedir('demanda', 'd1', 0); l.pedir('demanda', 'd2', 0); l.pedir('demanda', 'd1', 0);
    await espera();
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar.mock.calls[0][0]).toEqual({ cliente: ['c1'], projeto: [], demanda: ['d1', 'd2'] });
    expect(l.ler('cliente', 'c1')?.nome).toBe('Almont');
    expect(l.ler('demanda', 'd2')).toBeNull();
    l.pedir('cliente', 'c1', 0);
    await espera();
    expect(buscar).toHaveBeenCalledTimes(1);
  });
  it('gravar (geração nova) recarrega mantendo o valor antigo até chegar o novo; depois de 1 min também', async () => {
    let n = 0, t = 0;
    const l = criarResumos(async () => ({ ...vazio, projetos: { p: res('v' + ++n) } }), () => t);
    const avisos = vi.fn();
    l.assinar(avisos);
    l.pedir('projeto', 'p', 0); await espera();
    l.pedir('projeto', 'p', 1);
    expect(l.ler('projeto', 'p')?.nome).toBe('v1');
    await espera();
    expect(l.ler('projeto', 'p')?.nome).toBe('v2');
    t = 61_000; l.pedir('projeto', 'p', 1); await espera();
    expect(l.ler('projeto', 'p')?.nome).toBe('v3');
    expect(avisos).toHaveBeenCalledTimes(3);
  });
  it('lista grande vai em lotes', async () => {
    const buscar = vi.fn(async () => vazio);
    const l = criarResumos(buscar);
    for (let i = 0; i < LOTE + 1; i++) l.pedir('demanda', 'd' + i, 0);
    await espera();
    expect(buscar).toHaveBeenCalledTimes(2);
  });
  it('erro (banco ainda sem a função) não quebra: fica sem resumo', async () => {
    const l = criarResumos(async () => { throw new Error('404'); });
    l.pedir('cliente', 'c', 0); await espera();
    expect(l.ler('cliente', 'c')).toBeNull();
  });
});
