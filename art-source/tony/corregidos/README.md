# Corrección por edición de píxeles de los 8 fotogramas (candidata, sin activar)

Generado con `build8.cjs` (y `png.cjs`) a partir de `../tony_fixed.png`. No se ha modificado
nada de `../plantillas/` ni de `../tony_fixed.png`. Solo cambian los fotogramas 6–9 y 16–19;
los otros 12 son idénticos píxel a píxel. Nada escalado: todo a 1×, con las suelas como en la referencia.

| Frame | Método | Estado |
|---|---|---|
| 6, 7, 8 | Se quita la jarra y el asa. El torso y el brazo libre que tapaba se toman del fotograma alineado sin jarra (6←0, 7←5, 8←2). | Listo para revisión visual |
| 16, 17, 18 | Se borra la jarra y su contorno. El hombro que tapaba la espuma sale de F15. Brazo doblado en la misma postura. | Listo para revisión visual |
| 9 | Se borra el tronco (entre las piernas y a los lados) y se cierran con contorno los bordes de vaqueros y zapatillas. Postura sin cambios. | Listo para revisión visual |
| 19 | La caja tapaba todo lo que hay bajo la chaqueta: el final de la mochila y la chaqueta, la cadera y las piernas. No existen en ningún fotograma de espaldas sentado. Las piernas son un **montaje** con las de F10 (acortadas y separadas). | **NO TERMINADO: hace falta dibujarlo** |

`tony_candidata_960x88.png` es la hoja completa con estos 8 cambios. Solo sirve para pruebas.
