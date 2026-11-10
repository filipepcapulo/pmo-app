import { describe, expect, it } from 'vitest';
import { arvoreBacklog, type ItemBacklog } from './equipe';
import type { DemandaLinha } from './execucao';
import { diasNaFila, lerStatus, relatorioBacklog, relatorioDemandas, rotuloStatus, ABERTAS, TODOS } from './relatorios';
import { escapar, relatorioHtml } from '../util/relatorioHtml';
import { destinatarios, marcadosPadrao, rotuloFora, type ClienteEnvio } from './envioAgenda';

const item = (o: Partial<ItemBacklog>): ItemBacklog => ({ id: 'd1', pai_id: null, pai: null, nome: 'Demanda', prioridade: 'normal', status: 'backlog',
  cliente_id: 'c1', cliente: 'Cliente', projeto_id: 'p1', projeto: 'P1', origem: 'demanda', horas: 0, pedidos: [], ...o });

describe('relatório HTML (V13a-5)', () => {
  it('escapa tudo o que vem dos dados', () => {
    expect(escapar('<b>"A" & \'B\'</b>')).toBe('&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;');
    const h = relatorioHtml({ titulo: 'T <x>', filtros: ['Status: <todos>'], colunas: ['A'], secoes: [{ titulo: 'S', linhas: [['<script>']] }], geradoEm: new Date(0) });
    expect(h).not.toContain('<script>');
    expect(h).toContain('&lt;script&gt;');
    expect(h).toContain('<title>T &lt;x&gt;</title>');
    expect(h).toContain('Total: 1 item(ns)');
    expect(h.startsWith('<!doctype html>')).toBe(true);
  });
  it('sem itens avisa', () => {
    expect(relatorioHtml({ titulo: 'T', filtros: [], colunas: ['A'], secoes: [] })).toContain('Nenhum item com esse filtro.');
  });
  it('backlog: o que a árvore mostra, por cliente, com dias na fila, agendas e pedidos', () => {
    const itens = [
      item({ id: 'd1', nome: 'Mãe', criado_em: '2026-11-01T10:00:00Z', horas: 4, agendas: 2, agenda_prox: '2026-11-12' }),
      item({ id: 's1', pai_id: 'd1', pai: 'Mãe', nome: 'Filha', prioridade: 'alta', status: 'planejada',
        pedidos: [{ id: 'x', versao: 1, horas: 3, motivo: 'mais agenda', solicitante: 'A' }] }),
      item({ id: 'd2', nome: 'Fora', status: 'pausada' }),
    ];
    const r = relatorioBacklog(arvoreBacklog(itens, '', '', new Set(['pausada'])), ['Status: x'], '2026-11-10');
    expect(r.secoes).toHaveLength(1);
    expect(r.secoes[0].titulo).toBe('Cliente');
    expect(r.secoes[0].linhas).toEqual([
      ['P1', 'Mãe', '', 'Backlog', 'Normal', 'Demandas', 4, 9, '2 agendas em aberto · próx. 12/11', ''],
      ['P1', 'Mãe', 'Filha', 'Planejada', 'Alta', 'Demandas', null, null, '', '3 h — mais agenda'],
    ]);
  });
  it('dias na fila', () => {
    expect(diasNaFila('2026-11-01T23:00:00Z', '2026-11-10')).toBe(9);
    expect(diasNaFila(null, '2026-11-10')).toBeNull();
    expect(diasNaFila('2026-11-12', '2026-11-10')).toBe(0);
  });
  it('demandas: um bloco por cliente · projeto, subdemanda com a mãe', () => {
    const d = (o: Partial<DemandaLinha>) => ({ id: 'a', pai_id: null, nome: 'A', status: 'em_andamento', prioridade: 'normal', inicio: '2026-11-03', fim: null,
      horas_previstas: 8, etapa: null, projeto_id: 'p', projeto: 'P1', cliente: 'Cli', ...o }) as DemandaLinha;
    const r = relatorioDemandas([d({}), d({ id: 'b', pai_id: 'a', nome: 'B', horas_previstas: null })], ['Status: abertas']);
    expect(r.secoes).toEqual([{ titulo: 'Cli · P1', linhas: [
      ['A', '', 'Em andamento', 'Normal', '03/11/2026', '', 8, ''], ['A', 'B', 'Em andamento', 'Normal', '03/11/2026', '', null, ''],
    ] }]);
  });
  it('filtro de vários status: guardado, ordem do fluxo, inválido/vazio = abertas', () => {
    expect(lerStatus('["concluida","backlog"]')).toEqual(['backlog', 'concluida']);
    expect(lerStatus('["xx"]')).toEqual(ABERTAS);
    expect(lerStatus('{')).toEqual(ABERTAS);
    expect(lerStatus(null)).toEqual(ABERTAS);
    expect(rotuloStatus(TODOS)).toBe('todos');
    expect(rotuloStatus(ABERTAS)).toBe('abertas');
    expect(rotuloStatus(['concluida', 'cancelada'])).toBe('Concluída, Cancelada');
  });
});

describe('envio de agendas — regras da Central (0058)', () => {
  const c = (o: Partial<ClienteEnvio>) => ({ cliente_id: 'a', agendas: [{}], contatos: [{}], ultimo_envio: null, ...o }) as unknown as ClienteEnvio;
  it('cliente com motivo vem desmarcado', () => {
    expect(marcadosPadrao([c({ cliente_id: 'a' }), c({ cliente_id: 'b', desmarcado_motivo: 'X-Interno: atendimento interno' })])).toEqual(['a']);
  });
  it('1º contato no Para e os demais em Cc; banco antigo (sem tipo) = todos no Para', () => {
    const l = { nome: 'L', email: 'l@x.com', papel: 'lider' as const }, p = { nome: 'P', email: 'p@x.com', papel: 'patrocinador' as const };
    expect(destinatarios([{ ...l, tipo: 'para' }, { ...p, tipo: 'cc' }])).toEqual({ para: [{ ...l, tipo: 'para' }], cc: [{ ...p, tipo: 'cc' }] });
    expect(destinatarios([l, p])).toEqual({ para: [l, p], cc: [] });
  });
  it('aviso do que ficou fora', () => {
    expect(rotuloFora({ fora_planejamento: 2, fora_gestao: 1 })).toBe('Fora do e-mail: 2 de Planejamento e 1 de gestor.');
    expect(rotuloFora({ fora_planejamento: 0 })).toBe('');
  });
});
