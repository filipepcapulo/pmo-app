// Carrega dados da API para uma tela: estado de carregando/erro e recarregar depois de gravar.
import { useCallback, useEffect, useState } from 'react';

export function useCarga<T>(buscar: () => Promise<T>, deps: unknown[]) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recarregar = useCallback(async () => {
    setCarregando(true);
    try { setDados(await buscar()); setErro(null); } catch (e) { setErro((e as Error).message); }
    setCarregando(false);
  }, deps);
  useEffect(() => { recarregar(); }, [recarregar]);
  return { dados, erro, carregando, recarregar };
}
