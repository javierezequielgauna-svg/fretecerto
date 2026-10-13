/** FC-0001, FC-0002… (se agranda solo si pasa de 4 dígitos). */
export const formatoNumero = (prefijo: string, n: number, largo = 4): string => `${prefijo}-${String(n).padStart(largo, "0")}`;
