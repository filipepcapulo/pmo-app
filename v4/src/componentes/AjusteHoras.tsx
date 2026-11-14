// Ajuste das horas consideradas de um atendimento do fechamento de produtividade (não altera o apontamento).
// Usado no detalhe do consultor e na aba Histórico. Atalhos do "Produtividade SK": descontar 50% (apontamento
// retroativo) e não considerar (zerar). A observação é obrigatória.
import { useState } from 'react';
import { data } from '../api/cadastros';
import { descontoRetroativo, fech, hm, minutosDe, NAO_CONSIDERAR, obsAjusteValida, type LinhaFech } from '../api/fechamentoFin';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { useToast } from './Toasts';

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');

export function AjusteHoras({ esc, linha, aoCancelar, aoGravado }: { esc: string; linha: LinhaFech; aoCancelar: () => void; aoGravado: () => Promise<void> | void }) {
  const avisar = useToast();
  const [hn, setHn] = useState(hm(linha.hn));
  const [he, setHe] = useState(linha.he ? hm(linha.he) : '');
  const [obs, setObs] = useState(linha.aj ? linha.ajobs : '');
  const [gravando, setGravando] = useState(false);
  const mandar = async (d: Parameters<typeof fech.ajustar>[1], ok: string) => {
    setGravando(true);
    try { await fech.ajustar(esc, d); avisar(ok, 'ok'); await aoGravado(); } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const gravar = () => {
    const n = minutosDe(hn), e = minutosDe(he || '0');
    if (n === null || e === null) { avisar('Informe as horas como 2:30 ou 2,5.', 'erro'); return; }
    if (!obsAjusteValida(obs)) { avisar('A observação é obrigatória para alterar as horas consideradas.', 'erro'); return; }
    mandar({ apontamento_id: linha.id, hn: n, he: e, obs: obs.trim() }, 'Ajuste gravado');
  };
  const metade = () => { const d = descontoRetroativo(linha); setHn(hm(d.hn)); setHe(d.he ? hm(d.he) : ''); setObs(d.obs); };
  const zerar = () => { setHn('0:00'); setHe(''); setObs(NAO_CONSIDERAR); };
  return (
    <Formulario aoEnviar={gravar}>
      <p className="ajuda fin-aviso">{data(linha.data)}{linha.nome ? ` · ${linha.nome}` : ''} · {linha.cli} · {linha.desc || linha.serv} — apontado: {hm(linha.hn0)} normais{linha.he0 ? ` + ${hm(linha.he0)} extras` : ''}.
        O ajuste muda só as horas consideradas no fechamento; o apontamento não é alterado.</p>
      <div className="fech-atalhos">
        <span className="ajuda">Atalhos:</span>
        <button type="button" className="chip" onClick={metade}>Descontar 50% (apontamento retroativo)</button>
        <button type="button" className="chip" onClick={zerar}>Não considerar (zerar)</button>
      </div>
      <div className="grade-campos">
        <Campo rotulo="Horas normais consideradas" valor={hn} aoMudar={setHn} obrigatorio ajuda="Ex.: 2:30" autoComplete="off" />
        <Campo rotulo="Horas extras consideradas" valor={he} aoMudar={setHe} ajuda="Vazio = nenhuma" autoComplete="off" />
      </div>
      <Campo rotulo="Observação (obrigatória)" valor={obs} aoMudar={setObs} obrigatorio maxLength={500} placeholder="Ex.: glosa do cliente, horas faturadas por empreito…" />
      {linha.aj && <p className="ajuda">Ajuste atual por {linha.ajpor || '—'}{linha.ajem ? ` em ${quando(linha.ajem)}` : ''}.</p>}
      <div className="fech-acoes fech-ajuste-botoes">
        {linha.aj && <Botao variante="perigo" className="a-esquerda" carregando={gravando} onClick={() => mandar({ apontamento_id: linha.id, remover: true }, 'Ajuste removido')}>Voltar às horas apontadas</Botao>}
        <Botao onClick={aoCancelar}>Cancelar</Botao>
        <Botao variante="primario" carregando={gravando} onClick={gravar}>Gravar ajuste</Botao>
      </div>
    </Formulario>
  );
}
