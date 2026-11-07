// Notificações no aparelho (#/notificacoes, V11d-3): mesma tela do 2.x — escolher os avisos (Ociosidade, Reembolso KM),
// Ativar / Salvar escolhas, Enviar teste, Desativar neste aparelho — e a lista dos outros aparelhos inscritos.
// Quem pode receber cada aviso: Ociosidade = "recebe notif. Ociosidade" em Equipe › App/APK; Reembolso = reembolso.usar.
import { useCallback, useEffect, useState } from 'react';
import { traduzirErro } from '../api/mensagens';
import { ehIos, inscricaoAtual, instaladoNaTela, push, pushSuportado, tiposValidos, type PushMeu, type TipoAviso } from '../api/push';
import { Botao } from '../componentes/Botao';
import { useToast } from '../componentes/Toasts';
import { useSessao } from '../estado/sessao';

const quando = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function NotificacoesAparelho() {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [dados, setDados] = useState<PushMeu | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<TipoAviso>>(new Set());
  const [ocupado, setOcupado] = useState<'' | 'ativar' | 'teste' | 'desativar' | string>('');
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const suportado = pushSuportado();

  const carregar = useCallback(async () => {
    try {
      const sub = await inscricaoAtual().catch(() => null);
      const d = await push.meu(esc, sub?.endpoint ?? null);
      setEndpoint(sub?.endpoint ?? null);
      setDados(d);
      setMarcados(new Set(d.tipos));
      setErro('');
    } catch (e) { setErro(traduzirErro(e).mensagem); }
  }, [esc]);
  useEffect(() => { carregar(); }, [carregar]);

  const ativo = !!(dados?.inscrito && endpoint);
  const fazer = (qual: string, fn: () => Promise<void>) => async () => {
    setOcupado(qual); setErro(''); setInfo('');
    try { await fn(); } catch (e) { setErro(traduzirErro(e).mensagem); }
    setOcupado('');
  };
  const alternar = (id: TipoAviso) => setMarcados(m => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const escolhidos = dados ? tiposValidos(dados.disponiveis, marcados) as TipoAviso[] : [];
  const negado = suportado && Notification.permission === 'denied';
  const outros = (dados?.aparelhos ?? []).filter(a => !(a.este && ativo));

  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Notificações</h1><p className="ajuda">Avisos neste aparelho, mesmo com o app fechado.</p></div>
      </header>
      {!dados && !erro && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {erro && <p className="msg-erro" role="alert">{erro}</p>}
      {dados && !suportado && (
        <p className="dica-caixa" data-testid="push-sem-suporte">{ehIos() && !instaladoNaTela()
          ? <>No iPhone, as notificações só funcionam com o app instalado: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>, e abra o app por lá.</>
          : <>Este navegador não aceita notificações. No Android, abra o app no <b>Chrome</b>.</>}</p>
      )}
      {dados && suportado && !dados.disponiveis.length && (
        <p className="vazio-tela" data-testid="push-nada">Nenhum aviso liberado para você. A Ociosidade é liberada pelo administrador em
          Equipe › App/APK ("recebe notif. Ociosidade"); o Reembolso KM, pela permissão do módulo.</p>
      )}
      {dados && suportado && dados.disponiveis.length > 0 && (
        <section className="cartao push-cartao" aria-label="Avisos">
          <p className="ajuda" data-testid="push-estado">{ativo ? <>Notificações <b>ativas</b> neste aparelho.</> : 'Escolha o que quer receber neste aparelho e toque em Ativar.'}</p>
          <div className="push-opcoes">
            {dados.disponiveis.map(t => (
              <label key={t.id} className="check push-opcao">
                <input type="checkbox" checked={marcados.has(t.id)} disabled={!!ocupado} onChange={() => alternar(t.id)} />
                <span><strong>{t.titulo}</strong><small className="ajuda">{t.descricao}</small></span>
              </label>
            ))}
          </div>
          {negado && <p className="dica-caixa">As notificações estão bloqueadas para este app. Libere em <b>Configurações do site › Notificações</b> e volte aqui.</p>}
          {!ehIos() && !instaladoNaTela() && <p className="ajuda">Dica: no Chrome, toque em <b>⋮ › Instalar app</b> (ou Adicionar à tela inicial) para receber os avisos como um app normal.</p>}
          <div className="push-botoes">
            <Botao variante="primario" carregando={ocupado === 'ativar'} disabled={!!ocupado || !escolhidos.length}
              onClick={fazer('ativar', async () => { await push.ativar(esc, dados.publica, escolhidos); avisar(ativo ? 'Escolhas salvas' : 'Notificações ativas', 'ok'); await carregar(); })}>
              {ativo ? 'Salvar escolhas' : 'Ativar notificações'}
            </Botao>
            {ativo && <>
              <Botao carregando={ocupado === 'teste'} disabled={!!ocupado}
                onClick={fazer('teste', async () => {
                  const sub = await inscricaoAtual();
                  if (!sub) { await carregar(); throw new Error('Este aparelho não está mais inscrito. Toque em Ativar de novo.'); }
                  await push.teste(esc, sub.endpoint);
                  setInfo('Teste enviado. Costuma chegar em alguns segundos.');
                })}>Enviar notificação de teste</Botao>
              <Botao variante="perigo" carregando={ocupado === 'desativar'} disabled={!!ocupado}
                onClick={fazer('desativar', async () => { await push.desativar(esc); avisar('Notificações desativadas', 'ok'); await carregar(); })}>
                Desativar neste aparelho</Botao>
            </>}
          </div>
          {info && <p className="ajuda" role="status">{info}</p>}
        </section>
      )}
      {dados && outros.length > 0 && (
        <section className="cartao push-cartao" aria-label="Outros aparelhos">
          <h2>Outros aparelhos com notificações</h2>
          <ul className="push-aparelhos">
            {outros.map(a => (
              <li key={a.id}>
                <span>{a.aparelho || 'Aparelho'} <small className="ajuda">desde {quando(a.criadoEm)}</small></span>
                <Botao variante="fantasma" carregando={ocupado === a.id} disabled={!!ocupado}
                  onClick={fazer(a.id, async () => { await push.remover(esc, a.id); await carregar(); })}>Tirar</Botao>
              </li>
            ))}
          </ul>
          <p className="ajuda">Os avisos de hoje vão para: {dados.tipos.length ? dados.tipos.map(t => dados.disponiveis.find(d => d.id === t)?.titulo ?? t).join(', ') : 'nenhum'} (a escolha vale para todos os seus aparelhos).</p>
        </section>
      )}
    </div>
  );
}
