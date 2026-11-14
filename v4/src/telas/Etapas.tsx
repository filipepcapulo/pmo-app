// Cadastro de Etapas (V4, #/etapas): as etapas do app e o de/para das opções do campo "Etapa" do ClickUp.
// Cada opção do ClickUp pertence a no máximo uma etapa do app; o que estiver sem vínculo aparece no fim.
import { useEffect, useMemo, useState } from 'react';
import { corTexto, etapasApi, type Etapa } from '../api/etapas';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { Popup } from '../componentes/Popup';
import { useToast } from '../componentes/Toasts';
import { useEtapas } from '../estado/etapas';
import { useSessao } from '../estado/sessao';

export function Etapas() {
  const et = useEtapas();
  const [inativas, setInativas] = useState(false);
  const [aberta, setAberta] = useState<Partial<Etapa> | null>(null);
  const editar = !!et.dados?.pode_editar;
  const lista = et.lista.filter(e => inativas || e.ativo);
  const semVinculo = et.dados?.sem_vinculo ?? [];
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div><h1>Etapas</h1><p className="ajuda">As etapas do app e a que etapa do app corresponde cada etapa vinda do ClickUp (de/para).</p></div>
        {editar && <Botao variante="primario" onClick={() => setAberta({ nome: '', cor: '#64748b', ordem: (et.lista.at(-1)?.ordem ?? 0) + 10, ativo: true, vinculos: [] })}>+ Nova etapa</Botao>}
      </header>
      <label className="check"><input type="checkbox" checked={inativas} onChange={e => setInativas(e.target.checked)} /> Mostrar inativas</label>
      {!et.dados && <div className="carregando-tela"><span className="giro" /> Carregando…</div>}
      <div className="grade-cartoes">
        {lista.map(e => (
          <article key={e.id} className="cartao etapa-cartao" style={{ ['--cor-etapa' as string]: e.cor }} data-etapa={e.codigo}>
            <div className="pagina-topo">
              <h2><span className="pil pil-etapa" style={{ background: e.cor, color: corTexto(e.cor) }}>{e.nome}</span>
                {!e.ativo && <span className="pilula pilula-neutra">Inativa</span>}
                {e.sistema && <span className="pilula pilula-neutra" title="Usada pelo fluxo de chamados: não pode ser excluída">Fluxo</span>}</h2>
              {editar && <Botao variante="fantasma" onClick={() => setAberta(e)}>Editar</Botao>}
            </div>
            {e.vinculos.length === 0
              ? <p className="ajuda">Nenhuma etapa do ClickUp vinculada{e.cu_principal ? ` (grava "${e.cu_principal}" no ClickUp)` : ''}.</p>
              : <ul className="etapa-vinculos" aria-label={`Etapas do ClickUp em ${e.nome}`}>{e.vinculos.map(v => <li key={v}>{v}</li>)}</ul>}
          </article>
        ))}
      </div>
      {et.dados && (
        <section className="cartao" aria-label="Etapas do ClickUp sem vínculo">
          <h2 className="secao">Etapas do ClickUp sem vínculo ({semVinculo.length})</h2>
          {semVinculo.length === 0 ? <p className="ajuda">Todas as etapas do ClickUp estão vinculadas a uma etapa do app.</p>
            : <><p className="ajuda">Demandas com estas etapas aparecem sem etapa do app. Edite uma etapa e marque-as para vincular.</p>
              <ul className="etapa-vinculos">{semVinculo.map(v => <li key={v}>{v}</li>)}</ul></>}
        </section>
      )}
      <EtapaPopup etapa={aberta} aoFechar={() => setAberta(null)} aoGravar={() => { setAberta(null); et.recarregar(); }} />
    </div>
  );
}

function EtapaPopup({ etapa, aoFechar, aoGravar }: { etapa: Partial<Etapa> | null; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const et = useEtapas();
  const avisar = useToast();
  const [f, setF] = useState({ nome: '', cor: '#64748b', ordem: '0', ativo: true, principal: '' });
  const [vinc, setVinc] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => {
    if (!etapa) return;
    setF({ nome: etapa.nome ?? '', cor: etapa.cor ?? '#64748b', ordem: String(etapa.ordem ?? 0), ativo: etapa.ativo ?? true, principal: etapa.cu_principal ?? '' });
    setVinc(etapa.vinculos ?? []);
    setBusca('');
    setErro(null);
  }, [etapa]);
  // opções do ClickUp + o que já está vinculado (mesmo que tenha saído do ClickUp); de quem é cada uma
  const dono = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of et.lista) if (e.id !== etapa?.id) for (const v of e.vinculos) m.set(v, e.nome);
    return m;
  }, [et.lista, etapa]);
  const opcoes = useMemo(() => [...new Set([...(et.dados?.opcoes_cu ?? []), ...(etapa?.vinculos ?? [])])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [et.dados, etapa]);
  const t = busca.trim().toLowerCase();
  const visiveis = t ? opcoes.filter(o => o.toLowerCase().includes(t)) : opcoes;
  const enviar = async (excluir = false) => {
    if (!excluir && f.nome.trim().length < 2) { setErro('Informe o nome da etapa.'); return; }
    if (excluir && !confirm(`Excluir a etapa "${etapa?.nome}"?`)) return;
    setGravando(true);
    try {
      await etapasApi.salvar(esc, excluir ? { id: etapa!.id, versao: etapa!.versao, excluir: true }
        : { ...(etapa?.id ? { id: etapa.id, versao: etapa.versao } : {}), nome: f.nome.trim(), cor: f.cor, ordem: Number(f.ordem) || 0, ativo: f.ativo,
            cu_principal: f.principal || null, vinculos: vinc });
      avisar(excluir ? 'Etapa excluída' : 'Etapa gravada', 'ok');
      aoGravar();
    } catch (e) { setErro((e as Error).message); }
    setGravando(false);
  };
  return (
    <Popup aberto={!!etapa} titulo={etapa?.id ? 'Editar etapa' : 'Nova etapa'} aoFechar={aoFechar} largura={720}
      rodape={<>{etapa?.id && !etapa.sistema && <Botao variante="perigo" onClick={() => enviar(true)}>Excluir</Botao>}
        <Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={() => enviar()}>Gravar</Botao></>}>
      <Formulario aoEnviar={() => enviar()}>
        <div className="grade-campos">
          <Campo rotulo="Nome" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio maxLength={80} />
          <div className="campo">
            <label htmlFor="etapa-cor">Cor</label>
            <span className="cor-campo"><input id="etapa-cor" type="color" value={f.cor} onChange={e => setF({ ...f, cor: e.target.value })} />
              <span className="pil pil-etapa" style={{ background: f.cor, color: corTexto(f.cor) }}>{f.nome || 'Etapa'}</span></span>
          </div>
          <Campo rotulo="Ordem" tipo="number" valor={f.ordem} aoMudar={v => setF({ ...f, ordem: v })} inputMode="numeric" ajuda="Menor aparece antes." />
        </div>
        <label className="check"><input type="checkbox" checked={f.ativo} onChange={e => setF({ ...f, ativo: e.target.checked })} /> Ativa (aparece para escolher em demandas)</label>
        <fieldset className="grupo">
          <legend>Etapas do ClickUp que correspondem a esta ({vinc.length})</legend>
          {opcoes.length > 10 && <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar etapa do ClickUp…" aria-label="Buscar etapa do ClickUp" />}
          <div className="etapa-opcoes">
            {visiveis.map(o => (
              <label key={o} className="check">
                <input type="checkbox" checked={vinc.includes(o)} onChange={() => setVinc(v => (v.includes(o) ? v.filter(x => x !== o) : [...v, o]))} /> {o}
                {dono.has(o) && !vinc.includes(o) && <small> · hoje em {dono.get(o)}</small>}
                {dono.has(o) && vinc.includes(o) && <small> · sai de {dono.get(o)}</small>}
              </label>
            ))}
            {visiveis.length === 0 && <small className="ajuda">Nenhuma etapa do ClickUp.</small>}
          </div>
        </fieldset>
        <Campo rotulo="Texto gravado no ClickUp ao escolher esta etapa" tipo="select" valor={f.principal} aoMudar={v => setF({ ...f, principal: v })}
          opcoes={[{ valor: '', rotulo: 'Automático (opção da mesma família do projeto)' }, ...[...new Set([...(f.principal ? [f.principal] : []), ...opcoes])].map(o => ({ valor: o, rotulo: o }))]}
          ajuda="No automático, a demanda que está em '58 - …' recebe a opção '58 - …' vinculada a esta etapa." />
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
