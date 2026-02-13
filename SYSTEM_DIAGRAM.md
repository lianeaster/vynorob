# System Architecture Diagram

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                                                                 │
│  [Біле] → [Сухе] → [Тихе] → [Біла] → [Generate Schema]       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ POST /api/save-choice
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                       FLASK APPLICATION                         │
│                          (app.py)                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  find_schema_for_wine(wine_data)                        │  │
│  │  ├─ Match ALL parameters                                │  │
│  │  ├─ color: Біле                                         │  │
│  │  ├─ style: Сухе                                         │  │
│  │  ├─ style_co2: Тихе                                     │  │
│  │  └─ scheme_type: Біла                                   │  │
│  │                                                          │  │
│  │  get_blocks_for_schema(schema)                          │  │
│  │  ├─ Load block definitions                              │  │
│  │  ├─ Filter by schema.blocks                             │  │
│  │  └─ Sort by order                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────┬─────────────────────────┘
             │                          │
             │ Read                     │ Read
             ↓                          ↓
┌────────────────────────┐    ┌────────────────────────┐
│   data/blocks.json     │    │  data/schemas.json     │
│                        │    │                        │
│  Block Definitions     │    │  Parameter Mappings    │
│  ==================    │    │  ==================    │
│                        │    │                        │
│  block_1:              │    │  schema_1:             │
│    name: "Відділення   │    │    parameters:         │
│           гребенів"    │    │      color: Біле       │
│    order: 1            │    │      style: Сухе       │
│    has_top_arrow: true │    │      ...               │
│                        │    │    blocks:             │
│  block_2:              │    │      - block_1         │
│    name: "Відділення   │    │      - block_2         │
│           сусла..."    │    │      - block_2_1       │
│    order: 2            │    │      - ...             │
│                        │    │                        │
│  block_2_1:            │    │                        │
│    name: "Пресування"  │    │                        │
│    order: 2.1          │    │                        │
│    is_side_branch: true│    │                        │
│    connects_from: 2    │    │                        │
│    connects_to: 4      │    │                        │
│                        │    │                        │
│  block_9:              │    │                        │
│    name: "Зберігання"  │    │                        │
│    order: 9            │    │                        │
│    has_bottom_arrow:   │    │                        │
│          true          │    │                        │
└────────────────────────┘    └────────────────────────┘
             │                          │
             └──────────┬───────────────┘
                        │
                        │ JSON Response
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API RESPONSE                                 │
│                 /api/schema-for-wine                            │
│                                                                 │
│  {                                                              │
│    "schema": { "id": "schema_white_dry_still", ... },         │
│    "blocks": [                                                 │
│      { "id": "block_1", "name": "Відділення гребенів", ... }, │
│      { "id": "block_2", ... },                                │
│      { "id": "block_2_1", "is_side_branch": true, ... },      │
│      ...                                                       │
│      { "id": "block_9", "has_bottom_arrow": true, ... }       │
│    ],                                                          │
│    "wine_data": { ... }                                        │
│  }                                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ JavaScript fetch
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND RENDERER                                  │
│          (scheme_renderer.js)                                   │
│                                                                 │
│  SchemeRenderer(canvas, wineData, blocks, schema)              │
│  │                                                              │
│  ├─ drawDynamicScheme()                                        │
│  │   │                                                          │
│  │   ├─ Sort blocks by order                                   │
│  │   │                                                          │
│  │   ├─ For each block:                                        │
│  │   │   │                                                      │
│  │   │   ├─ if has_top_arrow:                                  │
│  │   │   │   └─ Draw arrow with raw material conditions        │
│  │   │   │                                                      │
│  │   │   ├─ if is_side_branch:                                 │
│  │   │   │   └─ Draw horizontal branch                         │
│  │   │   │                                                      │
│  │   │   ├─ Draw block box with name                           │
│  │   │   │                                                      │
│  │   │   ├─ Draw connecting arrow                              │
│  │   │   │                                                      │
│  │   │   └─ if has_bottom_arrow:                               │
│  │   │       └─ Draw arrow with wine conditions                │
│  │   │                                                          │
│  │   └─ Optimize canvas size                                   │
│  │                                                              │
│  └─ Output: Visual schema diagram                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RENDERED SCHEMA                              │
│                                                                 │
│              [Raw Material Conditions]                          │
│                         ↓                                       │
│                  ┌──────────────┐                              │
│                  │   Block 1    │                              │
│                  └──────┬───────┘                              │
│                         ↓                                       │
│                  ┌──────────────┐                              │
│                  │   Block 2    │────→ [Block 2-1]             │
│                  └──────┬───────┘           ↓                  │
│                         ↓                   ↓                  │
│                  ┌──────────────┐           ↓                  │
│                  │   Block 3    │           ↓                  │
│                  └──────┬───────┘           ↓                  │
│                         ↓                   ↓                  │
│                  ┌──────────────┐←──────────┘                  │
│                  │   Block 4    │                              │
│                  └──────┬───────┘                              │
│                         ↓                                       │
│                       ...                                       │
│                         ↓                                       │
│                  ┌──────────────┐                              │
│                  │   Block 9    │                              │
│                  └──────┬───────┘                              │
│                         ↓                                       │
│               [Wine Conditions]                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
1. USER SELECTS PARAMETERS
   ↓
   Color: Біле
   Style: Сухе
   CO2: Тихе
   Scheme: Біла

2. PARAMETERS SAVED TO SESSION
   ↓
   POST /api/save-choice
   Session stores: {color, style, style_co2, scheme_type}

3. USER NAVIGATES TO SCHEME PAGE
   ↓
   GET /technology-scheme

4. FRONTEND REQUESTS SCHEMA
   ↓
   GET /api/schema-for-wine

5. BACKEND MATCHES SCHEMA
   ↓
   find_schema_for_wine(session_data)
   → Finds schema where ALL parameters match

6. BACKEND LOADS BLOCKS
   ↓
   get_blocks_for_schema(matched_schema)
   → Loads blocks from blocks.json
   → Filters by schema.blocks array
   → Sorts by order field

7. BACKEND RETURNS DATA
   ↓
   {schema, blocks, wine_data}

8. FRONTEND RENDERS SCHEMA
   ↓
   SchemeRenderer.drawDynamicScheme()
   → Iterates through blocks
   → Draws boxes, arrows, labels
   → Handles special cases (side branches, arrows)

9. USER SEES VISUAL DIAGRAM
   ↓
   Complete technology scheme with all blocks
```

## Schema Matching Algorithm

```python
def find_schema_for_wine(wine_data):
    """
    Match schema where ALL parameters match exactly
    """
    schemas = load_schemas()
    
    for schema in schemas:
        params = schema['parameters']
        match = True
        
        # Check each parameter
        for key, value in params.items():
            if wine_data.get(key) != value:
                match = False
                break
        
        # If all matched, return this schema
        if match:
            return schema
    
    # No match found
    return None

# Example:
wine_data = {
    'color': 'Біле',
    'style': 'Сухе',
    'style_co2': 'Тихе',
    'scheme_type': 'Біла'
}

schema = {
    'parameters': {
        'color': 'Біле',        # ✓ Match
        'style': 'Сухе',        # ✓ Match
        'style_co2': 'Тихе',    # ✓ Match
        'scheme_type': 'Біла'   # ✓ Match
    }
}
# → Returns this schema (all match)
```

## Block Ordering Logic

```python
def get_blocks_for_schema(schema):
    """
    Load and sort blocks
    """
    all_blocks = load_blocks()
    block_ids = schema['blocks']
    
    # Filter blocks in schema
    schema_blocks = [
        block for block in all_blocks 
        if block['id'] in block_ids
    ]
    
    # Sort by order field
    schema_blocks.sort(key=lambda x: x['order'])
    
    return schema_blocks

# Example:
schema = {
    'blocks': [
        'block_1',   # order: 1
        'block_2',   # order: 2
        'block_2_1', # order: 2.1 (side branch)
        'block_3',   # order: 3
        ...
    ]
}

# After sorting by order:
# [
#   {id: 'block_1', order: 1},
#   {id: 'block_2', order: 2},
#   {id: 'block_2_1', order: 2.1},  ← Inserted between 2 and 3
#   {id: 'block_3', order: 3},
#   ...
# ]
```

## Adding New Wine Type Flow

```
1. DEFINE BLOCKS
   ↓
   Edit data/blocks.json
   Add new blocks or reuse existing ones

2. CREATE SCHEMA
   ↓
   Edit data/schemas.json
   Add new schema with parameters and block list

3. RESTART SERVER (if needed)
   ↓
   python3 app.py

4. TEST IN APP
   ↓
   Select parameters → System automatically loads new schema

5. VERIFY
   ↓
   Check /api/schema-for-wine response
   View rendered diagram
```

## System Benefits

```
┌─────────────────────────────────────────┐
│         DATA-DRIVEN APPROACH            │
├─────────────────────────────────────────┤
│                                         │
│  ✅ No code changes for new wine types │
│  ✅ Clear parameter-to-blocks mapping  │
│  ✅ Easy to maintain and extend        │
│  ✅ Database is source of truth        │
│  ✅ Automatic rendering                │
│  ✅ Flexible schema definitions        │
│                                         │
└─────────────────────────────────────────┘
```

## Summary

This system provides a complete, database-driven approach where:

1. **Blocks** define production steps
2. **Schemas** map parameters to block sequences
3. **Backend** matches and loads appropriate data
4. **Frontend** renders blocks dynamically
5. **Result** is an automatically generated, accurate technology scheme

All controlled by simple JSON files! 🎉
