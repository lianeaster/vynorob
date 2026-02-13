# Blocks and Schemas System - Implementation Summary

## What We Built

We've implemented a flexible, database-driven system for managing wine production schemas. The system maps wine parameters (color, style, CO2, scheme type) to specific production process blocks.

## Key Features

### ✅ Database Structure
- **Blocks Database** (`data/blocks.json`): Contains all production process steps
- **Schemas Database** (`data/schemas.json`): Maps wine parameters to block sequences
- Flexible structure supports complex relationships (side branches, merges)

### ✅ API Endpoints
1. `GET /api/blocks` - Get all available blocks
2. `GET /api/schemas` - Get all schema definitions
3. `GET /api/schema-for-wine` - Get the appropriate schema for current wine parameters

### ✅ Dynamic Schema Rendering
- Frontend automatically loads correct schema based on wine parameters
- Renders blocks dynamically from database
- Supports special cases:
  - Top arrows with raw material conditions
  - Bottom arrows with calculated wine conditions
  - Side branches (e.g., Пресування from block 2 to block 4)

## Current Example: White Dry Still Wine

**Parameters:** Біле → Сухе → Тихе → Біла

**Block Chain:**
```
┌─────────────────────────────────────┐
│  Виноград (Raw Material Conditions)  │
└──────────────┬──────────────────────┘
               ↓
        ┌──────────────┐
        │   Block 1    │
        │ Відділення   │
        │  гребенів    │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │   Block 2    │
        │ Відділення   │
        │    сусла     │
        │ самопливу    │
        └──┬───────┬───┘
           │       │
           │       └──→ Block 2-1: Пресування
           ↓                         │
        ┌──────────────┐            │
        │   Block 3    │            │
        │Відстоювання  │            │
        │   сусла      │            │
        └──────┬───────┘            │
               ↓                     │
        ┌──────────────┐←───────────┘
        │   Block 4    │
        │   Зняття     │
        │   осаду      │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │   Block 5    │
        │  Бродіння    │
        │   сусла      │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │   Block 6    │
        │ Освітлення   │
        │виноматеріалу │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │   Block 7    │
        │   Зняття     │
        │ з дріджів    │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │   Block 8    │
        │  Егалізація  │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │   Block 9    │
        │  Зберігання  │
        └──────┬───────┘
               ↓
┌─────────────────────────────────────┐
│ Виноматервіал (Wine Conditions)     │
│ - Sugar: calculated                 │
│ - Acidity: calculated               │
│ - Alcohol: calculated               │
└─────────────────────────────────────┘
```

## How It Works

### 1. Parameter Selection Flow
```
User selects:
1. Color: Біле
2. Style: Сухе
3. CO2 Style: Тихе
4. Scheme Type: Біла
```

### 2. Schema Matching
```python
def find_schema_for_wine(wine_data):
    """Find schema where ALL parameters match"""
    for schema in schemas:
        if all parameters match:
            return schema
    return None
```

### 3. Block Loading
```python
def get_blocks_for_schema(schema):
    """Get blocks referenced by schema"""
    block_ids = schema['blocks']
    blocks = [block for block in all_blocks if block.id in block_ids]
    return sorted(blocks, key=lambda x: x['order'])
```

### 4. Dynamic Rendering
```javascript
// Frontend loads schema
const { schema, blocks, wine_data } = await fetch('/api/schema-for-wine').json();

// Renderer draws blocks
const renderer = new SchemeRenderer(canvas, wine_data, blocks, schema);
renderer.drawScheme();
```

## Block Properties Explained

### Standard Block
```json
{
  "id": "block_3",
  "name": "Відстоювання сусла",
  "order": 3
}
```
- Renders as rectangular box
- Connected vertically in sequence

### First Block (with Raw Material Conditions)
```json
{
  "id": "block_1",
  "name": "Відділення гребенів",
  "order": 1,
  "has_top_arrow": true,
  "top_arrow_label": "Умови сировини"
}
```
- Has incoming arrow at top
- Arrow displays raw material parameters (sugar, acidity)

### Last Block (with Wine Conditions)
```json
{
  "id": "block_9",
  "name": "Зберігання",
  "order": 9,
  "has_bottom_arrow": true,
  "bottom_arrow_label": "Кондиції вина"
}
```
- Has outgoing arrow at bottom
- Arrow displays calculated wine parameters (sugar, acidity, alcohol)

### Side Branch Block
```json
{
  "id": "block_2_1",
  "name": "Пресування",
  "order": 2.1,
  "is_side_branch": true,
  "connects_from": "block_2",
  "connects_to": "block_4"
}
```
- Branches horizontally from one block to another
- Connects from Відділення сусла (block_2) to Зняття осаду (block_4)

## Testing the System

### 1. Test Block API
```bash
curl http://localhost:5000/api/blocks
```

### 2. Test Schema API
```bash
curl http://localhost:5000/api/schemas
```

### 3. Test Wine Schema Matching
1. Navigate to the app: http://localhost:5000
2. Select: Біле → Сухе → Тихе → Біла
3. Go to technology scheme page
4. Check browser console for loaded blocks

## Adding New Wine Types

### Example: Red Dry Still Wine

1. **Create blocks in `data/blocks.json`:**
```json
[
  {
    "id": "block_red_1",
    "name": "Подрібнення і гребеневіддокремлення",
    "order": 1,
    "has_top_arrow": true
  },
  {
    "id": "block_red_2",
    "name": "Бродіння на м'язгу",
    "order": 2
  },
  ...
]
```

2. **Create schema in `data/schemas.json`:**
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
    "block_red_1",
    "block_red_2",
    ...
  ]
}
```

3. **Test:**
   - Select parameters in the app
   - System automatically loads correct schema
   - Blocks render in correct order

## Next Steps

### Immediate Improvements
- [ ] Add more block metadata (inputs, outputs, conditions)
- [ ] Support for configurable side arrows (left/right inputs)
- [ ] Better handling of complex merges and branches

### Future Features
- [ ] Visual schema editor (drag-and-drop blocks)
- [ ] Import/export schemas
- [ ] Schema versioning
- [ ] Template blocks with pre-configured materials
- [ ] Multi-language support for block names

## Benefits of This System

1. **Flexibility**: Easy to add new wine types without code changes
2. **Maintainability**: Production logic in database, not hardcoded
3. **Scalability**: Can support unlimited wine types and variations
4. **Consistency**: All schemas follow same structure
5. **Testability**: Can validate schemas independently

## Files Modified/Created

### Created:
- `data/blocks.json` - Block definitions
- `data/schemas.json` - Schema definitions
- `BLOCKS_SCHEMAS_SYSTEM.md` - System documentation
- `IMPLEMENTATION_SUMMARY.md` - This file

### Modified:
- `app.py` - Added API endpoints and schema logic
- `templates/technology_scheme.html` - Updated to load schema data
- `static/js/scheme_renderer.js` - Added dynamic rendering support

## Conclusion

You now have a complete, database-driven blocks and schemas system! 

The database clearly defines:
- Which **parameters** create which **chain of blocks**
- The **order** and **relationships** between blocks
- Special block properties (top/bottom arrows, side branches)

The system automatically:
- Matches wine parameters to schemas
- Loads the correct blocks
- Renders them in the correct order
- Handles special cases

🎉 Ready for expansion to other wine types!
