import { useEffect, useState } from "react";
import { getDocumentTypes } from "../services/catalogService";
import { useRequestGuard } from "./useRequestGuard";
import type { CountryCode } from "../types/models";

// Dato fijo por sesión (ver catalogService.ts) — cacheado a nivel de módulo
// para que un segundo/tercer mount de este hook (ej. navegar a /usuario ida y
// vuelta) no dispare un GET nuevo ni vuelva a pasar por null (el salto de
// "Documento" al label real que se veía al remontar, 12/08). Vive mientras
// dure la pestaña, se resetea solo con un reload real.
let cachedResult: Record<CountryCode, string> | null = null;
// Promesa en vuelo, no solo el resultado ya resuelto: si dos consumidores
// montan casi a la vez (ej. CompleteProfileModal + esta misma pantalla
// cuando profileComplete es false, que se montan juntos) antes de que
// resuelva el primer fetch, el segundo tiene que esperar la MISMA promesa en
// vez de disparar un segundo GET.
let inFlightRequest: Promise<Record<CountryCode, string>> | null = null;

function fetchDocumentTypesOnce(): Promise<Record<CountryCode, string>> {
  if (cachedResult) return Promise.resolve(cachedResult);
  if (!inFlightRequest) {
    inFlightRequest = getDocumentTypes()
      .then((data) => {
        cachedResult = data;
        return data;
      })
      .finally(() => {
        // Se limpia siempre, no solo en éxito: si el fetch falló, el próximo
        // mount tiene que poder reintentar en vez de quedar pegado a un
        // fallo cacheado para el resto de la sesión. Si tuvo éxito,
        // cachedResult ya quedó seteado — la próxima llamada ni entra acá
        // (early return de arriba).
        inFlightRequest = null;
      });
  }
  return inFlightRequest;
}

// null mientras no resolvió o si falló — cada consumidor cae al label
// genérico "Documento" en cualquiera de los dos casos (ver documentLabel en
// CompleteProfileModal/Registro.tsx/Usuario.tsx), sin bloquear la UI por un
// catálogo que no cargó.
export function useDocumentTypes(): Record<CountryCode, string> | null {
  const [documentTypes, setDocumentTypes] = useState<Record<CountryCode, string> | null>(cachedResult);
  const requestGuard = useRequestGuard();

  useEffect(() => {
    if (documentTypes) return;
    const requestId = requestGuard.start();
    fetchDocumentTypesOnce()
      .then((data) => {
        if (requestGuard.isCurrent(requestId)) setDocumentTypes(data);
      })
      .catch(() => {
        // Silencioso a propósito: el fallback a "Documento" ya cubre el caso.
      });
    return () => {
      requestGuard.invalidate();
    };
  }, [documentTypes, requestGuard]);

  return documentTypes;
}
