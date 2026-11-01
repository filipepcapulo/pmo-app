// Rotas por hash (link profundo): #/inicio, #/demandas, #/projeto/<id>. Cada rota aberta vira uma aba.

export type Area = 'geral' | 'cadastros' | 'execucao' | 'relatorios' | 'sistema';

export interface Modulo {
  id: string;
  titulo: string;
  area: Area;
  icone: string;           // nome do ícone SVG (componentes/Icone.tsx)
  etapa?: string;          // etapa do plano v3 que entrega a tela (enquanto não chega: "em construção")
  permissao?: string;      // funcionalidade exigida (app.funcionalidades); sem ela o item some do menu
}

export const AREAS: { id: Area; titulo: string }[] = [
  { id: 'geral', titulo: 'Geral' },
  { id: 'cadastros', titulo: 'Cadastros' },
  { id: 'execucao', titulo: 'Execução' },
  { id: 'relatorios', titulo: 'Relatórios' },
  { id: 'sistema', titulo: 'Sistema' },
];

export const MODULOS: Modulo[] = [
  { id: 'inicio', titulo: 'Início', area: 'geral', icone: 'casa' },
  { id: 'clientes', titulo: 'Clientes', area: 'cadastros', icone: 'predio' },
  { id: 'projetos', titulo: 'Projetos', area: 'cadastros', icone: 'pasta' },
  { id: 'modelos', titulo: 'Modelos de projeto', area: 'cadastros', icone: 'copia', permissao: 'projeto.criar' },
  { id: 'equipe', titulo: 'Equipe', area: 'cadastros', icone: 'pessoas' },
  { id: 'demandas', titulo: 'Demandas', area: 'execucao', icone: 'lista' },
  { id: 'agenda', titulo: 'Agenda da equipe', area: 'execucao', icone: 'calendario' },
  { id: 'equipe-dev', titulo: 'Equipe dev', area: 'execucao', icone: 'pessoas' },
  { id: 'chamados', titulo: 'Chamados', area: 'execucao', icone: 'chamado' },
  { id: 'consultor', titulo: 'Minha agenda', area: 'execucao', icone: 'relogio' },
  { id: 'produtividade', titulo: 'Produtividade', area: 'relatorios', icone: 'grafico', permissao: 'relatorio.produtividade' },
  { id: 'componentes', titulo: 'Componentes', area: 'sistema', icone: 'grade' },
];

export const ENTIDADES = {
  cliente: { titulo: 'Cliente', etapa: 'V5' },
  projeto: { titulo: 'Projeto', etapa: 'V7' },  // cadastro na V5; indicadores, Gantt, 5W2H e histórico na V7
  demanda: { titulo: 'Demanda', etapa: 'V6' },
  tarefa: { titulo: 'Tarefa', etapa: 'V6' },
  chamado: { titulo: 'Chamado', etapa: 'V9' },
} as const;
export type Entidade = keyof typeof ENTIDADES;

export type Rota =
  | { tipo: 'modulo'; modulo: Modulo }
  | { tipo: 'entidade'; entidade: Entidade; id: string }
  | { tipo: 'desconhecida'; caminho: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Caminho normalizado ("inicio", "projeto/<id>") a partir do hash. Hash que não é rota (#access_token=…) → null. */
export function caminhoDoHash(hash: string): string | null {
  const h = hash.replace(/^#/, '');
  if (h === '' || h === '/') return 'inicio';
  if (!h.startsWith('/')) return null;
  return h.slice(1).split('?')[0].replace(/\/+$/, '').toLowerCase() || 'inicio';
}

export function lerRota(caminho: string): Rota {
  const [a, b, ...resto] = caminho.split('/');
  if (b === undefined) {
    const m = MODULOS.find(x => x.id === a);
    if (m) return { tipo: 'modulo', modulo: m };
  } else if (resto.length === 0 && a in ENTIDADES && UUID.test(b)) {
    return { tipo: 'entidade', entidade: a as Entidade, id: b };
  }
  return { tipo: 'desconhecida', caminho };
}

export const hashDe = (caminho: string) => '#/' + caminho;
export const caminhoEntidade = (e: Entidade, id: string) => `${e}/${id}`;

/** Módulos que o usuário vê (sem permissão exigida, ou com ela liberada). */
export function modulosVisiveis(permissoes: string[]): Modulo[] {
  return MODULOS.filter(m => !m.permissao || permissoes.includes(m.permissao));
}
