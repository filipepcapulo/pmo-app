import { describe, expect, it } from 'vitest';
import { textoLog } from './financeiro';
import { faixaMargem, horasDe, pctMargem, podeRentabilidade, ROTULO_GRUPO, textoValorHora, valorHoraDe } from './rentabilidade';

describe('rentabilidade (F5)', () => {
  it('só os papéis Dono e Rentabilidade do cofre veem (Fechamento sozinho, ninguém e sem cofre ficam de fora)', () => {
    expect(podeRentabilidade(['dono'])).toBe(true);
    expect(podeRentabilidade(['rentabilidade'])).toBe(true);
    expect(podeRentabilidade(['fechamento', 'rentabilidade'])).toBe(true);
    expect(podeRentabilidade(['fechamento'])).toBe(false);
    expect(podeRentabilidade([])).toBe(false);
    expect(podeRentabilidade(undefined)).toBe(false);
    expect(podeRentabilidade(null)).toBe(false);
  });
  it('valor/hora do formulário: vírgula, ponto de milhar e R$; vazio = sem valor; ilegível ou negativo = NaN', () => {
    expect(valorHoraDe('185,50')).toBe(185.5);
    expect(valorHoraDe('1.250,00')).toBe(1250);
    expect(valorHoraDe('R$ 200')).toBe(200);
    expect(valorHoraDe('185.5')).toBe(185.5);
    expect(valorHoraDe('0')).toBe(0);
    expect(valorHoraDe('  ')).toBeNull();
    for (const ruim of ['abc', '-5', '12,345', '1,2,3', '200000']) expect(valorHoraDe(ruim), ruim).toBeNaN();
    expect(textoValorHora(185.5)).toBe('185,50');
    expect(textoValorHora(null)).toBe('');
    expect(valorHoraDe(textoValorHora(1250))).toBe(1250);
  });
  it('horas executadas, percentual e faixa da margem (negativa, baixa < 20%, boa); oculto esconde o percentual', () => {
    expect(horasDe(21 * 60)).toBe('21 h');
    expect(horasDe(750)).toBe('12,5 h');
    expect(pctMargem(0.6)).toBe('60%');
    expect(pctMargem(0.1234)).toBe('12,3%');
    expect(pctMargem(0.6, true)).toBe('•••');
    expect(pctMargem(null)).toBe('—');
    expect(faixaMargem({ margem: null, margem_pct: null })).toBe('sem');
    expect(faixaMargem({ margem: -10, margem_pct: -0.1 })).toBe('negativa');
    expect(faixaMargem({ margem: 10, margem_pct: 0.1 })).toBe('baixa');
    expect(faixaMargem({ margem: 10, margem_pct: 0.2 })).toBe('boa');
    expect(ROTULO_GRUPO).toEqual({ cliente: 'Projeto', projeto: 'Demanda', demanda: 'Subdemanda' });
  });
  it('registro de acessos do cofre descreve as consultas e gravações da rentabilidade sem citar valores', () => {
    const l = (acao: string, registro: string | null) => textoLog({ em: '', quem: 'Ana', acao, alvo: null, registro });
    expect(l('rentabilidade.ver', 'projeto:b0000000-0000-4000-8000-000000000001')).toBe('Viu a rentabilidade de um projeto');
    expect(l('rentabilidade.ver', 'cliente:x')).toBe('Viu a rentabilidade de um cliente');
    expect(l('pedido_valor.ver', 'projeto:x')).toBe('Viu o valor dos pedidos de um projeto');
    expect(l('pedido_valor.salvar', 'e0000000-0000-4000-8000-000000000001')).toBe('Gravou o valor/hora de um pedido');
    expect(l('pedido_valor.remover', 'x')).toBe('Removeu o valor/hora de um pedido');
  });
});
