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
     * Draw text with subscripts
     * Handles chemical notation like Cц, Cтк, Cсп where the second letter is subscript
     * @param {string} text - Text that may contain subscript patterns
     * @param {number} x - X position (based on textAlign)
     * @param {number} y - Y position (baseline)
     * @returns {number} - Width of rendered text
     */
    drawTextWithSubscript(text, x, y) {
        // Patterns to detect: Cц, Cтк, Cсп (C followed by lowercase Ukrainian letters)
        const subscriptPattern = /C([а-яієїґ]+)/g;
        
        if (!subscriptPattern.test(text)) {
            // No subscripts, draw normally
            this.ctx.fillText(text, x, y);
            return this.ctx.measureText(text).width;
        }
        
        // Has subscripts, need custom rendering
        this.ctx.save();
        const isCenter = this.ctx.textAlign === 'center';
        const normalFont = this.ctx.font;
        const fontSize = parseInt(normalFont);
        const subscriptFont = (fontSize * 0.7) + 'px Arial'; // 70% size for subscript
        const subscriptOffset = fontSize * 0.3; // Lower by 30% of font size
        
        // Split text into parts
        let currentX = x;
        let lastIndex = 0;
        let totalWidth = 0;
        const parts = [];
        
        // Calculate all parts and total width first
        text.replace(/C([а-яієїґ]+)/g, (match, subscript, offset) => {
            // Text before C
            if (offset > lastIndex) {
                const before = text.substring(lastIndex, offset);
                this.ctx.font = normalFont;
                const width = this.ctx.measureText(before).width;
                parts.push({ text: before, type: 'normal', width });
                totalWidth += width;
            }
            
            // C letter
            this.ctx.font = normalFont;
            const cWidth = this.ctx.measureText('C').width;
            parts.push({ text: 'C', type: 'normal', width: cWidth });
            totalWidth += cWidth;
            
            // Subscript
            this.ctx.font = subscriptFont;
            const subWidth = this.ctx.measureText(subscript).width;
            parts.push({ text: subscript, type: 'subscript', width: subWidth });
            totalWidth += subWidth;
            
            lastIndex = offset + match.length;
            return match;
        });
        
        // Remaining text
        if (lastIndex < text.length) {
            const after = text.substring(lastIndex);
            this.ctx.font = normalFont;
            const width = this.ctx.measureText(after).width;
            parts.push({ text: after, type: 'normal', width });
            totalWidth += width;
        }
        
        // Adjust starting X if centered
        if (isCenter) {
            currentX = x - totalWidth / 2;
        }
        
        // Draw all parts
        parts.forEach(part => {
            if (part.type === 'normal') {
                this.ctx.font = normalFont;
                this.ctx.fillText(part.text, currentX, y);
            } else if (part.type === 'subscript') {
                this.ctx.font = subscriptFont;
                this.ctx.fillText(part.text, currentX, y + subscriptOffset);
            }
            currentX += part.width;
        });
        
        this.ctx.restore();
        return totalWidth;
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
