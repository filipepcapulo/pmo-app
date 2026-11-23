// 4.28.0: os filtros das outras telas no padrão (seleção múltipla com Exibir/Ocultar).
import { describe, expect, it } from 'vitest';
import { planoBuscaChamados } from '../api/chamados';
import { origemParam, recortarApontamentos, temOrigem, type LinhaApontamento, type RelatorioApontamentos } from '../api/consultor';
import { filtrarPendentes, type LinhaPendente } from '../api/experiencePendentes';
import { filtrar } from '../api/paineis';
import { filtrarSugestoes, type Sugestao } from '../api/sugestoes';
import { comoSelecao, passaEm } from './selecao';

describe('filtro antigo de um valor e a lista nova', () => {
  it("'' = todos; um valor = só ele; lista = Exibir/Ocultar", () => {
    expect(comoSelecao('')).toEqual([]);
    expect(comoSelecao('a')).toEqual(['a']);
    expect(passaEm('', 'x')).toBe(true);
    expect(passaEm('a', 'b')).toBe(false);
    expect(passaEm(['!', 'a'], 'b')).toBe(true);
  });
});

describe('Chamados: o que vai ao banco e o que a tela recorta', () => {
  const PRI = ['urgente', 'alta', 'normal', 'baixa'];
  const vazio = { situacoes: [], prioridades: [], filas: [] };
  it('sem escolha: só o filtro base, paginado no banco', () => {
    const p = planoBuscaChamados({ abertos: true }, vazio, PRI);
    expect(p).toMatchObject({ nada: false, local: null, filtro: { abertos: true, situacao: undefined, prioridade: undefined, fila: undefined } });
  });
  it('uma prioridade ou fila vai ao banco; várias (ou Ocultar) são recortadas na tela', () => {
    expect(planoBuscaChamados({}, { ...vazio, prioridades: ['alta'], filas: ['dev'] }, PRI)).toMatchObject({ local: null, filtro: { prioridade: 'alta', fila: 'dev' } });
    const p = planoBuscaChamados({}, { ...vazio, prioridades: ['!', 'baixa'] }, PRI);
    expect(p.filtro.prioridade).toBeUndefined();
    expect(['urgente', 'baixa'].map(prioridade => p.local!({ prioridade, fila: 'base' }))).toEqual([true, false]);
    expect(planoBuscaChamados({}, { ...vazio, filas: ['!', 'dev'] }, PRI)).toMatchObject({ local: null, filtro: { fila: 'base' } });   // sobrou uma fila: vai ao banco
  });
  it('situações: a lista que passa vai ao banco; esconder todas não traz nada', () => {
    const p = planoBuscaChamados({}, { ...vazio, situacoes: ['!', 'concluido'] }, PRI);
    expect(p.filtro.situacao).not.toContain('concluido');
    expect(p.filtro.situacao!.length).toBeGreaterThan(0);
    expect(planoBuscaChamados({}, { ...vazio, prioridades: ['!', ...PRI] }, PRI).nada).toBe(true);
  });
});

describe('Ordens de Serviço', () => {
  const l = (consultor_id: string, origem: LinhaApontamento['origem'], horas: number) => ({ consultor_id, origem, horas }) as LinhaApontamento;
  const r = { horas: 0, horas_os: 0, horas_app: 0, total: 4, itens: [l('ana', 'sankhya_om', 4), l('ana', 'app', 2), l('bia', 'previsto', 3), l('bia', 'manual', 1)] } as RelatorioApontamentos;
  it('vários consultores: recorta as linhas e refaz os totais', () => {
    expect(recortarApontamentos(r, [])).toBe(r);
    expect(recortarApontamentos(r, ['!', 'bia'])).toMatchObject({ total: 2, horas: 6, horas_os: 4, horas_app: 2, horas_previstas: 0, horas_total: 6 });
    expect(recortarApontamentos(r, ['bia'])).toMatchObject({ total: 2, total_previstas: 1, horas: 1, horas_os: 1, horas_previstas: 3, horas_total: 4 });
  });
  it('Origem com Ocultar', () => {
    expect(temOrigem(['!', 'previsto'], 'app')).toBe(true);
    expect(temOrigem(['!', 'previsto'], 'previsto')).toBe(false);
    expect(origemParam(['!', 'previsto'])).toBe('sankhya_om,manual,app');
    expect(origemParam([])).toBe('tudo');
  });
});

describe('Painéis, Experience pendentes e Sugestões', () => {
  it('painel: filtro por campo com Exibir e Ocultar', () => {
    const linhas = [{ status: 'a' }, { status: 'b' }, { status: 'c' }];
    expect(filtrar(linhas, { status: ['a', 'b'] }).map(x => x.status)).toEqual(['a', 'b']);
    expect(filtrar(linhas, { status: ['!', 'a'] }).map(x => x.status)).toEqual(['b', 'c']);
    expect(filtrar(linhas, { status: ['!'] })).toHaveLength(3);
  });
  it('pendentes: consultor e apontamento em lista', () => {
    const ls = [{ acao: 'criar', consultor_id: 'u1', apontamento: 'A' }, { acao: 'criar', consultor_id: 'u2', apontamento: 'B' }] as LinhaPendente[];
    expect(filtrarPendentes(ls, { acao: '', consultor: ['!', 'u1'], apontamento: [] }).map(x => x.consultor_id)).toEqual(['u2']);
    expect(filtrarPendentes(ls, { acao: '', consultor: '', apontamento: ['A'] }).map(x => x.consultor_id)).toEqual(['u1']);
  });
  it('sugestões: status em lista', () => {
    const l = [{ status: 'nova', minha: true }, { status: 'feita', minha: false }] as Sugestao[];
    expect(filtrarSugestoes(l, ['!', 'nova'], false).map(s => s.status)).toEqual(['feita']);
    expect(filtrarSugestoes(l, '', true).map(s => s.status)).toEqual(['nova']);
  });
});
