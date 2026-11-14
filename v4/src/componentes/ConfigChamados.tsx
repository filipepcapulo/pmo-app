// Configuração dos chamados (V9): horas úteis de SLA por prioridade e respostas prontas do escritório.
import { useState } from 'react';
import { cham, type OpcoesChamado, type RespostaPronta, type SlaHoras } from '../api/chamados';
import { chamV4 } from '../api/chamadosV4';
import { useCarga } from '../estado/carga';
import { useEquipe } from '../estado/equipe';
import { SelecaoMultipla } from './SelecaoMultipla';
import { PRIORIDADES } from '../api/execucao';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo } from './Campo';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export function ConfigChamados({ opcoes, aoFechar, aoMudar }: { opcoes: OpcoesChamado; aoFechar: () => void; aoMudar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [sla, setSla] = useState<SlaHoras>(opcoes.sla);
  const [edita, setEdita] = useState<Partial<RespostaPronta> | null>(null);
  const [gravando, setGravando] = useState(false);
  const faz = async (fn: () => Promise<unknown>, msg: string) => {
    setGravando(true);
    try { await fn(); avisar(msg, 'ok'); setEdita(null); aoMudar(); } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const horas = (p: string, c: 'resposta' | 'solucao', v: string) => setSla(s => ({ ...s, [p]: { ...s[p], [c]: Number(v.replace(',', '.')) } }));
  return (
    <Popup aberto titulo="Configurar chamados" aoFechar={aoFechar} largura={620} rodape={<Botao onClick={aoFechar}>Fechar</Botao>}>
      <h3 className="secao">SLA em horas úteis</h3>
      <p className="ajuda">Seg–sex, 08h–12h e 14h–18h (almoço 12h–14h), sem feriados. Vale para chamados abertos ou reclassificados daqui em diante.</p>
      {PRIORIDADES.slice().reverse().map(p => (
        <div className="duas-col" key={p.valor}>
          <Campo rotulo={`${p.rotulo}: 1ª resposta`} tipo="number" valor={String(sla[p.valor]?.resposta ?? '')} aoMudar={v => horas(p.valor, 'resposta', v)} />
          <Campo rotulo={`${p.rotulo}: solução`} tipo="number" valor={String(sla[p.valor]?.solucao ?? '')} aoMudar={v => horas(p.valor, 'solucao', v)} />
        </div>
      ))}
      <Botao variante="primario" carregando={gravando} onClick={() => faz(() => cham.slaSalvar(esc, sla), 'SLA gravado.')}>Gravar SLA</Botao>

      <h3 className="secao">Respostas prontas</h3>
      <p className="ajuda">Use {'{numero}'}, {'{cliente}'}, {'{solicitante}'} e {'{titulo}'} no texto.</p>
      <ul className="lista-simples">
        {opcoes.respostas.map(r => (
          <li key={r.id}><button type="button" className="link" onClick={() => setEdita(r)}>{r.titulo}</button>{' '}
            <button type="button" className="link" aria-label={`Excluir ${r.titulo}`} onClick={() => faz(() => cham.respostaSalvar(esc, { id: r.id, versao: r.versao, excluir: true }), 'Resposta excluída.')}>×</button></li>
        ))}
      </ul>
      {!edita && <Botao onClick={() => setEdita({ titulo: '', texto: '' })}>+ Resposta pronta</Botao>}
      {edita && <>
        <Campo rotulo="Título" obrigatorio valor={edita.titulo ?? ''} aoMudar={v => setEdita({ ...edita, titulo: v })} maxLength={120} />
        <Campo rotulo="Texto" tipo="textarea" obrigatorio valor={edita.texto ?? ''} aoMudar={v => setEdita({ ...edita, texto: v })} maxLength={5000} />
        <div className="linha">
          <Botao onClick={() => setEdita(null)}>Cancelar</Botao>
          <Botao variante="primario" carregando={gravando} onClick={() => faz(() => cham.respostaSalvar(esc, edita), 'Resposta gravada.')}>Gravar resposta</Botao>
        </div>
      </>}
      <AvisoBacklog />
    </Popup>
  );
}

/** V4: quem recebe o aviso no sino quando entra item em cada backlog (vazio = vale o perfil). */
function AvisoBacklog() {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const { lista, porId } = useEquipe();
  const c = useCarga(() => chamV4.aviso(esc), [esc]);
  const [v, setV] = useState<{ pers: string[]; cons: string[] } | null>(null);
  const [gravando, setGravando] = useState(false);
  const a = v ?? (c.dados ? { pers: c.dados.pers, cons: c.dados.cons } : null);
  if (!c.dados || !a) return null;
  const ops = lista.filter(m => m.ativo).map(m => ({ valor: m.id, rotulo: m.nome }));
  const nomes = (ids: string[]) => ids.map(i => porId.get(i)?.nome ?? '').filter(Boolean).join(', ') || 'ninguém com esse perfil';
  const gravar = async () => {
    setGravando(true);
    try { await chamV4.avisoSalvar(esc, a); avisar('Avisos de backlog gravados', 'ok'); setV(null); await c.recarregar(); } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <section data-secao="aviso-backlog">
      <h3 className="secao">Aviso no sino ao entrar item no backlog</h3>
      <p className="ajuda">Sem ninguém escolhido vale o perfil: Backlog Personalização avisa o <strong>Líder Tech</strong> ({nomes(c.dados.padrao_pers)}) e Backlog Consultores avisa a <strong>Triagem</strong> ({nomes(c.dados.padrao_cons)}).</p>
      <div className="linha">
        <SelecaoMultipla rotulo="Backlog Personalização" opcoes={ops} sel={a.pers} aoMudar={x => setV({ ...a, pers: x })} />
        <SelecaoMultipla rotulo="Backlog Consultores" opcoes={ops} sel={a.cons} aoMudar={x => setV({ ...a, cons: x })} />
        <Botao variante="primario" disabled={!v} carregando={gravando} onClick={gravar}>Gravar avisos</Botao>
      </div>
    </section>
  );
}
