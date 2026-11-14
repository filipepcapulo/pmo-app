// Envio de agendas por cliente (V10b, escopo §8). O texto e os destinatários saem do banco (0038); a tela só escolhe os
// clientes. O envio passa pela Edge Function `enviar-agenda`, uma mensagem por cliente.
// V13a-5 (0058, regras da Agenda semanal da Central): Planejamento e gestores ficam fora (só contados), o 1º contato é o
// Para e os demais vão em Cc, e alguns clientes vêm desmarcados com o motivo (editável aqui).
import { novaOperacao, rpc, sb, FalhaApi } from './cliente';
import { traduzirErro } from './mensagens';
import { inicioSemana } from './consultor';
import { somarDias } from './projeto';

export interface AgendaEnvio { tarefa_id: string; consultor: string; demanda: string; data: string; dia: string; periodo: string; usuario_cliente: string; agenda: string }
export interface ContatoEnvio { nome: string; email: string; papel: 'lider' | 'patrocinador'; tipo?: 'para' | 'cc' }
export interface ClienteEnvio {
  cliente_id: string; cliente: string; agendas: AgendaEnvio[]; nao_confirmadas: number; contatos: ContatoEnvio[];
  /** Fora do e-mail (0058): agenda "Planejamento" e agenda de gestor. */
  fora_planejamento?: number; fora_gestao?: number;
  /** Cliente que vem desmarcado (X-Horas Cruzadas, X-Interno, Energe…), com o motivo. */
  desmarcado_motivo?: string | null;
  assunto: string; html: string; whatsapp: string; texto: string;
  ultimo_envio: { situacao: 'pendente' | 'enviado' | 'erro'; em: string; erro: string | null } | null;
}
export interface ResultadoEnvio {
  resultados: { cliente: string; ok: boolean; erro?: string }[];
  pulados: { cliente_id: string; cliente: string; motivo: string }[];
}

export const envioAgenda = {
  previa: (esc: string, de: string, ate: string) => rpc<ClienteEnvio[]>('v1_envio_agenda', { p_escritorio: esc, p_de: de, p_ate: ate }),
  enviar: async (esc: string, de: string, ate: string, clientes: string[]) => {
    const { data, error } = await sb.functions.invoke('enviar-agenda', {
      body: { escritorio: esc, de, ate, clientes, id_operacao: novaOperacao() },
    });
    if (error) {
      // erro da função vem no corpo da resposta
      const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
      const t = traduzirErro({ message: corpo?.erro ?? error.message });
      throw new FalhaApi(t.codigo, t.mensagem);
    }
    return data as ResultadoEnvio;
  },
  /** Motivo para o cliente vir desmarcado; vazio = volta a vir marcado. */
  desmarcar: (esc: string, cliente_id: string, motivo: string) =>
    rpc<{ ok: true; motivo: string | null }>('v1_envio_agenda_desmarcar', { p_escritorio: esc, p_dados: { cliente_id, motivo }, p_id_operacao: novaOperacao() }),
};

/** Segunda a domingo da semana seguinte à data. */
export function proximaSemana(hoje: string) {
  const de = somarDias(inicioSemana(hoje), 7);
  return { de, ate: somarDias(de, 6) };
}

/** Só vai quem tem agenda confirmada e contato com e-mail. */
export const podeEnviar = (c: ClienteEnvio) => c.agendas.length > 0 && c.contatos.length > 0;

/** Marcados ao abrir: quem pode receber, não tem motivo para vir desmarcado e ainda não recebeu este período (quem deu erro volta marcado). */
export const marcadosPadrao = (l: ClienteEnvio[]) =>
  l.filter(c => podeEnviar(c) && !c.desmarcado_motivo && c.ultimo_envio?.situacao !== 'enviado').map(c => c.cliente_id);

/** Para e Cc: o banco marca o 1º contato como Para (0058); sem a marca (banco antigo), todos são Para. */
export function destinatarios(contatos: ContatoEnvio[]) {
  const temTipo = contatos.some(c => c.tipo);
  return {
    para: contatos.filter(c => !temTipo || c.tipo === 'para'),
    cc: temTipo ? contatos.filter(c => c.tipo === 'cc') : [],
  };
}

/** Aviso do que ficou fora do e-mail (Planejamento e gestores). */
export function rotuloFora(c: Pick<ClienteEnvio, 'fora_planejamento' | 'fora_gestao'>) {
  const p = [c.fora_planejamento ? `${c.fora_planejamento} de Planejamento` : '', c.fora_gestao ? `${c.fora_gestao} de gestor` : ''].filter(Boolean);
  return p.length ? `Fora do e-mail: ${p.join(' e ')}.` : '';
}
