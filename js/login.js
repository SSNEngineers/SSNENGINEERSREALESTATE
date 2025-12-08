document.getElementById('loginForm')?.addEventListener('submit', function (e) {
    e.preventDefault();

    // Get raw values (do NOT trim for username/email — case & space sensitive)
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('officialEmail').value;
    const officeId = document.getElementById('officeId').value;
    const remember = document.getElementById('remember').checked;

    // === STRICT VALIDATION (case-sensitive, no trimming) ===

    // 1. Username format: must be like "satish_123" (letters + _ + digits), no spaces
    const usernameRegex = /^[a-zA-Z]+_[0-9]+$/;
    if (!usernameRegex.test(username)) {
        showNotification('Username must be: letters + underscore + number (e.g., satish_123)', 'error');
        return;
    }

    // 2. Password rules (but still case-sensitive full match later)
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
        showNotification('Password must be ≥8 chars, with 1 uppercase and 1 special character', 'error');
        return;
    }

    // 3. Email must END with @ssnbuilders.com (and be exact — we'll compare full string later)
    if (!email.endsWith('@ssnbuilders.com')) {
        showNotification('Email must end with @ssnbuilders.com', 'error');
        return;
    }

    // 4. Office ID: must be exactly 4 digits (as typed)
    if (!/^\d{4}$/.test(officeId)) {
        showNotification('Office ID must be exactly 4 digits', 'error');
        return;
    }

    // === CASE-SENSITIVE CREDENTIAL MATCH ===
    const VALID_ADMIN = {
        username: "satish_123",
        password: "SatishSSN@1",
        officialEmail: "spokharel@ssnbuilders.com",
        officeId: "1231"
    };

    if (
        username === VALID_ADMIN.username &&
        password === VALID_ADMIN.password &&
        email === VALID_ADMIN.officialEmail &&
        officeId === VALID_ADMIN.officeId
    ) {
        // Success: store session
        const adminData = {
            username: username,
            officialEmail: email,
            officeId: officeId,
            role: 'admin',
            loggedIn: true,
            loginTime: new Date().toISOString()
        };

        // Always use sessionStorage for security, but also set a marker in localStorage
        sessionStorage.setItem('ssnai_admin', JSON.stringify(adminData));
        localStorage.setItem('ssnai_admin_exists', 'true');
        console.log("Admin logged in successfully - flag set in sessionStorage");

        showNotification('Admin login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        showNotification('Invalid admin credentials. Check case and spacing.', 'error');
    }
});

// Reuse or define showNotification if not already present
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' :
            type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#28a745' :
            type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}