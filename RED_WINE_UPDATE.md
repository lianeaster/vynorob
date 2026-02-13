# Red Wine Implementation Update

## ✅ Completed Tasks

### 1. Enabled Red Wine Buttons
- ✅ Enabled "Червоне" button in `templates/color.html`
- ✅ Enabled "Червона" button in `templates/scheme_type.html`

### 2. Created New Red Wine Blocks
Added 4 new blocks to `data/blocks.json`:

| Block ID | Name | Description |
|----------|------|-------------|
| block_10 | Бродіння м'язги | Like Block 5, for must fermentation with cooling and ЧКД |
| block_11 | Стікання м'язги, що бродить | Like Block 2, for draining fermenting must |
| block_12 | Доброджування | New block for post-fermentation |
| block_13 | Відпочинок | New block for resting period |

### 3. Created Red Wine Schema
Added to `data/schemas.json`:

**Schema ID:** `schema_red_dry_still`

**Parameters:**
- Color: Червоне
- Style: Сухе
- CO2 Style: Тихе
- Scheme: Червона

**Block Sequence:**
1. Block 1 - Гребеневіддокремлення, Подрібнення
2. Block 10 - Бродіння м'язги ⭐ NEW
3. Block 11 - Стікання м'язги, що бродить ⭐ NEW
4. Block 12 - Доброджування ⭐ NEW
5. Block 4 - Зняття з осаду
6. Block 13 - Відпочинок ⭐ NEW
7. Block 9 - Зберігання

### 4. Fixed Block Ordering System
**Problem:** Blocks sorted by their `order` field, preventing reuse at different positions.

**Solution:** Changed `get_blocks_for_schema()` to preserve schema's block array order.

```python
# BEFORE: Sorted by block.order field
schema_blocks.sort(key=lambda x: x.get('order', 0))

# AFTER: Preserves schema's blocks array order
for block_id in block_ids:
    if block_id in blocks_dict:
        schema_blocks.append(blocks_dict[block_id])
```

This allows Block 4 to be used in different positions:
- White wine: Block 1 → 2 → 2-1 → 3 → **4** → 5 → 6 → 7 → 8 → 9
- Red wine: Block 1 → 10 → 11 → 12 → **4** → 13 → 9

## Testing

### Quick Verification
```bash
# Check blocks
curl http://localhost:5000/api/blocks | python3 -c "import sys, json; print(len(json.load(sys.stdin)), 'blocks')"
# Expected: 14 blocks

# Check schemas
curl http://localhost:5000/api/schemas | python3 -c "import sys, json; print(len(json.load(sys.stdin)), 'schemas')"
# Expected: 2 schemas
```

### Full Test
1. Go to: http://localhost:5000
2. Select: **Червоне** → **Сухе** → **Тихе** → **Червона**
3. Enter raw material conditions
4. View technology scheme
5. Should see 7-block red wine flow!

## Statistics

| Metric | White Wine | Red Wine |
|--------|------------|----------|
| Total blocks | 10 | 7 |
| Unique blocks | 9 | 4 |
| Reused blocks | 1 (Block 1) | 3 (Blocks 1, 4, 9) |
| New blocks | - | 4 (Blocks 10, 11, 12, 13) |
| Side branches | 1 (Пресування) | 0 |

## Files Changed

1. ✅ `app.py` - Fixed block ordering logic
2. ✅ `data/blocks.json` - Added 4 new blocks (10, 11, 12, 13)
3. ✅ `data/schemas.json` - Added red wine schema
4. ✅ `templates/color.html` - Enabled "Червоне"
5. ✅ `templates/scheme_type.html` - Enabled "Червона"
6. ✅ `RED_WINE_SCHEMA.md` - Complete documentation
7. ✅ `RED_WINE_UPDATE.md` - This summary

## Ready to Commit

All changes are complete and tested. Ready to commit and push! 🍷
