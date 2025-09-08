// DTF Customizer - Palette-Based Color Matching

// Backend Configuration
const BACKEND_CONFIG = {
    local: 'http://localhost:8000',
    render: 'https://dtf-customizer-backend.onrender.com'
};

// Global state
const state = {
    image: null,
    colorMatches: [],
    zoom: 1,
    pan: { x: 0, y: 0 },
    ppi: 300,
    isDragging: false,
    lastMousePos: { x: 0, y: 0 },
    selectedFetchedColor: null,
    useLocalBackend: true // Default to local backend
};

// Fresh Pricing System - Position Tracking
const positionTracker = {
    front: {
        id: 'front',
        colorCount: 0,
        isNewDesign: false,
        dimensions: null,
        finalImage: null,
        quantity: 1,
        calculatedPrice: 0
    },
    back: {
        id: 'back',
        colorCount: 0,
        isNewDesign: false,
        dimensions: null,
        finalImage: null,
        quantity: 1,
        calculatedPrice: 0
    },
    left_sleeve: {
        id: 'left_sleeve',
        colorCount: 0,
        isNewDesign: false,
        dimensions: null,
        finalImage: null,
        quantity: 1,
        calculatedPrice: 0
    },
    right_sleeve: {
        id: 'right_sleeve',
        colorCount: 0,
        isNewDesign: false,
        dimensions: null,
        finalImage: null,
        quantity: 1,
        calculatedPrice: 0
    }
};

// Product base price (from Shopify)
let productBasePrice = 0;

// Fresh Pricing System Functions - Using Backend API
async function calculatePositionPrice(position) {
    if (position.colorCount === 0) return 0;
    
    try {
        // Call backend API for real pricing calculation
        const response = await fetch(`${getBackendUrl()}/calculate-pricing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                base_product_price: productBasePrice,
                positions: [{
                    position_id: position.id,
                    position_name: position.positionName || position.id,
                    design_file_url: position.finalImage || '',
                    color_count: position.colorCount,
                    design_hash: generateDesignHash(position.id, position.colorCount),
                    is_new_design: position.isNewDesign,
                    width: position.dimensions?.width || null,
                    height: position.dimensions?.height || null
                }],
                quantity: position.quantity || 1
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`💰 Backend pricing result for ${position.id}:`, result);
        
        // Return the total cost for this position
        if (result.position_costs && result.position_costs.length > 0) {
            return result.position_costs[0].total_cost;
        }
        
        return 0;
        
    } catch (error) {
        console.error(`❌ Failed to calculate price for ${position.id}:`, error);
        // Fallback to simple calculation
        return calculatePositionPriceFallback(position);
    }
}

function calculatePositionPriceFallback(position) {
    // Fallback pricing if backend is unavailable
    const colorPricing = {
        1: 8.00,
        2: 12.00,
        3: 16.00,
        4: 20.00,
        5: 24.00,
        6: 28.00,
        7: 32.00,
        8: 36.00
    };
    
    const basePrice = colorPricing[position.colorCount] || (position.colorCount * 4);
    const newDesignFee = position.isNewDesign ? 25 : 0;
    const totalPrice = (basePrice + newDesignFee) * (position.quantity || 1);
    
    console.log(`💰 Fallback pricing for ${position.id}:`, {
        colorCount: position.colorCount,
        basePrice: basePrice,
        isNewDesign: position.isNewDesign,
        newDesignFee: newDesignFee,
        quantity: position.quantity,
        totalPrice: totalPrice
    });
    
    return totalPrice;
}

function generateDesignHash(positionName, colorCount) {
    const data = `${positionName}-${colorCount}-${Date.now()}`;
    return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
}

async function updatePositionData(positionId, data) {
    if (positionTracker[positionId]) {
        Object.assign(positionTracker[positionId], data);
        
        // Calculate price asynchronously
        try {
            positionTracker[positionId].calculatedPrice = await calculatePositionPrice(positionTracker[positionId]);
            console.log(`✅ Updated position ${positionId}:`, positionTracker[positionId]);
            updatePriceBreakdown();
        } catch (error) {
            console.error(`❌ Failed to update position ${positionId}:`, error);
        }
    }
}

function getCurrentPosition() {
    return window.currentEditingPosition || null;
}

async function updatePriceBreakdown() {
    console.log('🔄 Updating price breakdown...');
    
    // Get positions with designs
    const positionsWithDesigns = Object.values(positionTracker).filter(pos => pos.colorCount > 0);
    console.log('📊 Positions with designs:', positionsWithDesigns);
    
    if (positionsWithDesigns.length === 0) {
        console.log('⚠️ No positions with designs found');
        return;
    }
    
    // Calculate total position costs
    let totalPositionCost = 0;
    let positionBreakdown = '';
    
    for (const position of positionsWithDesigns) {
        const price = position.calculatedPrice || 0;
        totalPositionCost += price;
        
        const newDesignText = position.isNewDesign ? ' + $25 (new)' : '';
        const positionName = position.positionName || position.id;
        positionBreakdown += `├── ${positionName.charAt(0).toUpperCase() + positionName.slice(1)}: $${price.toFixed(2)} (${position.colorCount} colors × ${position.quantity || 1})${newDesignText}\n`;
    }
    
    // Calculate total
    const grandTotal = productBasePrice + totalPositionCost;
    
    // Update UI
    const priceBreakdownElement = document.getElementById('sp-pricing-positions');
    if (priceBreakdownElement) {
        const breakdownHTML = `
            <div class="price-breakdown">
                <div class="product-price">
                    <strong>Product Title: $${productBasePrice.toFixed(2)}</strong>
                </div>
                <div class="position-prices">
                    <pre>${positionBreakdown}</pre>
                </div>
                <div class="total-price">
                    <strong>Total: $${grandTotal.toFixed(2)}</strong>
                </div>
            </div>
        `;
        priceBreakdownElement.innerHTML = breakdownHTML;
    }
    
    console.log('💰 Price breakdown updated:', {
        productBasePrice: productBasePrice,
        totalPositionCost: totalPositionCost,
        grandTotal: grandTotal
    });
}

// Set product base price (from Shopify)
function setProductBasePrice(price) {
    productBasePrice = price;
    console.log(`💰 Product base price set to: $${price}`);
    updatePriceBreakdown();
}

// Initialize product base price from Shopify data
function initializeProductPrice() {
    // Try to get product price from Shopify
    if (window.Shopify && window.Shopify.theme && window.Shopify.theme.product) {
        const product = window.Shopify.theme.product;
        if (product.price) {
            setProductBasePrice(product.price / 100); // Convert from cents
        }
    } else {
        // Fallback: try to get from meta tags or other sources
        const priceMeta = document.querySelector('meta[property="product:price:amount"]');
        if (priceMeta) {
            setProductBasePrice(parseFloat(priceMeta.content));
        } else {
            // Default fallback price
            setProductBasePrice(25.00);
        }
    }
}

// Test if JavaScript is running
console.log('🚀 DTF Customizer JavaScript loaded!');
console.log('🔧 Backend Configuration:', BACKEND_CONFIG);
console.log('🌐 Current Backend URL:', getBackendUrl());

// Initialize the fresh pricing system
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Initializing fresh pricing system...');
    initializeProductPrice();
});

// Helper function to get current backend URL
function getBackendUrl() {
    return state.useLocalBackend ? BACKEND_CONFIG.local : BACKEND_CONFIG.render;
}

// Update backend toggle display
function updateBackendToggleDisplay() {
    const statusElement = document.getElementById('backend-status');
    const toggleElement = document.querySelector('.backend-toggle');
    
    if (state.useLocalBackend) {
        statusElement.textContent = 'Local';
        toggleElement.classList.remove('render-mode');
    } else {
        statusElement.textContent = 'Render';
        toggleElement.classList.add('render-mode');
    }
}

// Toggle between local and render backend
function toggleBackend() {
    state.useLocalBackend = !state.useLocalBackend;
    updateBackendToggleDisplay();
    
    if (state.useLocalBackend) {
        console.log('🔄 Switched to LOCAL backend:', BACKEND_CONFIG.local);
        showMessage('Switched to Local Backend', 'info');
    } else {
        console.log('🔄 Switched to RENDER backend:', BACKEND_CONFIG.render);
        showMessage('Switched to Render Backend', 'info');
    }
    
    // Recheck backend status with new URL
    setTimeout(() => {
        checkBackendStatus();
    }, 500);
}

// Color editing state
let currentEditingColor = null;
let originalImageData = null;

// Popup state
let currentPopupColor = null;
let selectedPaletteColor = null;

// Color palette for popup
const POPUP_COLOR_PALETTE = [
    // Special: Transparent
    { name: 'Transparent', hex: 'transparent', rgb: [0, 0, 0], isTransparent: true },
    
    // Whites & Grays
    { name: 'Pure White', hex: '#ffffff', rgb: [255, 255, 255] },
    { name: 'White', hex: '#fefefe', rgb: [254, 254, 254] },
    { name: 'Black', hex: '#000000', rgb: [0, 0, 0] },
    { name: 'Charcoal', hex: '#646a69', rgb: [100, 106, 105] },
    { name: 'Gray', hex: '#99999a', rgb: [153, 153, 154] },
    { name: 'Ice Gray', hex: '#bdbbbb', rgb: [189, 187, 187] },
    
    // Reds & Pinks
    { name: 'Vibrant Red', hex: '#ef3340', rgb: [239, 51, 64] },
    { name: 'Hot Pink', hex: '#ff0091', rgb: [255, 0, 145] },
    { name: 'Pink', hex: '#ffafbe', rgb: [255, 175, 190] },
    { name: 'Charity Pink', hex: '#ff8cbe', rgb: [255, 140, 190] },
    { name: 'Magenta', hex: '#b4468c', rgb: [180, 70, 140] },
    { name: 'Maroon', hex: '#7d2d3c', rgb: [125, 45, 60] },
    
    // Blues
    { name: 'Vibrant Blue', hex: '#0047bb', rgb: [0, 71, 187] },
    { name: 'Blue', hex: '#005fa0', rgb: [0, 95, 160] },
    { name: 'Royal', hex: '#003c82', rgb: [0, 60, 130] },
    { name: 'Navy', hex: '#00325a', rgb: [0, 50, 90] },
    { name: 'Sky Blue', hex: '#23aff0', rgb: [35, 175, 240] },
    { name: 'Baby Blue', hex: '#91beeb', rgb: [145, 190, 235] },
    
    // Greens
    { name: 'Green', hex: '#3ca51e', rgb: [60, 165, 30] },
    { name: 'Kelly', hex: '#006937', rgb: [0, 105, 55] },
    { name: 'Forest', hex: '#2d5032', rgb: [45, 80, 50] },
    { name: 'Vibrant Lime', hex: '#a5e100', rgb: [165, 225, 0] },
    { name: 'Mint', hex: '#a2e4b8', rgb: [162, 228, 184] },
    
    // Yellows & Oranges
    { name: 'Yellow', hex: '#ffdc00', rgb: [255, 220, 0] },
    { name: 'Gold', hex: '#ffc828', rgb: [255, 200, 40] },
    { name: 'Athletic Gold', hex: '#ffb419', rgb: [255, 180, 25] },
    { name: 'Lemon', hex: '#faeb5f', rgb: [250, 235, 95] },
    { name: 'Old Gold', hex: '#8c6923', rgb: [140, 105, 35] },
    { name: 'Orange', hex: '#fa4b0f', rgb: [250, 75, 15] },
    { name: 'Team Orange', hex: '#ff8200', rgb: [255, 130, 0] },
    
    // Purples & Violets
    { name: 'Purple', hex: '#5a3287', rgb: [90, 50, 135] },
    { name: 'Plum', hex: '#641e64', rgb: [100, 30, 100] },
    { name: 'Grape', hex: '#bb29bb', rgb: [187, 41, 187] },
    { name: 'Lavender', hex: '#aa7dc8', rgb: [170, 125, 200] },
    
    // Browns & Tans
    { name: 'Deep Brown', hex: '#402d1c', rgb: [64, 45, 28] },
    { name: 'Brown', hex: '#82502d', rgb: [130, 80, 45] },
    { name: 'Bronze', hex: '#a66f41', rgb: [166, 111, 65] },
    { name: 'Sand', hex: '#cda073', rgb: [205, 160, 115] },
    { name: 'Apricot', hex: '#ffbe78', rgb: [255, 190, 120] },
    { name: 'Warm Ivory', hex: '#eed8ac', rgb: [238, 216, 172] },
    
    // Teals & Cyans
    { name: 'Teal', hex: '#007378', rgb: [0, 115, 120] },
    { name: 'Turquoise', hex: '#009bb4', rgb: [0, 155, 180] }
];

// Initialize the application
function init() {
    console.log('🚀 Initializing DTF Customizer with Palette Matching...');
    

    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI
    updateUI();
    updateDownloadButton();
    
    // Initialize backend toggle state
    updateBackendToggleDisplay();
    
    // Check backend status after a short delay to ensure page is fully loaded
    setTimeout(() => {
        checkBackendStatus();
    }, 1000);
    
    // Initialize zoom level display
    updateZoomLevel();
}

// Set up event listeners
function setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('dtf-file-input');
    const fileUploadArea = document.getElementById('dtf-upload-area');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // New design checkbox
    const newDesignCheckbox = document.getElementById('dtf-new-design-checkbox');
    if (newDesignCheckbox) {
        newDesignCheckbox.addEventListener('change', handleNewDesignCheckboxChange);
        console.log('✅ New design checkbox found and listener added');
    } else {
        console.log('⚠️ New design checkbox not found');
    }
    
    // Make entire file upload area clickable
    if (fileUploadArea) {
        fileUploadArea.addEventListener('click', function(e) {
            // Don't trigger if clicking on the label (to avoid double trigger)
            if (e.target.tagName !== 'LABEL') {
                fileInput.click();
            }
        });
        
        // Enhanced drag and drop functionality
        fileUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileUploadArea.classList.add('drag-over');
        });
        
        fileUploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileUploadArea.classList.remove('drag-over');
        });
        
        fileUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileUploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    fileInput.files = files;
                    handleFileUpload({ target: { files: [file] } });
                } else {
                    showMessage('❌ Please select a valid image file.', 'error');
                }
            }
        });
    }
    
    // PPI input
    const ppiInput = document.getElementById('dtf-ppi');
    if (ppiInput) {
        ppiInput.addEventListener('input', handlePPIChange);
    }
    
    // Size controls
    const widthInput = document.getElementById('dtf-size-width');
    const heightInput = document.getElementById('dtf-size-height');
    const unitsSelect = document.getElementById('dtf-size-units');
    const applyBtn = document.getElementById('dtf-apply-size');
    const aspectBtn = document.getElementById('dtf-aspect-toggle');
    
    // State for sizing
    state.sizeUnits = 'in';
    state.aspectLocked = true;
    state.originalAspect = null;
    
    if (unitsSelect) {
        unitsSelect.addEventListener('change', (e) => {
            state.sizeUnits = e.target.value;
            // Update displayed fields from current image size
            if (state.image) updateSizeInputsFromImage();
            // Add visual feedback
            unitsSelect.style.transform = 'scale(1.05)';
            setTimeout(() => unitsSelect.style.transform = 'scale(1)', 200);
        });
    }
    if (aspectBtn) {
        aspectBtn.addEventListener('click', () => {
            state.aspectLocked = !state.aspectLocked;
            aspectBtn.innerHTML = state.aspectLocked ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-unlock"></i>';
            // Add visual feedback
            aspectBtn.style.transform = 'scale(1.1)';
            setTimeout(() => aspectBtn.style.transform = 'scale(1)', 200);
        });
    }
    if (widthInput && heightInput) {
        // When user types width/height with aspect lock on, auto-update counterpart
        widthInput.addEventListener('input', () => {
            onSizeFieldChanged('width');
            // Add visual feedback
            widthInput.style.borderColor = '#667eea';
            setTimeout(() => widthInput.style.borderColor = '#dee2e6', 300);
        });
        heightInput.addEventListener('input', () => {
            onSizeFieldChanged('height');
            // Add visual feedback
            heightInput.style.borderColor = '#667eea';
            setTimeout(() => heightInput.style.borderColor = '#dee2e6', 300);
        });
    }
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            // Add loading animation
            const originalIcon = applyBtn.innerHTML;
            applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            applyBtn.disabled = true;
            
            applyNewSizeToImage().finally(() => {
                // Restore button state
                applyBtn.innerHTML = originalIcon;
                applyBtn.disabled = false;
            });
        });
    }
    
    // Background removal
    const removeBgBtn = document.getElementById('dtf-remove-bg');
    if (removeBgBtn) {
        removeBgBtn.addEventListener('click', () => {
            showBackgroundRemovalLoading(removeBgBtn);
            removeBackground();
        });
    }
    
    // Remove.bg background removal
    const removebgRemoveBtn = document.getElementById('dtf-remove-bg-removebg');
    if (removebgRemoveBtn) {
        removebgRemoveBtn.addEventListener('click', () => {
            showBackgroundRemovalLoading(removebgRemoveBtn);
            removeBackgroundRemovebg();
        });
    }
    

    
    // Advanced background removal
    const advancedRemoveBtn = document.getElementById('dtf-remove-bg-advanced');
    if (advancedRemoveBtn) {
        advancedRemoveBtn.addEventListener('click', () => {
            const advancedOptions = document.getElementById('dtf-advanced-options');
            if (advancedOptions) {
                advancedOptions.style.display = advancedOptions.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    // Re-analyze colors
    const reanalyzeBtn = document.getElementById('dtf-reanalyze-colors');
    if (reanalyzeBtn) {
        reanalyzeBtn.addEventListener('click', () => {
            if (state.image) {
                extractColorsWithPalette(state.image);
            } else {
                showMessage('Please upload an image first', 'warning');
            }
        });
    }
    
    // Test backend connection
    const testBackendBtn = document.getElementById('dtf-test-backend');
    if (testBackendBtn) {
        testBackendBtn.addEventListener('click', async () => {
            console.log('🧪 Testing backend connection...');
            showMessage('Testing backend connection...', 'info');
            
            try {
                const backendUrl = getBackendUrl();
                const response = await fetch(`${backendUrl}/health`);
                console.log('📡 Test response status:', response.status);
                console.log('📡 Test response ok:', response.ok);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Backend test successful:', data);
                    showMessage(`✅ Backend is working! Status: ${data.status}`, 'success');
                } else {
                    console.log('❌ Backend test failed - status:', response.status);
                    showMessage(`❌ Backend test failed - HTTP ${response.status}`, 'error');
                }
            } catch (error) {
                console.log('❌ Backend test error:', error);
                showMessage(`❌ Backend test error: ${error.message}`, 'error');
            }
        });
    }
    
    // Refresh backend status
    const refreshBackendBtn = document.getElementById('dtf-refresh-backend');
    if (refreshBackendBtn) {
        refreshBackendBtn.addEventListener('click', () => {
            console.log('🔄 Manually refreshing backend status...');
            checkBackendStatus();
        });
    }
    
    // Zoom controls
    const zoomInBtn = document.getElementById('dtf-zoom-in');
    const zoomOutBtn = document.getElementById('dtf-zoom-out');
    const zoomFitBtn = document.getElementById('dtf-zoom-fit');
    const zoomLevelSpan = document.getElementById('dtf-zoom-level');
    
    console.log('🔍 Setting up zoom controls:', {
        zoomInBtn: !!zoomInBtn,
        zoomOutBtn: !!zoomOutBtn,
        zoomFitBtn: !!zoomFitBtn,
        zoomLevelSpan: !!zoomLevelSpan
    });
    

    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            zoomImage(1.2);
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            zoomImage(0.8);
        });
    }
    
    if (zoomFitBtn) {
        zoomFitBtn.addEventListener('click', () => {
            fitImageToScreen();
        });
    }
    
    // Download button
    const downloadBtn = document.getElementById('dtf-download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            downloadEditedImage();
        });
    }
    
    // Edge sensitivity slider
    const sensitivitySlider = document.getElementById('dtf-edge-sensitivity');
    const sensitivityValue = document.getElementById('dtf-sensitivity-value');
    if (sensitivitySlider && sensitivityValue) {
        sensitivitySlider.addEventListener('input', (e) => {
            sensitivityValue.textContent = e.target.value;
        });
    }
    
    // Apply advanced removal button
    const applyAdvancedBtn = document.getElementById('dtf-apply-advanced');
    if (applyAdvancedBtn) {
        applyAdvancedBtn.addEventListener('click', removeBackgroundAdvanced);
    }
    
    // Color editor event listeners
    const closeColorEditorBtn = document.getElementById('dtf-close-color-editor');
    const cancelColorChangeBtn = document.getElementById('dtf-cancel-color-change');
    const applyColorChangeBtn = document.getElementById('dtf-apply-color-change');
    
    if (closeColorEditorBtn) {
        closeColorEditorBtn.addEventListener('click', closeColorEditor);
    }
    if (cancelColorChangeBtn) {
        cancelColorChangeBtn.addEventListener('click', closeColorEditor);
    }
    if (applyColorChangeBtn) {
        applyColorChangeBtn.addEventListener('click', applyColorChange);
    }
    
    // Color picker and input synchronization
    const colorPicker = document.getElementById('dtf-color-picker');
    const hexInput = document.getElementById('dtf-hex-input');
    const rgbRInput = document.getElementById('dtf-rgb-r');
    const rgbGInput = document.getElementById('dtf-rgb-g');
    const rgbBInput = document.getElementById('dtf-rgb-b');
    
    if (colorPicker) {
        colorPicker.addEventListener('input', syncColorInputs);
    }
    if (hexInput) {
        hexInput.addEventListener('input', syncColorFromHex);
    }
    if (rgbRInput || rgbGInput || rgbBInput) {
        [rgbRInput, rgbGInput, rgbBInput].forEach(input => {
            if (input) input.addEventListener('input', syncColorFromRGB);
        });
    }
    
    // Preview interactions
    const preview = document.getElementById('dtf-preview');
    if (preview) {
        preview.addEventListener('mousedown', startPan);
        preview.addEventListener('mousemove', pan);
        preview.addEventListener('mouseup', stopPan);
        // preview.addEventListener('wheel', handleZoom); // Disabled mouse scroll zoom
        preview.addEventListener('mouseleave', stopPan);
    }
}

// Check if Python backend is available
async function checkBackendStatus() {
    try {
        const backendUrl = getBackendUrl();
        console.log(`🔍 Checking backend status at ${backendUrl}/health...`);
        console.log('🔍 Current page URL:', window.location.href);
        console.log('🔍 Current origin:', window.location.origin);
        
        const response = await fetch(`${backendUrl}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors'
        });
        
        console.log('📡 Backend response status:', response.status);
        console.log('📡 Backend response ok:', response.ok);
        console.log('📡 Backend response headers:', [...response.headers.entries()]);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Python backend available:', data);
            updateBackendStatus(true, data);
            return true;
        } else {
            console.log('❌ Python backend not responding - status:', response.status);
            const errorText = await response.text();
            console.log('❌ Error response:', errorText);
            updateBackendStatus(false);
            return false;
        }
    } catch (error) {
        console.log('❌ Python backend unavailable:', error.message);
        console.log('❌ Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        updateBackendStatus(false);
        return false;
    }
}

// Update backend status display
function updateBackendStatus(available, data = null) {
    const statusElement = document.getElementById('dtf-backend-status');
    if (statusElement) {
        if (available && data) {
            statusElement.innerHTML = `
                <div class="dtf-status-success">
                    <span><i class="fas fa-server"></i> Python Backend: ${data.service}</span>
                    <span><i class="fas fa-tag"></i> Version: ${data.version}</span>
                    <span><i class="fas fa-check-circle"></i> Status: ${data.status}</span>
                </div>
            `;
        } else {
            statusElement.innerHTML = `
                <div class="dtf-status-error">
                    <span><i class="fas fa-exclamation-triangle"></i> Python Backend: Unavailable</span>
                    <span><i class="fas fa-tools"></i> Using Frontend Fallback</span>
                </div>
            `;
        }
    }
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 File selected:', file.name, file.type);
    
    try {
        // Load image
        const imageUrl = URL.createObjectURL(file);
        const img = new Image();
        
        img.onload = async () => {
            state.image = img;
            // Reset zoom and pan for new image
            state.zoom = 1;
            state.pan = { x: 0, y: 0 };
            updatePreview();
            updatePrintSize(img);
            
            // Extract colors using palette matching
            await extractColorsWithPalette(img);
            
            // Background removal is now optional - user must click the button manually
        };
        
        img.src = imageUrl;
        
    } catch (error) {
        console.error('❌ Error loading image:', error);
        showMessage('Error loading image. Please try again.', 'error');
    }
}

// Extract colors and match to palette
async function extractColorsWithPalette(img) {
    try {
        console.log('🎨 Extracting colors with palette matching...');
        showMessage('🔍 Analyzing image colors...', 'info');
        
        // Show loading animation in the color detection area
        showColorExtractionAnimation();
        
        // Convert image to blob for upload
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // Send to Python backend
        const formData = new FormData();
        formData.append('file', blob, 'image.png');
        formData.append('num_colors', '12');
        formData.append('min_percentage', '1.0');
        
        const backendUrl = getBackendUrl();
        console.log('📤 Sending image to Python backend for palette matching...');
        console.log(`📤 Backend URL: ${backendUrl}/extract-colors`);
        console.log('📤 FormData size:', formData.get('file').size, 'bytes');
        
        const response = await fetch(`${backendUrl}/extract-colors`, {
            method: 'POST',
            body: formData
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Backend error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📥 Palette matching result:', result);
        
        // Hide loading animation
        hideColorExtractionAnimation();
        
        if (result.success) {
            // Merge very similar detected colors (minor colors merge into the closest higher-percentage color)
            const merged = mergeSimilarDetectedColors(result.matches, 18); // threshold in RGB distance
            const reducedBy = (result.matches?.length || 0) - (merged.length || 0);
            
            // Assign unique IDs to each color
            state.colorMatches = merged.map((match, index) => ({
                ...match,
                uniqueId: `color_${Date.now()}_${index}`,
                originalRgb: match.detected_rgb ? [...match.detected_rgb] : null
            }));
            updateColorPalette();
            updateDetectedColors(merged.length, result.total_colors_detected);
            if (reducedBy > 0) {
                showMessage(`✅ Found ${merged.length} colors (merged ${reducedBy} similar)`, 'success');
            } else {
                showMessage(`✅ Found ${merged.length} colors!`, 'success');
            }
            
            // Update pricing when colors are extracted
            await updatePricingAfterColorExtraction();
        } else {
            throw new Error(result.error || 'Unknown error');
        }
        
    } catch (error) {
        console.error('❌ Palette matching failed:', error);
        // Hide loading animation on error
        hideColorExtractionAnimation();
        showMessage('Python backend unavailable, using frontend fallback', 'warning');
        
        // Fallback to basic color extraction
        await extractColorsFrontendFallback(img);
    }
}

// Frontend fallback for color extraction
async function extractColorsFrontendFallback(img) {
    console.log('🔄 Using frontend fallback for color extraction...');
    
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Simple color counting (basic fallback)
    const colorCounts = {};
    const totalPixels = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 10) * 10;
        const g = Math.round(data[i + 1] / 10) * 10;
        const b = Math.round(data[i + 2] / 10) * 10;
        
        if (r + g + b > 30 && r + g + b < 720) { // Filter out very light/dark
            const color = `${r},${g},${b}`;
            colorCounts[color] = (colorCounts[color] || 0) + 1;
        }
    }
    
    // Convert to matches format
    const matches = Object.entries(colorCounts)
        .map(([rgb, count]) => {
            const [r, g, b] = rgb.split(',').map(Number);
            const percentage = (count / totalPixels) * 100;
            return {
                detected_rgb: [r, g, b],
                detected_hex: rgbToHex(r, g, b),
                detected_percentage: percentage,
                matched_palette: null,
                similarity_score: null
            };
        })
        .filter(match => match.detected_percentage > 2)
        .sort((a, b) => b.detected_percentage - a.detected_percentage)
        .slice(0, 8);
    
    // Merge similar colors in fallback path as well
    const merged = mergeSimilarDetectedColors(matches, 18);
    
    // Assign unique IDs to each color
    state.colorMatches = merged.map((match, index) => ({
        ...match,
        uniqueId: `color_${Date.now()}_${index}`,
        originalRgb: match.detected_rgb ? [...match.detected_rgb] : null
    }));
    updateColorPalette();
    updateDetectedColors(0, state.colorMatches.length);
    showMessage('⚠️ Using basic frontend color detection', 'warning');
    
    // Update pricing when colors are extracted
    await updatePricingAfterColorExtraction();
}

// Update color palette display with new layout
function updateColorPalette() {
    const fetchedColorsContainer = document.getElementById('dtf-fetched-colors');
    
    if (!fetchedColorsContainer || !state.colorMatches) return;
    
    // Clear container
    fetchedColorsContainer.innerHTML = '';
    
    // Create fetched colors section
    console.log('🎨 Creating color palette with matches:', state.colorMatches);
    state.colorMatches.forEach((match, index) => {
        console.log(`🎨 Processing color ${index}:`, match);
        const fetchedColor = document.createElement('div');
        fetchedColor.className = 'dtf-fetched-color';
        fetchedColor.dataset.colorIndex = index;
        const titlePercentage = match.detected_percentage || match.percentage || 0;
        fetchedColor.title = `Click to change this color (${titlePercentage.toFixed(1)}%)`;
        
        const swatch = document.createElement('div');
        swatch.className = 'dtf-fetched-swatch';
        
        // Check if this is a transparent color
        if (match.detected_hex === 'transparent' || match.detected_hex === '#00000000') {
            // Show transparent pattern
            swatch.style.background = 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)';
            swatch.style.backgroundSize = '10px 10px';
            swatch.style.backgroundPosition = '0 0, 0 5px, 5px -5px, -5px 0px';
            swatch.style.border = '2px solid #ccc';
        } else {
            swatch.style.backgroundColor = match.detected_hex;
        }
        
                // Add color text
        const colorText = document.createElement('div');
        colorText.className = 'dtf-fetched-color-text';
        colorText.textContent = match.detected_hex === 'transparent' || match.detected_hex === '#00000000' ? 'Transparent' : match.detected_hex.toUpperCase();

        // Add percentage text
        const percentageText = document.createElement('div');
        percentageText.className = 'dtf-fetched-color-percentage';
        const percentage = match.detected_percentage || match.percentage || 0;
        percentageText.textContent = `${percentage.toFixed(1)}%`;

        fetchedColor.appendChild(swatch);
        fetchedColor.appendChild(colorText);
        fetchedColor.appendChild(percentageText);
        
        // Add click event to select this color for changing
        fetchedColor.addEventListener('click', () => {
            selectFetchedColor(index, match);
        });
        
        fetchedColorsContainer.appendChild(fetchedColor);
    });
}

// Select a fetched color for changing
function selectFetchedColor(index, match) {
    console.log('🎯 Fetched color clicked:', match.detected_hex, 'at index', index);
    
    // Store current selection
    state.selectedFetchedColor = { index, match };
    
    // Open the color editing popup
    openColorPopup(match);
}

// Create the palette grid








// Update detected colors count
function updateDetectedColors(matchedCount, totalCount) {
    // Show production summary
    showProductionSummary(matchedCount, totalCount);
}

// Show production summary (clean theme-aligned counter with subtle animation)
function showProductionSummary(matchedCount, totalCount) {
    const summaryContainer = document.getElementById('dtf-production-summary');
    if (!summaryContainer) return;
    
    const percent = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
    
    summaryContainer.innerHTML = `
        <div class="dtf-summary-chip">
            <span class="dtf-summary-label">Colors:</span>
            <span class="dtf-summary-count">${matchedCount}</span>
        </div>
    `;
}

// Remove background (simplified)
async function removeBackground() {
    if (!state.image) return;
    // Prevent duplicate removals: if background already removed, inform user
    const bgStatusEl = document.getElementById('dtf-bg-status');
    if (bgStatusEl && /removed/i.test(bgStatusEl.textContent || '')) {
        showMessage('✅ Background is already removed.', 'info');
        return;
    }
    
    try {
        console.log('🔄 Removing background with OpenCV...');
        showMessage('🔄 Removing background with OpenCV...', 'info');
        
        // Convert image to blob
        const canvas = document.createElement('canvas');
        canvas.width = state.image.width;
        canvas.height = state.image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(state.image, 0, 0);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // Send to Python backend for background removal
        const formData = new FormData();
        formData.append('file', blob, 'image.png');
        formData.append('method', 'rembg');
        formData.append('model', 'u2net');
        formData.append('post_process', 'false');
        
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/remove-background`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Backend error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Background removal result:', result);
        
        if (result.success) {
            // Load background-removed image
            const imgData = `data:image/png;base64,${result.image_base64}`;
            const newImg = new Image();
            
            newImg.onload = () => {
                state.image = newImg;
                updatePreview();
                
                // Update background status to removed
                updateBackgroundStatus('removed', {
                    confidence: 'high',
                    transparency_ratio: 0.8,
                    method: result.method || 'rembg'
                });
                
                // Automatically re-analyze colors after background removal
                setTimeout(() => {
                    extractColors();
                }, 300);

                showMessage('✅ Background removed successfully!', 'success');
            };
            
            newImg.src = imgData;
            
        } else {
            throw new Error(result.error || 'Background removal failed');
        }
        
    } catch (error) {
        console.error('❌ Background removal failed:', error);
        showMessage(`Background removal failed: ${error.message}`, 'error');
    } finally {
        // Hide loading animation
        const removeBgBtn = document.getElementById('dtf-remove-bg');
        hideBackgroundRemovalLoading(removeBgBtn);
    }
}

// Remove background with Remove.bg
async function removeBackgroundRemovebg() {
    if (!state.image) return;
    
    try {
        console.log('🤖 Removing background with Remove.bg...');
        showMessage('🤖 Removing background with Remove.bg API...', 'info');
        
        // Convert image to blob
        const canvas = document.createElement('canvas');
        canvas.width = state.image.width;
        canvas.height = state.image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(state.image, 0, 0);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // Create form data
        const formData = new FormData();
        formData.append('file', blob, 'image.png');
        
        // You can optionally pass an API key here
        // formData.append('api_key', 'your_deepai_api_key');
        
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/remove-background-removebg`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Remove.bg background removal failed');
        }
        
        // Convert base64 to image
        const img = new Image();
        img.onload = function() {
            // Update the image
            state.image = img;
            updateImageDisplay();
            
            // Show success message
            showMessage(`✅ Remove.bg background removal completed! Method: ${result.method}`, 'success');
            
            // Update background status
            updateBackgroundStatus('removed', {
                method: result.method,
                features: result.features
            });
            
            // Re-analyze colors after background removal
            setTimeout(() => {
                extractColors();
            }, 500);
        };
        
        img.src = `data:image/png;base64,${result.image_base64}`;
        
    } catch (error) {
        console.error('❌ Remove.bg background removal failed:', error);
        showMessage(`Remove.bg background removal failed: ${error.message}`, 'error');
    } finally {
        // Hide loading animation
        const removebgBtn = document.getElementById('dtf-remove-bg-removebg');
        hideBackgroundRemovalLoading(removebgBtn);
    }
}



// Advanced background removal with custom settings
async function removeBackgroundAdvanced() {
    if (!state.image) return;
    // Prevent duplicate removals for advanced path as well
    const bgStatusEl = document.getElementById('dtf-bg-status');
    if (bgStatusEl && /removed/i.test(bgStatusEl.textContent || '')) {
        showMessage('✅ Background is already removed.', 'info');
        return;
    }
    
    try {
        console.log('🔄 Advanced background removal...');
        showMessage('🔍 Advanced background removal in progress...', 'info');
        
        // Get advanced settings
        const preserveText = document.getElementById('dtf-preserve-text')?.checked ?? true;
        const edgeSensitivity = parseFloat(document.getElementById('dtf-edge-sensitivity')?.value ?? 0.1);
        
        console.log('⚙️ Settings:', { preserveText, edgeSensitivity });
        
        // Convert image to blob
        const canvas = document.createElement('canvas');
        canvas.width = state.image.width;
        canvas.height = state.image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(state.image, 0, 0);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // Send to advanced background removal endpoint
        const formData = new FormData();
        formData.append('file', blob, 'image.png');
        formData.append('preserve_text', preserveText);
        formData.append('edge_sensitivity', edgeSensitivity);
        
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/remove-background-advanced`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Load background-removed image
            const imgData = `data:image/png;base64,${result.image_base64}`;
            const newImg = new Image();
            
            newImg.onload = () => {
                state.image = newImg;
                updatePreview();
                
                // Update background status
                updateBackgroundStatus('removed', {
                    confidence: 'high',
                    transparency_ratio: 0.8,
                    method: 'advanced_removal',
                    settings: result.settings
                });
                
                // Automatically re-analyze colors after advanced removal
                setTimeout(() => {
                    extractColors();
                }, 300);

                showMessage(`✅ Advanced background removal completed! (${result.method})`, 'success');
            };
            
            newImg.src = imgData;
            
        } else {
            throw new Error(result.error || 'Advanced background removal failed');
        }
        
    } catch (error) {
        console.error('❌ Advanced background removal failed:', error);
        showMessage('Advanced background removal failed. Using original image.', 'error');
    }
}

// Update print size calculations
function updatePrintSize(img) {
    const widthInch = (img.width / state.ppi).toFixed(2);
    const heightInch = (img.height / state.ppi).toFixed(2);
    const widthMm = (widthInch * 25.4).toFixed(1);
    const heightMm = (heightInch * 25.4).toFixed(1);
    
    // Update display
    const dimensionsElement = document.getElementById('dtf-dimensions');
    if (dimensionsElement) {
        dimensionsElement.innerHTML = `
            <div class="dtf-dimension-item">
                <span class="dtf-label">Pixels:</span>
                <span class="dtf-value">${img.width} × ${img.height} px</span>
            </div>
            <div class="dtf-dimension-item">
                <span class="dtf-label">Print Size:</span>
                <span class="dtf-value">${widthInch}" × ${heightInch}" (${widthMm} × ${heightMm} mm)</span>
            </div>
        `;
    }
    
    // Update resize inputs
    const widthInput = document.getElementById('dtf-resize-width');
    const heightInput = document.getElementById('dtf-resize-height');
    if (widthInput) widthInput.value = widthInch;
    if (heightInput) heightInput.value = heightInch;
    // Cache aspect ratio
    state.originalAspect = img.width / img.height;
}

// Handle PPI change
function handlePPIChange(event) {
    const newPPI = parseInt(event.target.value) || 300;
    state.ppi = newPPI;
    
    if (state.image) {
        updatePrintSize(state.image);
    }
}

// Update width/height inputs from current image and selected units
function updateSizeInputsFromImage() {
    if (!state.image) return;
    const widthIn = state.image.width / state.ppi;
    const heightIn = state.image.height / state.ppi;
    let w = widthIn, h = heightIn;
    if (state.sizeUnits === 'mm') { w = widthIn * 25.4; h = heightIn * 25.4; }
    if (state.sizeUnits === 'px') { w = state.image.width; h = state.image.height; }
    const wEl = document.getElementById('dtf-size-width');
    const hEl = document.getElementById('dtf-size-height');
    if (wEl) wEl.value = Number(w.toFixed(2));
    if (hEl) hEl.value = Number(h.toFixed(2));
}

function onSizeFieldChanged(changed) {
    if (!state.aspectLocked || !state.originalAspect) return;
    const wEl = document.getElementById('dtf-size-width');
    const hEl = document.getElementById('dtf-size-height');
    if (!wEl || !hEl) return;
    const wVal = parseFloat(wEl.value) || 0;
    const hVal = parseFloat(hEl.value) || 0;
    if (changed === 'width') {
        if (state.sizeUnits === 'px') {
            hEl.value = Math.max(0.1, (wVal / state.originalAspect)).toFixed(2);
        } else {
            // convert to inches then compute
            const wIn = state.sizeUnits === 'mm' ? wVal / 25.4 : wVal;
            const hIn = wIn / state.originalAspect;
            hEl.value = Number((state.sizeUnits === 'mm' ? hIn * 25.4 : hIn).toFixed(2));
        }
    } else {
        if (state.sizeUnits === 'px') {
            wEl.value = Math.max(0.1, (hVal * state.originalAspect)).toFixed(2);
        } else {
            const hIn = state.sizeUnits === 'mm' ? hVal / 25.4 : hVal;
            const wIn = hIn * state.originalAspect;
            wEl.value = Number((state.sizeUnits === 'mm' ? wIn * 25.4 : wIn).toFixed(2));
        }
    }
}

// Apply size change by resampling the image to new pixel dimensions
async function applyNewSizeToImage() {
    if (!state.image) return;
    const wEl = document.getElementById('dtf-size-width');
    const hEl = document.getElementById('dtf-size-height');
    const units = document.getElementById('dtf-size-units')?.value || 'in';
    let w = parseFloat(wEl?.value) || 0;
    let h = parseFloat(hEl?.value) || 0;
    if (w <= 0 || h <= 0) { showMessage('Enter a valid size.', 'warning'); return; }
    
    // Convert to pixels
    if (units === 'in') { w = w * state.ppi; h = h * state.ppi; }
    if (units === 'mm') { w = (w / 25.4) * state.ppi; h = (h / 25.4) * state.ppi; }
    const newW = Math.max(1, Math.round(w));
    const newH = Math.max(1, Math.round(h));
    
    // Draw into canvas to resample
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = newW;
    canvas.height = newH;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(state.image, 0, 0, newW, newH);
    
    // Create new Image
    const dataUrl = canvas.toDataURL('image/png');
    const newImg = new Image();
    await new Promise(res => { newImg.onload = () => res(); newImg.src = dataUrl; });
    state.image = newImg;
    state.zoom = 1; state.pan = { x: 0, y: 0 };
    updatePreview();
    updatePrintSize(newImg);
    showMessage('✅ Size updated.', 'success');
}

// Update preview
function updatePreview() {
    const preview = document.getElementById('dtf-preview');
    if (!preview || !state.image) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = preview.clientWidth;
    canvas.height = preview.clientHeight;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw checkerboard background
    drawCheckerboard(ctx, canvas.width, canvas.height);
    
    // Calculate image position and size
    const imgAspect = state.image.width / state.image.height;
    const canvasAspect = canvas.width / canvas.height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imgAspect > canvasAspect) {
        drawWidth = canvas.width * 0.8;
        drawHeight = drawWidth / imgAspect;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = (canvas.height - drawHeight) / 2;
    } else {
        drawHeight = canvas.height * 0.8;
        drawWidth = drawHeight * imgAspect;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = (canvas.height - drawHeight) / 2;
    }
    
    // Apply zoom and pan
    const scaledWidth = drawWidth * state.zoom;
    const scaledHeight = drawHeight * state.zoom;
    const scaledX = drawX + state.pan.x;
    const scaledY = drawY + state.pan.y;
    
    // Draw image
    ctx.drawImage(state.image, scaledX, scaledY, scaledWidth, scaledHeight);
    
    // Replace preview content
    preview.innerHTML = '';
    preview.appendChild(canvas);
}

// Draw checkerboard background
function drawCheckerboard(ctx, width, height) {
    const size = 20;
    const colors = ['#f0f0f0', '#e0e0e0'];
    
    for (let y = 0; y < height; y += size) {
        for (let x = 0; x < width; x += size) {
            const colorIndex = ((x / size) + (y / size)) % 2;
            ctx.fillStyle = colors[colorIndex];
            ctx.fillRect(x, y, size, size);
        }
    }
}

// Mouse interaction functions for pan and zoom
function startPan(e) {
    state.isDragging = true;
    state.lastMousePos = { x: e.clientX, y: e.clientY };
    e.preventDefault();
}

function pan(e) {
    if (!state.isDragging) return;
    
    const deltaX = e.clientX - state.lastMousePos.x;
    const deltaY = e.clientY - state.lastMousePos.y;
    
    state.pan.x += deltaX;
    state.pan.y += deltaY;
    
    state.lastMousePos = { x: e.clientX, y: e.clientY };
    
    updateImageDisplay();
    e.preventDefault();
}

function stopPan() {
    state.isDragging = false;
}

function handleZoom(e) {
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    state.zoom *= zoomFactor;
    
    // Clamp zoom between 0.1 and 5
    state.zoom = Math.max(0.1, Math.min(5, state.zoom));
    
    updateImageDisplay();
}

// Update UI
function updateUI() {
    // Update file input label with enhanced styling
    const fileInput = document.getElementById('dtf-file-input');
    const fileLabel = document.getElementById('dtf-file-label');
    if (fileInput && fileLabel) {
        const fileName = fileInput.files[0]?.name;
        if (fileName) {
            fileLabel.innerHTML = `
                <i class="fas fa-check-circle"></i>
                ${fileName}
            `;
            fileLabel.className = 'dtf-file-label dtf-file-label-success';
        } else {
            fileLabel.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                Choose Image File
            `;
            fileLabel.className = 'dtf-file-label';
        }
    }
}

// Show message
function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('dtf-messages');
    if (!messageContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `dtf-message dtf-${type}`;
    messageElement.textContent = message;
    
    messageContainer.appendChild(messageElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 5000);
}

// Utility functions
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Update background status display
function updateBackgroundStatus(status, details = {}) {
    const statusElement = document.getElementById('dtf-bg-status');
    const detailsElement = document.getElementById('dtf-bg-details');
    const detailsTextElement = document.getElementById('dtf-bg-details-text');
    
    if (statusElement) {
        statusElement.textContent = status === 'removed' ? 'Background Removed' : 'Background Present';
        statusElement.className = status === 'removed' ? 'dtf-value dtf-success' : 'dtf-value dtf-warning';
    }
    
    if (detailsElement && detailsTextElement && Object.keys(details).length > 0) {
        detailsTextElement.textContent = `${details.method || 'Unknown'} - ${details.features || 'Standard'}`;
        detailsElement.style.display = 'block';
    }
}

// Update image display in the preview area
function updateImageDisplay() {
    console.log('🖼️ updateImageDisplay called');
    const preview = document.getElementById('dtf-preview');
    if (!preview) {
        console.log('❌ Preview element not found');
        return;
    }
    if (!state.image) {
        console.log('❌ No image in state');
        return;
    }
    
    console.log('✅ Preview and image found, updating display');
    console.log('📏 Image dimensions:', state.image.width, 'x', state.image.height);
    
    // Clear the preview
    preview.innerHTML = '';
    
        // Create img element for the image
    const img = document.createElement('img');
    img.src = state.image.src;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.style.cursor = 'grab';
    img.style.transition = 'transform 0.1s ease';
    
    // Add checkerboard background to show transparency
    preview.style.backgroundImage = `
        linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
        linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
        linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
    `;
    preview.style.backgroundSize = '20px 20px';
    preview.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
    
    // Apply zoom and pan transforms
    img.style.transform = `scale(${state.zoom}) translate(${state.pan.x}px, ${state.pan.y}px)`;
    
    // Add the image to preview
    preview.appendChild(img);
    
    // Update zoom level display
    updateZoomLevel();
    
    // Enable download button
    updateDownloadButton();
    
    console.log('🖼️ Image added to preview with zoom support');
    
    // Update dimensions display
    updatePrintSize(state.image);
}

// Simple extractColors function for compatibility
function extractColors() {
    if (state.image) {
        extractColorsWithPalette(state.image);
    }
}

// Color editing functions
function openColorEditor(colorData) {
    currentEditingColor = colorData;
    
    // Store original image data for potential rollback
    if (state.image && !originalImageData) {
        originalImageData = getImageDataFromCanvas();
    }
    
    // Update the color editor UI
    const colorPreview = document.getElementById('dtf-current-color-preview');
    const hexDisplay = document.getElementById('dtf-current-color-hex');
    const rgbDisplay = document.getElementById('dtf-current-color-rgb');
    const colorPicker = document.getElementById('dtf-color-picker');
    const hexInput = document.getElementById('dtf-hex-input');
    const rgbRInput = document.getElementById('dtf-rgb-r');
    const rgbGInput = document.getElementById('dtf-rgb-g');
    const rgbBInput = document.getElementById('dtf-rgb-b');
    
    if (colorPreview) colorPreview.style.backgroundColor = colorData.hex;
    if (hexDisplay) hexDisplay.textContent = colorData.hex;
    if (rgbDisplay) rgbDisplay.textContent = `RGB(${colorData.rgb.r}, ${colorData.rgb.g}, ${colorData.rgb.b})`;
    if (colorPicker) colorPicker.value = colorData.hex;
    if (hexInput) hexInput.value = colorData.hex;
    if (rgbRInput) rgbRInput.value = colorData.rgb.r;
    if (rgbGInput) rgbGInput.value = colorData.rgb.g;
    if (rgbBInput) rgbBInput.value = colorData.rgb.b;
    
    // Show the color editor
    const colorEditor = document.getElementById('dtf-color-editor');
    if (colorEditor) {
        colorEditor.style.display = 'flex';
    }
}

function closeColorEditor() {
    const colorEditor = document.getElementById('dtf-color-editor');
    if (colorEditor) {
        colorEditor.style.display = 'none';
    }
    currentEditingColor = null;
}

function syncColorInputs() {
    const colorPicker = document.getElementById('dtf-color-picker');
    const hexInput = document.getElementById('dtf-hex-input');
    const rgbRInput = document.getElementById('dtf-rgb-r');
    const rgbGInput = document.getElementById('dtf-rgb-g');
    const rgbBInput = document.getElementById('dtf-rgb-b');
    
    if (!colorPicker) return;
    
    const hex = colorPicker.value;
    const rgb = hexToRgb(hex);
    
    if (hexInput) hexInput.value = hex;
    if (rgbRInput) rgbRInput.value = rgb.r;
    if (rgbGInput) rgbGInput.value = rgb.g;
    if (rgbBInput) rgbBInput.value = rgb.b;
    
    // Update preview
    updateColorPreview(hex);
}

function syncColorFromHex() {
    const hexInput = document.getElementById('dtf-hex-input');
    const colorPicker = document.getElementById('dtf-color-picker');
    const rgbRInput = document.getElementById('dtf-rgb-r');
    const rgbGInput = document.getElementById('dtf-rgb-g');
    const rgbBInput = document.getElementById('dtf-rgb-b');
    
    if (!hexInput) return;
    
    let hex = hexInput.value;
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    
    if (isValidHex(hex)) {
        const rgb = hexToRgb(hex);
        if (colorPicker) colorPicker.value = hex;
        if (rgbRInput) rgbRInput.value = rgb.r;
        if (rgbGInput) rgbGInput.value = rgb.g;
        if (rgbBInput) rgbBInput.value = rgb.b;
        updateColorPreview(hex);
    }
}

function syncColorFromRGB() {
    const rgbRInput = document.getElementById('dtf-rgb-r');
    const rgbGInput = document.getElementById('dtf-rgb-g');
    const rgbBInput = document.getElementById('dtf-rgb-b');
    const colorPicker = document.getElementById('dtf-color-picker');
    const hexInput = document.getElementById('dtf-hex-input');
    
    if (!rgbRInput || !rgbGInput || !rgbBInput) return;
    
    const r = parseInt(rgbRInput.value) || 0;
    const g = parseInt(rgbGInput.value) || 0;
    const b = parseInt(rgbBInput.value) || 0;
    
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        const hex = rgbToHex(r, g, b);
        if (colorPicker) colorPicker.value = hex;
        if (hexInput) hexInput.value = hex;
        updateColorPreview(hex);
    }
}

function updateColorPreview(hex) {
    const colorPreview = document.getElementById('dtf-current-color-preview');
    if (colorPreview) {
        colorPreview.style.backgroundColor = hex;
    }
}

function applyColorChange() {
    if (!currentEditingColor || !state.image) {
        closeColorEditor();
        return;
    }
    
    const colorPicker = document.getElementById('dtf-color-picker');
    if (!colorPicker) return;
    
    const newHex = colorPicker.value;
    const newRgb = hexToRgb(newHex);
    
    // Replace the color in the image
    replaceColorInImage(currentEditingColor.rgb, newRgb);
    
    // Update the color in the palette
    updateColorInPalette(currentEditingColor, newHex, newRgb);
    
    // Update the image display
    updateImageDisplay();
    
    // Show success message
    showMessage(`✅ Color changed from ${currentEditingColor.hex} to ${newHex}`, 'success');
    
    // Close the editor
    closeColorEditor();
}

// Replace color using Python backend
async function replaceColorViaBackend(oldRgb, newRgb) {
    console.log('🎨 replaceColorViaBackend called with:', {
        oldRgb: oldRgb,
        newRgb: newRgb
    });
    
    if (!state.image) {
        console.log('❌ No image to replace colors in');
        return;
    }
    
    console.log('✅ Image found, size:', state.image.width, 'x', state.image.height);
    
    try {
        // Convert current image to blob
        console.log('🖼️ Creating canvas from image...');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = state.image.width;
        canvas.height = state.image.height;
        ctx.drawImage(state.image, 0, 0);
        console.log('✅ Canvas created and image drawn');
        
        console.log('📦 Converting canvas to blob...');
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        console.log('✅ Blob created, size:', blob.size, 'bytes');
        
        // Create form data
        console.log('📝 Creating form data...');
        const formData = new FormData();
        formData.append('file', blob, 'image.png');
        // Use current RGB values for color replacement (the actual current color in the image)
        formData.append('old_r', oldRgb[0]);
        formData.append('old_g', oldRgb[1]);
        formData.append('old_b', oldRgb[2]);
        formData.append('new_r', newRgb.r);
        formData.append('new_g', newRgb.g);
        formData.append('new_b', newRgb.b);
        formData.append('tolerance', 50);
        // Send unique color ID
        const colorId = state.selectedFetchedColor?.match?.uniqueId || '';
        formData.append('color_id', colorId);
        console.log('🆔 Sending color ID to backend:', colorId);
        console.log('✅ Form data created with values:', {
            old_r: oldRgb[0],
            old_g: oldRgb[1],
            old_b: oldRgb[2],
            new_r: newRgb.r,
            new_g: newRgb.g,
            new_b: newRgb.b,
            tolerance: 30
        });
        
        // Call Python backend
        const backendUrl = getBackendUrl();
        console.log('📡 Sending request to backend...');
        const response = await fetch(`${backendUrl}/replace-color`, {
            method: 'POST',
            body: formData
        });
        
        console.log('📡 Backend response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Backend error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        
        console.log('📄 Parsing response JSON...');
        const result = await response.json();
        console.log('✅ Response parsed:', result);
        
        if (result.success) {
            console.log(`✅ Backend replaced ${result.pixels_changed} pixels`);
            
            if (result.pixels_changed > 0) {
                // Update image with result
                console.log('🖼️ Creating new image from base64...');
                console.log('📊 Base64 length:', result.image_base64.length);
                
                const newImg = new Image();
                newImg.crossOrigin = 'anonymous';
                newImg.onload = function() {
                    console.log('✅ New image loaded successfully');
                    console.log('📏 New image dimensions:', newImg.width, 'x', newImg.height);
                    console.log('📏 Old image dimensions:', state.image ? state.image.width + 'x' + state.image.height : 'none');
                    console.log('🖼️ New image src length:', newImg.src.length);
                    console.log('🖼️ Base64 data preview:', newImg.src.substring(0, 100) + '...');
                    
                    // Update the state image
                    state.image = newImg;
                    console.log('🔄 State image updated');
                    
                    // Update the color data in the match
                    if (state.selectedFetchedColor?.match) {
                        state.selectedFetchedColor.match.detected_rgb = [newRgb.r, newRgb.g, newRgb.b];
                        state.selectedFetchedColor.match.detected_hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
                    }
                    console.log('📝 Color updated in match data');
                    
                    // Force update the display
                    console.log('🖼️ Calling updateImageDisplay...');
                    updateImageDisplay();
                    console.log('✅ updateImageDisplay called');
                    
                    if (result.pixels_changed > 0) {
                        showMessage(`✅ Color replaced successfully! ${result.pixels_changed} pixels changed`, 'success');
                    } else {
                        showMessage(`ℹ️ Color replacement completed - no pixels needed to be changed (already correct color)`, 'info');
                    }
                };
                newImg.onerror = function(error) {
                    console.error('❌ Failed to load new image from base64:', error);
                    showMessage('❌ Failed to load updated image', 'error');
                };
                newImg.src = `data:image/png;base64,${result.image_base64}`;
            } else {
                console.log('⚠️ No pixels were changed');
                
                // Check if the old and new colors are the same
                const currentColor = state.selectedFetchedColor?.match?.detected_rgb;
                if (currentColor && currentColor[0] === newRgb.r && currentColor[1] === newRgb.g && currentColor[2] === newRgb.b) {
                    showMessage(`ℹ️ No change needed - you selected the same color.`, 'info');
                } else {
                    showMessage(`⚠️ No pixels changed. The selected color might not match exactly. Try a different color or increase tolerance.`, 'warning');
                }
            }
        } else {
            throw new Error(result.message || 'Color replacement failed');
        }
        
    } catch (error) {
        console.error('❌ Backend color replacement failed:', error);
        showMessage(`❌ Color replacement failed: ${error.message}`, 'error');
    }
}

function replaceColorInImage(oldRgb, newRgb) {
    if (!state.image) {
        console.log('❌ No image to replace colors in');
        return;
    }
    
    console.log('🎨 Replacing colors in image:', {
        oldRgb: oldRgb,
        newRgb: newRgb,
        imageSize: `${state.image.width}x${state.image.height}`,
        changeHistory: state.colorChangeHistory
    });
    
    // Create a canvas to work with the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = state.image.width;
    canvas.height = state.image.height;
    
    // Draw the current image
    ctx.drawImage(state.image, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Replace colors with tolerance
    const tolerance = 30; // Color matching tolerance
    let pixelsChanged = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if this pixel matches the old color (with tolerance)
        if (Math.abs(r - oldRgb[0]) <= tolerance &&
            Math.abs(g - oldRgb[1]) <= tolerance &&
            Math.abs(b - oldRgb[2]) <= tolerance) {
            
            // Check if this pixel was already changed in a previous operation
            let wasAlreadyChanged = false;
            for (const change of state.colorChangeHistory) {
                const changeTolerance = 30;
                if (Math.abs(r - change.newRgb.r) <= changeTolerance &&
                    Math.abs(g - change.newRgb.g) <= changeTolerance &&
                    Math.abs(b - change.newRgb.b) <= changeTolerance) {
                    wasAlreadyChanged = true;
                    break;
                }
            }
            
            // Only replace if this pixel wasn't already changed
            if (!wasAlreadyChanged) {
                // Replace with new color
                data[i] = newRgb.r;
                data[i + 1] = newRgb.g;
                data[i + 2] = newRgb.b;
                pixelsChanged++;
            }
        }
    }
    
    // Record this color change in history
    state.colorChangeHistory.push({
        oldRgb: oldRgb,
        newRgb: newRgb,
        timestamp: Date.now()
    });
    
    console.log(`✅ Changed ${pixelsChanged} pixels`);
    console.log('📝 Color change history updated:', state.colorChangeHistory);
    
    // Update the color change history display
    updateColorChangeHistoryDisplay();
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
    
    // Create new image from canvas
    const newImg = new Image();
    newImg.onload = function() {
        state.image = newImg;
        console.log('🖼️ Image updated successfully');
        // Update the image display in the preview
        updateImageDisplay();
    };
    newImg.src = canvas.toDataURL('image/png');
}

// Function to reset color change history
function resetColorChangeHistory() {
    state.colorChangeHistory = [];
    console.log('🔄 Color change history reset');
    showMessage('Color change history reset', 'info');
    updateColorChangeHistoryDisplay();
}

// Function to get color change history info
function getColorChangeHistory() {
    return state.colorChangeHistory;
}

// Function to update color change history display
function updateColorChangeHistoryDisplay() {
    const historyContainer = document.getElementById('color-change-history');
    if (!historyContainer) return;
    
    if (state.colorChangeHistory.length === 0) {
        historyContainer.innerHTML = '<div class="history-empty">No color changes yet</div>';
        return;
    }
    
    let html = '<div class="history-header">Color Changes:</div>';
    state.colorChangeHistory.forEach((change, index) => {
        const oldColor = `rgb(${change.oldRgb[0]}, ${change.oldRgb[1]}, ${change.oldRgb[2]})`;
        const newColor = `rgb(${change.newRgb.r}, ${change.newRgb.g}, ${change.newRgb.b})`;
        html += `
            <div class="history-item">
                <span class="history-index">${index + 1}.</span>
                <span class="history-old" style="background-color: ${oldColor}"></span>
                <span class="history-arrow">→</span>
                <span class="history-new" style="background-color: ${newColor}"></span>
            </div>
        `;
    });
    
    html += '<button onclick="resetColorChangeHistory()" class="history-reset-btn">Reset History</button>';
    historyContainer.innerHTML = html;
}

// Test function to check backend directly
async function testBackendDirectly() {
    const testResult = document.getElementById('test-result');
    testResult.innerHTML = 'Testing backend...';
    
    try {
        // Create a simple test image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;
        
        // Draw a red square
        ctx.fillStyle = 'rgb(255, 0, 0)';
        ctx.fillRect(0, 0, 100, 100);
        
        // Convert to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // Create form data
        const formData = new FormData();
        formData.append('file', blob, 'test.png');
        formData.append('old_r', 255);
        formData.append('old_g', 0);
        formData.append('old_b', 0);
        formData.append('new_r', 0);
        formData.append('new_g', 255);
        formData.append('new_b', 0);
        formData.append('tolerance', 50);
        
        console.log('🧪 Testing backend directly...');
        
        // Call backend
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/replace-color`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success && result.pixels_changed > 0) {
            testResult.innerHTML = `✅ Backend test successful! Changed ${result.pixels_changed} pixels`;
            console.log('✅ Backend test result:', result);
            
            // Update the main image with the result
            const newImg = new Image();
            newImg.onload = function() {
                state.image = newImg;
                updateImageDisplay();
                testResult.innerHTML += '<br>✅ Image updated in preview!';
            };
            newImg.src = `data:image/png;base64,${result.image_base64}`;
        } else {
            testResult.innerHTML = `❌ Backend test failed: ${result.message || 'No pixels changed'}`;
            console.error('❌ Backend test failed:', result);
        }
        
    } catch (error) {
        testResult.innerHTML = `❌ Backend test error: ${error.message}`;
        console.error('❌ Backend test error:', error);
    }
}

// Color Popup Functions
function openColorPopup(colorMatch) {
    console.log('🎨 Opening color popup for:', colorMatch.detected_hex);
    
    currentPopupColor = colorMatch;
    selectedPaletteColor = null;
    
    // Update preview box
    const previewBox = document.getElementById('color-preview-box');
    if (previewBox) {
        previewBox.style.backgroundColor = colorMatch.detected_hex;
    }
    
    // Update hex and RGB values
    const hexInput = document.getElementById('color-hex-input');
    const rgbInput = document.getElementById('color-rgb-input');
    
    if (hexInput) {
        hexInput.value = colorMatch.detected_hex;
    }
    
    if (rgbInput) {
        const rgb = colorMatch.detected_rgb;
        rgbInput.value = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
    
    // Create color palette
    createPopupColorPalette();
    
    // Show popup
    const popup = document.getElementById('color-edit-popup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

function closeColorPopup() {
    console.log('🎨 Closing color popup');
    
    const popup = document.getElementById('color-edit-popup');
    if (popup) {
        popup.style.display = 'none';
    }
    
    currentPopupColor = null;
    selectedPaletteColor = null;
}

function createPopupColorPalette() {
    const paletteGrid = document.getElementById('color-palette-grid');
    if (!paletteGrid) return;
    
    paletteGrid.innerHTML = '';
    
    POPUP_COLOR_PALETTE.forEach((color, index) => {
        const colorElement = document.createElement('div');
        colorElement.className = 'palette-color';
        
        // Handle transparent color specially
        if (color.isTransparent) {
            colorElement.style.background = 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)';
            colorElement.style.backgroundSize = '10px 10px';
            colorElement.style.backgroundPosition = '0 0, 0 5px, 5px -5px, -5px 0px';
            colorElement.style.border = '2px solid #ccc';
        } else {
            colorElement.style.backgroundColor = color.hex;
        }
        
        colorElement.title = color.name;
        colorElement.dataset.colorIndex = index;
        
        // Check if this color matches the current color
        if (isColorMatch(color, currentPopupColor)) {
            colorElement.classList.add('selected');
            selectedPaletteColor = color;
        }
        
        colorElement.addEventListener('click', () => {
            selectPopupPaletteColor(color, index);
        });
        
        paletteGrid.appendChild(colorElement);
    });
}

function isColorMatch(paletteColor, detectedColor) {
    if (!detectedColor) return false;
    
    const detectedHex = detectedColor.detected_hex.toLowerCase();
    const paletteHex = paletteColor.hex.toLowerCase();
    
    return detectedHex === paletteHex;
}

function selectPopupPaletteColor(color, index) {
    console.log('🎨 Palette color selected:', color.name, color.hex);
    
    // Remove previous selection
    document.querySelectorAll('.palette-color').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked color
    const selectedElement = document.querySelector(`[data-color-index="${index}"]`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }
    
    selectedPaletteColor = color;
    
    // Update preview
    updatePopupPreview(color);
}

function updatePopupPreview(color) {
    const previewBox = document.getElementById('color-preview-box');
    const hexInput = document.getElementById('color-hex-input');
    const rgbInput = document.getElementById('color-rgb-input');
    
    if (previewBox) {
        previewBox.style.backgroundColor = color.hex;
    }
    
    if (hexInput) {
        hexInput.value = color.hex;
    }
    
    if (rgbInput) {
        rgbInput.value = `rgb(${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]})`;
    }
}

async function saveColorChange() {
    if (!currentPopupColor || !selectedPaletteColor) {
        showMessage('Please select a new color from the palette', 'warning');
        return;
    }
    
    if (isColorMatch(selectedPaletteColor, currentPopupColor)) {
        showMessage('No color change detected', 'info');
        closeColorPopup();
        return;
    }
    
    console.log('💾 Saving color change:', {
        from: currentPopupColor.detected_hex,
        to: selectedPaletteColor.hex
    });
    
    try {
        // Show loading state
        const saveButton = document.querySelector('.btn-primary');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
        }
        
        // Replace color using backend
        const oldRgb = currentPopupColor.detected_rgb;
        const newRgb = {
            r: selectedPaletteColor.rgb[0],
            g: selectedPaletteColor.rgb[1],
            b: selectedPaletteColor.rgb[2]
        };
        
        // Special handling for transparent color
        if (selectedPaletteColor.isTransparent) {
            console.log('🔍 Making color transparent...');
            showMessage('Making selected color transparent...', 'info');
        }
        
        await replaceColorViaBackend(oldRgb, newRgb);
        
        // Update the fetched color display
        const fetchedColorElement = document.querySelector(`[data-color-index="${state.selectedFetchedColor.index}"] .dtf-fetched-swatch`);
        if (fetchedColorElement) {
            if (selectedPaletteColor.isTransparent) {
                // Show transparent pattern
                fetchedColorElement.style.background = 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)';
                fetchedColorElement.style.backgroundSize = '10px 10px';
                fetchedColorElement.style.backgroundPosition = '0 0, 0 5px, 5px -5px, -5px 0px';
                fetchedColorElement.style.border = '2px solid #ccc';
            } else {
                fetchedColorElement.style.backgroundColor = selectedPaletteColor.hex;
                fetchedColorElement.style.background = '';
                fetchedColorElement.style.border = '';
            }
        }
        
        // Also update the color text display
        const colorTextElement = document.querySelector(`[data-color-index="${state.selectedFetchedColor.index}"] .dtf-fetched-color-text`);
        if (colorTextElement) {
            if (selectedPaletteColor.isTransparent) {
                colorTextElement.textContent = 'Transparent';
            } else {
                colorTextElement.textContent = selectedPaletteColor.hex.toUpperCase();
            }
        }
        
        // Update the percentage display (keep the same percentage)
        const percentageElement = document.querySelector(`[data-color-index="${state.selectedFetchedColor.index}"] .dtf-fetched-color-percentage`);
        if (percentageElement) {
            // Keep the original percentage since we're just changing the color, not the coverage
            const originalPercentage = state.selectedFetchedColor.match.detected_percentage || state.selectedFetchedColor.match.percentage || 0;
            percentageElement.textContent = `${originalPercentage.toFixed(1)}%`;
        }
        
        // Update the color data in state
        state.colorMatches[state.selectedFetchedColor.index].detected_hex = selectedPaletteColor.hex;
        state.colorMatches[state.selectedFetchedColor.index].detected_rgb = selectedPaletteColor.rgb;
        
        // Refresh the color display to show updated colors
        updateColorPalette();
        
        showMessage(`✅ Color changed to ${selectedPaletteColor.name}`, 'success');
        closeColorPopup();
        
    } catch (error) {
        console.error('❌ Error saving color change:', error);
        showMessage('Failed to save color change', 'error');
    } finally {
        // Reset button state
        const saveButton = document.querySelector('.btn-primary');
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
        }
    }
}

function updateColorInPalette(oldColor, newHex, newRgb) {
    // Find and update the color in the palette display
    const colorItems = document.querySelectorAll('.dtf-color-item');
    colorItems.forEach(item => {
        const colorSwatch = item.querySelector('.dtf-color-swatch');
        if (colorSwatch && colorSwatch.style.backgroundColor === oldColor.hex) {
            // Update the color swatch
            colorSwatch.style.backgroundColor = newHex;
            
            // Update the color info
            const colorInfo = item.querySelector('.dtf-color-info');
            if (colorInfo) {
                const hexSpan = colorInfo.querySelector('.dtf-color-hex');
                const rgbSpan = colorInfo.querySelector('.dtf-color-rgb');
                if (hexSpan) hexSpan.textContent = newHex;
                if (rgbSpan) rgbSpan.textContent = `RGB(${newRgb.r}, ${newRgb.g}, ${newRgb.b})`;
            }
        }
    });
}

// Utility functions
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function isValidHex(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex);
}

// Merge very similar detected colors to reduce duplication
// threshold: maximum Euclidean distance in RGB to consider colors similar (default 18)
function mergeSimilarDetectedColors(matches, threshold = 18) {
    try {
        if (!Array.isArray(matches) || matches.length === 0) return [];
        
        // Normalize items with rgb and percentage
        const normalizeRgb = (m) => {
            if (Array.isArray(m.detected_rgb)) return m.detected_rgb;
            if (m.rgb && Array.isArray(m.rgb)) return m.rgb;
            const hex = m.detected_hex || m.hex;
            if (hex) {
                const { r, g, b } = hexToRgb(hex);
                return [r, g, b];
            }
            return null;
        };
        
        const items = matches.map((m, i) => ({
            original: m,
            idx: i,
            rgb: normalizeRgb(m),
            pct: (m.detected_percentage ?? m.percentage ?? 0) * 1.0
        })).filter(it => Array.isArray(it.rgb));
        
        // Sort by percentage desc so minor colors merge into dominant ones
        items.sort((a, b) => b.pct - a.pct);
        
        const kept = [];
        for (const item of items) {
            let merged = false;
            for (const k of kept) {
                const d = Math.hypot(item.rgb[0]-k.rgb[0], item.rgb[1]-k.rgb[1], item.rgb[2]-k.rgb[2]);
                if (d <= threshold) {
                    // merge percentage into kept; keep kept's color values
                    k.pct += item.pct;
                    merged = true;
                    break;
                }
            }
            if (!merged) kept.push({ ...item });
        }
        
        // Normalize percentages to 100 and rebuild objects
        const total = kept.reduce((s, k) => s + (k.pct || 0), 0) || 1;
        const out = kept.map(k => {
            const pct = (k.pct / total) * 100;
            const hex = k.original.detected_hex || k.original.hex || rgbToHex(k.rgb[0], k.rgb[1], k.rgb[2]);
            const rgbArr = k.original.detected_rgb || k.original.rgb || k.rgb;
            return {
                ...k.original,
                detected_hex: hex,
                detected_rgb: rgbArr,
                detected_percentage: pct
            };
        }).sort((a, b) => (b.detected_percentage||0) - (a.detected_percentage||0));
        
        return out;
    } catch (e) {
        console.warn('mergeSimilarDetectedColors error:', e);
        return matches;
    }
}

function getImageDataFromCanvas() {
    if (!state.image) return null;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = state.image.width;
    canvas.height = state.image.height;
    ctx.drawImage(state.image, 0, 0);
    
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    init();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeColorEditor();
        }
    });
});

// Color extraction animation functions
function showColorExtractionAnimation() {
    const colorDetectionArea = document.querySelector('.dtf-fetched-colors-section');
    if (!colorDetectionArea) return;
    
    // Create animation container if it doesn't exist
    let animationContainer = colorDetectionArea.querySelector('.color-extraction-animation');
    if (!animationContainer) {
        animationContainer = document.createElement('div');
        animationContainer.className = 'color-extraction-animation';
        animationContainer.innerHTML = `
            <div class="animation-content">
                <div class="spinner"></div>
                <div class="animation-text">Analyzing colors...</div>
                <div class="animation-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        colorDetectionArea.appendChild(animationContainer);
    }
    
    // Show animation
    animationContainer.style.display = 'flex';
    animationContainer.style.opacity = '1';
}

function hideColorExtractionAnimation() {
    const animationContainer = document.querySelector('.color-extraction-animation');
    if (animationContainer) {
        animationContainer.style.opacity = '0';
        setTimeout(() => {
            animationContainer.style.display = 'none';
        }, 300);
    }
}

// Background removal loading animation functions
function showBackgroundRemovalLoading(button) {
    if (!button) return;
    
    // Store original text
    button.dataset.originalText = button.textContent;
    
    // Add loading class and update text
    button.classList.add('loading');
    button.textContent = 'Processing...';
    button.disabled = true;
    
    // Disable all other background removal buttons
    const allBgButtons = document.querySelectorAll('.dtf-bg-controls button');
    allBgButtons.forEach(btn => {
        if (btn !== button) {
            btn.disabled = true;
        }
    });
}

function hideBackgroundRemovalLoading(button) {
    if (!button) return;
    
    // Remove loading class and restore original text
    button.classList.remove('loading');
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    
    // Re-enable all background removal buttons
    const allBgButtons = document.querySelectorAll('.dtf-bg-controls button');
    allBgButtons.forEach(btn => {
        btn.disabled = false;
    });
}

// Zoom functionality - integrated with existing state system
function zoomImage(factor) {
    console.log('🔍 Zoom button clicked, factor:', factor);
    state.zoom *= factor;
    state.zoom = Math.max(0.1, Math.min(5, state.zoom)); // Limit zoom between 10% and 500%
    console.log('🔍 New zoom level:', state.zoom);
    updateImageDisplay();
    updateZoomLevel();
}

function fitImageToScreen() {
    console.log('📐 Fit to screen button clicked');
    if (!state.image) {
        console.log('❌ No image to fit');
        return;
    }
    
    const preview = document.getElementById('dtf-preview');
    if (!preview) {
        console.log('❌ Preview element not found');
        return;
    }
    
    // Calculate scale to fit image in preview
    const previewWidth = preview.clientWidth;
    const previewHeight = preview.clientHeight;
    const imageWidth = state.image.width;
    const imageHeight = state.image.height;
    
    const scaleX = (previewWidth - 20) / imageWidth;
    const scaleY = (previewHeight - 20) / imageHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    
    // Calculate centered position
    const scaledImgWidth = imageWidth * scale;
    const scaledImgHeight = imageHeight * scale;
    
    // Center the image in the preview
    const centerX = (previewWidth - scaledImgWidth) / 2;
    const centerY = (previewHeight - scaledImgHeight) / 2;
    
    console.log('📐 Calculated fit scale:', scale, 'Center:', { x: centerX, y: centerY });
    state.zoom = scale;
    state.pan = { x: centerX, y: centerY }; // Center the image
    
    updateImageDisplay();
    updateZoomLevel();
}

function updateZoomLevel() {
    const zoomLevelSpan = document.getElementById('dtf-zoom-level');
    if (zoomLevelSpan) {
        zoomLevelSpan.textContent = `${Math.round(state.zoom * 100)}%`;
    }
}

function updateDownloadButton() {
    const downloadBtn = document.getElementById('dtf-download-btn');
    if (downloadBtn) {
        if (state.image) {
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
        } else {
            downloadBtn.disabled = true;
            downloadBtn.style.opacity = '0.6';
        }
    }
}

// Download functionality
function downloadEditedImage() {
    console.log('💾 Download button clicked');
    
    if (!state.image) {
        console.log('❌ No image to download');
        showMessage('Please upload an image first!', 'error');
        return;
    }
    
    try {
        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match the image
        canvas.width = state.image.width;
        canvas.height = state.image.height;
        
        // Draw the image on the canvas
        ctx.drawImage(state.image, 0, 0);
        
        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('❌ Failed to create blob from canvas');
                showMessage('Failed to prepare image for download', 'error');
                return;
            }
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `dtf-customized-${timestamp}.png`;
            link.download = filename;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            console.log('✅ Image downloaded successfully:', filename);
            showMessage(`Image downloaded as ${filename}`, 'success');
            
        }, 'image/png', 1.0); // High quality PNG
        
    } catch (error) {
        console.error('❌ Download failed:', error);
        showMessage('Failed to download image. Please try again.', 'error');
    }
}

// Mouse wheel zoom support - DISABLED
// document.addEventListener('DOMContentLoaded', () => {
//     const preview = document.getElementById('dtf-preview');
//     if (preview) {
//         preview.addEventListener('wheel', (e) => {
//             e.preventDefault();
//             const factor = e.deltaY > 0 ? 0.9 : 1.1;
//             zoomImage(factor);
//         });
//     }
// });

// ============================================================================
// DYNAMIC PRICING SYSTEM
// ============================================================================

// Global pricing state
const pricingState = {
    baseProductPrice: 0.00, // Will be set from Shopify product price
    quantity: 24,
    positions: [], // Each position will have unique ID, colorCount, isNewDesign, etc.
    totalPrice: 0.00,
    isCalculating: false
};

// Duplicate functions removed - using fresh pricing system

async function updatePositionData(positionId, data) {
    if (positionTracker[positionId]) {
        Object.assign(positionTracker[positionId], data);
        
        // Calculate price asynchronously
        try {
            positionTracker[positionId].calculatedPrice = await calculatePositionPrice(positionTracker[positionId]);
            console.log(`✅ Updated position ${positionId}:`, positionTracker[positionId]);
            updatePriceBreakdown();
        } catch (error) {
            console.error(`❌ Failed to update position ${positionId}:`, error);
        }
    }
}

// Duplicate functions removed - using fresh pricing system

// Update positions pricing with tracker data
async function updatePositionsPricingWithTracker() {
    console.log('🔄 updatePositionsPricingWithTracker called');
    const positionsContainer = document.getElementById('sp-pricing-positions');
    if (!positionsContainer) {
        console.log('❌ sp-pricing-positions container not found');
        return;
    }
    
    const activePositions = positionTracker.getPositionsByStatus('active');
    const positionsWithDesigns = activePositions.filter(pos => pos.colorCount > 0);
    console.log('📊 Active positions from tracker:', activePositions.length, activePositions);
    console.log('📊 Positions with designs:', positionsWithDesigns.length, positionsWithDesigns);
    
    if (positionsWithDesigns.length === 0) {
        console.log('⚠️ No positions with designs found, showing placeholder message');
        positionsContainer.innerHTML = '<div class="dtf-pricing-note">Upload designs to your selected positions to see pricing</div>';
        return;
    }
    
    // Show loading state
    positionsContainer.innerHTML = '<div class="dtf-pricing-note"><i class="fas fa-spinner fa-spin"></i> Calculating prices...</div>';
    
    let positionsHTML = '';
    let totalDesignCost = 0;
    let totalSetupCost = 0;
    
    // Calculate prices for all positions with designs
    for (const position of positionsWithDesigns) {
        try {
            const positionPrice = await calculatePositionPriceFromTracker(position);
            const setupCost = position.isNewDesign ? 25.0 : 0.0;
            
            totalDesignCost += positionPrice;
            totalSetupCost += setupCost;
            
            positionsHTML += `
                <div class="dtf-position-pricing" data-position-id="${position.id}">
                    <div class="dtf-position-name">${position.positionName}</div>
                    <div class="dtf-position-details">
                        <span class="dtf-position-colors">${position.colorCount} colors</span>
                        <span class="dtf-position-price">$${positionPrice.toFixed(2)}</span>
                        ${setupCost > 0 ? `<span class="dtf-setup-cost">+ $${setupCost.toFixed(2)} setup</span>` : ''}
                    </div>
                    <div class="dtf-position-actions">
                        <button onclick="editPositionById('${position.id}')" class="dtf-edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="removePositionById('${position.id}')" class="dtf-remove-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error(`❌ Error calculating price for ${position.positionName}:`, error);
            // Add position with error state
            positionsHTML += `
                <div class="dtf-position-pricing" data-position-id="${position.id}">
                    <div class="dtf-position-name">${position.positionName}</div>
                    <div class="dtf-position-details">
                        <span class="dtf-position-colors">${position.colorCount} colors</span>
                        <span class="dtf-position-price" style="color: #dc3545;">Error calculating price</span>
                    </div>
                    <div class="dtf-position-actions">
                        <button onclick="editPositionById('${position.id}')" class="dtf-edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="removePositionById('${position.id}')" class="dtf-remove-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    // Add summary row
    if (totalDesignCost > 0) {
        positionsHTML += `
            <div class="dtf-pricing-summary">
                <div class="dtf-summary-row">
                    <span class="dtf-summary-label">Design Printing Total:</span>
                    <span class="dtf-summary-value">$${totalDesignCost.toFixed(2)}</span>
                </div>
                ${totalSetupCost > 0 ? `
                <div class="dtf-summary-row">
                    <span class="dtf-summary-label">Setup Charges:</span>
                    <span class="dtf-summary-value">$${totalSetupCost.toFixed(2)}</span>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    positionsContainer.innerHTML = positionsHTML;
    pricingState.totalPositionPrice = totalDesignCost + totalSetupCost;
}

// Calculate position price from tracker data
async function calculatePositionPriceFromTracker(position) {
    try {
        // Call the real backend pricing API for this single position
        const response = await fetch(`${getBackendUrl()}/pricing/calculate-dynamic-pricing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                base_product_price: pricingState.baseProductPrice,
                positions: [{
                    position_id: position.id,
                    position_name: position.positionName,
                    design_file_url: position.designFileUrl || '',
                    color_count: position.colorCount,
                    design_hash: position.designHash,
                    is_new_design: position.isNewDesign,
                    timestamp: position.timestamp,
                    status: position.status
                }],
                quantity: pricingState.quantity,
                customer_email: 'test@example.com'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.pricing_breakdown.position_costs.length > 0) {
                const positionCost = data.pricing_breakdown.position_costs[0];
                return positionCost.color_cost; // Return only the color cost, setup handled separately
            }
        }
        
        console.warn(`⚠️ Backend pricing failed for ${position.positionName}, using fallback`);
        // Fallback calculation
        const basePricePerColor = 2.22; // From Excel data
        return position.colorCount * basePricePerColor * pricingState.quantity;
        
    } catch (error) {
        console.error(`❌ Error calculating price for ${position.positionName}:`, error);
        // Fallback calculation
        const basePricePerColor = 2.22; // From Excel data
        return position.colorCount * basePricePerColor * pricingState.quantity;
    }
}

// Edit position by ID
function editPositionById(positionId) {
    const position = positionTracker.getPosition(positionId);
    if (position) {
        console.log(`✏️ Editing position: ${position.positionName} (${positionId})`);
        // Open customizer for this position
        // This will be implemented based on your customizer system
    }
}

// Remove position by ID
async function removePositionById(positionId) {
    const position = positionTracker.getPosition(positionId);
    if (position) {
        console.log(`🗑️ Removing position: ${position.positionName} (${positionId})`);
        positionTracker.removePosition(positionId);
        syncPricingStateWithTracker();
        await updatePricingDisplayWithTracker();
    }
}

// Debug function to find price elements
function debugPriceElements() {
    console.log('🔍 Debugging Shopify Price Elements:');
    
    // Check global product object
    if (typeof product !== 'undefined') {
        console.log('✅ Global product object found:', product);
        if (product.price) {
            console.log('💰 Product price from object:', product.price / 100);
        }
    } else {
        console.log('❌ No global product object found');
    }
    
    // Check common price selectors (prioritizing Shopify product block)
    const selectors = [
        '.product-block.product-block-price [data-product-price]',  // Primary target - specific span
        '.product-block.product-block-price',  // Secondary target - container
        '.product-block-price',
        '[data-product-price]',  // Direct data attribute
        '.product-price',
        '.price',
        '.variant-price',
        '.selected-variant-price',
        '.product-single__price',
        '.product__price',
        '.price-item',
        '.money'
    ];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`✅ Found ${elements.length} element(s) with selector: ${selector}`);
            elements.forEach((el, index) => {
                console.log(`  [${index}] Text: "${el.textContent}" | HTML: ${el.outerHTML}`);
            });
        }
    });
    
    // Look for any element containing price-like text
    const allElements = document.querySelectorAll('*');
    const priceElements = Array.from(allElements).filter(el => {
        const text = el.textContent || '';
        return /^\$?\d+\.?\d*$/.test(text.trim()) && 
               parseFloat(text.replace(/[^0-9.]/g, '')) > 0 && 
               parseFloat(text.replace(/[^0-9.]/g, '')) < 10000;
    });
    
    console.log(`🔍 Found ${priceElements.length} elements with price-like text:`);
    priceElements.forEach((el, index) => {
        console.log(`  [${index}] "${el.textContent}" | Class: "${el.className}" | Tag: ${el.tagName}`);
    });
}

// Get product price from Shopify
function getShopifyProductPrice() {
    try {
        console.log('🔍 getShopifyProductPrice called');
        
        // Debug mode - uncomment to see what elements are available
        // debugPriceElements();
        
        // Try to get price from Shopify product object
        if (typeof product !== 'undefined' && product.price) {
            console.log('💰 Using product object price:', product.price / 100);
            return product.price / 100; // Convert from cents to dollars
        }
        
        // Try to get price from Shopify product block (primary method)
        const productBlockPrice = document.querySelector('.product-block.product-block-price');
        if (productBlockPrice) {
            console.log('✅ Found product-block-price element:', productBlockPrice);
            console.log('✅ Product block innerHTML:', productBlockPrice.innerHTML);
            
            // Look for the specific price span with data-product-price attribute
            const priceSpan = productBlockPrice.querySelector('[data-product-price]');
            if (priceSpan) {
                const priceText = priceSpan.textContent || priceSpan.innerText;
                const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
                console.log('💰 Price span found - text:', priceText, 'parsed:', price);
                if (!isNaN(price) && price > 0) {
                    console.log('💰 Found price in data-product-price span:', price, 'from text:', priceText);
                    return price;
                }
            } else {
                console.log('⚠️ No data-product-price span found in product block');
            }
            
            // Fallback: Look for price in any child elements
            const childElements = productBlockPrice.querySelectorAll('*');
            console.log('🔍 Checking', childElements.length, 'child elements for price');
            for (const child of childElements) {
                const priceText = child.textContent || child.innerText;
                const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
                if (!isNaN(price) && price > 0 && price < 10000) {
                    console.log('💰 Found price in child element:', price, 'from text:', priceText, 'element:', child);
                    return price;
                }
            }
            console.log('⚠️ No price found in any child elements');
            
            // If no child elements have price, check the main element
            const priceText = productBlockPrice.textContent || productBlockPrice.innerText;
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            console.log('🔍 Checking main element - text:', priceText, 'parsed:', price);
            if (!isNaN(price) && price > 0) {
                console.log('💰 Found price in main element:', price, 'from text:', priceText);
                return price;
            }
            console.log('⚠️ No price found in main element');
        }
        
        // Fallback: Try to get price from data-product-price attribute directly
        const dataPriceElement = document.querySelector('[data-product-price]');
        if (dataPriceElement) {
            const priceText = dataPriceElement.textContent || dataPriceElement.innerText;
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            console.log('🔍 Found data-product-price element - text:', priceText, 'parsed:', price);
            if (!isNaN(price) && price > 0) {
                console.log('💰 Found price from data-product-price attribute:', price, 'from text:', priceText);
                return price;
            }
        } else {
            console.log('⚠️ No data-product-price element found');
        }
        
        // Fallback: Try to get price from other common selectors
        const priceElement = document.querySelector('.product-price, .price');
        if (priceElement) {
            const priceText = priceElement.textContent || priceElement.innerText;
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            console.log('🔍 Found fallback price element - text:', priceText, 'parsed:', price);
            if (!isNaN(price)) {
                console.log('💰 Found price from fallback selector:', price);
                return price;
            }
        } else {
            console.log('⚠️ No fallback price element found');
        }
        
        // Try to get price from variant selector
        const variantPriceElement = document.querySelector('.variant-price, .selected-variant-price');
        if (variantPriceElement) {
            const priceText = variantPriceElement.textContent || variantPriceElement.innerText;
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            if (!isNaN(price)) {
                return price;
            }
        }
        
        // Fallback: look for any element with price-like content
        const priceElements = document.querySelectorAll('[class*="price"], [class*="cost"], [class*="amount"]');
        for (const element of priceElements) {
            const priceText = element.textContent || element.innerText;
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            if (!isNaN(price) && price > 0 && price < 10000) { // Reasonable price range
                return price;
            }
        }
        
        console.warn('⚠️ Could not find product price, using default $15.00');
        console.log('💰 All price detection methods failed, returning default');
        return 15.00; // Default fallback
        
    } catch (error) {
        console.error('❌ Error getting product price:', error);
        console.log('💰 Returning default fallback price: 15.00');
        return 15.00; // Default fallback
    }
}

// Make getShopifyProductPrice available globally
window.getShopifyProductPrice = getShopifyProductPrice;

// Make DTF customizer functions available globally
window.initializeDTFCustomizerMain = initializeDTFCustomizer;
window.setupEventListeners = setupEventListeners;
window.handleFileUpload = handleFileUpload;

// Make position tracker functions available globally
// Missing functions that Shopify snippet needs
async function updatePricingDisplayWithTracker() {
    console.log('🔄 updatePricingDisplayWithTracker called');
    await updatePositionsPricingWithTracker();
}

function syncPricingStateWithTracker() {
    console.log('🔄 syncPricingStateWithTracker called');
    // Sync the old pricingState with the new positionTracker
    if (window.pricingState && positionTracker) {
        const allPositions = positionTracker.getAllPositions();
        window.pricingState.positions = allPositions.map(pos => ({
            positionName: pos.positionName,
            colorCount: pos.colorCount,
            isNewDesign: pos.isNewDesign,
            designHash: pos.designHash
        }));
        console.log('✅ Synced pricingState with tracker:', window.pricingState.positions.length, 'positions');
    }
}

// Make functions globally available
window.positionTracker = positionTracker;
window.addPositionToPricing = addPositionToPricing;
window.removePositionFromPricing = removePositionFromPricing;
window.editPositionById = editPositionById;
window.removePositionById = removePositionById;
window.updatePricingDisplayWithTracker = updatePricingDisplayWithTracker;
window.syncPricingStateWithTracker = syncPricingStateWithTracker;
window.calculateRealPricing = calculateRealPricing;
window.getShopifyProductPrice = getShopifyProductPrice;
window.updatePricingDisplay = updatePricingDisplay;
window.generateDesignHash = generateDesignHash;

// Initialize pricing system
function initializePricing() {
    console.log('💰 Initializing Dynamic Pricing System');
    console.log('💰 Initial pricingState.positions:', pricingState.positions);
    console.log('💰 Initial pricingState.positions.length:', pricingState.positions.length);
    
    // Get product price from Shopify
    pricingState.baseProductPrice = getShopifyProductPrice();
    console.log('💰 Product price from Shopify:', pricingState.baseProductPrice);
    
    // Set up quantity input listener
    const quantityInput = document.getElementById('sp-quantity-input');
    if (quantityInput) {
        quantityInput.addEventListener('input', handleQuantityChange);
        quantityInput.addEventListener('change', handleQuantityChange);
    }
    
    // Note: New design checkboxes are now in the customizer popup, not position popup
    
    // Initialize quantity note
    updateQuantityNote(pricingState.quantity);
    
    // Initial pricing calculation
    updatePricingDisplay();
    
    // Force show the old price breakdown section
    const oldPriceBreakdown = document.getElementById('sp-price-breakdown');
    if (oldPriceBreakdown) {
        oldPriceBreakdown.style.display = 'block';
        console.log('💰 Forced old price breakdown section to be visible');
    }
}

// Handle quantity change
function handleQuantityChange(event) {
    const newQuantity = parseInt(event.target.value);
    if (newQuantity < 1) {
        event.target.value = 1;
        pricingState.quantity = 1;
    } else {
        pricingState.quantity = newQuantity;
    }
    
    console.log('📊 Quantity changed to:', pricingState.quantity);
    
    // Update quantity note to show pricing tier
    updateQuantityNote(pricingState.quantity);
    
    // Recalculate pricing with real-time updates
    calculateRealPricing();
}

// Update quantity note to show current pricing tier
function updateQuantityNote(quantity) {
    const quantityNote = document.getElementById('sp-quantity-note');
    if (quantityNote) {
        if (quantity >= 1 && quantity <= 23) {
            quantityNote.textContent = `${quantity} pieces = 12-23 pricing tier`;
            quantityNote.style.color = '#5a6fd8';
            quantityNote.style.fontWeight = '600';
        } else if (quantity >= 24 && quantity <= 47) {
            quantityNote.textContent = `${quantity} pieces = 24-47 pricing tier`;
            quantityNote.style.color = '#28a745';
            quantityNote.style.fontWeight = '600';
        } else if (quantity >= 48 && quantity <= 95) {
            quantityNote.textContent = `${quantity} pieces = 48-95 pricing tier`;
            quantityNote.style.color = '#28a745';
            quantityNote.style.fontWeight = '600';
        } else if (quantity >= 96) {
            quantityNote.textContent = `${quantity} pieces = 96+ pricing tier`;
            quantityNote.style.color = '#28a745';
            quantityNote.style.fontWeight = '600';
        } else {
            quantityNote.textContent = '1-23 pieces = 12-23 pricing';
            quantityNote.style.color = '#666';
            quantityNote.style.fontWeight = '500';
        }
    }
}

// Handle new design checkbox change
function handleNewDesignCheckboxChange(event) {
    const checkbox = event.target;
    const position = checkbox.getAttribute('data-position');
    const isNewDesign = checkbox.checked;
    
    console.log(`🆕 New design checkbox changed for ${position}:`, isNewDesign);
    
    // Update pricing state for the current position
    if (pricingState.positions && pricingState.positions.length > 0) {
        // Find the position that matches the current editing position
        const currentPosition = getCurrentPosition();
        if (currentPosition) {
            const positionIndex = pricingState.positions.findIndex(p => p.positionName === currentPosition);
            if (positionIndex !== -1) {
                pricingState.positions[positionIndex].isNewDesign = isNewDesign;
                console.log(`🆕 Updated pricing state for ${currentPosition}:`, isNewDesign);
            }
        }
    }
    
    // Recalculate pricing
    calculateRealPricing();
}

// Update pricing display
function updatePricingDisplay() {
    console.log('💰 Updating pricing display');
    console.log('💰 pricingState.positions.length:', pricingState.positions.length);
    
    // Update base price
    const basePriceElement = document.getElementById('sp-base-price');
    if (basePriceElement) {
        // If base price is 0, try to fetch it from Shopify
        if (pricingState.baseProductPrice === 0) {
            const shopifyPrice = getShopifyProductPrice();
            if (shopifyPrice > 0) {
                pricingState.baseProductPrice = shopifyPrice;
            }
        }
        basePriceElement.textContent = `$${pricingState.baseProductPrice.toFixed(2)}`;
        console.log('💰 Updated base price:', pricingState.baseProductPrice);
    } else {
        console.log('⚠️ Base price element not found');
    }
    
    // Update positions pricing (consolidated view)
    updatePositionsPricing();
    
    // Update total price
    updateTotalPrice();
    
    // Always show pricing section
    const pricingSection = document.getElementById('sp-price-breakdown');
    if (pricingSection) {
        pricingSection.style.display = 'block';
        console.log('💰 Showing old price breakdown section');
    } else {
        console.log('⚠️ Old price breakdown section not found');
    }
    
    // Trigger real-time pricing calculation if positions exist
    if (pricingState.positions.length > 0) {
        calculateRealPricing();
    } else {
        // If no positions, show empty state
        const positionsContainer = document.getElementById('sp-pricing-positions');
        if (positionsContainer) {
            positionsContainer.innerHTML = '<div class="dtf-pricing-note">Select positions and upload designs to see pricing</div>';
        }
    }
}

// Duplicate function removed - using fresh pricing system

// Duplicate function removed - using fresh pricing system

// Make calculatePositionPrice available globally
window.calculatePositionPrice = calculatePositionPrice;

// Update total price
function updateTotalPrice() {
    const totalPriceElement = document.getElementById('sp-total-price');
    if (!totalPriceElement) return;
    
    const totalPositionPrice = pricingState.totalPositionPrice || 0;
    const totalPrice = pricingState.baseProductPrice + totalPositionPrice;
    
    totalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
    pricingState.totalPrice = totalPrice;
    
    console.log('💰 Total price updated:', totalPrice);
}

// Add position to pricing calculation using position tracker
function addPositionToPricing(positionName, colorCount, isNewDesign = false, designFileUrl = '') {
    console.log('➕ Adding position to pricing:', positionName, colorCount, isNewDesign);
    
    // Get the actual new design checkbox state from the customizer
    const newDesignCheckbox = document.querySelector('#dtf-new-design-checkbox');
    console.log('🔍 Looking for checkbox:', newDesignCheckbox);
    
    if (newDesignCheckbox) {
        isNewDesign = newDesignCheckbox.checked;
        console.log(`🆕 New design checkbox found and checked: ${isNewDesign} for ${positionName}`);
    } else {
        // If checkbox doesn't exist (customizer not open), default to false
        isNewDesign = false;
        console.log(`🆕 No checkbox found, defaulting to false for ${positionName}`);
    }
    
    // Remove existing position with same name from both systems
    pricingState.positions = pricingState.positions.filter(p => p.positionName !== positionName);
    
    // Remove from position tracker
    const existingPositions = positionTracker.getAllPositions();
    existingPositions.forEach(pos => {
        if (pos.positionName === positionName) {
            positionTracker.removePosition(pos.id);
        }
    });
    
    // Add new position to tracker
    const positionId = positionTracker.addPosition(positionName, colorCount, isNewDesign, designFileUrl);
    const position = positionTracker.getPosition(positionId);
    
    // Add to pricing state for backward compatibility
    pricingState.positions.push(position);
    
    // Update pricing display
    updatePricingDisplay();
    
    return positionId;
}

// Remove position from pricing calculation
function removePositionFromPricing(positionName) {
    console.log('➖ Removing position from pricing:', positionName);
    
    // Remove from pricing state
    pricingState.positions = pricingState.positions.filter(p => p.positionName !== positionName);
    
    // Remove from position tracker
    const existingPositions = positionTracker.getAllPositions();
    existingPositions.forEach(pos => {
        if (pos.positionName === positionName) {
            positionTracker.removePosition(pos.id);
        }
    });
    
    // Update new design checkboxes
    updateNewDesignCheckboxes();
    
    // Update pricing display
    updatePricingDisplay();
}

// Update new design checkboxes
function updateNewDesignCheckboxes() {
    const newDesignSection = document.getElementById('dtf-new-design-section');
    const newDesignOptions = document.getElementById('dtf-new-design-options');
    
    if (!newDesignSection || !newDesignOptions) return;
    
    if (pricingState.positions.length === 0) {
        newDesignSection.style.display = 'none';
        return;
    }
    
    newDesignSection.style.display = 'block';
    
    let checkboxesHTML = '';
    pricingState.positions.forEach((position, index) => {
        checkboxesHTML += `
            <div class="dtf-new-design-option">
                <input type="checkbox" 
                       id="new-design-${index}" 
                       ${position.isNewDesign ? 'checked' : ''}
                       onchange="toggleNewDesign(${index}, this.checked)">
                <label for="new-design-${index}">
                    ${position.positionName} - $25 setup charge
                </label>
            </div>
        `;
    });
    
    newDesignOptions.innerHTML = checkboxesHTML;
}

// Toggle new design status
function toggleNewDesign(index, isNewDesign) {
    if (pricingState.positions[index]) {
        pricingState.positions[index].isNewDesign = isNewDesign;
        console.log('🔄 Toggled new design for:', pricingState.positions[index].positionName, isNewDesign);
        updatePricingDisplay();
    }
}

// Duplicate function removed - using fresh pricing system

// Update pricing after color extraction - Fresh Pricing System
async function updatePricingAfterColorExtraction() {
    console.log('🔄 Updating pricing after color extraction');
    
    // Get the current position from the customizer
    const currentPosition = getCurrentPosition();
    if (!currentPosition) {
        console.log('⚠️ No position selected, skipping pricing update');
        return;
    }
    
    // Get color count from extracted colors
    const colorCount = state.colorMatches ? state.colorMatches.length : 0;
    console.log(`🎨 Color count for pricing: ${colorCount}`);
    
    if (colorCount > 0) {
        // Check if this is a new design
        const newDesignCheckbox = document.getElementById('dtf-new-design-checkbox');
        const isNewDesign = newDesignCheckbox ? newDesignCheckbox.checked : false;
        console.log(`🎨 New design status: ${isNewDesign}`);
        
        // Update position data with new pricing system
        await updatePositionData(currentPosition, {
            colorCount: colorCount,
            isNewDesign: isNewDesign,
            finalImage: state.image ? state.image.src : null,
            positionName: currentPosition
        });
        
        console.log(`✅ Updated position ${currentPosition} with ${colorCount} colors, new design: ${isNewDesign}`);
    }
}

// Get current position from the customizer
function getCurrentPosition() {
    // Check if we're in a position-specific customizer using the global variable
    if (window.currentEditingPosition) {
        console.log('🎯 Found current editing position:', window.currentEditingPosition);
        return window.currentEditingPosition;
    }
    
    // Fallback: Check if we're in a position-specific customizer using DOM
    const positionElement = document.querySelector('.sp-position-option.selected');
    if (positionElement) {
        console.log('🎯 Found position element:', positionElement.dataset.position);
        return positionElement.dataset.position;
    }
    
    console.log('⚠️ No current editing position found');
    return null;
}

// Call backend API for real pricing calculation
async function calculateRealPricing() {
    if (pricingState.isCalculating) return;
    
    pricingState.isCalculating = true;
    console.log('🔄 Calculating real pricing via backend API');
    
    try {
        const allPositions = positionTracker.getAllPositions();
        console.log('🔄 calculateRealPricing - All positions from tracker:', allPositions.length, allPositions);
        
        const currentPricingState = window.pricingState || pricingState;
        const requestData = {
            base_product_price: currentPricingState.baseProductPrice,
            positions: allPositions.map(pos => ({
                position_id: pos.id,
                position_name: pos.positionName,
                design_file_url: pos.designFileUrl || '',
                color_count: pos.colorCount,
                design_hash: pos.designHash,
                is_new_design: pos.isNewDesign,
                timestamp: pos.timestamp,
                status: pos.status
            })),
            quantity: currentPricingState.quantity,
            customer_email: 'test@example.com'
        };
        
        console.log('🔄 calculateRealPricing - Request data:', requestData);
        
        const response = await fetch(`${getBackendUrl()}/pricing/calculate-dynamic-pricing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🔄 calculateRealPricing - Backend response:', data);
        
        if (data.success) {
            console.log('✅ Real pricing calculated:', data.pricing_breakdown);
            console.log('✅ Position costs received:', data.pricing_breakdown.position_costs.length);
            await updatePricingWithBackendData(data.pricing_breakdown);
        } else {
            console.error('❌ Pricing calculation failed:', data);
            showMessage('Failed to calculate pricing. Using estimated pricing.', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Error calculating real pricing:', error);
        showMessage('Using estimated pricing. Backend unavailable.', 'warning');
    } finally {
        pricingState.isCalculating = false;
    }
}

// Update pricing with backend data
async function updatePricingWithBackendData(pricingBreakdown) {
    console.log('🔄 updatePricingWithBackendData called with:', pricingBreakdown);
    console.log('🔄 pricingState.positions:', pricingState.positions.length, pricingState.positions);
    console.log('🔄 positionTracker.getAllPositions():', positionTracker.getAllPositions().length, positionTracker.getAllPositions());
    console.log('🔄 window.pricingState:', window.pricingState);
    console.log('🔄 window.pricingState.positions:', window.pricingState ? window.pricingState.positions.length : 'undefined');
    
    // Update total price
    const totalPriceElement = document.getElementById('sp-total-price');
    if (totalPriceElement) {
        totalPriceElement.textContent = `$${pricingBreakdown.total_after_tax.toFixed(2)}`;
    }
    
    // Update cart total
    const cartTotalElement = document.getElementById('sp-cart-total');
    if (cartTotalElement) {
        cartTotalElement.textContent = `$${pricingBreakdown.total_after_tax.toFixed(2)}`;
    }
    
    // Update positions pricing - show all selected positions
    const positionsContainer = document.getElementById('sp-pricing-positions');
    if (positionsContainer) {
        let positionsHTML = '';
        let totalDesignCost = 0;
        let totalSetupCost = 0;
        
        // Show only positions that have been updated with designs (color count > 0)
        const currentPricingState = window.pricingState || pricingState;
        console.log('🔄 Current pricing state positions:', currentPricingState.positions);
        const positionsWithDesigns = currentPricingState.positions.filter(pos => pos.colorCount > 0);
        console.log('🔄 Positions with designs:', positionsWithDesigns);
        
        if (positionsWithDesigns && positionsWithDesigns.length > 0) {
            console.log('🔄 Using positions with designs for display:', positionsWithDesigns.length);
            
            // Process positions sequentially to handle async calculatePositionPrice
            for (let index = 0; index < positionsWithDesigns.length; index++) {
                const position = positionsWithDesigns[index];
                
                // Find corresponding backend data if available
                const backendData = pricingBreakdown.position_costs.find(p => p.position_name === position.positionName);
                
                let positionPrice = 0;
                let setupCost = 0;
                let colorCount = position.colorCount;
                let isNewDesign = position.isNewDesign;
                
                if (backendData) {
                    // Use backend calculated data
                    positionPrice = backendData.color_cost;
                    setupCost = backendData.is_new_design ? 25.0 : 0.0;
                    colorCount = backendData.color_count;
                    isNewDesign = backendData.is_new_design;
                } else {
                    // Use frontend estimated data
                    positionPrice = await calculatePositionPrice(position);
                    setupCost = position.isNewDesign ? 25.0 : 0.0;
                }
                
                totalDesignCost += positionPrice;
                totalSetupCost += setupCost;
                
                positionsHTML += `
                    <div class="dtf-position-pricing">
                        <div class="dtf-position-name">${position.positionName}</div>
                        <div class="dtf-position-details">
                            <span class="dtf-position-colors">${colorCount} colors</span>
                            <span class="dtf-position-price">$${positionPrice.toFixed(2)}</span>
                            ${setupCost > 0 ? `<span class="dtf-setup-cost">+ $${setupCost.toFixed(2)} setup</span>` : ''}
                        </div>
                    </div>
                `;
            }
            
            // Add summary row
            if (totalDesignCost > 0) {
                positionsHTML += `
                    <div class="dtf-pricing-summary">
                        <div class="dtf-summary-row">
                            <span class="dtf-summary-label">Design Printing Total:</span>
                            <span class="dtf-summary-value">$${totalDesignCost.toFixed(2)}</span>
                        </div>
                        ${totalSetupCost > 0 ? `
                        <div class="dtf-summary-row">
                            <span class="dtf-summary-label">Setup Charges:</span>
                            <span class="dtf-summary-value">$${totalSetupCost.toFixed(2)}</span>
                        </div>
                        ` : ''}
                    </div>
                `;
            }
        } else {
            console.log('⚠️ No positions with designs found, showing placeholder');
            console.log('⚠️ Total positions:', currentPricingState.positions ? currentPricingState.positions.length : 0);
            console.log('⚠️ Positions with designs:', positionsWithDesigns ? positionsWithDesigns.length : 0);
            positionsHTML = '<div class="dtf-pricing-note">Upload designs to your selected positions to see pricing</div>';
        }
        
        positionsContainer.innerHTML = positionsHTML;
    }
    
    pricingState.totalPrice = pricingBreakdown.total_after_tax;
    
}

// Update price breakdown with backend data
function updatePriceBreakdownWithBackendData(pricingBreakdown) {
    const summary = document.getElementById('sp-order-summary');
    const summaryContent = document.getElementById('sp-summary-content');
    
    if (!summary || !summaryContent) return;
    
    // Get pricing state
    const pricingState = window.pricingState || {
        baseProductPrice: 0,
        quantity: 24,
        positions: [],
        totalPositionPrice: 0,
        totalPrice: 0
    };
    
    let summaryHTML = '';
    
    // Add quantity input
    summaryHTML += `
      <div class="sp-quantity-section">
        <label for="sp-quantity-input" style="font-weight: 600; margin-bottom: 8px; display: block;">Quantity:</label>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <input type="number" id="sp-quantity-input" value="${pricingState.quantity}" min="1" 
                 style="width: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; text-align: center;">
          <span id="sp-quantity-note" style="font-size: 0.9rem; color: #6c757d;">1-23 pieces = 12-23 pricing</span>
        </div>
      </div>
    `;
    
    // Add base product price
    summaryHTML += `
      <div class="sp-summary-item">
        <span>Base Product Price</span>
        <span>$${pricingBreakdown.base_product_price.toFixed(2)}</span>
      </div>
    `;
    
    let totalDesignCost = 0;
    let totalSetupCost = 0;
    
    // Add each position with real pricing data
    pricingBreakdown.position_costs.forEach((posCost, index) => {
        const positionName = posCost.position_name;
        const position = window.POSITION_LABELS ? window.POSITION_LABELS[positionName] : { name: positionName };
        const data = window.positionData ? window.positionData[positionName] : null;
        const hasDesign = data && data.completed;
        
        totalDesignCost += posCost.color_cost;
        totalSetupCost += posCost.is_new_design ? 25.0 : 0.0;
        
        summaryHTML += `
            <div class="sp-summary-item">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="sp-summary-thumbnail">
                        ${hasDesign ? `
                            <img src="${data.thumbnail}" alt="${position.name} preview" class="sp-summary-thumbnail-img">
                            <div class="sp-summary-thumbnail-overlay">
                                <button onclick="viewFullImage('${positionName}')" title="View full image">
                                    <i class="fas fa-expand"></i>
                                </button>
                            </div>
                        ` : `
                            <div style="width: 100%; height: 100%; background: #f8f9fa; display: flex; align-items: center; justify-content: center; color: #6c757d;">
                                <i class="fas fa-upload"></i>
                            </div>
                        `}
                    </div>
                    <div class="sp-summary-details">
                        <div style="font-weight: 600; font-size: 1.1rem;">${position.name} Design</div>
                        <div style="font-size: 0.8rem; color: #6c757d; margin: 2px 0;">
                            ${posCost.color_count} colors - $${posCost.color_cost.toFixed(2)}
                        </div>
                        ${hasDesign ? `
                            <div style="font-size: 0.7rem; color: #999;">Saved: ${new Date(data.timestamp).toLocaleDateString()}</div>
                        ` : `
                            <div style="font-size: 0.7rem; color: #999;">Click to customize</div>
                        `}
                    </div>
                </div>
                <div class="sp-summary-price">
                    <span style="font-size: 1.2rem; font-weight: 600;">$${posCost.total_cost.toFixed(2)}</span>
                    ${posCost.is_new_design ? `<div style="font-size: 0.7rem; color: #28a745;">+ $25.00 setup</div>` : ''}
                </div>
            </div>
        `;
    });
    
    // Add design printing total
    if (totalDesignCost > 0) {
        summaryHTML += `
            <div class="sp-summary-item" style="border-top: 1px solid #e9ecef; padding-top: 10px; margin-top: 10px;">
                <span>Design Printing Total</span>
                <span>$${totalDesignCost.toFixed(2)}</span>
            </div>
        `;
    }
    
    // Add setup charges
    if (totalSetupCost > 0) {
        summaryHTML += `
            <div class="sp-summary-item">
                <span>Setup Charges</span>
                <span>$${totalSetupCost.toFixed(2)}</span>
            </div>
        `;
    }
    
    // Add total
    summaryHTML += `
        <div class="sp-summary-item" style="border-top: 2px solid #007bff; padding-top: 15px; margin-top: 15px; font-weight: 600; font-size: 1.2rem;">
            <span>Total</span>
            <span>$${pricingBreakdown.total_after_tax.toFixed(2)}</span>
        </div>
    `;
    
    // Add order info button if there are completed positions
    const completedPositions = window.positionData ? Object.keys(window.positionData).filter(pos => window.positionData[pos].completed) : [];
    if (completedPositions.length > 0) {
        summaryHTML += `
            <div class="sp-order-actions">
                <button class="sp-order-info-btn" onclick="showOrderInfo()">
                    <i class="fas fa-info-circle"></i> View Order Details
                </button>
            </div>
        `;
    }
    
    summaryContent.innerHTML = summaryHTML;
    
    // Set up quantity input listener
    const quantityInput = document.getElementById('sp-quantity-input');
    if (quantityInput) {
        quantityInput.addEventListener('input', handleQuantityChange);
        quantityInput.addEventListener('change', handleQuantityChange);
    }
}

// Initialize pricing when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the customizer to be fully loaded
    setTimeout(() => {
        initializePricing();
    }, 1000);
});

// Add to Cart functionality
async function addToCart() {
    console.log('🛒 Adding to cart...');
    
    if (pricingState.isCalculating) {
        showMessage('Please wait for pricing calculation to complete', 'warning');
        return;
    }
    
    if (pricingState.positions.length === 0) {
        showMessage('Please upload designs for at least one position', 'warning');
        return;
    }
    
    try {
        showMessage('Adding to cart...', 'info');
        
        // Create dynamic product data
        const productData = {
            base_product_price: pricingState.baseProductPrice,
            positions: pricingState.positions.map(pos => ({
                position_name: pos.positionName,
                design_file_url: pos.designFileUrl || '',
                color_count: pos.colorCount,
                design_hash: pos.designHash,
                is_new_design: pos.isNewDesign
            })),
            quantity: pricingState.quantity,
            total_price: pricingState.totalPrice,
            customer_email: 'customer@example.com' // This should come from user input
        };
        
        // Call backend to create dynamic product and add to cart
        const response = await fetch(`${getBackendUrl()}/pricing/create-dynamic-product`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('✅ Added to cart successfully!', 'success');
            
            // Redirect to cart or show success message
            if (result.cart_url) {
                window.location.href = result.cart_url;
            } else {
                showMessage('Product added to cart. Proceed to checkout.', 'success');
            }
        } else {
            throw new Error(result.error || 'Failed to add to cart');
        }
        
    } catch (error) {
        console.error('❌ Error adding to cart:', error);
        showMessage('Failed to add to cart. Please try again.', 'error');
    }
}
