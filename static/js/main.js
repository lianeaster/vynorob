/**
 * Main JavaScript file for Vynorob application
 */

/**
 * Save user choice to session
 */
async function saveChoice(step, choice) {
    try {
        const response = await fetch('/api/save-choice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                step: step,
                choice: choice
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            console.error('Error saving choice:', result);
            alert('Помилка при збереженні вибору');
        }
        
        return result;
    } catch (error) {
        console.error('Error:', error);
        alert('Помилка при збереженні вибору');
        throw error;
    }
}

/**
 * Get current session data
 */
async function getSessionData() {
    try {
        const response = await fetch('/api/get-session');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching session data:', error);
        return {};
    }
}

/**
 * Add loading animation to buttons
 */
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.classList.contains('loading')) {
                this.classList.add('loading');
            }
        });
    });
});
