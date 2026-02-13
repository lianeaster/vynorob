# How to Add a New Wine Type

This guide shows you exactly how to add support for a new wine type to the system.

## Step-by-Step Example: Adding Semi-Dry White Wine

Let's add support for **White Semi-Dry Still Wine (Біла Схема)**.

### Step 1: Define the Blocks

Open `data/blocks.json` and add the blocks for this wine type.

For semi-dry wine, the process is similar to dry wine, so we can reuse most blocks. But let's say we want to add a specific block for sugar adjustment:

```json
{
  "id": "block_sugar_adjust",
  "name": "Коригування цукристості",
  "order": 8.5,
  "description": "Додавання цукру для напівсухого вина"
}
```

**Add this block to `data/blocks.json`:**
```json
[
  {
    "id": "block_1",
    "name": "Відділення гребенів",
    "order": 1,
    "has_top_arrow": true,
    "top_arrow_label": "Умови сировини"
  },
  ...existing blocks...
  {
    "id": "block_8",
    "name": "Егалізація",
    "order": 8
  },
  {
    "id": "block_sugar_adjust",
    "name": "Коригування цукристості",
    "order": 8.5
  },
  {
    "id": "block_9",
    "name": "Зберігання",
    "order": 9,
    "has_bottom_arrow": true,
    "bottom_arrow_label": "Кондиції вина"
  }
]
```

### Step 2: Create the Schema

Open `data/schemas.json` and add the new schema:

```json
{
  "id": "schema_white_semidry_still",
  "name": "Біле напівсухе тихе вино (біла схема)",
  "parameters": {
    "color": "Біле",
    "style": "Напівсухе",
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
    "block_sugar_adjust",  // ← New block added here
    "block_9"
  ],
  "description": "Схема виробництва білого напівсухого тихого вина за білою схемою"
}
```

**Complete `data/schemas.json`:**
```json
[
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
  },
  {
    "id": "schema_white_semidry_still",
    "name": "Біле напівсухе тихе вино (біла схема)",
    "parameters": {
      "color": "Біле",
      "style": "Напівсухе",
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
      "block_sugar_adjust",
      "block_9"
    ],
    "description": "Схема виробництва білого напівсухого тихого вина за білою схемою"
  }
]
```

### Step 3: Test

1. Start the Flask server (if not already running):
   ```bash
   python3 app.py
   ```

2. Test the API:
   ```bash
   curl http://localhost:5000/api/schemas | python -m json.tool
   ```

   You should see both schemas.

3. Test in the app:
   - Navigate to http://localhost:5000
   - Select: **Біле** → **Напівсухе** → **Тихе** → **Біла**
   - Continue to the technology scheme page
   - The new block "Коригування цукристості" should appear in the schema!

### Step 4: Verify

Check the browser console to see the loaded blocks:

```javascript
// In browser console:
fetch('/api/schema-for-wine')
  .then(r => r.json())
  .then(data => console.log(data));
```

You should see:
```json
{
  "schema": {
    "id": "schema_white_semidry_still",
    ...
  },
  "blocks": [
    ...
    {
      "id": "block_sugar_adjust",
      "name": "Коригування цукристості",
      "order": 8.5
    },
    ...
  ]
}
```

## Example 2: Adding Red Dry Wine

Let's add a completely new wine type with different blocks.

### Step 1: Define Red Wine Blocks

```json
[
  {
    "id": "block_red_1",
    "name": "Подрібнення і гребеневіддокремлення",
    "order": 1,
    "has_top_arrow": true,
    "top_arrow_label": "Умови сировини"
  },
  {
    "id": "block_red_2",
    "name": "Бродіння на м'язгу",
    "order": 2
  },
  {
    "id": "block_red_3",
    "name": "Підігрів м'язги",
    "order": 3
  },
  {
    "id": "block_red_4",
    "name": "Пресування",
    "order": 4
  },
  {
    "id": "block_red_5",
    "name": "Добродіння",
    "order": 5
  },
  {
    "id": "block_red_6",
    "name": "Зняття з дріжджів",
    "order": 6
  },
  {
    "id": "block_red_7",
    "name": "Освітлення",
    "order": 7
  },
  {
    "id": "block_red_8",
    "name": "Егалізація",
    "order": 8
  },
  {
    "id": "block_red_9",
    "name": "Зберігання",
    "order": 9,
    "has_bottom_arrow": true,
    "bottom_arrow_label": "Кондиції вина"
  }
]
```

### Step 2: Create Red Wine Schema

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
    "block_red_3",
    "block_red_4",
    "block_red_5",
    "block_red_6",
    "block_red_7",
    "block_red_8",
    "block_red_9"
  ],
  "description": "Схема виробництва червоного сухого тихого вина за червоною схемою"
}
```

### Step 3: Test

Select parameters: **Червоне** → **Сухе** → **Тихе** → **Червона**

The system will automatically load and render the red wine blocks!

## Adding Side Branches

If your new wine type has a side branch (like Пресування in white wine):

### Example: Side branch from Block 3 to Block 5

```json
{
  "id": "block_side_example",
  "name": "Side Process",
  "order": 3.5,
  "is_side_branch": true,
  "connects_from": "block_red_3",
  "connects_to": "block_red_5"
}
```

Add it to the schema:
```json
{
  "blocks": [
    "block_red_1",
    "block_red_2",
    "block_red_3",
    "block_side_example",  // ← Side branch
    "block_red_4",
    "block_red_5",
    ...
  ]
}
```

The renderer will automatically:
1. Draw it to the right of the main flow
2. Connect from `block_red_3` to `block_red_5`

## Schema Matching Logic

The system matches schemas by checking if **ALL** parameters match:

```python
# In app.py
def find_schema_for_wine(wine_data):
    for schema in schemas:
        params = schema['parameters']
        match = True
        
        # Check ALL parameters
        for key, value in params.items():
            if wine_data.get(key) != value:
                match = False
                break
        
        if match:
            return schema
    
    return None
```

So if you have:
- Schema 1: `{"color": "Біле", "style": "Сухе", "style_co2": "Тихе", "scheme_type": "Біла"}`
- Schema 2: `{"color": "Біле", "style": "Напівсухе", "style_co2": "Тихе", "scheme_type": "Біла"}`

And user selects: Біле + Напівсухе + Тихе + Біла → Schema 2 will be used

## Best Practices

### 1. Block Naming
- Use clear, descriptive Ukrainian names
- Follow existing naming conventions

### 2. Block IDs
- Use descriptive IDs: `block_red_1`, `block_sugar_adjust`
- Avoid generic IDs like `block_001`

### 3. Block Order
- Use integers for main blocks: 1, 2, 3, ...
- Use decimals for insertions: 2.1, 2.5, 8.5
- System sorts by order automatically

### 4. Reusing Blocks
- Blocks can be shared across multiple schemas
- If two wine types have same process, use the same block ID

### 5. Schema Parameters
- Always specify ALL four parameters:
  - `color`
  - `style`
  - `style_co2`
  - `scheme_type`

## Troubleshooting

### Schema Not Loading
**Problem:** Selected parameters but no schema loads

**Solution:** Check that parameters in `schemas.json` exactly match your selection:
```json
// Make sure these match exactly:
"parameters": {
  "color": "Біле",        // Not "біле" or "White"
  "style": "Сухе",        // Not "сухе" or "Dry"
  "style_co2": "Тихе",    // Not "тихе" or "Still"
  "scheme_type": "Біла"   // Not "біла" or "White"
}
```

### Blocks Not Rendering
**Problem:** Schema loads but blocks don't render

**Solution:** 
1. Check that all block IDs in schema exist in `blocks.json`
2. Check browser console for errors
3. Verify block order is correct

### Side Branch Not Showing
**Problem:** Side branch block not rendering

**Solution:** Check that:
```json
{
  "is_side_branch": true,
  "connects_from": "block_2",  // Must be valid block ID
  "connects_to": "block_4"     // Must be valid block ID
}
```

## Summary

To add a new wine type:

1. ✅ Define blocks in `data/blocks.json`
2. ✅ Create schema in `data/schemas.json`
3. ✅ Map parameters to blocks
4. ✅ Test in the app

That's it! No code changes needed. 🎉
