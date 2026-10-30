# Frame 19 · Tony sentado de espaldas (pendiente de redibujar)

Único fotograma que falta. Los otros 7 corregidos están en `../corregidos/` (commit a5a6568);
el frame 19 de esa carpeta es un montaje **provisional** y no debe usarse.

| Archivo | Qué es |
|---|---|
| `tony_frame_19_base.png` | Base editable 48×88, transparente. Frame 19 de `tony_fixed.png` sin la caja y **sin** piernas inventadas: solo se ha borrado (más 1 px de contorno donde la ropa quedaba cortada). |
| `guia_frame19.png` | Guía ampliada (×8): silueta original, mochila, asiento y = 66–70, zonas nuevas, suelas en y = 85, referencias y paleta. |
| `base19.cjs`, `guide19.cjs` | Scripts que generan los dos archivos anteriores. |

## Qué hay que dibujar

- **Cadera / vaqueros** (≈ x 8–37, y 63–70): el asiento del pantalón, apoyado en la banda y 66–70.
- **Pantorrillas** (≈ x 9–16 y x 30–37, y 71–79): bajan desde debajo de los muslos azules de los lados.
- **Talones de las zapatillas** (≈ x 7–17 y x 29–39, y 79–85): suelas en **y = 85**.
- Las rodillas van hacia delante y quedan tapadas por el cuerpo.

Las posiciones son aproximadas. No se toca nada de lo que ya existe: cabeza, pelo, capucha, chaqueta y mochila.
Sin silla, caja, tronco ni sombra. Estilo de los otros 19: 1×, contorno negro de 1 px, colores de la paleta,
píxeles 100 % opacos, sin suavizado.

## Aceptación

El frame 19 no se dará por terminado hasta comprobar en el juego (sillas del Bürgeramt y banco del U-Bahn)
que Tony parece sentado sin que el sprite lleve asiento propio.
