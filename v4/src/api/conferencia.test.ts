import { describe, expect, it } from 'vitest';
import {
  erroPeriodo, mensagemConsultor, pendente, periodoPadrao, porConsultor, textoExecucao, textoResultado, textoVinculo, totaisConferencia,
  vinculavel, type LinhaConferencia,
} from './conferencia';

const lin = (o: Partial<LinhaConferencia>): LinhaConferencia => ({
  id: 'x', tipo: 'tarefa', situacao: 'conferida', fase: 'data', tarefa_id: 't', usuario_id: 'u', consultor: 'Ana Silva', executante: null,
  cliente: 'Guri', fap: '32221', data: '2026-11-03', tarefa_nome: 'Agenda', janela: '08:00-12:00', experience_id: '1', numero_os: '7001',
  os_ini: '08:00', os_fim: '12:00', intervalo_min: 0, horas: 4, horas_antes: null, horas_divididas: false, horario_divergente: false,
  solucao: null, substitui_tarefa: null, substitui_os: null, mensagem: null, vinculado_em: null, vinculado_por: null, ...o,
});

describe('conferência de OS (V13c-3)', () => {
  it('período padrão = ciclo 21–20 atual até hoje; mesmas travas da Edge Function', () => {
    expect(periodoPadrao('2026-11-11')).toEqual({ de: '2026-10-21', ate: '2026-11-11' });
    expect(periodoPadrao('2026-11-25')).toEqual({ de: '2026-11-21', ate: '2026-11-25' });
    expect(periodoPadrao('2027-01-05')).toEqual({ de: '2026-12-21', ate: '2027-01-05' });
    expect(erroPeriodo('2026-10-21', '2026-11-11', '2026-11-11')).toBeNull();
    expect(erroPeriodo('2026-11-12', '2026-11-11', '2026-11-20')).toMatch(/antes/);
    expect(erroPeriodo('2026-11-01', '2026-11-12', '2026-11-11')).toMatch(/hoje/);
    expect(erroPeriodo('2026-08-01', '2026-11-01', '2026-11-11')).toMatch(/63/);
  });
  it('pendência, vínculo e totais', () => {
    const ls = [lin({}), lin({ horas_divididas: true }), lin({ situacao: 'sem_os', numero_os: null }), lin({ situacao: 'aguardando_gp', numero_os: null }),
                lin({ tipo: 'os', situacao: 'os_sem_tarefa', tarefa_id: null }), lin({ situacao: 'tempo_alterado', horas_antes: 4, horas: 3 }),
                lin({ vinculado_em: '2026-11-11T10:00:00Z' })];
    expect(ls.map(pendente)).toEqual([false, true, true, true, true, true, false]);
    expect(ls.map(vinculavel)).toEqual([true, true, false, false, false, true, false]);
    expect(totaisConferencia(ls)).toEqual({ conferida: 3, sem_os: 1, aguardando_gp: 1, tempo_alterado: 1, os_sem_tarefa: 1, conferir: 1, vinculaveis: 3 });
  });
  it('relatório por consultor: quem tem mais pendências primeiro, e a mensagem só com as pendências', () => {
    const g = porConsultor([lin({}), lin({ consultor: 'Bia Lima', situacao: 'sem_os', numero_os: null, mensagem: 'Sem apontamento no Sankhya' }),
                            lin({ consultor: null, executante: 'Zé', tipo: 'os', situacao: 'os_sem_tarefa', numero_os: '8001' })]);
    expect(g.map(x => [x.consultor, x.pendencias.length])).toEqual([['Bia Lima', 1], ['Zé', 1], ['Ana Silva', 0]]);
    const e = { id: 'e', de: '2026-11-01', ate: '2026-11-10', criado_em: '2026-11-11T12:00:00Z', consultor: null, executado_por: 'GP' };
    expect(mensagemConsultor(g[0], e)).toBe('Olá, Bia! Conferência de OS de 01/11/2026 a 10/11/2026: 1 ponto(s) para acertar:\n'
      + '• 03/11/2026 08:00-12:00 Guri — Sem apontamento no Sankhya: Sem apontamento no Sankhya');
    expect(mensagemConsultor(g[2], e)).toMatch(/tudo certo/);
    expect(mensagemConsultor(g[1], null)).toMatch(/OS 8001/);
  });
  it('textos da execução, do resultado e do vínculo', () => {
    expect(textoExecucao(null)).toMatch(/Nenhuma/);
    expect(textoExecucao({ id: 'e', de: '2026-11-01', ate: '2026-11-10', criado_em: '2026-11-11T12:00:00Z', consultor: null, executado_por: 'GP',
                           conta_de: null, completa: false })).toMatch(/01\/11\/2026 a 10\/11\/2026.*por GP · conta padrão · consulta incompleta/);
    expect(textoResultado({ ok: true, execucao: 'e', resumo: { os: 10, tarefas: 12, conferidas: 9, sem_os: 3, aguardando_gp: 1, os_sem_tarefa: 0, falhas: ['1'] } }))
      .toMatch(/10 OS × 12 agenda\(s\)\. 9 conferida.*FAP\(s\) sem resposta do Experience: 1/);
    expect(textoResultado({ ok: false, codigo: 'SENHA_RECUSADA', erro: 'x' })).toMatch(/recusou/);
    expect(textoResultado({ ok: false, codigo: 'NAO_CONFIGURADO', erro: '' })).toMatch(/Cadastre/);
    expect(textoVinculo({ ok: true, criados: 2, atualizados: 0, iguais: 1, ignorados: 3, conferidos_mantidos: 1 }))
      .toBe('Vínculos: 2 gravado(s), 1 já estava(m) igual(is), 1 já conferido(s) pela gerência, mantido(s), 3 ignorado(s).');
  });
});
