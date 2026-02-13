# Wine Production Blocks System 🍷

## Quick Overview

We've implemented a **database-driven blocks system** where wine parameters automatically generate the correct production schema.

```
Wine Parameters → Schema Matching → Block Chain → Visual Diagram
```

## What You Asked For ✅

> "All things created inside scheme should be called 'block'. Different schemas will be with different blocks. We should have in DB reflection, what chain of parameters will create what chain of blocks in the scheme."

**✅ Implemented:**
- ✅ All production steps are called "blocks"
- ✅ Database stores block definitions (`data/blocks.json`)
- ✅ Database stores parameter-to-blocks mappings (`data/schemas.json`)
- ✅ System automatically matches parameters to correct block chain
- ✅ Block 1 has top arrow with raw material conditions
- ✅ Block 9 has bottom arrow with calculated wine conditions
- ✅ Block 2-1 (Пресування) branches from block 2 to block 4

## Your Example Working

**Parameters:** Біле → Сухе → Тихе → Біла

**Block Chain:**
```
1. Відділення гребенів (⬆️ Raw conditions arrow)
2. Відділення сусла самопливу
   2-1. Пресування (→ branches to block 4)
3. Відстоювання сусла
4. Зняття осаду (⬅️ merge from 2-1)
5. Бродіння сусла
6. Освітлення виноматеріалу
7. Зняття з дріджів
8. Егалізація
9. Зберігання (⬇️ Wine conditions arrow)
```

## Database Files

### `data/blocks.json` - Block Definitions
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
  ...
]
```

### `data/schemas.json` - Parameter Mappings
```json
[
  {
    "id": "schema_white_dry_still",
    "parameters": {
      "color": "Біле",
      "style": "Сухе",
      "style_co2": "Тихе",
      "scheme_type": "Біла"
    },
    "blocks": [
      "block_1", "block_2", "block_2_1", 
      "block_3", "block_4", "block_5",
      "block_6", "block_7", "block_8", "block_9"
    ]
  }
]
```

## How It Works

1. **User selects parameters** in the app
2. **System finds matching schema** based on ALL parameters
3. **System loads blocks** from schema definition
4. **Frontend renders blocks** in correct order with arrows

## API Endpoints

```bash
# Get all blocks
GET /api/blocks

# Get all schemas
GET /api/schemas

# Get schema for current wine
GET /api/schema-for-wine
```

## Testing

```bash
# Start server
python3 app.py

# Test API
curl http://localhost:5000/api/blocks
curl http://localhost:5000/api/schemas

# Test in browser
open http://localhost:5000
# Select: Біле → Сухе → Тихе → Біла
# Go to technology scheme page
```

## Adding New Wine Types

Just edit the JSON files - **no code changes needed!**

1. Add blocks to `data/blocks.json`
2. Create schema in `data/schemas.json`
3. Done! ✨

See `HOW_TO_ADD_WINE_TYPE.md` for detailed guide.

## Documentation

- 📘 `BLOCKS_SCHEMAS_SYSTEM.md` - System architecture
- 📗 `IMPLEMENTATION_SUMMARY.md` - What we built
- 📙 `PARAMETER_BLOCK_MAPPING.md` - Parameter-to-blocks reference
- 📕 `HOW_TO_ADD_WINE_TYPE.md` - Step-by-step guide for new types

## Next Steps

You can now:
1. ✅ Add more wine types by editing JSON files
2. ✅ Modify block definitions without code changes
3. ✅ Create complex schemas with branches and merges
4. ✅ System automatically handles rendering

## Example: Adding Semi-Dry Wine

```json
// In data/schemas.json, add:
{
  "id": "schema_white_semidry_still",
  "parameters": {
    "color": "Біле",
    "style": "Напівсухе",  // ← Only difference
    "style_co2": "Тихе",
    "scheme_type": "Біла"
  },
  "blocks": ["block_1", "block_2", ... "block_9"]
}
```

That's it! Select Напівсухе in the app and it works!

## Key Features

✨ **Database-driven** - All logic in JSON, not code  
✨ **Flexible** - Easy to add new wine types  
✨ **Maintainable** - Clear separation of data and code  
✨ **Automatic** - System matches and renders automatically  
✨ **Documented** - Complete docs for future development  

## Files Created/Modified

**Created:**
- `data/blocks.json` - Block definitions
- `data/schemas.json` - Schema mappings
- `BLOCKS_SCHEMAS_SYSTEM.md` - Architecture docs
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `PARAMETER_BLOCK_MAPPING.md` - Reference guide
- `HOW_TO_ADD_WINE_TYPE.md` - Tutorial
- `BLOCKS_SYSTEM_README.md` - This file

**Modified:**
- `app.py` - Added schema APIs
- `templates/technology_scheme.html` - Loads schema data
- `static/js/scheme_renderer.js` - Dynamic rendering

## Summary

✅ **Database reflects parameter-to-blocks mapping**  
✅ **Block 1 has top arrow with raw conditions**  
✅ **Block 9 has bottom arrow with wine conditions**  
✅ **Block 2-1 branches from 2 to 4**  
✅ **Easy to add new wine types**  

🎉 **System is complete and ready for expansion!**
