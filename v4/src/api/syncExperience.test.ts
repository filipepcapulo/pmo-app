import { describe, expect, it } from 'vitest';
import { erroPeriodo, fapValida, pendente, periodoPadrao, textoExecucao, textoResultado, textoSyncTarefa, totaisSync } from './syncExperience';

describe('Sync com o Experience (V13d-2)', () => {
  it('período: padrão hoje + 13 dias; até 31 dias e até 62 dias de hoje', () => {
    expect(periodoPadrao('2026-11-11')).toEqual({ de: '2026-11-11', ate: '2026-11-24' });
    expect(erroPeriodo('2026-11-10', '2026-12-10', '2026-11-11')).toBeNull();
    expect(erroPeriodo('2026-11-10', '2026-12-11', '2026-11-11')).toMatch(/31 dias/);
    expect(erroPeriodo('2026-11-12', '2026-11-11', '2026-11-11')).toMatch(/antes/);
    expect(erroPeriodo('2026-08-01', '2026-08-10', '2026-11-11')).toMatch(/62 dias/);
    expect([fapValida(''), fapValida('32221'), fapValida('32a')]).toEqual([true, true, false]);
  });
  it('texto da execução e do resultado (real, simulação, ocupado, sem conta)', () => {
    expect(textoExecucao({ id: 'x', de: '2026-11-16', ate: '2026-11-20', modo: 'simulacao', fap: '32221', criado_em: '2026-11-11T13:05:00Z',
      completa: false, consultor: 'Ana', executado_por: 'Filipe', conta_de: null })).toMatch(/^Simulação de 16\/11\/2026 a 20\/11\/2026 \(FAP 32221, só Ana\).*conta padrão.*incompleta/);
    expect(textoResultado({ ok: true, execucao: 'x', modo: 'real', resumo: { feitos: 3, sem_mudanca: 1, erros: 1, bloqueados: 1, completa: true } }))
      .toBe('Sync feito: 3 gravado(s) no Experience, 1 já certo(s), 2 com pendência.');
    expect(textoResultado({ ok: true, execucao: 'x', modo: 'simulacao', resumo: { simulados: 2, completa: false } })).toMatch(/^Simulação pronta: 2 .*rode de novo/);
    expect(textoResultado({ ok: false, codigo: 'OCUPADO', erro: 'Já existe uma rodada do Sync em andamento (Ana). Aguarde terminar.' })).toMatch(/Ana/);
    expect(textoResultado({ ok: false, codigo: 'NAO_CONFIGURADO', erro: '' })).toMatch(/Conta Sankhya/);
  });
  it('totais, pendências e a linha da ficha da Tarefa', () => {
    const ls = [{ resultado: 'feito' }, { resultado: 'erro' }, { resultado: 'bloqueado' }, { resultado: 'simulado' }] as const;
    expect(totaisSync([...ls])).toEqual({ feito: 1, simulado: 1, sem_mudanca: 0, ignorado: 0, bloqueado: 1, erro: 1 });
    expect(ls.filter(pendente).length).toBe(2);
    expect(textoSyncTarefa(null)).toBeNull();
    expect(textoSyncTarefa({ lancamento_id: '42', acao: 'criar', resultado: 'feito', observacao: 'Lançamento 42 criado no Experience.',
      em: '2026-11-11T13:05:00Z', por: 'Ana', ultima: null })).toMatch(/^Lançamento 42 criado no Experience\. · 11\/11\/2026 .* por Ana$/);
    expect(textoSyncTarefa({ lancamento_id: null, acao: null, resultado: null, observacao: null, em: null, por: null,
      ultima: { acao: 'criar', resultado: 'simulado', mensagem: 'Simulação: criaria o lançamento.', em: '2026-11-11T13:05:00Z', modo: 'simulacao' } }))
      .toMatch(/^Última simulação .*criaria/);
  });
});
