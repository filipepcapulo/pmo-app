// Envio de agendas (#/envio-agendas, escopo §8): abre na próxima semana, mostra por cliente o que será enviado, desmarca
// quem não deve receber e envia em um clique. Cada cliente recebe o próprio e-mail, só com as próprias agendas e contatos.
import { useEffect, useRef, useState } from 'react';
import { data } from '../api/cadastros';
import { envioAgenda, marcadosPadrao, podeEnviar, proximaSemana, type ClienteEnvio, type ResultadoEnvio } from '../api/envioAgenda';
import { traduzirErro } from '../api/mensagens';
import { hojeIso } from '../api/projeto';
import { Botao } from '../componentes/Botao';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';

const PAPEL = { lider: 'Líder', patrocinador: 'Patrocinador' };

function CartaoCliente({ c, marcado, aoMarcar }: { c: ClienteEnvio; marcado: boolean; aoMarcar: (v: boolean) => void }) {
  const avisar = useToast();
  const u = c.ultimo_envio;
  return (
    <section className={`cartao envio-cliente${marcado ? '' : ' desmarcado'}`} aria-label={c.cliente}>
      <div className="envio-topo">
        <label className="envio-marca"><input type="checkbox" checked={marcado} disabled={!podeEnviar(c)} onChange={e => aoMarcar(e.target.checked)} /> <strong>{c.cliente}</strong></label>
        <span className="linha">
          {u && <span className={`pilula ${u.situacao === 'erro' ? 'st-atrasada' : u.situacao === 'pendente' ? 'pilula-neutra' : ''}`} title={u.erro ?? undefined}>
            {u.situacao === 'enviado' ? `Enviado em ${data(u.em)}` : u.situacao === 'erro' ? 'Falhou' : 'Pendente'}</span>}
          <Botao onClick={() => navigator.clipboard.writeText(c.whatsapp).then(() => avisar('Texto copiado', 'ok'), () => avisar('Não foi possível copiar', 'erro'))}>Copiar WhatsApp</Botao>
        </span>
      </div>
      {c.contatos.length
        ? <p className="ajuda">Para: {c.contatos.map(p => `${p.nome} (${PAPEL[p.papel]}) <${p.email}>`).join('; ')}</p>
        : <p className="msg-erro">Sem líder ou patrocinador com e-mail. <a href={hashDe(caminhoEntidade('cliente', c.cliente_id))}>Cadastrar no cliente</a></p>}
      <div className="tabela-caixa envio-tabela">
        <table className="tabela">
          <thead><tr><th>#</th><th>Consultor</th><th>Resumo da Demanda</th><th>Data</th><th>Período</th><th>Usuário Cliente</th><th>Agenda</th></tr></thead>
          <tbody>{c.agendas.map((a, i) => (
            <tr key={a.tarefa_id}><td>{i + 1}</td><td>{a.consultor}</td><td>{a.demanda}</td><td>{data(a.data).slice(0, 5)} ({a.dia})</td><td>{a.periodo}</td><td>{a.usuario_cliente}</td><td>{a.agenda}</td></tr>
          ))}</tbody>
        </table>
      </div>
      {c.nao_confirmadas > 0 && <p className="ajuda">{c.nao_confirmadas} agenda(s) não confirmada(s) ficam de fora.</p>}
    </section>
  );
}

export function EnvioAgendas() {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [{ de, ate }, setPeriodo] = useState(() => proximaSemana(hojeIso()));
  const [recarga, setRecarga] = useState(0);
  const c = useCarga(() => envioAgenda.previa(esc, de, ate), [esc, de, ate, recarga]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoEnvio | null>(null);
  // novo período = marcação padrão; recarga depois do envio mantém o que o usuário desmarcou e só tira quem já recebeu
  const periodoMarcado = useRef('');
  useEffect(() => {
    if (!c.dados) return;
    const chave = `${de}|${ate}`;
    if (periodoMarcado.current !== chave) { periodoMarcado.current = chave; setMarcados(new Set(marcadosPadrao(c.dados))); return; }
    const enviados = new Set(c.dados.filter(x => x.ultimo_envio?.situacao === 'enviado').map(x => x.cliente_id));
    setMarcados(m => new Set([...m].filter(id => !enviados.has(id))));
  }, [c.dados, de, ate]);

  const lista = c.dados ?? [];
  const comAgenda = lista.filter(x => x.agendas.length > 0);
  const semConfirmada = lista.filter(x => x.agendas.length === 0);
  const alvos = comAgenda.filter(x => marcados.has(x.cliente_id) && podeEnviar(x));

  async function enviar() {
    setEnviando(true); setErro(null); setResultado(null);
    try {
      const r = await envioAgenda.enviar(esc, de, ate, alvos.map(x => x.cliente_id));
      setResultado(r);
      const ok = r.resultados.filter(x => x.ok).length;
      avisar(`${ok} de ${r.resultados.length} e-mail(s) enviado(s)`, ok === r.resultados.length ? 'ok' : 'erro');
      setRecarga(n => n + 1);
    } catch (e) { setErro(traduzirErro(e).mensagem); }
    setEnviando(false);
  }

  return (
    <div className="pagina">
      <header className="pagina-topo"><div><h1>Envio de agendas</h1><p className="ajuda">Só atendimentos confirmados. Cada cliente recebe o próprio e-mail, com as próprias agendas.</p></div>
        <Botao variante="primario" carregando={enviando} disabled={!alvos.length} onClick={enviar}>Enviar a {alvos.length} cliente(s)</Botao></header>
      <div className="barra-filtros">
        <Botao onClick={() => setPeriodo(proximaSemana(hojeIso()))}>Próxima semana</Botao>
        <label className="ajuda">De <input type="date" value={de} onChange={e => e.target.value && setPeriodo({ de: e.target.value, ate })} aria-label="De" /></label>
        <label className="ajuda">Até <input type="date" value={ate} onChange={e => e.target.value && setPeriodo({ de, ate: e.target.value })} aria-label="Até" /></label>
      </div>
      {(erro || c.erro) && <p className="msg-erro" role="alert">{erro ?? c.erro}</p>}
      {resultado && (
        <section className="cartao" aria-label="Resultado do envio">
          <ul className="envio-resultado">
            {resultado.resultados.map(r => <li key={r.cliente}>{r.ok ? 'Enviado' : 'Falhou'}: {r.cliente}{r.erro ? ` (${r.erro})` : ''}</li>)}
            {resultado.pulados.map(p => <li key={p.cliente_id}>Fora: {p.cliente} ({p.motivo})</li>)}
          </ul>
        </section>
      )}
      {c.carregando && !c.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {c.dados && !comAgenda.length && <p className="ajuda">Nenhuma agenda confirmada no período.</p>}
      {comAgenda.map(x => <CartaoCliente key={x.cliente_id} c={x} marcado={marcados.has(x.cliente_id)} aoMarcar={v => setMarcados(m => {
        const n = new Set(m); if (v) n.add(x.cliente_id); else n.delete(x.cliente_id); return n;
      })} />)}
      {semConfirmada.length > 0 && <p className="ajuda">Sem agenda confirmada: {semConfirmada.map(x => `${x.cliente} (${x.nao_confirmadas})`).join(', ')}.</p>}
    </div>
  );
}
