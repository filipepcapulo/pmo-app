// Sugestões de melhoria do app (0069): todos do escritório veem e criam; quem sugeriu edita enquanto "nova";
// sugestao.gerenciar muda o status e responde.
import { novaOperacao, rpc } from './cliente';
import type { Pessoa } from './cadastros';
import type { Anexo } from './execucao';

export type StatusSugestao = 'nova' | 'em_analise' | 'planejada' | 'concluida' | 'recusada';
export const STATUS_SUGESTAO: { valor: StatusSugestao; rotulo: string }[] = [
  { valor: 'nova', rotulo: 'Nova' }, { valor: 'em_analise', rotulo: 'Em análise' }, { valor: 'planejada', rotulo: 'Planejada' },
  { valor: 'concluida', rotulo: 'Concluída' }, { valor: 'recusada', rotulo: 'Recusada' },
];
export const rotuloStatusSugestao = (s: string) => STATUS_SUGESTAO.find(x => x.valor === s)?.rotulo ?? s;

export interface Sugestao {
  id: string; titulo: string; descricao: string | null; status: StatusSugestao; resposta: string | null;
  respondido_em: string | null; respondido_por: Pessoa | null; autor: Pessoa | null; criado_em: string; versao: number;
  minha: boolean; anexos: Anexo[];
}
/** Quem sugeriu mexe enquanto está nova; quem gerencia mexe sempre. */
export const podeEditarSugestao = (s: Pick<Sugestao, 'minha' | 'status'>, gerencia: boolean) => gerencia || (s.minha && s.status === 'nova');
/** Filtra por status ('' = todas) e por "só as minhas". */
export const filtrarSugestoes = (l: Sugestao[], status: string, minhas: boolean) =>
  l.filter(s => (!status || s.status === status) && (!minhas || s.minha));

export const sug = {
  listar: (esc: string) => rpc<{ gerencia: boolean; linhas: Sugestao[] }>('v1_sugestoes', { p_escritorio: esc }),
  salvar: (esc: string, d: Record<string, unknown>) =>
    rpc<{ ok: true; id: string; versao: number }>('v1_sugestao_salvar', { p_escritorio: esc, p_dados: d, p_id_operacao: novaOperacao() }),
};
