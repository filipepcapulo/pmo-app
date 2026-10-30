// Anexos de projeto/demanda/tarefa: o arquivo sobe ao Storage (pasta do escritório) e o registro vai pela API.
// Abrir = link assinado de 2 min. Em demanda/tarefa já espelhada, o anexo também vai para o ClickUp.
import { useRef, useState } from 'react';
import { abrirAnexo, enviarAnexo, exec, type Anexo, type EntidadeComentavel } from '../api/execucao';
import { usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { useToast } from './Toasts';

const tamanho = (n: number | null) => (n == null ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export function Anexos({ entidade, id, itens, aoMudar }: { entidade: EntidadeComentavel; id: string; itens: Anexo[]; aoMudar: () => void }) {
  const { eu } = useSessao();
  const esc = eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const arquivo = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
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
  return (
    <section className="anexos" aria-label="Anexos">
      {itens.length === 0 && <p className="ajuda">Nenhum anexo.</p>}
      <ul className="lista-simples">
        {itens.map(a => (
          <li key={a.id}>
            <button type="button" className="link" onClick={() => abrirAnexo(a.caminho).catch(e => avisar((e as Error).message, 'erro'))}>📎 {a.nome}</button>
            <small className="ajuda"> {tamanho(a.tamanho)}</small>
            {(a.criado_por === eu!.usuario.id || pode('demanda.editar')) && pode('anexo.gravar') &&
              <button type="button" className="link" aria-label={`Remover ${a.nome}`} onClick={() => remover(a)}>×</button>}
          </li>
        ))}
      </ul>
      {pode('anexo.gravar') && <>
        <input ref={arquivo} type="file" multiple hidden onChange={e => enviar(e.target.files)} aria-label="Escolher arquivos" />
        <Botao carregando={enviando} onClick={() => arquivo.current?.click()}>+ Anexar</Botao>
      </>}
    </section>
  );
}
