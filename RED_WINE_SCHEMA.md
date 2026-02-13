# Red Wine Schema (Червона Схема)

## Overview

Added support for red dry still wine production using the червона (red) schema.

## Parameters

```
Color:      Червоне
Style:      Сухе
CO2 Style:  Тихе
Scheme:     Червона
```

## Block Sequence

The red wine schema uses 7 blocks in this order:

### 1. Block 1: Гребеневіддокремлення, Подрібнення
- **Reused from white wine**
- Has top arrow with raw material conditions
- Outputs: Гребені (right arrow)
- Arrow out label: М'язга

### 2. Block 10: Бродіння м'язги (NEW)
- **Similar to Block 5** but for red wine fermentation
- Left inputs:
  - Холодоагент (double arrow)
  - ЧКД
- Right outputs: Гази бродіння

### 3. Block 11: Стікання м'язги, що бродить (NEW)
- **Similar to Block 2** but for red wine
- Name: "Стікання м'язги, що бродить"
- No special arrows (connects to next block)

### 4. Block 12: Доброджування (NEW)
- **New block specific to red wine**
- Post-fermentation process
- No special arrows

### 5. Block 4: Зняття з осаду
- **Reused from white wine**
- Sediment removal
- No special arrows

### 6. Block 13: Відпочинок (NEW)
- **New block specific to red wine**
- Resting period
- No special arrows

### 7. Block 9: Зберігання
- **Reused from white wine**
- Storage
- Has bottom arrow with calculated wine conditions

## Visual Flow

```
[Raw Material Conditions]
         ↓
  ┌─────────────┐
  │   Block 1   │──→ Гребені
  │Гребенев-    │
  │іддокремлення│
  └──────┬──────┘
         ↓ М'язга
Холодоагент ←→─┐
               ├─→ ┌─────────────┐
ЧКД ──────────→┘   │  Block 10   │──→ Гази бродіння
                   │  Бродіння   │
                   │   м'язги    │
                   └──────┬──────┘
                          ↓
                   ┌─────────────┐
                   │  Block 11   │
                   │  Стікання   │
                   │м'язги, що   │
                   │  бродить    │
                   └──────┬──────┘
                          ↓
                   ┌─────────────┐
                   │  Block 12   │
                   │Добро-       │
                   │джування     │
                   └──────┬──────┘
                          ↓
                   ┌─────────────┐
                   │   Block 4   │
                   │   Зняття    │
                   │  з осаду    │
                   └──────┬──────┘
                          ↓
                   ┌─────────────┐
                   │  Block 13   │
                   │ Відпочинок  │
                   └──────┬──────┘
                          ↓
                   ┌─────────────┐
                   │   Block 9   │
                   │ Зберігання  │
                   └──────┬──────┘
                          ↓
        [Wine Conditions]
```

## New Blocks Added

### Block 10
```json
{
  "id": "block_10",
  "name": "Бродіння м'язги",
  "order": 10,
  "left_inputs": [
    {"type": "double", "text": "Холодоагент"},
    {"text": "ЧКД"}
  ],
  "right_outputs": [
    {"text": "Гази бродіння"}
  ]
}
```

### Block 11
```json
{
  "id": "block_11",
  "name": "Стікання м'язги,\nщо бродить",
  "order": 11
}
```

### Block 12
```json
{
  "id": "block_12",
  "name": "Доброджування",
  "order": 12
}
```

### Block 13
```json
{
  "id": "block_13",
  "name": "Відпочинок",
  "order": 13
}
```

## Schema Definition

```json
{
  "id": "schema_red_dry_still",
  "name": "Червоне сухе тихе вино (червона схема)",
  "parameters": {
    "color": "Червоне",
    "style": "Сухе",
    "style_co2": "Тихе",
    "scheme_type": "Червона"
  },
  "blocks": [
    "block_1",
    "block_10",
    "block_11",
    "block_12",
    "block_4",
    "block_13",
    "block_9"
  ],
  "description": "Схема виробництва червоного сухого тихого вина за червоною схемою"
}
```

## Key Differences from White Wine

| Aspect | White Wine | Red Wine |
|--------|------------|----------|
| Fermentation | Block 5: Бродіння сусла | Block 10: Бродіння м'язги |
| Separation | Block 2: Відділення сусла | Block 11: Стікання м'язги |
| Side branch | Block 2-1: Пресування | None |
| Settling | Block 3: Відстоювання сусла | None |
| Post-fermentation | None | Block 12: Доброджування |
| Clarification | Block 6: Освітлення | None |
| Yeast removal | Block 7: Зняття з дріжджів | None |
| Equalization | Block 8: Егалізація | None |
| Resting | None | Block 13: Відпочинок |
| Shared blocks | Blocks 1, 4, 9 | Blocks 1, 4, 9 |

## Red Wine Process Flow

1. **Crushing and destemming** (Block 1) - Same as white wine
2. **Must fermentation** (Block 10) - Ferment on skins for color extraction
3. **Draining fermenting must** (Block 11) - Separate wine from skins
4. **Post-fermentation** (Block 12) - Complete fermentation
5. **Sediment removal** (Block 4) - Same as white wine
6. **Resting** (Block 13) - Allow wine to stabilize
7. **Storage** (Block 9) - Same as white wine

## Block Order Fix

**Important:** Updated `get_blocks_for_schema()` in `app.py` to preserve the order specified in the schema's blocks array, rather than sorting by the block's order field. This allows blocks to be reused in different schemas at different positions.

**Before:**
```python
schema_blocks.sort(key=lambda x: x.get('order', 0))  # Sorted by block.order
```

**After:**
```python
# Return blocks in the order specified by the schema.blocks array
for block_id in block_ids:
    if block_id in blocks_dict:
        schema_blocks.append(blocks_dict[block_id])
```

This fix allows Block 4 to appear:
- 5th position in white wine (after Block 3)
- 5th position in red wine (after Block 12)

## UI Changes

Enabled the previously disabled buttons:

### templates/color.html
```html
<!-- Before -->
<button class="btn btn-choice" onclick="selectChoice('color', 'Червоне')" disabled>Червоне</button>

<!-- After -->
<button class="btn btn-choice" onclick="selectChoice('color', 'Червоне')">Червоне</button>
```

### templates/scheme_type.html
```html
<!-- Before -->
<button class="btn btn-choice" onclick="selectChoice('scheme_type', 'Червона')" disabled>Червона</button>

<!-- After -->
<button class="btn btn-choice" onclick="selectChoice('scheme_type', 'Червона')">Червона</button>
```

## Testing

### 1. Test Schema API
```bash
curl http://localhost:5000/api/schemas
```

**Expected:** See both white and red schemas

### 2. Test Red Wine Flow
1. Navigate to: http://localhost:5000
2. Select: **Червоне** → **Сухе** → **Тихе** → **Червона**
3. Enter raw material conditions
4. View technology scheme

**Expected:** See 7-block red wine production flow

### 3. Verify Block Order
```bash
curl http://localhost:5000/api/schema-for-wine
# (after selecting red wine parameters in the app)
```

**Expected blocks order:**
```json
{
  "blocks": [
    {"id": "block_1", ...},
    {"id": "block_10", ...},
    {"id": "block_11", ...},
    {"id": "block_12", ...},
    {"id": "block_4", ...},
    {"id": "block_13", ...},
    {"id": "block_9", ...}
  ]
}
```

## Files Modified

1. **`app.py`** - Fixed block ordering logic
2. **`data/blocks.json`** - Added blocks 10, 11, 12, 13
3. **`data/schemas.json`** - Added red wine schema
4. **`templates/color.html`** - Enabled "Червоне" button
5. **`templates/scheme_type.html`** - Enabled "Червона" button

## Summary

✅ **Red wine schema fully implemented**  
✅ **4 new blocks added** (10, 11, 12, 13)  
✅ **3 blocks reused** (1, 4, 9)  
✅ **Block ordering fixed** (schema-driven instead of field-driven)  
✅ **UI buttons enabled**  
✅ **Ready for testing**  

The system now supports both white and red dry still wines! 🍷
