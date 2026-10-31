// Grade da equipe (escopo §4): consultores × dias, rolagem infinita (busca uma semana ao chegar perto da borda), abre em
// hoje, ausências bloqueiam a célula. Arrastar a tarefa move; arrastar do backlog pede a alocação. Sem mouse (celular):
// "Selecionar" + tocar na tarefa/backlog e "Mover para…"/tocar na célula.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { equipe, ausenciaEm, diasEntre, fimDeSemana, itensMover, janelaInicial, rotuloAusencia, type Ausencia, type TarefaGrade } from '../api/equipe';
import { hojeIso, somarDias } from '../api/projeto';
import { rotuloPeriodo } from '../api/execucao';
import { useEdicao } from '../estado/edicao';
import { useEquipe, usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { dataCurta } from './FormComum';
import { NomePessoa } from './NomePessoa';
import { useToast } from './Toasts';

const COL = 150;       // largura do dia (igual à grade aberta do 2.x)
const BORDA = 240;     // a esta distância da borda busca mais uma semana
const CAPACIDADE = 8;  // horas/dia: acima disso a célula avisa
const JANELA = 91;     // dias por chamada ao recarregar (a API aceita 93)

export interface Soltar { data: string; consultor: string }
export function GradeEquipe({ soDev, backlogMarcado, aoSoltarBacklog, aoEditarAusencia, geracaoExtra = 0 }: {
  soDev?: boolean; backlogMarcado: boolean; aoSoltarBacklog: (s: Soltar) => void; aoEditarAusencia: (a: Partial<Ausencia>) => void; geracaoExtra?: number;
}) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const ed = useEdicao();
  const { lista } = useEquipe();
  const hoje = hojeIso();
  const [faixa, setFaixa] = useState(janelaInicial);
  const [filtro, setFiltro] = useState<{ de: string; ate: string } | null>(null);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [texto, setTexto] = useState('');
  const [tarefas, setTarefas] = useState<TarefaGrade[]>([]);
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionando, setSelecionando] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [destino, setDestino] = useState({ data: '', consultor: '' });
  const [carregando, setCarregando] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const buscando = useRef(false);
  const ajuste = useRef(0);      // colunas acrescentadas à esquerda: compensa a rolagem
  const irHoje = useRef(true);
  const arrastada = useRef<string | null>(null);

  const dias = useMemo(() => diasEntre(faixa.de, faixa.ate), [faixa]);
  const pessoas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    const comTarefa = new Set(tarefas.map(x => x.consultor_id));
    return lista.filter(m => (m.ativo || comTarefa.has(m.id))
      && (soDev ? m.papeis.includes('desenvolvedor') : m.papeis.some(p => p === 'consultor' || p === 'desenvolvedor') || comTarefa.has(m.id))
      && (!t || m.nome.toLowerCase().includes(t))).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [lista, tarefas, texto, soDev]);

  const juntar = useCallback((g: { tarefas: TarefaGrade[]; ausencias: Ausencia[] }, deData: string, ateData: string) => {
    setTarefas(l => [...l.filter(t => t.data < deData || t.data > ateData), ...g.tarefas]);
    const chave = (a: Ausencia) => [a.id, a.consultor_id, a.de, a.ate].join('|');
    setAusencias(l => { const m = new Map(l.map(a => [chave(a), a])); g.ausencias.forEach(a => m.set(chave(a), a)); return [...m.values()]; });
  }, []);

  // recarrega tudo o que está na tela (abertura, gravação em qualquer tela), em janelas que a API aceita
  useEffect(() => {
    let vivo = true;
    (async () => {
      setCarregando(true);
      try {
        const partes: Promise<{ tarefas: TarefaGrade[]; ausencias: Ausencia[] }>[] = [];
        for (let d = faixa.de; d <= faixa.ate; d = somarDias(d, JANELA)) {
          const f = somarDias(d, JANELA - 1);
          partes.push(equipe.grade(esc, d, f > faixa.ate ? faixa.ate : f));
        }
        const r = await Promise.all(partes);
        if (!vivo) return;
        setTarefas(r.flatMap(x => x.tarefas));
        setAusencias(r.flatMap(x => x.ausencias));
        setErro(null);
      } catch (e) { if (vivo) setErro((e as Error).message); }
      if (vivo) setCarregando(false);
    })();
    return () => { vivo = false; };
    // a faixa cresce pela rolagem sem recarregar o resto; só o filtro e as gravações recarregam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esc, ed.geracao, geracaoExtra, filtro]);

  const maisUmaSemana = useCallback(async (lado: 'antes' | 'depois') => {
    if (buscando.current || filtro) return;
    buscando.current = true;
    const ini = lado === 'antes' ? somarDias(faixa.de, -7) : somarDias(faixa.ate, 1);
    const fim = somarDias(ini, 6);
    try {
      juntar(await equipe.grade(esc, ini, fim), ini, fim);
      if (lado === 'antes') ajuste.current = 7 * COL;
      setFaixa(f => (lado === 'antes' ? { ...f, de: ini } : { ...f, ate: fim }));
    } catch (e) { setErro((e as Error).message); }
    buscando.current = false;
  }, [esc, faixa, filtro, juntar]);

  // a coluna nova à esquerda não pode empurrar o que a pessoa está vendo
  useLayoutEffect(() => {
    const c = caixa.current;
    if (!c) return;
    if (ajuste.current) { c.scrollLeft += ajuste.current; ajuste.current = 0; }
  }, [faixa]);
  const faixaAtual = useRef(faixa);
  faixaAtual.current = faixa;
  // as colunas têm largura fixa: a posição sai da conta, sem depender do layout do momento
  const posicionarHoje = useCallback(() => {
    const c = caixa.current, i = diasEntre(faixaAtual.current.de, hojeIso()).length - 1;
    if (c && i >= 0) c.scrollLeft = i * COL;
  }, []);
  useLayoutEffect(() => { if (irHoje.current && pessoas.length) { irHoje.current = false; posicionarHoje(); } }, [pessoas.length, posicionarHoje]);

  const aoRolar = () => {
    const c = caixa.current;
    if (!c) return;
    if (c.scrollLeft < BORDA) maisUmaSemana('antes');
    else if (c.scrollLeft + c.clientWidth > c.scrollWidth - BORDA) maisUmaSemana('depois');
  };

  const voltarHoje = () => {
    setFiltro(null); setDe(''); setAte('');
    const j = janelaInicial();
    if (filtro || j.de < faixa.de || j.ate > faixa.ate) { setFaixa(j); irHoje.current = true; setTimeout(posicionarHoje, 0); } else posicionarHoje();
  };
  const aplicarFiltro = () => {
    if (!de || !ate || ate < de) { setErro('Informe o intervalo (o fim não pode ser antes do início).'); return; }
    if (diasEntre(de, ate).length > 93) { setErro('Filtre até 93 dias; para ver mais, use a rolagem.'); return; }
    setErro(null); setFaixa({ de, ate }); setFiltro({ de, ate });
  };

  const moverPara = async (base: TarefaGrade, data: string, consultor: string) => {
    const grupo = sel.has(base.id) ? tarefas.filter(t => sel.has(t.id)) : [base];
    const itens = itensMover(grupo, base, data, consultor);
    if (!itens.length) return;
    const bloqueada = itens.map(i => ausenciaEm(ausencias, i.responsavel_id, i.data)).find(Boolean);
    if (bloqueada) { avisar(`${rotuloAusencia(bloqueada.tipo)} nesse dia: tarefa não movida.`, 'erro'); return; }
    try {
      await equipe.mover(esc, itens);
      setSel(new Set());
      avisar(itens.length > 1 ? `${itens.length} tarefas movidas.` : 'Tarefa movida.', 'ok');
    } catch (e) { avisar((e as Error).message, 'erro'); }
    ed.mudou();
  };
  const aplicarMassa = () => {
    const grupo = tarefas.filter(t => sel.has(t.id));
    if (!grupo.length || (!destino.data && !destino.consultor)) return;
    const base = grupo[0];
    moverPara(base, destino.data || base.data, destino.consultor || base.consultor_id);
  };

  const soltar = (ev: React.DragEvent, data: string, consultor: string) => {
    ev.preventDefault();
    ev.currentTarget.classList.remove('alvo');
    const id = arrastada.current;
    arrastada.current = null;
    if (id) { const t = tarefas.find(x => x.id === id); if (t) moverPara(t, data, consultor); return; }
    aoSoltarBacklog({ data, consultor });
  };
  const alternar = (id: string) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const porCelula = useMemo(() => {
    const m = new Map<string, TarefaGrade[]>();
    for (const t of tarefas) { const k = t.consultor_id + t.data; m.set(k, [...(m.get(k) ?? []), t]); }
    return m;
  }, [tarefas]);
  const podeMover = pode('tarefa.editar');
  const podeCriar = pode('tarefa.criar');

  return (
    <section className="eq-grade-caixa" aria-label="Grade da equipe">
      <div className="barra-filtros">
        <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Consultor…" aria-label="Filtrar consultor" />
        <input type="date" value={de} onChange={e => setDe(e.target.value)} aria-label="De" />
        <input type="date" value={ate} onChange={e => setAte(e.target.value)} aria-label="Até" />
        <Botao onClick={aplicarFiltro}>Filtrar</Botao>
        <Botao onClick={voltarHoje}>Hoje</Botao>
        {podeMover && <Botao aria-pressed={selecionando} onClick={() => { setSelecionando(!selecionando); setSel(new Set()); }}>{selecionando ? 'Concluir seleção' : 'Selecionar'}</Botao>}
        {pode('equipe.editar') && <Botao onClick={() => aoEditarAusencia({})}>+ Ausência</Botao>}
        {carregando && <span className="giro" aria-label="Carregando" />}
      </div>
      {sel.size > 0 && (
        <div className="eq-massa" role="region" aria-label="Tarefas selecionadas">
          <strong>{sel.size} selecionada(s)</strong>
          <label>Mover para <input type="date" value={destino.data} onChange={e => setDestino({ ...destino, data: e.target.value })} aria-label="Nova data" /></label>
          <select value={destino.consultor} onChange={e => setDestino({ ...destino, consultor: e.target.value })} aria-label="Novo consultor">
            <option value="">Mesmo consultor</option>
            {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <Botao variante="primario" onClick={aplicarMassa}>Mover</Botao>
          <button type="button" className="link" onClick={() => setSel(new Set())}>Limpar</button>
        </div>
      )}
      {erro && <p className="msg-erro">{erro}</p>}
      <div className="eq-rolagem" ref={caixa} onScroll={aoRolar} data-testid="grade-rolagem">
        <table className="eq-grade" style={{ width: 170 + dias.length * COL }}>
          <thead>
            <tr>
              <th className="col-nome">Consultor</th>
              {dias.map(d => <th key={d} data-dia={d} className={`dia${d === hoje ? ' hoje' : ''}${fimDeSemana(d) ? ' fds' : ''}`}><span>{dataCurta(d)}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {pessoas.map(p => (
              <tr key={p.id}>
                <th scope="row" className="col-nome"><NomePessoa id={p.id} comAvatar /></th>
                {dias.map(d => {
                  const lista = porCelula.get(p.id + d) ?? [];
                  const aus = ausenciaEm(ausencias, p.id, d);
                  const horas = lista.reduce((s, t) => s + Number(t.horas_previstas ?? 0), 0);
                  return (
                    <td key={d} data-consultor={p.id} data-dia={d}
                      className={`cel${fimDeSemana(d) ? ' fds' : ''}${aus ? ' ausente' : ''}${horas > CAPACIDADE ? ' sobrecarga' : ''}`}
                      onDragOver={aus ? undefined : e => { e.preventDefault(); e.currentTarget.classList.add('alvo'); }}
                      onDragLeave={e => e.currentTarget.classList.remove('alvo')}
                      onDrop={aus ? undefined : e => soltar(e, d, p.id)}>
                      {aus && (
                        <button type="button" className="eq-ausencia" disabled={aus.origem === 'clickup' || !pode('equipe.editar')}
                          title={aus.motivo ?? undefined} onClick={() => aoEditarAusencia(aus)}>{rotuloAusencia(aus.tipo)}</button>
                      )}
                      {lista.map(t => (
                        <button key={t.id} type="button" draggable={podeMover} data-tarefa={t.id}
                          className={`eq-tarefa st-${t.status}${sel.has(t.id) ? ' marcada' : ''}`} aria-pressed={sel.has(t.id)}
                          title={`${t.cliente} · ${t.projeto} · ${t.demanda}`}
                          onDragStart={e => { arrastada.current = t.id; e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragEnd={() => { arrastada.current = null; }}
                          onClick={e => { if (selecionando || e.ctrlKey || e.metaKey) alternar(t.id); else ed.tarefa({ id: t.id }); }}>
                          <b>{t.cliente}</b><span>{t.nome}</span><small>{rotuloPeriodo(t.periodo, t.hora_ini, t.hora_fim).replace(/ \(.*/, '')}</small>
                        </button>
                      ))}
                      {!aus && podeCriar && (
                        <button type="button" className={`eq-mais${backlogMarcado ? ' visivel' : ''}`} aria-label={`Agendar ${p.nome} em ${dataCurta(d)}`}
                          onClick={() => (backlogMarcado ? aoSoltarBacklog({ data: d, consultor: p.id }) : ed.tarefa({ data: d, responsaveis: [p.id] }))}>+</button>
                      )}
                      {horas > CAPACIDADE && <small className="eq-horas">{horas} h</small>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pessoas.length === 0 && !carregando && <p className="ajuda">{soDev ? 'Marque o papel Desenvolvedor em Equipe para aparecer aqui.' : 'Ninguém com esse filtro.'}</p>}
    </section>
  );
}
