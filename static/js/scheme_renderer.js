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
    constructor(canvas, wineData, blocks = null, schema = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.wineData = wineData;
        this.blocks = blocks || [];
        this.schema = schema || null;
        
        // Centralized style configuration (BaseBox settings)
        this.config = {
            watermark: {
                enabled: true,           // ← toggle: true/false
                text: 'vynorob.solutions',
                opacity: 0.08,
                fontSize: 48,
                fontFamily: 'Arial',
                color: '#000000',
                repeat: true,            // tile across full canvas
                repeatSpacingX: 320,
                repeatSpacingY: 180,
                angle: -25,
            },
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
     * Draw scheme dynamically from blocks data
     */
    drawDynamicScheme() {
        if (!this.blocks || this.blocks.length === 0) {
            console.error('No blocks data available');
            return;
        }

        console.log('Drawing dynamic scheme with blocks:', this.blocks);
        console.log('Schema:', this.schema);

        const canvasWidth = this.config.layout.canvasWidth;
        const topPadding = this.config.layout.topPadding;
        const arrowLength = this.config.dimensions.arrowLength;
        const boxWidth = this.config.layout.boxWidth;

        // Estimate total height
        const totalHeight = 2000;

        // Set canvas dimensions
        this.canvas.width = canvasWidth;
        this.canvas.height = totalHeight;

        // Clear canvas
        this.ctx.fillStyle = this.config.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Set default styles
        this.applyLineStyle();
        this.applyFillStyle();
        this.ctx.font = this.config.fonts.box;

        let currentY = topPadding;
        const centerX = canvasWidth / 2 - 200;

        // Store block positions for side branches
        const blockPositions = {};
        
        // Find side branch block first (before main drawing loop)
        let sideBranchBlock = null;
        for (const block of this.blocks) {
            if (block.is_side_branch) {
                sideBranchBlock = block;
                console.log('Found side branch block:', sideBranchBlock);
                break;
            }
        }

        // Draw main blocks
        this.blocks.forEach((block, index) => {
            console.log(`Drawing block ${index + 1}:`, block);

            // Skip side branch for now (will draw it later)
            if (block.is_side_branch) {
                return;
            }

            // Draw top arrow with raw material conditions for first block
            if (block.has_top_arrow) {
                currentY = this.drawArrowWithText(
                    centerX, 
                    currentY, 
                    120, 
                    '', 
                    false, 
                    true
                );
            }

            // Store block start position
            blockPositions[block.id] = {
                startY: currentY,
                endY: 0,
                centerY: 0
            };

            // Prepare arrows configuration
            const arrows = {};
            
            // Left inputs
            if (block.left_inputs && block.left_inputs.length > 0) {
                arrows.left = block.left_inputs;
            }
            
            // Right outputs - pass as array for consistent handling
            if (block.right_outputs && block.right_outputs.length > 0) {
                arrows.right = block.right_outputs;
            }

            // Draw the block
            currentY = this.drawProcessStage({
                x: centerX,
                y: currentY,
                width: boxWidth,
                text: block.name,
                arrows: arrows
            });

            // Store block end position
            blockPositions[block.id].endY = currentY;
            blockPositions[block.id].centerY = (blockPositions[block.id].startY + currentY) / 2;

            // Draw bottom arrow with wine conditions for last block
            if (block.has_bottom_arrow) {
                currentY = this.drawArrowWithText(
                    centerX, 
                    currentY, 
                    120, 
                    null, 
                    true
                );
            } else {
                // Draw connecting arrow to next block with label if exists
                if (block.arrow_out_label) {
                    // Draw arrow with label interrupting it
                    const labelText = block.arrow_out_label;
                    this.ctx.save();
                    this.ctx.font = '12px Arial';
                    const labelHeight = 12 + 6;
                    this.ctx.restore();
                    
                    const arrowStart = currentY;
                    const arrowEnd = currentY + arrowLength;
                    const arrowMid = (arrowStart + arrowEnd) / 2;
                    const labelY = arrowMid - labelHeight / 2;
                    const labelTop = labelY;
                    const labelBottom = labelY + labelHeight;
                    
                    // Arrow part 1: from box to label
                    this.ctx.save();
                    this.ctx.strokeStyle = '#000';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(centerX, arrowStart);
                    this.ctx.lineTo(centerX, labelTop);
                    this.ctx.stroke();
                    this.ctx.restore();
                    
                    // Arrow part 2: from label to next box
                    this.drawArrow(centerX, labelBottom, centerX, arrowEnd);
                    
                    // Draw label
                    this.drawSideLabel(centerX, labelY, labelText);
                } else {
                    // Regular arrow
                    this.drawArrow(centerX, currentY, centerX, currentY + arrowLength);
                }
                currentY += arrowLength;
            }
        });

        // Draw side branch if exists
        if (sideBranchBlock) {
            console.log('Drawing side branch:', sideBranchBlock);
            const fromPos = blockPositions[sideBranchBlock.connects_from];
            const toPos = blockPositions[sideBranchBlock.connects_to];
            console.log('From position:', fromPos);
            console.log('To position:', toPos);
            
            if (fromPos && toPos) {
                // Calculate side branch position
                const fromCenterY = fromPos.centerY;
                const fromHeight = fromPos.endY - fromPos.startY;
                const zbidnenaArrowLength = 250 - boxWidth/2;
                const rightBoxX = centerX + boxWidth/2 + zbidnenaArrowLength + boxWidth/2;
                
                // Draw right output arrow from "from" block
                const fromRightX = centerX + boxWidth/2;
                
                // Draw horizontal arrow with label
                this.ctx.save();
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(fromRightX, fromCenterY);
                this.ctx.lineTo(fromRightX + zbidnenaArrowLength, fromCenterY);
                this.ctx.stroke();
                
                // Draw arrowhead
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.moveTo(fromRightX + zbidnenaArrowLength, fromCenterY);
                this.ctx.lineTo(fromRightX + zbidnenaArrowLength - 8, fromCenterY - 5);
                this.ctx.lineTo(fromRightX + zbidnenaArrowLength - 8, fromCenterY + 5);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Draw label for arrow to side branch
                const zbidnenaText = 'Збіднена\nм\'язга';
                const zbidnenaLines = zbidnenaText.split('\n');
                this.ctx.textAlign = 'center';
                this.ctx.font = '12px Arial';
                const zbidnenaTextX = fromRightX + zbidnenaArrowLength / 2;
                const lineHeight = 14;
                const totalTextHeight = zbidnenaLines.length * lineHeight;
                const zbidnenaStartY = fromCenterY - 10 - totalTextHeight;
                
                let maxWidth = 0;
                zbidnenaLines.forEach(line => {
                    const textMetrics = this.ctx.measureText(line);
                    maxWidth = Math.max(maxWidth, textMetrics.width);
                });
                const padding = 3;
                
                // Draw text background
                this.ctx.fillStyle = '#fff';
                const bgTop = zbidnenaStartY - padding;
                const bgBottom = zbidnenaStartY + totalTextHeight + padding;
                const bgHeight = bgBottom - bgTop;
                this.ctx.fillRect(zbidnenaTextX - maxWidth/2 - padding, bgTop, 
                                  maxWidth + padding*2, bgHeight);
                
                // Draw text
                this.ctx.fillStyle = '#000';
                this.ctx.textBaseline = 'top';
                zbidnenaLines.forEach((line, i) => {
                    this.ctx.fillText(line, zbidnenaTextX, zbidnenaStartY + (i * lineHeight));
                });
                this.ctx.restore();
                
                // Draw side branch block (Пресування)
                // Calculate actual box height first
                const sideBranchArrows = {};
                if (sideBranchBlock.right_outputs && sideBranchBlock.right_outputs.length > 0) {
                    sideBranchArrows.right = sideBranchBlock.right_outputs;
                }
                
                // Calculate text height
                this.ctx.save();
                this.ctx.font = this.config.fonts.box;
                const lines = sideBranchBlock.name.split('\n');
                const textBlockHeight = (lines.length - 1) * this.config.fonts.boxLineHeight + this.config.fonts.boxSize;
                const paddingV = this.config.dimensions.boxPaddingV;
                let boxHeight = textBlockHeight + (paddingV * 2);
                
                // Check if we need more height for right arrows
                if (sideBranchArrows.right) {
                    const rightArrows = Array.isArray(sideBranchArrows.right) ? sideBranchArrows.right : [sideBranchArrows.right];
                    if (rightArrows.length > 1) {
                        const arrowHeight = (rightArrows.length - 1) * 70 + 40;
                        boxHeight = Math.max(boxHeight, arrowHeight);
                    }
                }
                this.ctx.restore();
                
                // Now center the block against the arrow
                const sideBranchY = fromCenterY - boxHeight / 2;
                
                const sideBranchEndY = this.drawProcessStage({
                    x: rightBoxX,
                    y: sideBranchY,
                    width: boxWidth,
                    text: sideBranchBlock.name,
                    arrows: sideBranchArrows
                });
                
                // Draw vertical arrow from side branch down to merge point
                const toCenterY = toPos.centerY;
                this.ctx.save();
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 2;
                
                // Vertical line down
                this.ctx.beginPath();
                this.ctx.moveTo(rightBoxX, sideBranchEndY);
                this.ctx.lineTo(rightBoxX, toCenterY);
                this.ctx.stroke();
                
                // Horizontal line to merge
                this.ctx.beginPath();
                this.ctx.moveTo(rightBoxX, toCenterY);
                this.ctx.lineTo(centerX + boxWidth/2, toCenterY);
                this.ctx.stroke();
                
                // Arrowhead pointing left (into merge block)
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                const arrowTipX = centerX + boxWidth/2;
                this.ctx.moveTo(arrowTipX, toCenterY);
                this.ctx.lineTo(arrowTipX + 8, toCenterY - 5);
                this.ctx.lineTo(arrowTipX + 8, toCenterY + 5);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();
            }
        }

        // Optimize canvas height
        const finalY = currentY;
        const optimalHeight = finalY + 50;

        if (this.canvas.height !== optimalHeight) {
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.canvas.height = optimalHeight;
            this.ctx.putImageData(imageData, 0, 0);
            console.log(`Canvas resized to: ${this.canvas.width}x${optimalHeight}px`);
        }
    }

    /**
     * Main drawing function - orchestrates the entire scheme
     */
    drawScheme() {
        // If we have blocks data, use dynamic rendering
        if (this.blocks && this.blocks.length > 0) {
            this.drawDynamicScheme();
            return;
        }

        // Otherwise fall back to hardcoded scheme
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
        
        // Calculate actual Пресування height to center it with Віддilення
        this.ctx.save();
        this.ctx.font = this.config.fonts.box;
        const presuvannyaLines = 'Пресування'.split('\n');
        const presuvannyaTextHeight = (presuvannyaLines.length - 1) * this.config.fonts.boxLineHeight + this.config.fonts.boxSize;
        const presuvannyaPaddingV = this.config.dimensions.boxPaddingV;
        const presuvannyaHeight = presuvannyaTextHeight + (presuvannyaPaddingV * 2);
        this.ctx.restore();
        
        const presuvannyaY = viddilennyaCenterY - presuvannyaHeight / 2;
        
        console.log('Centering boxes - Віддilення center:', viddilennyaCenterY, 'Пресування start:', presuvannyaY, 'height:', presuvannyaHeight);
        
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
        
        // 4. Зняття з грубого осаду (where both paths merge)
        const znyttiaY = currentY;
        currentY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Зняття з грубого осаду',
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
        
        // 7. Освітлення виноматеріалу
        currentY = this.drawProcessStage({
            x: centerX,
            y: currentY,
            width: boxWidth,
            text: 'Освітлення\nвиноматеріалу\nt=10...12°C',
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
        
        const finalY = currentY;
        const optimalHeight = finalY + 50; // Add 50px padding at bottom
        
        console.log(`Final Y position: ${finalY}px`);
        console.log(`Optimal canvas height: ${optimalHeight}px (actual: ${this.canvas.height}px)`);
        
        // Resize canvas to optimal height if needed
        if (this.canvas.height !== optimalHeight) {
            // Save current canvas content
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Resize canvas
            this.canvas.height = optimalHeight;
            
            // Restore content
            this.ctx.putImageData(imageData, 0, 0);
            
            console.log(`Canvas resized to: ${this.canvas.width}x${optimalHeight}px`);
        }
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
        
        // Calculate minimum height needed for arrows (left or right)
        let minHeightForArrows = 0;
        
        // Check left arrows
        if (arrows.left) {
            const leftArrows = Array.isArray(arrows.left) ? arrows.left : [arrows.left];
            if (leftArrows.length > 1) {
                const arrowSpacing = 70;
                const leftHeight = (leftArrows.length - 1) * arrowSpacing + 40;
                minHeightForArrows = Math.max(minHeightForArrows, leftHeight);
            }
        }
        
        // Check right arrows
        if (arrows.right) {
            const rightArrows = Array.isArray(arrows.right) ? arrows.right : [arrows.right];
            if (rightArrows.length > 1) {
                const arrowSpacing = 70;
                const rightHeight = (rightArrows.length - 1) * arrowSpacing + 40;
                minHeightForArrows = Math.max(minHeightForArrows, rightHeight);
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
        
        // Draw right arrow(s) if configured - evenly distributed like left arrows
        if (arrows.right) {
            const rightArrows = Array.isArray(arrows.right) ? arrows.right : [arrows.right];
            const arrowSpacing = rightArrows.length > 1 ? (boxHeight - 40) / (rightArrows.length - 1) : 0;
            
            rightArrows.forEach((rightArrow, index) => {
                if (typeof rightArrow === 'object' && rightArrow.text) {
                    const boxX = x - width / 2;
                    const rightX = boxX + width;
                    // Even distribution across box height
                    const arrowY = rightArrows.length > 1 
                        ? y + 20 + (index * arrowSpacing)
                        : y + boxHeight / 2;
                    const arrowLength = 250 - width/2;
                    
                    this.ctx.save();
                    
                    // Calculate text dimensions
                    const lines = rightArrow.text.split('\n');
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
                    
                    // Draw horizontal arrow
                    this.ctx.strokeStyle = '#000';
                    this.ctx.lineWidth = 2;
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
                    
                    // Draw text background
                    this.ctx.fillStyle = '#fff';
                    const bgTop = startY - padding;
                    const bgBottom = startY + totalTextHeight + padding;
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
            });
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
                'Вино на розлив:',
                `Cц=${finalSugar} г/дм³`,
                `Cт.к.=${finalAcidity.toFixed(1)} г/дм³`,
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
     * Draw technology steps from decision tree traversal.
     * @param {Array} steps - Array of {id, section, label, label_clean, type}
     */
    _isStemLimitStep(step) {
        const id = step.id;
        return id === 'SETTLE' || id === 'HEAVY' || id === 'CHANGE'
            || id === 'SHOOT' || id === 'SUIT' || id === 'APPROPRIATE'
            || id === 'EVERYTHING' || id === 'DISCOVER';
    }

    _computeStemLimit(steps) {
        const changeStep = steps.find(s => s.id === 'CHANGE');
        if (changeStep) {
            const m = changeStep.label_clean.match(/=\s*(.+)/);
            if (m) return m[1].trim();
        }
        return '0%';
    }

    _isSideInput(step) {
        const id = step.id;
        const label = (step.label_clean || '').toLowerCase();

        if (id === 'AGAIN' || id === 'GAME' || id === 'SANG') return true;
        if (id === 'FOREIGN') return true;
        if (id === 'DOUBT' || id === 'TA_DOSE') return true;
        if (id.startsWith('YEAST_')) return true;
        if (id.startsWith('REHY_')) return true;
        if (id.startsWith('INOC_')) return true;
        if (id.includes('FEED') || label.startsWith('підкормка')) return true;
        // CLAR_* are full process boxes (fining/clarification), not side inputs
        if (id === 'NS_BOTH') return true;
        if (id === 'MLF_RED_IN') return true;
        if (id === 'CT_TIRAGE') return true;
        if (id.startsWith('DOS_')) return true;

        if (id === 'CLOSED' || id === 'OPEN') return true;
        if (id.startsWith('CLAY_') || id.startsWith('STEEL_')) return true;
        if (id.startsWith('TEMP_')) return true;
        if (id.startsWith('PROF_')) return true;
        if (id.startsWith('CAP_')) return true;
        if (id === 'NO_PRESS' || id === 'NO_PRESS_2') return true;
        if (id.startsWith('MICROOX_')) return true;

        if (step.type === 'side_input') return true;

        if (label.startsWith('додати')) return true;
        if (label.startsWith('внести')) return true;
        if (label.includes('дефіцит цукру')) return true;
        if (label.includes('шаптелізація')) return true;
        if (label.includes('сорбінова')) return true;
        if (label.includes('пектиназа')) return true;

        return false;
    }

    _sideLabel(step) {
        const lines = step.label_clean.split('\n').filter(l => l.trim());
        return lines.join('\n');
    }

    _hasTempControl(group) {
        const check = text => /(?:t\s*=|°C)/.test(text);
        if (check(group.process.label_clean)) return true;
        return group.sideInputs.some(si => check(si.label_clean || ''));
    }

    _drawBidiArrow(x1, y, x2) {
        const ctx = this.ctx;
        const headLen = this.config.dimensions.arrowHeadLength;
        const headW = this.config.dimensions.arrowHeadWidth;

        ctx.save();
        this.applyLineStyle();
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();

        ctx.fillStyle = this.config.colors.line;
        ctx.beginPath();
        ctx.moveTo(x2, y);
        ctx.lineTo(x2 - headLen, y - headW);
        ctx.lineTo(x2 - headLen, y + headW);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x1 + headLen, y - headW);
        ctx.lineTo(x1 + headLen, y + headW);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawTechnologySteps(steps) {
        if (!steps || steps.length === 0) {
            console.error('No technology steps to render');
            return;
        }

        const ctx = this.ctx;
        const boxWidth = 420;
        const arrowLen = 40;
        const padV = 14;
        const fontSize = 14;
        const lineHeight = 20;
        const cornerRadius = 10;
        const topPad = 40;
        const bottomPad = 40;
        const headerFontSize = 15;
        const headerLineH = 22;
        const sideFontSize = 12;
        const sideLineH = 16;
        const sideArrowLen = 40;
        const sideTextGap = 6;

        const filteredSteps = steps.filter(s => s.id !== 'RHYME');

        let yeastBranch = null;
        const groups = [];
        let pendingSide = [];
        let pendingStemLimit = [];
        for (const step of filteredSteps) {
            if (step.type === 'side_branch') {
                yeastBranch = step;
                continue;
            }
            if (this._isStemLimitStep(step)) {
                pendingStemLimit.push(step);
                if (step.id === 'CHANGE' && groups.length > 0) {
                    const limit = this._computeStemLimit(pendingStemLimit);
                    const last = groups[groups.length - 1];
                    last.process = {
                        ...last.process,
                        label_clean: last.process.label_clean + '\nОбмеження = ' + limit
                    };
                    pendingStemLimit = [];
                }
            } else if (this._isSideInput(step)) {
                pendingSide.push(step);
            } else {
                groups.push({ process: step, sideInputs: [...pendingSide] });
                pendingSide = [];
            }
        }
        if (pendingSide.length > 0 && groups.length > 0) {
            groups[groups.length - 1].sideInputs.push(...pendingSide);
        }

        const branchBoxW = 220;
        const branchGap = 60;
        const sideInputEstimate = 220;

        let canvasWidth, centerX;
        if (yeastBranch) {
            const leftExtent = sideInputEstimate + boxWidth / 2;
            const rightExtent = boxWidth / 2 + branchGap + branchBoxW;
            const contentW = leftExtent + rightExtent;
            canvasWidth = contentW + 100;
            centerX = 50 + leftExtent;
        } else {
            canvasWidth = 900;
            centerX = canvasWidth / 2;
        }

        this.canvas.width = canvasWidth;

        groups.forEach(g => {
            if (this._hasTempControl(g)) {
                g.sideInputs.unshift({
                    id: '_COOLANT',
                    label_clean: 'Хладогент',
                    type: 'coolant_bidi',
                });
            }
        });

        const headerLines = this._buildInputConditionsLines();
        const footerLines = this._buildOutputConditionsLines();

        ctx.font = `${fontSize}px Arial`;

        const measured = groups.map(g => {
            const lines = g.process.label_clean.split('\n').filter(l => l.trim());
            const textH = lines.length * lineHeight;
            const sideItems = g.sideInputs.map(si => ({
                text: this._sideLabel(si),
                bidi: si.type === 'coolant_bidi',
            }));
            let totalSideLines = 0;
            sideItems.forEach(si => { totalSideLines += si.text.split('\n').length; });
            const sideH = totalSideLines * sideLineH + Math.max(0, g.sideInputs.length - 1) * 6;
            const boxH = Math.max(textH + padV * 2, sideH + padV * 2);
            return { lines, boxH, group: g, sideItems };
        });

        const headerH = headerLines.length * headerLineH;
        const footerH = footerLines.length * headerLineH;

        let corrIdx = -1, afIdx = -1;
        measured.forEach((m, i) => {
            if (m.group.process.id === 'CORR_MAIN') corrIdx = i;
            if (m.group.process.id === 'AF') afIdx = i;
        });

        let yeastExtraGap = 0;
        const branchInnerArrow = 30;
        if (yeastBranch && corrIdx >= 0 && afIdx >= 0) {
            const _branchLines = (t) => t.split('\n').filter(l => l.trim()).length;
            const b1H = _branchLines(yeastBranch.branch.box1) * lineHeight + padV * 2;
            const b2H = _branchLines(yeastBranch.branch.box2) * lineHeight + padV * 2;
            const branchTotalH = b1H + branchInnerArrow + b2H;
            const corrH = measured[corrIdx].boxH;
            const neededGap = branchTotalH - corrH + branchInnerArrow;
            yeastExtraGap = Math.max(0, neededGap - arrowLen);
        }

        let totalH = topPad + bottomPad;
        totalH += headerH + arrowLen;
        measured.forEach((m, i) => {
            totalH += m.boxH;
            if (i < measured.length - 1) totalH += arrowLen;
        });
        totalH += arrowLen + footerH;
        totalH += yeastExtraGap;
        this.canvas.height = totalH;

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvasWidth, totalH);

        let currentY = topPad;

        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        headerLines.forEach((line, i) => {
            ctx.font = i === 0 ? `bold ${headerFontSize}px Arial` : `${headerFontSize}px Arial`;
            ctx.fillText(line, centerX, currentY + i * headerLineH);
        });
        currentY += headerH;

        this.drawArrow(centerX, currentY, centerX, currentY + arrowLen);
        currentY += arrowLen;

        const boxLeft = centerX - boxWidth / 2;
        const boxPositions = {};

        measured.forEach((m, idx) => {
            const { lines, boxH, group, sideItems } = m;

            this.drawRoundedRect(boxLeft, currentY, boxWidth, boxH, cornerRadius);
            ctx.fillStyle = '#fff';
            ctx.fill();
            this.applyLineStyle();
            ctx.stroke();

            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textTotalH = lines.length * lineHeight;
            const textStartY = currentY + (boxH - textTotalH) / 2 + lineHeight / 2;
            lines.forEach((line, li) => {
                ctx.fillText(line, centerX, textStartY + li * lineHeight);
            });

            if (sideItems.length > 0) {
                ctx.font = `${sideFontSize}px Arial`;
                let allSideLines = [];
                sideItems.forEach((si, idx2) => {
                    const parts = si.text.split('\n');
                    parts.forEach(p => allSideLines.push(p));
                    if (idx2 < sideItems.length - 1) allSideLines.push(null);
                });

                const contentLines = allSideLines.filter(l => l !== null);
                const totalSideH = contentLines.length * sideLineH +
                    allSideLines.filter(l => l === null).length * 6;
                let sideY = currentY + (boxH - totalSideH) / 2;

                const arrowEndX = boxLeft;
                const arrowStartX = arrowEndX - sideArrowLen;

                allSideLines.forEach(line => {
                    if (line === null) {
                        sideY += 6;
                        return;
                    }
                    const ly = sideY + sideLineH / 2;

                    ctx.font = `${sideFontSize}px Arial`;
                    ctx.fillStyle = '#000';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(line, arrowStartX - sideTextGap, ly);

                    sideY += sideLineH;
                });

                let ay = currentY + (boxH - totalSideH) / 2;
                sideItems.forEach((si) => {
                    const parts = si.text.split('\n');
                    const blockH = parts.length * sideLineH;
                    const arrowY = ay + blockH / 2;
                    if (si.bidi) {
                        this._drawBidiArrow(arrowStartX, arrowY, arrowEndX, arrowY);
                    } else {
                        this.drawArrow(arrowStartX, arrowY, arrowEndX, arrowY);
                    }
                    ay += blockH + 6;
                });
            }

            boxPositions[group.process.id] = {
                top: currentY, bottom: currentY + boxH, centerY: currentY + boxH / 2,
            };

            currentY += boxH;

            if (idx < measured.length - 1) {
                let gap = arrowLen;
                if (idx === corrIdx) gap += yeastExtraGap;
                this.drawArrow(centerX, currentY, centerX, currentY + gap);
                currentY += gap;
            }
        });

        if (yeastBranch && yeastBranch.branch) {
            this._drawYeastBranch(ctx, yeastBranch.branch, boxPositions, {
                centerX, boxWidth, boxLeft, cornerRadius, fontSize, lineHeight,
                padV, arrowLen: branchInnerArrow, sideFontSize, sideLineH,
                branchBoxW, branchGap,
            });
        }

        currentY += arrowLen;
        this.drawArrow(centerX, currentY - arrowLen, centerX, currentY);

        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        footerLines.forEach((line, i) => {
            ctx.font = i === 0 ? `bold ${headerFontSize}px Arial` : `${headerFontSize}px Arial`;
            ctx.fillText(line, centerX, currentY + i * headerLineH);
        });

        this._drawWatermark();
    }

    _drawYeastBranch(ctx, branch, boxPositions, cfg) {
        const { centerX, boxWidth, cornerRadius, fontSize, lineHeight, padV, arrowLen, sideFontSize, sideLineH, branchBoxW, branchGap } = cfg;

        const corrPos = boxPositions['CORR_MAIN'];
        const afPos = boxPositions['AF'];
        if (!corrPos || !afPos) return;

        const mainRight = centerX + boxWidth / 2;
        const branchCenterX = mainRight + branchGap + branchBoxW / 2;
        const branchLeft = branchCenterX - branchBoxW / 2;

        const _measureBox = (text) => {
            const lines = text.split('\n').filter(l => l.trim());
            return { lines, h: lines.length * lineHeight + padV * 2 };
        };

        const _drawBox = (cx, y, w, text) => {
            const m = _measureBox(text);
            this.drawRoundedRect(cx - w / 2, y, w, m.h, cornerRadius);
            ctx.fillStyle = '#fff';
            ctx.fill();
            this.applyLineStyle();
            ctx.stroke();
            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const startY = y + (m.h - m.lines.length * lineHeight) / 2 + lineHeight / 2;
            m.lines.forEach((line, i) => {
                ctx.fillText(line, cx, startY + i * lineHeight);
            });
            return m.h;
        };

        const box1M = _measureBox(branch.box1);
        const box2M = _measureBox(branch.box2);

        const box1Top = corrPos.top;
        const box1Bot = box1Top + box1M.h;
        const box2Top = box1Bot + arrowLen;
        const box2Bot = box2Top + box2M.h;
        const box2CenterY = box2Top + box2M.h / 2;

        _drawBox(branchCenterX, box1Top, branchBoxW, branch.box1);
        _drawBox(branchCenterX, box2Top, branchBoxW, branch.box2);

        this.drawArrow(branchCenterX, box1Bot, branchCenterX, box2Top);

        const mustExitX = centerX + boxWidth / 4;
        ctx.save();
        this.applyLineStyle();
        ctx.beginPath();
        ctx.moveTo(mustExitX, corrPos.bottom);
        ctx.lineTo(mustExitX, box2CenterY);
        ctx.lineTo(branchLeft, box2CenterY);
        ctx.stroke();
        this.drawArrowheadRight(branchLeft, box2CenterY);

        ctx.font = `${sideFontSize}px Arial`;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(branch.must_label || 'Сусло 100 мл', (mustExitX + branchLeft) / 2, box2CenterY - 4);
        ctx.restore();

        const returnY = afPos.top + 20;
        ctx.save();
        this.applyLineStyle();
        ctx.beginPath();
        ctx.moveTo(branchCenterX, box2Bot);
        ctx.lineTo(branchCenterX, returnY);
        ctx.lineTo(mainRight, returnY);
        ctx.stroke();
        this.drawArrowheadLeft(mainRight, returnY);
        ctx.restore();

        if (branch.top_inputs && branch.top_inputs.length > 0) {
            ctx.save();
            const inputCount = branch.top_inputs.length;
            const spacing = branchBoxW / (inputCount + 1);
            const inputArrowH = 25;

            branch.top_inputs.forEach((input, i) => {
                const ix = branchLeft + spacing * (i + 1);
                const lines = input.split('\n');
                const textH = lines.length * sideLineH;
                const arrowTopY = box1Top - inputArrowH;

                this.applyLineStyle();
                this.drawArrow(ix, arrowTopY, ix, box1Top);

                ctx.font = `${sideFontSize}px Arial`;
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                lines.forEach((line, li) => {
                    ctx.fillText(line, ix, arrowTopY - textH + (li + 1) * sideLineH);
                });
            });
            ctx.restore();
        }
    }

    _buildInputConditionsLines() {
        const wd = this.wineData || {};
        const sp = wd.style_params || {};
        const rm = wd.raw_material || {};
        const tech = wd.style_tech || {};
        const color = wd.color_params || wd.color || {};

        const sugar = sp.S0 || sp.sugar || rm.sugar || '—';
        const acidity = rm.TA_now || rm.acidity || '—';
        const pH = tech.pH || rm.ph || '—';

        const colorLabel = (typeof color === 'string' ? color : color.color) || '';
        const variety = (typeof color === 'object' && color.grapeVariety) || '';
        const title = variety && variety !== 'unknown'
            ? `Виноград (${variety}):`
            : 'Виноград:';

        const lines = [title];
        if (sugar !== '—') lines.push(`Сц = ${sugar} г/дм³`);
        if (acidity !== '—') lines.push(`Стк = ${acidity} г/дм³`);
        if (pH !== '—') lines.push(`pH = ${pH}`);
        return lines;
    }

    _buildOutputConditionsLines() {
        const wd = this.wineData || {};
        const sp = wd.style_params || {};
        const rm = wd.raw_material || {};
        const co2 = wd.style_co2 || {};

        const s0 = parseFloat(sp.S0 || sp.sugar || 200);
        const rs = parseFloat(sp.RS || 0);
        const abv = ((s0 - rs) / 16.83).toFixed(1);
        const taTarget = rm.TA_target || rm.ta_target || '—';

        const lines = ['Вино на розлив:'];
        lines.push(`Сц = ${rs} г/дм³`);
        lines.push(`Ссп = ${abv} % об.`);
        if (taTarget !== '—') lines.push(`Стк = ${taTarget} г/дм³`);
        return lines;
    }

    /**
     * Draw watermark over the canvas content
     */
    _drawWatermark() {
        const wm = this.config.watermark;
        if (!wm || !wm.enabled) return;

        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;

        ctx.save();
        ctx.globalAlpha = wm.opacity;
        ctx.fillStyle = wm.color;
        ctx.font = `bold ${wm.fontSize}px ${wm.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (wm.repeat) {
            const dx = wm.repeatSpacingX;
            const dy = wm.repeatSpacingY;
            const angle = (wm.angle * Math.PI) / 180;
            const cols = Math.ceil(W / dx) + 2;
            const rows = Math.ceil(H / dy) + 2;

            for (let row = -1; row < rows; row++) {
                for (let col = -1; col < cols; col++) {
                    const x = col * dx + (row % 2 === 0 ? 0 : dx / 2);
                    const y = row * dy;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(angle);
                    ctx.fillText(wm.text, 0, 0);
                    ctx.restore();
                }
            }
        } else {
            const angle = (wm.angle * Math.PI) / 180;
            ctx.save();
            ctx.translate(W / 2, H / 2);
            ctx.rotate(angle);
            ctx.fillText(wm.text, 0, 0);
            ctx.restore();
        }

        ctx.restore();
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
