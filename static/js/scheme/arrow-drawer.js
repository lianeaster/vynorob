/**
 * Arrow Drawing
 * Handles all arrow rendering with labels
 */

class ArrowDrawer {
    constructor(ctx, config, primitives, textDrawer) {
        this.ctx = ctx;
        this.config = config;
        this.primitives = primitives;
        this.textDrawer = textDrawer;
    }
    
    /**
     * Draw simple arrow line
     */
    drawArrow(x1, y1, x2, y2) {
        this.primitives.drawLine(x1, y1, x2, y2);
        
        // Add arrowhead at the end
        if (x1 === x2) {
            // Vertical arrow
            this.primitives.drawArrowheadDown(x2, y2);
        } else {
            // Horizontal arrow
            if (x2 > x1) {
                this.primitives.drawArrowheadRight(x2, y2);
            } else {
                this.primitives.drawArrowheadLeft(x2, y2);
            }
        }
    }
    
    /**
     * Draw horizontal arrow with text above
     * @param {Object} config - Arrow configuration
     */
    drawHorizontalArrowWithLabel(config) {
        const { x1, y, x2, text, direction = 'right' } = config;
        
        this.ctx.save();
        
        // Draw continuous arrow line
        this.primitives.applyLineStyle();
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y);
        this.ctx.lineTo(x2, y);
        this.ctx.stroke();
        
        // Draw arrowhead(s)
        if (direction === 'right' || direction === 'both') {
            this.primitives.drawArrowheadRight(x2, y);
        }
        if (direction === 'left' || direction === 'both') {
            this.primitives.drawArrowheadLeft(x1, y);
        }
        
        // Draw text above arrow center with background
        const centerX = (x1 + x2) / 2;
        const textY = y - 10; // 10px above arrow
        
        this.textDrawer.drawTextWithBackground(text, centerX, textY, {
            font: this.config.fonts.label,
            lineHeight: this.config.fonts.labelLineHeight
        });
        
        this.ctx.restore();
    }
    
    /**
     * Draw double-headed arrow (←→) with text above
     * Used for cooling agent (Холодоагент) - flows in and out
     */
    drawDoubleArrowWithText(x1, y1, x2, y2, text) {
        this.ctx.save();
        
        console.log(`${text} arrow - Drawing CONTINUOUS line from Y:${y1} to Y:${y2}`);
        
        // Draw full continuous arrow line
        this.primitives.applyLineStyle();
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y1);
        this.ctx.stroke();
        
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 8;
        
        // Draw left arrowhead (pointing left)
        this.ctx.fillStyle = this.config.colors.line;
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
        this.ctx.fillStyle = this.config.colors.textBackground;
        const bgTop = textY - textHeight - padding;
        const bgBottom = textY + padding; // Symmetric padding
        const bgHeight = bgBottom - bgTop;
        this.ctx.fillRect(centerX - textWidth/2 - padding, bgTop, 
                          textWidth + padding*2, bgHeight);
        
        // Draw text
        this.ctx.fillStyle = this.config.colors.text;
        this.ctx.fillText(text, centerX, textY);
        
        this.ctx.restore();
    }
    
    /**
     * Draw side input arrow (left side) with text above
     */
    drawSideInput(x, y, arrowLength, inputConfig) {
        const text = inputConfig.text;
        const type = inputConfig.type || 'single';
        const startX = x - arrowLength;
        const endX = x;
        
        if (type === 'double') {
            // Double-sided arrow for materials that flow both ways
            this.drawDoubleArrowWithText(startX, y, endX, y, text);
        } else {
            // Regular input arrow
            this.ctx.save();
            
            // Draw continuous arrow line
            this.primitives.applyLineStyle();
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
            
            // Draw arrowhead
            this.primitives.drawArrowheadRight(endX, y);
            
            // Calculate text dimensions
            this.textDrawer.applyLabelTextStyle();
            const lines = text.split('\n');
            const lineHeight = this.config.fonts.labelLineHeight;
            const totalTextHeight = lines.length * lineHeight;
            const textX = (startX + endX) / 2;
            const textY = y - 10 - totalTextHeight; // 10px gap above arrow
            
            // Measure max width
            let maxWidth = 0;
            lines.forEach(line => {
                const metrics = this.ctx.measureText(line);
                maxWidth = Math.max(maxWidth, metrics.width);
            });
            
            const padding = 3;
            
            // Draw text background with symmetric padding
            this.ctx.fillStyle = this.config.colors.textBackground;
            const bgTop = textY - padding;
            const bgBottom = textY + totalTextHeight + padding;
            const bgHeight = bgBottom - bgTop;
            
            this.ctx.fillRect(textX - maxWidth/2 - padding, bgTop, 
                              maxWidth + padding*2, bgHeight);
            
            // Draw text
            this.ctx.fillStyle = this.config.colors.text;
            lines.forEach((line, i) => {
                this.ctx.fillText(line, textX, textY + (i * lineHeight));
            });
            
            this.ctx.restore();
        }
    }
}
