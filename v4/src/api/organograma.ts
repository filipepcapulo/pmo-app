// Organograma Sankhya (V13a-3, módulo 14 da Central BP-MS): grupos (ex.: "PO de Produtos") → áreas com pessoas,
// demandas resumidas e observação. Leitura para todos; gravação com organograma.editar (0056), sempre o organograma
// inteiro, com confirmação e a `base` lida (outra pessoa gravou antes = recusa).
import { novaOperacao, rpc } from './cliente';

export interface AreaOrg { id?: string; area: string; pessoas: string[]; demandas: string[]; obs: string }
export interface GrupoOrg { id?: string; nome: string; itens: AreaOrg[] }
export interface Organograma {
  grupos: GrupoOrg[]; base: string; podeEditar: boolean; atualizadoEm: string | null; atualizadoPor: string | null;
}

export const LIMITES = { grupos: 50, areas: 200, pessoas: 20, demandas: 60, texto: 120 };

export const apiOrganograma = {
  ler: (esc: string) => rpc<Organograma>('v1_organograma', { p_escritorio: esc }),
  salvar: (esc: string, grupos: GrupoOrg[], base: string) =>
    rpc<{ ok: true; grupos: number; areas: number; base: string }>('v1_organograma_salvar',
      { p_escritorio: esc, p_dados: { grupos, base, confirmar: true }, p_id_operacao: novaOperacao() }),
};

/** Sem acento e em minúsculas (busca). */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** "Fulano ou Beltrano" → principal "Fulano", alternativas ["Beltrano"] (RF-02). */
export function separarPessoa(p: string): { principal: string; alternativas: string[] } {
  const partes = p.split(/\s+ou\s+/i).map(x => x.trim()).filter(Boolean);
  return { principal: partes[0] ?? p.trim(), alternativas: partes.slice(1) };
}

/** Iniciais do nome (primeira e última palavra). */
export function iniciais(nome: string): string {
  const ps = nome.trim().split(/\s+/).filter(w => /^[\p{L}\d]/u.test(w));
  if (!ps.length) return '?';
  const a = ps[0][0], b = ps.length > 1 ? ps[ps.length - 1][0] : '';
  return (a + b).toUpperCase();
}

/** Texto separado por ";" → lista sem vazios e sem repetidos (sem diferenciar maiúsculas). */
export function lista(texto: string): string[] {
  const vistos = new Set<string>(), r: string[] = [];
  for (const x of texto.split(';').map(s => s.trim()).filter(Boolean)) {
    const k = x.toLowerCase();
    if (!vistos.has(k)) { vistos.add(k); r.push(x); }
  }
  return r;
}

export interface ResultadoBusca {
  grupos: (Omit<GrupoOrg, 'itens'> & { itens: (AreaOrg & { demandasAchadas: string[] })[] })[];
  total: number;
}

/** Busca por pessoa, área, grupo, observação ou demanda (RF-03): grupo encontrado mostra todas as áreas; senão só as
 *  áreas que batem. As demandas que batem voltam em `demandasAchadas` para ficar em destaque. */
export function buscar(grupos: GrupoOrg[], texto: string): ResultadoBusca {
  const q = normalizar(texto);
  const tem = (s: string) => normalizar(s).includes(q);
  const r: ResultadoBusca['grupos'] = [];
  for (const g of grupos) {
    const doGrupo = q === '' || tem(g.nome);
    const itens = g.itens
      .map(a => ({ ...a, demandasAchadas: q ? a.demandas.filter(tem) : [] }))
      .filter(a => doGrupo || tem(a.area) || tem(a.obs) || a.pessoas.some(tem) || a.demandasAchadas.length > 0);
    if (doGrupo || itens.length > 0) r.push({ ...g, itens });
  }
  return { grupos: r, total: r.reduce((s, g) => s + g.itens.length, 0) };
}

/** Problemas do rascunho antes de gravar (o banco confere de novo). Vazio = pode gravar. */
export function validar(grupos: GrupoOrg[]): string[] {
  const e: string[] = [], nomes = new Set<string>(), L = LIMITES;
  if (grupos.length > L.grupos) e.push(`Até ${L.grupos} grupos.`);
  grupos.forEach((g, i) => {
    const nome = g.nome.trim();
    if (!nome) e.push(`Informe o nome do grupo ${i + 1}.`);
    else if (nomes.has(nome.toLowerCase())) e.push(`Grupo "${nome}" repetido.`);
    nomes.add(nome.toLowerCase());
    if (nome.length > L.texto) e.push(`Nome do grupo "${nome.slice(0, 20)}…" com até ${L.texto} letras.`);
    if (g.itens.length > L.areas) e.push(`Até ${L.areas} áreas por grupo ("${nome}").`);
    g.itens.forEach((a, j) => {
      const rot = a.area.trim() || `área ${j + 1}`;
      if (!a.area.trim()) e.push(`Informe o nome da área ${j + 1} do grupo "${nome}".`);
      if (a.pessoas.length > L.pessoas) e.push(`"${rot}": até ${L.pessoas} pessoas.`);
      if (a.demandas.length > L.demandas) e.push(`"${rot}": até ${L.demandas} demandas.`);
      if ([a.area, a.obs, ...a.pessoas, ...a.demandas].some(t => t.trim().length > L.texto)) e.push(`"${rot}": cada texto com até ${L.texto} letras.`);
    });
  });
  return e;
}

/** JSON da Central (dados/organograma.json: {grupos:[{nome, itens:[{area, pessoas[], demandas[], obs}]}]}, aceita
 *  também {organograma:{grupos}}) → grupos novos (sem id). Formato estranho = erro com mensagem. */
export function importarCentral(texto: string): GrupoOrg[] {
  let j: unknown;
  try { j = JSON.parse(texto); } catch { throw new Error('Arquivo não é um JSON válido.'); }
  const raiz = (j as { organograma?: unknown })?.organograma ?? j;
  const gs = (raiz as { grupos?: unknown })?.grupos;
  if (!Array.isArray(gs)) throw new Error('JSON sem a lista "grupos" (formato do organograma da Central).');
  const textos = (v: unknown) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(';') : [])
    .map(x => String(x ?? '').trim()).filter(Boolean);
  return gs.map((g: { nome?: unknown; itens?: unknown }) => ({
    nome: String(g?.nome ?? '').trim(),
    itens: (Array.isArray(g?.itens) ? g.itens : []).map((a: Record<string, unknown>) => ({
      area: String(a?.area ?? '').trim(),
      pessoas: lista(textos(a?.pessoas).join(';')),
      demandas: lista(textos(a?.demandas).join(';')),
      obs: String(a?.obs ?? '').trim(),
    })),
  }));
}
