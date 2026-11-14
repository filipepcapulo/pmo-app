// Popup "Alocar agenda" do chamado (V4): ao escolher o consultor mostra a semana atual e a próxima (dias úteis × manhã e
// tarde) com os horários livres em destaque; clicar no livre escolhe. Cada horário vira uma tarefa da subdemanda do
// chamado (manhã + tarde do mesmo dia = dia inteiro). Um chamado pode receber várias tarefas.
import { useEffect, useMemo, useState } from 'react';
import { chamV4, disponibilidade, duasSemanas, tarefasDosHorarios, type CelulaDisp, type TurnoDisp } from '../api/chamadosV4';
import { exec, MODALIDADES } from '../api/execucao';
import { hojeIso } from '../api/projeto';
import type { Grade } from '../api/equipe';
import { useEquipe } from '../estado/equipe';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo } from './Campo';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export interface AlvoAlocar { demanda_id: string; numero: number; titulo: string; cliente?: string; horas_previstas?: number | null }
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function AlocarAgenda({ alvo, aoFechar, aoGravar }: { alvo: AlvoAlocar; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const { lista: equipe } = useEquipe();
  const avisar = useToast();
  const hoje = useMemo(hojeIso, []);
  const [consultor, setConsultor] = useState('');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [sel, setSel] = useState<{ data: string; turno: TurnoDisp }[]>([]);
  const [nome, setNome] = useState(alvo.titulo);
  const [modalidade, setModalidade] = useState('remoto');
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const pessoas = useMemo(() => equipe.filter(m => m.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [equipe]);

  useEffect(() => {
    setSel([]); setGrade(null); setErro(null);
    if (!consultor) return;
    let vivo = true;
    const sem = duasSemanas(hoje);
    setCarregando(true);
    chamV4.gradeDe(esc, consultor, sem[0][0], sem[1][4])
      .then(g => { if (vivo) setGrade(g); })
      .catch(e => { if (vivo) setErro((e as Error).message); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [consultor, esc, hoje]);

  const semanas = useMemo(() => (grade && consultor ? disponibilidade(grade, consultor, hoje) : []), [grade, consultor, hoje]);
  const livres = semanas.reduce((n, s) => n + [...s.manha, ...s.tarde].filter(c => c.estado === 'livre').length, 0);
  const marcado = (c: CelulaDisp) => sel.some(s => s.data === c.data && s.turno === c.turno);
  const alternar = (c: CelulaDisp) => setSel(l => (marcado(c) ? l.filter(s => !(s.data === c.data && s.turno === c.turno)) : [...l, { data: c.data, turno: c.turno }]));
  const tarefas = tarefasDosHorarios(sel);

  const gravar = async () => {
    setErro(null);
    if (!consultor) { setErro('Escolha o consultor.'); return; }
    if (!tarefas.length) { setErro('Escolha ao menos um horário livre.'); return; }
    if (!nome.trim()) { setErro('Informe o título da tarefa.'); return; }
    setGravando(true);
    let feitas = 0;
    try {
      for (const t of tarefas) {
        await exec.tarefasSalvar(esc, { demanda_id: alvo.demanda_id, nome: nome.trim(), modalidade: modalidade || null, status: 'planejada',
          periodo: t.periodo, hora_ini: null, hora_fim: null, responsaveis: [consultor], datas: [t.data] });
        feitas++;
      }
      avisar(`Chamado #${alvo.numero} atribuído: ${feitas} agenda(s) criada(s)`, 'ok');
      aoGravar();
    } catch (e) {
      setErro(`${feitas ? `${feitas} de ${tarefas.length} criada(s). ` : ''}${(e as Error).message}`);
      if (feitas) setSel([]);
    }
    setGravando(false);
  };

  const celula = (c: CelulaDisp) => (
    <button key={c.data + c.turno} type="button" disabled={c.estado !== 'livre'} aria-pressed={c.estado === 'livre' ? marcado(c) : undefined}
      className={`disp-cel ${c.estado}${marcado(c) ? ' sel' : ''}`} data-disp={`${c.data}:${c.turno}`}
      title={c.estado === 'livre' ? `Livre — ${dm(c.data)} ${c.turno === 'manha' ? 'manhã' : 'tarde'}` : c.itens.join('\n') || 'Já passou'}
      onClick={() => alternar(c)}>
      {c.estado === 'livre' ? (marcado(c) ? '✓ Escolhido' : 'Livre') : c.estado === 'ausente' ? c.itens[0] ?? 'Ausente' : c.estado === 'passado' ? '—' : <small>{c.itens[0]}</small>}
      {c.estado === 'ocupado' && c.itens.length > 1 && <small>+{c.itens.length - 1}</small>}
    </button>
  );

  return (
    <Popup aberto titulo={`Alocar agenda — chamado #${alvo.numero}`} aoFechar={aoFechar} largura={860}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao>
        <Botao variante="primario" carregando={gravando} disabled={!tarefas.length} onClick={gravar}>
          {tarefas.length ? `Atribuir (${tarefas.length} agenda${tarefas.length > 1 ? 's' : ''})` : 'Atribuir'}</Botao></>}>
      <p className="ajuda">{alvo.cliente ? `${alvo.cliente} · ` : ''}{alvo.titulo}{alvo.horas_previstas ? ` · ${alvo.horas_previstas} h previstas` : ''}</p>
      <div className="grade-campos">
        <Campo rotulo="Consultor" tipo="select" valor={consultor} aoMudar={setConsultor}
          opcoes={[{ valor: '', rotulo: 'Escolha…' }, ...pessoas.map(m => ({ valor: m.id, rotulo: m.nome }))]} />
        <Campo rotulo="Título da tarefa" valor={nome} aoMudar={setNome} maxLength={300} />
        <Campo rotulo="Forma de atendimento" tipo="select" valor={modalidade} aoMudar={setModalidade} opcoes={MODALIDADES} />
      </div>
      {!consultor && <p className="ajuda">Escolha o consultor para ver a agenda desta semana e da próxima.</p>}
      {carregando && <p className="ajuda"><span className="giro" /> Carregando a agenda…</p>}
      {consultor && grade && (
        <div className="disp" aria-label="Disponibilidade nas duas semanas">
          <div className="disp-legenda">
            <span><i style={{ background: '#dcfce7', borderColor: '#16a34a' }} />Livre ({livres})</span>
            <span><i style={{ background: 'var(--superficie-2)' }} />Ocupado</span>
            <span><i className="disp-leg-ausente" />Ausente</span>
            <span>Clique nos horários livres para escolher; manhã + tarde do mesmo dia viram dia inteiro.</span>
          </div>
          {semanas.map((s, i) => (
            <div key={s.dias[0]} className="disp-semana" data-semana={i}>
              <div className="disp-tit">{i === 0 ? 'Esta semana' : 'Próxima semana'} · {dm(s.dias[0])} a {dm(s.dias[4])}</div>
              <span />{s.dias.map((d, j) => <div key={d} className="disp-cab">{DIAS[j]} {dm(d)}</div>)}
              <div className="disp-turno">Manhã</div>{s.manha.map(celula)}
              <div className="disp-turno">Tarde</div>{s.tarde.map(celula)}
            </div>
          ))}
        </div>
      )}
      {erro && <p className="msg-erro" role="alert">{erro}</p>}
    </Popup>
  );
}
