import { describe, expect, it } from 'vitest';
import { arvoreBacklog, blocosDia, colunasKanban, doGp, faixaEscala, marcasEscala, PX_HORA, rotuloAgendas, ausenciaEm, ausenciasNoDia, diaInteiro, horasAusentes, rotuloAusenciaDia, ordenarDia, porProjeto, diasEntre, faixaTarefa, horasTexto, itensMover, janelaInicial, nivelCarga, rotuloAgenda, segundaDe, statusBacklog, turnoDe,
  type AgendaAberta, type Ausencia, type ItemBacklog, type TarefaGrade } from './equipe';

const back = (o: Partial<ItemBacklog>): ItemBacklog => ({ id: 'd1', pai_id: null, pai: null, nome: 'D1', prioridade: 'normal', status: 'backlog', cliente_id: 'c1',
  cliente: 'Almont', projeto_id: 'p', projeto: 'P1', origem: 'demanda', horas: 8, pedidos: [], ...o });
const tar = (o: Partial<TarefaGrade>): TarefaGrade => ({ id: 't', versao: 1, data: '2026-11-04', periodo: 'manha', hora_ini: null, hora_fim: null, horas_previstas: 4,
  modalidade: null, status: 'planejada', nome: 'T', consultor_id: 'u1', demanda_id: 'd', demanda: 'D', projeto_id: 'p', projeto: 'P', cliente: 'C', ...o });

describe('semanas', () => {
  it('segunda da semana: domingo pertence à semana que termina nele', () => {
    expect(segundaDe('2026-11-04')).toBe('2026-11-02');
    expect(segundaDe('2026-11-08')).toBe('2026-11-02');
    expect(segundaDe('2026-11-02')).toBe('2026-11-02');
  });
  it('janela inicial em semanas fechadas, contendo hoje', () => {
    const j = janelaInicial('2026-11-04');
    expect(j).toEqual({ de: '2026-10-26', ate: '2026-11-22' });
    expect(diasEntre(j.de, j.ate)).toHaveLength(28);
  });
  it('ausência cobre as duas pontas e só a pessoa', () => {
    const a: Ausencia[] = [{ id: '1', versao: 1, consultor_id: 'u1', de: '2026-11-02', ate: '2026-11-03', tipo: 'ferias' }];
    expect(ausenciaEm(a, 'u1', '2026-11-03')?.tipo).toBe('ferias');
    expect(ausenciaEm(a, 'u1', '2026-11-04')).toBeNull();
    expect(ausenciaEm(a, 'u2', '2026-11-03')).toBeNull();
  });
  it('ausência de algumas horas desconta só as horas; dia inteiro tira o dia', () => {
    const tarde: Ausencia = { id: '2', versao: 1, consultor_id: 'u1', de: '2026-11-05', ate: '2026-11-05', tipo: 'ausencia', hora_ini: '14:00', hora_fim: '18:00', horas: 4 };
    const manha: Ausencia = { ...tarde, id: '3', hora_ini: '09:00', hora_fim: '11:00', horas: 2 };
    const ferias: Ausencia = { id: '4', versao: 1, consultor_id: 'u1', de: '2026-11-05', ate: '2026-11-05', tipo: 'ferias' };
    expect(diaInteiro(tarde)).toBe(false);
    expect(horasAusentes([tarde])).toBe(4);
    expect(horasAusentes([tarde, manha])).toBe(6);
    expect(horasAusentes([tarde, ferias])).toBe(8);
    expect(ausenciasNoDia([tarde, ferias], 'u1', '2026-11-05')[0].id).toBe('4');
    expect(rotuloAusenciaDia(tarde)).toBe('Ausência 14h-18h');
    expect(rotuloAusenciaDia({ ...manha, hora_ini: '09:30' })).toBe('Ausência 09:30-11h');
    expect(rotuloAusenciaDia(ferias)).toBe('Férias');
  });
});

describe('backlog', () => {
  const itens = [back({}), back({ id: 's1', pai_id: 'd1', pai: 'D1', nome: 'Sub' }), back({ id: 's2', pai_id: 'd2', pai: 'Só a mãe', nome: 'Sub 2', origem: 'personalizacao' }),
    back({ id: 'x', cliente_id: 'c2', cliente: 'Zeta', nome: 'Pedido', pedidos: [{ id: 'p', versao: 1, horas: 4, motivo: 'm', solicitante: 'u' }] })];
  it('agrupa Cliente → Demanda → Subdemanda; mãe fora do backlog vira só o título', () => {
    const a = arvoreBacklog(itens);
    const almont = a.find(c => c.nome === 'Almont')!;
    expect(almont.demandas.find(d => d.id === 'd1')!.subs.map(s => s.id)).toEqual(['s1']);
    const sem = almont.demandas.find(d => d.id === 'd2')!;
    expect(sem.item).toBeNull();
    expect(sem.nome).toBe('Só a mãe');
  });
  it('cliente com pedido de agenda vem primeiro', () => expect(arvoreBacklog(itens)[0].nome).toBe('Zeta'));
  it('filtra por origem e texto', () => {
    expect(arvoreBacklog(itens, 'personalizacao').flatMap(c => c.demandas).map(d => d.id)).toEqual(['d2']);
    expect(arvoreBacklog(itens, '', 'zeta')).toHaveLength(1);
  });
});

describe('mover', () => {
  it('as selecionadas andam os mesmos dias; só quem era do mesmo consultor troca', () => {
    const a = tar({ id: 'a' }), b = tar({ id: 'b', data: '2026-11-05' }), c = tar({ id: 'c', consultor_id: 'u9' });
    expect(itensMover([a, b, c], a, '2026-11-06', 'u2')).toEqual([
      { id: 'a', versao: 1, data: '2026-11-06', responsavel_id: 'u2' }, { id: 'b', versao: 1, data: '2026-11-07', responsavel_id: 'u2' },
      { id: 'c', versao: 1, data: '2026-11-06', responsavel_id: 'u9' }]);
  });
  it('soltar no mesmo lugar não grava', () => expect(itensMover([tar({})], tar({}), '2026-11-04', 'u1')).toEqual([]));
});

describe('Kanban', () => {
  const ab = (o: Partial<AgendaAberta>): AgendaAberta => ({ ...tar({}), pai_id: null, pai: null, cliente_id: 'c1', ...o });
  const nomes = new Map([['u1', 'Bruno'], ['u2', 'Ana']]);
  const lista = [
    ab({ id: 'a', data: '2026-11-10', consultor_id: 'u1', cliente_id: 'c2', cliente: 'Zeta', demanda_id: 's', demanda: 'Sub', pai_id: 'm', pai: 'Mãe', horas_previstas: 4 }),
    ab({ id: 'b', data: '2026-11-03', consultor_id: 'u1', cliente_id: 'c1', cliente: 'Almont', demanda_id: 'd', demanda: 'Dem', horas_previstas: 8 }),
    ab({ id: 'c', data: '2026-11-05', consultor_id: 'u2', cliente_id: 'c1', cliente: 'Almont', demanda_id: 'd', demanda: 'Dem', horas_previstas: 2 }),
  ];
  it('por consultor: colunas por nome, cartões por data, total de horas; extra entra vazia', () => {
    const c = colunasKanban(lista, 'consultor', id => nomes.get(id), ['u3']);
    expect(c.map(x => [x.titulo, x.itens.map(i => i.id), x.horas])).toEqual([['Ana', ['c'], 2], ['Bruno', ['b', 'a'], 12], ['', [], 0]]);
  });
  it('por cliente e por demanda (subdemanda com a mãe)', () => {
    expect(colunasKanban(lista, 'cliente', id => nomes.get(id)).map(x => [x.titulo, x.itens.length])).toEqual([['Almont', 2], ['Zeta', 1]]);
    expect(colunasKanban(lista, 'demanda', id => nomes.get(id)).map(x => x.titulo)).toEqual(['Dem', 'Mãe › Sub']);
  });
  it('filtro GP do backlog', () => {
    const its = [back({ id: 'x', gp_id: 'g1' }), back({ id: 'y', gp_id: 'g2' }), back({ id: 'z', gp_id: null })];
    expect(doGp(its, 'g1').map(i => i.id)).toEqual(['x']);
    expect(doGp(its, '')).toHaveLength(3);
  });
});

describe('backlog de chamados', () => {
  it('Backlog Base ordena por prioridade e antiguidade, inclusive entre clientes', () => {
    const a = arvoreBacklog([
      back({ id: 'n', nome: 'Normal velho', origem: 'backlog_base', prioridade: 'normal', criado_em: '2026-01-01', cliente_id: 'c1', cliente: 'Almont' }),
      back({ id: 'u2', nome: 'Urgente novo', origem: 'backlog_base', prioridade: 'urgente', criado_em: '2026-10-02', cliente_id: 'c2', cliente: 'Zeta' }),
      back({ id: 'u1', nome: 'Urgente velho', origem: 'backlog_base', prioridade: 'urgente', criado_em: '2026-10-01', cliente_id: 'c2', cliente: 'Zeta' }),
    ], 'backlog_base');
    expect(a.map(c => c.nome)).toEqual(['Zeta', 'Almont']);
    expect(a[0].demandas.map(d => d.nome)).toEqual(['Urgente velho', 'Urgente novo']);
  });
});

describe('agenda como no 2.x', () => {
  it('agendas do dia na ordem das horas: manhã, tarde, noite; sem horário no fim', () => {
    const t = (id: string, periodo: string, hora_ini: string | null = null, hora_fim: string | null = null) => ({ id, periodo, hora_ini, hora_fim });
    const l = [t('noite', 'noite'), t('sem', 'nada'), t('tarde', 'tarde'), t('dia', 'dia'), t('livre', 'livre', '09:00:00', '10:00:00'), t('manha', 'manha')];
    expect(ordenarDia(l).map(x => x.id)).toEqual(['manha', 'dia', 'livre', 'tarde', 'noite', 'sem']);
  });
  it('árvore do backlog ganha o nível de projeto', () => {
    const c = arvoreBacklog([back({ id: 'a', projeto_id: 'p1', projeto: 'P1' }), back({ id: 'b', projeto_id: 'p2', projeto: 'P2' }), back({ id: 'c', projeto_id: 'p1', projeto: 'P1' })])[0];
    expect(porProjeto(c.demandas).map(p => [p.nome, p.demandas.map(d => d.id)])).toEqual([['P1', ['a', 'c']], ['P2', ['b']]]);
  });
  it('turno pela janela: manhã, tarde, dia inteiro e noite (horário livre incluído)', () => {
    const t = (periodo: string, hora_ini: string | null = null, hora_fim: string | null = null) => ({ periodo, hora_ini, hora_fim });
    expect(turnoDe(t('manha'))).toBe('manha');
    expect(turnoDe(t('tarde'))).toBe('tarde');
    expect(turnoDe(t('livre', '09:00:00', '10:00:00'))).toBe('manha');
    expect(turnoDe(t('livre', '13:00:00', '17:00:00'))).toBe('tarde');
    expect(turnoDe(t('livre', '09:00:00', '18:00:00'))).toBe('dia');
    expect(turnoDe(t('livre', '18:00:00', '22:00:00'))).toBe('noite');
    expect(faixaTarefa(t('tarde'))).toEqual([14, 18]);
    expect(faixaTarefa(t('livre', '09:30:00', '11:00:00'))).toEqual([9.5, 11]);
  });
  it('carga do dia nos degraus do 2.x', () => {
    expect([0, 4, 7, 8, 10, 13].map(nivelCarga)).toEqual(['livre', 'parcial', 'parcial', 'cheio', 'acima', 'excesso']);
    expect(horasTexto(7.5)).toBe('7,5 h');
  });
  it('pílula do tipo de agenda', () => {
    expect(['presencial', 'interno', 'remoto', null].map(rotuloAgenda)).toEqual(['Presencial', 'Interno', 'Remoto', '']);
  });
  it('backlog filtra por status e lista só os presentes, na ordem do fluxo', () => {
    const it0 = { id: 'a', pai_id: null, pai: null, nome: 'A', prioridade: 'normal', status: 'planejada', cliente_id: 'c', cliente: 'C', projeto_id: 'p', projeto: 'P', origem: 'demanda', horas: 0, pedidos: [] } as ItemBacklog;
    const itens = [it0, { ...it0, id: 'b', status: 'backlog' }, { ...it0, id: 'c', status: 'backlog' }];
    expect(statusBacklog(itens).map(s => [s.valor, s.total])).toEqual([['backlog', 2], ['planejada', 1]]);
    expect(arvoreBacklog(itens, '', '', new Set(['backlog']))[0].total).toBe(1);
  });
});

describe('escala de tempo da grade aberta', () => {
  it('07h–19h por padrão; alarga em horas cheias só com agenda fora', () => {
    expect(faixaEscala([[8, 12], [14, 18], null])).toEqual([7, 19]);
    expect(faixaEscala([[6.5, 9], [18, 21.25]])).toEqual([6, 22]);
  });
  it('card de 4 h fica do tamanho do card antigo (~56 px) e as outras durações são proporcionais', () => {
    expect(4 * PX_HORA).toBe(56);
    const [manha, livre] = blocosDia([tar({ id: 'm' }), tar({ id: 'l', periodo: 'livre', hora_ini: '14:00', hora_fim: '15:30' })], [7, 19]);
    expect([manha.ini, manha.fim, livre.ini, livre.fim]).toEqual([8, 12, 14, 15.5]);
  });
  it('sobrepostas dividem a largura; sem sobreposição volta a uma coluna', () => {
    const b = blocosDia([tar({ id: 'a', periodo: 'dia' }), tar({ id: 'b', periodo: 'livre', hora_ini: '09:00', hora_fim: '10:00' }),
      tar({ id: 'c', periodo: 'livre', hora_ini: '18:00', hora_fim: '19:00' })], [7, 19]);
    const por = Object.fromEntries(b.map(x => [x.item.id, x]));
    expect([por.a.coluna, por.a.colunas, por.b.coluna, por.b.colunas]).toEqual([0, 2, 1, 2]);
    expect([por.c.coluna, por.c.colunas]).toEqual([0, 1]);
  });
  it('sem horário vai no topo com 1 h; marcas da régua nas horas pares', () => {
    const [x] = blocosDia([tar({ periodo: 'xyz' })], [7, 19]);
    expect([x.semHora, x.ini, x.fim]).toEqual([true, 7, 8]);
    expect(marcasEscala([7, 19])).toEqual([8, 10, 12, 14, 16, 18]);
  });
});

describe('backlog com agendas em aberto', () => {
  it('a mãe fora do backlog herda as agendas trazidas pela subdemanda; rótulo com a próxima data', () => {
    const a = arvoreBacklog([back({ id: 's', pai_id: 'm', pai: 'Mãe', agendas: 0, agendas_pai: 2 }), back({ id: 'd', agendas: 1, agenda_prox: '2026-11-05' })]);
    const ds = a[0].demandas;
    expect(ds.find(d => d.id === 'm')!.agendas).toBe(2);
    expect(ds.find(d => d.id === 'd')!.agendas).toBe(1);
    expect(rotuloAgendas(1, '2026-11-05')).toBe('1 agenda em aberto · próx. 05/11');
    expect(rotuloAgendas(3)).toBe('3 agendas em aberto');
    expect(rotuloAgendas(0)).toBe('');
  });
});
