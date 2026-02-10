/**
 * Primitive Drawing Shapes
 * Basic geometric primitives used throughout the scheme
 */

class SchemePrimitives {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
    }
    
    /**
     * Apply line style from config
     */
    applyLineStyle() {
        this.ctx.strokeStyle = this.config.colors.line;
        this.ctx.lineWidth = this.config.dimensions.lineWidth;
    }
    
    /**
     * Apply fill style
     */
    applyFillStyle(color = null) {
        this.ctx.fillStyle = color || this.config.colors.text;
    }
    
    /**
     * Draw rounded rectangle path
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
     * Draw arrowhead pointing right
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
     * Draw arrowhead pointing left
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
     * Draw arrowhead pointing down
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
     * Draw simple line
     */
    drawLine(x1, y1, x2, y2) {
        this.applyLineStyle();
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }
}
