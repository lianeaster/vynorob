# Blocks and Schemas System

## Overview

The wine production system now uses a **blocks-based schema** approach where:
- Each production step is a "block"
- Different wine parameters generate different chains of blocks
- Schemas map wine parameters to specific block sequences

## Database Structure

### 1. Blocks (`data/blocks.json`)

Each block represents a production step with the following properties:

```json
{
  "id": "block_3",
  "name": "Відстоювання сусла:\nt = 14...17°C,\nτ = 12 год",
  "order": 3,
  "arrow_out_label": "І фракція",
  "has_top_arrow": false,
  "top_arrow_label": "",
  "has_bottom_arrow": false,
  "bottom_arrow_label": "",
  "is_side_branch": false,
  "connects_from": "",
  "connects_to": "",
  "left_inputs": [
    {"type": "double", "text": "Холодоагент"},
    {"text": "Матеріали для\nосвітлення"},
    {"text": "SO₂\n75...80 мг/дм³"}
  ],
  "right_outputs": []
}
```

**Properties:**
- `id` (string): Unique identifier for the block
- `name` (string): Display name of the production step (supports multi-line with \n)
- `order` (number): Sequence order (can be decimal for sub-steps like 2.1)
- `arrow_out_label` (string): Label displayed on outgoing arrow (e.g., "М'язга", "Сусло-самоплив")
- `has_top_arrow` (boolean): Whether block has incoming arrow with raw material conditions
- `top_arrow_label` (string): Label for top arrow
- `has_bottom_arrow` (boolean): Whether block has outgoing arrow with wine conditions
- `bottom_arrow_label` (string): Label for bottom arrow
- `is_side_branch` (boolean): Whether this is a side branch (like Пресування)
- `connects_from` (string): For side branches, which block it connects from
- `connects_to` (string): For side branches, which block it connects to
- `left_inputs` (array): Arrows coming from the left side
  - Each input: `{"text": "label"}` for regular arrow
  - Double arrow: `{"type": "double", "text": "label"}` for bidirectional flow
- `right_outputs` (array): Arrows going to the right side
  - Each output: `{"text": "label"}` for output arrow

### 2. Schemas (`data/schemas.json`)

Each schema maps wine parameters to a sequence of blocks:

```json
{
  "id": "schema_white_dry_still",
  "name": "Біле сухе тихе вино (біла схема)",
  "parameters": {
    "color": "Біле",
    "style": "Сухе",
    "style_co2": "Тихе",
    "scheme_type": "Біла"
  },
  "blocks": [
    "block_1",
    "block_2",
    "block_2_1",
    "block_3",
    "block_4",
    "block_5",
    "block_6",
    "block_7",
    "block_8",
    "block_9"
  ],
  "description": "Схема виробництва білого сухого тихого вина за білою схемою"
}
```

**Properties:**
- `id` (string): Unique schema identifier
- `name` (string): Display name
- `parameters` (object): Wine parameters that trigger this schema
  - `color`: Color (Біле, Червоне, Рожеве)
  - `style`: Style (Сухе, Напівсухе, Напівсолодке, Солодке)
  - `style_co2`: CO2 style (Тихе, Ігристе)
  - `scheme_type`: Scheme type (Біла, Червона)
- `blocks` (array): List of block IDs in sequence
- `description` (string): Schema description

## Current Implementation

### White Dry Still Wine (Біла Схема)

**Parameters:** Біле → Сухе → Тихе → Біла

**Blocks:**
1. **Відділення гребенів** (block_1)
   - Has top arrow with raw material conditions
   
2. **Відділення сусла самопливу** (block_2)
   
3. **Пресування** (block_2_1) - Side branch
   - Connects from block_2 to block_4
   - Branches to the right
   
4. **Відстоювання сусла** (block_3)
   
5. **Зняття осаду** (block_4)
   - Receives merge from Пресування
   
6. **Бродіння сусла** (block_5)
   
7. **Освітлення виноматеріалу** (block_6)
   
8. **Зняття з дріджів** (block_7)
   
9. **Егалізація** (block_8)
   
10. **Зберігання** (block_9)
    - Has bottom arrow with calculated wine conditions

## API Endpoints

### GET `/api/blocks`
Returns all available blocks.

**Response:**
```json
[
  {
    "id": "block_1",
    "name": "Відділення гребенів",
    "order": 1,
    ...
  },
  ...
]
```

### GET `/api/schemas`
Returns all available schemas.

**Response:**
```json
[
  {
    "id": "schema_white_dry_still",
    "name": "Біле сухе тихе вино (біла схема)",
    "parameters": {...},
    "blocks": [...]
  }
]
```

### GET `/api/schema-for-wine`
Returns the appropriate schema for the current wine in session.

**Response:**
```json
{
  "schema": {
    "id": "schema_white_dry_still",
    ...
  },
  "blocks": [
    {
      "id": "block_1",
      "name": "Відділення гребенів",
      ...
    },
    ...
  ],
  "wine_data": {
    "color": "Біле",
    "style": "Сухе",
    ...
  }
}
```

## Frontend Integration

The `SchemeRenderer` class now accepts blocks and schema data:

```javascript
const renderer = new SchemeRenderer(canvas, wineData, blocks, schema);
renderer.drawScheme();
```

The renderer automatically:
1. Uses dynamic block rendering if blocks data is provided
2. Falls back to hardcoded rendering if no blocks data
3. Handles special cases like side branches
4. Positions arrows with conditions for first and last blocks

## Adding New Wine Types

To add support for a new wine type:

1. **Define new blocks** in `data/blocks.json`:
   ```json
   {
     "id": "block_new",
     "name": "New Production Step",
     "order": 1,
     ...
   }
   ```

2. **Create a new schema** in `data/schemas.json`:
   ```json
   {
     "id": "schema_new_type",
     "name": "New Wine Type",
     "parameters": {
       "color": "Value",
       "style": "Value",
       ...
     },
     "blocks": ["block_1", "block_2", ...]
   }
   ```

3. **Test the schema** by navigating through the app with matching parameters

## Block Rendering Rules

1. **First Block** (has_top_arrow = true):
   - Draws incoming arrow with raw material conditions (sugar, acidity)
   
2. **Middle Blocks**:
   - Connected with vertical arrows
   - Can have side inputs/outputs
   
3. **Side Branches** (is_side_branch = true):
   - Branch off horizontally from one block to another
   - Example: Пресування connects from block_2 to block_4
   
4. **Last Block** (has_bottom_arrow = true):
   - Draws outgoing arrow with calculated wine conditions (sugar, acidity, alcohol)

## Future Enhancements

- [ ] Support for multiple parallel paths
- [ ] Configurable arrow positions (left, right, top, bottom)
- [ ] Block templates with pre-defined input/output materials
- [ ] Visual schema editor for creating new schemas
- [ ] Import/export schemas
- [ ] Version control for schemas
