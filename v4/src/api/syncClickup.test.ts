import { describe, expect, it } from 'vitest';
import { duracao, haQuanto, linkClickup, minutosDesde, nivelFila, nivelModo, resumoFilas, situacaoGeral, textoModo, type ModoStatus, type StatusSync } from './syncClickup';

const AGORA = '2026-11-13T14:00:00Z';
const antes = (min: number) => new Date(Date.parse(AGORA) - min * 60000).toISOString();
const modo = (m: ModoStatus['modo'], p: Partial<ModoStatus> = {}): ModoStatus => ({
  modo: m, ultima_em: antes(1), ultima_ok: true, ultima_cota: false, ultima_duracao_ms: 900, ultima_boa_em: antes(1), falhas_seguidas: 0,
  falhando_desde: null, ultimo_erro: null, ultimo_erro_em: null, ...p });
const vazia = { total: 0, vencidos: 0, com_erro: 0, mais_antiga: null, mais_antiga_vencida: null, em_espera_ate: null, por_tipo: {} };
function status(p: Partial<StatusSync> = {}): StatusSync {
  return {
    agora: AGORA, destino: 'clickup', parado_min: 10, trava_ate: null, ultima_execucao_em: antes(1),
    modos: [modo('puxar'), modo('merge'), modo('completo', { ultima_em: null, ultima_ok: null, ultima_boa_em: null }), modo('enviar'), modo('projetar')],
    execucoes: [],
    filas: { entrada: { pendentes: 0, com_erro: 0, mais_antiga: null }, saida: { pendente: 0, enviando: 0, erro: 0, ok_24h: 12, mais_antiga: null, vencidos: 0, mais_antiga_vencida: null },
      espelho_fila: vazia, espelho_saida: vazia },
    itens: [], itens_total: 0,
    webhook: { registrado: true, criado_em: antes(9000), eventos: 12, ultimo_evento_em: antes(3), saude: { em: antes(600), status: 'active', alerta: null, reativado: null, falhas: null } },
    merge: { ultimo_em: antes(10), marca: antes(10), completo: { estado: 'feito', inicio: antes(600), pagina: 9, recebidas: 880, excluidas: 0, alerta: null, atualizado_em: antes(590) } },
    ...p,
  };
}

describe('Status da sincronização com o ClickUp (0076)', () => {
  it('tempo: minutos pela hora do servidor e a duração por extenso', () => {
    expect(minutosDesde(antes(3), AGORA)).toBe(3);
    expect(minutosDesde(null, AGORA)).toBeNull();
    expect([duracao(0), duracao(45), duracao(60), duracao(130), duracao(60 * 52), duracao(null)]).toEqual(['agora', '45 min', '1 h', '2 h 10 min', '2 d 4 h', '—']);
    expect(haQuanto(antes(130), AGORA)).toBe('há 2 h 10 min');
  });
  it('tudo em dia fica verde, sem motivos; modo sem execução em 7 dias é neutro', () => {
    const s = status();
    expect(situacaoGeral(s)).toEqual({ nivel: 'verde', motivos: [] });
    expect(nivelModo(s.modos[2])).toBeNull();
    expect(textoModo(s.modos[2], AGORA)).toMatch(/Sem execução/);
  });
  it('a parada de 11 a 13/11: projetar falhando a cada minuto e as filas cheias ficam vermelhos', () => {
    const proj = modo('projetar', { ultima_ok: false, ultima_boa_em: antes(3345), falhas_seguidas: 3300, falhando_desde: antes(3344),
      ultimo_erro: 'canceling statement due to statement timeout', ultimo_erro_em: antes(1) });
    const s = status({
      modos: [modo('puxar'), modo('merge'), modo('enviar'), proj],
      filas: { entrada: { pendentes: 0, com_erro: 0, mais_antiga: null }, saida: { pendente: 0, enviando: 0, erro: 0, ok_24h: 0, mais_antiga: null, vencidos: 0, mais_antiga_vencida: null },
        espelho_fila: { ...vazia, total: 121, vencidos: 121, mais_antiga: antes(3340), mais_antiga_vencida: antes(3340), por_tipo: { raiz: 121, lista: 0 } },
        espelho_saida: { ...vazia, total: 115, vencidos: 115, mais_antiga: antes(3300), mais_antiga_vencida: antes(3300), por_tipo: { tarefas: 100, demandas: 15 } } },
    });
    const g = situacaoGeral(s);
    expect(g.nivel).toBe('vermelho');
    expect(g.motivos[0]).toMatch(/^Projetar: falhando há 2 d 7 h \(3300 execuções seguidas\); última execução boa há 2 d 7 h$/);
    expect(g.motivos.join('|')).toMatch(/Fila ClickUp → app: 121 item\(ns\), o mais antigo há 2 d 7 h\./);
    expect(g.motivos.join('|')).toMatch(/Fila App → ClickUp: 115 item/);
    expect(nivelModo(proj)).toBe('vermelho');
    expect(resumoFilas(s)[2]).toMatchObject({ fila: 'espelho_fila', pendentes: 121, detalhe: '121 raiz' });
  });
  it('amarelo: uma falha isolada, item com erro, fila parada há mais de X minutos, cota e merge atrasado', () => {
    expect(situacaoGeral(status({ modos: [modo('enviar', { ultima_ok: false, falhas_seguidas: 1, falhando_desde: antes(1), ultimo_erro: 'x' })] })).nivel).toBe('amarelo');
    expect(nivelModo(modo('merge', { ultima_cota: true }))).toBe('amarelo');
    const s = status();
    s.filas.saida = { pendente: 2, enviando: 0, erro: 1, ok_24h: 5, mais_antiga: antes(12), vencidos: 2, mais_antiga_vencida: antes(12) };
    expect(situacaoGeral(s)).toEqual({ nivel: 'amarelo', motivos: ['Fila Saída para o ClickUp: 2 item(ns), o mais antigo há 12 min, 1 com erro.'] });
    expect(nivelFila({ vencidos: 2, com_erro: 0, mais_antiga: antes(5) }, s)).toBe('verde');
    expect(nivelFila({ vencidos: 2, com_erro: 0, mais_antiga: antes(31) }, s)).toBe('vermelho');
    expect(nivelFila({ vencidos: 0, com_erro: 0, mais_antiga: antes(500) }, s)).toBe('verde');
    expect(situacaoGeral(status({ merge: { ultimo_em: antes(80), marca: null, completo: null } })).motivos[0]).toMatch(/merge não roda há 1 h 20 min/);
  });
  it('vermelho: sync em silêncio, webhook sem registro ou sumido; ClickUp desligado não cobra modos nem webhook', () => {
    expect(situacaoGeral(status({ ultima_execucao_em: antes(95) })).motivos[0]).toBe('O sync não roda há 1 h 35 min.');
    expect(situacaoGeral(status({ ultima_execucao_em: null })).nivel).toBe('vermelho');
    const semWebhook = { registrado: false, criado_em: null, eventos: null, ultimo_evento_em: null, saude: null };
    expect(situacaoGeral(status({ webhook: semWebhook })).motivos).toEqual(['O webhook do ClickUp não está registrado.']);
    expect(situacaoGeral(status({ webhook: { ...status().webhook, saude: { em: antes(5), status: null, alerta: 'webhook sumiu do ClickUp', reativado: null, falhas: null } } })).nivel).toBe('vermelho');
    const local = situacaoGeral(status({ destino: 'local', ultima_execucao_em: null, webhook: semWebhook }));
    expect(local.nivel).toBe('verde');
    expect(local.motivos[0]).toMatch(/ClickUp desligado/);
  });
  it('item em espera não é fila parada: saída segurada até 20/11 fica verde; com erro em nova tentativa fica só amarelo (0077)', () => {
    const s = status();
    s.filas.espelho_saida = { ...vazia, total: 2, vencidos: 0, mais_antiga: antes(1500), em_espera_ate: '2026-11-20T12:00:00Z', por_tipo: { tarefas: 2 } };
    expect(situacaoGeral(s)).toEqual({ nivel: 'verde', motivos: [] });
    expect(resumoFilas(s)[3]).toMatchObject({ pendentes: 2, vencidos: 0, mais_antiga: null });
    expect(resumoFilas(s)[3].detalhe).toMatch(/^2 tarefas · 2 em espera até 20\/11/);
    s.filas.espelho_fila = { ...vazia, total: 1, vencidos: 0, com_erro: 1, mais_antiga: antes(4000), em_espera_ate: antes(-30), por_tipo: { raiz: 1 } };
    expect(situacaoGeral(s)).toEqual({ nivel: 'amarelo', motivos: ['Fila ClickUp → app: 1 com erro.'] });
  });
  it('link do ClickUp: tarefa, lista e pasta; sem id não tem link', () => {
    expect(linkClickup({ clickup_id: '86abc', clickup_tipo: 'tarefa' })).toBe('https://app.clickup.com/t/86abc');
    expect(linkClickup({ clickup_id: '901', clickup_tipo: 'lista' })).toBe('https://app.clickup.com/9013912851/v/li/901');
    expect(linkClickup({ clickup_id: '902', clickup_tipo: 'pasta' })).toBe('https://app.clickup.com/9013912851/v/f/902');
    expect(linkClickup({ clickup_id: null, clickup_tipo: null })).toBeNull();
  });
});
