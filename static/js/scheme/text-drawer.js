/**
 * Text Drawing with Backgrounds
 * Handles all text rendering with optional backgrounds
 */

class TextDrawer {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
    }
    
    /**
     * Apply text style for boxes
     */
    applyBoxTextStyle() {
        this.ctx.font = this.config.fonts.box;
        this.ctx.fillStyle = this.config.colors.text;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
    }
    
    /**
     * Apply text style for labels
     */
    applyLabelTextStyle() {
        this.ctx.font = this.config.fonts.label;
        this.ctx.fillStyle = this.config.colors.text;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
    }
    
    /**
     * Draw text with background
     * @param {string} text - Text to draw (supports \n for multi-line)
     * @param {number} x - X position (center)
     * @param {number} y - Y position (top)
     * @param {Object} options - Drawing options
     * @returns {Object} - {width, height} of rendered text
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
     * Draw centered multi-line text in a box
     * @param {string} text - Text to draw
     * @param {number} centerX - Center X position
     * @param {number} boxY - Box top Y
     * @param {number} boxHeight - Box height
     */
    drawCenteredText(text, centerX, boxY, boxHeight) {
        this.applyBoxTextStyle();
        const lines = text.split('\n');
        const lineHeight = this.config.fonts.boxLineHeight;
        const fontSize = this.config.fonts.boxSize;
        const textBlockHeight = (lines.length - 1) * lineHeight + fontSize;
        const textStartY = boxY + (boxHeight - textBlockHeight) / 2 + fontSize / 2;
        
        lines.forEach((line, i) => {
            this.ctx.fillText(line, centerX, textStartY + (i * lineHeight));
        });
    }
}
