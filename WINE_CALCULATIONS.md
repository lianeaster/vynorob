# Wine Production Calculations

## Overview

This document explains the scientific formulas used to calculate final wine parameters from initial grape conditions in the Vynorob application.

## White Dry Wine Calculations

### Input Parameters (From Grapes)

| Parameter | Symbol | Typical Range | Unit |
|-----------|--------|---------------|------|
| Sugar concentration | Cц (initial) | 160-220 | g/dm³ |
| Titratable acidity | Cт.к. (initial) | 5-9 | g/dm³ |
| pH | pH (initial) | 3.0-3.6 | - |

### Output Parameters (Final Wine)

| Parameter | Symbol | Target/Range | Unit |
|-----------|--------|--------------|------|
| Residual sugar | Cц (final) | ≤2-4 (dry) | g/dm³ |
| Titratable acidity | Cт.к. (final) | 4-8 | g/dm³ |
| Alcohol content | Cсп | 9-14 | % vol |

---

## Calculation Formulas

### 1. Final Sugar Concentration (Cц)

**For Dry Wine:**
```
Cц (final) = 2 g/dm³
```

**Definition:**
- **Dry wine**: ≤ 4 g/dm³
- **Semi-dry**: 4-18 g/dm³
- **Semi-sweet**: 18-45 g/dm³
- **Sweet**: > 45 g/dm³

**Rationale:**
For dry white wine, fermentation consumes almost all sugar, leaving only 2-4 g/dm³ residual sugar.

---

### 2. Alcohol Content (Cсп)

**Formula:**
```
Cсп = (Cц_initial - Cц_final) / 17
```

**Where:**
- Cц_initial = Initial sugar concentration (g/dm³)
- Cц_final = Final sugar concentration (g/dm³ = g/L)
- 17 = Conversion factor (g/L sugar → % vol alcohol)

**Example:**
```
Initial sugar: 170 g/dm³
Final sugar: 2 g/dm³
Sugar consumed: 170 - 2 = 168 g/dm³

Alcohol: 168 / 17 = 9.88 ≈ 9.9% vol
```

**Scientific Basis:**
During alcoholic fermentation, yeast (Saccharomyces cerevisiae) converts sugar to ethanol and CO₂:

```
C₆H₁₂O₆ → 2 C₂H₅OH + 2 CO₂
(glucose)   (ethanol)
```

Stoichiometry:
- 180 g glucose → 92 g ethanol (theoretical)
- Practical yield: ~90-95% (accounting for yeast metabolism)
- Approximately 17 g/L sugar produces 1% vol alcohol

**Formula Derivation:**
```
1% vol alcohol = 7.89 g/L ethanol (density ~0.789 g/mL)
Sugar-to-ethanol efficiency: ~51% (Gay-Lussac equation)
Practical factor: 17 g/L sugar → 1% vol alcohol
```

---

### 3. Final Titratable Acidity (Cт.к.)

**Formula:**
```
Cт.к. (final) = Cт.к. (initial) - ΔCт.к.
```

**Where:**
- Cт.к. (initial) = Initial titratable acidity (g/dm³, as tartaric acid)
- ΔCт.к. = Acidity loss during fermentation
- Typical ΔCт.к. for white wine: 0.5-1.0 g/dm³
- Default in code: 0.7 g/dm³

**Minimum Threshold:**
```
Cт.к. (final) ≥ 4 g/dm³
```
(Wines below 4 g/dm³ are considered flat/unbalanced)

**Example:**
```
Initial acidity: 6.0 g/dm³
Acidity loss: 0.7 g/dm³
Final acidity: 6.0 - 0.7 = 5.3 g/dm³
```

**Scientific Basis:**
During fermentation, titratable acidity decreases due to:
1. **Potassium bitartrate precipitation** - Cold stabilization causes tartaric acid salts to crystallize out
2. **Yeast metabolism** - Consumes small amounts of organic acids
3. **pH changes** - Fermentation byproducts affect acid equilibria

For white wine made by white scheme (no malolactic fermentation):
- Acidity decrease is minimal (0.5-1.0 g/dm³)
- Primarily due to tartrate precipitation

For comparison, red wine with malolactic fermentation:
- Malic acid → Lactic acid conversion
- Greater acidity decrease (2-4 g/dm³)

---

## Implementation in Code

### JavaScript Function (scheme_renderer.js)

```javascript
// Calculate final wine conditions based on initial grape parameters
const rawMaterial = this.wineData.raw_material || {};
const initialSugar = rawMaterial.sugar || 170; // g/dm³
const initialAcidity = rawMaterial.acidity || 6; // g/dm³

// Final parameters for dry white wine
const finalSugar = 2; // g/dm³ - definition of dry wine (≤4 g/dm³)

// Calculate alcohol content from sugar fermentation
// Formula: 17 g/L sugar produces approximately 1% vol alcohol
const sugarConsumed = initialSugar - finalSugar;
const calculatedAlcohol = sugarConsumed / 17;
const finalAlcohol = Math.round(calculatedAlcohol * 10) / 10; // Round to 1 decimal

// Calculate final titratable acidity
// During white wine fermentation, acidity decreases slightly (0.5-1 g/dm³)
const acidityLoss = 0.7; // Typical loss during fermentation
const finalAcidity = Math.max(initialAcidity - acidityLoss, 4); // Minimum 4 g/dm³
```

---

## Validation Ranges

### Alcohol Content Validation

```javascript
if (finalAlcohol < 8) {
    console.warn('Low alcohol content - may indicate incomplete fermentation');
} else if (finalAlcohol > 15) {
    console.warn('High alcohol content - check initial sugar levels');
}
```

**Typical ranges for white wine:**
- Light: 8-10% vol
- Medium: 10-12% vol
- Full-bodied: 12-14% vol
- Fortified: 15-20% vol (with added spirits)

### Acidity Validation

```javascript
if (finalAcidity < 4) {
    console.warn('Low acidity - wine may taste flat');
} else if (finalAcidity > 8) {
    console.warn('High acidity - wine may taste sharp');
}
```

**Optimal ranges:**
- White dry wine: 5.5-7.5 g/dm³
- Sparkling wine: 6-9 g/dm³
- Sweet wine: 5-6 g/dm³

---

## Future Enhancements

### 1. pH Calculation
Currently not calculated. Future formula:
```
pH = f(titratable_acidity, buffer_capacity, potassium_content)
```

### 2. Wine Style Adjustments

**Semi-Dry Wine:**
```
finalSugar = 10 g/dm³ (4-18 g/dm³ range)
alcohol = (initialSugar - finalSugar) / 17
```

**Semi-Sweet Wine:**
```
finalSugar = 30 g/dm³ (18-45 g/dm³ range)
alcohol = (initialSugar - finalSugar) / 17
```

**Sweet Wine:**
```
finalSugar = 50 g/dm³ (> 45 g/dm³)
alcohol = (initialSugar - finalSugar) / 17
```

### 3. Temperature Corrections

Fermentation temperature affects:
- Sugar-to-alcohol conversion efficiency
- Acidity changes
- Volatile compound formation

```
efficiency = base_efficiency * temperature_factor
```

### 4. Yeast Strain Effects

Different yeast strains have:
- Different alcohol tolerance (8-18% vol)
- Different metabolic efficiency
- Different acid metabolism

---

## References

### Scientific Literature
1. **Boulton, R.B., et al.** (1996). "Principles and Practices of Winemaking". Chapman & Hall.
2. **Ribéreau-Gayon, P., et al.** (2006). "Handbook of Enology, Volume 1: The Microbiology of Wine and Vinifications". Wiley.
3. **Jackson, R.S.** (2014). "Wine Science: Principles and Applications". Academic Press.

### Standards
1. **OIV** - International Organisation of Vine and Wine
   - Resolution OIV-ECO 433-2012: Wine definitions
   - Compendium of International Methods of Wine and Must Analysis

2. **ДСТУ 4806:2007** - Ukrainian Standard
   - Вина виноградні. Загальні технічні умови
   - Wine classification and specifications

### Online Resources
1. UC Davis Viticulture & Enology: https://wineserver.ucdavis.edu/
2. Australian Wine Research Institute: https://www.awri.com.au/
3. Institut Français de la Vigne et du Vin: https://www.vignevin.com/

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-10 | Initial documentation with dry white wine calculations |
| - | - | Future: Add semi-dry, semi-sweet, sweet wine formulas |
| - | - | Future: Add red wine calculations (with MLF) |
| - | - | Future: Add pH calculations |
| - | - | Future: Add temperature corrections |

---

**Last Updated**: 2026-02-10  
**Maintainer**: Vynorob Development Team  
**Status**: Active Development
