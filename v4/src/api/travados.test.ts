import { describe, expect, it } from 'vitest';
import { cicloAnterior, cicloIni, porExecutante, textoExecucao, textoResultado, totaisTravados, type LinhaTravado } from './travados';

const lin = (o: Partial<LinhaTravado>): LinhaTravado => ({
  id: 'x', experience_id: '1', executante: 'Ana', executante_experience: 'ANA', usuario_id: 'u', parceiro: 'P', fap: '1', data_execucao: '2026-11-03',
  visto_em: '2026-11-11', dias_atraso: 5, codigo_sankhya: null, mensagem: null, desconta: null, motivo: null, liberada_em: null,
  editado_por: null, editado_em: null, ...o,
});

describe('apontamentos travados (V13c-2)', () => {
  it('ciclo 21 → 20 (RN-01) e ciclo anterior, inclusive na virada do ano', () => {
    expect(cicloIni('2026-11-11')).toBe('2026-10-21');
    expect(cicloIni('2026-11-21')).toBe('2026-11-21');
    expect(cicloIni('2027-01-05')).toBe('2026-12-21');
    expect(cicloAnterior('2026-10-21')).toBe('2026-09-21');
    expect(cicloAnterior('2027-01-21')).toBe('2026-12-21');
    expect(cicloAnterior('2026-01-21')).toBe('2025-12-21');
  });
  it('totais: liberada fica fora do "em aberto"; sem motivo só entre as abertas', () => {
    const t = totaisTravados([lin({ desconta: 'SIM', motivo: 'Sem apontamento de OS' }), lin({}), lin({ liberada_em: '2026-11-12T10:00:00Z' })]);
    expect(t).toEqual({ total: 3, abertas: 2, liberadas: 1, descontam: 1, sem_motivo: 1 });
  });
  it('por executante (relatório do ciclo): mais travados primeiro', () => {
    expect(porExecutante([lin({ executante: 'Bia' }), lin({ executante: 'Ana', desconta: 'SIM' }), lin({ executante: 'Ana' })]))
      .toEqual([{ executante: 'Ana', total: 2, descontam: 1 }, { executante: 'Bia', total: 1, descontam: 0 }]);
  });
  it('textos: última atualização e resultado do botão', () => {
    expect(textoExecucao(null)).toBe('Ainda não atualizado do Experience neste ciclo.');
    const t = textoExecucao({ criado_em: '2026-11-11T13:05:00Z', completa: false, executado_por: 'Ana', conta_de: null, resumo: { inseridas: 2, ja_existiam: 3 } });
    expect(t).toMatch(/^Atualizado em 11\/11\/2026 \d\d:05 por Ana · conta padrão — 2 nova\(s\), 3 já estavam · consulta incompleta/);
    expect(textoResultado({ ok: true, ciclo: '2026-10-21', resumo: { inseridas: 1, ja_existiam: 0, liberadas: 2, no_prazo: 4, falhas: ['999'] } }))
      .toBe('Ciclo atualizado: 1 travado(s) novo(s), 0 já estavam na lista, 2 liberado(s); 4 ainda no prazo. FAP(s) sem resposta do Experience: 999.');
    expect(textoResultado({ ok: false, codigo: 'SENHA_RECUSADA', erro: 'x' })).toMatch(/recusou o login/);
    expect(textoResultado({ ok: false, codigo: 'NAO_CONFIGURADO', erro: 'x' })).toMatch(/Cadastre sua Conta Sankhya/);
  });
});
