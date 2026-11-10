// Cadastros › Organograma Sankhya (V13a-3, módulo 14 da Central BP-MS): nó "Sankhya" → grupos → cartões de área com
// pessoas (iniciais + nome, "ou …" para alternativas) e demandas resumidas; busca por pessoa, área, grupo ou demanda
// (a demanda achada fica em destaque); modo Editar para quem tem organograma.editar (Admin e GP), gravando no banco.
import { useMemo, useRef, useState } from 'react';
import { apiOrganograma, buscar, importarCentral, iniciais, LIMITES, lista, separarPessoa, validar,
  type AreaOrg, type GrupoOrg } from '../api/organograma';
import { Botao } from '../componentes/Botao';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useSessao } from '../estado/sessao';

export function Organograma() {
  const esc = useSessao().eu!.escritorio_id!;
  const c = useCarga(() => apiOrganograma.ler(esc), [esc]);
  const [texto, setTexto] = useState('');
  const [editando, setEditando] = useState(false);
  const org = c.dados;
  const res = useMemo(() => buscar(org?.grupos ?? [], texto), [org, texto]);
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <h1>Organograma Sankhya</h1>
        {org?.podeEditar && !editando && <Botao variante="primario" onClick={() => setEditando(true)}>Editar</Botao>}
      </header>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {org && editando && (
        <EditorOrganograma grupos={org.grupos} base={org.base} aoSair={gravou => { setEditando(false); if (gravou) void c.recarregar(); }} />
      )}
      {org && !editando && (<>
        <div className="barra-filtros">
          <input type="search" aria-label="Buscar no organograma" placeholder="Buscar pessoa, área, grupo ou demanda"
            value={texto} onChange={e => setTexto(e.target.value)} />
          {texto && <small className="ajuda">{res.total} área(s) encontrada(s)</small>}
        </div>
        {org.grupos.length === 0
          ? <div className="vazio-tela"><p>Nenhum grupo cadastrado ainda.{org.podeEditar ? ' Use Editar para incluir grupos e áreas, ou importe o JSON da Central.' : ''}</p></div>
          : (
            <div className="org">
              <div className="org-raiz" aria-hidden="true"><span>Sankhya</span></div>
              {res.grupos.length === 0 && <div className="vazio-tela"><p>Nada encontrado para “{texto}”.</p></div>}
              {res.grupos.map(g => (
                <section key={g.id ?? g.nome} className="org-grupo" aria-label={g.nome}>
                  <h2 className="org-grupo-nome">{g.nome} <small className="ajuda">{g.itens.length} área(s)</small></h2>
                  <div className="org-areas">
                    {g.itens.map(a => <CartaoArea key={a.id ?? a.area} a={a} achadas={a.demandasAchadas} />)}
                  </div>
                </section>
              ))}
            </div>
          )}
        {org.atualizadoEm && (
          <p className="ajuda">Última alteração: {new Date(org.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            {org.atualizadoPor ? ` por ${org.atualizadoPor}` : ''}</p>
        )}
      </>)}
    </div>
  );
}

function CartaoArea({ a, achadas }: { a: AreaOrg; achadas: string[] }) {
  return (
    <article className="cartao org-area" aria-label={a.area}>
      <h3>{a.area}</h3>
      {a.obs && <p className="ajuda">{a.obs}</p>}
      {a.pessoas.length > 0 && (
        <ul className="org-pessoas">
          {a.pessoas.map(p => {
            const s = separarPessoa(p);
            return (
              <li key={p}>
                <span className="org-avatar" aria-hidden="true">{iniciais(s.principal)}</span>
                <span><strong>{s.principal}</strong>{s.alternativas.length > 0 && <small className="ajuda"> ou {s.alternativas.join(' ou ')}</small>}</span>
              </li>
            );
          })}
        </ul>
      )}
      {a.demandas.length > 0 && (
        <ul className="org-demandas" aria-label={`Demandas de ${a.area}`}>
          {a.demandas.map(d => <li key={d} className={achadas.includes(d) ? 'achada' : undefined}>{d}</li>)}
        </ul>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- modo Editar
type AreaRasc = { chave: string; id?: string; area: string; pessoas: string; demandas: string; obs: string };
type GrupoRasc = { chave: string; id?: string; nome: string; itens: AreaRasc[] };
let seq = 0;
const chave = () => 'k' + ++seq;
const paraRascunho = (gs: GrupoOrg[]): GrupoRasc[] => gs.map(g => ({ chave: chave(), id: g.id, nome: g.nome,
  itens: g.itens.map(a => ({ chave: chave(), id: a.id, area: a.area, pessoas: a.pessoas.join('; '), demandas: a.demandas.join('; '), obs: a.obs })) }));
const doRascunho = (gs: GrupoRasc[]): GrupoOrg[] => gs.map(g => ({ ...(g.id ? { id: g.id } : {}), nome: g.nome.trim(),
  itens: g.itens.map(a => ({ ...(a.id ? { id: a.id } : {}), area: a.area.trim(), pessoas: lista(a.pessoas), demandas: lista(a.demandas), obs: a.obs.trim() })) }));
const areaVazia = (): AreaRasc => ({ chave: chave(), area: '', pessoas: '', demandas: '', obs: '' });

function EditorOrganograma({ grupos, base, aoSair }: { grupos: GrupoOrg[]; base: string; aoSair: (gravou: boolean) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [rasc, setRasc] = useState<GrupoRasc[]>(() => paraRascunho(grupos));
  const [erros, setErros] = useState<string[]>([]);
  const [gravando, setGravando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  const mudaGrupo = (k: string, f: (g: GrupoRasc) => GrupoRasc) => setRasc(r => r.map(g => (g.chave === k ? f(g) : g)));
  const mudaArea = (kg: string, ka: string, campo: keyof AreaRasc, v: string) =>
    mudaGrupo(kg, g => ({ ...g, itens: g.itens.map(a => (a.chave === ka ? { ...a, [campo]: v } : a)) }));
  const moverGrupo = (i: number, d: number) => setRasc(r => {
    const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  const importar = async (f: File | undefined) => {
    if (!f) return;
    try {
      const gs = importarCentral(await f.text());
      if (!confirm(`Trocar o rascunho pelos ${gs.length} grupo(s) do arquivo? Nada é gravado até você salvar.`)) return;
      setRasc(paraRascunho(gs)); setErros([]);
      avisar('Arquivo importado no rascunho; confira e salve', 'ok');
    } catch (e) { avisar((e as Error).message, 'erro'); }
    if (arquivo.current) arquivo.current.value = '';
  };

  const salvar = async () => {
    const gs = doRascunho(rasc);
    const e = validar(gs);
    setErros(e);
    if (e.length) return;
    const areas = gs.reduce((s, g) => s + g.itens.length, 0);
    if (!confirm(`Salvar o organograma com ${gs.length} grupo(s) e ${areas} área(s)? Grupos e áreas removidos somem para todos.`)) return;
    setGravando(true);
    try {
      await apiOrganograma.salvar(esc, gs, base);
      avisar('Organograma salvo', 'ok');
      aoSair(true);
    } catch (err) { avisar((err as Error).message, 'erro'); setGravando(false); }
  };

  return (
    <div className="org-editor">
      <p className="ajuda">Pessoas e demandas separadas por “;”. Pessoa com alternativa: “Fulano ou Beltrano”.
        Até {LIMITES.pessoas} pessoas e {LIMITES.demandas} demandas por área, {LIMITES.texto} letras por texto.</p>
      <div className="barra-filtros">
        <Botao onClick={() => setRasc(r => [...r, { chave: chave(), nome: '', itens: [areaVazia()] }])}>+ Grupo</Botao>
        <Botao variante="fantasma" onClick={() => arquivo.current?.click()}>Importar JSON da Central</Botao>
        <input ref={arquivo} type="file" accept=".json,application/json" hidden aria-label="Arquivo JSON do organograma"
          onChange={e => void importar(e.target.files?.[0])} />
      </div>
      {rasc.map((g, i) => (
        <fieldset key={g.chave} className="grupo org-grupo-edicao">
          <legend>Grupo {i + 1}</legend>
          <div className="org-grupo-topo">
            <input aria-label={`Nome do grupo ${i + 1}`} placeholder="Nome do grupo (ex.: PO de Produtos)" value={g.nome} maxLength={LIMITES.texto}
              onChange={e => mudaGrupo(g.chave, x => ({ ...x, nome: e.target.value }))} />
            <span className="linha-demanda-bts">
              <button type="button" className="link" aria-label={`Subir grupo ${i + 1}`} onClick={() => moverGrupo(i, -1)}>↑</button>
              <button type="button" className="link" aria-label={`Descer grupo ${i + 1}`} onClick={() => moverGrupo(i, 1)}>↓</button>
              <button type="button" className="link" aria-label={`Remover grupo ${i + 1}`}
                onClick={() => { if (!g.itens.some(a => a.area.trim()) || confirm(`Remover o grupo "${g.nome || i + 1}" e as ${g.itens.length} área(s)?`)) setRasc(r => r.filter(x => x.chave !== g.chave)); }}>×</button>
            </span>
          </div>
          {g.itens.map((a, j) => (
            <div key={a.chave} className="org-area-edicao">
              <input aria-label={`Área ${j + 1} do grupo ${i + 1}`} placeholder="Área / produto" value={a.area} maxLength={LIMITES.texto}
                onChange={e => mudaArea(g.chave, a.chave, 'area', e.target.value)} />
              <input aria-label={`Pessoas da área ${j + 1} do grupo ${i + 1}`} placeholder="Pessoas (;)" value={a.pessoas}
                onChange={e => mudaArea(g.chave, a.chave, 'pessoas', e.target.value)} />
              <input aria-label={`Demandas da área ${j + 1} do grupo ${i + 1}`} placeholder="Demandas (;)" value={a.demandas}
                onChange={e => mudaArea(g.chave, a.chave, 'demandas', e.target.value)} />
              <input aria-label={`Observação da área ${j + 1} do grupo ${i + 1}`} placeholder="Observação" value={a.obs} maxLength={LIMITES.texto}
                onChange={e => mudaArea(g.chave, a.chave, 'obs', e.target.value)} />
              <button type="button" className="link" aria-label={`Remover área ${j + 1} do grupo ${i + 1}`}
                onClick={() => mudaGrupo(g.chave, x => ({ ...x, itens: x.itens.filter(y => y.chave !== a.chave) }))}>×</button>
            </div>
          ))}
          <Botao variante="fantasma" onClick={() => mudaGrupo(g.chave, x => ({ ...x, itens: [...x.itens, areaVazia()] }))}>+ Área</Botao>
        </fieldset>
      ))}
      {erros.length > 0 && <ul className="msg-erro" role="alert">{erros.map(e => <li key={e}>{e}</li>)}</ul>}
      <div className="org-editor-rodape">
        <Botao onClick={() => aoSair(false)} disabled={gravando}>Cancelar</Botao>
        <Botao variante="primario" carregando={gravando} onClick={() => void salvar()}>Salvar</Botao>
      </div>
    </div>
  );
}
