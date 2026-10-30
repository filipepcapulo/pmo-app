// Abas por módulo aberto: cada rota aberta vira uma aba (sem repetir); fechar a ativa ativa a vizinha.
// Funções puras: o componente guarda o resultado (e o localStorage, por escritório).

export interface Aba { caminho: string; titulo: string }
export interface EstadoAbas { abas: Aba[]; ativa: string | null }

export const MAX_ABAS = 12;

export function abrir(e: EstadoAbas, aba: Aba): EstadoAbas {
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
  return { abas, ativa: viz ? viz.caminho : null };
}

export function renomear(e: EstadoAbas, caminho: string, titulo: string): EstadoAbas {
  if (!e.abas.some(a => a.caminho === caminho && a.titulo !== titulo)) return e;
  return { ...e, abas: e.abas.map(a => (a.caminho === caminho ? { ...a, titulo } : a)) };
}

export function lerAbasSalvas(texto: string | null): EstadoAbas {
  try {
    const v = JSON.parse(texto || '');
    if (Array.isArray(v?.abas)) {
      const abas = v.abas.filter((a: Aba) => typeof a?.caminho === 'string' && typeof a?.titulo === 'string').slice(0, MAX_ABAS);
      return { abas, ativa: abas.some((a: Aba) => a.caminho === v.ativa) ? v.ativa : abas[0]?.caminho ?? null };
    }
  } catch { /* vazio ou corrompido */ }
  return { abas: [], ativa: null };
}
