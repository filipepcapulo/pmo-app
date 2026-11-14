import { describe, expect, it } from 'vitest';
import { imagemManual, MANUAIS, manuaisVisiveis, type Manual } from './index';
import { blocos, buscarNoDocumento, documento, normalizar, trechos } from './markdown';
import { MODULOS } from '../estado/rotas';

describe('manuais: catálogo', () => {
  const funcao = (l: Manual[]) => l.filter(m => m.para !== 'modulo').map(m => m.id);
  const ids = (perfil: string | null, permissoes: string[] = [], fin: string[] = []) =>
    manuaisVisiveis(perfil, MANUAIS, { permissoes, fin }).map(m => m.id);

  it('da função: consultor vê só o do consultor; GP, Admin e as demais funções veem os dois', () => {
    expect(funcao(manuaisVisiveis('consultor'))).toEqual(['consultor']);
    for (const p of ['gp', 'admin', 'lider_tech', 'triagem']) expect(funcao(manuaisVisiveis(p))).toEqual(['consultor', 'gp']);
    expect(manuaisVisiveis(null).map(m => m.id)).toEqual(['consultor']);
  });
  it('manual novo entra só com uma linha no catálogo (e respeita o público)', () => {
    const novo: Manual = { id: 'triagem', titulo: 'Manual da triagem', resumo: '', para: 'gestao', texto: '# T\n## 1. A\ntexto' };
    expect(manuaisVisiveis('gp', [...MANUAIS, novo]).map(m => m.id)).toContain('triagem');
    expect(manuaisVisiveis('consultor', [...MANUAIS, novo]).map(m => m.id)).not.toContain('triagem');
  });
  it('por módulo: o manual aparece só para quem enxerga o módulo no menu (permissão)', () => {
    const semNada = ids('consultor');
    // módulos sem permissão exigida: todos veem
    for (const id of ['primeiros-passos', 'sugestoes', 'clientes', 'projetos', 'equipe', 'demandas', 'agenda', 'chamados', 'produtividade']) expect(semNada, id).toContain(id);
    // módulos com permissão: só com ela
    const porPermissao: Record<string, string> = {
      'envio-agendas': 'agenda.enviar', 'aceite-os': 'aceite_os.gerenciar', ferias: 'ferias.ver', reembolso: 'reembolso.usar',
      portfolio: 'portfolio.ver', 'sync-experience': 'sync_experience.gerenciar', 'sync-clickup': 'sync_clickup.ver', mcp: 'mcp.usar',
    };
    for (const [id, perm] of Object.entries(porPermissao)) {
      expect(semNada, id).not.toContain(id);
      expect(ids('admin'), id).not.toContain(id);          // a função sozinha não libera: vale a permissão
      expect(ids('consultor', [perm]), id).toContain(id);
    }
  });
  it('cofre financeiro: manuais só para os autorizados e, quando o módulo pede, para o papel certo', () => {
    const cofre = ['financeiro', 'fechamento', 'rentabilidade'];
    for (const id of cofre) expect(ids('admin', ['mcp.usar']), id).not.toContain(id);   // Admin não herda o cofre
    expect(ids('gp', [], ['rentabilidade'])).toEqual(expect.arrayContaining(['financeiro', 'rentabilidade']));
    expect(ids('gp', [], ['rentabilidade'])).not.toContain('fechamento');
    expect(ids('gp', [], ['fechamento'])).toEqual(expect.arrayContaining(['financeiro', 'fechamento']));
    expect(ids('gp', [], ['fechamento'])).not.toContain('rentabilidade');
    expect(ids('admin', [], ['dono'])).toEqual(expect.arrayContaining(cofre));
  });
  it('todo módulo do menu tem manual, e todo módulo citado existe no menu', () => {
    const menu = MODULOS.map(m => m.id);
    const cobertos = new Set(MANUAIS.flatMap(m => m.modulos ?? []));
    for (const id of cobertos) expect(menu, id).toContain(id);
    // Componentes é a vitrine de componentes para quem desenvolve: não tem manual
    expect(menu.filter(id => !cobertos.has(id))).toEqual(['componentes']);
    for (const m of MANUAIS.filter(x => x.para === 'modulo')) expect((m.modulos?.length ?? 0) + (m.papeisCofre?.length ?? 0), m.id).toBeGreaterThan(0);
  });
  it('ids únicos; todo manual com título, resumo e seções numeradas em ordem; só o Markdown que a tela entende', () => {
    expect(new Set(MANUAIS.map(m => m.id)).size).toBe(MANUAIS.length);
    for (const m of MANUAIS) {
      const d = documento(m.texto);
      expect(d.titulo, m.id).toBeTruthy();
      expect(m.resumo, m.id).toBeTruthy();
      expect(d.secoes.length, m.id).toBeGreaterThanOrEqual(3);
      d.secoes.forEach((s, i) => expect(s.titulo, m.id).toMatch(new RegExp(`^${i + 1}\\. `)));
      expect(m.texto, m.id).not.toMatch(/^```|^>|^[ \t]+[-*] |<\/?(div|span|br|p|b|i|u|a|img|table|details|summary)\b/m);   // sem bloco de código, citação, lista aninhada ou HTML
    }
    for (const id of ['consultor', 'gp']) expect(documento(MANUAIS.find(m => m.id === id)!.texto).secoes.length).toBe(9);
  });
  it('sigilo: nenhum manual traz token, chave ou endereço do projeto', () => {
    for (const m of MANUAIS) {
      expect(m.texto, m.id).not.toMatch(/pmo_mcp_[A-Za-z0-9]{8,}|eyJ[A-Za-z0-9_-]{20,}|sb_(publishable|secret)_|[a-z]{20}\.supabase\.co/);
    }
  });
  it('manual do MCP: token, ligação, alcance, dois passos, limite e revogação', () => {
    const t = normalizar(MANUAIS.find(m => m.id === 'mcp')!.texto);
    for (const p of ['token', 'claude', 'functions/v1/mcp', 'previa', 'confirm', 'revog', 'financeiro', 'por minuto']) expect(t, p).toContain(p);
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
