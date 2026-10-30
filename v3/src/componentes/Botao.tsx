import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma';

export function Botao({ variante = 'secundario', carregando, className, children, disabled, ...resto }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; carregando?: boolean }) {
  return (
    <button type="button" {...resto} disabled={disabled || carregando} aria-busy={carregando || undefined}
      className={`bt bt-${variante}${className ? ' ' + className : ''}`}>
      {carregando && <span className="giro" aria-hidden />}
      {children}
    </button>
  );
}
