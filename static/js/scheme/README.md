# Technology Scheme Rendering Modules

Modular architecture for wine production technology scheme visualization.

## Quick Start

```html
<!-- Load all modules in order -->
<script src="config.js"></script>
<script src="primitives.js"></script>
<script src="text-drawer.js"></script>
<script src="box-drawer.js"></script>
<script src="arrow-drawer.js"></script>
<script src="scheme-builder.js"></script>
<script src="scheme-renderer-new.js"></script>

<!-- Use -->
<script>
const canvas = document.getElementById('schemeCanvas');
const wineData = { /* your wine data */ };
const renderer = new SchemeRenderer(canvas, wineData);
renderer.drawScheme();
</script>
```

## Module Overview

| File | Class | Responsibilities | Lines |
|------|-------|-----------------|-------|
| `config.js` | `SchemeConfig` | Colors, dimensions, fonts, layout | 45 |
| `primitives.js` | `SchemePrimitives` | Basic shapes, arrowheads, lines | 107 |
| `text-drawer.js` | `TextDrawer` | Text rendering with backgrounds | 110 |
| `box-drawer.js` | `BoxDrawer` | Process box rendering | 114 |
| `arrow-drawer.js` | `ArrowDrawer` | Arrow rendering with labels | 206 |
| `scheme-builder.js` | `SchemeBuilder` | High-level orchestration | 71 |
| `scheme-renderer-new.js` | `SchemeRenderer` | Main facade | 143 |

**Total**: ~796 lines (vs 1291 original monolithic file)

## Architecture Layers

```
┌─────────────────────────────────────┐
│     SchemeRenderer (Facade)         │  ← Public API
├─────────────────────────────────────┤
│        SchemeBuilder                │  ← Business Logic
├─────────────────────────────────────┤
│  BoxDrawer    ArrowDrawer           │  ← Components
├─────────────────────────────────────┤
│  TextDrawer    SchemePrimitives     │  ← Utilities
├─────────────────────────────────────┤
│          SchemeConfig                │  ← Configuration
└─────────────────────────────────────┘
```

## Design Principles

1. **Single Responsibility**: Each class has one clear purpose
2. **Dependency Injection**: Pass dependencies via constructor
3. **Configuration Over Code**: Use `SchemeConfig` for all constants
4. **Composition Over Inheritance**: Build complex behavior from simple parts
5. **Backward Compatibility**: Same API as original monolithic version

## Example Usage

### Drawing a Custom Box

```javascript
const config = new SchemeConfig();
const ctx = canvas.getContext('2d');
const primitives = new SchemePrimitives(ctx, config);
const textDrawer = new TextDrawer(ctx, config);
const boxDrawer = new BoxDrawer(ctx, config, primitives, textDrawer);

boxDrawer.drawBaseBox({
    x: 400,
    y: 200,
    width: 260,
    height: 120,
    text: 'Custom\nProcess\nStep',
    fillBackground: true,
    strokeBorder: true
});
```

### Drawing a Custom Arrow

```javascript
const arrowDrawer = new ArrowDrawer(ctx, config, primitives, textDrawer);

arrowDrawer.drawHorizontalArrowWithLabel({
    x1: 100,
    y: 150,
    x2: 300,
    text: 'Material\nInput',
    direction: 'right'
});
```

### Changing Theme

```javascript
const config = new SchemeConfig();
config.colors.background = '#f5f5f5';
config.colors.line = '#333';
config.colors.text = '#000';
config.dimensions.lineWidth = 3;
config.fonts.box = '16px Arial';
```

## Status

### ✅ Completed
- Module extraction
- Helper class creation
- Documentation

### 🚧 In Progress
- Migration of drawing logic from monolithic file to `SchemeBuilder`

### 📋 Planned
- Unit tests for each module
- Additional scheme types (red wine, rosé, sparkling)
- Theme system
- Interactive editing

## Contributing

When adding new features:

1. Identify the appropriate module
2. Add method to that module
3. Use existing helper methods when possible
4. Update this README
5. Add tests

## See Also

- [REFACTORING_GUIDE.md](../../../REFACTORING_GUIDE.md) - Detailed migration plan
- [OPTIMIZATION_SUMMARY.md](../../../OPTIMIZATION_SUMMARY.md) - Optimization details
