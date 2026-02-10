/**
 * Configuration for Technology Scheme Rendering
 * All colors, dimensions, fonts, and layout settings
 */

class SchemeConfig {
    constructor() {
        this.colors = {
            background: '#fff',
            line: '#000',
            text: '#000',
            textBackground: '#fff'
        };
        
        this.dimensions = {
            lineWidth: 2,
            arrowHeadLength: 8,
            arrowHeadWidth: 5,
            boxCornerRadius: 10,
            boxPaddingH: 25,
            boxPaddingV: 18,
            textPadding: 3,
            arrowLength: 60
        };
        
        this.fonts = {
            box: '14px Arial',
            label: '12px Arial',
            boxSize: 14,
            labelSize: 12,
            boxLineHeight: 20,
            labelLineHeight: 14
        };
        
        this.layout = {
            canvasWidth: 1600,
            topPadding: 50,
            bottomPadding: 50,
            boxWidth: 260,
            sideArrowLength: 120,
            multiArrowSpacing: 70
        };
    }
}
