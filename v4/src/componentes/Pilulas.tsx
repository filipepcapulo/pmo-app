// Pílulas da V4 para demanda/subdemanda: etapa (cor do cadastro de etapas), status (cor por status) e responsável
// (iniciais, cor por pessoa). Usadas na árvore de demandas, nas fichas e nos chamados.
import { corPessoa, corTexto, iniciais } from '../api/etapas';
import { rotuloStatusDemanda, statusV4 } from '../api/execucao';
import { useEquipe } from '../estado/equipe';
import { useEtapas } from '../estado/etapas';

type RegEtapa = { etapa_app_id?: string | null; etapa_id?: string | null; etapa?: string | null };

export function PilulaEtapa({ reg, id }: { reg?: RegEtapa | null; id?: string | null }) {
  const et = useEtapas();
  const e = id ? et.porId.get(id) ?? null : et.de(reg);
  if (!e) return reg?.etapa ? <span className="pil pil-etapa pil-sem" title={`Etapa do ClickUp sem vínculo: ${reg.etapa}`}>{reg.etapa}</span> : null;
  return <span className="pil pil-etapa" data-etapa={e.codigo} style={{ background: e.cor, color: corTexto(e.cor) }} title={`Etapa: ${e.nome}`}>{e.nome}</span>;
}

export function PilulaStatus({ status }: { status: string }) {
  return <span className={`pil pil-status pst-${statusV4(status)}`} title={`Status: ${rotuloStatusDemanda(status)}`}>{rotuloStatusDemanda(status)}</span>;
}

export function PilulaResp({ id, vazio }: { id?: string | null; vazio?: boolean }) {
  const { porId } = useEquipe();
  if (!id) return vazio ? <span className="pil pil-resp pil-sem" title="Sem responsável">—</span> : null;
  const m = porId.get(id);
  const nome = m?.nome ?? 'Responsável';
  const cor = corPessoa(id, m?.cor);
  return <span className="pil pil-resp" style={{ background: cor, color: corTexto(cor) }} title={`Responsável: ${nome}`} aria-label={`Responsável: ${nome}`}>{m?.iniciais || iniciais(nome)}</span>;
}

export const ROTULO_LOCAL: Record<string, string> = {
  triagem: 'Triagem', aguardando_cliente: 'Aguardando Autorização do Cliente', backlog_consultores: 'Backlog Consultores',
  backlog_personalizacao: 'Backlog Personalização', atribuido: 'Atribuído', service_desk: 'Service Desk Sankhya',
  em_validacao: 'Em Validação', concluido: 'Concluído',
};
export function PilulaLocal({ local }: { local: string | null | undefined }) {
  return <span className={`pil pil-local loc-${local ?? 'encerrado'}`}>{local ? ROTULO_LOCAL[local] ?? local : 'Encerrado'}</span>;
}
