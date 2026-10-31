// Novo chamado (V9): o formulário do 2.x, em 4 seções. Grava a demanda no projeto Avulso do cliente e depois sobe os anexos
// nela (assim vão para o ClickUp). Rascunho salvo neste navegador; o mesmo id de operação protege contra clique repetido.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ABRANGENCIAS, AMBIENTES, cham, etapaSugerida, ETAPAS, faltasChamado, FORMAS, IMPACTOS, prioridadeMatriz, TIPOS, URGENCIAS, type FormChamado as Dados, type OpcoesChamado } from '../api/chamados';
import { novaOperacao } from '../api/cliente';
import { enviarAnexo, rotuloPrioridade } from '../api/execucao';
import { hojeIso } from '../api/projeto';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { EscolhaChips } from './Chips';
import { Popup } from './Popup';
import { useToast } from './Toasts';

const VAZIO: Dados = { cliente_id: '', projeto_id: '', titulo: '', tipo: '', etapa: 'Atendimento avulso', descricao: '', passos: '', esperado: '', ambiente: '', abrangencia: '', impacto: '', urgencia: '',
  solicitante: '', contato: '', origem: '', ticket: '', os_sankhya: '', forma_atendimento: 'remoto', prazo: '', motivo_prazo: '', horas: '', sem_anexo: '' };
const RASCUNHO = 'pmo3:chamado:rascunho';
const MAX_ARQ = 10, MAX_MB = 10;

function lerRascunho(): Dados {
  try { return { ...VAZIO, ...JSON.parse(localStorage.getItem(RASCUNHO) ?? '{}') }; } catch { return VAZIO; }
}

export function FormChamado({ opcoes, aoFechar, aoGravar }: { opcoes: OpcoesChamado; aoFechar: () => void; aoGravar: (id: string) => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const [f, setF] = useState<Dados>(lerRascunho);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [tentou, setTentou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const op = useRef(novaOperacao());
  const entrada = useRef<HTMLInputElement>(null);
  const cliente = opcoes.clientes.find(c => c.id === f.cliente_id);
  const avulsos = cliente?.avulsos ?? [];
  const faltas = useMemo(() => faltasChamado(f, arquivos.length, avulsos.length, hojeIso()), [f, arquivos.length, avulsos.length]);
  const falta = (c: keyof Dados) => (tentou ? faltas.find(x => x[0] === c)?.[1] ?? null : null);
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(RASCUNHO, JSON.stringify(f)); } catch { /* sem armazenamento: segue sem rascunho */ } }, 400);
    return () => clearTimeout(t);
  }, [f]);
  const mudar = (c: Partial<Dados>) => setF(a => ({ ...a, ...c }));
  const escolher = (l: FileList | null) => {
    const novos = Array.from(l ?? []);
    const grande = novos.find(a => a.size > MAX_MB * 1024 * 1024);
    if (grande) avisar(`${grande.name} passa de ${MAX_MB} MB.`, 'erro');
    setArquivos(a => [...a, ...novos.filter(x => x.size <= MAX_MB * 1024 * 1024)].slice(0, MAX_ARQ));
    if (entrada.current) entrada.current.value = '';
  };
  const enviar = async () => {
    setTentou(true);
    if (faltas.length) { setErro(`Preencha: ${faltas.map(x => x[1]).join(', ')}.`); return; }
    setGravando(true); setErro(null);
    try {
      const { horas, projeto_id, ...resto } = f;
      const r = await cham.abrir(esc, { ...resto, projeto_id: projeto_id || (avulsos.length === 1 ? avulsos[0].id : null),
        horas: horas ? Number(horas.replace(',', '.')) : null, qtd_anexos: arquivos.length }, op.current);
      for (const a of arquivos) {
        try { await enviarAnexo(esc, 'demanda', r.demanda_id, a); } catch (e) { avisar(`${a.name}: ${(e as Error).message}`, 'erro'); }
      }
      try { localStorage.removeItem(RASCUNHO); } catch { /* idem */ }
      avisar(`Chamado #${r.numero} aberto.`, 'ok');
      aoGravar(r.id);
    } catch (e) { setErro((e as Error).message); setGravando(false); }
  };
  return (
    <Popup aberto titulo="Novo chamado" aoFechar={aoFechar} largura={720}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={enviar}>Abrir chamado</Botao></>}>
      <Formulario aoEnviar={enviar}>
        <p className="ajuda">Preencha tudo o que a triagem precisa para alocar sem voltar ao cliente.</p>
        <h3 className="secao">1 · Cliente e solicitante</h3>
        <Campo rotulo="Cliente" tipo="select" obrigatorio valor={f.cliente_id} erro={falta('cliente_id')} aoMudar={v => mudar({ cliente_id: v, projeto_id: '' })}
          opcoes={[{ valor: '', rotulo: 'Escolha o cliente…' }, ...opcoes.clientes.map(c => ({ valor: c.id, rotulo: c.nome }))]}
          ajuda={cliente && !avulsos.length ? 'Este cliente ainda não tem projeto Avulso: será criado.' : undefined} />
        {avulsos.length > 1 && <Campo rotulo="Projeto Avulso" tipo="select" obrigatorio valor={f.projeto_id} erro={falta('projeto_id')} aoMudar={v => mudar({ projeto_id: v })}
          opcoes={[{ valor: '', rotulo: 'Escolha o projeto…' }, ...avulsos.map(p => ({ valor: p.id, rotulo: p.nome }))]} />}
        <div className="duas-col">
          <Campo rotulo="Solicitante (usuário no cliente)" obrigatorio valor={f.solicitante} erro={falta('solicitante')} aoMudar={v => mudar({ solicitante: v })} maxLength={120} />
          <Campo rotulo="Contato do solicitante" obrigatorio valor={f.contato} erro={falta('contato')} aoMudar={v => mudar({ contato: v })} placeholder="Telefone / WhatsApp ou e-mail" maxLength={120} />
        </div>
        <EscolhaChips rotulo="Origem" obrigatorio valor={f.origem} aoMudar={v => mudar({ origem: v })} opcoes={opcoes.origens.map(o => ({ valor: o, rotulo: o }))} ajuda={falta('origem') ?? undefined} />
        <div className="duas-col">
          <Campo rotulo="Nº do ticket" obrigatorio={/service desk/i.test(f.origem)} valor={f.ticket} erro={falta('ticket')} aoMudar={v => mudar({ ticket: v })} inputMode="numeric" maxLength={60} />
          <Campo rotulo="OS Sankhya" valor={f.os_sankhya} aoMudar={v => mudar({ os_sankhya: v })} inputMode="numeric" maxLength={60} />
        </div>

        <h3 className="secao">2 · Demanda</h3>
        <Campo rotulo="Título (resumo em uma linha)" obrigatorio valor={f.titulo} erro={falta('titulo')} aoMudar={v => mudar({ titulo: v })} maxLength={160} />
        <EscolhaChips rotulo="Tipo de solicitação" obrigatorio valor={f.tipo} opcoes={TIPOS} ajuda={falta('tipo') ?? undefined} aoMudar={v => mudar({ tipo: v, etapa: etapaSugerida(v) })} />
        <EscolhaChips rotulo="Ambiente" obrigatorio valor={f.ambiente} opcoes={AMBIENTES} ajuda={falta('ambiente') ?? undefined} aoMudar={v => mudar({ ambiente: v })} />
        <EscolhaChips rotulo="Etapa" obrigatorio valor={f.etapa} opcoes={ETAPAS} aoMudar={v => mudar({ etapa: v })} />
        <Campo rotulo="Descrição detalhada" tipo="textarea" obrigatorio valor={f.descricao} erro={falta('descricao')} aoMudar={v => mudar({ descricao: v })} ajuda={`${f.descricao.trim().length}/50`} />
        <Campo rotulo="Onde ocorre / passos para reproduzir" tipo="textarea" obrigatorio={/erro/i.test(f.tipo)} valor={f.passos} erro={falta('passos')} aoMudar={v => mudar({ passos: v })} />
        <Campo rotulo="Resultado esperado" tipo="textarea" obrigatorio valor={f.esperado} erro={falta('esperado')} aoMudar={v => mudar({ esperado: v })} />

        <h3 className="secao">3 · Prioridade e atendimento</h3>
        <EscolhaChips rotulo="Impacto" obrigatorio valor={f.impacto} opcoes={IMPACTOS} ajuda={falta('impacto') ?? undefined} aoMudar={v => mudar({ impacto: v })} />
        <EscolhaChips rotulo="Urgência" obrigatorio valor={f.urgencia} opcoes={URGENCIAS} ajuda={falta('urgencia') ?? undefined} aoMudar={v => mudar({ urgencia: v })} />
        {f.impacto && f.urgencia && <p className="ajuda">Prioridade: <strong data-testid="prioridade-calculada">{rotuloPrioridade(prioridadeMatriz(f.impacto, f.urgencia))}</strong></p>}
        <EscolhaChips rotulo="Quem é afetado" obrigatorio valor={f.abrangencia} opcoes={ABRANGENCIAS} ajuda={falta('abrangencia') ?? undefined} aoMudar={v => mudar({ abrangencia: v })} />
        <div className="duas-col">
          <Campo rotulo="Prazo desejado" tipo="date" valor={f.prazo} erro={falta('prazo')} aoMudar={v => mudar({ prazo: v })} />
          <Campo rotulo="Horas estimadas" valor={f.horas} aoMudar={v => mudar({ horas: v })} inputMode="text" placeholder="Se souber" />
        </div>
        {f.prazo && <Campo rotulo="Motivo do prazo" obrigatorio valor={f.motivo_prazo} erro={falta('motivo_prazo')} aoMudar={v => mudar({ motivo_prazo: v })} maxLength={500} />}
        <EscolhaChips rotulo="Forma de atendimento" obrigatorio valor={f.forma_atendimento} opcoes={FORMAS} aoMudar={v => mudar({ forma_atendimento: v })} />

        <h3 className="secao">4 · Anexos</h3>
        <ul className="lista-simples">
          {arquivos.map((a, i) => <li key={a.name + i}>📎 {a.name} <button type="button" className="link" aria-label={`Remover ${a.name}`} onClick={() => setArquivos(l => l.filter((_, n) => n !== i))}>×</button></li>)}
        </ul>
        <input ref={entrada} type="file" multiple hidden aria-label="Escolher arquivos" onChange={e => escolher(e.target.files)} />
        {arquivos.length < MAX_ARQ && <Botao onClick={() => entrada.current?.click()}>+ Adicionar arquivos</Botao>}
        {!arquivos.length && <Campo rotulo="Sem anexo? Diga por quê" valor={f.sem_anexo} erro={falta('sem_anexo')} aoMudar={v => mudar({ sem_anexo: v })} maxLength={1000} />}
        {erro && <p className="msg-erro" role="alert">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
