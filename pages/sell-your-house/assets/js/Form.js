// ===========================
// FORM.JS - Lead Capture Form Handler
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('leadCaptureForm');
    if (!form) return;
    
    let currentStep = 1;
    const totalSteps = 3;
    
    // Initialize form
    initFormTracking();
    initStepNavigation();
    initFormValidation();
    initFormSubmission();
});

// ===========================
// TRACKING DATA CAPTURE
// ===========================
function initFormTracking() {
    // Capture URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Set hidden tracking fields
    const trackingFields = {
        gclid: urlParams.get('gclid') || '',
        fbclid: urlParams.get('fbclid') || '',
        utm_source: urlParams.get('utm_source') || '',
        utm_medium: urlParams.get('utm_medium') || '',
        utm_campaign: urlParams.get('utm_campaign') || '',
        referrer: document.referrer || ''
    };
    
    // Populate hidden fields
    Object.keys(trackingFields).forEach(key => {
        const field = document.getElementById(key);
        if (field) {
            field.value = trackingFields[key];
        }
    });
}

// ===========================
// MULTI-STEP NAVIGATION
// ===========================
function initStepNavigation() {
    const nextButtons = document.querySelectorAll('.btn-next');
    const backButtons = document.querySelectorAll('.btn-back');
    
    let currentStep = 1;
    const totalSteps = 3;
    
    // Next button handlers
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (validateCurrentStep(currentStep)) {
                currentStep++;
                showStep(currentStep);
                updateProgress(currentStep, totalSteps);
                scrollToTop();
            }
        });
    });
    
    // Back button handlers
    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
                updateProgress(currentStep, totalSteps);
                scrollToTop();
            }
        });
    });
}

function showStep(stepNumber) {
    // Hide all steps
    const steps = document.querySelectorAll('.form-step');
    steps.forEach(step => {
        step.classList.remove('active');
    });
    
    // Show current step
    const currentStep = document.querySelector(`[data-step="${stepNumber}"]`);
    if (currentStep) {
        currentStep.classList.add('active');
    }
}

function updateProgress(current, total) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    const percentage = (current / total) * 100;
    
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }
    
    if (progressText) {
        progressText.textContent = `Step ${current} of ${total}`;
    }
}

function scrollToTop() {
    const formCard = document.querySelector('.form-card');
    if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===========================
// FORM VALIDATION
// ===========================
function initFormValidation() {
    // Phone number formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            formatPhoneInput(this);
        });
    }
    
    // Real-time email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            validateEmail(this);
        });
    }
}

function validateCurrentStep(stepNumber) {
    const currentStepEl = document.querySelector(`[data-step="${stepNumber}"]`);
    if (!currentStepEl) return false;
    
    const requiredFields = currentStepEl.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            highlightError(field, 'This field is required');
        } else {
            clearError(field);
            
            // Additional validation based on field type
            if (field.type === 'email' && !isValidEmail(field.value)) {
                isValid = false;
                highlightError(field, 'Please enter a valid email address');
            }
            
            if (field.type === 'tel' && !isValidPhone(field.value)) {
                isValid = false;
                highlightError(field, 'Please enter a valid 10-digit phone number');
            }
        }
    });
    
    return isValid;
}

function highlightError(field, message) {
    field.style.borderColor = '#D32F2F';
    
    // Remove existing error message
    const existingError = field.parentElement.querySelector('.error-message-text');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message-text';
    errorDiv.style.color = '#D32F2F';
    errorDiv.style.fontSize = '0.85rem';
    errorDiv.style.marginTop = '0.25rem';
    errorDiv.textContent = message;
    field.parentElement.appendChild(errorDiv);
}

function clearError(field) {
    field.style.borderColor = '';
    const errorMessage = field.parentElement.querySelector('.error-message-text');
    if (errorMessage) {
        errorMessage.remove();
    }
}

function formatPhoneInput(input) {
    const cleaned = input.value.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length >= 10) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 6) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 3) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    
    input.value = formatted;
}

function validateEmail(field) {
    if (field.value && !isValidEmail(field.value)) {
        highlightError(field, 'Please enter a valid email address');
        return false;
    }
    clearError(field);
    return true;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;
}

// ===========================
// FORM SUBMISSION
// ===========================
function initFormSubmission() {
    const form = document.getElementById('leadCaptureForm');
    const submitBtn = document.getElementById('submitBtn');
    
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Final validation
        if (!validateCurrentStep(3)) {
            return;
        }
        
        // Show loading state
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        submitBtn.disabled = true;
        
        // Collect form data
        const formData = collectFormData();
        
        try {
            // Submit to backend API
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Show success message
                showSuccess();
                
                // Track conversion (if Google Analytics is present)
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'conversion', {
                        'send_to': 'AW-XXXXXXXXX/XXXXXXXXXXXXXXXXXX', // Replace with your conversion ID
                        'value': 1.0,
                        'currency': 'USD'
                    });
                }
                
                // Facebook Pixel tracking (if present)
                if (typeof fbq !== 'undefined') {
                    fbq('track', 'Lead');
                }
                
            } else {
                throw new Error(result.message || 'Submission failed');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            showError(error.message);
            
            // Reset button state
            btnText.style.display = 'inline-block';
            btnLoader.style.display = 'none';
            submitBtn.disabled = false;
        }
    });
}

function collectFormData() {
    const form = document.getElementById('leadCaptureForm');
    
    return {
        // Property Information
        propertyAddress: form.querySelector('#propertyAddress').value,
        propertyType: form.querySelector('#propertyType').value,
        propertyCondition: form.querySelector('#propertyCondition').value,
        bedrooms: form.querySelector('#bedrooms').value || null,
        bathrooms: form.querySelector('#bathrooms').value || null,
        
        // Situation & Timeline
        sellingReason: form.querySelector('#sellingReason').value,
        timeframe: form.querySelector('#timeframe').value,
        oweMortgage: form.querySelector('#oweMortgage').value || null,
        additionalInfo: form.querySelector('#additionalInfo').value || '',
        
        // Contact Information
        fullName: form.querySelector('#fullName').value,
        email: form.querySelector('#email').value,
        phone: form.querySelector('#phone').value.replace(/\D/g, ''), // Store cleaned phone
        preferredContact: form.querySelector('#preferredContact').value,
        smsConsent: form.querySelector('#smsConsent').checked,
        
        // Tracking Data
        tracking: {
            gclid: form.querySelector('#gclid').value || '',
            fbclid: form.querySelector('#fbclid').value || '',
            utm_source: form.querySelector('#utm_source').value || '',
            utm_medium: form.querySelector('#utm_medium').value || '',
            utm_campaign: form.querySelector('#utm_campaign').value || '',
            referrer: form.querySelector('#referrer').value || '',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        }
    };
}

function showSuccess() {
    const form = document.getElementById('leadCaptureForm');
    const successMessage = document.getElementById('successMessage');
    
    if (form && successMessage) {
        form.style.display = 'none';
        successMessage.style.display = 'block';
    }
}

function showError(message) {
    const form = document.getElementById('leadCaptureForm');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (form && errorMessage) {
        form.style.display = 'none';
        errorMessage.style.display = 'block';
        
        if (errorText && message) {
            errorText.textContent = message;
        }
    }
}