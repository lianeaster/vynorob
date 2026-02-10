/**
 * Technology Scheme Renderer
 * Handles all canvas drawing operations for wine production technology schemes
 * 
 * ⚠️ IMPORTANT LIMITATION:
 * This scheme is ONLY valid for:
 * - Color: White (Біле)
 * - Style: Dry (Сухе) 
 * - CO2 Style: Still/Calm (Тихе)
 * - Production Scheme: White Scheme (Біла)
 * 
 * Other wine types (red, rosé, semi-dry, semi-sweet, sweet, sparkling) will be 
 * added in future versions. See WINE_TYPES_SUPPORT.md for roadmap.
 * 
 * ARCHITECTURE:
 * - Centralized configuration: All colors, dimensions, fonts in this.config
 * - BaseBox system: Reusable box drawing with consistent styling
 * - Helper methods: applyLineStyle(), applyFillStyle(), applyBoxTextStyle(), applyLabelTextStyle()
 * - Shape primitives: drawRoundedRect(), drawBaseBox(), drawArrowhead[Right|Left|Down]()
 * - Complex elements: drawHorizontalArrowWithLabel(), drawTextWithBackground()
 * - High-level composers: drawProcessStage(), drawProcessBox(), drawArrowWithText()
 * 
 * REFACTORING NOTE:
 * This file is being split into modular architecture. See static/js/scheme/ folder
 * for the new modular version and REFACTORING_GUIDE.md for migration details.
 */

class SchemeRenderer {
    constructor(canvas, wineData) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.wineData = wineData;
        
        // Centralized style configuration (BaseBox settings)
        this.config = {
            colors: {
                background: '#fff',
                line: '#000',
                text: '#000',
                textBackground: '#fff'
            },
            dimensions: {
                lineWidth: 2,
                arrowHeadLength: 8,
                arrowHeadWidth: 5,
                boxCornerRadius: 10,
                boxPaddingH: 25,
                boxPaddingV: 18,
                textPadding: 3,
                arrowLength: 60
            },
            fonts: {
                box: '14px Arial',
                label: '12px Arial',
                boxSize: 14,
                labelSize: 12,
                boxLineHeight: 20,
                labelLineHeight: 14
            },
            layout: {
                canvasWidth: 1600,
                topPadding: 50,
                bottomPadding: 50,
                boxWidth: 260,
                sideArrowLength: 120, // Half of (250 - boxWidth/2)
                multiArrowSpacing: 70
            }
        };
    }

    /**
     * Helper: Apply line style
     */
    applyLineStyle() {
        this.ctx.strokeStyle = this.config.colors.line;
        this.ctx.lineWidth = this.config.dimensions.lineWidth;
    }

    /**
     * Helper: Apply fill style
     */
    applyFillStyle(color = null) {
        this.ctx.fillStyle = color || this.config.colors.text;
    }

    /**
     * Helper: Apply text style for boxes
     */
    applyBoxTextStyle() {
        this.ctx.font = this.config.fonts.box;
        this.ctx.fillStyle = this.config.colors.text;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
    }

    /**
     * Helper: Apply text style for labels
     */
    applyLabelTextStyle() {
        this.ctx.font = this.config.fonts.label;
        this.ctx.fillStyle = this.config.colors.text;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
    }

    /**
     * Helper: Draw rounded rectangle (BaseBox shape)
     */
    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.arcTo(x, y, x + radius, y, radius);
        this.ctx.closePath();
    }

    /**
     * Helper: Draw a complete BaseBox with standard styling
     * @param {Object} config - Box configuration
     * @param {number} config.x - Center X position
     * @param {number} config.y - Top Y position
     * @param {number} config.width - Box width
     * @param {number} config.height - Box height
     * @param {string} config.text - Text content (optional)
     * @param {boolean} config.fillBackground - Whether to fill background (default true)
     * @param {boolean} config.strokeBorder - Whether to stroke border (default true)
     */
    drawBaseBox(config) {
        const {
            x,
            y,
            width,
            height,
            text = '',
            fillBackground = true,
            strokeBorder = true
        } = config;
        
        this.ctx.save();
        
        const boxX = x - width / 2;
        const radius = this.config.dimensions.boxCornerRadius;
        
        // Draw rounded rectangle
        this.drawRoundedRect(boxX, y, width, height, radius);
        
        // Fill background
        if (fillBackground) {
            this.applyFillStyle(this.config.colors.background);
            this.ctx.fill();
        }
        
        // Stroke border
        if (strokeBorder) {
            this.applyLineStyle();
            this.ctx.stroke();
        }
        
        // Draw centered text if provided
        if (text) {
            this.applyBoxTextStyle();
            const lines = text.split('\n');
            const lineHeight = this.config.fonts.boxLineHeight;
            const textBlockHeight = (lines.length - 1) * lineHeight + this.config.fonts.boxSize;
            const textStartY = y + (height - textBlockHeight) / 2 + this.config.fonts.boxSize / 2;
            
            lines.forEach((line, i) => {
                this.ctx.fillText(line, x, textStartY + (i * lineHeight));
            });
        }
        
        this.ctx.restore();
    }

    /**
     * Helper: Draw arrowhead pointing right
     */
    drawArrowheadRight(x, y) {
        const len = this.config.dimensions.arrowHeadLength;
        const width = this.config.dimensions.arrowHeadWidth;
        this.ctx.fillStyle = this.config.colors.line;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x - len, y - width);
        this.ctx.lineTo(x - len, y + width);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Helper: Draw arrowhead pointing left
     */
    drawArrowheadLeft(x, y) {
        const len = this.config.dimensions.arrowHeadLength;
        const width = this.config.dimensions.arrowHeadWidth;
        this.ctx.fillStyle = this.config.colors.line;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + len, y - width);
        this.ctx.lineTo(x + len, y + width);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Helper: Draw arrowhead pointing down
     */
    drawArrowheadDown(x, y) {
        const len = this.config.dimensions.arrowHeadLength;
        const width = this.config.dimensions.arrowHeadWidth;
        this.ctx.fillStyle = this.config.colors.line;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x - width, y - len);
        this.ctx.lineTo(x + width, y - len);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Helper: Draw text with background
     */
    drawTextWithBackground(text, x, y, options = {}) {
        const padding = options.padding || this.config.dimensions.textPadding;
        const bgColor = options.bgColor || this.config.colors.textBackground;
        const textColor = options.textColor || this.config.colors.text;
        const font = options.font || this.config.fonts.label;
        
        this.ctx.save();
        this.ctx.font = font;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        // Handle multi-line text
        const lines = text.split('\n');
        const fontSize = parseInt(font);
        const lineHeight = options.lineHeight || (fontSize === 14 ? this.config.fonts.boxLineHeight : this.config.fonts.labelLineHeight);
        const totalHeight = lines.length * lineHeight;
        
        // Measure max width
        let maxWidth = 0;
        lines.forEach(line => {
            const metrics = this.ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        });
        
        // Draw background
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(
            x - maxWidth/2 - padding,
            y - padding,
            maxWidth + padding * 2,
            totalHeight + padding * 2
        );
        
        // Draw text
        this.ctx.fillStyle = textColor;
        lines.forEach((line, i) => {
            this.ctx.fillText(line, x, y + i * lineHeight);
        });
        
        this.ctx.restore();
        
        return { width: maxWidth, height: totalHeight };
    }

    /**
     * Helper: Draw horizontal arrow with text above
     * Draws continuous arrow with text label positioned above center
     * @param {Object} config - Arrow configuration
     * @param {number} config.x1 - Start X position
     * @param {number} config.y - Y position of arrow line
     * @param {number} config.x2 - End X position
     * @param {string} config.text - Label text
     * @param {string} [config.direction='right'] - Arrow direction: 'right', 'left', or 'both'
     */
    drawHorizontalArrowWithLabel(config) {
        const { x1, y, x2, text, direction = 'right' } = config;
        
        this.ctx.save();
        
        // Draw continuous arrow line
        this.applyLineStyle();
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y);
        this.ctx.lineTo(x2, y);
        this.ctx.stroke();
        
        // Draw arrowhead(s)
        if (direction === 'right' || direction === 'both') {
            this.drawArrowheadRight(x2, y);
        }
        if (direction === 'left' || direction === 'both') {
            this.drawArrowheadLeft(x1, y);
        }
        
        // Draw text above arrow center with background
        const centerX = (x1 + x2) / 2;
        const textY = y - 10; // 10px above arrow
        
        this.drawTextWithBackground(text, centerX, textY, {
            font: this.config.fonts.label,
            lineHeight: this.config.fonts.labelLineHeight
        });
        
        this.ctx.restore();
    }

    /**
     * Main drawing function - orchestrates the entire scheme
     */
    drawScheme() {
        // Use config for all dimensions
        const canvasWidth = this.config.layout.canvasWidth;
        const topPadding = this.config.layout.topPadding;
        const arrowLength = this.config.dimensions.arrowLength;
        const boxWidth = this.config.layout.boxWidth;
        
        // Estimate total height (will adjust as we draw)
        const totalHeight = 2000; // Generous initial height
        
        // Set canvas dimensions dynamically
        this.canvas.width = canvasWidth;
        this.canvas.height = totalHeight;
        
        console.log(`Canvas dynamically sized: ${canvasWidth}x${totalHeight}px`);
        
        // Clear canvas with background color
        this.ctx.fillStyle = this.config.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set default styles
        this.applyLineStyle();
        this.applyFillStyle();
        this.ctx.font = this.config.fonts.box;
        
        let currentY = topPadding;
        const centerX = canvasWidth / 2 - 200; // Shift left to accommodate right branch
        
        // First arrow with starting conditions text on it
        const textHeight = 120;
        currentY = this.drawArrowWithText(centerX, currentY, textHeight, '', false, true);
        
        // 1. Гребеневіддокремлення, Подрібнення
        const stage1EndY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Гребеневіддокремлення,\nПодрібнення',
            arrows: {
                right: { text: 'Гребені' }
                // bottom label will be drawn manually after arrow
            }
        });
        currentY = stage1EndY;
        
        // Arrow to next - interrupt it for the "М'язга" label
        const labelText = 'М\'язга';
        this.ctx.save();
        this.ctx.font = '12px Arial';
        const labelMetrics = this.ctx.measureText(labelText);
        const labelHeight = 12 + 6; // text height + padding (3px top + 3px bottom)
        this.ctx.restore();
        
        // Draw arrow in two parts - before and after label
        const arrowStart = currentY;
        const arrowEnd = currentY + arrowLength;
        // Position label in the middle of the arrow
        const arrowMid = (arrowStart + arrowEnd) / 2;
        const labelY = arrowMid - labelHeight / 2;
        const labelTop = labelY;
        const labelBottom = labelY + labelHeight;
        
        // Arrow part 1: from box to label (line only, NO arrowhead)
        this.ctx.save();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, arrowStart);
        this.ctx.lineTo(centerX, labelTop);
        this.ctx.stroke();
        this.ctx.restore();
        
        // Arrow part 2: from label to next box (WITH arrowhead at end)
        this.drawArrow(centerX, labelBottom, centerX, arrowEnd);
        
        // NOW draw the label on top of arrows
        this.drawSideLabel(centerX, labelY, labelText);
        
        currentY += arrowLength;
        
        // 2. Відділення сусла-самопливу
        const viddilennyaY = currentY;
        currentY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Відділення\nсусла-самопливу',
            arrows: {
                // bottom label will be drawn manually after arrow
            }
        });
        const viddilennyaEndY = currentY;
        const viddilennyaHeight = viddilennyaEndY - viddilennyaY;
        
        // Draw right output arrow from Відділення for "Збіднена м'язга"
        const viddilennyaCenterY = viddilennyaY + viddilennyaHeight/2;
        const viddilennyaRightX = centerX + boxWidth/2;
        const zbidnenaArrowLength = 250 - boxWidth/2;
        
        // Draw full continuous arrow line
        this.ctx.save();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(viddilennyaRightX, viddilennyaCenterY);
        this.ctx.lineTo(viddilennyaRightX + zbidnenaArrowLength, viddilennyaCenterY);
        this.ctx.stroke();
        
        // Draw arrowhead
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.moveTo(viddilennyaRightX + zbidnenaArrowLength, viddilennyaCenterY);
        this.ctx.lineTo(viddilennyaRightX + zbidnenaArrowLength - 8, viddilennyaCenterY - 5);
        this.ctx.lineTo(viddilennyaRightX + zbidnenaArrowLength - 8, viddilennyaCenterY + 5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Calculate text dimensions
        const zbidnenaText = 'Збіднена\nм\'язга';
        const zbidnenaLines = zbidnenaText.split('\n');
        this.ctx.textAlign = 'center';
        this.ctx.font = '12px Arial';
        const zbidnenaTextX = viddilennyaRightX + zbidnenaArrowLength / 2;
        const lineHeight = 14;
        const totalTextHeight = zbidnenaLines.length * lineHeight;
        const zbidnenaStartY = viddilennyaCenterY - 10 - totalTextHeight;
        
        let maxWidth = 0;
        zbidnenaLines.forEach(line => {
            const textMetrics = this.ctx.measureText(line);
            maxWidth = Math.max(maxWidth, textMetrics.width);
        });
        const padding = 3;
        
        // Draw text background with symmetric padding
        this.ctx.fillStyle = '#fff';
        const bgTop = zbidnenaStartY - padding;
        const bgBottom = zbidnenaStartY + totalTextHeight + padding; // Symmetric padding
        const bgHeight = bgBottom - bgTop;
        this.ctx.fillRect(zbidnenaTextX - maxWidth/2 - padding, bgTop, 
                          maxWidth + padding*2, bgHeight);
        
        // Draw text with proper baseline
        this.ctx.fillStyle = '#000';
        this.ctx.textBaseline = 'top';
        zbidnenaLines.forEach((line, i) => {
            this.ctx.fillText(line, zbidnenaTextX, zbidnenaStartY + (i * lineHeight));
        });
        
        this.ctx.restore();
        
        // Draw Пресування on the right, aligned with Віддilення
        const arrowLengthToPresuvanny = 250 - boxWidth/2;
        const rightBoxX = centerX + boxWidth/2 + arrowLengthToPresuvanny + boxWidth/2;
        
        // Calculate Пресування height to center it with Віддilення
        const estimatedPresuvannyaHeight = 20 + (18 * 2); // 1 line text + padding
        const presuvannyaY = viddilennyaCenterY - estimatedPresuvannyaHeight / 2;
        
        console.log('Centering boxes - Віддilення center:', viddilennyaCenterY, 'Пресування start:', presuvannyaY);
        
        const presuvannyaEndY = this.drawProcessStage({
            x: rightBoxX,
            y: presuvannyaY,
            width: boxWidth,
            text: 'Пресування',
            arrows: {
                right: { text: 'Вичавки\n→Пресові II та\nIII фракції на\nординарні\nміцні вина' }
            }
        });
        
        // Arrow after Відділення - interrupt it for the "Сусло-самоплив" label
        const susloLabelText = 'Сусло-самоплив';
        this.ctx.save();
        this.ctx.font = '12px Arial';
        const susloLabelMetrics = this.ctx.measureText(susloLabelText);
        const susloLabelHeight = 12 + 6; // text height + padding (3px top + 3px bottom)
        this.ctx.restore();
        
        const susloArrowStart = currentY;
        const susloArrowEnd = currentY + arrowLength;
        // Position label in the middle of the arrow
        const susloArrowMid = (susloArrowStart + susloArrowEnd) / 2;
        const susloLabelY = susloArrowMid - susloLabelHeight / 2;
        const susloLabelTop = susloLabelY;
        const susloLabelBottom = susloLabelY + susloLabelHeight;
        
        // Arrow part 1: from box to label (line only, NO arrowhead)
        this.ctx.save();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, susloArrowStart);
        this.ctx.lineTo(centerX, susloLabelTop);
        this.ctx.stroke();
        this.ctx.restore();
        
        // Arrow part 2: from label to next box (WITH arrowhead at end)
        this.drawArrow(centerX, susloLabelBottom, centerX, susloArrowEnd);
        
        // NOW draw the label on top of arrows
        this.drawSideLabel(centerX, susloLabelY, susloLabelText);
        
        currentY += arrowLength;
        
        // 3. Відстоювання сусла
        const vidstoyuvannyaY = currentY;
        currentY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Відстоювання сусла:\nt = 14...17°C,\nτ = 12 год',
            arrows: {
                left: [
                    { type: 'double', text: 'Холодоагент' },
                    { text: 'Матеріали для\nосвітлення' },
                    { text: 'SO₂\n75...80 мг/дм³' }
                ]
                // bottom label will be drawn manually after arrow
            }
        });
        const vidstoyuvannyaEndY = currentY;
        const vidstoyuvannyaHeight = vidstoyuvannyaEndY - vidstoyuvannyaY;
        
        // Main path continues down from Відстоювання - interrupt it for "І фракція" label
        const ifraktsiaLabelText = 'І фракція';
        this.ctx.save();
        this.ctx.font = '12px Arial';
        const ifraktsiaLabelMetrics = this.ctx.measureText(ifraktsiaLabelText);
        const ifraktsiaLabelHeight = 12 + 6; // text height + padding (3px top + 3px bottom)
        this.ctx.restore();
        
        const ifraktsiaArrowStart = currentY;
        const ifraktsiaArrowEnd = currentY + arrowLength;
        // Position label in the middle of the arrow
        const ifraktsiaArrowMid = (ifraktsiaArrowStart + ifraktsiaArrowEnd) / 2;
        const ifraktsiaLabelY = ifraktsiaArrowMid - ifraktsiaLabelHeight / 2;
        const ifraktsiaLabelTop = ifraktsiaLabelY;
        const ifraktsiaLabelBottom = ifraktsiaLabelY + ifraktsiaLabelHeight;
        
        // Arrow part 1: from box to label (line only, NO arrowhead)
        this.ctx.save();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, ifraktsiaArrowStart);
        this.ctx.lineTo(centerX, ifraktsiaLabelTop);
        this.ctx.stroke();
        this.ctx.restore();
        
        // Arrow part 2: from label to next box (WITH arrowhead at end)
        this.drawArrow(centerX, ifraktsiaLabelBottom, centerX, ifraktsiaArrowEnd);
        
        // NOW draw the label on top of arrows
        this.drawSideLabel(centerX, ifraktsiaLabelY, ifraktsiaLabelText);
        
        currentY += arrowLength;
        
        // 4. Зняття з осаду (where both paths merge)
        const znyttiaY = currentY;
        currentY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Зняття з осаду',
            arrows: {}
        });
        
        // Draw vertical arrow from Пресування down to Зняття з осаду level
        const presuvannyaMergeY = znyttiaY + (currentY - znyttiaY) / 2;
        this.ctx.save();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        
        // Vertical line down from Пресування
        this.ctx.beginPath();
        this.ctx.moveTo(rightBoxX, presuvannyaEndY);
        this.ctx.lineTo(rightBoxX, presuvannyaMergeY);
        this.ctx.stroke();
        
        // Horizontal line from right to merge with main path
        this.ctx.beginPath();
        this.ctx.moveTo(rightBoxX, presuvannyaMergeY);
        this.ctx.lineTo(centerX + boxWidth/2, presuvannyaMergeY);
        this.ctx.stroke();
        
        // Arrowhead pointing LEFT (into Зняття з осаду box from outside)
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        // Tip at the box edge, pointing LEFT
        const arrowTipX = centerX + boxWidth/2;
        this.ctx.moveTo(arrowTipX, presuvannyaMergeY);
        this.ctx.lineTo(arrowTipX + 8, presuvannyaMergeY - 5);
        this.ctx.lineTo(arrowTipX + 8, presuvannyaMergeY + 5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
        
        this.drawArrow(centerX, currentY, centerX, currentY + arrowLength);
        currentY += arrowLength;
        
        // 6. Бродіння сусла
        currentY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Бродіння сусла,\nt=14...17°C',
            arrows: {
                left: [
                    { type: 'double', text: 'Холодоагент' },
                    { text: 'ЧКД' }
                ],
                right: { text: 'Гази бродіння' }
            }
        });
        
        this.drawArrow(centerX, currentY, centerX, currentY + arrowLength);
        currentY += arrowLength;
        
        // 7. Освітлення виноматервалу
        currentY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Освітлення\nвиноматервалу\nt=10...12°C',
            arrows: {
                left: { type: 'double', text: 'Холодоагент' },
                right: { text: 'Осад' }
            }
        });
        
        this.drawArrow(centerX, currentY, centerX, currentY + arrowLength);
        currentY += arrowLength;
        
        // 8. Зняття з дріжджів
        currentY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Зняття з дріжджів',
            arrows: {
                right: { text: 'Дріжджові осади' }
            }
        });
        
        this.drawArrow(centerX, currentY, centerX, currentY + arrowLength);
        currentY += arrowLength;
        
        // 9. Егалізація
        currentY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Егалізація',
            arrows: {
                left: { text: 'SO₂ \n30...50 мг/дм³' }
            }
        });
        
        this.drawArrow(centerX, currentY, centerX, currentY + arrowLength);
        currentY += arrowLength;
        
        // 10. Зберігання
        currentY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Зберігання',
            arrows: {}
        });
        
        // Last arrow with text intersection
        currentY = this.drawArrowWithText(centerX, currentY, 120, null, true);
        
        console.log(`Final Y position: ${currentY}px, Canvas height: ${this.canvas.height}px`);
    }

    /**
     * Draw a process stage with configurable arrows and labels
     * @param {Object} config - Configuration object
     * @param {number} config.x - X position (center)
     * @param {number} config.y - Y position (top)
     * @param {number} config.width - Box width
     * @param {string} config.text - Main process text
     * @param {Object} [config.arrows] - Arrow configuration
     * @param {boolean|Object|Array} config.arrows.left - Left arrow(s) - single object or array of {type: 'double', text: 'label'} or {text: 'label'}
     * @param {boolean|Object} config.arrows.right - Right arrow (true/false or {text: 'label'})
     * @param {boolean|Object} config.arrows.top - Top arrow
     * @param {boolean|Object} config.arrows.bottom - Bottom arrow (true/false or {label: 'text'})
     * @returns {number} - New Y position after drawing
     */
    drawProcessStage(config) {
        const x = config.x;
        const y = config.y;
        const width = config.width;
        const text = config.text;
        const arrows = config.arrows || {};
        
        // Calculate minimum height needed for left arrows
        let minHeightForArrows = 0;
        if (arrows.left) {
            const leftArrows = Array.isArray(arrows.left) ? arrows.left : [arrows.left];
            if (leftArrows.length > 1) {
                // Need space for multiple arrows with proper spacing
                const arrowSpacing = 70; // Minimum 70px between arrows
                minHeightForArrows = (leftArrows.length - 1) * arrowSpacing + 40; // +40 for top/bottom margins
            }
        }
        
        // Draw the main process box (with minimum height if needed)
        let boxEndY = this.drawProcessBox(x, y, width, 0, text);
        let boxHeight = boxEndY - y;
        
        // If box height is not enough for arrows, extend it
        if (minHeightForArrows > boxHeight) {
            boxHeight = minHeightForArrows;
            boxEndY = y + boxHeight;
            
            // Redraw the box with extended height using BaseBox helper
            this.drawBaseBox({
                x: x,
                y: y,
                width: width,
                height: boxHeight,
                text: text,
                fillBackground: true,
                strokeBorder: true
            });
        }
        
        // Draw left arrow(s) if configured - evenly distributed
        if (arrows.left) {
            const leftArrows = Array.isArray(arrows.left) ? arrows.left : [arrows.left];
            const arrowSpacing = leftArrows.length > 1 ? (boxHeight - 40) / (leftArrows.length - 1) : 0;
            
            leftArrows.forEach((leftArrow, index) => {
                if (typeof leftArrow === 'object' && leftArrow.type === 'double') {
                    // Double-sided arrow
                    const arrowStartX = x - 250;
                    const arrowEndX = x - width/2;
                    // Even distribution across box height
                    const arrowY = leftArrows.length > 1 
                        ? y + 20 + (index * arrowSpacing)
                        : y + boxHeight/2;
                    this.drawDoubleArrowWithText(arrowStartX, arrowY, arrowEndX, arrowY, leftArrow.text || '');
                } else if (typeof leftArrow === 'object' && leftArrow.text) {
                    // Input arrow with text - same length as double arrow (250px)
                    const arrowStartX = x - 250; // Start 250px to the left (same as double arrow)
                    const arrowEndX = x - width/2; // End at the box edge
                    const leftArrowCenter = (arrowStartX + arrowEndX) / 2; // Center for text
                    // Even distribution across box height
                    const arrowY = leftArrows.length > 1 
                        ? y + 20 + (index * arrowSpacing)
                        : y + boxHeight/2;
                    this.drawSideInput(leftArrowCenter, arrowY, leftArrow.text, arrowStartX, arrowEndX);
                }
            });
        }
        
        // Draw right arrow if configured
        if (arrows.right && typeof arrows.right === 'object' && arrows.right.text) {
            const boxX = x - width / 2;
            const rightX = boxX + width;
            const arrowY = y + boxHeight / 2;
            // Match the actual visible length of left arrows: 250 - width/2
            const arrowLength = 250 - width/2;
            
            this.ctx.save();
            
            // Calculate text dimensions first
            const lines = arrows.right.text.split('\n');
            this.ctx.textAlign = 'center';
            this.ctx.font = '12px Arial';
            const textX = rightX + arrowLength / 2;
            const lineHeight = 14;
            const totalTextHeight = lines.length * lineHeight;
            const startY = arrowY - 10 - totalTextHeight;
            
            let maxWidth = 0;
            lines.forEach(line => {
                const textMetrics = this.ctx.measureText(line);
                maxWidth = Math.max(maxWidth, textMetrics.width);
            });
            
            const padding = 3;
            const textBoxTop = startY - 12 - padding;
            const textBoxBottom = startY - 12 - padding + totalTextHeight + padding*2;
            
            // Draw horizontal arrow ONLY where there's no text (check if arrow line intersects text box)
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            
            // Check if arrow passes through text area (text is above arrow)
            // Since text is above the arrow (startY < arrowY), we just draw the full arrow
            this.ctx.beginPath();
            this.ctx.moveTo(rightX, arrowY);
            this.ctx.lineTo(rightX + arrowLength, arrowY);
            this.ctx.stroke();
            
            // Draw arrowhead
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.moveTo(rightX + arrowLength, arrowY);
            this.ctx.lineTo(rightX + arrowLength - 8, arrowY - 5);
            this.ctx.lineTo(rightX + arrowLength - 8, arrowY + 5);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw text background - symmetric padding around text
            this.ctx.fillStyle = '#fff';
            const bgTop = startY - padding;
            const bgBottom = startY + totalTextHeight + padding; // Symmetric padding
            const bgHeight = bgBottom - bgTop;
            
            this.ctx.fillRect(textX - maxWidth/2 - padding, bgTop, 
                              maxWidth + padding*2, bgHeight);
            
            // Draw text
            this.ctx.fillStyle = '#000';
            this.ctx.textBaseline = 'top';
            lines.forEach((line, i) => {
                this.ctx.fillText(line, textX, startY + (i * lineHeight));
            });
            
            this.ctx.restore();
        }
        
        // Draw bottom label if configured
        if (arrows.bottom && typeof arrows.bottom === 'object' && arrows.bottom.label) {
            this.drawSideLabel(x, boxEndY + 25, arrows.bottom.label);
        }
        
        return boxEndY;
    }

    // drawStartingConditions is now handled by drawArrowWithText with isStart=true

    /**
     * Draw process box with side output arrow
     */
    drawProcessWithSideOutput(x, y, width, height, mainText, sideText, isRightSide) {
        // Draw main process box and get the bottom Y position
        const boxBottomY = this.drawProcessBox(x, y, width, height, mainText);
        
        // Calculate the actual height of the box
        const actualHeight = boxBottomY - y;
        
        // Draw side arrow and text centered vertically on the box
        const midY = y + actualHeight / 2;
        
        if (isRightSide) {
            // Arrow to the right
            const startX = x + width / 2;
            const endX = startX + 120;
            
            this.drawArrow(startX, midY, endX, midY);
            
            // Draw side text ABOVE the arrow, centered along arrow length
            this.ctx.save();
            this.ctx.textAlign = 'center'; // Center text
            this.ctx.font = '12px Arial';
            const lines = sideText.split('\n');
            const lineHeight = 14;
            const totalTextHeight = lines.length * lineHeight;
            const textStartY = midY - totalTextHeight - 5; // 5px gap above arrow
            const textX = startX + (endX - startX) / 2; // Center of arrow
            
            lines.forEach((line, i) => {
                this.ctx.fillText(line, textX, textStartY + (i * lineHeight));
            });
            this.ctx.restore();
        }
        
        return boxBottomY;
    }

    /**
     * Draw side input labels (left side)
     * Text is positioned ABOVE and centered along the arrow length
     * @param {number} x - Center point of the arrow horizontally
     * @param {number} y - Center point of the arrow vertically (text will be above this)
     * @param {string} text - Multi-line text (separated by \n)
     */
    drawSideInput(x, y, text, startX, endX) {
        this.ctx.save();
        
        // Calculate text dimensions first
        this.ctx.textAlign = 'center';
        this.ctx.font = '12px Arial';
        const lines = text.split('\n');
        const lineHeight = 14;
        const totalTextHeight = lines.length * lineHeight;
        const textStartY = y - totalTextHeight - 10; // 10px gap above arrow
        
        let maxWidth = 0;
        lines.forEach(line => {
            const textMetrics = this.ctx.measureText(line);
            maxWidth = Math.max(maxWidth, textMetrics.width);
        });
        
        const padding = 3;
        
        // Draw the arrow line (text is above, so arrow doesn't intersect)
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, y);
        this.ctx.lineTo(endX, y);
        this.ctx.stroke();
        
        // Draw arrowhead pointing right (towards the box)
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.moveTo(endX, y);
        this.ctx.lineTo(endX - 8, y - 5);
        this.ctx.lineTo(endX - 8, y + 5);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw text background - symmetric padding around text
        this.ctx.fillStyle = '#fff';
        const bgTop = textStartY - padding;
        const bgBottom = textStartY + totalTextHeight + padding; // Symmetric padding
        const bgHeight = bgBottom - bgTop;
        this.ctx.fillRect(x - maxWidth/2 - padding, bgTop, 
                          maxWidth + padding*2, bgHeight);
        
        // Draw text
        this.ctx.fillStyle = '#000';
        this.ctx.textBaseline = 'top';
        lines.forEach((line, i) => {
            this.ctx.fillText(line, x, textStartY + (i * lineHeight));
        });
        
        this.ctx.restore();
    }

    /**
     * Draw centered label below box (with background wide enough to interrupt vertical arrow)
     */
    drawSideLabel(x, y, text) {
        // Use the helper method for consistent text with background rendering
        this.drawTextWithBackground(text, x, y, {
            font: this.config.fonts.label,
            lineHeight: this.config.fonts.labelLineHeight
        });
    }

    /**
     * Draw process box with rounded corners
     */
    drawProcessBox(x, y, width, height, text) {
        this.ctx.save();
        
        // Handle multi-line text with \n
        let lines = text.split('\n');
        
        // Use config for all styling values
        const fontSize = this.config.fonts.boxSize;
        const lineHeight = this.config.fonts.boxLineHeight;
        const paddingV = this.config.dimensions.boxPaddingV;
        const paddingH = this.config.dimensions.boxPaddingH;
        const cornerRadius = this.config.dimensions.boxCornerRadius;
        this.ctx.font = this.config.fonts.box;
        
        const maxTextWidth = Math.max(...lines.map(line => this.ctx.measureText(line).width));
        const actualWidth = Math.max(width, maxTextWidth + (paddingH * 2));
        
        // Height based on text content with proper spacing
        const textBlockHeight = (lines.length - 1) * lineHeight + fontSize;
        const actualHeight = textBlockHeight + (paddingV * 2);
        
        // Center the box
        const boxX = x - actualWidth / 2;
        const boxY = y;
        
        // Draw rounded rectangle using helper
        this.drawRoundedRect(boxX, boxY, actualWidth, actualHeight, cornerRadius);
        this.applyFillStyle(this.config.colors.background);
        this.ctx.fill();
        this.applyLineStyle();
        this.ctx.stroke();
        
        // Draw text centered vertically with proper baseline
        this.applyFillStyle();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        // Start from top padding and draw each line
        const textStartY = boxY + paddingV;
        lines.forEach((line, i) => {
            this.ctx.fillText(line, x, textStartY + (i * lineHeight));
        });
        
        this.ctx.restore();
        return boxY + actualHeight;
    }

    /**
     * Draw arrow with arrowhead
     */
    drawArrow(x1, y1, x2, y2) {
        this.ctx.save();
        this.applyLineStyle();
        
        // Draw line
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        // Draw arrowhead (filled triangle)
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = this.config.dimensions.arrowHeadLength;
        
        this.applyFillStyle();
        this.ctx.beginPath();
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 7),
            y2 - headLength * Math.sin(angle - Math.PI / 7)
        );
        this.ctx.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 7),
            y2 - headLength * Math.sin(angle + Math.PI / 7)
        );
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }

    /**
     * Draw double-headed arrow (←→) with text above
     * Used for cooling agent (Холодоагент) - flows in and out
     */
    drawDoubleArrowWithText(x1, y1, x2, y2, text) {
        this.ctx.save();
        
        // Draw full continuous arrow line
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y1);
        this.ctx.stroke();
        
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 8;
        
        // Draw left arrowhead (pointing left)
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(
            x1 + headLength * Math.cos(angle - Math.PI / 7),
            y1 + headLength * Math.sin(angle - Math.PI / 7)
        );
        this.ctx.lineTo(
            x1 + headLength * Math.cos(angle + Math.PI / 7),
            y1 + headLength * Math.sin(angle + Math.PI / 7)
        );
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw right arrowhead (pointing right)
        this.ctx.beginPath();
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 7),
            y2 - headLength * Math.sin(angle - Math.PI / 7)
        );
        this.ctx.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 7),
            y2 - headLength * Math.sin(angle + Math.PI / 7)
        );
        this.ctx.closePath();
        this.ctx.fill();
        
        // Calculate text dimensions
        this.ctx.textAlign = 'center';
        this.ctx.font = '12px Arial';
        const centerX = (x1 + x2) / 2;
        const textY = y1 - 10; // 10px above arrow
        const textMetrics = this.ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = 12;
        const padding = 3;
        
        // Draw text background with symmetric padding
        this.ctx.fillStyle = '#fff';
        const bgTop = textY - textHeight - padding;
        const bgBottom = textY + padding; // Symmetric padding
        const bgHeight = bgBottom - bgTop;
        this.ctx.fillRect(centerX - textWidth/2 - padding, bgTop, 
                          textWidth + padding*2, bgHeight);
        
        // Draw text
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(text, centerX, textY);
        
        this.ctx.restore();
    }

    /**
     * Draw arrow with text on top (for first and last arrows)
     * Arrow is continuous, text is centered vertically with gray background
     */
    drawArrowWithText(x, startY, totalHeight, label, isFinal = false, isStart = false) {
        this.ctx.save();
        
        const arrowEndY = startY + totalHeight;
        
        console.log(`${isStart ? 'START' : isFinal ? 'FINAL' : 'OTHER'} arrow - Drawing CONTINUOUS line from Y:${startY} to Y:${arrowEndY}`);
        
        // Draw full continuous arrow line
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, startY);
        this.ctx.lineTo(x, arrowEndY);
        this.ctx.stroke();
        
        // Draw arrowhead
        const headLength = 8;
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.moveTo(x, arrowEndY);
        this.ctx.lineTo(x - headLength / 2, arrowEndY - headLength);
        this.ctx.lineTo(x + headLength / 2, arrowEndY - headLength);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Prepare text
        this.ctx.textAlign = 'center';
        this.ctx.font = '12px Arial';
        this.ctx.textBaseline = 'top';
        
        if (isStart) {
            // Draw starting grape conditions
            const rawMaterial = this.wineData.raw_material || {};
            const sugar = rawMaterial.sugar || 170;
            const acidity = rawMaterial.acidity || 6;
            
            const lines = [
                'Виноград:',
                `Cц =${sugar} г/дм³,`,
                `Ст.к. = ${acidity} г/дм³`
            ];
            
            const lineHeight = 16;
            const totalTextHeight = lines.length * lineHeight;
            
            // Center text vertically on arrow
            const textStartY = startY + (totalHeight - totalTextHeight) / 2;
            console.log(`START arrow - Text centered: arrow start=${startY}, arrow height=${totalHeight}, text height=${totalTextHeight}, text start Y=${textStartY}`);
            
            // Calculate max text width for background
            let maxWidth = 0;
            lines.forEach(line => {
                const textMetrics = this.ctx.measureText(line);
                maxWidth = Math.max(maxWidth, textMetrics.width);
            });
            
            // Draw background with symmetric padding
            const padding = 3;
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(x - maxWidth/2 - padding, textStartY - padding, 
                              maxWidth + padding*2, totalTextHeight + padding*2);
            
            // Draw text
            this.ctx.fillStyle = '#000';
            lines.forEach((line, i) => {
                this.ctx.fillText(line, x, textStartY + (i * lineHeight));
            });
            
        } else if (isFinal) {
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
            
            const lines = [
                'Виноматервіал на',
                'оброблення та розлив:',
                `Cц≤${finalSugar} г/дм³`,
                `Cт.к.≤${finalAcidity.toFixed(1)} г/дм³`,
                `Cсп = ${finalAlcohol}% об.`
            ];
            
            const lineHeight = 16;
            const totalTextHeight = lines.length * lineHeight;
            
            // Center text vertically on arrow
            const textStartY = startY + (totalHeight - totalTextHeight) / 2;
            console.log(`FINAL arrow - Text centered: arrow start=${startY}, arrow height=${totalHeight}, text height=${totalTextHeight}, text start Y=${textStartY}`);
            
            // Calculate max text width for background
            let maxWidth = 0;
            lines.forEach(line => {
                const textMetrics = this.ctx.measureText(line);
                maxWidth = Math.max(maxWidth, textMetrics.width);
            });
            
            // Draw background with symmetric padding
            const padding = 3;
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(x - maxWidth/2 - padding, textStartY - padding, 
                              maxWidth + padding*2, totalTextHeight + padding*2);
            
            // Draw text
            this.ctx.fillStyle = '#000';
            lines.forEach((line, i) => {
                this.ctx.fillText(line, x, textStartY + (i * lineHeight));
            });
            
        } else if (label) {
            // Simple label with background
            const textMetrics = this.ctx.measureText(label);
            const textWidth = textMetrics.width;
            const textHeight = 12; // font size
            
            // Center text vertically on arrow
            const textY = startY + (totalHeight - textHeight) / 2;
            
            // Draw background with symmetric padding
            const padding = 3;
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(x - textWidth/2 - padding, textY - padding, 
                              textWidth + padding*2, textHeight + padding*2);
            
            // Draw text
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(label, x, textY);
        }
        
        this.ctx.restore();
        return arrowEndY;
    }

    /**
     * Download scheme as PNG
     */
    downloadPNG() {
        const link = document.createElement('a');
        link.download = 'principova-tehnologichna-scheme.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    /**
     * Download scheme as PDF
     */
    downloadPDF() {
        const { jsPDF } = window.jspdf;
        
        // Get canvas dimensions
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Create PDF with appropriate orientation and size
        // Convert pixels to mm (assuming 96 DPI: 1 inch = 25.4mm, 96px = 25.4mm)
        const pdfWidth = (canvasWidth * 25.4) / 96;
        const pdfHeight = (canvasHeight * 25.4) / 96;
        
        // Determine orientation
        const orientation = pdfWidth > pdfHeight ? 'landscape' : 'portrait';
        
        // Create PDF with custom dimensions
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });
        
        // Add canvas as image to PDF
        const imgData = this.canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // Save the PDF
        pdf.save('principova-tehnologichna-scheme.pdf');
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SchemeRenderer;
}
