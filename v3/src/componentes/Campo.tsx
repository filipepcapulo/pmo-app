// Formulário: rótulo + campo + ajuda/erro, no mesmo padrão em todas as telas.
import { useId, type FormEvent, type ReactNode } from 'react';

type Opcao = { valor: string; rotulo: string };

export function Campo({ rotulo, valor, aoMudar, tipo = 'text', opcoes, erro, ajuda, obrigatorio, ...resto }: {
  rotulo: string; valor: string; aoMudar: (v: string) => void;
  tipo?: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select' | 'password';
  opcoes?: Opcao[]; erro?: string | null; ajuda?: string; obrigatorio?: boolean;
  placeholder?: string; autoComplete?: string; inputMode?: 'numeric' | 'email' | 'text'; maxLength?: number; name?: string;
}) {
  const id = useId();
  const comum = {
    id, name: resto.name, value: valor, required: obrigatorio, 'aria-invalid': erro ? true : undefined,
    'aria-describedby': erro || ajuda ? id + '-a' : undefined,
  };
  return (
    <div className={`campo${erro ? ' campo-erro' : ''}`}>
      <label htmlFor={id}>{rotulo}{obrigatorio && <span className="obrig" aria-hidden> *</span>}</label>
      {tipo === 'textarea' ? <textarea {...comum} rows={3} onChange={e => aoMudar(e.target.value)} placeholder={resto.placeholder} maxLength={resto.maxLength} />
        : tipo === 'select' ? (
          <select {...comum} onChange={e => aoMudar(e.target.value)}>
            {(opcoes ?? []).map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        ) : <input {...comum} type={tipo} onChange={e => aoMudar(e.target.value)} {...resto} />}
      {(erro || ajuda) && <small id={id + '-a'} className={erro ? 'msg-erro' : 'ajuda'}>{erro || ajuda}</small>}
    </div>
  );
}

export function Formulario({ aoEnviar, children, className }: { aoEnviar: () => void; children: ReactNode; className?: string }) {
  return (
    <form className={`formulario${className ? ' ' + className : ''}`} noValidate
      onSubmit={(e: FormEvent) => { e.preventDefault(); aoEnviar(); }}>{children}</form>
  );
}
