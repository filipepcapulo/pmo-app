// Comentários (escopo §2.4): chat histórico com usuário, data e hora; só acrescenta. Editar/excluir só o autor
// (marca "editado"). "@" abre a lista da equipe: quem for mencionado recebe notificação.
import { useEffect, useRef, useState } from 'react';
import { exec, mencoesNoTexto, type Comentario, type EntidadeComentavel } from '../api/execucao';
import { useCarga } from '../estado/carga';
import { useEquipe, usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { NomePessoa } from './NomePessoa';
import { useToast } from './Toasts';

const quando = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Texto com as menções destacadas. */
function TextoComMencoes({ texto, nomes }: { texto: string; nomes: string[] }) {
  if (!nomes.length) return <>{texto}</>;
  const re = new RegExp('(' + nomes.map(n => '@' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
  return <>{texto.split(re).map((p, i) => (i % 2 ? <strong key={i} className="mencao">{p}</strong> : p))}</>;
}

export function Comentarios({ entidade, id, aoMudar }: { entidade: EntidadeComentavel; id: string; aoMudar?: (n: number) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const { lista: equipe, porId } = useEquipe();
  const c = useCarga(() => exec.comentarios(esc, entidade, id), [esc, entidade, id]);
  const [texto, setTexto] = useState('');
  const [escolhidos, setEscolhidos] = useState<{ id: string; nome: string }[]>([]);
  const [sugestao, setSugestao] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ c: Comentario; texto: string } | null>(null);
  const [gravando, setGravando] = useState(false);
  const caixa = useRef<HTMLTextAreaElement>(null);
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => { if (c.dados) { aoMudar?.(c.dados.length); fim.current?.scrollIntoView?.({ block: 'nearest' }); } }, [c.dados, aoMudar]);

  const digitar = (v: string) => {
    setTexto(v);
    const ate = v.slice(0, caixa.current?.selectionStart ?? v.length);
    const m = /(?:^|\s)@([\p{L} ]{0,30})$/u.exec(ate);
    setSugestao(m ? m[1] : null);
  };
  const candidatos = sugestao === null ? [] : equipe.filter(p => p.ativo && p.nome.toLowerCase().startsWith(sugestao.trimStart().toLowerCase())).slice(0, 6);
  const mencionar = (p: { id: string; nome: string }) => {
    const pos = caixa.current?.selectionStart ?? texto.length;
    const antes = texto.slice(0, pos).replace(/@[\p{L} ]{0,30}$/u, '@' + p.nome + ' ');
    setTexto(antes + texto.slice(pos));
    setEscolhidos(e => (e.some(x => x.id === p.id) ? e : [...e, { id: p.id, nome: p.nome }]));
    setSugestao(null);
    caixa.current?.focus();
  };
  const enviar = async () => {
    if (!texto.trim()) return;
    setGravando(true);
    try {
      await exec.comentarioSalvar(esc, { entidade, entidade_id: id, texto: texto.trim(), mencoes: mencoesNoTexto(texto, escolhidos) });
      setTexto(''); setEscolhidos([]);
      await c.recarregar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const alterar = async (cm: Comentario, dados: { texto?: string; excluir?: boolean }) => {
    try {
      await exec.comentarioSalvar(esc, { id: cm.id, versao: cm.versao, ...dados });
      setEditando(null);
      await c.recarregar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  const lista = c.dados ?? [];
  return (
    <section className="comentarios" aria-label="Comentários">
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {!c.erro && lista.length === 0 && !c.carregando && <p className="ajuda">Nenhum comentário ainda.</p>}
      <ol className="chat">
        {lista.map(cm => (
          <li key={cm.id} className={`msg${cm.meu ? ' meu' : ''}`}>
            <header><NomePessoa pessoa={cm.autor} comAvatar /> <time dateTime={cm.criado_em}>{quando(cm.criado_em)}</time>
              {cm.editado_em && <small className="ajuda" title={quando(cm.editado_em)}> (editado)</small>}</header>
            {editando?.c.id === cm.id ? (
              <div className="msg-edicao">
                <textarea value={editando.texto} onChange={e => setEditando({ ...editando, texto: e.target.value })} rows={3} aria-label="Editar comentário" />
                <div className="linha"><Botao onClick={() => setEditando(null)}>Cancelar</Botao>
                  <Botao variante="primario" onClick={() => alterar(cm, { texto: editando.texto.trim() })} disabled={!editando.texto.trim()}>Gravar</Botao></div>
              </div>
            ) : <p><TextoComMencoes texto={cm.texto} nomes={cm.mencoes.map(m => porId.get(m)?.nome ?? '').filter(Boolean)} /></p>}
            {cm.meu && editando?.c.id !== cm.id && (
              <div className="msg-acoes">
                <button type="button" className="link" onClick={() => setEditando({ c: cm, texto: cm.texto })}>Editar</button>
                <button type="button" className="link" onClick={() => { if (confirm('Excluir o comentário?')) alterar(cm, { excluir: true }); }}>Excluir</button>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div ref={fim} />
      {pode('comentario.gravar') && (
        <div className="chat-novo">
          <textarea ref={caixa} value={texto} rows={2} placeholder="Escreva um comentário… (@ para mencionar)" aria-label="Novo comentário"
            onChange={e => digitar(e.target.value)} maxLength={10000}
            onKeyDown={e => {
              if (candidatos.length && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); mencionar(candidatos[0]); }
              else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enviar(); }
              else if (e.key === 'Escape' && sugestao !== null) { e.stopPropagation(); setSugestao(null); }
            }} />
          {candidatos.length > 0 && (
            <ul className="sugestoes" role="listbox" aria-label="Mencionar">
              {candidatos.map(p => <li key={p.id} role="option" aria-selected={false}><button type="button" onMouseDown={e => { e.preventDefault(); mencionar(p); }}>{p.nome}</button></li>)}
            </ul>
          )}
          <Botao variante="primario" carregando={gravando} onClick={enviar} disabled={!texto.trim()}>Comentar</Botao>
        </div>
      )}
    </section>
  );
}
