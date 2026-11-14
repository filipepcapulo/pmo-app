import { describe, expect, it } from 'vitest';
import { erroVigencia, reais, rotuloPapel, textoLog, vigenciasDe, vigenteEm, type Vigencia } from './financeiro';

const v = (p: Partial<Vigencia>): Vigencia => ({ id: '1', usuario_id: 'a', inicio: '2025-01-01', fim: null, versao: 1, atualizado_em: '', regime: 'PJ', valor_hora: 80, ...p });

describe('cofre financeiro', () => {
  it('vigência que vale na data: a mais recente que cobre o dia; fora de qualquer período = null', () => {
    const l = [v({ id: '1', inicio: '2024-01-21', fim: '2024-12-20' }), v({ id: '2', inicio: '2024-12-21' }), v({ id: '3', usuario_id: 'b' })];
    expect(vigenteEm(l, 'a', '2024-06-01')?.id).toBe('1');
    expect(vigenteEm(l, 'a', '2024-12-20')?.id).toBe('1');
    expect(vigenteEm(l, 'a', '2024-12-21')?.id).toBe('2');
    expect(vigenteEm(l, 'a', '2023-01-01')).toBeNull();
    expect(vigenciasDe(l, 'a').map(x => x.id)).toEqual(['2', '1']);
  });
  it('valores só aparecem quando pedidos', () => {
    expect(reais(1234.5)).toBe('R$ 1.234,50');
    expect(reais(1234.5, true)).toBe('R$ •••');
    expect(reais(null)).toBe('—');
  });
  it('texto do log e rótulo do papel', () => {
    expect(textoLog({ em: '', quem: 'Filipe', acao: 'remuneracao.ver', alvo: null, registro: 'todos' })).toBe('Viu a remuneração de todos');
    expect(textoLog({ em: '', quem: 'Filipe', acao: 'remuneracao.editar', alvo: 'Ana', registro: 'x' })).toBe('Editou período de Ana');
    expect(textoLog({ em: '', quem: 'Filipe', acao: 'acesso.conceder', alvo: 'Ana', registro: 'fechamento' })).toBe('Concedeu acesso a Ana (Fechamento)');
    expect(textoLog({ em: '', quem: 'Filipe', acao: 'acesso.revogar', alvo: 'Ana', registro: 'dono' })).toBe('Revogou acesso de Ana (Dono)');
    expect(rotuloPapel('outro')).toBe('outro');
  });
  it('formulário da vigência', () => {
    const r = { inicio: '2025-01-21', fim: '', valor_hora: '85,50', valor_hora_interno: '', fixo: '', meta_horas: '154' };
    expect(erroVigencia(r)).toBeNull();
    expect(erroVigencia({ ...r, inicio: '' })).toMatch(/início/);
    expect(erroVigencia({ ...r, fim: '2025-01-01' })).toMatch(/fim/);
    expect(erroVigencia({ ...r, valor_hora: '' })).toMatch(/valor hora/);
    expect(erroVigencia({ ...r, fixo: 'abc' })).toMatch(/Fixo/);
  });
});
