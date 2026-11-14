import { describe, expect, it } from 'vitest';
import { aplicarResposta, estadoSla, etapaSugerida, extratoChamado, faltasChamado, prioridadeMatriz, slaDaLinha, type Chamado, type ChamadoLinha, type FichaChamado, type FormChamado } from './chamados';

const form: FormChamado = { cliente_id: 'c', projeto_id: '', titulo: 'Nota não contabiliza', tipo: 'Dúvida / orientação', etapa: 'Atendimento avulso', descricao: 'x'.repeat(50), passos: '',
  esperado: 'Contabilizar a nota', ambiente: 'Produção', abrangencia: 'Um usuário', impacto: 'alto', urgencia: 'alta', solicitante: 'Joana', contato: '67 9999', origem: 'WhatsApp', ticket: '',
  os_sankhya: '', forma_atendimento: 'remoto', prazo: '', motivo_prazo: '', horas: '', sem_anexo: '' };
const linha = (o: Partial<ChamadoLinha> = {}): ChamadoLinha => ({ id: 'c', versao: 1, numero: 7, cliente_id: 'k', cliente: 'Almont', demanda_id: 'd', titulo: 'Nota', tipo: null, categoria: null, fila: 'base',
  prioridade: 'alta', impacto: null, urgencia: null, status_triagem: 'nova', situacao: 'nova', solicitante: 'Joana', ticket: null, criado_em: '2026-11-03T12:00:00Z', sla_resposta_em: '2026-11-03T14:00:00Z',
  sla_solucao_em: '2026-11-05T12:00:00Z', primeira_resposta_em: null, resolvido_em: null, tem_agenda: false, interacoes: 0, ...o });
const AGORA = Date.parse('2026-11-03T13:30:00Z');

describe('chamado: regras', () => {
  it('matriz impacto × urgência igual à do banco', () => {
    expect(prioridadeMatriz('alto', 'alta')).toBe('urgente');
    expect(prioridadeMatriz('alto', 'baixa')).toBe('normal');
    expect(prioridadeMatriz('medio', 'alta')).toBe('alta');
    expect(prioridadeMatriz('baixo', 'media')).toBe('baixa');
  });
  it('etapa sugerida pelo tipo, como no 2.x', () => {
    expect(etapaSugerida('Relatório / dashboard')).toMatch(/^Personaliza/);
    expect(etapaSugerida('Erro / incidente')).toBe('Atendimento avulso');
  });
  it('faltas: formulário do 2.x', () => {
    expect(faltasChamado({ ...form, sem_anexo: 'não há print' }, 0, 1, '2026-11-01')).toEqual([]);
    expect(faltasChamado(form, 1, 1, '2026-11-01')).toEqual([]);
    expect(faltasChamado(form, 0, 1, '2026-11-01').map(x => x[0])).toEqual(['sem_anexo']);
    expect(faltasChamado({ ...form, tipo: 'Erro / incidente' }, 1, 1, '2026-11-01').map(x => x[0])).toEqual(['passos']);
    expect(faltasChamado({ ...form, origem: 'Service Desk' }, 1, 1, '2026-11-01').map(x => x[0])).toEqual(['ticket']);
    expect(faltasChamado(form, 1, 2, '2026-11-01').map(x => x[0])).toEqual(['projeto_id']);
    expect(faltasChamado({ ...form, prazo: '2026-10-01' }, 1, 1, '2026-11-01').map(x => x[0])).toEqual(['prazo', 'motivo_prazo']);
  });
});

describe('chamado: relógio', () => {
  it('estados do prazo', () => {
    expect(estadoSla(null, null, '2026-11-03T12:00:00Z', AGORA).classe).toBe('nenhum');
    expect(estadoSla('2026-11-05T12:00:00Z', null, '2026-11-03T12:00:00Z', AGORA)).toEqual({ texto: 'Faltam 47 h', classe: 'ok' });
    expect(estadoSla('2026-11-03T14:00:00Z', null, '2026-11-03T12:00:00Z', AGORA)).toEqual({ texto: 'Faltam 30 min', classe: 'alerta' });
    expect(estadoSla('2026-11-03T13:00:00Z', null, '2026-11-03T12:00:00Z', AGORA)).toEqual({ texto: 'Vencido há 30 min', classe: 'vencido' });
    expect(estadoSla('2026-11-03T13:00:00Z', '2026-11-03T12:30:00Z', '2026-11-03T12:00:00Z', AGORA)).toEqual({ texto: 'No prazo', classe: 'feito' });
    expect(estadoSla('2026-11-03T13:00:00Z', '2026-11-03T15:00:00Z', '2026-11-03T12:00:00Z', AGORA).classe).toBe('vencido');
  });
  it('lista mostra a resposta até responder, depois a solução; recusado sem relógio', () => {
    expect(slaDaLinha(linha(), AGORA).texto).toBe('Resposta: faltam 30 min');
    expect(slaDaLinha(linha({ primeira_resposta_em: '2026-11-03T12:30:00Z' }), AGORA).texto).toBe('Faltam 47 h');
    expect(slaDaLinha(linha({ situacao: 'recusado' }), AGORA).classe).toBe('nenhum');
  });
});

describe('chamado: extrato e resposta pronta', () => {
  const ficha = {
    chamado: { ...linha({ situacao: 'em_atendimento' }) } as Chamado, demanda: { nome: 'Nota - (Ticket #1)' },
    tarefas: [{ data: '2026-11-04', status: 'planejada' }, { data: '2026-11-04', status: 'em_andamento' }, { data: '2026-11-01', status: 'concluida' }],
    interacoes: [{ id: '1', autor_id: 'u', canal: 'interno', texto: 'log secreto', visivel_cliente: false, criado_em: '2026-11-03T12:10:00Z' },
      { id: '2', autor_id: 'u', canal: 'whatsapp', texto: 'Estamos analisando', visivel_cliente: true, criado_em: '2026-11-03T12:20:00Z' }],
  } as unknown as Pick<FichaChamado, 'chamado' | 'demanda' | 'tarefas' | 'interacoes'>;
  it('extrato traz os dados e só o histórico visível ao cliente', () => {
    const t = extratoChamado(ficha);
    expect(t).toContain('*Chamado #7* — Almont');
    expect(t).toContain('*Situação:* Em atendimento');
    expect(t).toContain('*Agenda:* 04/11/2026');
    expect(t).toContain('Estamos analisando');
    expect(t).not.toContain('log secreto');
  });
  it('resposta pronta preenche as variáveis e mantém as desconhecidas', () => {
    expect(aplicarResposta('Olá {solicitante}, #{numero} de {cliente}: {x}', linha())).toBe('Olá Joana, #7 de Almont: {x}');
  });
});
