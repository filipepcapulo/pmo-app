// Nome de alguém da equipe. Passar o mouse (ou focar com o teclado) mostra as skills em pílulas, certificadas
// destacadas (escopo §1.3). Componente único: toda tela que mostra uma pessoa da equipe usa este.
import { useId, useRef, useState } from 'react';
import type { Pessoa, Skill } from '../api/cadastros';
import { useEquipe } from '../estado/equipe';

export function PilulasSkills({ skills }: { skills: Skill[] }) {
  if (!skills.length) return <p className="ajuda">Sem skills cadastradas.</p>;
  return (
    <ul className="pilulas" aria-label="Skills">
      {skills.map(s => (
        <li key={s.modulo_id} className={`pilula${s.certificado ? ' pilula-cert' : ' pilula-neutra'}`}
          title={s.certificado ? 'Certificado' : 'Sem certificação'}>
          {s.certificado && <span aria-hidden>✓ </span>}{s.modulo}{s.certificado && <span className="so-leitor"> (certificado)</span>}
        </li>
      ))}
    </ul>
  );
}

export function NomePessoa({ id, pessoa, comAvatar }: { id?: string | null; pessoa?: Pessoa | null; comAvatar?: boolean }) {
  const { porId } = useEquipe();
  const m = porId.get(id ?? pessoa?.id ?? '');
  const nome = m?.nome ?? pessoa?.nome;
  const [pos, setPos] = useState<{ x: number; y: number; acima: boolean } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const dica = useId();
  if (!nome) return <span className="ajuda">—</span>;
  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const acima = r.bottom + 160 > window.innerHeight;
    setPos({ x: Math.max(8, Math.min(r.left, window.innerWidth - 288)), y: acima ? r.top - 6 : r.bottom + 6, acima });
  };
  const ini = m?.iniciais ?? pessoa?.iniciais ?? nome.slice(0, 2).toUpperCase();
  return (
    <span ref={ref} className="pessoa" tabIndex={0} aria-describedby={pos ? dica : undefined}
      onMouseEnter={abrir} onMouseLeave={() => setPos(null)} onFocus={abrir} onBlur={() => setPos(null)}>
      {comAvatar && <span className="pessoa-avatar" style={{ background: m?.cor ?? pessoa?.cor ?? undefined }} aria-hidden>{ini}</span>}
      <span className="pessoa-nome">{nome}</span>
      {pos && (
        <span id={dica} role="tooltip" className={`pessoa-dica${pos.acima ? ' acima' : ''}`} style={{ left: pos.x, top: pos.y }}>
          <strong>{nome}</strong>
          {m && <small>{m.perfil_nome}{m.ativo ? '' : ' · inativo'}</small>}
          <PilulasSkills skills={m?.skills ?? []} />
        </span>
      )}
    </span>
  );
}
