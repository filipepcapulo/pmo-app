import { describe, expect, it } from 'vitest';
import { arvoreBacklog, ausenciaEm, ordenarDia, porProjeto, diasEntre, faixaTarefa, horasTexto, itensMover, janelaInicial, nivelCarga, paraGravar, rotuloAgenda, segundaDe, situacaoFila, statusBacklog, sugerirReprogramacao, turnoDe, wip,
  type Ausencia, type DepFila, type ItemBacklog, type ItemFila, type TarefaGrade } from './equipe';

const item = (o: Partial<ItemFila>): ItemFila => ({ fila_id: 'f', id: 'a', nome: 'A', pai: null, status: 'planejada', inicio: null, fim: null, horas: 8,
  versao: 1, prioridade: 'normal', projeto: 'P', cliente: 'C', bloqueio: null, tarefas: [], ...o });
const dep = (o: Partial<DepFila>): DepFila => ({ id: 'd', origem: 'a', destino: 'b', tipo: 'TI', folga_dias: 0, versao: 1, origem_nome: 'A',
  origem_status: 'em_andamento', origem_fim: null, ...o });
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

describe('fila', () => {
  it('situação: bloqueio manda; depois em andamento; TI pendente bloqueia; concluída libera', () => {
    const b = item({ id: 'b' });
    expect(situacaoFila(item({ bloqueio: { id: 'x', versao: 1, motivo: 'm', inicio: '' }, status: 'em_andamento' }), [])).toBe('bloqueada');
    expect(situacaoFila(item({ status: 'em_andamento' }), [])).toBe('agora');
    expect(situacaoFila(b, [dep({})])).toBe('bloqueada');
    expect(situacaoFila(b, [dep({ origem_status: 'concluida' })])).toBe('proxima');
  });
  it('WIP não conta bloqueada', () => {
    expect(wip([item({ status: 'em_andamento' }), item({ status: 'em_andamento', bloqueio: { id: 'x', versao: 1, motivo: 'm', inicio: '' } }), item({})])).toBe(1);
  });
  it('atrasada empurra as seguintes, pulando fim de semana e mantendo a duração', () => {
    const a = item({ id: 'a', status: 'em_andamento', inicio: '2026-11-02', fim: '2026-11-03' });
    const b = item({ id: 'b', inicio: '2026-11-04', fim: '2026-11-05', tarefas: [{ id: 't', versao: 3, data: '2026-11-05' }] });
    const s = sugerirReprogramacao('u', [a, b], [], [], '2026-11-06'); // sexta
    expect(s.map(x => [x.item.id, x.inicio, x.fim])).toEqual([['a', '2026-11-02', '2026-11-06'], ['b', '2026-11-09', '2026-11-10']]);
    expect(s[1].tarefas).toEqual([{ id: 't', versao: 3, de: '2026-11-05', data: '2026-11-10' }]);
  });
  it('concluiu antes: a próxima encosta em hoje', () => {
    const b = item({ id: 'b', inicio: '2026-11-16', fim: '2026-11-17' });
    expect(sugerirReprogramacao('u', [b], [], [], '2026-11-09').map(x => [x.inicio, x.fim])).toEqual([['2026-11-09', '2026-11-10']]);
  });
  it('fila em dia não sugere nada', () => {
    expect(sugerirReprogramacao('u', [item({ inicio: '2026-11-09', fim: '2026-11-10' })], [], [], '2026-11-09')).toEqual([]);
  });
  it('ausência empurra; bloqueada fica parada e não ocupa a fila', () => {
    const bl = item({ id: 'x', inicio: '2026-11-09', fim: '2026-11-09', bloqueio: { id: 'b', versao: 1, motivo: 'm', inicio: '' } });
    const c = item({ id: 'c', inicio: '2026-11-20', fim: '2026-11-20' });
    const aus: Ausencia[] = [{ id: '1', versao: 1, consultor_id: 'u', de: '2026-11-09', ate: '2026-11-11', tipo: 'ferias' }];
    expect(sugerirReprogramacao('u', [bl, c], [], aus, '2026-11-09').map(x => [x.item.id, x.inicio])).toEqual([['c', '2026-11-12']]);
  });
  it('dependência de outro consultor segura o início, com folga', () => {
    const b = item({ id: 'b', inicio: '2026-11-09', fim: '2026-11-09' });
    const s = sugerirReprogramacao('u', [b], [dep({ origem: 'fora', origem_fim: '2026-11-11', folga_dias: 1 })], [], '2026-11-09');
    expect(s[0].inicio).toBe('2026-11-13');
  });
  it('paraGravar separa demandas e tarefas com a versão lida', () => {
    const b = item({ id: 'b', versao: 7, inicio: '2026-11-16', fim: '2026-11-16', tarefas: [{ id: 't', versao: 2, data: '2026-11-16' }] });
    expect(paraGravar(sugerirReprogramacao('u', [b], [], [], '2026-11-09'))).toEqual({
      demandas: [{ id: 'b', versao: 7, inicio: '2026-11-09', fim: '2026-11-09' }], tarefas: [{ id: 't', versao: 2, data: '2026-11-09' }] });
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
