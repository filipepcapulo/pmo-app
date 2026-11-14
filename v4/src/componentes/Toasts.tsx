// Avisos rápidos no canto (somem sozinhos; erro fica mais tempo).
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tipo = 'ok' | 'erro' | 'info';
interface Toast { id: number; texto: string; tipo: Tipo }
const Ctx = createContext<(texto: string, tipo?: Tipo) => void>(() => {});
export const useToast = () => useContext(Ctx);

let seq = 0;
export function ProvedorToasts({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([]);
  const avisar = useCallback((texto: string, tipo: Tipo = 'info') => {
    const id = ++seq;
    setLista(l => [...l.slice(-3), { id, texto, tipo }]);
    setTimeout(() => setLista(l => l.filter(t => t.id !== id)), tipo === 'erro' ? 7000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className="toasts" aria-live="polite">
        {lista.map(t => (
          <div key={t.id} className={`toast toast-${t.tipo}`} role={t.tipo === 'erro' ? 'alert' : 'status'}
            onClick={() => setLista(l => l.filter(x => x.id !== t.id))}>{t.texto}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
