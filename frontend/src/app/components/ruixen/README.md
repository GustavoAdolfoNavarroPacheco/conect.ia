# Componentes basados en Ruixen UI

Los componentes de esta carpeta están **adaptados de [Ruixen UI](https://github.com/ruixenui/ruixen.com)** (licencia MIT,
© 2025 Ruixen UI; el texto completo está en [LICENSE.md](LICENSE.md)). Esa licencia exige conservar su aviso de copyright,
por eso este archivo y la licencia viajan con el código.

## Qué se cambió al adaptarlos

- Sin `next/link`, `next/image` ni `"use client"`: usan etiquetas estándar y React.
- Importaciones relativas (el proyecto no define el alias `@` en `tsconfig`).
- Colores y radios salen de los tokens de Conect.ia (`--brand`, `--card`, `--border`…), no de los de shadcn por defecto,
  y respetan los modos claro y oscuro.
- Textos en español y datos reales de la app donde corresponde.
- Animaciones con `motion/react` (ya instalado) y reducción de movimiento respetada.

## Origen de cada pieza

Cada archivo indica en su cabecera si es una **adaptación del código MIT** de Ruixen o un **componente propio inspirado**
en la vista previa de la biblioteca (cuando el código fuente solo está disponible tras iniciar sesión en 21st.dev).

La evaluación completa, componente por componente, está en [docs/evaluacion-ruixen-ui.md](../../../../../docs/evaluacion-ruixen-ui.md).
