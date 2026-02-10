/**
 * Box Drawing
 * Handles all process box rendering
 */

class BoxDrawer {
    constructor(ctx, config, primitives, textDrawer) {
        this.ctx = ctx;
        this.config = config;
        this.primitives = primitives;
        this.textDrawer = textDrawer;
    }
    
    /**
     * Draw a complete BaseBox with standard styling
     * @param {Object} config - Box configuration
     * @returns {number} - Bottom Y position of the box
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
        this.primitives.drawRoundedRect(boxX, y, width, height, radius);
        
        // Fill background
        if (fillBackground) {
            this.primitives.applyFillStyle(this.config.colors.background);
            this.ctx.fill();
        }
        
        // Stroke border
        if (strokeBorder) {
            this.primitives.applyLineStyle();
            this.ctx.stroke();
        }
        
        // Draw centered text if provided
        if (text) {
            this.textDrawer.drawCenteredText(text, x, y, height);
        }
        
        this.ctx.restore();
        
        return y + height;
    }
    
    /**
     * Draw process box with auto-calculated height
     * @param {number} x - Center X position
     * @param {number} y - Top Y position
     * @param {number} width - Box width
     * @param {number} minHeight - Minimum height (0 for auto)
     * @param {string} text - Box text content
     * @returns {number} - Bottom Y position
     */
    drawProcessBox(x, y, width, minHeight, text) {
        this.ctx.save();
        
        // Handle multi-line text
        const lines = text.split('\n');
        
        // Use config for styling
        const fontSize = this.config.fonts.boxSize;
        const lineHeight = this.config.fonts.boxLineHeight;
        const paddingV = this.config.dimensions.boxPaddingV;
        const paddingH = this.config.dimensions.boxPaddingH;
        const cornerRadius = this.config.dimensions.boxCornerRadius;
        this.ctx.font = this.config.fonts.box;
        
        // Calculate actual width
        const maxTextWidth = Math.max(...lines.map(line => this.ctx.measureText(line).width));
        const actualWidth = Math.max(width, maxTextWidth + (paddingH * 2));
        
        // Calculate height based on text content
        const textBlockHeight = (lines.length - 1) * lineHeight + fontSize;
        const actualHeight = Math.max(minHeight, textBlockHeight + (paddingV * 2));
        
        // Center the box
        const boxX = x - actualWidth / 2;
        const boxY = y;
        
        // Draw rounded rectangle
        this.primitives.drawRoundedRect(boxX, boxY, actualWidth, actualHeight, cornerRadius);
        this.primitives.applyFillStyle(this.config.colors.background);
        this.ctx.fill();
        this.primitives.applyLineStyle();
        this.ctx.stroke();
        
        // Draw text centered vertically and horizontally
        this.textDrawer.applyBoxTextStyle();
        const textStartY = boxY + (actualHeight - textBlockHeight) / 2 + fontSize / 2;
        
        lines.forEach((line, i) => {
            this.ctx.fillText(line, x, textStartY + (i * lineHeight));
        });
        
        this.ctx.restore();
        
        return boxY + actualHeight;
    }
}
