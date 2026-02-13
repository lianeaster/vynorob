# Parameter to Block Chain Mapping

This document shows which wine parameters create which chain of blocks in the schema.

## White Dry Still Wine (Біла Схема)

### Parameters
```
Color:      Біле
Style:      Сухе
CO2 Style:  Тихе
Scheme:     Біла
```

### Block Chain
```
Block 1:   Відділення гребенів
           ↑ (Top Arrow: Raw Material Conditions)

Block 2:   Відділення сусла самопливу
           ├─→ Block 2-1: Пресування (side branch to Block 4)

Block 3:   Відстоювання сусла

Block 4:   Зняття осаду
           ↑ (receives merge from Block 2-1)

Block 5:   Бродіння сусла

Block 6:   Освітлення виноматеріалу

Block 7:   Зняття з дріджів

Block 8:   Егалізація

Block 9:   Зберігання
           ↓ (Bottom Arrow: Calculated Wine Conditions)
```

## How to Read This

### Linear Flow
```
Block 1 → Block 2 → Block 3 → Block 4 → Block 5 → Block 6 → Block 7 → Block 8 → Block 9
```

### With Side Branch
```
Block 2 ──→ Block 2-1 (Пресування)
  ↓              ↓
Block 3        (merges into)
  ↓              ↓
Block 4 ←───────┘
```

### Complete Flow
```
[Raw Material] Sugar, Acidity, pH
       ↓
┌──────────────┐
│ Block 1      │ Відділення гребенів
└──────┬───────┘
       ↓ (М'язга)
┌──────────────┐
│ Block 2      │ Відділення сусла самопливу
└──┬───────┬───┘
   │       └──→ (Збіднена м'язга) → ┌──────────────┐
   │                                 │ Block 2-1    │ Пресування
   │                                 └──────┬───────┘
   ↓ (Сусло-самоплив)                      │ (Вичавки)
┌──────────────┐                            │
│ Block 3      │ Відстоювання сусла         │
└──────┬───────┘                            │
       ↓ (І фракція)                        │
┌──────────────┐←───────────────────────────┘
│ Block 4      │ Зняття осаду
└──────┬───────┘
       ↓
┌──────────────┐
│ Block 5      │ Бродіння сусла
└──────┬───────┘
       ↓
┌──────────────┐
│ Block 6      │ Освітлення виноматеріалу
└──────┬───────┘
       ↓
┌──────────────┐
│ Block 7      │ Зняття з дріджів
└──────┬───────┘
       ↓
┌──────────────┐
│ Block 8      │ Егалізація
└──────┬───────┘
       ↓
┌──────────────┐
│ Block 9      │ Зберігання
└──────┬───────┘
       ↓
[Wine Material] Sugar, Acidity, Alcohol
```

## Block Special Properties

### Block 1 (First Block)
- **has_top_arrow**: true
- **Displays**: Raw material conditions from input
  - Sugar (g/dm³)
  - Acidity (g/dm³)

### Block 2-1 (Side Branch)
- **is_side_branch**: true
- **connects_from**: block_2
- **connects_to**: block_4
- **Position**: Drawn to the right of main flow
- **Note**: This is why it has order 2.1 (between 2 and 3)

### Block 9 (Last Block)
- **has_bottom_arrow**: true
- **Displays**: Calculated wine conditions
  - Sugar (g/dm³) - residual
  - Acidity (g/dm³) - after fermentation
  - Alcohol (% vol) - calculated from sugar conversion

## Database Representation

### In `data/schemas.json`:
```json
{
  "parameters": {
    "color": "Біле",
    "style": "Сухе",
    "style_co2": "Тихе",
    "scheme_type": "Біла"
  },
  "blocks": [
    "block_1",
    "block_2",
    "block_2_1",  ← Side branch
    "block_3",
    "block_4",
    "block_5",
    "block_6",
    "block_7",
    "block_8",
    "block_9"
  ]
}
```

### In `data/blocks.json`:
```json
[
  {
    "id": "block_1",
    "name": "Відділення гребенів",
    "order": 1,
    "has_top_arrow": true
  },
  {
    "id": "block_2_1",
    "name": "Пресування",
    "order": 2.1,
    "is_side_branch": true,
    "connects_from": "block_2",
    "connects_to": "block_4"
  },
  {
    "id": "block_9",
    "name": "Зберігання",
    "order": 9,
    "has_bottom_arrow": true
  }
]
```

## How the System Works

1. **User selects parameters**: Біле → Сухе → Тихе → Біла

2. **System finds matching schema**:
   ```python
   if wine_data.color == "Біле" 
      AND wine_data.style == "Сухе"
      AND wine_data.style_co2 == "Тихе"
      AND wine_data.scheme_type == "Біла":
       return schema_white_dry_still
   ```

3. **System loads blocks**:
   ```python
   blocks = [block_1, block_2, block_2_1, ..., block_9]
   ```

4. **System renders in order**:
   - Sort by `order` field (1, 2, 2.1, 3, 4, ...)
   - Render main blocks vertically
   - Render side branches horizontally
   - Connect with arrows

## Future Wine Types

When adding new wine types, follow this pattern:

### Example: Red Dry Still Wine
```
Parameters:
  Color:      Червоне
  Style:      Сухе
  CO2 Style:  Тихе
  Scheme:     Червона

Blocks:
  Block R1: Подрібнення і гребеневіддокремлення (top arrow)
  Block R2: Бродіння на м'язгу
  Block R3: Пресування
  Block R4: Відділення сусла-самопливу
  ...
  Block RN: Зберігання (bottom arrow)
```

Simply add the blocks to `blocks.json` and create a schema in `schemas.json` with the appropriate parameters!
