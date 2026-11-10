// Rotas por hash (link profundo): #/inicio, #/demandas, #/projeto/<id>. Cada rota aberta vira uma aba.

export type Area = 'geral' | 'cadastros' | 'execucao' | 'relatorios' | 'sistema';

export interface Modulo {
  id: string;
  titulo: string;
  area: Area;
  icone: string;           // nome do ícone SVG (componentes/Icone.tsx)
  etapa?: string;          // etapa do plano v3 que entrega a tela (enquanto não chega: "em construção")
  permissao?: string;      // funcionalidade exigida (app.funcionalidades); sem ela o item some do menu
  parametro?: boolean;     // aceita um item no caminho (#/manuais/<id>): cada um abre a própria aba
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
  { id: 'manuais', titulo: 'Manuais', area: 'geral', icone: 'livro', parametro: true },
  // V11d-3: avisos push no aparelho (Ociosidade, Reembolso KM); link dos avisos de teste (./#/notificacoes)
  { id: 'notificacoes', titulo: 'Notificações', area: 'geral', icone: 'sino' },
  { id: 'clientes', titulo: 'Clientes', area: 'cadastros', icone: 'predio' },
  { id: 'projetos', titulo: 'Projetos', area: 'cadastros', icone: 'pasta' },
  { id: 'modelos', titulo: 'Modelos de projeto', area: 'cadastros', icone: 'copia', permissao: 'projeto.criar' },
  { id: 'equipe', titulo: 'Equipe', area: 'cadastros', icone: 'pessoas' },
  // V13a-3: POs e áreas da Sankhya (módulo 14 da Central); todos veem, organograma.editar edita
  { id: 'organograma', titulo: 'Organograma Sankhya', area: 'cadastros', icone: 'organograma' },
  { id: 'demandas', titulo: 'Demandas', area: 'execucao', icone: 'lista' },
  { id: 'agenda', titulo: 'Agenda da equipe', area: 'execucao', icone: 'calendario' },
  { id: 'chamados', titulo: 'Chamados', area: 'execucao', icone: 'chamado' },
  { id: 'consultor', titulo: 'Minha agenda', area: 'execucao', icone: 'relogio' },
  { id: 'desvios', titulo: 'Desvios de agenda', area: 'execucao', icone: 'seta', permissao: 'desvio.aprovar' },
  { id: 'envio-agendas', titulo: 'Envio de agendas', area: 'execucao', icone: 'calendario', permissao: 'agenda.enviar' },
  { id: 'ociosidade', titulo: 'Ociosidade', area: 'execucao', icone: 'pessoas', permissao: 'ociosidade.ver' },
  { id: 'ferias', titulo: 'Controle de Férias', area: 'execucao', icone: 'calendario', permissao: 'ferias.ver' },
  // V11d-1: módulo pessoal (só o Admin por padrão); #/reembolso/relatorio abre direto na aba (link do aviso do dia 1º)
  { id: 'reembolso', titulo: 'Reembolso KM', area: 'execucao', icone: 'carro', permissao: 'reembolso.usar', parametro: true },
  { id: 'portfolio', titulo: 'Portfólio', area: 'relatorios', icone: 'grade', permissao: 'portfolio.ver' },
  // todos entram; sem produtividade.ver_todos o banco devolve só o próprio (0045)
  { id: 'produtividade', titulo: 'Produtividade', area: 'relatorios', icone: 'grafico' },
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
  | { tipo: 'modulo'; modulo: Modulo; parametro?: string }
  | { tipo: 'entidade'; entidade: Entidade; id: string }
  | { tipo: 'desconhecida'; caminho: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Telas que saíram: o link antigo cai na que ficou no lugar (Equipe dev → Agenda da equipe, 3.13.0). */
export const RETIRADOS: Record<string, string> = { 'equipe-dev': 'agenda' };

/** Caminho normalizado ("inicio", "projeto/<id>") a partir do hash. Hash que não é rota (#access_token=…) → null. */
export function caminhoDoHash(hash: string): string | null {
  const h = hash.replace(/^#/, '');
  if (h === '' || h === '/') return 'inicio';
  if (!h.startsWith('/')) return null;
  const c = h.slice(1).split('?')[0].replace(/\/+$/, '').toLowerCase() || 'inicio';
  return RETIRADOS[c] ?? c;
}

export function lerRota(caminho: string): Rota {
  const [a, b, ...resto] = caminho.split('/');
  if (b === undefined) {
    const m = MODULOS.find(x => x.id === a);
    if (m) return { tipo: 'modulo', modulo: m };
  } else if (resto.length === 0 && b && MODULOS.some(x => x.id === a && x.parametro)) {
    return { tipo: 'modulo', modulo: MODULOS.find(x => x.id === a)!, parametro: b };
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
