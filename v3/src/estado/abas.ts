// Abas por módulo aberto: cada rota aberta vira uma aba (sem repetir); fechar a ativa ativa a vizinha. O Início é o fundo:
// nunca vira aba e aparece quando nenhuma aba está ativa.
// Funções puras: o componente guarda o resultado (e o localStorage, por escritório).

export interface Aba { caminho: string; titulo: string }
export interface EstadoAbas { abas: Aba[]; ativa: string | null }

export const MAX_ABAS = 12;
export const INICIO = 'inicio';

export function abrir(e: EstadoAbas, aba: Aba): EstadoAbas {
  if (aba.caminho === INICIO) return { abas: e.abas, ativa: INICIO };
  const existe = e.abas.find(a => a.caminho === aba.caminho);
  let abas = existe ? e.abas.map(a => (a.caminho === aba.caminho ? { ...a, titulo: aba.titulo || a.titulo } : a))
                    : [...e.abas, aba];
  // passou do limite: sai a aba mais antiga que não seja a nova
  while (abas.length > MAX_ABAS) {
    const velha = abas.findIndex(x => x.caminho !== aba.caminho);
    abas = abas.filter((_, i) => i !== velha);
  }
  return { abas, ativa: aba.caminho };
}

export function fechar(e: EstadoAbas, caminho: string): EstadoAbas {
  const i = e.abas.findIndex(a => a.caminho === caminho);
  if (i < 0) return e;
  const abas = e.abas.filter(a => a.caminho !== caminho);
  if (e.ativa !== caminho) return { abas, ativa: e.ativa };
  const viz = abas[i] ?? abas[i - 1] ?? null;
  return { abas, ativa: viz ? viz.caminho : INICIO };
}

export const fecharTodas = (): EstadoAbas => ({ abas: [], ativa: INICIO });

/** Arrastar: leva a aba para antes (ou depois) da aba alvo. */
export function mover(e: EstadoAbas, caminho: string, alvo: string, depois: boolean): EstadoAbas {
  const aba = e.abas.find(a => a.caminho === caminho);
  if (!aba || caminho === alvo) return e;
  const resto = e.abas.filter(a => a.caminho !== caminho);
  const i = resto.findIndex(a => a.caminho === alvo);
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
  const aba = abas.find(a => a.caminho === ativa);
  if (cabem && aba && !visiveis.includes(aba)) visiveis[cabem - 1] = aba;
  return { visiveis, estourou: true };
}

export function renomear(e: EstadoAbas, caminho: string, titulo: string): EstadoAbas {
  if (!e.abas.some(a => a.caminho === caminho && a.titulo !== titulo)) return e;
  return { ...e, abas: e.abas.map(a => (a.caminho === caminho ? { ...a, titulo } : a)) };
}

export function lerAbasSalvas(texto: string | null): EstadoAbas {
  try {
    const v = JSON.parse(texto || '');
    if (Array.isArray(v?.abas)) {
      const abas = v.abas.filter((a: Aba) => typeof a?.caminho === 'string' && typeof a?.titulo === 'string' && a.caminho !== INICIO).slice(0, MAX_ABAS);
      return { abas, ativa: v.ativa === INICIO || abas.some((a: Aba) => a.caminho === v.ativa) ? v.ativa : abas[0]?.caminho ?? null };
    }
  } catch { /* vazio ou corrompido */ }
  return { abas: [], ativa: null };
}
