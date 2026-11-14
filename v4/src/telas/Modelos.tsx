// Modelos de projeto: demandas padrão (nome, etapa, horas) que um projeto novo recebe ao escolher o modelo.
import { useEffect, useState } from 'react';
import { api, FASES, horas, type Modelo, type ModeloDemanda } from '../api/cadastros';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';

export function Modelos() {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const [inativos, setInativos] = useState(false);
  const [aberto, setAberto] = useState<Partial<Modelo> | null>(null);
  const c = useCarga(() => api.modelos(esc, inativos), [esc, inativos]);
  const editar = pode('modelo.editar');
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <h1>Modelos de projeto</h1>
        {editar && <Botao variante="primario" onClick={() => setAberto({ nome: '', fase: 'P1', ativo: true, demandas: [] })}>+ Novo modelo</Botao>}
      </header>
      <label className="check"><input type="checkbox" checked={inativos} onChange={e => setInativos(e.target.checked)} /> Mostrar inativos</label>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {c.dados && c.dados.length === 0 && <div className="vazio-tela"><p>Nenhum modelo ainda. Um modelo cria as demandas padrão ao abrir um projeto.</p></div>}
      <div className="grade-cartoes">
        {(c.dados ?? []).map(m => (
          <article key={m.id} className="cartao">
            <div className="pagina-topo">
              <h2>{m.nome} {m.fase && <span className="pilula">{m.fase}</span>} {!m.ativo && <span className="pilula pilula-neutra">Inativo</span>}</h2>
              {editar && <Botao variante="fantasma" onClick={() => setAberto(m)}>Editar</Botao>}
            </div>
            {m.descricao && <p className="ajuda">{m.descricao}</p>}
            <ol className="lista-simples">
              {m.demandas.map(d => <li key={d.id ?? d.nome}>{d.nome}{d.etapa && <small className="ajuda"> · {d.etapa}</small>}
                {d.horas_previstas != null && <small className="ajuda"> · {horas(d.horas_previstas)}</small>}</li>)}
            </ol>
            <small className="ajuda">{m.demandas.length} demanda(s) · {horas(m.demandas.reduce((s, d) => s + Number(d.horas_previstas ?? 0), 0))}</small>
          </article>
        ))}
      </div>
      <ModeloPopup modelo={aberto} aoFechar={() => setAberto(null)} aoGravar={() => { setAberto(null); c.recarregar(); }} />
    </div>
  );
}

type Linha = { nome: string; etapa: string; horas: string };

function ModeloPopup({ modelo, aoFechar, aoGravar }: { modelo: Partial<Modelo> | null; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [f, setF] = useState({ nome: '', fase: '', descricao: '', ativo: true });
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => {
    if (!modelo) return;
    setF({ nome: modelo.nome ?? '', fase: modelo.fase ?? '', descricao: modelo.descricao ?? '', ativo: modelo.ativo ?? true });
    setLinhas((modelo.demandas ?? []).map(d => ({ nome: d.nome, etapa: d.etapa ?? '', horas: d.horas_previstas != null ? String(d.horas_previstas) : '' })));
    setErro(null);
  }, [modelo]);
  const muda = (i: number, k: keyof Linha, v: string) => setLinhas(l => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const mover = (i: number, d: number) => setLinhas(l => {
    const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const enviar = async () => {
    if (!f.nome.trim()) { setErro('Informe o nome do modelo.'); return; }
    const dem: ModeloDemanda[] = linhas.filter(l => l.nome.trim()).map(l => ({
      nome: l.nome.trim(), etapa: l.etapa.trim() || null, horas_previstas: l.horas ? Number(l.horas) : null, modulo_id: null }));
    if (dem.some(d => d.horas_previstas != null && !(d.horas_previstas >= 0))) { setErro('Horas inválidas.'); return; }
    setGravando(true);
    try {
      await api.modeloSalvar(esc, { ...(modelo?.id ? { id: modelo.id, versao: modelo.versao } : {}),
        nome: f.nome.trim(), fase: f.fase || null, descricao: f.descricao.trim() || null, ativo: f.ativo, demandas: dem });
      avisar('Modelo gravado', 'ok');
      aoGravar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <Popup aberto={!!modelo} titulo={modelo?.id ? 'Editar modelo' : 'Novo modelo de projeto'} aoFechar={aoFechar} largura={760}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={enviar}>Gravar</Botao></>}>
      <Formulario aoEnviar={enviar}>
        <div className="grade-campos">
          <Campo rotulo="Nome" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio maxLength={120} />
          <Campo rotulo="Fase sugerida" tipo="select" valor={f.fase} aoMudar={v => setF({ ...f, fase: v })}
            opcoes={[{ valor: '', rotulo: '—' }, ...FASES.map(x => ({ valor: x, rotulo: x }))]} />
        </div>
        <Campo rotulo="Descrição" tipo="textarea" valor={f.descricao} aoMudar={v => setF({ ...f, descricao: v })} maxLength={2000} />
        <label className="check"><input type="checkbox" checked={f.ativo} onChange={e => setF({ ...f, ativo: e.target.checked })} /> Ativo (aparece ao criar projeto)</label>
        <fieldset className="grupo">
          <legend>Demandas padrão</legend>
          {linhas.map((l, i) => (
            <div key={i} className="linha-demanda">
              <input aria-label={`Demanda ${i + 1}`} placeholder="Nome da demanda" value={l.nome} onChange={e => muda(i, 'nome', e.target.value)} />
              <input aria-label={`Etapa ${i + 1}`} placeholder="Etapa" value={l.etapa} onChange={e => muda(i, 'etapa', e.target.value)} />
              <input aria-label={`Horas ${i + 1}`} placeholder="Horas" inputMode="numeric" value={l.horas} onChange={e => muda(i, 'horas', e.target.value)} />
              <span className="linha-demanda-bts">
                <button type="button" className="link" aria-label={`Subir ${i + 1}`} onClick={() => mover(i, -1)}>↑</button>
                <button type="button" className="link" aria-label={`Descer ${i + 1}`} onClick={() => mover(i, 1)}>↓</button>
                <button type="button" className="link" aria-label={`Remover ${i + 1}`} onClick={() => setLinhas(x => x.filter((_, j) => j !== i))}>×</button>
              </span>
            </div>
          ))}
          <Botao variante="fantasma" onClick={() => setLinhas(l => [...l, { nome: '', etapa: '', horas: '' }])}>+ Demanda</Botao>
        </fieldset>
        {erro && <p className="msg-erro">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
