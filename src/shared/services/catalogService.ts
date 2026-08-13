import { apiFetch } from "./apiClient";
import type { CountryCode } from "../types/models";

// Mismo criterio de envoltorio que authService.ts ({success, data}).
interface DocumentTypesApiResponse {
  success: boolean;
  data: Record<CountryCode, string>;
}

// GET /catalogs/document-types — público, sin auth (catalogRoutes.ts del
// backend: "es data de referencia para armar el formulario"). Mapa fijo de
// sigla de documento por país (ej. AR -> "DNI"), no cambia en la sesión — se
// pide una sola vez al montar, no en cada cambio de país (ver useDocumentTypes).
export function getDocumentTypes(): Promise<Record<CountryCode, string>> {
  return apiFetch<DocumentTypesApiResponse>("/catalogs/document-types").then((res) => res.data);
}
