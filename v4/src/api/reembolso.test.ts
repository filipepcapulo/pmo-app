import { describe, expect, it } from 'vitest';
import { brl, erroSync, fmtKm, fmtNum, limitesMes, nomeMes, periodo, presetPadrao, relatorioHtml, rotuloDia, semKm, somarMes, textoSync, type Relatorio } from './reembolso';

describe('Reembolso KM: formatação (igual ao 2.x e ao PDF do servidor)', () => {
  it('números, km e reais', () => {
    expect(fmtNum(1234)).toBe('1.234');
    expect(fmtNum(42.5)).toBe('42,5');
    expect(fmtKm(30)).toBe('30 km');
    expect(brl(1234.5)).toBe('R$ 1.234,50');
    expect(brl(0)).toBe('R$ 0,00');
  });
  it('dia com nome (hoje/ontem/amanhã) e mês por extenso', () => {
    expect(rotuloDia('2026-10-23', '2026-10-23')).toBe('Hoje, 23/10');
    expect(rotuloDia('2026-10-22', '2026-10-23')).toBe('Ontem, 22/10');
    expect(rotuloDia('2026-10-19', '2026-10-23')).toBe('Segunda, 19/10');
    expect(nomeMes('2026-03')).toBe('março 2026');
  });
  it('sincronização: texto e erro só quando mais novo que a última sync', () => {
    expect(textoSync('')).toBe('Agenda ainda não sincronizada');
    expect(textoSync('2026-10-23 16:00:05')).toBe('Agenda sincronizada em 23/10 às 16:00');
    expect(erroSync('2026-10-23 16:10:00 Agenda fora do ar', '2026-10-23 16:00:00')).toBe('Agenda fora do ar');
    expect(erroSync('2026-10-23 15:00:00 velho', '2026-10-23 16:00:00')).toBe('');
  });
});

describe('Reembolso KM: períodos', () => {
  it('mês: limites, virada de ano e atalhos', () => {
    expect(limitesMes('2026-02')).toEqual({ de: '2026-02-01', ate: '2026-02-28' });
    expect(somarMes('2026-01', -1)).toBe('2025-12');
    expect(somarMes('2026-12', 1)).toBe('2027-01');
    expect(periodo('ant', '2026-01-05')).toEqual({ de: '2025-12-01', ate: '2025-12-31' });
    expect(periodo('atu', '2026-11-06')).toEqual({ de: '2026-11-01', ate: '2026-11-30' });
    expect(presetPadrao('2026-11-06')).toBe('ant');
    expect(presetPadrao('2026-11-20')).toBe('atu');
  });
  it('clientes ativos sem KM', () => {
    expect(semKm([{ id: 'a', nome: 'A', unidade: '', km: 0, palavras: '', ativo: true, obs: '' },
      { id: 'b', nome: 'B', unidade: '', km: 0, palavras: '', ativo: false, obs: '' },
      { id: 'c', nome: 'C', unidade: '', km: 10, palavras: '', ativo: true, obs: '' }])).toBe(1);
  });
});

describe('Reembolso KM: PDF (mesmo layout do servidor)', () => {
  const base: Relatorio = {
    ok: true, de: '2026-10-01', ate: '2026-10-31', valorKm: 1.1, totalKm: 270, totalValor: 297, pendentes: 0, historico: [],
    itens: [
      { chave: 'e6', data: '2026-10-02', inicio: '10:00', fim: '11:00', titulo: 'Soldamaq - <Treino>', descricao: '', local: '', clienteId: 'C1', cliente: 'Soldamaq',
        unidade: '', kmCliente: 30, status: 'PRESENCIAL', km: 30, kmManual: null, valor: 33, obs: 'Ignorado automaticamente', origem: 'AGENDA', removido: false, meet: '' },
      { chave: 'e2', data: '2026-10-24', inicio: '', fim: '', titulo: 'Germipasto', descricao: '', local: '', clienteId: 'C2', cliente: 'Germipasto',
        unidade: 'Dourados', kmCliente: 240, status: 'PRESENCIAL', km: 240, kmManual: null, valor: 264, obs: 'Ida pelo anel', origem: 'MANUAL', removido: false, meet: '' },
    ],
    porCliente: [{ cliente: 'Germipasto - Dourados', visitas: 1, km: 240, valor: 264 }, { cliente: 'Soldamaq', visitas: 1, km: 30, valor: 33 }],
    config: { nome: 'Filipe Capulo', cargo: 'PMO', empresa: 'Sankhya' },
  };
  it('cabeçalho, totais, linhas escapadas, obs automática fora e resumo por cliente', () => {
    const h = relatorioHtml(base, 'filipe.capulo@sankhya.com.br', '06/11/2026 10:00');
    expect(h).toContain('Período: <b>01/10/2026 a 31/10/2026</b>');
    expect(h).toContain('Filipe Capulo — PMO');
    expect(h).toContain('R$ 297,00');
    expect(h).toContain('270 km');
    expect(h).toContain('Soldamaq - &lt;Treino&gt;');
    expect(h).not.toContain('Ignorado automaticamente');
    expect(h).toContain('Ida pelo anel');
    expect(h).toContain('Resumo por cliente');
    expect(h).toContain('<title>Reembolso KM - Filipe Capulo - 01/10/2026 a 31/10/2026</title>');
  });
  it('sem valor por KM: sem coluna Valor; sem visitas: aviso', () => {
    const h = relatorioHtml({ ...base, valorKm: 0, itens: [], porCliente: [], totalKm: 0, totalValor: 0 }, 'x@y', '06/11/2026');
    expect(h).not.toContain('VALOR A REEMBOLSAR');
    expect(h).toContain('Nenhuma visita presencial no período.');
    expect(h).not.toContain('Resumo por cliente');
  });
});
