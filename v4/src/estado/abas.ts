// Abas da V4: cada aba é uma "janela" com a sua própria trilha. Abrir uma tela do menu abre (ou ativa) a aba dela;
// navegar por dentro (cliente → projeto → demanda → tarefa) acontece NA MESMA aba, que guarda o caminho percorrido
// para o voltar. Só abre outra aba da mesma tela quando o usuário pede (Ctrl/⌘+clique ou "abrir em outra aba").
// O Início é o fundo: nunca vira aba e aparece quando nenhuma aba está ativa.
// Funções puras: o componente guarda o resultado (e o localStorage, por escritório).
import { lerRota, RETIRADOS } from './rotas';

export interface Passo { caminho: string; titulo: string }
export interface Aba { id: string; pilha: Passo[] }
export interface EstadoAbas { abas: Aba[]; ativa: string | null }   // ativa = id da aba, INICIO ou null (nada aberto)

export const MAX_ABAS = 12;
export const MAX_PILHA = 8;
export const INICIO = 'inicio';

export const atual = (a: Aba): Passo => a.pilha[a.pilha.length - 1];
export const caminhoDa = (a: Aba) => atual(a).caminho;
export const tituloDa = (a: Aba) => atual(a).titulo;
export const abaAtiva = (e: EstadoAbas) => e.abas.find(a => a.id === e.ativa) ?? null;
/** Caminho mostrado agora (o da aba ativa) ou o Início. */
export const caminhoAtivo = (e: EstadoAbas) => abaAtiva(e)?.pilha.at(-1)?.caminho ?? INICIO;

let seq = 0;
export const novoId = () => `a${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Tela do menu a que o caminho pertence ("chamados/kanban" → "chamados"); entidade (cliente/…) não tem. */
export function moduloDe(caminho: string): string | null {
  const r = lerRota(caminho);
  return r.tipo === 'modulo' ? r.modulo.id : null;
}
const raizDa = (a: Aba) => moduloDe(a.pilha[0].caminho);

function limitar(abas: Aba[], manter: string): Aba[] {
  let r = abas;
  while (r.length > MAX_ABAS) {
    const velha = r.findIndex(x => x.id !== manter);
    r = r.filter((_, i) => i !== velha);
  }
  return r;
}
const trocar = (e: EstadoAbas, aba: Aba): EstadoAbas => ({ abas: e.abas.map(a => (a.id === aba.id ? aba : a)), ativa: aba.id });

/** Abre uma aba nova (mesmo que a tela já esteja aberta em outra). */
export function abrirNova(e: EstadoAbas, passo: Passo, id = novoId()): EstadoAbas {
  if (passo.caminho === INICIO) return { abas: e.abas, ativa: INICIO };
  return { abas: limitar([...e.abas, { id, pilha: [passo] }], id), ativa: id };
}

/** A rota mudou (link, menu, voltar do navegador): decide em que aba ela aparece. */
export function navegar(e: EstadoAbas, passo: Passo, id = novoId()): EstadoAbas {
  const c = passo.caminho;
  if (c === INICIO) return { abas: e.abas, ativa: INICIO };
  const ativa = abaAtiva(e);
  if (ativa && caminhoDa(ativa) === c) return e;
  // voltar dentro da aba: o caminho já está na trilha dela
  if (ativa) {
    const i = ativa.pilha.findIndex(p => p.caminho === c);
    if (i >= 0) return trocar(e, { ...ativa, pilha: ativa.pilha.slice(0, i + 1) });
  }
  const mod = moduloDe(c);
  if (mod) {
    // tela do menu: a aba que já mostra esse caminho; senão a aba dessa tela (volta para a raiz pedida); senão aba nova
    const igual = e.abas.find(a => caminhoDa(a) === c);
    if (igual) return { abas: e.abas, ativa: igual.id };
    const daTela = (ativa && raizDa(ativa) === mod ? ativa : null) ?? e.abas.find(a => raizDa(a) === mod);
    if (daTela) return trocar(e, { ...daTela, pilha: [{ caminho: c, titulo: passo.titulo }] });
    return abrirNova(e, passo, id);
  }
  // item (cliente, projeto, demanda, tarefa, chamado): segue na aba em que o usuário está
  if (ativa) {
    let pilha = [...ativa.pilha, passo];
    if (pilha.length > MAX_PILHA) pilha = [pilha[0], ...pilha.slice(pilha.length - MAX_PILHA + 1)];
    return trocar(e, { ...ativa, pilha });
  }
  const igual = e.abas.find(a => caminhoDa(a) === c);
  if (igual) return { abas: e.abas, ativa: igual.id };
  return abrirNova(e, passo, id);
}

export function ativar(e: EstadoAbas, id: string): EstadoAbas {
  return e.abas.some(a => a.id === id) ? { abas: e.abas, ativa: id } : e;
}

export function fechar(e: EstadoAbas, id: string): EstadoAbas {
  const i = e.abas.findIndex(a => a.id === id);
  if (i < 0) return e;
  const abas = e.abas.filter(a => a.id !== id);
  if (e.ativa !== id) return { abas, ativa: e.ativa };
  const viz = abas[i] ?? abas[i - 1] ?? null;
  return { abas, ativa: viz ? viz.id : INICIO };
}

export const fecharTodas = (): EstadoAbas => ({ abas: [], ativa: INICIO });

/** Arrastar: leva a aba para antes (ou depois) da aba alvo. */
export function mover(e: EstadoAbas, id: string, alvo: string, depois: boolean): EstadoAbas {
  const aba = e.abas.find(a => a.id === id);
  if (!aba || id === alvo) return e;
  const resto = e.abas.filter(a => a.id !== id);
  const i = resto.findIndex(a => a.id === alvo);
  if (i < 0) return e;
  return { ...e, abas: [...resto.slice(0, i + (depois ? 1 : 0)), aba, ...resto.slice(i + (depois ? 1 : 0))] };
}

/** Quantas abas de largura padrão cabem na faixa e quais ficam à vista; a ativa nunca fica escondida. Sem espaço nem para uma
 *  aba legível (celular), fica só a seta. */
export function abasVisiveis(abas: Aba[], ativa: string | null, larguraFaixa: number, larguraAba: number, larguraSeta: number) {
  if (abas.length * larguraAba <= larguraFaixa) return { visiveis: abas, estourou: false };
  const espaco = larguraFaixa - larguraSeta;
  const cabem = espaco < larguraAba * .7 ? 0 : Math.max(1, Math.floor(espaco / larguraAba));
  const visiveis = abas.slice(0, cabem);
  const aba = abas.find(a => a.id === ativa);
  if (cabem && aba && !visiveis.includes(aba)) visiveis[cabem - 1] = aba;
  return { visiveis, estourou: true };
}

/** Título de um passo da trilha (a ficha carregou e sabe o nome). */
export function renomear(e: EstadoAbas, id: string, caminho: string, titulo: string): EstadoAbas {
  if (!e.abas.some(a => a.id === id && a.pilha.some(p => p.caminho === caminho && p.titulo !== titulo))) return e;
  return { ...e, abas: e.abas.map(a => (a.id === id ? { ...a, pilha: a.pilha.map(p => (p.caminho === caminho ? { ...p, titulo } : p)) } : a)) };
}

const passoValido = (p: Passo) => typeof p?.caminho === 'string' && typeof p?.titulo === 'string' && p.caminho !== INICIO && !(p.caminho in RETIRADOS);

export function lerAbasSalvas(texto: string | null): EstadoAbas {
  try {
    const v = JSON.parse(texto || '');
    if (Array.isArray(v?.abas)) {
      const abas: Aba[] = v.abas
        .filter((a: Aba) => typeof a?.id === 'string' && Array.isArray(a?.pilha) && a.pilha.length > 0 && a.pilha.every(passoValido))
        .map((a: Aba) => ({ id: a.id, pilha: a.pilha.slice(0, MAX_PILHA).map(p => ({ caminho: p.caminho, titulo: p.titulo })) }))
        .slice(0, MAX_ABAS);
      return { abas, ativa: v.ativa === INICIO || abas.some(a => a.id === v.ativa) ? v.ativa : abas[0]?.id ?? null };
    }
  } catch { /* vazio ou corrompido */ }
  return { abas: [], ativa: null };
}
