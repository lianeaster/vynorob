// Password validation JavaScript - shared between signup and reset password
(function() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    const submitBtn = document.getElementById('submitBtn');
    const matchMessage = document.getElementById('matchMessage');
    
    // Password validation requirements - SINGLE SOURCE OF TRUTH
    const requirements = {
        length: { 
            element: document.getElementById('lengthReq'), 
            test: (pwd) => pwd.length >= 8 
        },
        uppercase: { 
            element: document.getElementById('uppercaseReq'), 
            test: (pwd) => /[A-Z]/.test(pwd) 
        },
        lowercase: { 
            element: document.getElementById('lowercaseReq'), 
            test: (pwd) => /[a-z]/.test(pwd) 
        },
        number: { 
            element: document.getElementById('numberReq'), 
            test: (pwd) => /\d/.test(pwd) 
        }
    };
    
    function validatePassword() {
        const password = passwordInput.value;
        let allMet = true;
        
        // If password is empty, reset all to default state (show circles)
        if (password.length === 0) {
            for (let key in requirements) {
                const req = requirements[key];
                req.element.classList.remove('requirement-met', 'requirement-failed', 'requirement-empty');
                req.element.classList.add('requirement-empty');
            }
            passwordInput.style.borderColor = '#ddd';
            return false;
        }
        
        // Password has content - validate each requirement
        for (let key in requirements) {
            const req = requirements[key];
            const met = req.test(password);
            
            // Remove empty state
            req.element.classList.remove('requirement-empty');
            
            if (met) {
                req.element.classList.remove('requirement-failed');
                req.element.classList.add('requirement-met');
            } else {
                req.element.classList.remove('requirement-met');
                req.element.classList.add('requirement-failed');
                allMet = false;
            }
        }
        
        // Update password field border
        passwordInput.style.borderColor = allMet ? '#4caf50' : '#f44336';
        
        return allMet;
    }
    
    function checkPasswordMatch() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword.length === 0) {
            confirmPasswordInput.style.borderColor = '#ddd';
            if (matchMessage) matchMessage.textContent = '';
            return false;
        }
        
        if (password === confirmPassword) {
            confirmPasswordInput.style.borderColor = '#4caf50';
            if (matchMessage) {
                matchMessage.style.color = '#4caf50';
                matchMessage.textContent = '✓ Паролі співпадають';
            }
            return true;
        } else {
            confirmPasswordInput.style.borderColor = '#f44336';
            if (matchMessage) {
                matchMessage.style.color = '#f44336';
                matchMessage.textContent = '✗ Паролі не співпадають';
            }
            return false;
        }
    }
    
    function updateSubmitButton() {
        const passwordValid = validatePassword();
        const passwordsMatch = checkPasswordMatch();
        
        if (submitBtn) {
            submitBtn.disabled = !(passwordValid && passwordsMatch && confirmPasswordInput.value.length > 0);
        }
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', updateSubmitButton);
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', updateSubmitButton);
    }
})();
