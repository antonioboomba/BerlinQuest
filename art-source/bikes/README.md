# Bike Pack 01 · bicicletas de Kreuzberg

| Carpeta / archivo | Qué hay |
|---|---|
| `originales/` | El pack recibido sin tocar (4 ilustraciones de alta resolución, README y manifest del pack). Son **referencia**, no se usan en el juego. |
| `final/` | Las 4 bicis del juego: `bike_<nombre>_auto.png` (conversión) y `bike_<nombre>.png` (con retoque a mano). |
| `bikes_touch.cjs` | Retoque a mano a la escala final: cesta con calavera y (A), pegatinas de la turquesa, caja de madera con pulpo rojo y paloma de la de carga, cadena y candado de la roja. |
| `black/` | Pruebas anteriores de la bici negra (128×112 y 84×74, descartadas por demasiado grandes) y `bikepix.cjs`. |

## Escala final

Referencia: Tony mide ~75 px visibles (≈ 1,75 m). Las 4 bicis usan **el mismo factor** sobre el original
(0,0841), así conservan sus proporciones relativas; el sillín queda a la altura de la cintura de Tony.

| Bici | PNG (con 2 px de margen) | Objeto visible | Anclaje (apoyo entre ruedas) | Sombra (w×h, ángulo) | Posición en Kreuzberg |
|---|---|---|---|---|---|
| `bike_turquoise` | 50×55 | 46×52 | (24, 48) | 42×10, −21° | (1.6, 4.75), acera norte |
| `bike_black_basket` | 60×54 | 56×51 | (25, 48) | 44×10, −14° | (2.5, 4.75), acera norte |
| `bike_green_cargo` | 61×50 | 57×47 | (29, 44) | 48×10, −14° | (17.2, 9.55), plaza |
| `bike_red_locked` | 51×50 | 47×47 | (24, 43) | 42×10, −20° | (18.1, 9.55), plaza |

Escala 1 en el juego (mismo tamaño de píxel que Tony), contorno oscuro de 1 px, 20 colores por bici sacados
del original, alfa binario.

## Cómo se generan

```
cd art-source/bikes/black
MODE=avg node bikepix.cjs ../originales/bike_<nombre>.png ../final/bike_<nombre>_auto.png 0 0 20 0.0841
cd ..
node bikes_touch.cjs <nombre> final/bike_<nombre>_auto.png final/bike_<nombre>.png
```

`MODE=avg`: cada píxel es el promedio de su bloque cuantizado a la paleta (a este tamaño, el color dominante
daba demasiado ruido). Después se redibujan a mano los rasgos que la reducción borra.

Orientación: el eje de las ruedas sube hacia la derecha, igual que el de las bicis procedurales; no se reflejan.

## En el juego

`public/assets/manifest.json` → `props.<nombre>` (`file`, `enabled`, `anchor`, `shadow`). `StreetScene` usa
`propKey(<externa>, <procedural>)` en las 4 posiciones de siempre: misma colisión (0,9 × 0,4) y profundidad.
Si un PNG falta, no es válido o `enabled` es `false`, se dibuja la bici procedural de antes.
