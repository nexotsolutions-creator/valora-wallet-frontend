export type CurrencyCode = 'USD' | 'EUR' | 'ARS';
export type TransactionType = 'BUY' | 'SELL' | 'EXCHANGE' | 'DEPOSIT' | 'TRANSFER_OUT' | 'TRANSFER_IN';

// Códigos ISO 3166-1 alpha-2 de los 19 países de LATAM que acepta el backend
// (ver PAISES_LATAM en authSchema.ts del repo de backend) — mismo orden, mismos
// valores, verificado contra el código real, no reconstruido de memoria.
export type CountryCode =
  | "AR" | "BO" | "BR" | "CL" | "CO" | "CR" | "CU" | "EC" | "SV"
  | "GT" | "HN" | "MX" | "NI" | "PA" | "PY" | "PE" | "DO" | "UY" | "VE";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  // Null para altas por Google sin celular cargado todavía.
  phone: string | null;
  // Nunca null, ni en altas por Google sin perfil completo — el backend le
  // asigna "AR" por defecto en la creación (verificado contra authController.ts
  // del backend), así que el frontend no tiene que contemplar ese caso.
  country: CountryCode;
  // "du" = Documento Único — nombre real del campo en el backend (varía de
  // formato según country: DNI en AR, etc). Null para altas por Google sin
  // documento cargado todavía.
  du: string | null;
  // true solo si phone y du están cargados — gatilla el modal de "completar
  // perfil" en DashboardLayout cuando es false (ver CompleteProfileModal).
  profileComplete: boolean;
}

export interface Wallet {
  id: string;
  cvu: string;
  alias: string;
}

export interface Balance {
  id: string;
  walletId: string;
  currencyCode: CurrencyCode;
  amount: number;
}

export interface Transaction {
  id: string;
  walletId: string;
  transactionType: TransactionType;
  // El backend manda null en el lado que no aplica (ej. sourceCurrency/sourceAmount
  // en un DEPOSIT) — reflejado acá tal cual, no como el `CurrencyCode`/`number`
  // no-nulos que tenía antes este tipo.
  sourceCurrency: CurrencyCode | null;
  targetCurrency: CurrencyCode | null;
  sourceAmount: number | null;
  targetAmount: number | null;
  exchangeRate: number | null;
  resultingBalance: number;
  createdAt: string;
}
