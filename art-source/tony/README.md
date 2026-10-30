# Tony (protagonista) · material de referencia

Archivos fuente del sprite de Tony. **No los usa el juego**: el juego solo lee
`public/assets/characters/player.png` cuando `manifest.json` lo activa (hoy está desactivado).

| Archivo | Qué es |
|---|---|
| `tony_original_TEST_960x88.png` | Hoja original recibida (sin tocar). |
| `tony_fixed.png` | **Referencia técnica.** Misma hoja con correcciones mecánicas, sin redibujar: opacidad completa (el 98 % de los píxeles tenía alfa 250–253), línea de sombra eliminada en los frames 10–19 y pies alineados (frente +1 px, espalda +4 px, en bloque). |
| `plantillas/tony_frame_NN.png` | Los 8 fotogramas a redibujar, recortados de `tony_fixed.png` (48×88), para pintar encima. |
| `guia_8_fotogramas.png` | Guía ampliada: rojo = quitar, verde = mantener. |

## Fotogramas a redibujar (8)

Mismo diseño, ropa, proporciones, dirección y estilo pixel art. Escala 1×, lienzo de **48×88**, fondo
transparente, **píxeles 100 % opacos** (sin semitransparencias ni suavizado), suelas en **y = 85**.

| Frames | Qué cambiar | Qué mantener |
|---|---|---|
| 6, 7, 8 (frente) | Quitar la jarra. La mano queda **cerrada y vacía**, en la misma postura (≈ x 21–26, y 47–53). | Cuerpo, piernas, ciclo de paso tal cual. |
| 16, 17, 18 (espalda) | Quitar la jarra (zona ≈ x 32–42, y 33–51). Brazo en la misma postura, sin objeto. | Todo lo demás. |
| 9 (sentado, frente) | Quitar el tronco. Sentado **en el aire**, muslos horizontales a la altura **y 66–70**, pies apoyados en y 85. | Ropa, cara, manos sobre las rodillas. |
| 19 (sentado, espalda) | Quitar la caja. Misma altura de asiento (y 66–70); se verán caderas y piernas dobladas. | Espalda, mochila, capucha. |

Por qué: el juego dibuja encima el objeto real (cinco bebidas distintas en el bar; lámpara, libros y
cojín en la WG) y las sillas o bancos de cada escena. Si el sprite trae su propia jarra o asiento,
aparecen duplicados.

### Cara y ojos

Si se mejora la nitidez de la cara, **hay que aplicarla a los 20 fotogramas**, no solo a estos 8:
de lo contrario la cara cambia al pasar de caminar a llevar una bebida o a sentarse.
Opciones: (a) estos 8 con la cara idéntica a la actual y la mejora de cara después, en los 20;
(b) los 20 fotogramas de una vez.

## Nombres de archivo para el laboratorio

Entregar como `tony_frame_06.png` … `tony_frame_09.png` y `tony_frame_16.png` … `tony_frame_19.png`.

En http://localhost:5173/sprite-test.html:

1. «Cargar hoja 960×88» → `tony_fixed.png`.
2. Clic en el espacio **6** → «Cargar fotogramas sueltos» → los cuatro archivos 06–09 (se colocan en 6, 7, 8, 9).
3. Clic en el espacio **16** → «Cargar fotogramas sueltos» → los cuatro archivos 16–19.
4. Revisar análisis y vista previa → «Exportar player.png».

## Estado: activado

`public/assets/characters/player.png` = `tony_candidata_final_960x88.png` (7 fotogramas corregidos en
`corregidos/`, frame 19 redibujado en `frame19/` con las zapatillas del F10). En `manifest.json`,
`enabled: true` y `hand` (front [31, 62], back [39, 56]) para que bebidas y objetos queden en su mano.
Para volver al personaje anterior: `enabled: false`.
