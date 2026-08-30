# ADR-002 — PWA web para el comensal, no app nativa

**Estado:** aceptada · **Fecha:** 2026-08-30

## Contexto
El comensal es un usuario de una sola visita, con hambre, sentado en una mesa. La Capa 0 del modelo de adopción exige cero fricción. Existe la intención de usar Flutter para la app del mesero y del admin más adelante.

## Decisión
La aplicación del comensal en el MVP es una PWA servida por HTTPS desde el mismo dominio de la API. La experiencia 3D usa `<model-viewer>`, que delega el AR al visor nativo del sistema operativo: Scene Viewer con ARCore en Android y AR Quick Look con USDZ en iOS.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| App nativa (Flutter) para el comensal | Pedirle a alguien que instale una app de 40 MB para ver un menú destruye la tasa de conversión. Ninguna métrica del MVP sobreviviría. |
| WebXR puro | Soporte inexistente en Safari iOS; obligaría a excluir a la mitad del mercado objetivo. |
| Vídeo o imágenes 360° en lugar de 3D | Más barato, pero elimina el AR sobre la mesa, que es exactamente la hipótesis a validar. |

## Consecuencias
- **Positivas:** el comensal llega al menú en un toque desde el QR. Actualizaciones instantáneas sin revisión de tiendas. Un solo código para iOS y Android.
- **Negativas:** sin acceso a APIs nativas avanzadas; el AR es el del sistema y no se puede personalizar la interfaz dentro de la sesión AR. Aceptable: la hipótesis es "ver el platillo en 3D cambia el comportamiento", no "nuestra interfaz AR es superior".
- **Implicación para v2:** la app de mesero sí puede ser Flutter nativa; el comensal permanece en web.

## Verificación
El flujo completo desde escanear hasta confirmar orden se ejecuta en Safari iOS 16 y Chrome Android 10 sin instalar nada. Prueba manual documentada en `07_Test_Strategy.md` §5.
