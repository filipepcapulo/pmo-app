import { describe, expect, it } from 'vitest';
import { erroPeriodo, estadoEnvio, fapDoNome, lerFaps, podeMarcar, semanaAnterior, textoConferencia, textoConferir, textoEnviar } from './aceiteOs';

describe('Aceite de OS (V13d-3)', () => {
  it('período: padrão a semana anterior (seg–dom); até hoje, 62 dias e 400 dias para trás', () => {
    expect(semanaAnterior('2026-11-11')).toEqual({ de: '2026-11-02', ate: '2026-11-08' });
    expect(semanaAnterior('2026-11-16')).toEqual({ de: '2026-11-09', ate: '2026-11-15' });
    expect(erroPeriodo('2026-11-02', '2026-11-08', '2026-11-11')).toBeNull();
    expect(erroPeriodo('2026-11-02', '2026-11-12', '2026-11-11')).toMatch(/hoje/);
    expect(erroPeriodo('2026-08-01', '2026-11-08', '2026-11-11')).toMatch(/62 dias/);
    expect(erroPeriodo('2026-11-08', '2026-11-02', '2026-11-11')).toMatch(/antes/);
  });
  it('FAP do nome do projeto (igual ao banco) e FAPs digitadas', () => {
    expect([fapDoNome('MegaTrucks 33084 - Avulso'), fapDoNome('Projeto sem FAP'), fapDoNome('FAP123456789')]).toEqual(['33084', null, null]);
    expect(fapDoNome('Guri 2026')).toBe('2026');
    expect(lerFaps('33084; 31934,33084')).toEqual(['31934', '33084']);
    expect([lerFaps(''), lerFaps('12a')]).toEqual([[], null]);
  });
  it('só marca OS de FAP PRONTA da conferência mais recente, no período e sem aceite', () => {
    const f = { situacao: 'PRONTA' as const, recente: true };
    expect(podeMarcar(f, { fora_periodo: false, envio: null })).toBe(true);
    expect(podeMarcar({ ...f, recente: false }, { fora_periodo: false, envio: null })).toBe(false);
    expect(podeMarcar({ ...f, situacao: 'BLOQUEADA' }, { fora_periodo: false, envio: null })).toBe(false);
    expect(podeMarcar(f, { fora_periodo: true, envio: null })).toBe(false);
    const gerado = { aceite_id: '5', etapa: 'email' as const, ok: false, erro: 'x', em: '', por: null };
    expect(podeMarcar(f, { fora_periodo: false, envio: gerado })).toBe(false);
    expect(podeMarcar(f, { fora_periodo: false, envio: { ...gerado, aceite_id: null, etapa: 'gerar' } })).toBe(true); // falhou ao gerar: pode tentar de novo
    expect([estadoEnvio(gerado), estadoEnvio({ ...gerado, ok: true }), estadoEnvio({ ...gerado, aceite_id: null }), estadoEnvio(null)])
      .toEqual(['email_pendente', 'enviada', 'falhou', null]);
  });
  it('textos da conferência e do envio', () => {
    expect(textoConferencia({ id: 'c', de: '2026-11-02', ate: '2026-11-08', faps: '31934,33084', criado_em: '2026-11-11T13:05:00Z', completa: true,
      executado_por: 'Filipe', conta_de: null, recente: false })).toMatch(/^Conferência de 02\/11\/2026 a 08\/11\/2026 \(FAP 31934, 33084\).*conta padrão.*mais nova/);
    expect(textoConferir({ ok: true, conferencia: 'c', resumo: { prontas: 2, bloqueadas: 1, vazias: 5, verificar: 3, completa: true } }))
      .toBe('Conferência concluída: 2 pronta(s), 1 bloqueada(s), 5 FAP(s) sem OS no período (ocultas), 3 OS para VERIFICAR. Nada foi enviado.');
    expect(textoConferir({ ok: false, codigo: 'NAO_CONFIGURADO', erro: '' })).toMatch(/Conta Sankhya/);
    expect(textoEnviar({ ok: true, enviados: 1, total: 2, situacao: [] })).toBe('Envio concluído: 1 de 2 aceite(s) de OS enviado(s).');
    expect(textoEnviar({ ok: false, codigo: 'DESLIGADO', erro: 'O envio do Aceite de OS ainda não foi liberado' })).toMatch(/não foi liberado/);
  });
});
