# Sprites de personajes

Coloca aquí los PNG de personajes. El protagonista va exactamente en:

```
public/assets/characters/player.png
```

## Formato obligatorio

- PNG con fondo transparente, **960 × 88 px**: 20 frames de **48 × 88** en una sola fila.
- Arte a escala 1× (el juego lo amplía sin suavizado).
- Orden de frames:

| Frames | Vista | Animación |
|---|---|---|
| 0–1 | frente (mira abajo-derecha) | quieto (2 fps) |
| 2–5 | frente | caminar (8 fps) |
| 6 | frente | quieto con objeto en la mano |
| 7–8 | frente | caminar con objeto (secuencia 7, 6, 8, 6) |
| 9 | frente | sentado |
| 10–19 | espalda (mira arriba-derecha) | mismo orden que 0–9 |

- Las direcciones hacia la izquierda son el espejo horizontal (evita texto o asimetrías importantes).
- **Pies**: centrados en x = 24, suelas en y = 85–86 de cada frame.
- **Mano** (objetos en poses de cargar): ≈ (43, 46).
- **Cabeza** dentro de x 6–42, y 0–36 (se recorta para el retrato del HUD).

## Probar antes de usarlo en el juego

1. Copia el PNG aquí como `player.png`.
2. Arranca `npm run dev` y abre http://localhost:5173/sprite-test.html
   (también puedes arrastrar un PNG a esa página sin copiarlo).
3. Revisa frames, direcciones, pies, mano y paseo.

## Activarlo en el juego (solo cuando esté aprobado)

En `public/assets/manifest.json`, cambia `"enabled": false` por `"enabled": true` en la entrada `player`.
Si el archivo falta o no mide 960 × 88, el juego vuelve automáticamente al arte procedural.
Otros personajes usan su nombre de textura (`mehmet.png`, `anna.png`, `sophie.png`…) y una entrada igual en el manifiesto.
