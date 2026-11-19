// Edição múltipla (4.23.0): em Demandas e na aba Demandas do projeto, passar o mouse na linha (demanda, subdemanda ou
// tarefa) mostra a caixa de seleção no lugar do sinal do status; marcada a primeira, todas aparecem. Com algo marcado, a barra fixa no rodapé troca Status, Etapa e/ou
// Responsável de todos de uma vez. Cada item é gravado pela mesma função do formulário (as permissões e travas do banco
// valem igual); o que falhar fica marcado, com o motivo. A regra está em estado/edicaoMultipla.ts.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { etapasApi } from '../api/etapas';
import { exec } from '../api/execucao';
import { useEdicao } from '../estado/edicao';
import { chaveItem, opcoesStatusLote, planoLote, resumoSelecao, SEM_CAMPOS, type CamposLote, type ItemLote } from '../estado/edicaoMultipla';
import { useEquipe, usePode } from '../estado/equipe';
import { useEtapas } from '../estado/etapas';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Icone } from './Icone';
import { useToast } from './Toasts';

interface Selecao {
  ativa: boolean;
  alternarModo: () => void;
  tem: (i: Pick<ItemLote, 'tipo' | 'id'>) => boolean;
  /** Marca ou desmarca os itens (um ou vários). */
  marcar: (itens: ItemLote[], sim: boolean) => void;
  total: number;
  limpar: () => void;
}
const Ctx = createContext<Selecao | null>(null);
/** Seleção da tela (null fora de uma tela com edição múltipla). */
export const useSelecao = () => useContext(Ctx);

interface Falha { nome: string; motivo: string }

/** Envolve a lista. `chave` muda quando os filtros mudam: a seleção recomeça, para nunca alterar o que saiu da tela. */
export function EdicaoMultipla({ chave, children }: { chave: string; children: ReactNode }) {
  const esc = useSessao().eu?.escritorio_id ?? '';
  const ed = useEdicao();
  const et = useEtapas();
  const { lista: equipe } = useEquipe();
  const avisar = useToast();
  const [ativa, setAtiva] = useState(false);
  const [sel, setSel] = useState<Map<string, ItemLote>>(new Map());
  const [campos, setCampos] = useState<CamposLote>(SEM_CAMPOS);
  const [andamento, setAndamento] = useState<{ feito: number; de: number } | null>(null);
  const [falhas, setFalhas] = useState<Falha[]>([]);
  const limpar = useCallback(() => { setSel(new Map()); setFalhas([]); }, []);
  useEffect(() => { limpar(); }, [chave, limpar]);
  const marcar = useCallback((itens: ItemLote[], sim: boolean) => setSel(m => {
    const n = new Map(m);
    for (const i of itens) { if (sim) n.set(chaveItem(i), i); else n.delete(chaveItem(i)); }
    return n;
  }), []);
  const valor = useMemo<Selecao>(() => ({
    ativa, total: sel.size, marcar, limpar,
    alternarModo: () => { setAtiva(a => !a); setSel(new Map()); setFalhas([]); setCampos(SEM_CAMPOS); },
    tem: i => sel.has(chaveItem(i)),
  }), [ativa, sel, marcar, limpar]);

  const itens = useMemo(() => [...sel.values()], [sel]);
  const temDemanda = itens.some(i => i.tipo === 'demanda'), temTarefa = itens.some(i => i.tipo === 'tarefa');
  const opsStatus = opcoesStatusLote(temDemanda, temTarefa);
  // o status escolhido deixa de valer quando a seleção passa a misturar níveis que não o têm
  const status = opsStatus.some(o => o.valor === campos.status) ? campos.status : '';
  const escolha = { ...campos, status };
  const nadaEscolhido = !escolha.status && !escolha.etapa && !escolha.responsavel;

  const aplicar = async () => {
    const { gravar, iguais } = planoLote(itens, escolha);
    setFalhas([]);
    if (!gravar.length) { avisar('Os itens marcados já estão com esses valores.', 'info'); return; }
    const erros: Falha[] = [], ficam = new Map<string, ItemLote>(), concluidas = new Set<string>();
    let feitos = 0;
    setAndamento({ feito: 0, de: gravar.length });
    for (const g of gravar) {
      try {
        if (g.dados) {
          if (g.item.tipo === 'demanda') await exec.demandaSalvarV4(esc, { id: g.item.id, ...g.dados });
          else await exec.tarefasSalvar(esc, { id: g.item.id, ...g.dados });
        }
        if (g.etapaTarefa) await etapasApi.definir(esc, 'tarefa', g.item.id, g.etapaTarefa);
        feitos++;
        if (g.concluiu && g.item.tipo === 'tarefa' && g.item.demanda_id) concluidas.add(g.item.demanda_id);
      } catch (e) {
        erros.push({ nome: g.item.nome, motivo: (e as Error).message });
        ficam.set(chaveItem(g.item), g.item);
      }
      setAndamento({ feito: feitos + erros.length, de: gravar.length });
    }
    setAndamento(null);
    setSel(ficam);
    setFalhas(erros);
    if (feitos) {
      avisar(`${feitos} ${feitos === 1 ? 'item alterado' : 'itens alterados'}${iguais ? ` · ${iguais} já estava${iguais === 1 ? '' : 'm'} assim` : ''}`, 'ok');
      ed.mudou();
      // como no formulário: tarefa de chamado concluída → o app pergunta se o chamado terminou (uma pergunta por vez)
      if (concluidas.size === 1) ed.tarefaConcluida([...concluidas][0]);
    }
    if (erros.length) avisar(`${erros.length} ${erros.length === 1 ? 'item não foi alterado' : 'itens não foram alterados'}: veja o motivo na barra.`, 'erro');
    else setCampos(SEM_CAMPOS);
  };

  const pessoas = equipe.filter(m => m.ativo);
  return (
    <Ctx.Provider value={valor}>
      {children}
      {sel.size > 0 && (
        <>
          <div className="lote-espaco" aria-hidden />
          <div className="lote-barra" role="region" aria-label="Edição múltipla" data-testid="lote-barra">
            {falhas.length > 0 && (
              <ul className="lote-falhas" role="alert">
                {falhas.map((f, i) => <li key={i}><strong>{f.nome}</strong>: {f.motivo}</li>)}
              </ul>
            )}
            <div className="lote-linha">
              <strong className="lote-n" data-testid="lote-n">{resumoSelecao(itens)}</strong>
              <select aria-label="Novo status" value={status} disabled={!!andamento} onChange={e => setCampos({ ...campos, status: e.target.value })}>
                <option value="">Status: manter</option>
                {opsStatus.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
              </select>
              <select aria-label="Nova etapa" value={campos.etapa} disabled={!!andamento} onChange={e => setCampos({ ...campos, etapa: e.target.value })}>
                <option value="">Etapa: manter</option>
                {et.lista.filter(e => e.ativo).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <select aria-label="Novo responsável" value={campos.responsavel} disabled={!!andamento} onChange={e => setCampos({ ...campos, responsavel: e.target.value })}>
                <option value="">Responsável: manter</option>
                {pessoas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
              <Botao variante="primario" disabled={nadaEscolhido} carregando={!!andamento} onClick={aplicar}>
                {andamento ? `Gravando ${andamento.feito}/${andamento.de}…` : `Aplicar em ${sel.size}`}
              </Botao>
              <button type="button" className="link" disabled={!!andamento} onClick={limpar}>Limpar seleção</button>
            </div>
            {temDemanda && temTarefa && <small className="ajuda">Demandas e tarefas marcadas juntas: o Status mostra só os que existem nos dois.</small>}
          </div>
        </>
      )}
    </Ctx.Provider>
  );
}

/** Ações acima da lista. No computador a caixa aparece ao passar o mouse na linha, então aqui só entra o "Selecionar tudo"
 *  depois da primeira marcada; em tela de toque (sem mouse) o botão "Selecionar" mostra as caixas. Some para quem não pode editar. */
export function AcoesEdicaoMultipla({ todos }: { todos: ItemLote[] }) {
  const s = useSelecao();
  const pode = usePode();
  if (!s || !(pode('demanda.editar') || pode('tarefa.editar'))) return null;
  const marcaveis = pode('demanda.editar') ? todos : todos.filter(i => i.tipo !== 'demanda');
  const tudo = marcaveis.length > 0 && marcaveis.every(i => s.tem(i));
  const visivel = s.ativa || s.total > 0;
  return (
    <>
      <button type="button" className="link lote-so-toque" aria-pressed={s.ativa} data-testid="lote-modo" onClick={s.alternarModo}
        title="Marque várias demandas, subdemandas ou tarefas e troque Status, Etapa ou Responsável de todas de uma vez">
        <Icone nome={s.ativa ? 'x' : 'lista'} tam={14} /> {s.ativa ? 'Cancelar seleção' : 'Selecionar'}
      </button>
      {visivel && marcaveis.length > 0 && (
        <button type="button" className="link" data-testid="lote-todos" onClick={() => s.marcar(marcaveis, !tudo)}>
          {tudo ? 'Desmarcar tudo' : `Selecionar tudo (${marcaveis.length})`}
        </button>
      )}
    </>
  );
}

/** Caixa de seleção da linha: escondida até passar o mouse (ou focar); com a primeira marcada, todas ficam à mostra. */
export function CaixaLote({ item, travada }: { item: ItemLote; travada?: string | null }) {
  const s = useSelecao();
  if (!s) return null;
  return (
    <label className={`lote-rotulo${s.ativa || s.total > 0 ? ' lote-vis' : ''}`} title={travada ?? 'Selecionar para editar vários de uma vez'}
      onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
      <input type="checkbox" className="lote-caixa" checked={s.tem(item)} disabled={!!travada}
        aria-label={`Selecionar ${item.tipo === 'tarefa' ? 'a tarefa' : 'a demanda'} ${item.nome}`}
        onChange={e => s.marcar([item], e.target.checked)} />
    </label>
  );
}
