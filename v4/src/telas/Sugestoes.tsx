// Sugestões de melhoria do app (#/sugestoes, 0069): todos veem e sugerem, com anexos. Quem sugeriu edita ou exclui
// enquanto a sugestão está "nova"; quem tem sugestao.gerenciar muda o status e responde.
import { useState } from 'react';
import { data } from '../api/cadastros';
import { filtrarSugestoes, podeEditarSugestao, rotuloStatusSugestao, STATUS_SUGESTAO, sug, type Sugestao } from '../api/sugestoes';
import { Anexos } from '../componentes/Anexos';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { NomePessoa } from '../componentes/NomePessoa';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';

type Rascunho = { id?: string; versao?: number; titulo: string; descricao: string; status: string; resposta: string };

export function Sugestoes() {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const c = useCarga(() => sug.listar(esc), [esc]);
  const [status, setStatus] = useState('');
  const [minhas, setMinhas] = useState(false);
  const [r, setR] = useState<Rascunho | null>(null);
  const [gravando, setGravando] = useState(false);
  const gerencia = c.dados?.gerencia ?? false;
  const linhas = filtrarSugestoes(c.dados?.linhas ?? [], status, minhas);
  const original = r?.id ? c.dados?.linhas.find(x => x.id === r.id) : undefined;
  const abrir = (s: Sugestao) => setR({ id: s.id, versao: s.versao, titulo: s.titulo, descricao: s.descricao ?? '', status: s.status, resposta: s.resposta ?? '' });

  const gravar = async () => {
    if (!r) return;
    if (r.titulo.trim().length < 3) { avisar('Escreva um título com pelo menos 3 letras.', 'erro'); return; }
    setGravando(true);
    try {
      if (!r.id) {
        const g = await sug.salvar(esc, { titulo: r.titulo.trim(), descricao: r.descricao.trim() || null });
        avisar('Sugestão enviada. Se quiser, anexe arquivos.', 'ok');
        const nova = await sug.listar(esc);
        const s = nova.linhas.find(x => x.id === g.id);
        if (s) abrir(s); else setR(null);
      } else {
        const d: Record<string, unknown> = { id: r.id, versao: r.versao };
        if (r.titulo.trim() !== original?.titulo) d.titulo = r.titulo.trim();
        if ((r.descricao.trim() || null) !== (original?.descricao ?? null)) d.descricao = r.descricao.trim() || null;
        if (gerencia && r.status !== original?.status) d.status = r.status;
        if (gerencia && (r.resposta.trim() || null) !== (original?.resposta ?? null)) d.resposta = r.resposta.trim() || null;
        await sug.salvar(esc, d);
        avisar('Sugestão gravada', 'ok');
        setR(null);
      }
      await c.recarregar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  const excluir = async () => {
    if (!r?.id || !confirm('Excluir esta sugestão?')) return;
    try { await sug.salvar(esc, { id: r.id, excluir: true }); setR(null); await c.recarregar(); avisar('Sugestão excluída', 'ok'); }
    catch (e) { avisar((e as Error).message, 'erro'); }
  };
  const edita = !r?.id || (original ? podeEditarSugestao(original, gerencia) : false);

  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Sugestões de melhoria</h1><p className="ajuda">Conte o que deixaria o app melhor. Todos veem as sugestões e as respostas.</p></div>
        <Botao variante="primario" onClick={() => setR({ titulo: '', descricao: '', status: 'nova', resposta: '' })}>+ Sugestão</Botao>
      </header>
      <div className="barra-filtros">
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
          <option value="">Todos os status</option>
          {STATUS_SUGESTAO.map(s => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
        <label className="ajuda"><input type="checkbox" checked={minhas} onChange={e => setMinhas(e.target.checked)} /> Só as minhas</label>
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {!c.dados && !c.erro && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      {c.dados && linhas.length === 0 && <p className="ajuda">Nenhuma sugestão {status || minhas ? 'neste filtro' : 'ainda. Seja o primeiro a sugerir'}.</p>}
      {linhas.map(s => (
        <section key={s.id} className="cartao sugestao">
          <div className="pagina-topo">
            <h2 className="secao"><button type="button" className="link" onClick={() => abrir(s)}>{s.titulo}</button></h2>
            <span className={`pilula${s.status === 'nova' || s.status === 'recusada' ? ' pilula-neutra' : ''}`}>{rotuloStatusSugestao(s.status)}</span>
          </div>
          <small className="ajuda">{s.autor && <NomePessoa pessoa={s.autor} />} · {data(s.criado_em.slice(0, 10))}{s.anexos.length > 0 && ` · 📎 ${s.anexos.length}`}</small>
          {s.descricao && <p className="descricao">{s.descricao}</p>}
          {s.resposta && <p className="ajuda"><strong>Resposta{s.respondido_por ? ` de ${s.respondido_por.nome}` : ''}:</strong> {s.resposta}</p>}
        </section>
      ))}

      <Popup aberto={!!r} titulo={r?.id ? 'Sugestão' : 'Nova sugestão'} aoFechar={() => setR(null)}
        rodape={<>
          {r?.id && edita && <Botao variante="perigo" onClick={excluir}>Excluir</Botao>}
          <Botao variante="secundario" onClick={() => setR(null)}>Fechar</Botao>
          {edita && <Botao variante="primario" carregando={gravando} onClick={gravar}>{r?.id ? 'Gravar' : 'Enviar'}</Botao>}
        </>}>
        {r && (
          <Formulario aoEnviar={gravar}>
            <Campo rotulo="Título" valor={r.titulo} aoMudar={v => setR({ ...r, titulo: v })} obrigatorio somenteLeitura={!edita} maxLength={200} />
            <Campo rotulo="Descrição" tipo="textarea" valor={r.descricao} aoMudar={v => setR({ ...r, descricao: v })} somenteLeitura={!edita} maxLength={5000}
              ajuda="O que você faria diferente e por quê." />
            {r.id && gerencia && <>
              <Campo rotulo="Status" tipo="select" valor={r.status} aoMudar={v => setR({ ...r, status: v })} opcoes={STATUS_SUGESTAO} />
              <Campo rotulo="Resposta" tipo="textarea" valor={r.resposta} aoMudar={v => setR({ ...r, resposta: v })} maxLength={2000} />
            </>}
            {r.id && !gerencia && original?.resposta && <p className="ajuda"><strong>Resposta:</strong> {original.resposta}</p>}
            {r.id && original && <><h3 className="secao">Anexos</h3><Anexos entidade="sugestao" id={r.id} itens={original.anexos} aoMudar={c.recarregar} /></>}
            {!r.id && <p className="ajuda">Depois de enviar você pode anexar arquivos (prints, documentos).</p>}
          </Formulario>
        )}
      </Popup>
    </div>
  );
}
