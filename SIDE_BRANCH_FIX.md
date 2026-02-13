# Side Branch Fix: Block 2-1 (Пресування)

## Issue
The side branch block 2-1 (Пресування) was not being rendered.

## Root Cause
1. **Timing Issue**: The side branch block was being found AFTER block_2 was already processed in the loop
2. **Conflict**: Block 2 had `right_outputs` which conflicted with the side branch rendering

## Fix Applied

### 1. Pre-scan for Side Branch
Changed from finding side branch during the loop to finding it BEFORE the loop:

```javascript
// BEFORE: Found during loop (too late)
this.blocks.forEach((block, index) => {
    if (block.is_side_branch) {
        sideBranchBlock = block;  // Found AFTER block_2 already processed!
        return;
    }
    // ... draw block_2 without knowing about side branch
});

// AFTER: Pre-scan before loop
let sideBranchBlock = null;
for (const block of this.blocks) {
    if (block.is_side_branch) {
        sideBranchBlock = block;
        break;
    }
}
// NOW we draw blocks knowing about the side branch
```

### 2. Removed Conflicting Right Output
Removed `right_outputs` from block_2 since the side branch code handles the "Збіднена м'язга" arrow:

```json
// BEFORE
{
  "id": "block_2",
  "right_outputs": [
    {"text": "Збіднена\nм'язга"}  // Conflict with side branch!
  ]
}

// AFTER
{
  "id": "block_2"
  // No right_outputs - side branch handles this
}
```

## What Should Now Render

### Complete Side Branch Flow:

```
┌──────────────────┐
│     Block 2      │
│   Відділення     │
│ сусла-самопливу  │
└────┬─────────────┘
     │             └──→ Збіднена м'язга ──→ ┌─────────────┐
     ↓ Сусло-самоплив                      │  Block 2-1  │──→ Вичавки
┌──────────────────┐                        │ Пресування  │   →Пресові...
│     Block 3      │                        └──────┬──────┘
│  Відстоювання    │                               │
│     сусла        │                               ↓
└────┬─────────────┘                               │
     ↓ І фракція                                   │
┌──────────────────┐                               │
│     Block 4      │←──────────────────────────────┘
│   Зняття осаду   │
└──────────────────┘
```

## Verification

### 1. Check Configuration
```bash
curl -s http://localhost:5000/api/blocks | \
  python3 -c "import sys, json; data = json.load(sys.stdin); \
  sb = [b for b in data if b.get('is_side_branch')]; \
  print('Side branch:', sb[0]['id']); \
  print('Connects from:', sb[0]['connects_from']); \
  print('Connects to:', sb[0]['connects_to'])"
```

**Expected output:**
```
Side branch: block_2_1
Connects from: block_2
Connects to: block_4
```

### 2. Visual Test
Navigate to the technology scheme page:
1. Go to http://localhost:5000
2. Select: **Біле** → **Сухе** → **Тихе** → **Біла**
3. View technology scheme

**You should see:**
- ✅ Block 2 (Відділення сусла-самопливу) in main flow
- ✅ Horizontal arrow to the right with "Збіднена м'язга" label
- ✅ Block 2-1 (Пресування) to the right of main flow
- ✅ "Вичавки→Пресові..." output arrow from Пресування
- ✅ Vertical arrow down from Пресування
- ✅ Horizontal arrow merging left into Block 4

### 3. Console Logs
Open browser DevTools console and look for:
```
Found side branch block: {id: "block_2_1", ...}
Drawing side branch: {id: "block_2_1", ...}
From position: {startY: ..., endY: ..., centerY: ...}
To position: {startY: ..., endY: ..., centerY: ...}
```

## Technical Details

### Side Branch Rendering Steps

1. **Find side branch** (pre-scan before main loop)
2. **Draw main blocks** (skip side branch in main loop)
3. **Store block positions** for blocks 2 and 4
4. **After main blocks**, draw side branch:
   - Draw horizontal arrow from block 2 to side branch position
   - Draw "Збіднена м'язга" label above arrow
   - Draw Пресування block to the right
   - Draw "Вичавки→..." output arrow from Пресування
   - Draw vertical arrow down from Пресування
   - Draw horizontal merge arrow into Block 4

### Block Order
```
1.0  Block 1: Гребеневіддокремлення
2.0  Block 2: Відділення сусла-самопливу
2.1  Block 2-1: Пресування (SIDE BRANCH - drawn separately)
3.0  Block 3: Відстоювання сусла
4.0  Block 4: Зняття осаду (receives merge)
5.0  Block 5: Бродіння сусла
...
```

## Files Modified

1. **`data/blocks.json`**
   - Removed `right_outputs` from block_2

2. **`static/js/scheme_renderer.js`**
   - Added pre-scan loop to find side branch
   - Removed late binding of sideBranchFromBlock
   - Added console logs for debugging

## Status

✅ **Side branch configuration correct**  
✅ **Pre-scan logic added**  
✅ **Conflict removed**  
✅ **Ready for testing**

The side branch (block 2-1) should now render properly! 🎉
