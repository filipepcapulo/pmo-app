// Conflito de horário antes de gravar tarefa(s): lista os choques com a agenda do consultor, ausências e o próprio lançamento
// (api.v1_conflitos_agenda, 0044) e pergunta se lança mesmo assim. Voltar deixa o lançamento como estava, com os dados preenchidos.
import type { Conflito } from '../api/execucao';
import { Botao } from './Botao';
import { dataCurta } from './FormComum';
import { Popup } from './Popup';

const TIPO = { agenda: 'Agenda', ausencia: 'Ausência', lote: 'Neste lançamento' };

export function ConflitosAgenda({ conflitos, gravando, aoVoltar, aoSeguir }: { conflitos: Conflito[]; gravando?: boolean; aoVoltar: () => void; aoSeguir: () => void }) {
  const n = conflitos.length;
  return (
    <Popup aberto titulo="Conflito de horário" aoFechar={aoVoltar} largura={600}
      rodape={<>
        <Botao onClick={aoVoltar}>Voltar ao lançamento</Botao>
        <Botao variante="primario" carregando={gravando} onClick={aoSeguir}>Lançar mesmo assim</Botao>
      </>}>
      <p>{n === 1 ? 'Há 1 choque' : `Há ${n} choques`} de horário na agenda. Lançar mesmo assim?</p>
      <ul className="conflitos" aria-label="Conflitos">
        {conflitos.map((c, i) => (
          <li key={i} className={`conflito conflito-${c.tipo}`}>
            <strong>{c.consultor ?? 'Consultor'}</strong> · {dataCurta(c.data)} · {c.horario}
            <small><span className="pilula pilula-neutra">{TIPO[c.tipo] ?? c.tipo}</span> {c.existente} — {c.descricao}</small>
          </li>
        ))}
      </ul>
    </Popup>
  );
}
