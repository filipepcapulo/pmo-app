import { describe, expect, it } from 'vitest';
import { avisosPendente, erroPeriodoPendentes, filtrarPendentes, janelaPendente, opcoesPendentes, periodoPendentes, ROTULO_PENDENCIA, totaisPendentes, type LinhaPendente } from './experiencePendentes';
import { extensaoAnexo, tarefaTravadaOs, visualAnexo } from './execucao';
import { projetoInativo } from './cadastros';

const linha = (m: Partial<LinhaPendente>): LinhaPendente => ({
  id: 't1', tarefa: 'Agenda', consultor_id: 'c1', consultor: 'Ana', data: '2026-11-20', periodo: 'manha', ini: '08:00', fim: '12:00',
  apontamento: 'OS Experience', experience: null, acao: 'criar', status: 'planejada', cliente: 'Cliente', projeto_id: 'p1', projeto: 'Projeto 72345',
  fap: '72345', projeto_inativo: false, demanda_id: 'd1', demanda: 'Demanda', subdemanda_id: null, subdemanda: null,
  lancamento_id: null, ultimo_resultado: null, observacao: null, sync_em: null, tem_os: false, ...m,
});

describe('Tarefas Pendentes no Experience (0105)', () => {
  it('abertura, ajuste e exclusão: rótulos e totais', () => {
    expect(ROTULO_PENDENCIA).toEqual({ criar: 'Abertura', alterar: 'Ajuste', excluir: 'Exclusão' });
    expect(totaisPendentes([linha({}), linha({ acao: 'alterar' }), linha({ acao: 'excluir' }), linha({})])).toEqual({ criar: 2, alterar: 1, excluir: 1 });
  });
  it('filtra por ação, consultor e apontamento; as opções vêm das linhas', () => {
    const ls = [linha({ id: 'a' }), linha({ id: 'b', acao: 'alterar', consultor_id: 'c2', consultor: 'Bia', apontamento: 'Hora Dobrada' }), linha({ id: 'c', acao: 'excluir' })];
    expect(filtrarPendentes(ls, { acao: '', consultor: '', apontamento: '' })).toHaveLength(3);
    expect(filtrarPendentes(ls, { acao: 'alterar', consultor: '', apontamento: '' }).map(l => l.id)).toEqual(['b']);
    expect(filtrarPendentes(ls, { acao: '', consultor: 'c1', apontamento: '' }).map(l => l.id)).toEqual(['a', 'c']);
    expect(filtrarPendentes(ls, { acao: 'criar', consultor: 'c2', apontamento: '' })).toHaveLength(0);
    expect(filtrarPendentes(ls, { acao: '', consultor: '', apontamento: 'Hora Dobrada' }).map(l => l.id)).toEqual(['b']);
    expect(opcoesPendentes(ls)).toEqual({ consultores: [{ id: 'c1', nome: 'Ana' }, { id: 'c2', nome: 'Bia' }], apontamentos: ['Hora Dobrada', 'OS Experience'] });
  });
  it('período: padrão de 31 dias para trás e para a frente; no máximo 125 dias', () => {
    expect(periodoPendentes('2026-11-18')).toEqual({ de: '2026-10-18', ate: '2026-12-19' });
    expect(erroPeriodoPendentes('2026-11-01', '2026-11-30')).toBeNull();
    expect(erroPeriodoPendentes('2026-11-30', '2026-11-01')).toMatch(/antes/);
    expect(erroPeriodoPendentes('2026-01-01', '2026-05-05')).toBeNull();        // 125 dias
    expect(erroPeriodoPendentes('2026-01-01', '2026-05-06')).toMatch(/125/);
    expect(erroPeriodoPendentes('', '2026-05-06')).toMatch(/Informe/);
  });
  it('período da grade com o horário do lançamento', () => {
    expect(janelaPendente({ periodo: 'manha', ini: '08:00', fim: '12:00' })).toBe('Manhã · 08:00–12:00');
    expect(janelaPendente({ periodo: 'livre', ini: '13:00', fim: '17:00' })).toBe('Livre · 13:00–17:00');
    expect(janelaPendente({ periodo: 'tarde', ini: null, fim: null })).toBe('Tarde');
  });
  it('avisos: sem FAP, projeto inativo, OS já emitida, último sync e agenda vencida sem lançamento', () => {
    expect(avisosPendente(linha({}), '2026-11-18')).toEqual([]);
    expect(avisosPendente(linha({ fap: null, projeto_inativo: true }), '2026-11-18')).toEqual(['Projeto sem FAP no nome: o sync não trata', 'Projeto inativo']);
    expect(avisosPendente(linha({ data: '2026-11-10' }), '2026-11-18')).toEqual(['Agenda já passou sem lançamento']);
    expect(avisosPendente(linha({ data: '2026-11-10', acao: 'excluir' }), '2026-11-18')).toEqual([]);
    expect(avisosPendente(linha({ acao: 'alterar', tem_os: true, ultimo_resultado: 'erro' }), '2026-11-18')).toEqual(['Já tem OS no Sankhya', 'Último sync com erro']);
    expect(avisosPendente(linha({ tem_os: true }), '2026-11-18')).toEqual([]);
  });
});

describe('Tarefa com OS, projeto inativo e galeria de anexos (0105)', () => {
  it('tarefa com número de OS: só o Admin altera', () => {
    expect(tarefaTravadaOs({ tem_os: true }, 'gp')).toBe(true);
    expect(tarefaTravadaOs({ tem_os: true }, 'consultor')).toBe(true);
    expect(tarefaTravadaOs({ tem_os: true }, 'admin')).toBe(false);
    expect(tarefaTravadaOs({ tem_os: false }, 'gp')).toBe(false);
    expect(tarefaTravadaOs({}, 'gp')).toBe(false);
    expect(tarefaTravadaOs(null, 'gp')).toBe(false);
  });
  it('projeto inativo = encerrado ou cancelado (o "Z" da lista)', () => {
    expect(['ativo', 'pausado', 'encerrado', 'cancelado'].map(projetoInativo)).toEqual([false, false, true, true]);
    expect(projetoInativo(null)).toBe(false);
  });
  it('miniatura: imagem, PDF e vídeo têm pré-visualização; o resto mostra a extensão', () => {
    expect(visualAnexo({ nome: 'tela.png', tipo: 'image/png' })).toBe('imagem');
    expect(visualAnexo({ nome: 'foto.JPG', tipo: null })).toBe('imagem');
    expect(visualAnexo({ nome: 'contrato.pdf', tipo: 'application/pdf' })).toBe('pdf');
    expect(visualAnexo({ nome: 'laudo.PDF', tipo: null })).toBe('pdf');
    expect(visualAnexo({ nome: 'erro.mp4', tipo: 'video/mp4' })).toBe('video');
    expect(visualAnexo({ nome: 'planilha.xlsx', tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).toBe('outro');
    expect(visualAnexo({ nome: 'imagem.png', tipo: 'application/octet-stream' })).toBe('outro');
    expect(extensaoAnexo('planilha.xlsx')).toBe('XLSX');
    expect(extensaoAnexo('sem_extensao')).toBe('ARQ');
  });
});
