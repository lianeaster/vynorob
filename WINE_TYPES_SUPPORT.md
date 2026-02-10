# Wine Types Support Matrix

## Current Support Status

### ✅ Fully Supported (v1.0)

| Color | Style | CO2 Style | Scheme Type | Status |
|-------|-------|-----------|-------------|--------|
| Біле | Сухе | Тихе | Біла | ✅ IMPLEMENTED |

**Details**:
- **Color**: White wine (Біле)
- **Style**: Dry (Сухе) - sugar content ≤ 4 g/dm³
- **CO2 Style**: Still/Calm (Тихе) - non-sparkling
- **Production Scheme**: White scheme (Біла) - grapes processed immediately without skin contact

**Technological Stages** (11 steps):
1. Гребеневіддокремлення, Подрібнення (Destemming, Crushing)
2. Відділення сусла-самопливу (Free-run juice separation)
3. Відстоювання сусла (Must settling)
4. Зняття з осаду (Racking off sediment)
5. Бродіння сусла (Must fermentation)
6. Освітлення виноматеріалу (Wine material clarification)
7. Декантація (Decantation)
8. Оброблення (Treatment)
9. Фільтрація (Filtration)
10. Розлив (Bottling)
11. Зберігання (Storage)

**Side Processes**:
- Cooling agent (Холодоагент) for temperature control
- Pure yeast culture (ЧКД) addition
- Clarifying materials (Матеріали для освітлення)
- SO₂ addition for preservation
- By-products: Stems (Гребені), Pomace (М'язга), Depleted pomace (Збіднена м'язга), Press wine (Сусло-самоплив), Secondary fractions

---

## 🚧 Planned Support

### Phase 2: Red Dry Wine

| Color | Style | CO2 Style | Scheme Type | Status |
|-------|-------|-----------|-------------|--------|
| Червоне | Сухе | Тихе | Червона | 📋 PLANNED |

**Key Differences from White**:
- Fermentation with skins (maceration)
- Extended skin contact for color and tannin extraction
- Malolactic fermentation
- Longer aging period
- Different temperature control requirements

**Additional Stages**:
- Maceration (Мацерація)
- Pressing after fermentation
- Malolactic fermentation (Яблучно-молочне бродіння)
- Oak aging (optional) (Витримка в дубі)

---

### Phase 3: Rosé Wine

| Color | Style | CO2 Style | Scheme Type | Status |
|-------|-------|-----------|-------------|--------|
| Рожеве | Сухе | Тихе | Змішана | 📋 PLANNED |

**Key Differences**:
- Short skin contact (saignée or direct press method)
- Controlled color extraction
- Similar to white wine process after pressing
- Delicate flavor profile

**Methods**:
1. **Saignée** (Bleeding) - Remove juice early from red fermentation
2. **Direct Press** - Gentle pressing of red grapes, short skin contact
3. **Blending** - Mix white and red wines (less common for quality rosé)

---

### Phase 4: Semi-Dry & Semi-Sweet Wines

| Color | Style | CO2 Style | Scheme Type | Status |
|-------|-------|-----------|-------------|--------|
| Біле | Напівсухе | Тихе | Біла | 📋 PLANNED |
| Біле | Напівсолодке | Тихе | Біла | 📋 PLANNED |
| Червоне | Напівсухе | Тихе | Червона | 📋 PLANNED |
| Червоне | Напівсолодке | Тихе | Червона | 📋 PLANNED |

**Key Differences**:
- Controlled fermentation stop to retain residual sugar
- Higher SO₂ levels for stability
- Cold stabilization
- Sterile filtration
- Additional quality control

**Sugar Content**:
- **Напівсухе** (Semi-dry): 4-18 g/dm³
- **Напівсолодке** (Semi-sweet): 18-45 g/dm³

---

### Phase 5: Sweet & Dessert Wines

| Color | Style | CO2 Style | Scheme Type | Status |
|-------|-------|-----------|-------------|--------|
| Біле | Солодке | Тихе | Біла | 📋 PLANNED |
| Червоне | Солодке | Тихе | Червона | 📋 PLANNED |

**Key Differences**:
- Late harvest grapes (higher sugar)
- Fortification (optional - for fortified dessert wines)
- Noble rot treatment (Botrytis cinerea) for specific types
- Special fermentation control
- Extended aging

**Sugar Content**:
- **Солодке** (Sweet): > 45 g/dm³

---

### Phase 6: Sparkling Wines

| Color | Style | CO2 Style | Scheme Type | Status |
|-------|-------|-----------|-------------|--------|
| Біле | Сухе | Ігристе | Біла | 📋 PLANNED |
| Червоне | Сухе | Ігристе | Червона | 📋 PLANNED |
| Рожеве | Сухе | Ігристе | Змішана | 📋 PLANNED |

**Key Differences**:
- Base wine production
- Secondary fermentation in bottle (Traditional method) or tank (Charmat method)
- CO₂ incorporation and retention
- Riddling (remuage) and disgorgement
- Dosage addition
- Special pressure-resistant equipment

**Methods**:
1. **Traditional/Champagne Method** (Méthode Champenoise)
   - Secondary fermentation in bottle
   - Sur lie aging
   - Manual or mechanical riddling
   - Disgorgement
   
2. **Charmat/Tank Method** (Метод Шарма)
   - Secondary fermentation in pressurized tank
   - Faster, more economical
   - Preserves fresh fruit character

3. **Carbonation** (Simple injection - lower quality)

---

## Technical Implementation Plan

### Database Schema
```python
wine_types = {
    'color': ['Біле', 'Червоне', 'Рожеве'],
    'style': ['Сухе', 'Напівсухе', 'Напівсолодке', 'Солодке'],
    'style_co2': ['Тихе', 'Ігристе'],
    'scheme_type': ['Біла', 'Червона', 'Змішана']
}
```

### Code Architecture
```javascript
// scheme-builder.js
class SchemeBuilder {
    getSchemeType() {
        // Detect wine type from user selections
        return `${color}-${style}-${co2}-${schemeType}`;
    }
    
    buildScheme() {
        switch(schemeType) {
            case 'white-dry-calm-white-scheme':
                return this.buildWhiteDryCalmWhiteScheme();
            case 'red-dry-calm-red-scheme':
                return this.buildRedDryCalmRedScheme();
            case 'rose-dry-calm-mixed-scheme':
                return this.buildRoseDryCalmMixedScheme();
            // ... more cases
        }
    }
}
```

### File Organization
```
static/js/scheme/
├── builders/
│   ├── white-dry-builder.js      ✅ Current (in scheme-builder.js)
│   ├── red-dry-builder.js         📋 Future
│   ├── rose-dry-builder.js        📋 Future
│   ├── semi-dry-builder.js        📋 Future
│   ├── semi-sweet-builder.js      📋 Future
│   ├── sweet-builder.js           📋 Future
│   └── sparkling-builder.js       📋 Future
```

---

## Validation Rules

### User Input Validation
```javascript
// Check if combination is supported
function validateWineType(color, style, styleCO2, schemeType) {
    const supportedCombinations = [
        { color: 'Біле', style: 'Сухе', styleCO2: 'Тихе', schemeType: 'Біла' }
        // Add more as implemented
    ];
    
    return supportedCombinations.some(combo => 
        combo.color === color &&
        combo.style === style &&
        combo.styleCO2 === styleCO2 &&
        combo.schemeType === schemeType
    );
}
```

### Error Messages
- **Ukrainian**: Clear message explaining which types are supported
- **Show user's selection** vs **supported options**
- **Suggest alternatives** if possible
- **Roadmap link** for future types

---

## Quality Assurance

### Testing Strategy
- [ ] Unit tests for each wine type builder
- [ ] Integration tests for scheme generation
- [ ] Visual regression tests (compare rendered schemes)
- [ ] User acceptance testing with winemakers

### Documentation
- [ ] Technical specifications for each wine type
- [ ] Production notes and best practices
- [ ] Troubleshooting guide
- [ ] API documentation

---

## Timeline

| Phase | Wine Types | Target Version | ETA |
|-------|-----------|----------------|-----|
| Phase 1 | White Dry Still | v1.0 | ✅ DONE |
| Phase 2 | Red Dry Still | v1.1 | Q2 2026 |
| Phase 3 | Rosé Dry Still | v1.2 | Q3 2026 |
| Phase 4 | Semi-Dry/Sweet Still | v1.3 | Q4 2026 |
| Phase 5 | Sweet & Dessert | v1.4 | Q1 2027 |
| Phase 6 | Sparkling | v2.0 | Q2 2027 |

---

## Contributing

When adding support for a new wine type:

1. Research the technological process
2. Create new builder class in `builders/` folder
3. Add validation rules to `scheme-builder.js`
4. Update UI to enable relevant buttons
5. Add tests
6. Update this document
7. Document in CHANGELOG.md

---

## References

### Winemaking Standards
- ДСТУ 4806:2007 - Вина виноградні. Загальні технічні умови
- ДСТУ 2366-94 - Вина ігристі. Технічні умови
- OIV Standards (International Organisation of Vine and Wine)

### Technical Literature
- "Enology: Principles and Applications" by Patrick Iland
- "The Oxford Companion to Wine" by Jancis Robinson
- "Wine Science: Principles and Applications" by Ronald S. Jackson

---

**Last Updated**: 2026-02-10
**Version**: 1.0
**Maintainer**: Vynorob Development Team
