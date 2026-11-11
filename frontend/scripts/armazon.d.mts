export function entradasDelArmazon(entradas: { url: string; revision: string | null; size: number }[]): Promise<{ manifest: typeof entradas; warnings: string[] }>;
export function calcularArmazon(dist: string, archivos: string[]): { js: Set<string>; css: Set<string> };
export function listarDist(dist: string, carpeta?: string): string[];
export function archivosDeLaPrecarga(dist: string, archivos: string[]): string[];
