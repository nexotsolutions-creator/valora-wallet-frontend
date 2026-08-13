const MIN_AGE_YEARS = 18;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Fecha límite para el <input type="date"> (18 años atrás de hoy), calculada
// una sola vez al cargar el módulo — no cambia entre renders. Se arma con los
// componentes locales de la fecha en vez de toISOString() (que convierte a
// UTC) para no correr un día la fecha límite en husos horarios donde la
// medianoche local cae del otro lado del corte UTC.
function getMaxBirthdate(): string {
  const today = new Date();
  const year = today.getFullYear() - MIN_AGE_YEARS;
  const month = today.getMonth() + 1;
  let day = today.getDate();

  // Si hoy es 29 de febrero (bisiesto) pero año-18 no es bisiesto, esa fecha
  // no existe — clampear al 28, el último día válido de febrero ese año.
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    day = 28;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const MAX_BIRTHDATE = getMaxBirthdate();

// El backend (Zod, ver authSchema.ts del repo backend) espera la fecha en
// DD/MM/YYYY, no en el formato ISO (YYYY-MM-DD) que devuelve un
// <input type="date"> nativo.
export function toBackendDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
