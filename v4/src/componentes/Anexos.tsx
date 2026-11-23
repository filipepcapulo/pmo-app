// Anexos de projeto/demanda/tarefa/chamado/sugestão: o arquivo sobe ao Storage (pasta do escritório) e o registro vai pela API.
// Abrir = link assinado de 2 min. Em demanda/tarefa já espelhada, o anexo também vai para o ClickUp.
// Baixar (4.24.0): todo anexo tem o botão de download ao lado (lista, galeria e pré-visualização); baixa com o nome original.
// Com `galeria` (4.14.0, ficha do chamado): miniaturas mostrando o conteúdo e pré-visualização grande ao clicar.
import { useEffect, useRef, useState } from 'react';
import { abrirAnexo, baixarAnexo, enviarAnexo, exec, extensaoAnexo, urlAnexo, visualAnexo, type Anexo, type EntidadeAnexo } from '../api/execucao';
import { usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Popup } from './Popup';
import { useToast } from './Toasts';

const tamanho = (n: number | null) => (n == null ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** Links assinados dos anexos que têm pré-visualização (imagem, PDF e vídeo), por id. Falha de um não derruba os outros. */
function useUrls(itens: Anexo[], ligado: boolean) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const chave = itens.map(a => a.id).join(',');
  useEffect(() => {
    if (!ligado) return;
    let vivo = true;
    for (const a of itens) {
      if (visualAnexo(a) === 'outro') continue;
      urlAnexo(a.caminho).then(u => { if (vivo) setUrls(x => (x[a.id] ? x : { ...x, [a.id]: u })); }).catch(() => {});
    }
    return () => { vivo = false; };
  }, [chave, ligado]);  // eslint-disable-line react-hooks/exhaustive-deps
  return urls;
}

function Miniatura({ a, url }: { a: Anexo; url?: string }) {
  const v = visualAnexo(a);
  if (v === 'imagem' && url) return <img src={url} alt="" loading="lazy" />;
  if (v === 'video' && url) return <video src={url} muted preload="metadata" />;
  // o PDF aparece pela 1ª página; o quadro não recebe cliques (quem abre é o botão em volta)
  if (v === 'pdf' && url) return <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title="" tabIndex={-1} aria-hidden="true" loading="lazy" />;
  return <span className="anexo-ext">{extensaoAnexo(a.nome)}</span>;
}

function Previa({ itens, urls, indice, aoMudar, aoFechar }: { itens: Anexo[]; urls: Record<string, string>; indice: number; aoMudar: (i: number) => void; aoFechar: () => void }) {
  const avisar = useToast();
  const a = itens[indice], v = visualAnexo(a), url = urls[a.id];
  const ir = (d: number) => aoMudar((indice + d + itens.length) % itens.length);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') ir(-1); if (e.key === 'ArrowRight') ir(1); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  });
  return (
    <Popup aberto titulo={`${a.nome}${itens.length > 1 ? ` (${indice + 1} de ${itens.length})` : ''}`} aoFechar={aoFechar} largura={1100}
      rodape={<>
        {itens.length > 1 && <><Botao className="a-esquerda" onClick={() => ir(-1)}>← Anterior</Botao><Botao onClick={() => ir(1)}>Próximo →</Botao></>}
        <Botao onClick={() => baixarAnexo(a).catch(e => avisar((e as Error).message, 'erro'))}>⬇ Baixar</Botao>
        <Botao onClick={() => abrirAnexo(a.caminho).catch(e => avisar((e as Error).message, 'erro'))}>Abrir em outra aba</Botao>
        <Botao variante="primario" onClick={aoFechar}>Fechar</Botao></>}>
      <div className="anexo-previa" data-testid="anexo-previa">
        {!url && v !== 'outro' && <p className="ajuda"><span className="giro" /> Carregando…</p>}
        {v === 'imagem' && url && <img src={url} alt={a.nome} />}
        {v === 'video' && url && <video src={url} controls />}
        {v === 'pdf' && url && <iframe src={url} title={a.nome} />}
        {v === 'outro' && <p className="ajuda">Este tipo de arquivo não tem pré-visualização: use “Baixar” ou “Abrir em outra aba”.</p>}
      </div>
    </Popup>
  );
}

export function Anexos({ entidade, id, itens, aoMudar, galeria = false }: { entidade: EntidadeAnexo; id: string; itens: Anexo[]; aoMudar: () => void; galeria?: boolean }) {
  const { eu } = useSessao();
  const esc = eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const arquivo = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [previa, setPrevia] = useState<number | null>(null);
  const urls = useUrls(itens, galeria);
  const enviar = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setEnviando(true);
    for (const f of Array.from(lista)) {
      try { await enviarAnexo(esc, entidade, id, f); avisar(`${f.name} anexado`, 'ok'); }
      catch (e) { avisar((e as Error).message, 'erro'); }
    }
    setEnviando(false);
    if (arquivo.current) arquivo.current.value = '';
    aoMudar();
  };
  const remover = async (a: Anexo) => {
    if (!confirm(`Remover o anexo ${a.nome}?`)) return;
    try { await exec.anexoSalvar(esc, { id: a.id, excluir: true }); aoMudar(); } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  const botaoBaixar = (a: Anexo) => <button type="button" className="link anexo-baixar" aria-label={`Baixar ${a.nome}`} title="Baixar"
    onClick={() => baixarAnexo(a).catch(e => avisar((e as Error).message, 'erro'))}>⬇ Baixar</button>;
  const podeRemover = (a: Anexo) => (a.criado_por === eu!.usuario.id || pode('demanda.editar')) && pode('anexo.gravar');
  return (
    <section className="anexos" aria-label="Anexos">
      {itens.length === 0 && <p className="ajuda">Nenhum anexo.</p>}
      {galeria ? (
        <ul className="anexos-galeria">
          {itens.map((a, i) => (
            <li key={a.id}>
              <button type="button" className="anexo-mini" aria-label={`Ver ${a.nome}`} title={a.nome} onClick={() => setPrevia(i)}><Miniatura a={a} url={urls[a.id]} /></button>
              <span className="anexo-nome" title={a.nome}>{a.nome}</span>
              <small className="ajuda">{tamanho(a.tamanho)} {botaoBaixar(a)}
                {podeRemover(a) && <> <button type="button" className="link" aria-label={`Remover ${a.nome}`} onClick={() => remover(a)}>×</button></>}</small>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="lista-simples">
          {itens.map(a => (
            <li key={a.id}>
              <button type="button" className="link" onClick={() => abrirAnexo(a.caminho).catch(e => avisar((e as Error).message, 'erro'))}>📎 {a.nome}</button>
              <small className="ajuda"> {tamanho(a.tamanho)}</small>
              {botaoBaixar(a)}
              {podeRemover(a) && <button type="button" className="link" aria-label={`Remover ${a.nome}`} onClick={() => remover(a)}>×</button>}
            </li>
          ))}
        </ul>
      )}
      {pode('anexo.gravar') && <>
        <input ref={arquivo} type="file" multiple hidden onChange={e => enviar(e.target.files)} aria-label="Escolher arquivos" />
        <Botao carregando={enviando} onClick={() => arquivo.current?.click()}>+ Anexar</Botao>
      </>}
      {galeria && previa != null && itens[previa] && <Previa itens={itens} urls={urls} indice={previa} aoMudar={setPrevia} aoFechar={() => setPrevia(null)} />}
    </section>
  );
}
