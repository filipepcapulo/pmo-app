import { describe, expect, it } from 'vitest';
import { periodoFechamento, totais, type LinhaFechamento } from './fechamento';
import { agendadosDe, cobre, quadroFerias, statusPorDias, tokens, validarProgramacao, type Agendado, type Programacao } from './ferias';
import { agrupar, textoOciosidade, type ConsultorDia } from './ociosidade';
import { alternar, fasesDe, filtrar, gpsDe, janelaGantt, paraGantt, planosPorCliente, porGp, SEM_GP, type ProjetoPortfolio, type RiscoPortfolio } from './portfolio';

const c = (nome: string, situacao: ConsultorDia['situacao'], alocadas: number, sug: string[] = []): ConsultorDia => ({
  id: nome, nome, alocadas, ausencia: 0, capacidade: 8, livres: 8 - alocadas, situacao, agendas: [],
  sugestoes: sug.map(s => ({ demanda_id: s, demanda: s, projeto_id: 'p', projeto: 'P', cliente: 'Cli', fim: '2026-11-10', horas_previstas: 4, afinidade: 1 })),
});

describe('ociosidade', () => {
  it('agrupa por situação; parciais do menos alocado para o mais', () => {
    const g = agrupar([c('A', 'parcial', 6), c('B', 'sem_agenda', 0), c('C', 'parcial', 2), c('D', 'completo', 8), c('E', 'ausente', 0)]);
    expect(g.sem_agenda.map(x => x.nome)).toEqual(['B']);
    expect(g.parcial.map(x => x.nome)).toEqual(['C', 'A']);
    expect(g.completo).toHaveLength(1);
    expect(g.ausente).toHaveLength(1);
  });
  it('texto do relatório no formato do 2.x (até 3 sugestões)', () => {
    const t = textoOciosidade({ data: '2026-11-04', horas_dia: 8, consultores: [c('Ana', 'sem_agenda', 0, ['X', 'Y', 'Z', 'W']), c('Bia', 'parcial', 4)] });
    expect(t).toContain('*Equipe sem agenda - 04/11/2026*');
    expect(t).toContain('• *Ana* (8h disponíveis) — sugestões: Cli - X (10/11), Cli - Y (10/11), Cli - Z (10/11)');
    expect(t).toContain('*COM OCIOSIDADE:*\n• *Bia* (4h alocadas / 4h livres) — sugestões: sem sugestões disponíveis');
    expect(textoOciosidade({ data: '2026-11-04', horas_dia: 8, consultores: [c('D', 'completo', 8)] })).toMatch(/Ninguém ocioso hoje\.$/);
  });
});

const p = (nome: string, fase: string, gp: string | null, extra: Partial<ProjetoPortfolio> = {}): ProjetoPortfolio => ({
  id: nome, nome, fase, cliente_id: 'c', cliente: 'Cliente ' + nome, gp_id: gp, gp, inicio: null, fim: null, golive: null, golive_ok: false,
  atraso: null, etapas_atrasadas: [], horas_agendadas: 0, horas_executadas: 0, horas_pedidas: 0, demandas_abertas: 0, ...extra,
});

describe('portfólio', () => {
  const ps = [p('A', 'Avulso', 'Elson'), p('B', 'P2', null), p('C', 'P1', 'Filipe', { atraso: 'golive' }), p('D', 'Sustentação', 'Filipe')];
  it('fases na ordem P1…, Sustentação, Avulso; GP vazio vira "Sem GP" no fim', () => {
    expect(fasesDe(ps)).toEqual(['P1', 'P2', 'Sustentação', 'Avulso']);
    expect(gpsDe(ps)).toEqual(['Elson', 'Filipe', SEM_GP]);
  });
  it('filtra por fases e GPs (seleção múltipla) e texto sem acento', () => {
    expect(filtrar(ps, { gps: ['Filipe'] }).map(x => x.nome)).toEqual(['C', 'D']);
    expect(filtrar(ps, { fases: ['P2'], gps: [SEM_GP] })).toHaveLength(1);
    expect(filtrar(ps, { fases: ['P1', 'Avulso'] }).map(x => x.nome)).toEqual(['A', 'C']);
    expect(filtrar(ps, { gps: ['Elson', SEM_GP] }).map(x => x.nome)).toEqual(['A', 'B']);
    expect(filtrar(ps, { fases: [], gps: [] })).toHaveLength(4);
    expect(filtrar(ps, { texto: 'sustentacao' }).map(x => x.nome)).toEqual(['D']);
    expect(alternar(alternar(['P1'], 'P2'), 'P1')).toEqual(['P2']);
  });
  it('Gantt: Avulso só com cronograma; plano de ação por cliente', () => {
    const g = paraGantt([...ps, p('E', 'Avulso', null, { cronograma: true })]).map(x => x.nome);
    expect(g).toEqual(['B', 'C', 'D', 'E']);
    const r = (projeto_id: string, cliente_id?: string) => ({ demanda_id: 'x', nome: 'P', projeto_id, projeto: '', cliente_id, cliente: '', responsavel: null,
      vencimento: null, dias: null, prioridade: 'normal', nivel: 'moderado' }) as RiscoPortfolio;
    const m = planosPorCliente([r('A'), r('B'), r('zz', 'c9')], [p('A', 'P1', null, { cliente_id: 'c1' }), p('B', 'P1', null, { cliente_id: 'c1' })]);
    expect([...m]).toEqual([['c1', 2], ['c9', 1]]);
  });
  it('projetos por GP com atrasados', () => {
    expect(porGp(ps).find(x => x.gp === 'Filipe')).toEqual({ gp: 'Filipe', n: 2, atrasados: 1 });
  });
  it('janela do Gantt limitada e com hoje dentro', () => {
    const j = janelaGantt([p('X', 'P1', null, { inicio: '2020-01-10', fim: '2030-01-01' })], '2026-11-04');
    expect(j).toEqual({ ini: '2026-05-01', fim: '2027-12-01' });
    const k = janelaGantt([p('Y', 'P1', null, { inicio: '2026-12-15', fim: '2027-01-20' })], '2026-11-04');
    expect(k.ini).toBe('2026-11-01');
    expect(k.fim).toBe('2027-01-20');
  });
});

describe('férias (mesmas regras do servidor 2.x)', () => {
  const prog = (limite: string, gozados = 0): Programacao => ({ colaboradores: [{ nome: 'JOÃO DA SILVA', codigo: 7, periodos: [
    { inicio_aquisitivo: '2025-01-10', fim_aquisitivo: '2026-01-09', limite_gozo: limite, dias_direito: 30, dias_gozados: gozados },
    { inicio_aquisitivo: '2024-01-10', fim_aquisitivo: '2025-01-09', limite_gozo: '2025-12-09', dias_direito: 30, dias_gozados: 30 },
  ] }] });
  const ag = (nome: string, inicio: string, fim: string, cancelado = false): Agendado => ({ nome, inicio, fim, cancelado, origem: 'v3' });
  it('status pelos dias até o limite: < 0 atrasado, ≤ 60 crítico, ≤ 120 atenção', () => {
    expect([-1, 0, 60, 61, 120, 121].map(statusPorDias)).toEqual(['atrasado', 'critico', 'critico', 'atencao', 'atencao', 'ok']);
  });
  it('usa o período pendente; dias e ação', () => {
    const [l] = quadroFerias(prog('2026-12-09'), [], '2026-11-04');
    expect(l.nome).toBe('João Da Silva');
    expect(l.limite).toBe('2026-12-09');
    expect(l.dias).toBe(35);
    expect(l.saldo).toBe(30);
    expect(l.visual).toBe('critico');
    expect(l.acao).toBe('Agendar 30 dia(s) nas próximas semanas — prazo limite 09/12/2026.');
    expect(quadroFerias(prog('2026-10-01'), [], '2026-11-04')[0].acao).toMatch(/^URGENTE/);
  });
  it('casa o agendado pelo nome (palavras em comum) e pelo ciclo', () => {
    expect(tokens('João da Silva')).toEqual(['joao', 'silva']);
    expect(agendadosDe('JOAO DA SILVA', [ag('João Silva', '2026-11-20', '2026-12-09'), ag('Maria Souza', '2026-11-20', '2026-12-09')])[0].nome).toBe('João Silva');
    const [l] = quadroFerias(prog('2026-12-09'), [ag('João Silva', '2026-11-20', '2026-12-09')], '2026-11-04');
    expect(l.visual).toBe('agendado');
    expect(l.status).toBe('critico');
    expect(l.acao).toBe('Férias agendadas: 20/11/2026 a 09/12/2026');
  });
  it('cancelado ou fora do ciclo não cobre', () => {
    expect(cobre([ag('x', '2026-11-20', '2026-12-09', true)], '2025-01-10', '2026-12-09', '2026-11-04')).toBeNull();
    expect(cobre([ag('x', '2024-11-01', '2024-11-30')], '2025-01-10', '2026-12-09', '2026-11-04')).toBeNull();
    expect(cobre([ag('x', '2024-12-15', '2024-12-30')], '2025-01-10', '2026-12-09', '2026-11-04')?.inicio).toBe('2024-12-15');
  });
  it('ordena por urgência', () => {
    const q = quadroFerias({ colaboradores: [
      { nome: 'OK', periodos: [{ inicio_aquisitivo: '2026-01-01', fim_aquisitivo: '2026-12-31', limite_gozo: '2027-12-01', dias_direito: 30, dias_gozados: 0 }] },
      { nome: 'ATRASADO', periodos: [{ inicio_aquisitivo: '2024-01-01', fim_aquisitivo: '2024-12-31', limite_gozo: '2026-01-01', dias_direito: 30, dias_gozados: 0 }] },
    ] }, [], '2026-11-04');
    expect(q.map(x => x.nome)).toEqual(['Atrasado', 'Ok']);
  });
  it('valida a programação antes de enviar', () => {
    expect(validarProgramacao({})).toEqual(['Sem "colaboradores".']);
    expect(validarProgramacao(prog('2026-12-09'))).toEqual([]);
    const ruim = prog('09/12/2026');
    expect(validarProgramacao(ruim)[0]).toContain('limite_gozo deve ser aaaa-mm-dd');
  });
});

describe('fechamento', () => {
  it('período: 21 do mês retrasado a 20 do mês anterior (virada de ano também)', () => {
    expect(periodoFechamento('2026-11-04')).toEqual({ de: '2026-09-21', ate: '2026-10-20' });
    expect(periodoFechamento('2027-01-15')).toEqual({ de: '2026-11-21', ate: '2026-12-20' });
    expect(periodoFechamento('2027-02-28')).toEqual({ de: '2026-12-21', ate: '2027-01-20' });
  });
  it('totais da equipe', () => {
    const l = (total: number, extras: number) => ({ total, extras, normais: total - extras, horas_os: total, horas_app: 0, capacidade: 160, agendado: 0, pendentes: 1 }) as unknown as LinhaFechamento;
    expect(totais([l(150.5, 2), l(10.25, 0)])).toMatchObject({ total: 160.75, extras: 2, capacidade: 320, pendentes: 2 });
  });
});
