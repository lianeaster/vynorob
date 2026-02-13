# Multiple Right Outputs Support

## Issue Fixed

Previously, right outputs only supported a **single arrow**, while left inputs supported **multiple arrows** with automatic box height adjustment and arrow distribution.

## Root Cause

### Before (Limited)

```javascript
// Only handled single right output
if (arrows.right && typeof arrows.right === 'object' && arrows.right.text) {
    // Draw one arrow at center (y + boxHeight / 2)
}
```

**Problems:**
- ❌ No array support
- ❌ No height calculation for multiple arrows
- ❌ Only drew at box center
- ❌ Couldn't handle multiple right outputs

### After (Full Support)

```javascript
// Now handles arrays like left inputs
if (arrows.right) {
    const rightArrows = Array.isArray(arrows.right) ? arrows.right : [arrows.right];
    const arrowSpacing = rightArrows.length > 1 ? (boxHeight - 40) / (rightArrows.length - 1) : 0;
    
    rightArrows.forEach((rightArrow, index) => {
        // Distribute evenly across box height
        const arrowY = rightArrows.length > 1 
            ? y + 20 + (index * arrowSpacing)
            : y + boxHeight / 2;
        // Draw arrow...
    });
}
```

**Fixed:**
- ✅ Array support
- ✅ Height calculation for multiple arrows
- ✅ Even distribution across box height
- ✅ Same behavior as left inputs

## Changes Made

### 1. Height Calculation (lines 1027-1047)

**Before:**
```javascript
// Only checked left arrows
if (arrows.left) {
    const leftArrows = Array.isArray(arrows.left) ? arrows.left : [arrows.left];
    if (leftArrows.length > 1) {
        minHeightForArrows = (leftArrows.length - 1) * 70 + 40;
    }
}
```

**After:**
```javascript
// Check BOTH left and right arrows
if (arrows.left) {
    const leftArrows = Array.isArray(arrows.left) ? arrows.left : [arrows.left];
    if (leftArrows.length > 1) {
        const leftHeight = (leftArrows.length - 1) * 70 + 40;
        minHeightForArrows = Math.max(minHeightForArrows, leftHeight);
    }
}

if (arrows.right) {
    const rightArrows = Array.isArray(arrows.right) ? arrows.right : [arrows.right];
    if (rightArrows.length > 1) {
        const rightHeight = (rightArrows.length - 1) * 70 + 40;
        minHeightForArrows = Math.max(minHeightForArrows, rightHeight);
    }
}
```

### 2. Right Arrow Drawing (lines 1088-1154)

**Before:**
```javascript
// Single arrow only
if (arrows.right && typeof arrows.right === 'object' && arrows.right.text) {
    const arrowY = y + boxHeight / 2;  // Always center
    // Draw one arrow
}
```

**After:**
```javascript
// Multiple arrows with distribution
if (arrows.right) {
    const rightArrows = Array.isArray(arrows.right) ? arrows.right : [arrows.right];
    const arrowSpacing = rightArrows.length > 1 ? (boxHeight - 40) / (rightArrows.length - 1) : 0;
    
    rightArrows.forEach((rightArrow, index) => {
        // Even distribution
        const arrowY = rightArrows.length > 1 
            ? y + 20 + (index * arrowSpacing)
            : y + boxHeight / 2;
        // Draw arrow
    });
}
```

### 3. Dynamic Renderer Update

**Before:**
```javascript
// Only passed first right output
if (block.right_outputs && block.right_outputs.length > 0) {
    if (block.right_outputs.length === 1) {
        arrows.right = block.right_outputs[0];  // Single object
    }
}
```

**After:**
```javascript
// Pass entire array
if (block.right_outputs && block.right_outputs.length > 0) {
    arrows.right = block.right_outputs;  // Array
}
```

## Usage Example

### Single Right Output
```json
{
  "id": "block_1",
  "right_outputs": [
    {"text": "Гребені"}
  ]
}
```

**Result:**
```
┌──────────┐
│ Block 1  │──→ Гребені
└──────────┘
```

### Multiple Right Outputs
```json
{
  "id": "block_example",
  "right_outputs": [
    {"text": "Output 1"},
    {"text": "Output 2"},
    {"text": "Output 3"}
  ]
}
```

**Result:**
```
┌──────────┐──→ Output 1
│          │
│ Block    │──→ Output 2
│ Example  │
│          │──→ Output 3
└──────────┘
```

Box automatically extends to accommodate all arrows with 70px spacing!

## Benefits

1. **Consistency**: Right outputs now work exactly like left inputs
2. **Flexibility**: Can add multiple outputs without code changes
3. **Automatic Layout**: Box height adjusts automatically
4. **Even Distribution**: Arrows spread evenly across box height
5. **Visual Balance**: Symmetric handling of inputs and outputs

## Testing

You can now use multiple right outputs in any block:

```json
{
  "id": "block_test",
  "name": "Test Block",
  "left_inputs": [
    {"text": "Input 1"},
    {"text": "Input 2"}
  ],
  "right_outputs": [
    {"text": "Output 1"},
    {"text": "Output 2"}
  ]
}
```

**Result:**
```
Input 1 ──→┐  ┌──────────┐  ┌──→ Output 1
           ├→ │   Test   │ ─┤
Input 2 ──→┘  │   Block  │  └──→ Output 2
              └──────────┘
```

## Files Modified

1. `static/js/scheme_renderer.js`:
   - Updated height calculation to include right arrows
   - Rewrote right arrow drawing to handle arrays
   - Fixed dynamic renderer to pass arrays

## Compatibility

✅ Backward compatible - single outputs still work:
```javascript
// Both formats work:
arrows.right = [{"text": "Output"}];        // Array
arrows.right = {"text": "Output"};          // Single object (converted to array internally)
```

## Summary

Right outputs now have **full parity** with left inputs:
- ✅ Array support
- ✅ Multiple arrows
- ✅ Automatic height adjustment
- ✅ Even distribution
- ✅ Consistent behavior

You can now add as many right output arrows as needed, and they'll automatically distribute evenly across the block height! 🎉
