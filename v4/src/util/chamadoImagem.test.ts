// Imagem do chamado para o grupo interno (4.12.0): o que entra no PNG e a quebra de linhas.
import { describe, expect, it } from 'vitest';
import type { FichaChamado } from '../api/chamados';
import { descricaoDoChamado, modeloImagem, quebrarLinhas } from './chamadoImagem';

const ficha = (m: Record<string, unknown> = {}, demanda: Record<string, unknown> = {}) => ({
  chamado: { numero: 45, cliente: 'INOVVATI', tipo: 'Erro / incidente', fila: 'base', prioridade: 'alta', impacto: 'medio', urgencia: 'alta', localizacao: 'triagem',
    solicitante: 'Maicon', contato: '67999990000', origem: 'Whatsapp', ambiente: 'Produção', abrangencia: 'Clientes / fornecedores', passos: 'Portal de vendas, emissão nota serviço ',
    esperado: 'Aprovação da nota. ', prazo: '2026-11-17', motivo_prazo: 'Faturamento de  contratos públicos', criado_em: '2026-11-17T15:31:37+00:00',
    sla_solucao_em: '2026-11-19T15:31:37+00:00', ...m },
  demanda: { nome: 'Erro ao emitir uma nota de Serviço', responsavel_id: null,
    descricao: 'Ocorreu o erro: Código: L0008\nDescrição: indicador não permitido.\n\nOnde ocorre / passos: Portal de vendas\n\nResultado esperado: Aprovação\n\nSolicitante: Maicon · Contato: 67999990000', ...demanda },
  projeto: { id: 'p', nome: 'Inovvati 32223 Avulso', fase: 'Avulso', gp_id: null },
  anexos: [{}],
}) as unknown as FichaChamado;

describe('modeloImagem', () => {
  it('destaca prioridade, backlog e responsável', () => {
    const m = modeloImagem(ficha(), null);
    expect(m.destaques).toEqual([
      { rotulo: 'Prioridade', valor: 'Alta', tom: 'alta' },
      { rotulo: 'Backlog', valor: 'Consultores', tom: 'neutro' },
      { rotulo: 'Responsável', valor: 'A definir', tom: 'neutro' },
    ]);
    expect(modeloImagem(ficha({ fila: 'dev', prioridade: 'urgente' }), 'Ana Lima').destaques.map(d => d.valor)).toEqual(['Urgente', 'Personalização', 'Ana Lima']);
  });
  it('cabeçalho, blocos (no fuso de MS), motivo do prazo e rodapé', () => {
    const m = modeloImagem(ficha(), null);
    expect(m.cabecalho).toBe('Chamado #45 · INOVVATI · Erro / incidente · Triagem');
    expect(m.projeto).toBe('Inovvati 32223 Avulso');
    expect(m.blocos.map(b => b.valor)).toEqual(['Alta · médio', 'Produção', '17/11', '19/11 11:31']);
    expect(m.motivoPrazo).toBe('Faturamento de contratos públicos');
    expect(m.rodape).toEqual(['PMO BP-MS · 1 anexo', 'Aberto 17/11 11:31']);
  });
  it('seções: só a descrição digitada, sem repetir os campos do formulário', () => {
    const m = modeloImagem(ficha(), null);
    expect(m.secoes.map(s => s.rotulo)).toEqual(['O que acontece', 'Onde ocorre', 'Esperado', 'Afetados · solicitante']);
    expect(m.secoes[0].texto).toBe('Ocorreu o erro: Código: L0008\nDescrição: indicador não permitido.');
    expect(m.secoes[3].texto).toBe('Clientes / fornecedores · Maicon (Whatsapp)');
  });
  it('o telefone do contato nunca entra na imagem', () => {
    expect(JSON.stringify(modeloImagem(ficha(), null))).not.toContain('67999990000');
  });
  it('chamado sem os campos opcionais: sem seção vazia e sem motivo', () => {
    const m = modeloImagem(ficha({ impacto: null, urgencia: null, ambiente: null, passos: null, esperado: null, prazo: null, motivo_prazo: null, sla_solucao_em: null,
      abrangencia: null, solicitante: null, localizacao: null }, { descricao: null }), null);
    expect(m.blocos.map(b => b.valor)).toEqual(['—', '—', 'Sem prazo', '—']);
    expect(m.motivoPrazo).toBeNull();
    expect(m.secoes).toEqual([]);
    expect(m.cabecalho).toBe('Chamado #45 · INOVVATI · Erro / incidente');
  });
});

describe('descricaoDoChamado', () => {
  it('descrição sem os campos do formulário fica inteira', () => {
    expect(descricaoDoChamado('Só um texto\n\ncom dois parágrafos')).toBe('Só um texto\ncom dois parágrafos');
  });
});

describe('quebrarLinhas', () => {
  const medir = (s: string) => s.length;   // 1 por caractere
  it('quebra por palavra e respeita as quebras do texto', () => {
    expect(quebrarLinhas('um dois tres quatro', medir, 8, 9)).toEqual(['um dois', 'tres', 'quatro']);
    expect(quebrarLinhas('a\nb', medir, 8, 9)).toEqual(['a', 'b']);
  });
  it('passou do limite, termina em reticências sem estourar a largura', () => {
    const l = quebrarLinhas('um dois tres quatro cinco seis', medir, 8, 2);
    expect(l).toEqual(['um dois', 'tres…']);
    expect(l.every(x => x.length <= 8)).toBe(true);
  });
  it('palavra maior que a linha é cortada', () => {
    const l = quebrarLinhas('abcdefghijkl', medir, 5, 9);
    expect(l.join('')).toBe('abcdefghijkl');
    expect(l.every(x => x.length <= 5)).toBe(true);
  });
});
