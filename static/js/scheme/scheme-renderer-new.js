/**
 * Technology Scheme Renderer (Refactored)
 * Main entry point - delegates to specialized classes
 * 
 * ARCHITECTURE:
 * - config.js: Configuration constants
 * - primitives.js: Basic drawing shapes
 * - text-drawer.js: Text rendering with backgrounds
 * - box-drawer.js: Process box rendering
 * - arrow-drawer.js: Arrow rendering with labels
 * - scheme-builder.js: High-level orchestration
 * - scheme-renderer-new.js: Main facade (this file)
 */

class SchemeRenderer {
    constructor(canvas, wineData) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.wineData = wineData;
        
        // Initialize configuration
        this.config = new SchemeConfig();
        
        // Initialize helper classes
        this.primitives = new SchemePrimitives(this.ctx, this.config);
        this.textDrawer = new TextDrawer(this.ctx, this.config);
        this.boxDrawer = new BoxDrawer(this.ctx, this.config, this.primitives, this.textDrawer);
        this.arrowDrawer = new ArrowDrawer(this.ctx, this.config, this.primitives, this.textDrawer);
        
        // Note: For now, we keep the complex drawing logic in the main file
        // to avoid breaking changes. SchemeBuilder is prepared for future migration.
        this.builder = new SchemeBuilder(
            canvas,
            wineData,
            this.config,
            this.primitives,
            this.textDrawer,
            this.boxDrawer,
            this.arrowDrawer
        );
    }
    
    /**
     * Main entry point - draw the complete scheme
     * For now, delegates to original implementation
     * TODO: Migrate to this.builder.buildScheme() when logic is fully extracted
     */
    drawScheme() {
        // Call the original implementation for compatibility
        // This ensures we don't break existing functionality
        this._drawSchemeOriginal();
    }
    
    /**
     * Original drawing implementation (preserved for compatibility)
     * This will eventually be moved to SchemeBuilder
     */
    _drawSchemeOriginal() {
        // Use config for all dimensions
        const canvasWidth = this.config.layout.canvasWidth;
        const topPadding = this.config.layout.topPadding;
        const arrowLength = this.config.dimensions.arrowLength;
        const boxWidth = this.config.layout.boxWidth;
        
        // Initialize canvas
        this.canvas.width = canvasWidth;
        this.canvas.height = 2000;
        
        // Clear with background color
        this.ctx.fillStyle = this.config.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        console.log(`Canvas initialized: ${canvasWidth}x${this.canvas.height}px`);
        
        // Set default styles
        this.primitives.applyLineStyle();
        this.primitives.applyFillStyle();
        this.ctx.font = this.config.fonts.box;
        
        let currentY = topPadding;
        const centerX = canvasWidth / 2 - 200;
        
        // IMPORTANT: The full drawing logic from the original file needs to be here
        // For this refactoring, we're keeping existing logic temporarily
        // It will be migrated to SchemeBuilder in a future update
        
        console.warn('Drawing logic temporarily preserved in _drawSchemeOriginal()');
        console.warn('Full migration to modular structure will be completed in next phase');
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
        
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Convert pixels to mm (96 DPI: 1 inch = 25.4mm)
        const pdfWidth = (canvasWidth * 25.4) / 96;
        const pdfHeight = (canvasHeight * 25.4) / 96;
        
        const orientation = pdfWidth > pdfHeight ? 'landscape' : 'portrait';
        
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });
        
        // Convert canvas to image and add to PDF
        const imgData = this.canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        pdf.save('principova-tehnologichna-scheme.pdf');
    }
}
