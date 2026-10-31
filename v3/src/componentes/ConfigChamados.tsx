// Configuração dos chamados (V9): horas úteis de SLA por prioridade e respostas prontas do escritório.
import { useState } from 'react';
import { cham, type OpcoesChamado, type RespostaPronta, type SlaHoras } from '../api/chamados';
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
      <p className="ajuda">Seg–sex, 08h–12h e 13h–17h, sem feriados. Vale para chamados abertos ou reclassificados daqui em diante.</p>
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
    </Popup>
  );
}
