// Documentação técnica do projeto (V4, 0092): fica no BANCO e só sai para quem tem `doc_tecnica.ver` (Admin e quem ele
// liberar em Equipe › Acessos). Não vai no pacote da PWA de propósito: o pacote é público, e esconder no menu não
// protegeria o texto. Aqui só as chamadas e o que a tela precisa para montar os links entre os documentos.
import { rpc } from './cliente';

export interface DocTecnicoResumo { id: string; titulo: string; resumo: string; ordem: number; atualizado_em: string }
export interface DocTecnico extends Omit<DocTecnicoResumo, 'ordem'> { texto: string }

export const PERMISSAO_DOC_TECNICA = 'doc_tecnica.ver';
/** Prefixo do documento técnico na rota dos manuais: #/manuais/tec-<id>. */
export const PREFIXO_TEC = 'tec-';

export const docsTecnicos = {
  lista: (esc: string) => rpc<DocTecnicoResumo[]>('v4_docs_tecnicos', { p_escritorio: esc }),
  ler: (esc: string, id: string) => rpc<DocTecnico>('v4_doc_tecnico', { p_escritorio: esc, p_id: id }),
};

/** Id do documento a partir do parâmetro da rota ("tec-banco" → "banco"); não é documento técnico → null. */
export const idTecnico = (parametro: string | undefined) =>
  (parametro && parametro.startsWith(PREFIXO_TEC) && /^[a-z0-9-]{2,60}$/.test(parametro.slice(PREFIXO_TEC.length)) ? parametro.slice(PREFIXO_TEC.length) : null);

/** Link entre documentos ("banco.md", "./mcp.md#3-catalogo") → caminho da rota; link para fora da pasta ou da web → null. */
export function caminhoDoLink(url: string): string | null {
  const m = /^(?:\.\/)?([A-Za-z0-9-]+)\.md(?:#.*)?$/.exec(url);
  return m ? `manuais/${PREFIXO_TEC}${m[1].toLowerCase()}` : null;
}
