// Catálogo dos manuais (#/manuais). Para acrescentar um manual: (1) o texto em src/manuais/<id>.md (Markdown simples:
// # título, ## seções, listas, **negrito**, *itálico*, tabelas com |, ![legenda](arquivo.png)); (2) as imagens em
// public/manuais/<id>/; (3) uma linha em MANUAIS abaixo. `para` diz quem vê: o consultor vê só os do consultor; as
// demais funções (GP, Admin, Líder Tech, Triagem) veem todos.
import consultor from './consultor.md?raw';
import gp from './gp.md?raw';

export type PublicoManual = 'consultor' | 'gestao';

export interface Manual {
  id: string;
  titulo: string;
  resumo: string;
  para: PublicoManual;
  texto: string;          // Markdown
}

export const MANUAIS: Manual[] = [
  { id: 'consultor', titulo: 'Manual do apontamento', para: 'consultor', texto: consultor,
    resumo: 'Para os consultores: entrar, Minha agenda, apontar as horas, pedir mais agenda, informar desvio e o fechamento.' },
  { id: 'gp', titulo: 'Manual do GP', para: 'gestao', texto: gp,
    resumo: 'Para os gerentes de projeto: avisos, pedidos de agenda, desvios, Agenda da equipe, Ociosidade, conferência e fechamento.' },
];

/** Manuais que a função vê: o consultor, só os do consultor; as demais, todos. */
export function manuaisVisiveis(perfil: string | null | undefined, lista: Manual[] = MANUAIS): Manual[] {
  return perfil === 'consultor' || !perfil ? lista.filter(m => m.para === 'consultor') : lista;
}

/** Endereço de uma imagem do manual (public/manuais/<id>/<arquivo>); URL completa fica como está. */
export const imagemManual = (id: string, src: string, base: string = import.meta.env.BASE_URL) =>
  /^(https?:|data:|\/)/.test(src) ? src : `${base}manuais/${id}/${src.replace(/^\.\//, '')}`;
