// Popup do plano de ação 5W2H (V7): cada plano é uma demanda tipo plano_acao do projeto. Usado na Tela de Projeto e no
// Portfólio (3.13.0, "+ Plano" na linha do projeto).
import { useEffect, useState } from 'react';
import { exec, PRIORIDADES, STATUS_DEMANDA } from '../api/execucao';
import type { DemandaProjeto, W5H2 } from '../api/projeto';
import { useEquipe } from '../estado/equipe';
import { caminhoEntidade, hashDe } from '../estado/rotas';
import { useSessao } from '../estado/sessao';
import { Botao } from './Botao';
import { Campo, Formulario } from './Campo';
import { Popup } from './Popup';
import { useToast } from './Toasts';

export function Popup5W2H({ plano, aoFechar, aoGravar }: { plano: Partial<DemandaProjeto> | null; aoFechar: () => void; aoGravar: () => void }) {
  const esc = useSessao().eu!.escritorio_id!;
  const avisar = useToast();
  const { lista } = useEquipe();
  const vazio = { what: '', why: '', where: '', when: '', who: '', how: '', how_much: '', status: 'backlog', prioridade: 'normal' };
  const [f, setF] = useState(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  useEffect(() => {
    if (!plano) return;
    const w: W5H2 = plano.w5h2 ?? {};
    setF({ what: plano.nome ?? w.what ?? '', why: w.why ?? '', where: w.where ?? '', when: plano.fim ?? w.when ?? '', who: plano.responsavel_id ?? w.who ?? '',
      how: w.how ?? '', how_much: w.how_much ?? '', status: plano.status ?? 'backlog', prioridade: plano.prioridade ?? 'normal' });
    setErro(null);
  }, [plano]);
  const enviar = async () => {
    if (!f.what.trim()) { setErro('Informe o quê (vira o nome da demanda).'); return; }
    setGravando(true);
    const w5h2 = { what: f.what.trim(), why: f.why.trim(), where: f.where.trim(), when: f.when || null, who: f.who || null, how: f.how.trim(), how_much: f.how_much.trim() };
    const comum = { nome: w5h2.what, fim: f.when || null, responsavel_id: f.who || null, prioridade: f.prioridade, w5h2 };
    try {
      if (plano?.id) {
        await exec.demandaSalvar(esc, { id: plano.id, versao: plano.versao, ...comum, status: f.status });
      } else {
        // a descrição leva o 5W2H para o ClickUp (o campo w5h2 é só do app)
        const desc = [['Por quê', w5h2.why], ['Onde', w5h2.where], ['Como', w5h2.how], ['Quanto', w5h2.how_much]]
          .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n') || null;
        await exec.demandaSalvar(esc, { projeto_id: plano!.projeto_id, tipo: 'plano_acao', descricao: desc, ...comum });
      }
      avisar(plano?.id ? 'Plano de ação gravado' : 'Plano de ação criado como demanda', 'ok');
      aoGravar();
    } catch (e) { setErro((e as Error).message); }
    setGravando(false);
  };
  const pessoas = [{ valor: '', rotulo: '— ninguém —' }, ...lista.filter(m => m.ativo).map(m => ({ valor: m.id, rotulo: m.nome }))];
  return (
    <Popup aberto={!!plano} titulo={plano?.id ? 'Plano de ação (5W2H)' : 'Novo plano de ação (5W2H)'} aoFechar={aoFechar} largura={680}
      rodape={<>
        {plano?.id && <a className="link a-esquerda" href={hashDe(caminhoEntidade('demanda', plano.id))} onClick={aoFechar}>Abrir a demanda</a>}
        <Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" carregando={gravando} onClick={enviar}>Gravar</Botao></>}>
      <Formulario aoEnviar={enviar}>
        <Campo rotulo="O quê (What)" valor={f.what} aoMudar={v => setF({ ...f, what: v })} obrigatorio maxLength={300} ajuda="Vira o nome da demanda." />
        <Campo rotulo="Por quê (Why)" tipo="textarea" valor={f.why} aoMudar={v => setF({ ...f, why: v })} maxLength={2000} />
        <div className="grade-campos">
          <Campo rotulo="Onde (Where)" valor={f.where} aoMudar={v => setF({ ...f, where: v })} maxLength={200} />
          <Campo rotulo="Quando (When)" tipo="date" valor={f.when} aoMudar={v => setF({ ...f, when: v })} ajuda="Prazo da demanda." />
          <Campo rotulo="Quem (Who)" tipo="select" valor={f.who} aoMudar={v => setF({ ...f, who: v })} opcoes={pessoas} />
          <Campo rotulo="Quanto (How much)" valor={f.how_much} aoMudar={v => setF({ ...f, how_much: v })} maxLength={200} />
          <Campo rotulo="Prioridade" tipo="select" valor={f.prioridade} aoMudar={v => setF({ ...f, prioridade: v })} opcoes={PRIORIDADES} />
          {plano?.id && <Campo rotulo="Status" tipo="select" valor={f.status} aoMudar={v => setF({ ...f, status: v })} opcoes={STATUS_DEMANDA} />}
        </div>
        <Campo rotulo="Como (How)" tipo="textarea" valor={f.how} aoMudar={v => setF({ ...f, how: v })} maxLength={4000} />
        {erro && <p className="msg-erro">{erro}</p>}
      </Formulario>
    </Popup>
  );
}
