# Bike Pack 01 · bicicletas de Kreuzberg

| Carpeta | Qué hay |
|---|---|
| `originales/` | El pack recibido sin tocar (4 ilustraciones de alta resolución, README y manifest del pack). Son **referencia**, no se usan en el juego. |
| `black/` | Bicicleta negra con cesta en pixel art para el juego (84×74, escala 1, mismo tamaño de píxel que Tony). |

## black/

- `bikepix.cjs`: conversión de la ilustración a pixel art: paleta de 32 colores sacada del original, cada píxel
  toma el color dominante de su bloque (no un promedio), alfa binario, sin píxeles sueltos y contorno oscuro
  de 1 px. `node bikepix.cjs ../originales/bike_black_basket.png bike_black_84_auto.png 84 74 32`
- `bike84_touch.cjs`: retoque a mano: cesta de alambre redibujada con la pegatina de la calavera y la (A)
  anarquista legibles a tamaño real. `node bike84_touch.cjs bike_black_84_auto.png bike_black_84.png`
- `bike_black_84.png` = `public/assets/props/bike_black.png`.

Orientación: el eje de las ruedas sube hacia la derecha, igual que el de las bicis procedurales; solo cambia
el sentido (manillar a la izquierda). No se refleja: al reflejarla el eje quedaría perpendicular a la acera.

En el juego: entrada `props.bike_black` de `public/assets/manifest.json` (anclaje = punto medio entre los
apoyos de las ruedas, sombra del juego debajo). Si falta el PNG o se desactiva, se dibuja la bici procedural.
