import { describe, expect, it } from 'vitest';
import { caminhoDoLink, idTecnico } from './docsTecnicos';
import { blocos, buscarNoDocumento, documento } from '../manuais/markdown';
import { MANUAIS } from '../manuais';
import { MODULOS, modulosVisiveis } from '../estado/rotas';

describe('documentação técnica (0092)', () => {
  it('rota: #/manuais/tec-<id> é documento técnico; manual comum não', () => {
    expect(idTecnico('tec-banco')).toBe('banco');
    expect(idTecnico('tec-seguranca-cofre')).toBe('seguranca-cofre');
    expect(idTecnico('consultor')).toBeNull();
    expect(idTecnico('tec-')).toBeNull();
    expect(idTecnico('tec-../x')).toBeNull();
    expect(idTecnico(undefined)).toBeNull();
  });
  it('links entre documentos abrem dentro do app; para fora da pasta ou da web, não', () => {
    expect(caminhoDoLink('banco.md')).toBe('manuais/tec-banco');
    expect(caminhoDoLink('./mcp.md#3-catalogo')).toBe('manuais/tec-mcp');
    expect(caminhoDoLink('README.md')).toBe('manuais/tec-readme');
    expect(caminhoDoLink('../v3/dados.md')).toBeNull();
    expect(caminhoDoLink('https://exemplo.com/a.md')).toBeNull();
    expect(caminhoDoLink('javascript:alert(1)')).toBeNull();
  });
  it('Markdown da documentação: bloco de código, citação e #### sem quebrar o que os manuais usam', () => {
    const b = blocos('# T\n\n> nota **forte**\n> segunda linha\n\n## 1. A\ntexto\n\n```bash\nsupabase db push\n# não é título\n| não é tabela |\n```\n\n#### Detalhe\n- item');
    expect(b.map(x => x.tipo)).toEqual(['titulo', 'citacao', 'titulo', 'paragrafo', 'codigo', 'titulo', 'lista']);
    expect(b[4]).toEqual({ tipo: 'codigo', texto: 'supabase db push\n# não é título\n| não é tabela |' });
    expect(b[1]).toMatchObject({ tipo: 'citacao', trechos: [{ t: 'texto', v: 'nota ' }, { t: 'negrito', v: 'forte' }, { t: 'texto', v: ' segunda linha' }] });
    expect(b[5]).toMatchObject({ tipo: 'titulo', nivel: 3, texto: 'Detalhe' });
    const d = documento('# T\n## 1. A\n```\nrodar.sh --migracoes\n```\n## 2. B\n> só com OK');
    expect(buscarNoDocumento(d, 'migracoes').map(a => a.secao.titulo)).toEqual(['1. A']);
    expect(buscarNoDocumento(d, 'ok').map(a => a.secao.titulo)).toEqual(['2. B']);
  });
  it('o catálogo que vai no pacote público não tem documento técnico, e a seção não é um módulo do menu', () => {
    expect(MANUAIS.some(m => m.id.startsWith('tec-'))).toBe(false);
    expect(MODULOS.some(m => m.permissao === 'doc_tecnica.ver')).toBe(false);
  });
  it('menu da 4.5.0: Ausências para todos; Rentabilidade geral só com o papel dono ou rentabilidade do cofre', () => {
    const ids = (perm: string[], fin: string[] = []) => modulosVisiveis(perm, fin).map(m => m.id);
    expect(ids([])).toContain('ausencias');
    expect(ids([])).not.toContain('rentabilidade-geral');
    expect(ids([], ['fechamento'])).not.toContain('rentabilidade-geral');
    expect(ids([], ['rentabilidade'])).toContain('rentabilidade-geral');
    expect(ids([], ['dono'])).toContain('rentabilidade-geral');
    expect(MODULOS.find(m => m.id === 'rentabilidade-geral')!.area).toBe('relatorios');
  });
});
