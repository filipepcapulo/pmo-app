// Sino do topo: notificações do usuário (menções, tarefas novas…). Atualiza a cada minuto e ao gravar algo.
import { useCallback, useEffect, useRef, useState } from 'react';
import { exec, type Notificacao } from '../api/execucao';
import { useEdicao } from '../estado/edicao';
import { useSessao } from '../estado/sessao';

const quando = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function Notificacoes() {
  const esc = useSessao().eu!.escritorio_id;
  const { geracao } = useEdicao();
  const [dados, setDados] = useState<{ nao_lidas: number; itens: Notificacao[] }>({ nao_lidas: 0, itens: [] });
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const carregar = useCallback(async () => {
    if (!esc) return;
    try { setDados(await exec.notificacoes(esc)); } catch { /* sem rede: tenta no próximo minuto */ }
  }, [esc]);
  useEffect(() => { carregar(); const t = setInterval(carregar, 60_000); return () => clearInterval(t); }, [carregar, geracao]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    const esc_ = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc_);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc_); };
  }, [aberto]);
  const lidas = async (ids: string[] | null) => {
    if (!esc) return;
    try { await exec.notificacoesLidas(esc, ids); await carregar(); } catch { /* */ }
  };
  return (
    <div className="notif" ref={caixa}>
      <button type="button" className="topo-bt" aria-label={`Notificações${dados.nao_lidas ? ` (${dados.nao_lidas} não lidas)` : ''}`}
        aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        🔔{dados.nao_lidas > 0 && <span className="notif-cont" aria-hidden>{dados.nao_lidas > 99 ? '99+' : dados.nao_lidas}</span>}
      </button>
      {aberto && (
        <div className="notif-caixa" role="dialog" aria-label="Notificações">
          <header><strong>Notificações</strong>
            {dados.nao_lidas > 0 && <button type="button" className="link" onClick={() => lidas(null)}>Marcar todas como lidas</button>}</header>
          {dados.itens.length === 0 ? <p className="ajuda">Nada por aqui.</p> : (
            <ul>
              {dados.itens.map(n => (
                <li key={n.id} className={n.lida ? 'lida' : undefined}>
                  <a href={n.link ?? '#/inicio'} onClick={() => { setAberto(false); if (!n.lida) lidas([n.id]); }}>
                    <span>{n.titulo}</span><small className="ajuda">{quando(n.criado_em)}</small>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
