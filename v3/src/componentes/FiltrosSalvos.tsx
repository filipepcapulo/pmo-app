// Filtros salvos de uma tela (api.v1_filtros / v1_filtro_salvar): escolher, salvar o atual, marcar padrão, excluir.
// O padrão da tela é aplicado ao abrir.
import { useCallback, useEffect, useRef, useState } from 'react';
import { novaOperacao, rpc, type FiltroSalvo } from '../api/cliente';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo } from './Campo';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export function FiltrosSalvos({ tela, atuais, aoAplicar }: {
  tela: string; atuais: Record<string, unknown>; aoAplicar: (f: Record<string, unknown>) => void;
}) {
  const { eu } = useSessao();
  const esc = eu?.escritorio_id;
  const avisar = useToast();
  const [lista, setLista] = useState<FiltroSalvo[]>([]);
  const [sel, setSel] = useState('');
  const [popup, setPopup] = useState(false);
  const [nome, setNome] = useState('');
  const [padrao, setPadrao] = useState(false);
  const [gravando, setGravando] = useState(false);
  const aplicouPadrao = useRef(false);
  const aplicar = useRef(aoAplicar);
  aplicar.current = aoAplicar;

  const carregar = useCallback(async () => {
    if (!esc) return;
    try {
      const l = await rpc<FiltroSalvo[]>('v1_filtros', { p_escritorio: esc, p_tela: tela });
      setLista(l);
      const p = l.find(f => f.padrao);
      if (p && !aplicouPadrao.current) { aplicouPadrao.current = true; setSel(p.id); aplicar.current(p.filtros); }
    } catch (e) { avisar((e as Error).message, 'erro'); }
  }, [esc, tela, avisar]);
  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!nome.trim()) return;
    setGravando(true);
    try {
      const r = await rpc<FiltroSalvo>('v1_filtro_salvar', {
        p_escritorio: esc, p_dados: { tela, nome: nome.trim(), filtros: atuais, padrao }, p_id_operacao: novaOperacao(),
      });
      setPopup(false); setSel(r.id); avisar('Filtro salvo', 'ok'); await carregar();
    } catch (e) { avisar((e as Error).message, 'erro'); } finally { setGravando(false); }
  };
  const excluir = async () => {
    if (!sel) return;
    try {
      await rpc('v1_filtro_salvar', { p_escritorio: esc, p_dados: { id: sel, excluir: true }, p_id_operacao: novaOperacao() });
      setSel(''); avisar('Filtro excluído', 'ok'); await carregar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
  };

  return (
    <div className="filtros-salvos">
      <select aria-label="Filtros salvos" value={sel} onChange={e => {
        setSel(e.target.value);
        const f = lista.find(x => x.id === e.target.value);
        aoAplicar(f ? f.filtros : {});
      }}>
        <option value="">Filtros salvos…</option>
        {lista.map(f => <option key={f.id} value={f.id}>{f.padrao ? '★ ' : ''}{f.nome}</option>)}
      </select>
      <Botao variante="fantasma" onClick={() => { setNome(lista.find(f => f.id === sel)?.nome ?? ''); setPadrao(false); setPopup(true); }}>Salvar filtro</Botao>
      {sel && <Botao variante="fantasma" onClick={excluir} aria-label="Excluir filtro">Excluir</Botao>}
      <Popup aberto={popup} titulo="Salvar filtro" aoFechar={() => setPopup(false)}
        rodape={<><Botao onClick={() => setPopup(false)}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={salvar} disabled={!nome.trim()}>Salvar</Botao></>}>
        <Campo rotulo="Nome do filtro" valor={nome} aoMudar={setNome} obrigatorio maxLength={60} ajuda="Mesmo nome substitui o filtro salvo." />
        <label className="check"><input type="checkbox" checked={padrao} onChange={e => setPadrao(e.target.checked)} /> Abrir a tela com este filtro</label>
      </Popup>
    </div>
  );
}
