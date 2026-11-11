import estilos from './Entrada.module.css';

export type AvisoSondeo = 'red' | 'servidor' | null;

/** El último sondeo de la mesa falló: se conserva lo pintado y se avisa sin tapar nada. */
export function AvisoConexion({ aviso }: { aviso: AvisoSondeo }) {
  if (!aviso) return null;
  return (
    <p className={estilos.aviso} role="status">
      {aviso === 'red' ? 'Perdimos la conexión un momento. Seguimos intentando.' : 'Estamos teniendo un problema de nuestro lado. Seguimos intentando.'}
    </p>
  );
}
