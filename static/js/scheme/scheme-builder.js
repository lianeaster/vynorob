/**
 * Scheme Builder
 * High-level orchestration for building complete technology schemes
 * This file will contain the drawScheme() method and other high-level composition logic
 * 
 * Note: Due to the complexity of the white wine scheme, this class is intentionally
 * kept in a single file for easier maintenance of the sequential drawing logic.
 */

class SchemeBuilder {
    constructor(canvas, wineData, config, primitives, textDrawer, boxDrawer, arrowDrawer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.wineData = wineData;
        this.config = config;
        this.primitives = primitives;
        this.textDrawer = textDrawer;
        this.boxDrawer = boxDrawer;
        this.arrowDrawer = arrowDrawer;
    }
    
    /**
     * Initialize canvas
     */
    initCanvas() {
        const canvasWidth = this.config.layout.canvasWidth;
        const totalHeight = 2000;
        
        this.canvas.width = canvasWidth;
        this.canvas.height = totalHeight;
        
        // Clear with background color
        this.ctx.fillStyle = this.config.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        console.log(`Canvas initialized: ${canvasWidth}x${totalHeight}px`);
    }
    
    /**
     * Get scheme type based on wine data
     */
    getSchemeType() {
        // For now, only white dry wine is supported
        return 'white-dry';
    }
    
    /**
     * Build the complete scheme
     * This is the main entry point that orchestrates all drawing
     */
    buildScheme() {
        this.initCanvas();
        
        const schemeType = this.getSchemeType();
        
        switch (schemeType) {
            case 'white-dry':
                this.buildWhiteDryWineScheme();
                break;
            default:
                console.error('Unknown scheme type:', schemeType);
        }
    }
    
    /**
     * Build White Dry Wine production scheme
     * Contains the sequential drawing logic for all process stages
     */
    buildWhiteDryWineScheme() {
        // This method will be implemented in a separate pass
        // to keep file manageable - for now, keep existing logic
        console.log('Building White Dry Wine scheme...');
    }
}
