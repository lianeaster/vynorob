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
     * Determines which technological scheme to draw
     */
    getSchemeType() {
        const color = this.wineData.color || '';
        const style = this.wineData.style || '';
        const styleCO2 = this.wineData.style_co2 || '';
        const schemeType = this.wineData.scheme_type || '';
        
        // Validate this is a supported wine type
        // Currently ONLY supports: White, Dry, Calm (Тихе), White Scheme (Біла)
        if (color === 'Біле' && style === 'Сухе' && styleCO2 === 'Тихе' && schemeType === 'Біла') {
            return 'white-dry-calm-white-scheme';
        }
        
        // Return unsupported with details for better error message
        return {
            type: 'unsupported',
            color: color,
            style: style,
            styleCO2: styleCO2,
            schemeType: schemeType
        };
    }
    
    /**
     * Validate if the wine type is supported
     */
    isSupported() {
        const schemeType = this.getSchemeType();
        return schemeType === 'white-dry-calm-white-scheme';
    }
    
    /**
     * Build the complete scheme
     * This is the main entry point that orchestrates all drawing
     */
    buildScheme() {
        this.initCanvas();
        
        const schemeType = this.getSchemeType();
        
        // Check if supported
        if (typeof schemeType === 'object' && schemeType.type === 'unsupported') {
            this.drawUnsupportedMessage(schemeType);
            return;
        }
        
        switch (schemeType) {
            case 'white-dry-calm-white-scheme':
                this.buildWhiteDryWineScheme();
                break;
            default:
                this.drawUnsupportedMessage({ type: 'unknown' });
        }
    }
    
    /**
     * Draw message for unsupported wine types
     */
    drawUnsupportedMessage(details) {
        this.ctx.save();
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        
        const centerX = this.canvas.width / 2;
        let y = 100;
        
        this.ctx.fillText('⚠️ Технологічна схема недоступна', centerX, y);
        y += 40;
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Наразі підтримується лише:', centerX, y);
        y += 30;
        
        this.ctx.fillStyle = '#0066cc';
        this.ctx.fillText('• Колір: Біле', centerX, y);
        y += 25;
        this.ctx.fillText('• Стиль: Сухе', centerX, y);
        y += 25;
        this.ctx.fillText('• Стиль по CO2: Тихе', centerX, y);
        y += 25;
        this.ctx.fillText('• Схема: Біла', centerX, y);
        
        if (details.type === 'unsupported') {
            y += 50;
            this.ctx.fillStyle = '#666';
            this.ctx.fillText('Ваш вибір:', centerX, y);
            y += 25;
            this.ctx.fillText(`Колір: ${details.color || '—'}`, centerX, y);
            y += 25;
            this.ctx.fillText(`Стиль: ${details.style || '—'}`, centerX, y);
            y += 25;
            this.ctx.fillText(`Стиль по CO2: ${details.styleCO2 || '—'}`, centerX, y);
            y += 25;
            this.ctx.fillText(`Схема: ${details.schemeType || '—'}`, centerX, y);
        }
        
        y += 50;
        this.ctx.fillStyle = '#999';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Інші типи вин будуть додані в майбутніх версіях', centerX, y);
        
        this.ctx.restore();
        
        console.warn('Unsupported wine type:', details);
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
