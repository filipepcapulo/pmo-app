// 4.29.0 (0117): atividades da demanda apontadas pela tarefa, tarefa sem alocação e conferência de OS no Experience.
import { describe, expect, it } from 'vitest';
import { apontavel, escolhasIniciais, marcasParaGravar, resumoAtividades, rotuloSituacaoAtividade, semResposta, situacaoDe, type AtividadeTarefa } from './atividades';
import { corExperience, FILTRO_CONFERENCIA_VAZIO, filtrarConferencia, opcoesConferencia, totaisConferencia, type LinhaConferencia } from './experienceConferencia';
import { abertasDaDemanda, avisoSemAlocacao, resumoSemAlocacao, type TarefaSemAlocacao } from './semAlocacao';
import { lerRota, modulosVisiveis } from '../estado/rotas';
import { OCULTAR } from '../util/selecao';

const at = (m: Partial<AtividadeTarefa>): AtividadeTarefa => ({ id: 'a1', texto: 'Parametrizar', situacao: 'pendente', ordem: 1, minha: null, ...m });

describe('Atividades da demanda (0117)', () => {
  it('resumo: realizadas de total e as parciais', () => {
    expect(resumoAtividades([])).toBe('');
    expect(resumoAtividades([at({}), at({ situacao: 'realizada' })])).toBe('1 de 2 realizadas');
    expect(resumoAtividades([at({ situacao: 'parcial' }), at({ situacao: 'realizada' }), at({})])).toBe('1 de 3 realizadas · 1 parcial');
    expect(resumoAtividades([at({ situacao: 'parcial' }), at({ situacao: 'parcial' })])).toBe('0 de 2 realizadas · 2 parciais');
  });
  it('situação: item antigo (sem o campo) vale o feito', () => {
    expect(situacaoDe({ feito: true })).toBe('realizada');
    expect(situacaoDe({ feito: false })).toBe('pendente');
    expect(situacaoDe({ feito: false, situacao: 'parcial' })).toBe('parcial');
    expect(rotuloSituacaoAtividade('parcial')).toBe('Parcial');
  });
  it('a tarefa aponta o que está em aberto e o que ela mesma já marcou', () => {
    expect(apontavel(at({}))).toBe(true);
    expect(apontavel(at({ situacao: 'parcial' }))).toBe(true);
    expect(apontavel(at({ situacao: 'realizada' }))).toBe(false);                      // outra tarefa concluiu
    expect(apontavel(at({ situacao: 'realizada', minha: 'realizada' }))).toBe(true);    // dá para corrigir
  });
  it('apontamento: começa em branco, exige resposta de cada atividade em aberto e grava só o que mudou', () => {
    const itens = [at({ id: 'a' }), at({ id: 'b', situacao: 'parcial', minha: 'parcial' }), at({ id: 'c', situacao: 'realizada' })];
    const ini = escolhasIniciais(itens);
    expect(ini).toEqual({ a: '', b: 'parcial' });
    expect(semResposta(itens, ini).map(i => i.id)).toEqual(['a']);
    expect(marcasParaGravar(itens, ini)).toEqual([]);
    const fim = { ...ini, a: 'nao_realizada' as const, b: 'realizada' as const };
    expect(semResposta(itens, fim)).toEqual([]);
    expect(marcasParaGravar(itens, fim)).toEqual([{ id: 'a', situacao: 'nao_realizada' }, { id: 'b', situacao: 'realizada' }]);
  });
});

const sa = (m: Partial<TarefaSemAlocacao>): TarefaSemAlocacao => ({
  id: 's1', demanda_id: 'd1', demanda: 'Demanda', pai_id: null, nome: 'Treinar usuários', periodo: 'manha', hora_ini: null, hora_fim: null, horas_previstas: 4,
  modalidade: 'remoto', detalhamento: null, etapa: null, etapa_id: null, agendamento: null, apontamento: 'OS Experience', usuario_cliente_id: null,
  origem_tarefa_id: 't1', origem_responsavel_id: 'c1', origem_responsavel: 'Ana', origem_data: '2026-11-24', criado_em: '2026-11-24T12:00:00Z', criado_por: 'GP', ...m,
});

describe('Tarefa sem alocação (0117)', () => {
  it('o aviso do lançamento vale para a mesma demanda/subdemanda e ignora a que está sendo atribuída', () => {
    const l = [sa({ id: 's1' }), sa({ id: 's2', demanda_id: 'sub1', pai_id: 'd1' }), sa({ id: 's3' })];
    expect(abertasDaDemanda(l, 'd1').map(s => s.id)).toEqual(['s1', 's3']);
    expect(abertasDaDemanda(l, 'sub1').map(s => s.id)).toEqual(['s2']);
    expect(abertasDaDemanda(l, 'd1', 's1').map(s => s.id)).toEqual(['s3']);
    expect(abertasDaDemanda(l, 'outra')).toEqual([]);
  });
  it('textos: resumo da aberta e pergunta de continuar o lançamento', () => {
    expect(resumoSemAlocacao(sa({}))).toBe('Manhã (08h-12h) · Remoto · era de Ana em 24/11');
    expect(resumoSemAlocacao(sa({ periodo: 'livre', hora_ini: '09:00:00', hora_fim: '11:00:00', modalidade: null, origem_responsavel: null, origem_data: null }))).toBe('09:00–11:00');
    expect(avisoSemAlocacao(1)).toMatch(/Já existe 1 tarefa aberta sem alocação.*continuar com o lançamento/);
    expect(avisoSemAlocacao(3)).toMatch(/Já existem 3 tarefas abertas sem alocação/);
  });
});

const lc = (m: Partial<LinhaConferencia>): LinhaConferencia => ({
  id: 't1', tarefa: 'Agenda', consultor_id: 'c1', consultor: 'Ana', data: '2026-11-20', periodo: 'manha', ini: '08:00', fim: '12:00', apontamento: 'OS Experience',
  experience: 'Não lançado', status: 'planejada', cliente_id: 'k1', cliente: 'Cliente', projeto_id: 'p1', projeto: 'Projeto 72345', fap: '72345',
  demanda_id: 'd1', demanda: 'Demanda', subdemanda_id: null, subdemanda: null, lancamento_id: null, ultimo_resultado: null, sync_em: null, tem_os: false, ...m,
});

describe('Conferência de OS no Experience (0117)', () => {
  const ls = [lc({ id: 'a' }), lc({ id: 'b', experience: 'Lançado', consultor_id: 'c2', consultor: 'Bia' }), lc({ id: 'c', experience: 'Lançado', apontamento: 'Hora Dobrada', cliente_id: 'k2', cliente: 'Outro' }),
    lc({ id: 'd', experience: 'Em revisão', status: 'concluida' })];
  it('cartões: as quatro situações conhecidas sempre aparecem, na ordem do que falta fazer; as novas entram no fim', () => {
    expect(totaisConferencia(ls)).toEqual([{ situacao: 'Não lançado', n: 1 }, { situacao: 'Alterar', n: 0 }, { situacao: 'Lixeira', n: 0 }, { situacao: 'Lançado', n: 2 }, { situacao: 'Em revisão', n: 1 }]);
    expect(totaisConferencia([]).map(t => t.n)).toEqual([0, 0, 0, 0]);
    expect(corExperience('Lançado')).toBe('var(--verde)');
    expect(corExperience('Em revisão')).toBe('var(--azul)');
  });
  it('filtros em seleção múltipla com Exibir e Ocultar', () => {
    const f = FILTRO_CONFERENCIA_VAZIO;
    expect(filtrarConferencia(ls, f)).toHaveLength(4);
    expect(filtrarConferencia(ls, { ...f, experience: ['Lançado'] }).map(l => l.id)).toEqual(['b', 'c']);
    expect(filtrarConferencia(ls, { ...f, experience: [OCULTAR, 'Lançado'] }).map(l => l.id)).toEqual(['a', 'd']);
    expect(filtrarConferencia(ls, { ...f, experience: ['Lançado'], consultor: ['c2'] }).map(l => l.id)).toEqual(['b']);
    expect(filtrarConferencia(ls, { ...f, cliente: ['k2'], apontamento: ['Hora Dobrada'] }).map(l => l.id)).toEqual(['c']);
    expect(filtrarConferencia(ls, { ...f, status: ['concluida'] }).map(l => l.id)).toEqual(['d']);
  });
  it('opções dos filtros vêm das próprias linhas', () => {
    const o = opcoesConferencia(ls);
    expect(o.consultores).toEqual([{ valor: 'c1', rotulo: 'Ana' }, { valor: 'c2', rotulo: 'Bia' }]);
    expect(o.clientes.map(c => c.rotulo)).toEqual(['Cliente', 'Outro']);
    expect(o.apontamentos).toEqual(['Hora Dobrada', 'OS Experience']);
    expect(o.status).toEqual(['concluida', 'planejada']);
  });
  it('a tela é um módulo de Execução, só para quem tem experience.conferir', () => {
    const r = lerRota('experience-os');
    expect(r.tipo === 'modulo' && r.modulo.titulo).toBe('Conferência de OS no Experience');
    expect(modulosVisiveis([]).some(m => m.id === 'experience-os')).toBe(false);
    expect(modulosVisiveis(['experience.conferir']).some(m => m.id === 'experience-os')).toBe(true);
  });
});

// 4.30.0: Minha agenda abre na grade e a lista do consultor é de tarefas
import { erroPeriodoTarefas, filtrarMinhasTarefas, periodoMinhasTarefas, type LinhaAgenda } from './consultor';
const la = (m: Partial<LinhaAgenda>): LinhaAgenda => ({ tarefa_id: 't1', data: '2026-11-24', periodo: 'manha', hora_ini: null, hora_fim: null, horas_previstas: 4, modalidade: 'remoto',
  status: 'planejada', tarefa: 'Parametrizar compras', demanda_id: 'd1', demanda: 'Implantação', projeto_id: 'p1', projeto: 'P1', cliente_id: 'k1', cliente: 'Almont', horas_reais: 0, ...m });
describe('Minha agenda › Minhas tarefas (4.30.0)', () => {
  it('período padrão de 30 dias para trás e 60 para a frente; no máximo 93 dias', () => {
    expect(periodoMinhasTarefas('2026-11-24')).toEqual({ de: '2026-10-25', ate: '2027-01-23' });
    expect(erroPeriodoTarefas('2026-10-25', '2027-01-23')).toBeNull();
    expect(erroPeriodoTarefas('2026-01-01', '2026-04-03')).toBeNull();        // 93 dias
    expect(erroPeriodoTarefas('2026-01-01', '2026-04-04')).toMatch(/93/);
    expect(erroPeriodoTarefas('2026-02-01', '2026-01-01')).toMatch(/antes/);
    expect(erroPeriodoTarefas('', '2026-01-01')).toMatch(/Informe/);
  });
  it('busca por tarefa, cliente, projeto ou demanda (sem acento) e filtros de Status e Cliente com Exibir/Ocultar', () => {
    const l = [la({ tarefa_id: 'a' }), la({ tarefa_id: 'b', tarefa: 'Treinar usuários', status: 'concluida', cliente_id: 'k2', cliente: 'HPA' }), la({ tarefa_id: 'c', demanda: 'Fiscal', status: 'cancelada' })];
    const f = { texto: '', status: [], cliente: [] };
    expect(filtrarMinhasTarefas(l, f)).toHaveLength(3);
    expect(filtrarMinhasTarefas(l, { ...f, texto: 'usuarios' }).map(x => x.tarefa_id)).toEqual(['b']);
    expect(filtrarMinhasTarefas(l, { ...f, texto: 'fiscal' }).map(x => x.tarefa_id)).toEqual(['c']);
    expect(filtrarMinhasTarefas(l, { ...f, status: ['planejada', 'concluida'] }).map(x => x.tarefa_id)).toEqual(['a', 'b']);
    expect(filtrarMinhasTarefas(l, { ...f, status: [OCULTAR, 'cancelada'], cliente: ['k1'] }).map(x => x.tarefa_id)).toEqual(['a']);
  });
});
