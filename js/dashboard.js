const categoryIcons = {
    popularLocations: "⭐",
    school: "🏫",
    hospital: "🏥",
    fast_food: "🍔",
    supermarket: "🛒",
    shopping_mall: "🏬",
    coffee_shop: "☕",
    gas_station: "⛽",
    police_station: "👮",
    fire_station: "🚒",
    bank: "🏦",
    atm: "💳",
    park: "🌳",
    pharmacy: "💊",
    gym: "💪"
};

let currentMode = 'separate';

// Check auth
window.onload = function () {
    const user = sessionStorage.getItem('ssnai_user') || localStorage.getItem('ssnai_user');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    const userData = JSON.parse(user);
    document.getElementById('userName').textContent = userData.fullname || userData.username || 'User';
    buildPOICategories();
};

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/index.html';
    }
}

function showAnalysisForm() {
    document.getElementById('analysisModal').style.display = 'flex';
}

function closeAnalysisForm() {
    document.getElementById('analysisModal').style.display = 'none';
}

function toggleAddressMode(mode) {
    currentMode = mode;
    const separateMode = document.getElementById('separateMode');
    const fullMode = document.getElementById('fullMode');
    const toggleBtns = document.querySelectorAll('.toggle-btn');

    toggleBtns.forEach(btn => btn.classList.remove('active'));

    if (mode === 'separate') {
        separateMode.style.display = 'block';
        fullMode.style.display = 'none';
        toggleBtns[0].classList.add('active');
    } else {
        separateMode.style.display = 'none';
        fullMode.style.display = 'block';
        toggleBtns[1].classList.add('active');
    }
}

function buildPOICategories() {
    const container = document.getElementById('poiCategories');
    Object.keys(categoryIcons).forEach(cat => {
        const div = document.createElement('div');
        div.className = 'poi-category-item';
        div.innerHTML = `
            <label>
                <input type="checkbox" name="poi_${cat}" value="${cat}">
                <span class="poi-icon">${categoryIcons[cat]}</span>
                <span class="poi-name">${cat.replace(/_/g, ' ')}</span>
                <input type="number" class="poi-count" min="0" max="15" value="0" disabled>
            </label>
        `;
        container.appendChild(div);

        // Add event listener for checkbox
        const checkbox = div.querySelector('input[type="checkbox"]');
        const countInput = div.querySelector('.poi-count');
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                countInput.disabled = false;
                countInput.value = 8; // Changed from 3 to 8
                countInput.focus();
            } else {
                countInput.disabled = true;
                countInput.value = 0;
            }
        });
    });
}

// NEW: Select All POIs function
function selectAllPOIs() {
    document.querySelectorAll('.poi-category-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const countInput = item.querySelector('.poi-count');
        
        checkbox.checked = true;
        countInput.disabled = false;
        countInput.value = 8;
    });
    
    showNotification('All POI categories selected with 8 items each', 'success');
}

// NEW: Deselect All POIs function
function deselectAllPOIs() {
    document.querySelectorAll('.poi-category-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const countInput = item.querySelector('.poi-count');
        
        checkbox.checked = false;
        countInput.disabled = true;
        countInput.value = 0;
    });
    
    showNotification('All POI categories deselected', 'success');
}

document.getElementById('locationForm').addEventListener('submit', function (e) {
    e.preventDefault();

    let address = '';
    if (currentMode === 'separate') {
        const parts = [
            document.getElementById('streetNumber').value,
            document.getElementById('streetName').value,
            document.getElementById('city').value,
            document.getElementById('state').value,
            document.getElementById('zipCode').value,
            document.getElementById('country').value || 'USA'
        ].filter(Boolean);
        address = parts.join(', ');
    } else {
        address = document.getElementById('fullAddress').value.trim();
    }

    if (!address) {
        showNotification('Please enter an address', 'error');
        return;
    }

    let radius = parseFloat(document.getElementById('searchRadius').value);
    if (radius > 3) radius = 3;

    const selectedPOIs = {};
    document.querySelectorAll('.poi-category-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const countInput = item.querySelector('.poi-count');
        if (checkbox.checked && countInput.value > 0) {
            // Ensure max is 15
            const count = Math.min(parseInt(countInput.value), 15);
            selectedPOIs[checkbox.value] = count;
        }
    });

    if (Object.keys(selectedPOIs).length === 0) {
        showNotification('Please select at least one POI category with count > 0', 'error');
        return;
    }

    const analysisParams = {
        address: address,
        radius: radius,
        pois: selectedPOIs
    };

    sessionStorage.setItem('analysis_params', JSON.stringify(analysisParams));
    showNotification('Starting analysis...', 'success');

    // Check if admin or regular user
    function isAdminUser() {
        const adminSession = sessionStorage.getItem('ssnai_admin');
        const adminLocal = localStorage.getItem('ssnai_admin');
        const adminMarker = localStorage.getItem('ssnai_admin_exists');
        console.log("Admin check - Session:", !!adminSession, "Local:", !!adminLocal, "Marker:", !!adminMarker);
        return adminSession || adminLocal || adminMarker;
    }

    const isAdmin = isAdminUser();
    setTimeout(() => {
        if (isAdmin) {
            console.log("Redirecting admin to map-analysis.html");
            window.location.href = 'map-analysis.html';
        } else {
            // Check one more time if it's an admin with marker flag
            const adminFallback = localStorage.getItem('ssnai_admin_exists');
            if (adminFallback) {
                console.log("Fallback admin detection - redirecting to map-analysis.html");
                window.location.href = 'map-analysis.html';
            } else {
                console.log("Redirecting to user-analysis.html");
                window.location.href = 'user-analysis.html';
            }
        }
    }, 1000);
});

function showNotification(message, type) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}