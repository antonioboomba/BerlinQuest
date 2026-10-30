# Acera de Kreuzberg reproducida de la referencia

| Archivo | Qué es |
|---|---|
| `acera_referencia.png` | Referencia original (tramo de acera isométrico). |
| `ref_atlas.cjs` | Generador del atlas a partir de la referencia, sin texturas inventadas. |
| `sidewalk_ref.png` | Atlas generado = `public/assets/ground/sidewalk_ref.png`. |

## Cómo se construye

- La superficie de losas de la referencia es un paralelogramo de 2 × 4,1 casillas del juego (escala exacta del
  ancho de la acera: losas + bordillo). Se trabaja en coordenadas (s a lo largo, t a lo ancho) con una pequeña
  corrección de sesgo (las juntas de la referencia se desvían un poco).
- Se recortan sus piezas reales de junta a junta: 6 columnas de losas (las dos hileras comparten juntas) y 4 bloques
  de bordillo (juntas propias). Cada acera se recompone encadenando piezas en orden variado (semilla fija, sin repetir
  la misma pieza ni alternancias «a b a b»), así que todas las uniones caen en una junta. En x = 0 va el remate del
  extremo de la referencia.
- La cara vertical del bordillo (8 px) se pinta colgando de la arista, sobre la primera fila de calzada.
- Cada píxel promedia 4×4 muestras y se reduce a 28 colores de la propia referencia.

```
node ref_atlas.cjs acera_referencia.png sidewalk_ref.png 24 7 sur
```

Atlas de 24 × 5 baldosas de 64×32 (1536×160): filas y = 4, y = 5 (losas y bordillo) y cara del bordillo en y = 6
(acera norte); y = 9 (bordillo hacia la calzada) e y = 10 (acera sur, con su propia secuencia de piezas).

## En el juego

`public/assets/manifest.json` → `ground.sidewalk_ref` (`file`, `enabled`, `x0`). StreetScene pinta el atlas una vez
sobre la imagen del suelo; no cambia la geometría ni las colisiones. Con `enabled: false` (o sin el PNG) vuelven las
aceras de antes.
