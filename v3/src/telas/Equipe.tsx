// Equipe, usuários e permissões numa tela (escopo §1.3): lista de pessoas; ficha em abas (Info · Acessos · Skills);
// acessos pela funcionalidade (marca usuários/perfis) e catálogo de módulos (skills).
import { useEffect, useMemo, useState } from 'react';
import { api, PAPEIS, PERFIS, rotuloPerfil, type Acessos, type Membro, type ModuloSkill, type Papel, type UsuarioFicha } from '../api/cadastros';
import { Botao } from '../componentes/Botao';
import { Campo, Formulario } from '../componentes/Campo';
import { NomePessoa, PilulasSkills } from '../componentes/NomePessoa';
import { Popup } from '../componentes/Popup';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { useToast } from '../componentes/Toasts';
import { useCarga } from '../estado/carga';
import { useEquipe, usePode } from '../estado/equipe';
import { useSessao } from '../estado/sessao';

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const rotuloPapel = (p: string) => PAPEIS.find(x => x.valor === p)?.rotulo ?? p;
type Visao = 'pessoas' | 'funcionalidade' | 'catalogo';

export function Equipe() {
  const pode = usePode();
  const [visao, setVisao] = useState<Visao>('pessoas');
  const [usuario, setUsuario] = useState<string | 'novo' | null>(null);
  const visoes: { id: Visao; titulo: string }[] = [
    { id: 'pessoas', titulo: 'Pessoas' },
    ...(pode('permissao.editar') ? [{ id: 'funcionalidade' as Visao, titulo: 'Acessos por funcionalidade' }] : []),
    { id: 'catalogo', titulo: 'Catálogo de skills' },
  ];
  return (
    <div className="pagina">
      <header className="pagina-topo">
        <h1>Equipe</h1>
        {pode('equipe.editar') && <Botao variante="primario" onClick={() => setUsuario('novo')}>+ Novo usuário</Botao>}
      </header>
      <div className="segmentos" role="tablist" aria-label="Visão da equipe">
        {visoes.map(v => (
          <button key={v.id} type="button" role="tab" aria-selected={visao === v.id} onClick={() => setVisao(v.id)}>{v.titulo}</button>
        ))}
      </div>
      {visao === 'pessoas' && <Pessoas aoAbrir={setUsuario} />}
      {visao === 'funcionalidade' && <PorFuncionalidade />}
      {visao === 'catalogo' && <Catalogo />}
      {usuario && <UsuarioPopup id={usuario} aoFechar={() => setUsuario(null)} aoCriar={setUsuario} />}
    </div>
  );
}

// ---------------------------------------------------------------- lista de pessoas
function Pessoas({ aoAbrir }: { aoAbrir: (id: string) => void }) {
  const { lista, carregada } = useEquipe();
  const [texto, setTexto] = useState('');
  const [papel, setPapel] = useState('');
  const [inativos, setInativos] = useState(false);
  const linhas = useMemo(() => lista.filter(m => (inativos || m.ativo) && (!papel || m.papeis.includes(papel as Papel))
    && (!texto || semAcento(`${m.nome} ${m.email}`).includes(semAcento(texto)))), [lista, texto, papel, inativos]);
  type L = Membro & Record<string, unknown>;
  const cols: Coluna<L>[] = [
    { chave: 'nome', titulo: 'Nome', render: l => <><NomePessoa id={l.id} comAvatar />{!l.ativo && <span className="pilula pilula-neutra"> Inativo</span>}</> },
    { chave: 'email', titulo: 'E-mail' },
    { chave: 'papeis', titulo: 'Papéis', render: l => <span className="pilulas">{l.papeis.map(p => <span key={p} className="pilula pilula-neutra">{rotuloPapel(p)}</span>)}</span> },
    { chave: 'perfil_nome', titulo: 'Perfil' },
    { chave: 'skills', titulo: 'Skills', alinhar: 'dir', render: l => `${l.skills.filter(s => s.certificado).length} cert. / ${l.skills.length}` },
  ];
  return (
    <>
      <div className="barra-filtros">
        <input type="search" aria-label="Buscar pessoa" placeholder="Buscar nome ou e-mail" value={texto} onChange={e => setTexto(e.target.value)} />
        <select aria-label="Papel" value={papel} onChange={e => setPapel(e.target.value)}>
          <option value="">Todos os papéis</option>
          {PAPEIS.map(p => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={inativos} onChange={e => setInativos(e.target.checked)} /> Mostrar inativos</label>
      </div>
      <Tabela colunas={cols} linhas={linhas as L[]} chave={l => l.id} tamanhoInicial={30}
        vazio={carregada ? 'Ninguém encontrado.' : 'Carregando…'} aoClicar={l => aoAbrir(l.id)} />
    </>
  );
}

// ---------------------------------------------------------------- ficha do usuário em abas
type Aba = 'info' | 'acessos' | 'skills';

function UsuarioPopup({ id, aoFechar, aoCriar }: { id: string; aoFechar: () => void; aoCriar: (id: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const novo = id === 'novo';
  const [aba, setAba] = useState<Aba>('info');
  const c = useCarga(() => (novo ? Promise.resolve(null) : api.usuario(esc, id)), [esc, id]);
  const equipe = useEquipe();
  const { recarregarEu, eu } = useSessao();
  const depois = async () => { await Promise.all([c.recarregar(), equipe.recarregar(), id === eu?.usuario.id ? recarregarEu() : null]); };
  const abas: { id: Aba; titulo: string }[] = [{ id: 'info', titulo: 'Info' }, { id: 'acessos', titulo: 'Acessos' }, { id: 'skills', titulo: 'Skills' }];
  return (
    <Popup aberto titulo={novo ? 'Novo usuário' : c.dados?.usuario.nome ?? 'Usuário'} aoFechar={aoFechar} largura={760}>
      {!novo && (
        <div className="segmentos" role="tablist" aria-label="Abas do usuário">
          {abas.map(a => <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}>{a.titulo}</button>)}
        </div>
      )}
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      {novo && <AbaInfo ficha={null} aoGravar={async nid => { await equipe.recarregar(); aoCriar(nid); }} />}
      {!novo && c.dados && aba === 'info' && <AbaInfo ficha={c.dados} aoGravar={depois} />}
      {!novo && c.dados && aba === 'acessos' && <AbaAcessos ficha={c.dados} aoGravar={depois} />}
      {!novo && c.dados && aba === 'skills' && <AbaSkills ficha={c.dados} aoGravar={depois} />}
      {!novo && !c.dados && !c.erro && <p className="ajuda"><span className="giro" /> Carregando…</p>}
    </Popup>
  );
}

function AbaInfo({ ficha, aoGravar }: { ficha: UsuarioFicha | null; aoGravar: (id: string) => Promise<void> | void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const u = ficha?.usuario;
  const [f, setF] = useState({ email: u?.email ?? '', nome: u?.nome ?? '', iniciais: u?.iniciais ?? '', cor: u?.cor ?? '#1f7a45',
    papeis: (u?.papeis ?? ['consultor']) as Papel[], ativo: u?.ativo ?? true, perfil: ficha?.perfil.codigo ?? 'consultor' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [gravando, setGravando] = useState(false);
  const editar = pode('equipe.editar');
  const mudaPerfil = pode('permissao.editar');
  const alternarPapel = (p: Papel) => setF(x => ({ ...x, papeis: x.papeis.includes(p) ? x.papeis.filter(y => y !== p) : [...x.papeis, p] }));
  const enviar = async () => {
    const e: Record<string, string> = {};
    if (!ficha && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = 'Informe um e-mail válido.';
    if (!f.nome.trim()) e.nome = 'Informe o nome.';
    if (f.iniciais.trim().length > 4) e.iniciais = 'No máximo 4 letras.';
    setErros(e);
    if (Object.keys(e).length) return;
    setGravando(true);
    try {
      const dados: Record<string, unknown> = { nome: f.nome.trim(), iniciais: f.iniciais.trim() || null, cor: f.cor, papeis: f.papeis, ativo: f.ativo };
      if (mudaPerfil && (!ficha || f.perfil !== ficha.perfil.codigo)) dados.perfil = f.perfil;
      const r = await api.usuarioSalvar(esc, ficha ? { id: ficha.usuario.id, versao: ficha.usuario.versao, ...dados } : { email: f.email.trim(), ...dados });
      avisar(ficha ? 'Usuário gravado' : 'Usuário cadastrado. Ele já pode entrar com o código por e-mail.', 'ok');
      await aoGravar(r.id);
    } catch (x) { avisar((x as Error).message, 'erro'); }
    setGravando(false);
  };
  return (
    <Formulario aoEnviar={enviar}>
      <div className="grade-campos">
        {ficha
          ? <Campo rotulo="E-mail (login)" valor={f.email} aoMudar={() => {}} somenteLeitura ajuda={u?.logou ? 'Já entrou no v3.' : 'Ainda não entrou no v3.'} />
          : <Campo rotulo="E-mail (login)" tipo="email" valor={f.email} aoMudar={v => setF({ ...f, email: v })} obrigatorio erro={erros.email} autoComplete="off" />}
        <Campo rotulo="Nome" valor={f.nome} aoMudar={v => setF({ ...f, nome: v })} obrigatorio erro={erros.nome} maxLength={120} />
        <Campo rotulo="Iniciais" valor={f.iniciais} aoMudar={v => setF({ ...f, iniciais: v.toUpperCase() })} erro={erros.iniciais} maxLength={4} />
        <div className="campo">
          <label htmlFor="cor-usuario">Cor</label>
          <input id="cor-usuario" type="color" value={f.cor} onChange={e => setF({ ...f, cor: e.target.value })} />
        </div>
        <Campo rotulo="Perfil de acesso" tipo="select" valor={f.perfil} aoMudar={v => setF({ ...f, perfil: v })}
          ajuda={mudaPerfil ? 'Perfil ≠ papel: o perfil diz o que a pessoa acessa.' : 'Só quem edita permissões muda o perfil.'}
          opcoes={PERFIS.map(p => ({ valor: p.valor, rotulo: p.rotulo }))} />
      </div>
      <fieldset className="grupo" disabled={!editar}>
        <legend>Papéis (o que a pessoa faz)</legend>
        <div className="linha">
          {PAPEIS.map(p => (
            <label key={p.valor} className="check"><input type="checkbox" checked={f.papeis.includes(p.valor)} onChange={() => alternarPapel(p.valor)} /> {p.rotulo}</label>
          ))}
        </div>
      </fieldset>
      <label className="check"><input type="checkbox" checked={f.ativo} disabled={!editar} onChange={e => setF({ ...f, ativo: e.target.checked })} /> Ativo neste escritório</label>
      {editar && <Botao type="submit" variante="primario" carregando={gravando}>{ficha ? 'Gravar' : 'Cadastrar'}</Botao>}
    </Formulario>
  );
}

function AbaAcessos({ ficha, aoGravar }: { ficha: UsuarioFicha; aoGravar: () => Promise<void> }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const [gravando, setGravando] = useState<string | null>(null);
  const [marcado, setMarcado] = useState<Record<string, boolean>>({});  // marcação otimista até a resposta
  if (!ficha.permissoes) return <p className="ajuda">Você não tem permissão para ver os acessos desta pessoa.</p>;
  const editar = pode('permissao.editar') && ficha.perfil.codigo !== 'admin';
  const grupos = ficha.permissoes.reduce<Record<string, typeof ficha.permissoes>>((g, p) => { (g[p.modulo] ??= []).push(p); return g; }, {});
  const alternar = async (codigo: string, novo: boolean, doPerfil: boolean) => {
    setGravando(codigo);
    setMarcado(m => ({ ...m, [codigo]: novo }));
    try {
      await api.permissaoSalvar(esc, { usuario_id: ficha.usuario.id, funcionalidade: codigo, permitido: novo === doPerfil ? null : novo });
      await aoGravar();
    } catch (e) { avisar((e as Error).message, 'erro'); }
    setMarcado(m => { const { [codigo]: _, ...r } = m; return r; });
    setGravando(null);
  };
  return (
    <div className="acessos">
      <p className="ajuda">Perfil <strong>{rotuloPerfil(ficha.perfil.codigo)}</strong>
        {ficha.perfil.codigo === 'admin' ? ': o Admin acessa tudo.' : '. Marcar diferente do perfil cria uma exceção só para esta pessoa.'}</p>
      {Object.entries(grupos).map(([mod, lista]) => (
        <fieldset key={mod} className="grupo">
          <legend>{mod}</legend>
          {lista.map(p => (
            <label key={p.codigo} className="check acesso">
              <input type="checkbox" checked={marcado[p.codigo] ?? p.efetivo} disabled={!editar || (gravando !== null && gravando !== p.codigo)}
                onChange={e => alternar(p.codigo, e.target.checked, p.do_perfil)} aria-describedby={`ac-${p.codigo}`} />
              <span>{p.descricao} <code>{p.codigo}</code></span>
              <small id={`ac-${p.codigo}`} className={p.excecao === null ? 'ajuda' : 'excecao'}>
                {p.excecao === null ? 'pelo perfil' : p.excecao ? 'exceção: liberado' : 'exceção: bloqueado'}</small>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

function AbaSkills({ ficha, aoGravar }: { ficha: UsuarioFicha; aoGravar: () => Promise<void> }) {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const [modulos, setModulos] = useState<ModuloSkill[]>([]);
  const [novo, setNovo] = useState({ modulo: '', certificado: false });
  const [gravando, setGravando] = useState(false);
  const [cert, setCert] = useState<Record<string, boolean>>({});
  const editar = pode('equipe.editar');
  useEffect(() => { api.modulos(esc).then(setModulos).catch(() => setModulos([])); }, [esc]);
  const gravar = async (d: { modulo_id: string; certificado?: boolean; remover?: boolean }, msg: string) => {
    setGravando(true);
    if (d.certificado !== undefined) setCert(c => ({ ...c, [d.modulo_id]: d.certificado! }));
    try { await api.skillSalvar(esc, { usuario_id: ficha.usuario.id, ...d }); avisar(msg, 'ok'); await aoGravar(); }
    catch (e) { avisar((e as Error).message, 'erro'); }
    setCert({});
    setGravando(false);
  };
  const livres = modulos.filter(m => !ficha.skills.some(s => s.modulo_id === m.id));
  return (
    <div className="formulario">
      <PilulasSkills skills={ficha.skills} />
      {ficha.skills.length > 0 && (
        <ul className="lista-skills">
          {ficha.skills.map(s => (
            <li key={s.modulo_id}>
              <span>{s.modulo}</span>
              <label className="check"><input type="checkbox" checked={cert[s.modulo_id] ?? s.certificado} disabled={!editar || gravando}
                onChange={e => gravar({ modulo_id: s.modulo_id, certificado: e.target.checked }, 'Skill gravada')} /> Certificado</label>
              {editar && <button type="button" className="link" disabled={gravando} aria-label={`Remover ${s.modulo}`}
                onClick={() => gravar({ modulo_id: s.modulo_id, remover: true }, 'Skill removida')}>Remover</button>}
            </li>
          ))}
        </ul>
      )}
      {editar && (
        <div className="linha">
          <select aria-label="Módulo" value={novo.modulo} onChange={e => setNovo({ ...novo, modulo: e.target.value })}>
            <option value="">— adicionar módulo —</option>
            {livres.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={novo.certificado} onChange={e => setNovo({ ...novo, certificado: e.target.checked })} /> Certificado</label>
          <Botao disabled={!novo.modulo} carregando={gravando} onClick={async () => {
            await gravar({ modulo_id: novo.modulo, certificado: novo.certificado }, 'Skill adicionada'); setNovo({ modulo: '', certificado: false });
          }}>Adicionar</Botao>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- acessos pela funcionalidade (outro sentido)
function PorFuncionalidade() {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const { recarregarEu } = useSessao();
  const c = useCarga(() => api.acessos(esc), [esc]);
  const [func, setFunc] = useState('');
  const [gravando, setGravando] = useState(false);
  const [marcado, setMarcado] = useState<Record<string, boolean>>({});  // marcação otimista (perfil ou usuário)
  const a: Acessos | null = c.dados;
  useEffect(() => { if (a && !func) setFunc(a.funcionalidades[0]?.codigo ?? ''); }, [a, func]);
  if (c.erro) return <p className="msg-erro">{c.erro}</p>;
  if (!a) return <p className="ajuda"><span className="giro" /> Carregando…</p>;
  const perfilDe = (pid: string) => a.perfis.find(p => p.id === pid);
  const doPerfil = (pid: string) => { const p = perfilDe(pid); return !!p && p.permitidas.includes(func); };
  const gravar = async (d: { usuario_id?: string; perfil_id?: string; permitido: boolean | null }, chave: string, novo: boolean) => {
    setGravando(true);
    setMarcado({ [chave]: novo });
    try { await api.permissaoSalvar(esc, { ...d, funcionalidade: func }); await Promise.all([c.recarregar(), recarregarEu()]); }
    catch (e) { avisar((e as Error).message, 'erro'); }
    setMarcado({});
    setGravando(false);
  };
  const f = a.funcionalidades.find(x => x.codigo === func);
  return (
    <div className="formulario">
      <Campo rotulo="Funcionalidade" tipo="select" valor={func} aoMudar={setFunc}
        opcoes={a.funcionalidades.map(x => ({ valor: x.codigo, rotulo: `${x.modulo} · ${x.descricao}` }))} ajuda={f ? f.codigo : undefined} />
      <fieldset className="grupo">
        <legend>Perfis</legend>
        <div className="linha">
          {a.perfis.map(p => (
            <label key={p.id} className="check">
              <input type="checkbox" checked={marcado[p.id] ?? p.permitidas.includes(func)} disabled={p.codigo === 'admin' || gravando}
                onChange={e => gravar({ perfil_id: p.id, permitido: e.target.checked }, p.id, e.target.checked)} /> {p.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grupo">
        <legend>Pessoas</legend>
        <ul className="lista-acesso">
          {a.usuarios.map(u => {
            const perfil = perfilDe(u.perfil_id);
            const exc = u.excecoes[func];
            const efetivo = perfil?.codigo === 'admin' || (exc ?? doPerfil(u.perfil_id));
            return (
              <li key={u.id}>
                <label className="check">
                  <input type="checkbox" checked={marcado[u.id] ?? efetivo} disabled={perfil?.codigo === 'admin' || gravando}
                    onChange={e => gravar({ usuario_id: u.id, permitido: e.target.checked === doPerfil(u.perfil_id) ? null : e.target.checked }, u.id, e.target.checked)} />
                  <NomePessoa id={u.id} />
                </label>
                <small className={exc === undefined ? 'ajuda' : 'excecao'}>{rotuloPerfil(perfil?.codigo ?? '')}{exc === undefined ? '' : exc ? ' · exceção: liberado' : ' · exceção: bloqueado'}</small>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}

// ---------------------------------------------------------------- catálogo de módulos
function Catalogo() {
  const esc = useSessao().eu!.escritorio_id!;
  const pode = usePode();
  const avisar = useToast();
  const equipe = useEquipe();
  const [inativos, setInativos] = useState(false);
  const c = useCarga(() => api.modulos(esc, inativos), [esc, inativos]);
  const [edit, setEdit] = useState<Partial<ModuloSkill> | null>(null);
  const [nome, setNome] = useState('');
  const [gravando, setGravando] = useState(false);
  const editar = pode('skill.catalogo');
  useEffect(() => { setNome(edit?.nome ?? ''); }, [edit]);
  const gravar = async (d: Record<string, unknown>) => {
    setGravando(true);
    try { await api.moduloSalvar(esc, d); avisar('Catálogo gravado', 'ok'); setEdit(null); await Promise.all([c.recarregar(), equipe.recarregar()]); }
    catch (e) { avisar((e as Error).message, 'erro'); }
    setGravando(false);
  };
  type L = ModuloSkill & Record<string, unknown>;
  const cols: Coluna<L>[] = [
    { chave: 'nome', titulo: 'Módulo', render: l => <>{l.nome}{!l.ativo && <span className="pilula pilula-neutra"> Inativo</span>}{l.do_clickup && <small className="ajuda"> · ClickUp</small>}</> },
    { chave: 'pessoas', titulo: 'Pessoas', alinhar: 'dir' },
    { chave: 'certificados', titulo: 'Certificados', alinhar: 'dir' },
  ];
  return (
    <>
      <div className="barra-filtros">
        <label className="check"><input type="checkbox" checked={inativos} onChange={e => setInativos(e.target.checked)} /> Mostrar inativos</label>
        {editar && <Botao onClick={() => setEdit({})}>+ Módulo</Botao>}
      </div>
      {c.erro && <p className="msg-erro">{c.erro}</p>}
      <Tabela colunas={cols} linhas={(c.dados ?? []) as L[]} chave={l => l.id} tamanhoInicial={30}
        vazio={c.carregando ? 'Carregando…' : 'Nenhum módulo.'} aoClicar={editar ? l => setEdit(l) : undefined} />
      <Popup aberto={!!edit} titulo={edit?.id ? 'Módulo' : 'Novo módulo'} aoFechar={() => setEdit(null)}
        rodape={<>
          {edit?.id && <Botao className="a-esquerda" carregando={gravando} onClick={() => gravar({ id: edit.id, versao: edit.versao, ativo: !edit.ativo })}>{edit.ativo ? 'Inativar' : 'Reativar'}</Botao>}
          <Botao onClick={() => setEdit(null)}>Cancelar</Botao>
          <Botao variante="primario" carregando={gravando} onClick={() => nome.trim() && gravar({ ...(edit?.id ? { id: edit.id, versao: edit.versao } : {}), nome: nome.trim() })}>Gravar</Botao></>}>
        <Formulario aoEnviar={() => nome.trim() && gravar({ ...(edit?.id ? { id: edit.id, versao: edit.versao } : {}), nome: nome.trim() })}>
          <Campo rotulo="Nome do módulo" valor={nome} aoMudar={setNome} obrigatorio maxLength={80}
            ajuda={edit?.do_clickup ? 'Veio do campo Módulo do ClickUp: renomear aqui não muda o ClickUp.' : undefined} />
        </Formulario>
      </Popup>
    </>
  );
}
