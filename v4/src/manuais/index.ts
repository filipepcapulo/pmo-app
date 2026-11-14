// Catálogo dos manuais (#/manuais). Para acrescentar um manual: (1) o texto em src/manuais/<id>.md (Markdown simples:
// # título, ## seções, listas, **negrito**, *itálico*, tabelas com |, ![legenda](arquivo.png)); (2) as imagens em
// public/manuais/<id>/; (3) uma linha em MANUAIS abaixo. `para` diz quem vê:
//   'consultor' = todos; 'gestao' = todas as funções menos o consultor (GP, Admin, Líder Tech, Triagem);
//   'modulo'    = quem enxerga no menu pelo menos um dos `modulos` (mesma regra de estado/rotas.ts: permissão e cofre)
//                 e, se houver `papeisCofre`, tem um desses papéis no cofre financeiro.
// `modulos` também diz quais itens do menu o manual cobre: todo módulo do menu precisa de um manual (manuais.test.ts).
import { modulosVisiveis } from '../estado/rotas';
import consultor from './consultor.md?raw';
import gp from './gp.md?raw';
import primeirosPassos from './primeiros-passos.md?raw';
import sugestoes from './sugestoes.md?raw';
import clientes from './clientes.md?raw';
import projetos from './projetos.md?raw';
import equipe from './equipe.md?raw';
import demandas from './demandas.md?raw';
import agenda from './agenda.md?raw';
import chamados from './chamados.md?raw';
import envioAgendas from './envio-agendas.md?raw';
import aceiteOs from './aceite-os.md?raw';
import ferias from './ferias.md?raw';
import reembolso from './reembolso.md?raw';
import portfolio from './portfolio.md?raw';
import produtividade from './produtividade.md?raw';
import financeiro from './financeiro.md?raw';
import fechamento from './fechamento.md?raw';
import rentabilidade from './rentabilidade.md?raw';
import syncExperience from './sync-experience.md?raw';
import syncClickup from './sync-clickup.md?raw';
import mcp from './mcp.md?raw';
import etapas from './etapas.md?raw';

export type PublicoManual = 'consultor' | 'gestao' | 'modulo';

export interface Manual {
  id: string;
  titulo: string;
  resumo: string;
  para: PublicoManual;
  texto: string;          // Markdown
  modulos?: string[];     // ids de MODULOS (estado/rotas.ts) que o manual cobre
  papeisCofre?: string[]; // só para quem tem um destes papéis no cofre financeiro (ex.: a aba Rentabilidade)
}

/** O que a sessão sabe de quem está usando (eu.permissoes e eu.fin). */
export interface AcessoManual { permissoes?: string[]; fin?: string[] }

export const MANUAIS: Manual[] = [
  { id: 'consultor', titulo: 'Manual do apontamento', para: 'consultor', texto: consultor, modulos: ['consultor'],
    resumo: 'Para os consultores: entrar, Minha agenda, apontar as horas, pedir mais agenda, informar desvio e o fechamento.' },
  { id: 'gp', titulo: 'Manual do GP', para: 'gestao', texto: gp,
    resumo: 'Para os gerentes de projeto: avisos, pedidos de agenda, desvios, Agenda da equipe, Ociosidade, conferência e fechamento.' },
  { id: 'primeiros-passos', titulo: 'Primeiros passos', para: 'modulo', texto: primeirosPassos, modulos: ['inicio', 'manuais', 'notificacoes'],
    resumo: 'Entrar, o menu, as abas, os favoritos, o sino, as notificações no aparelho e os manuais.' },
  { id: 'sugestoes', titulo: 'Sugestões de melhoria', para: 'modulo', texto: sugestoes, modulos: ['sugestoes'],
    resumo: 'Sugerir uma melhoria no app, acompanhar a resposta e, para quem gerencia, responder.' },
  { id: 'clientes', titulo: 'Clientes', para: 'modulo', texto: clientes, modulos: ['clientes'],
    resumo: 'A lista de clientes, os filtros e a ficha do cliente com as suas abas.' },
  { id: 'etapas', titulo: 'Etapas e novidades da V4', para: 'modulo', texto: etapas, modulos: ['etapas'],
    resumo: 'Cadastro de etapas com o de/para do ClickUp, os novos status, o fluxo do chamado e as abas da V4.' },
  { id: 'projetos', titulo: 'Projetos e modelos', para: 'modulo', texto: projetos, modulos: ['projetos', 'modelos'],
    resumo: 'Criar e acompanhar projetos: pedidos de horas, indicadores, planos de ação, anexos e modelos de projeto.' },
  { id: 'equipe', titulo: 'Equipe e Organograma', para: 'modulo', texto: equipe, modulos: ['equipe', 'organograma'],
    resumo: 'O cadastro da equipe (dados, acessos, skills, conta Sankhya) e o organograma da Sankhya.' },
  { id: 'demandas', titulo: 'Demandas e tarefas', para: 'modulo', texto: demandas, modulos: ['demandas'],
    resumo: 'Demandas, subdemandas e tarefas: status, horas, comentários e favoritos.' },
  { id: 'agenda', titulo: 'Agenda, Desvios e Ociosidade', para: 'modulo', texto: agenda, modulos: ['agenda', 'desvios', 'ociosidade'],
    resumo: 'As telas da Agenda da equipe, dos Desvios de agenda e da Ociosidade: filtros, cores e botões.' },
  { id: 'chamados', titulo: 'Chamados', para: 'modulo', texto: chamados, modulos: ['chamados'],
    resumo: 'Abrir, triar e acompanhar chamados, e a aba Portal Sankhya.' },
  { id: 'envio-agendas', titulo: 'Envio de agendas', para: 'modulo', texto: envioAgendas, modulos: ['envio-agendas'],
    resumo: 'Enviar a agenda da semana aos contatos dos clientes.' },
  { id: 'aceite-os', titulo: 'Aceite de OS', para: 'modulo', texto: aceiteOs, modulos: ['aceite-os'],
    resumo: 'Conferir as OS de cada FAP no Experience e enviar o aceite ao cliente.' },
  { id: 'ferias', titulo: 'Controle de Férias', para: 'modulo', texto: ferias, modulos: ['ferias'],
    resumo: 'Os prazos e os períodos de férias da equipe.' },
  { id: 'reembolso', titulo: 'Reembolso KM', para: 'modulo', texto: reembolso, modulos: ['reembolso'],
    resumo: 'Registrar os deslocamentos e montar o relatório de reembolso de quilometragem.' },
  { id: 'portfolio', titulo: 'Portfólio', para: 'modulo', texto: portfolio, modulos: ['portfolio'],
    resumo: 'A visão geral dos projetos: fases, GPs, situação e planos de ação.' },
  { id: 'produtividade', titulo: 'Produtividade e Meu fechamento', para: 'modulo', texto: produtividade, modulos: ['produtividade', 'meu-fechamento'],
    resumo: 'Os apontamentos, o gráfico de horas e o fechamento do seu período.' },
  { id: 'financeiro', titulo: 'Financeiro: Acessos e Remuneração', para: 'modulo', texto: financeiro, modulos: ['financeiro'],
    resumo: 'O cofre financeiro: quem tem acesso, os papéis e a remuneração com vigência.' },
  { id: 'fechamento', titulo: 'Fechamento de produtividade', para: 'modulo', texto: fechamento, modulos: ['fechamento'],
    resumo: 'O fechamento do período 21–20: cálculo, ajustes, fechar, reabrir e exportar.' },
  { id: 'rentabilidade', titulo: 'Rentabilidade', para: 'modulo', texto: rentabilidade, papeisCofre: ['dono', 'rentabilidade'],
    resumo: 'A aba Rentabilidade das fichas de Cliente, Projeto e Demanda: receita, custo e margem.' },
  { id: 'sync-experience', titulo: 'Sync com o Experience', para: 'modulo', texto: syncExperience, modulos: ['sync-experience'],
    resumo: 'Os lançamentos do Experience feitos pelas tarefas: simulação, execução e resultado.' },
  { id: 'sync-clickup', titulo: 'Sincronização com o ClickUp', para: 'modulo', texto: syncClickup, modulos: ['sync-clickup'],
    resumo: 'Como ler o status do espelho com o ClickUp e o que fazer quando ele para.' },
  { id: 'mcp', titulo: 'IA (MCP)', para: 'modulo', texto: mcp, modulos: ['mcp'],
    resumo: 'Ligar uma IA ao PMO: gerar o token, o que ela alcança, gravação em dois passos e como revogar.' },
];

/** Manuais que a pessoa vê: os da função (consultor: só os do consultor) e os dos módulos que ela enxerga no menu. */
export function manuaisVisiveis(perfil: string | null | undefined, lista: Manual[] = MANUAIS, acesso: AcessoManual = {}): Manual[] {
  const consultor = perfil === 'consultor' || !perfil;
  const fin = acesso.fin ?? [];
  const mods = new Set(modulosVisiveis(acesso.permissoes ?? [], fin).map(m => m.id));
  return lista.filter(m => {
    if (m.para === 'consultor') return true;
    if (m.para === 'gestao') return !consultor;
    if (!perfil) return false;
    return (!m.modulos?.length || m.modulos.some(id => mods.has(id))) && (!m.papeisCofre || m.papeisCofre.some(p => fin.includes(p)));
  });
}

/** Endereço de uma imagem do manual (public/manuais/<id>/<arquivo>); URL completa fica como está. */
export const imagemManual = (id: string, src: string, base: string = import.meta.env.BASE_URL) =>
  /^(https?:|data:|\/)/.test(src) ? src : `${base}manuais/${id}/${src.replace(/^\.\//, '')}`;
