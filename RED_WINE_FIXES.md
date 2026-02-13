# Red Wine Schema Fixes

## Issues Fixed

### 1. ✅ Added Холодоагент to Blocks 12 and 13

**Block 12: Доброджування**
```json
{
  "id": "block_12",
  "name": "Доброджування",
  "order": 12,
  "left_inputs": [
    {"type": "double", "text": "Холодоагент"}
  ]
}
```

**Block 13: Відпочинок**
```json
{
  "id": "block_13",
  "name": "Відпочинок",
  "order": 13,
  "left_inputs": [
    {"type": "double", "text": "Холодоагент"}
  ]
}
```

### 2. ✅ Added Пресування Side Branch to Block 11

Created **Block 11_1** as a side branch (similar to block 2_1 in white wine):

```json
{
  "id": "block_11_1",
  "name": "Пресування",
  "order": 11.1,
  "connects_from": "block_11",
  "connects_to": "block_4",
  "is_side_branch": true,
  "right_outputs": [
    {"text": "Вичавки\n→Пресові II та\nIII фракції на\nординарні\nміцні вина"}
  ]
}
```

## Updated Red Wine Schema

**Complete block sequence:**
```
1. Block 1    - Гребеневіддокремлення, Подрібнення
2. Block 10   - Бродіння м'язги (with Холодоагент ←→)
3. Block 11   - Стікання м'язги, що бродить
   └─→ Block 11_1 - Пресування (side branch → Block 4) ⭐ ADDED
4. Block 12   - Доброджування (with Холодоагент ←→) ⭐ FIXED
5. Block 4    - Зняття з осаду (receives merge from 11_1)
6. Block 13   - Відпочинок (with Холодоагент ←→) ⭐ FIXED
7. Block 9    - Зберігання
```

## Visual Flow

```
[Raw Material Conditions]
         ↓
  ┌─────────────┐
  │   Block 1   │──→ Гребені
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
                   │  Block 11   │──→ М'язга ──→ ┌───────────┐
                   │  Стікання   │                │Block 11_1 │──→ Вичавки
                   │   м'язги    │                │Пресування │
                   └──────┬──────┘                └─────┬─────┘
                          ↓                             ↓
Холодоагент ←→─┐   ┌─────────────┐                     │
               └──→│  Block 12   │                     │
                   │Добро-       │                     │
                   │джування     │                     │
                   └──────┬──────┘                     │
                          ↓                             ↓
                   ┌─────────────┐←────────────────────┘
                   │   Block 4   │
                   │   Зняття    │
                   │  з осаду    │
                   └──────┬──────┘
                          ↓
Холодоагент ←→─┐   ┌─────────────┐
               └──→│  Block 13   │
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

## Schema JSON

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
    "block_11_1",  // ⭐ Side branch added
    "block_12",
    "block_4",
    "block_13",
    "block_9"
  ]
}
```

## Comparison: White vs Red Side Branches

| Wine Type | Main Block | Side Branch | Target |
|-----------|------------|-------------|--------|
| White | Block 2: Відділення сусла | Block 2_1: Пресування | Block 4 |
| Red | Block 11: Стікання м'язги | Block 11_1: Пресування | Block 4 |

Both use the same Пресування process with the same outputs!

## Statistics

- **Total blocks in system**: 15 (was 14)
- **Red wine blocks**: 8 (was 7)
- **Blocks with Холодоагент**: 5 (blocks 3, 5, 6, 10, 12, 13)
- **Side branches**: 2 (white: 2_1, red: 11_1)

## Testing

Navigate to:
1. http://localhost:5000
2. Select: **Червоне** → **Сухе** → **Тихе** → **Червона**
3. View technology scheme

**You should now see:**
- ✅ Block 11 with side branch to Пресування
- ✅ Пресування (block 11_1) to the right
- ✅ Merge arrow from Пресування to Block 4
- ✅ Холодоагент ←→ on Block 12
- ✅ Холодоагент ←→ on Block 13

## Files Modified

1. `data/blocks.json` - Added block_11_1, updated blocks 12 & 13
2. `data/schemas.json` - Added block_11_1 to red wine schema

## Summary

✅ **Block 12**: Now has Холодоагент (double arrow)  
✅ **Block 13**: Now has Холодоагент (double arrow)  
✅ **Block 11**: Now has Пресування side branch (11_1 → 4)  
✅ **Block 11_1**: New Пресування block for red wine  
✅ **Red wine schema**: Complete with all arrows and side branches  

Red wine production schema is now complete with all cooling agents and side branches! 🍷
