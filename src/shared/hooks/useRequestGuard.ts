import { useRef } from "react";

export interface RequestGuard {
  /** Arranca una corrida nueva y devuelve su id — llamar antes de disparar el request. */
  start(): number;
  /** true si el id sigue siendo el de la corrida más reciente (nadie arrancó otra después). */
  isCurrent(id: number): boolean;
  /** Invalida cualquier corrida en vuelo sin arrancar una nueva (ej. al desmontar). */
  invalidate(): void;
}

// Contador de generación, no un boolean reseteado a mano: con un solo flag
// compartido entre corridas, una corrida ANTERIOR que sigue en vuelo puede
// "revivir" si el reset de la corrida nueva pisa el true que había puesto el
// cleanup de la vieja — acá cada corrida compara contra su propio id
// capturado al arrancar, así que no hay reset que pueda borrar la señal de
// una corrida anterior. Identidad estable entre renders (memoizada en un
// ref) para poder usarse como dependencia de efectos/callbacks sin
// dispararlos de nuevo en cada render.
export function useRequestGuard(): RequestGuard {
  const idRef = useRef(0);
  const apiRef = useRef<RequestGuard | undefined>(undefined);
  if (!apiRef.current) {
    apiRef.current = {
      start: () => ++idRef.current,
      isCurrent: (id: number) => idRef.current === id,
      invalidate: () => {
        idRef.current += 1;
      },
    };
  }
  return apiRef.current;
}
