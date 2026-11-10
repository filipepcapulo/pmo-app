import { describe, expect, it } from 'vitest';
import { filtrarPedidos, fmtMin, porProjeto, textoResultado, textoVerificacao, type LinhaPedido, type Situacao } from './pedidos';

const lin = (fap: string, situacao: Situacao, tipo = '104 - SERV MEDIÇÃO', projetos = ['p1']): LinhaPedido => ({
  fap, parceiro: 'X', projetos: projetos.map(id => ({ id, nome: id, gp_id: null })), pedidos: [{ rotulo: 'P', natureza: '110401', tipo, medicao: tipo.startsWith('104') }],
  medicao: tipo.startsWith('104'), negociado: 6000, consumido: 3000, saldo: 3000, horas: 240, sobra: 2760, qtd_tarefas: 1, sem_periodo: 0, situacao, observacao: '', tarefas: [],
});

describe('verificação de pedidos (V13c-1)', () => {
  it('horas em H:MM, com sinal', () => {
    expect(fmtMin(-330)).toBe('-5:30 h');
    expect(fmtMin(3780, '')).toBe('63:00');
    expect(fmtMin(null)).toBe('—');
  });
  it('filtros Em alerta, Medição, Empreito, Banco de Horas e Todos (RN-09)', () => {
    const ls = [lin('1', 'FALTAM HORAS'), lin('2', 'OK', '105 - SER EMPREITO'), lin('3', 'SALDO BAIXO', '106 - SER BANCO HR'), lin('4', 'CONFERIR'), lin('5', 'SEM PEDIDO')];
    expect(filtrarPedidos(ls, 'alerta').map(l => l.fap)).toEqual(['1', '3', '5']);
    expect(filtrarPedidos(ls, 'medicao').map(l => l.fap)).toEqual(['1', '4', '5']);
    expect(filtrarPedidos(ls, 'empreito').map(l => l.fap)).toEqual(['2']);
    expect(filtrarPedidos(ls, 'banco').map(l => l.fap)).toEqual(['3']);
    expect(filtrarPedidos(ls, 'todos')).toHaveLength(5);
  });
  it('situação por projeto: a mais grave quando o projeto está em mais de uma FAP', () => {
    const m = porProjeto([lin('1', 'OK', undefined, ['a', 'b']), lin('2', 'SALDO BAIXO', undefined, ['b'])]);
    expect(m.get('a')?.situacao).toBe('OK');
    expect(m.get('b')?.situacao).toBe('SALDO BAIXO');
  });
  it('textos: quando/quem/conta e resultado do botão', () => {
    expect(textoVerificacao(null)).toBe('Ainda não verificado.');
    const t = textoVerificacao({ id: 'v', de: '2026-11-09', ate: '2026-11-15', origem: 'agenda', criado_em: '2026-11-10T12:05:00Z', alertas: 1, aviso: null,
      executado_por: null, conta_de: 'Ana', avisos: [], ignoradas: {} });
    expect(t).toMatch(/^Verificado em 10\/11\/2026 .*\(09\/11\/2026 a 15\/11\/2026\) pela checagem das 08h · conta Sankhya de Ana$/);
    expect(textoResultado({ ok: true, id: 'v', alertas: 2, aviso: '2 alerta(s) avisado(s) no sino.', fap: 5 })).toBe('Verificação concluída: 2 pedido(s) em alerta. 2 alerta(s) avisado(s) no sino.');
    expect(textoResultado({ ok: false, codigo: 'SENHA_RECUSADA', erro: 'x' })).toMatch(/nada foi avisado.*Conta Sankhya/);
    expect(textoResultado({ ok: false, codigo: 'NAO_CONFIGURADO', erro: 'x' })).toMatch(/^Cadastre sua Conta Sankhya/);
  });
});
