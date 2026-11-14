import { describe, expect, it } from 'vitest';
import { adiar, contagens, corStatus, haDias, mensagemLeitura, numerosDoTexto, passa, type ChamadoPortal, type SinaisPortal } from './chamadosPortal';

const S: SinaisPortal = { rotulo: 'Aberto', nova: false, aguardando: false, vencido: false, parado: false, resolvido: false, andamento: true, fechado: false, nao_lido: false, dias_parado: 0 };
const c = (s: Partial<SinaisPortal>, extra: Partial<ChamadoPortal> = {}) => ({ id: 'x', numero: 123456, status: 'open', sinais: { ...S, ...s }, ...extra }) as ChamadoPortal;

describe('chamados do portal', () => {
  it('números de 5 a 8 dígitos nos links e no texto, sem repetir', () => {
    expect(numerosDoTexto('https://ajuda.sankhya.com.br/hc/pt-br/requests/8812345\n7700001, 8812345, 1234 e 123456789')).toEqual([8812345, 7700001]);
    expect(numerosDoTexto('nada')).toEqual([]);
  });
  it('filtros e contagens (RF-06)', () => {
    const ls = [c({ nova: true }), c({ aguardando: true }), c({ vencido: true }), c({ parado: true }), c({ resolvido: true, andamento: false })];
    const n = contagens(ls);
    expect([n.atencao, n.nova, n.aguardando, n.vencido, n.parado, n.andamento, n.resolvido, n.todos]).toEqual([4, 1, 1, 1, 1, 4, 1, 5]);
    expect(passa(ls[4], 'andamento')).toBe(false);
  });
  it('cor do status pelo significado (RF-04b)', () => {
    expect(corStatus(c({ aguardando: true }))).toBe('vermelho');
    expect(corStatus(c({ resolvido: true }))).toBe('verde');
    expect(corStatus(c({ rotulo: 'Escalonado para o P&D' }))).toBe('roxo');
    expect(corStatus(c({ rotulo: 'Em espera' }, { status: 'hold' }))).toBe('laranja');
    expect(corStatus(c({}))).toBe('azul');
    expect(corStatus(c({ nao_lido: true }, { status: null }))).toBe('cinza');
  });
  it('adiar +N dias e "há N dias"', () => {
    const hoje = new Date(2026, 10, 30);
    expect(adiar(1, hoje)).toBe('2026-12-01');
    expect(adiar(7, hoje)).toBe('2026-12-07');
    expect(haDias(new Date(2026, 10, 27).toISOString(), hoje)).toBe('há 3 dias');
    expect(haDias(null)).toBe('');
  });
  it('mensagem da leitura: login recusado leva ao manual', () => {
    expect(mensagemLeitura({ ok: true, lidos: 0, falhas: 2, login_recusado: true, sem_conta: 0, avisos: 0, total: 2 }).texto).toMatch(/à mão/);
    expect(mensagemLeitura({ ok: true, lidos: 2, falhas: 0, login_recusado: false, sem_conta: 0, avisos: 1, total: 2 })).toEqual({ texto: '2 de 2 lido(s) no portal.', tipo: 'ok' });
    expect(mensagemLeitura({ ok: false, codigo: 'X', erro: 'falhou' }).tipo).toBe('erro');
  });
});
