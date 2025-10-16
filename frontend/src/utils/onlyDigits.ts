// Deja ingresar solo números (0–9).
export const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
