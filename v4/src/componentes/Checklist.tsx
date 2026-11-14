// Checklist de demanda/subdemanda ou tarefa. Quem edita a entidade cria/renomeia/exclui itens; o responsável da
// tarefa também marca/desmarca "feito" nos itens dela (o banco confere).
import { useState } from 'react';
import { exec, type ItemChecklist } from '../api/execucao';
import { usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { useToast } from './Toasts';

export function Checklist({ entidade, id, itens, souResponsavel, aoMudar }: {
  entidade: 'demanda' | 'tarefa'; id: string; itens: ItemChecklist[]; souResponsavel?: boolean; aoMudar: () => void;
}) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const [novo, setNovo] = useState('');
  const editar = pode(entidade === 'demanda' ? 'demanda.editar' : 'tarefa.editar');
  const marcar = editar || !!souResponsavel;
  const gravar = async (d: Record<string, unknown>) => {
    try { await exec.checklistSalvar(esc, d); aoMudar(); } catch (e) { avisar((e as Error).message, 'erro'); }
  };
  const feitos = itens.filter(i => i.feito).length;
  return (
    <section className="checklist" aria-label="Checklist">
      {itens.length > 0 && <p className="ajuda">{feitos} de {itens.length} feitos</p>}
      <ul>
        {itens.map(i => (
          <li key={i.id} className={i.feito ? 'feito' : undefined}>
            <label className="check">
              <input type="checkbox" checked={i.feito} disabled={!marcar} onChange={e => gravar({ id: i.id, versao: i.versao, feito: e.target.checked })} />
              <span>{i.texto}</span>
            </label>
            {editar && <button type="button" className="link" aria-label={`Excluir ${i.texto}`}
              onClick={() => gravar({ id: i.id, versao: i.versao, excluir: true })}>×</button>}
          </li>
        ))}
      </ul>
      {editar && (
        <form className="linha" onSubmit={e => { e.preventDefault(); if (novo.trim()) { gravar({ entidade, entidade_id: id, texto: novo.trim() }); setNovo(''); } }}>
          <input value={novo} onChange={e => setNovo(e.target.value)} placeholder="Novo item…" aria-label="Novo item do checklist" maxLength={500} />
          <Botao type="submit" disabled={!novo.trim()}>Adicionar</Botao>
        </form>
      )}
      {!editar && itens.length === 0 && <p className="ajuda">Sem checklist.</p>}
    </section>
  );
}
