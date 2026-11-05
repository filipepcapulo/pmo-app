import { describe, expect, it } from 'vitest';
import { imagemManual, MANUAIS, manuaisVisiveis, type Manual } from './index';
import { blocos, buscarNoDocumento, documento, trechos } from './markdown';

describe('manuais: catálogo', () => {
  it('consultor vê só o manual do consultor; GP, Admin e as demais funções veem todos', () => {
    expect(manuaisVisiveis('consultor').map(m => m.id)).toEqual(['consultor']);
    for (const p of ['gp', 'admin', 'lider_tech', 'triagem']) expect(manuaisVisiveis(p).map(m => m.id)).toEqual(['consultor', 'gp']);
    expect(manuaisVisiveis(null).map(m => m.id)).toEqual(['consultor']);
  });
  it('manual novo entra só com uma linha no catálogo (e respeita o público)', () => {
    const novo: Manual = { id: 'triagem', titulo: 'Manual da triagem', resumo: '', para: 'gestao', texto: '# T\n## 1. A\ntexto' };
    expect(manuaisVisiveis('gp', [...MANUAIS, novo]).map(m => m.id)).toContain('triagem');
    expect(manuaisVisiveis('consultor', [...MANUAIS, novo]).map(m => m.id)).not.toContain('triagem');
  });
  it('ids únicos e todo manual com título e 9 seções', () => {
    expect(new Set(MANUAIS.map(m => m.id)).size).toBe(MANUAIS.length);
    for (const m of MANUAIS) {
      const d = documento(m.texto);
      expect(d.titulo).toBeTruthy();
      expect(d.secoes.length).toBe(9);
    }
  });
  it('imagem: relativa vai para public/manuais/<id>/; URL completa fica', () => {
    expect(imagemManual('gp', 'g01-avisos.png', '/pmo-app/v3/')).toBe('/pmo-app/v3/manuais/gp/g01-avisos.png');
    expect(imagemManual('gp', 'https://x/y.png', '/b/')).toBe('https://x/y.png');
  });
  it('as imagens citadas nos manuais existem em public/manuais', () => {
    const existentes = Object.keys(import.meta.glob('/public/manuais/**/*.png'));
    for (const m of MANUAIS) for (const b of blocos(m.texto)) {
      if (b.tipo === 'imagem') expect(existentes, `${m.id}/${b.src}`).toContain(`/public/manuais/${m.id}/${b.src}`);
    }
  });
});

describe('manuais: markdown', () => {
  it('negrito, itálico, código e link', () => {
    expect(trechos('a **b** *c* `d` [e](http://f)')).toEqual([
      { t: 'texto', v: 'a ' }, { t: 'negrito', v: 'b' }, { t: 'texto', v: ' ' }, { t: 'italico', v: 'c' }, { t: 'texto', v: ' ' },
      { t: 'codigo', v: 'd' }, { t: 'texto', v: ' ' }, { t: 'link', v: 'e', url: 'http://f' }]);
  });
  it('títulos, listas, tabela, imagem e parágrafo em itálico (não vira lista)', () => {
    const b = blocos('# T\n\n*nota*\n\n- um\n- dois\n\n1. a\n2. b\n\n| X | Y |\n| --- | --- |\n| 1 | **2** |\n\n![Leg](f.png)\n\nfim\ncontinua');
    expect(b.map(x => x.tipo)).toEqual(['titulo', 'paragrafo', 'lista', 'lista', 'tabela', 'imagem', 'paragrafo']);
    expect(b[1]).toMatchObject({ trechos: [{ t: 'italico', v: 'nota' }] });
    expect(b[2]).toMatchObject({ numerada: false, itens: [[{ v: 'um' }], [{ v: 'dois' }]] });
    expect(b[3]).toMatchObject({ numerada: true });
    expect(b[4]).toMatchObject({ cabecalho: [[{ v: 'X' }], [{ v: 'Y' }]], linhas: [[[{ v: '1' }], [{ t: 'negrito', v: '2' }]]] });
    expect(b[5]).toEqual({ tipo: 'imagem', src: 'f.png', legenda: 'Leg' });
    expect(b[6]).toMatchObject({ trechos: [{ v: 'fim continua' }] });
  });
  it('seções com âncora sem acento (índice) e repetidas ganham sufixo', () => {
    const d = documento('# Manual\nabertura\n## 1. Conferência do mês\nx\n## 1. Conferência do mês\ny');
    expect(d.titulo).toBe('Manual');
    expect(d.abertura).toHaveLength(1);
    expect(d.secoes.map(s => s.id)).toEqual(['1-conferencia-do-mes', '1-conferencia-do-mes-2']);
  });
  it('busca sem acento, todas as palavras, com trecho', () => {
    const d = documento(MANUAIS.find(m => m.id === 'gp')!.texto);
    const r = buscarNoDocumento(d, 'conferencia fechamento');
    expect(r.map(a => a.secao.titulo)).toContain('8. Fechamento do mês');
    expect(r.every(a => a.trecho.length > 0)).toBe(true);
    expect(buscarNoDocumento(d, 'palavraquenaoexiste')).toEqual([]);
    expect(buscarNoDocumento(d, '   ')).toEqual([]);
  });
});
