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
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                step: step,
                choice: choice
            })
        });
        
        // Check for session expiration (401 status)
        if (response.status === 401) {
            const errorData = await response.json();
            if (errorData.session_expired && errorData.redirect) {
                // Session expired - redirect without showing alert
                window.location.href = errorData.redirect;
                return;
            }
        }
        
        const result = await response.json();
        
        if (!result.success) {
            console.error('Error saving choice:', result);
            alert('Помилка при збереженні вибору');
        }
        
        return result;
    } catch (error) {
        // Only show alert if it's not a session expiration error
        if (error.message !== 'Session expired') {
            console.error('Error:', error);
            alert('Помилка при збереженні вибору');
        }
        throw error;
    }
}

/**
 * Get current session data
 */
async function getSessionData() {
    try {
        const response = await fetch('/api/get-session', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        // Check for session expiration
        if (response.status === 401) {
            const errorData = await response.json();
            if (errorData.session_expired && errorData.redirect) {
                window.location.href = errorData.redirect;
                return;
            }
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        if (error.message !== 'Session expired') {
            console.error('Error fetching session data:', error);
        }
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
