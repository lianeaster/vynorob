# Arrows and Metadata Update

## What Was Added

We've enhanced the blocks system with complete metadata for all arrows, inputs, outputs, and labels that were in the original hardcoded scheme.

## New Block Properties

### 1. Arrow Labels on Vertical Arrows
**Property:** `arrow_out_label`

Labels that appear on the vertical arrows between blocks (e.g., "М'язга", "Сусло-самоплив", "І фракція").

```json
{
  "id": "block_1",
  "name": "Гребеневіддокремлення,\nПодрібнення",
  "arrow_out_label": "М'язга"
}
```

**Result:** Arrow between Block 1 and Block 2 shows "М'язга" label.

### 2. Left Inputs
**Property:** `left_inputs` (array)

Materials or agents entering from the left side of the block.

**Regular Input Arrow:**
```json
{
  "left_inputs": [
    {"text": "ЧКД"}
  ]
}
```

**Double-Headed Arrow (bidirectional):**
```json
{
  "left_inputs": [
    {"type": "double", "text": "Холодоагент"}
  ]
}
```

**Multiple Inputs:**
```json
{
  "left_inputs": [
    {"type": "double", "text": "Холодоагент"},
    {"text": "Матеріали для\nосвітлення"},
    {"text": "SO₂\n75...80 мг/дм³"}
  ]
}
```

### 3. Right Outputs
**Property:** `right_outputs` (array)

Materials or by-products exiting to the right side of the block.

```json
{
  "right_outputs": [
    {"text": "Гребені"}
  ]
}
```

**Multi-line Output:**
```json
{
  "right_outputs": [
    {"text": "Вичавки\n→Пресові II та\nIII фракції на\nординарні\nміцні вина"}
  ]
}
```

## Complete Block Examples

### Block 1: With Top Arrow and Right Output
```json
{
  "id": "block_1",
  "name": "Гребеневіддокремлення,\nПодрібнення",
  "order": 1,
  "has_top_arrow": true,
  "top_arrow_label": "Умови сировини",
  "arrow_out_label": "М'язга",
  "right_outputs": [
    {"text": "Гребені"}
  ]
}
```

**Renders as:**
```
      [Raw Material Conditions]
               ↓
        ┌─────────────┐
        │Гребенев-     │
        │іддокремлення,│──→ Гребені
        │Подрібнення   │
        └──────┬────────┘
               ↓ М'язга
```

### Block 3: With Multiple Left Inputs and Arrow Label
```json
{
  "id": "block_3",
  "name": "Відстоювання сусла:\nt = 14...17°C,\nτ = 12 год",
  "order": 3,
  "arrow_out_label": "І фракція",
  "left_inputs": [
    {"type": "double", "text": "Холодоагент"},
    {"text": "Матеріали для\nосвітлення"},
    {"text": "SO₂\n75...80 мг/дм³"}
  ]
}
```

**Renders as:**
```
Холодоагент ←→─┐
               │
Матеріали для  │
освітлення ──→─┤  ┌──────────────┐
               ├─→│ Відстоювання │
SO₂            │  │    сусла:    │
75...80 мг/дм³─┘  │t = 14...17°C,│
                  │  τ = 12 год   │
                  └──────┬─────────┘
                         ↓ І фракція
```

### Block 5: With Double Input and Right Output
```json
{
  "id": "block_5",
  "name": "Бродіння сусла,\nt=14...17°C",
  "order": 5,
  "left_inputs": [
    {"type": "double", "text": "Холодоагент"},
    {"text": "ЧКД"}
  ],
  "right_outputs": [
    {"text": "Гази бродіння"}
  ]
}
```

**Renders as:**
```
Холодоагент ←→─┐
               │  ┌──────────────┐
ЧКД ──────────→├─→│   Бродіння   │──→ Гази бродіння
               │  │    сусла,    │
               │  │ t=14...17°C  │
               │  └──────┬───────┘
                         ↓
```

### Block 2-1: Side Branch with Right Output
```json
{
  "id": "block_2_1",
  "name": "Пресування",
  "order": 2.1,
  "connects_from": "block_2",
  "connects_to": "block_4",
  "is_side_branch": true,
  "right_outputs": [
    {
      "text": "Вичавки\n→Пресові II та\nIII фракції на\nординарні\nміцні вина"
    }
  ]
}
```

**Renders as:**
```
Block 2 ──→ Збіднена м'язга ──→ ┌───────────┐
                                │Пресування │──→ Вичавки
                                └─────┬─────┘   →Пресові...
                                      ↓
                                Block 4 ←────────┘
```

## All Blocks with Complete Metadata

### Block 1: Гребеневіддокремлення
- ⬆️ Top arrow: Raw material conditions
- ➡️ Right output: "Гребені"
- ⬇️ Arrow out label: "М'язга"

### Block 2: Відділення сусла-самопливу
- ➡️ Right output: "Збіднена м'язга" (goes to side branch)
- ⬇️ Arrow out label: "Сусло-самоплив"

### Block 2-1: Пресування (Side Branch)
- ↗️ Connects from: Block 2
- ↘️ Connects to: Block 4
- ➡️ Right output: "Вичавки→Пресові II та III фракції..."

### Block 3: Відстоювання сусла
- ⬅️ Left inputs:
  - "Холодоагент" (double arrow)
  - "Матеріали для освітлення"
  - "SO₂ 75...80 мг/дм³"
- ⬇️ Arrow out label: "І фракція"

### Block 4: Зняття з осаду
- ⬅️ Receives merge from Block 2-1

### Block 5: Бродіння сусла
- ⬅️ Left inputs:
  - "Холодоагент" (double arrow)
  - "ЧКД"
- ➡️ Right output: "Гази бродіння"

### Block 6: Освітлення виноматервалу
- ⬅️ Left input: "Холодоагент" (double arrow)
- ➡️ Right output: "Осад"

### Block 7: Зняття з дріжджів
- ➡️ Right output: "Дріжджові осади"

### Block 8: Егалізація
- ⬅️ Left input: "SO₂ 30...50 мг/дм³"

### Block 9: Зберігання
- ⬇️ Bottom arrow: Calculated wine conditions

## Renderer Updates

The `drawDynamicScheme()` method now:

1. ✅ Reads `arrow_out_label` and draws labeled arrows between blocks
2. ✅ Reads `left_inputs` and draws input arrows with labels
   - Handles regular arrows
   - Handles double-headed arrows (type: "double")
   - Handles multiple inputs distributed vertically
3. ✅ Reads `right_outputs` and draws output arrows with labels
4. ✅ Properly renders side branches (Пресування)
   - Draws horizontal branch from source block
   - Draws side branch block
   - Draws merge arrow into target block
5. ✅ Handles multi-line text in all labels

## Testing

Start the server and navigate to the technology scheme page:

```bash
# Server should already be running
# Navigate to: http://localhost:5000
# Select: Біле → Сухе → Тихе → Біла
# View technology scheme
```

You should now see:
- ✅ All arrow labels (М'язга, Сусло-самоплив, І фракція)
- ✅ All left inputs (Холодоагент, ЧКД, SO₂, Матеріали для освітлення)
- ✅ All right outputs (Гребені, Збіднена м'язга, Вичавки, Гази бродіння, Осад, Дріжджові осади)
- ✅ Пресування side branch with proper connections
- ✅ Double-headed arrows for Холодоагент

## Benefits

1. **Complete Schema** - All information from hardcoded scheme is now in database
2. **Flexible** - Easy to modify arrows and labels without code changes
3. **Reusable** - Same metadata system for all wine types
4. **Maintainable** - Clear, structured data format

## Next Steps

When adding new wine types, simply include these properties in your blocks:

```json
{
  "id": "new_block",
  "name": "New Process",
  "order": 1,
  "arrow_out_label": "Material flowing out",
  "left_inputs": [
    {"type": "double", "text": "Cooling agent"}
  ],
  "right_outputs": [
    {"text": "Waste product"}
  ]
}
```

The renderer will automatically draw all arrows and labels! 🎉
