# 0004. SVG + Motion for visualizations; React Flow only for editable graphs

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

Diagrams must be crisp at any size, themeable in light and dark, accessible, server-renderable so pages are meaningful before JavaScript loads, and light enough for mobile.

## Options considered

1. **Hand-built SVG components + Motion for tweening** — accessible (`role="img"`, `<title>`, `<desc>`), themed with CSS tokens, renderable on the server.
2. **Canvas or WebGL** — fast for thousands of objects, but opaque to assistive technology and needs a separate text layer.
3. **Mermaid at runtime** — convenient authoring, but a large client bundle and output that cannot match the design system.
4. **React Flow** — excellent for user-editable node graphs; unnecessary weight for fixed diagrams.
5. **Full D3** — powerful, but most of it duplicates what React already does.

## Decision

Visualizations are SVG components styled only with design tokens. Movement between frames uses plain CSS transitions on `transform`, timed by a `--frame-ms` custom property the player sets (and sets to `0ms` under reduced motion). React Flow is reserved for the drag-and-connect system design builder and is lazy-loaded on that route. Individual `d3-*` modules may be used where scales or shapes genuinely help. Mermaid is deferred.

## Consequences

- Every diagram states its meaning in text and never relies on colour alone (icons, line styles and labels carry state).
- Very large simulations need aggregation rather than one SVG element per entity.

## Update (Phase 2)

Motion was planned for tweening, but CSS transitions proved sufficient: the frames are precomputed, so only position changes need interpolating. The `motion` dependency was removed rather than shipped unused. It can be reintroduced if a visualization needs layout animation or gestures.
