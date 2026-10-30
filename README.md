# BERLIN QUEST — Learn to Survive

RPG isométrico en pixel art para aprender alemán (A1 → B2) viviendo en Berlín.

```bash
npm install
npm run dev        # juego Phaser:          http://localhost:5173/
                   # versión clásica React:  http://localhost:5173/classic.html
npm run build
```

## Controles

| Tecla | Acción |
|---|---|
| WASD / flechas | Caminar (Shift = correr) |
| E / Espacio | Interactuar, avanzar diálogo, elegir |
| 1–5, ↑↓, Enter | Elegir respuesta o bebida |
| M · I · P | Mapa · Inventario · Progreso |
| T | Mostrar/ocultar traducciones |
| ESC | Pausa (nivel A1–B2, voz, nombre, reiniciar) |

En pantallas táctiles aparecen un joystick virtual y un botón E.

## Juego Phaser (`src/game/`)

```
src/game/
├── main.ts              Configuración de Phaser (pixelArt, escalado RESIZE)
├── iso.ts               Proyección isométrica 2:1; el mundo se simula en coordenadas cartesianas
├── art/                 Pixel art generado por código al arrancar
│   ├── characters.ts      Avatares 48×88 · 20 frames (frente/espalda × quieto/caminar/cargar/sentado)
│   ├── buildings.ts       Fachadas isométricas (ventanas, balcones, neones, letreros) y cajas genéricas
│   ├── props.ts           Farolas, árboles, bicis, papeleras BSR, Litfaßsäule, mobiliario de bar, bebidas
│   ├── tiles.ts           Adoquines, losas, madera, agua… pintados en coordenadas (u, v) de baldosa
│   └── palette.ts · font.ts · pixel.ts
├── scenes/
│   ├── BootScene.ts       Genera texturas y animaciones
│   ├── WorldScene.ts      Base: movimiento, colisiones, cámara, interacción E, luces
│   ├── StreetScene.ts     Calle de Kreuzberg: bar, Bürgeramt, U-Bahn, club, canal, NPCs
│   ├── BarScene.ts        Interior del bar y misión «Tu primer turno»
│   └── UIScene.ts         HUD, minimapa, bocadillos, diálogos, nevera, paneles, pausa
├── world/               Actor (sprite animado + profundidad), NPC brains, colisiones + A*
├── data/bar.ts          Bebidas, pedidos por nivel CEFR, diálogos en alemán
└── state/GameState.ts   XP, dinero, vocabulario (SRS de src/engine), misión, guardado local
```

### Dirección visual (estilo «social sim» isométrico)

- Baldosas de **64×32** y avatares de **48×88** px (frames), cabeza grande y contorno oscuro.
- Zoom de cámara en pasos de 0,5 (2× en 1600×900) para que los personajes se lean bien.
- Paleta pastel de atardecer: tres tonos por cara isométrica (techo claro, fachada media, lateral oscuro).
- Tipografía: **DotGothic16** (OFL, vía `@fontsource/dotgothic16`, servida localmente): pixel, nítida,
  con «ß», umlauts y «€» inequívocos. Tamaños múltiplos de 4 (16/20/24/28 px).
  No se usa `letterSpacing` de Phaser: dibuja letra a letra y rompe emojis y glifos.

### Sprites externos (PNG profesionales)

- **Dónde va el protagonista:** `public/assets/characters/player.png` (formato y medidas en
  `public/assets/characters/README.md`: PNG transparente de 960×88, 20 frames de 48×88).
- **Probarlo sin tocar el juego:** `npm run dev` y abrir http://localhost:5173/sprite-test.html
  (20 frames con marcadores de pies, mano, retrato y bocadillo; 4 direcciones; paseo con WASD;
  también admite arrastrar un PNG).
- **Activarlo en el juego:** en `public/assets/manifest.json` poner `"enabled": true` en `player`.
  Mientras sea `false`, el juego sigue usando el arte procedural.
- **Respaldo automático:** si el PNG falta o no mide 960×88, `BootScene` avisa en la consola y genera el
  arte procedural. Código: `src/game/art/sprites.ts` y `src/game/scenes/BootScene.ts`.

### Sustituir el arte procedural por spritesheets dibujados

Todas las texturas se registran en `BootScene` con claves estables (`player`, `mehmet`, `lamp`, `tree0`,
`drink_bier`, `tile_cobble_0`…). Para usar arte hecho a mano basta con cargar un PNG con la misma clave
y el mismo formato de frames (personajes: 20 frames de 48×88 en una fila; ver `art/characters.ts`).

## Versión clásica (React, `classic.html`)

Misión del Bürgeramt por diálogos, repaso SRS y panel de progreso.

### Arquitectura

```
src/
├── engine/            Motor (sin React): lógica pura y testeable
│   ├── types.ts         Tipos: jugador, nodos de diálogo, misiones, SRS…
│   ├── state.ts         Reducer del juego + comprobación automática de logros
│   ├── dialogue.ts      Resolución de textos por nivel, condiciones, efectos de sesión
│   ├── evaluate.ts      Corrección: huecos, escritura libre por reglas, deletreo
│   ├── srs.ts           Repetición espaciada (SM-2 simplificado)
│   ├── progression.ts   XP, niveles, rangos de habilidad, desbloqueos
│   ├── storage.ts       Guardado en localStorage, migración, exportar/importar
│   └── npc/provider.ts  Interfaz de conversación con NPCs (guionizada; lista para IA)
├── data/              Contenido educativo (solo datos)
│   ├── missions/        buergeramt.ts (jugable), upcoming.ts (bar, WG, club)
│   ├── vocabulary.ts    Vocabulario con artículo, plural, ejemplo y nivel
│   └── locations, items, achievements, countries, backgrounds
├── screens/           Pantallas (bienvenida, creación, mapa, misión, vocabulario, progreso)
└── components/        UI reutilizable (avatar, transcripción, paneles de respuesta…)
```

## Añadir una misión

1. Crea `src/data/missions/<id>.ts` con un objeto `Mission` y su lista de nodos.
2. Tipos de nodo: `npc`, `narration`, `choice`, `cloze`, `free`, `spell`, `branch`, `end`.
3. Los textos aceptan variantes por nivel: `{ A1: '…', B1: '…' }` (se usa la más alta ≤ nivel del jugador).
4. Regístrala en `src/data/missions/index.ts` y enlázala desde `locations.ts`.

Las reglas de escritura libre (`FreeRule`) reciben el texto en minúsculas, sin puntuación y con umlauts
transcritos (`ü → ue`, `ß → ss`).

## IA para NPCs

`NpcConversationProvider` (en `engine/npc/provider.ts`) recibe el nodo (objetivo, reglas, respuestas modelo),
el texto del jugador y el contexto, y devuelve la réplica del NPC más la evaluación. Hoy se usa
`scriptedProvider` (offline). Un proveedor con LLM puede implementar la misma interfaz y usar el
guionizado como alternativa si falla.
