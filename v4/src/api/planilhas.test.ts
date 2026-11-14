import { describe, expect, it } from 'vitest';
import {
  abaProximoCiclo, mensagemConsultorPl, pendentePl, porConsultorPl, textoAbaCicloPl, textoConferirPl, textoExecucaoPl, textoFecharPl, totaisPl,
  type LinhaPlanilha,
} from './planilhas';

const lin = (o: Partial<LinhaPlanilha>): LinhaPlanilha => ({
  id: 'x', situacao: 'conferido', usuario_id: 'u', consultor: 'Ana Silva', data: '2026-10-21', tarefa_id: 't', tarefa_nome: 'Agenda',
  apontamento: 'Bonificado (Planilha)', janela: '08:00-12:00', parceiro: 'Origem', cliente_planilha: 'Origem Ltda', hora_ini: '08:00', hora_fim: '12:00',
  intervalo_min: 0, total_min: 240, descricao: null, os: null, observacao: null, texto_conflito: null, arquivo_nome: 'P.xlsx', aba: 'OUT-NOV26',
  linha: 6, obs_gravada: null, validado_em: null, ...o,
});

describe('conferência de planilhas (V13e-1)', () => {
  it('pendências e totais (horas da planilha × só na agenda)', () => {
    const ls = [lin({}), lin({ os: '7186553' }), lin({ situacao: 'horario' }), lin({ situacao: 'falta', linha: null, aba: null, total_min: 180 }),
                lin({ situacao: 'sem_tarefa', tarefa_id: null }), lin({ situacao: 'duplicado' })];
    expect(ls.map(pendentePl)).toEqual([false, true, true, true, true, true]);
    const t = totaisPl(ls);
    expect([t.conferido, t.horario, t.falta, t.sem_tarefa, t.duplicado, t.com_os, t.pendencias]).toEqual([2, 1, 1, 1, 1, 1, 5]);
    expect([t.min_planilha, t.min_so_agenda]).toEqual([1200, 180]);
  });
  it('aba do próximo ciclo (21–20)', () => {
    expect(abaProximoCiclo('2026-11-11')).toBe('NOV-DEZ26');
    expect(abaProximoCiclo('2026-11-20')).toBe('NOV-DEZ26');
    expect(abaProximoCiclo('2026-11-21')).toBe('DEZ-JAN27');
    expect(abaProximoCiclo('2026-12-25')).toBe('JAN-FEV27');
    expect(abaProximoCiclo('2027-01-05')).toBe('JAN-FEV27');
  });
  it('mensagens: conferir, fechar (OBS mantida, VISTO, erro por planilha), aba do ciclo, sem configuração', () => {
    expect(textoConferirPl({ ok: true, execucao: 'e', resumo: { planilhas: 2, conferido: 3, horario: 1, cliente: 1, falta: 2, sem_tarefa: 1, sem_cadastro: ['ZÉ'] } }))
      .toBe('Conferência pronta: 2 planilha(s). 3 conferido(s), 2 com diferença, 2 falta(m) na planilha, 1 sem agenda, 0 conflito(s)/duplicado(s). Pasta sem consultor no cadastro: ZÉ.');
    expect(textoConferirPl({ ok: false, codigo: 'NAO_CONFIGURADO', erro: 'x' })).toMatch(/GOOGLE_SA_JSON/);
    expect(textoFecharPl({ ok: true, criados: 2, validados: 1, arquivos: [
      { id: 'a', nome: 'A', pasta: 'ANA', escritas: 4, mantidas: 1, visto: false, backup: 'b', erro: null },
      { id: 'b', nome: 'B', pasta: 'JOAO', escritas: 15, mantidas: 0, visto: true, backup: 'b', erro: null },
      { id: 'c', nome: 'C', pasta: 'LIA', backup: null, erro: 'a planilha mudou depois da conferência' }] }))
      .toBe('Planilhas fechadas: 19 OBS preenchida(s), 1 OBS com texto manual mantida(s), 1 planilha(s) vazia(s) com VISTO. 2 apontamento(s) validado(s) criado(s), 1 já existente(s) validado(s). Não gravadas: LIA (a planilha mudou depois da conferência).');
    expect(textoAbaCicloPl({ ok: true, criadas: 1, resultado: [{ id: 'a', nome: 'A', pasta: 'ANA', alvo: 'NOV-DEZ26', criada: true, backup: 'b', erro: null },
      { id: 'b', nome: 'B', pasta: 'JOAO', alvo: 'NOV-DEZ26', ja_existia: true, backup: null, erro: null }] })).toBe('Aba NOV-DEZ26 criada em 1 planilha(s); 1 já tinha(m).');
    expect(textoFecharPl({ ok: false, codigo: 'JA_FECHADA', erro: '' })).toMatch(/já foram fechadas/);
  });
  it('relatório por consultor e mensagem só com as pendências', () => {
    const g = porConsultorPl([lin({}), lin({ consultor: 'Bruno Lima', situacao: 'sem_tarefa', observacao: 'Sem agenda' })]);
    expect(g.map(x => x.consultor)).toEqual(['Bruno Lima', 'Ana Silva']);
    expect(mensagemConsultorPl(g[0], null)).toBe('Olá, Bruno! Conferência da planilha de horas: 1 ponto(s) para acertar:\n• 21/10/2026 08:00-12:00 Origem Ltda — Sem agenda no app: Sem agenda');
    expect(mensagemConsultorPl(g[1], null)).toMatch(/tudo certo/);
    expect(textoExecucaoPl(null)).toMatch(/Nenhuma/);
  });
});
