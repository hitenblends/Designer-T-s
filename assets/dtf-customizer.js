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

// Test if JavaScript is running
console.log('🚀 DTF Customizer JavaScript loaded!');
console.log('🔧 Backend Configuration:', BACKEND_CONFIG);
console.log('🌐 Current Backend URL:', getBackendUrl());

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

// Designer T's Stock Ink Colors Palette
const DESIGNER_T_COLORS = [
    // Row 1: Yellows, Oranges, and a Red
    { name: 'LEMON YELLOW', hex: '#FFE135', rgb: [255, 225, 53], pms: 'PMS 102 C' },
    { name: 'ATHLETIC GOLD', hex: '#FFB81C', rgb: [255, 184, 28], pms: 'PMS 1235 C' },
    { name: 'DOLPHIN ORANGE', hex: '#FF6B35', rgb: [255, 107, 53], pms: 'PMS 1585 C' },
    { name: 'BRIGHT ORANGE', hex: '#FF4500', rgb: [255, 69, 0], pms: 'PMS 021 C' },
    { name: 'TEXAS ORANGE', hex: '#FF8C00', rgb: [255, 140, 0], pms: 'PMS 158 C' },
    { name: 'SUPER RED', hex: '#DC143C', rgb: [220, 20, 60], pms: 'PMS 485 C' },
    
    // Row 2: Reds, Fuschia, and Burgundies
    { name: 'NATIONAL RED', hex: '#B22222', rgb: [178, 34, 34], pms: 'PMS 2035 C' },
    { name: 'STOCK 186 RED', hex: '#C41E3A', rgb: [196, 30, 58], pms: 'PMS 186 C' },
    { name: 'SCARLET RED', hex: '#B22222', rgb: [178, 34, 34], pms: 'PMS 187 C' },
    { name: 'SUPER FUSCHIA', hex: '#FF1493', rgb: [255, 20, 147], pms: 'PMS 248 C' },
    { name: 'BURGUNDY', hex: '#800020', rgb: [128, 0, 32], pms: 'PMS 209 C' },
    { name: 'RUSSELL CARDINAL', hex: '#8B0000', rgb: [139, 0, 0], pms: 'PMS 207 C' },
    
    // Row 3: Pinks, Purples, and Blues
    { name: 'RHODAMINE RED', hex: '#E6007E', rgb: [230, 0, 126], pms: 'PMS RHODAMINE RED' },
    { name: 'EPIC PURPLE', hex: '#6A0DAD', rgb: [106, 13, 173], pms: 'PMS 2665 C' },
    { name: 'STOCK VIOLET C', hex: '#4B0082', rgb: [75, 0, 130], pms: 'PMS VIOLET C' },
    { name: 'RUSSELL PURPLE', hex: '#2E0854', rgb: [46, 8, 84], pms: 'PMS 2755 C' },
    { name: 'NAVY', hex: '#000080', rgb: [0, 0, 128], pms: 'PMS 2766 C' },
    { name: 'ROYAL BLUE', hex: '#0033A0', rgb: [0, 51, 160], pms: 'PMS 293 C' },
    
    // Row 4: Blues and Greens
    { name: 'COLUMBIA BLUE', hex: '#87CEEB', rgb: [135, 206, 235], pms: 'PMS 646 C' },
    { name: 'CONTACT BLUE', hex: '#0099CC', rgb: [0, 153, 204], pms: 'PMS 299 C' },
    { name: 'AQUA', hex: '#00FFFF', rgb: [0, 255, 255], pms: 'PMS 326 C' },
    { name: 'DALLAS GREEN', hex: '#228B22', rgb: [34, 139, 34], pms: 'PMS 356 C' },
    { name: 'TRAFFIC GREEN', hex: '#00FF00', rgb: [0, 255, 0], pms: 'PMS 802 C' },
    { name: 'DARK GREEN', hex: '#006400', rgb: [0, 100, 0], pms: 'PMS 3435 C' },
    
    // Row 5: Greys, Browns, and Shimmer Textures
    { name: 'RUSSELL GREY', hex: '#808080', rgb: [128, 128, 128], pms: 'PMS 427 C' },
    { name: 'DARK GREY', hex: '#696969', rgb: [105, 105, 105], pms: 'PMS 429 C' },
    { name: 'TAN', hex: '#D2B48C', rgb: [210, 180, 140], pms: 'PMS 729 C' },
    { name: 'DARK BROWN', hex: '#654321', rgb: [101, 67, 33], pms: 'PMS 4975 C' },
    { name: 'SILVER SHIMMER', hex: '#C0C0C0', rgb: [192, 192, 192], pms: 'PMS 877 C', shimmer: true },
    { name: 'GOLD SHIMMER', hex: '#FFD700', rgb: [255, 215, 0], pms: 'PMS 871 C', shimmer: true },
    
    // Row 6: Super FLO (Fluorescent) Colors
    { name: 'ELECTRIC Pink', hex: '#FF1493', rgb: [255, 20, 147], pms: 'PMS 812 C', fluorescent: true },
    { name: 'super FLO yellow', hex: '#FFFF00', rgb: [255, 255, 0], pms: 'PMS 803 C', fluorescent: true },
    { name: 'super FLO Orange', hex: '#FF4500', rgb: [255, 69, 0], pms: 'PMS 805 C', fluorescent: true },
    { name: 'super FLO Pink', hex: '#FF69B4', rgb: [255, 105, 180], pms: 'PMS 806 C', fluorescent: true },
    { name: 'super FLO blue', hex: '#00BFFF', rgb: [0, 191, 255], pms: 'PMS 801 C', fluorescent: true }
];

// Color palette for popup (using Designer T's colors + custom option)
const POPUP_COLOR_PALETTE = [
    // Special: Transparent
    { name: 'Transparent', hex: 'transparent', rgb: [0, 0, 0], isTransparent: true },
    
    // Designer T's Stock Colors
    ...DESIGNER_T_COLORS,
    
    // Custom Color Placeholder (will be added dynamically)
    { name: 'Custom Color', hex: '#000000', rgb: [0, 0, 0], isCustom: true }
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
    
    // Download button removed - no longer needed
    
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

// =============================================================================
// IMAGE PROCESSOR INTEGRATION FUNCTIONS
// =============================================================================

// Analyze image quality and get processing recommendation
async function analyzeImageQuality(file) {
    try {
        console.log('🔍 [QUALITY ANALYSIS] Analyzing image quality...');
        
        const formData = new FormData();
        formData.append('file', file);
        
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/analyze-image-quality`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Quality analysis failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📊 [QUALITY ANALYSIS] Result:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ [QUALITY ANALYSIS] Error:', error);
        throw error;
    }
}

// Preprocess image if needed
async function preprocessImageIfNeeded(file) {
    try {
        console.log('🎨 [PREPROCESSING] Applying intelligent preprocessing...');
        
        const formData = new FormData();
        formData.append('file', file);
        
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/preprocess-image`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Preprocessing failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('🎨 [PREPROCESSING] Result:', result);
        
        if (result.success && result.image_base64) {
            // Convert base64 back to file
            const byteCharacters = atob(result.image_base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new File([byteArray], file.name, { type: file.type });
        }
        
        return file; // Return original if processing failed
        
    } catch (error) {
        console.error('❌ [PREPROCESSING] Error:', error);
        return file; // Return original file if preprocessing fails
    }
}

// Get processing recommendation without processing
async function getProcessingRecommendation(file) {
    try {
        console.log('🔍 [RECOMMENDATION] Getting processing recommendation...');
        
        const formData = new FormData();
        formData.append('file', file);
        
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/get-processing-recommendation`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Recommendation failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📋 [RECOMMENDATION] Result:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ [RECOMMENDATION] Error:', error);
        throw error;
    }
}

// Show processing status to user
function showProcessingStatus(analysis) {
    const statusMessages = {
        'SKIP_PROFESSIONAL_WATER_TEXTURE': {
            icon: '✅',
            message: 'Professional water texture image detected - no processing needed',
            type: 'success'
        },
        'SKIP_GRADIENT': {
            icon: '⚠️',
            message: 'Gradient image detected - skipping color separation processing',
            type: 'warning'
        },
        'SKIP_HIGH_QUALITY': {
            icon: '✅',
            message: 'High-quality image detected - no processing needed',
            type: 'success'
        },
        'PROCESS': {
            icon: '🎨',
            message: 'Image will be optimized for better color extraction',
            type: 'info'
        }
    };
    
    const status = statusMessages[analysis.decision] || {
        icon: '❓',
        message: 'Processing status unknown',
        type: 'info'
    };
    
    showMessage(`${status.icon} ${status.message}`, status.type);
    
    // Show detailed analysis in console
    console.log('📊 [PROCESSING STATUS] Detailed Analysis:');
    console.log(`   Quality Score: ${analysis.quality_score}/100`);
    console.log(`   Gradient Score: ${analysis.gradient_score}/100`);
    console.log(`   Decision: ${analysis.decision}`);
    console.log(`   Reason: ${analysis.reason}`);
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📁 File selected:', file.name, file.type);
    
    try {
        // Step 1: Analyze image quality and get processing recommendation
        console.log('🔍 [STEP 1] Analyzing image quality...');
        showMessage('🔍 Analyzing image quality...', 'info');
        
        const analysis = await getProcessingRecommendation(file);
        showProcessingStatus(analysis);
        
        // Step 2: Apply preprocessing if needed
        let processedFile = file;
        if (analysis.decision === 'PROCESS') {
            console.log('🎨 [STEP 2] Applying preprocessing...');
            showMessage('🎨 Optimizing image for better color extraction...', 'info');
            processedFile = await preprocessImageIfNeeded(file);
        } else {
            console.log('⏭️ [STEP 2] Skipping preprocessing - using original image');
        }
        
        // Step 3: Load image (original or processed)
        console.log('📸 [STEP 3] Loading image...');
        const imageUrl = URL.createObjectURL(processedFile);
        const img = new Image();
        
        img.onload = async () => {
            state.image = img;
            // Reset zoom and pan for new image
            state.zoom = 1;
            state.pan = { x: 0, y: 0 };
            updatePreview();
            updatePrintSize(img);
            
            // Reset pixel ownership tracking for new image
            await resetPixelOwnership();
            
            // Step 4: Extract colors using palette matching
            console.log('🎨 [STEP 4] Extracting colors...');
            await extractColorsWithPalette(img);
            
            // Show permanent download button since we have an image
            if (typeof window.showPermanentDownloadButton === 'function') {
                window.showPermanentDownloadButton();
            }
            
            // Background removal is now optional - user must click the button manually
        };
        
        img.src = imageUrl;
        
    } catch (error) {
        console.error('❌ Error in image processing workflow:', error);
        showMessage('Error processing image. Please try again.', 'error');
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
            
            // Sync with global window.state for pricing system
            if (window.state) {
                window.state.colorMatches = state.colorMatches;
                console.log('🔄 Synced colorMatches to window.state:', window.state.colorMatches.length, 'colors');
            }
            
            // Store pixel coordinates for each detected color
            console.log('📝 Storing pixel coordinates for detected colors...');
            updateColorExtractionMessage('Storing pixel coordinates...');
            
            for (const colorMatch of state.colorMatches) {
                if (colorMatch.detected_rgb) {
                    const success = await storeColorPixels(colorMatch.detected_rgb, colorMatch.uniqueId);
                    if (success) {
                        console.log(`✅ Stored pixels for color ${colorMatch.uniqueId}`);
                    } else {
                        console.warn(`⚠️ Failed to store pixels for color ${colorMatch.uniqueId}`);
                    }
                }
            }
            
            // Hide loading animation AFTER pixel storage is complete
            hideColorExtractionAnimation();
            
            updateColorPalette();
            updateDetectedColors(merged.length, result.total_colors_detected);
            if (reducedBy > 0) {
                showMessage(`✅ Found ${merged.length} colors (merged ${reducedBy} similar)`, 'success');
            } else {
                showMessage(`✅ Found ${merged.length} colors!`, 'success');
            }
            
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
    
    // Sync with global window.state for pricing system
    if (window.state) {
        window.state.colorMatches = state.colorMatches;
        console.log('🔄 Synced colorMatches to window.state (fallback):', window.state.colorMatches.length, 'colors');
    }
    
    // Store pixel coordinates for each detected color (fallback)
    console.log('📝 Storing pixel coordinates for detected colors (fallback)...');
    updateColorExtractionMessage('Storing pixel coordinates...');
    
    for (const colorMatch of state.colorMatches) {
        if (colorMatch.detected_rgb) {
            const success = await storeColorPixels(colorMatch.detected_rgb, colorMatch.uniqueId);
            if (success) {
                console.log(`✅ Stored pixels for color ${colorMatch.uniqueId} (fallback)`);
            } else {
                console.warn(`⚠️ Failed to store pixels for color ${colorMatch.uniqueId} (fallback)`);
            }
        }
    }
    
    // Hide loading animation AFTER pixel storage is complete (fallback)
    hideColorExtractionAnimation();
    
    updateColorPalette();
    updateDetectedColors(0, state.colorMatches.length);
    showMessage('⚠️ Using basic frontend color detection', 'warning');
    
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
    
    // Update display with new beautified structure
    const dimensionsElement = document.getElementById('dtf-dimensions');
    if (dimensionsElement) {
        dimensionsElement.innerHTML = `
            <div class="dtf-dimensions-header">
                <h4><i class="fas fa-ruler-combined"></i> Image Dimensions</h4>
                <div class="dtf-dimensions-controls">
                    <button class="dtf-unit-toggle" id="dtf-unit-toggle" title="Switch units">
                        <i class="fas fa-exchange-alt"></i>
                    </button>
                    <button class="dtf-lock-aspect" id="dtf-lock-aspect" title="Lock aspect ratio">
                        <i class="fas fa-lock"></i>
                    </button>
            </div>
            </div>
            <div class="dimensions-content">
                <div class="dimension-item" style="animation-delay: 0.1s;">
                    <div class="dimension-label">
                        <i class="fas fa-arrows-alt-h"></i>
                        Width
                    </div>
                    <div class="dimension-inputs">
                        <div class="dimension-input-group">
                            <div class="dimension-input-label">Pixels</div>
                            <input type="number" class="dimension-input" id="width-px" value="${img.width}" min="1" max="10000">
                            <span class="dimension-unit">px</span>
                        </div>
                        <div class="dimension-input-group">
                            <div class="dimension-input-label">Inches</div>
                            <input type="number" class="dimension-input" id="width-in" value="${widthInch}" min="0.1" max="50" step="0.1">
                            <span class="dimension-unit">in</span>
                        </div>
                        <div class="dimension-input-group">
                            <div class="dimension-input-label">Millimeters</div>
                            <input type="number" class="dimension-input" id="width-mm" value="${widthMm}" min="1" max="1000" step="0.1">
                            <span class="dimension-unit">mm</span>
                        </div>
                    </div>
                </div>
                
                <div class="dimension-item" style="animation-delay: 0.2s;">
                    <div class="dimension-label">
                        <i class="fas fa-arrows-alt-v"></i>
                        Height
                    </div>
                    <div class="dimension-inputs">
                        <div class="dimension-input-group">
                            <div class="dimension-input-label">Pixels</div>
                            <input type="number" class="dimension-input" id="height-px" value="${img.height}" min="1" max="10000">
                            <span class="dimension-unit">px</span>
                        </div>
                        <div class="dimension-input-group">
                            <div class="dimension-input-label">Inches</div>
                            <input type="number" class="dimension-input" id="height-in" value="${heightInch}" min="0.1" max="50" step="0.1">
                            <span class="dimension-unit">in</span>
                        </div>
                        <div class="dimension-input-group">
                            <div class="dimension-input-label">Millimeters</div>
                            <input type="number" class="dimension-input" id="height-mm" value="${heightMm}" min="1" max="1000" step="0.1">
                            <span class="dimension-unit">mm</span>
                        </div>
                    </div>
                </div>
                
                <div class="dimension-item" style="animation-delay: 0.3s;">
                    <div class="dimension-label">
                        <i class="fas fa-expand-arrows-alt"></i>
                        Aspect Ratio
                    </div>
                    <div class="dimension-value">${(img.width / img.height).toFixed(2)}:1</div>
                </div>
                
                <div class="dimension-item" style="animation-delay: 0.4s;">
                    <div class="dimension-label">
                        <i class="fas fa-th"></i>
                        Total Pixels
                    </div>
                    <div class="dimension-value">${(img.width * img.height).toLocaleString()}</div>
                </div>
            </div>
        `;
        
        // Setup dimension input listeners for real-time conversion
        setupDimensionInputListeners();
    }
    
    // Function to setup dimension input listeners for real-time conversion
    function setupDimensionInputListeners() {
        console.log('🔄 Setting up dimension input listeners');
        
        // Width inputs
        const widthPx = document.getElementById('width-px');
        const widthIn = document.getElementById('width-in');
        const widthMm = document.getElementById('width-mm');
        
        // Height inputs
        const heightPx = document.getElementById('height-px');
        const heightIn = document.getElementById('height-in');
        const heightMm = document.getElementById('height-mm');
        
        if (widthPx && widthIn && widthMm && heightPx && heightIn && heightMm) {
            // Width conversions
            widthPx.addEventListener('input', function() {
                const px = parseFloat(this.value) || 0;
                const inches = (px / 300).toFixed(2);
                const mm = (inches * 25.4).toFixed(1);
                widthIn.value = inches;
                widthMm.value = mm;
            });
            
            widthIn.addEventListener('input', function() {
                const inches = parseFloat(this.value) || 0;
                const px = Math.round(inches * 300);
                const mm = (inches * 25.4).toFixed(1);
                widthPx.value = px;
                widthMm.value = mm;
            });
            
            widthMm.addEventListener('input', function() {
                const mm = parseFloat(this.value) || 0;
                const inches = (mm / 25.4).toFixed(2);
                const px = Math.round(inches * 300);
                widthIn.value = inches;
                widthPx.value = px;
            });
            
            // Height conversions
            heightPx.addEventListener('input', function() {
                const px = parseFloat(this.value) || 0;
                const inches = (px / 300).toFixed(2);
                const mm = (inches * 25.4).toFixed(1);
                heightIn.value = inches;
                heightMm.value = mm;
            });
            
            heightIn.addEventListener('input', function() {
                const inches = parseFloat(this.value) || 0;
                const px = Math.round(inches * 300);
                const mm = (inches * 25.4).toFixed(1);
                heightPx.value = px;
                heightMm.value = mm;
            });
            
            heightMm.addEventListener('input', function() {
                const mm = parseFloat(this.value) || 0;
                const inches = (mm / 25.4).toFixed(2);
                const px = Math.round(inches * 300);
                heightIn.value = inches;
                heightPx.value = px;
            });
            
            console.log('✅ Dimension input listeners setup complete');
        } else {
            console.warn('⚠️ Some dimension input elements not found');
        }
    }
    
    // Update resize inputs
    const widthInput = document.getElementById('dtf-resize-width');
    const heightInput = document.getElementById('dtf-resize-height');
    if (widthInput) widthInput.value = widthInch;
    if (heightInput) heightInput.value = heightInch;
    
    // Update size controls with detected dimensions
    updateSizeControls(widthInch, heightInch, img.width, img.height);
    // Cache aspect ratio
    state.originalAspect = img.width / img.height;
}

// Function to update size controls with detected dimensions
function updateSizeControls(widthIn, heightIn, widthPx, heightPx, retryCount = 0) {
    console.log('🔄 Updating size controls with detected dimensions:', { widthIn, heightIn, widthPx, heightPx, retryCount });
    
    // Update width and height inputs
    const widthInput = document.getElementById('dtf-size-width');
    const heightInput = document.getElementById('dtf-size-height');
    const unitsSelect = document.getElementById('dtf-size-units');
    
    console.log('🔍 Size control elements found:', {
        widthInput: !!widthInput,
        heightInput: !!heightInput,
        unitsSelect: !!unitsSelect,
        widthInputElement: widthInput,
        heightInputElement: heightInput,
        unitsSelectElement: unitsSelect
    });
    
    if (widthInput && heightInput && unitsSelect) {
        // Set default units to inches
        unitsSelect.value = 'in';
        
        // Update width and height with inches (most common for printing)
        widthInput.value = widthIn;
        heightInput.value = heightIn;
        
        console.log('✅ Size controls updated:', {
            width: widthIn + ' in',
            height: heightIn + ' in',
            units: 'in'
        });
        
        // Trigger any existing event listeners
        widthInput.dispatchEvent(new Event('input', { bubbles: true }));
        heightInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Setup unit change listener if not already set
        if (!unitsSelect.hasAttribute('data-listener-added')) {
            unitsSelect.addEventListener('change', handleSizeUnitChange);
            unitsSelect.setAttribute('data-listener-added', 'true');
            console.log('✅ Added unit change listener to size controls');
        }
        
    } else {
        console.warn('⚠️ Size control elements not found:', {
            widthInput: !!widthInput,
            heightInput: !!heightInput,
            unitsSelect: !!unitsSelect
        });
        
        // Retry up to 3 times with increasing delays
        if (retryCount < 3) {
            const delay = (retryCount + 1) * 200; // 200ms, 400ms, 600ms
            console.log(`🔄 Retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
            setTimeout(() => {
                updateSizeControls(widthIn, heightIn, widthPx, heightPx, retryCount + 1);
            }, delay);
        } else {
            console.error('❌ Failed to find size control elements after 3 retries');
        }
    }
}

// Function to handle size unit changes
function handleSizeUnitChange() {
    const unitsSelect = document.getElementById('dtf-size-units');
    const widthInput = document.getElementById('dtf-size-width');
    const heightInput = document.getElementById('dtf-size-height');
    
    if (!unitsSelect || !widthInput || !heightInput) return;
    
    const newUnit = unitsSelect.value;
    const currentWidth = parseFloat(widthInput.value) || 0;
    const currentHeight = parseFloat(heightInput.value) || 0;
    
    console.log('🔄 Converting size units to:', newUnit, 'from current values:', { currentWidth, currentHeight });
    
    // Convert from inches to the new unit
    let newWidth, newHeight;
    
    switch (newUnit) {
        case 'in':
            // Already in inches, no conversion needed
            newWidth = currentWidth;
            newHeight = currentHeight;
            break;
            
        case 'mm':
            // Convert inches to millimeters
            newWidth = (currentWidth * 25.4).toFixed(1);
            newHeight = (currentHeight * 25.4).toFixed(1);
            break;
            
        case 'px':
            // Convert inches to pixels (assuming 300 DPI)
            newWidth = Math.round(currentWidth * 300);
            newHeight = Math.round(currentHeight * 300);
            break;
            
        default:
            console.warn('⚠️ Unknown unit:', newUnit);
            return;
    }
    
    // Update the input values
    widthInput.value = newWidth;
    heightInput.value = newHeight;
    
    console.log('✅ Size units converted:', {
        unit: newUnit,
        width: newWidth,
        height: newHeight
    });
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
    
    // Also update global DTF_STATE if it exists
    if (typeof window.DTF_STATE !== 'undefined') {
        window.DTF_STATE.image = newImg;
        console.log('✅ Updated window.DTF_STATE.image with resized image:', newImg.width, 'x', newImg.height);
    }
    
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
    
    // Check if this is a success message related to design changes
    const isDesignChange = type === 'success' && (
        message.includes('Color changed') || 
        message.includes('Color replaced') || 
        message.includes('Size updated') ||
        message.includes('Background removed') ||
        message.includes('pixels changed')
    );
    
    if (isDesignChange) {
        messageElement.innerHTML = `
            <div class="dtf-message-content">
                <span class="dtf-message-text">${message}</span>
            </div>
            <button class="dtf-preview-download-btn" onclick="downloadPreviewImage()">
                <i class="fas fa-download"></i> Preview
            </button>
        `;
        
        // Also show the permanent download button
        if (typeof window.showPermanentDownloadButton === 'function') {
            window.showPermanentDownloadButton();
        }
    } else {
    messageElement.textContent = message;
    }
    
    messageContainer.appendChild(messageElement);
    
    // Auto-remove after 8 seconds for design changes (longer to allow download), 5 seconds for others
    const timeout = isDesignChange ? 8000 : 5000;
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, timeout);
}

// Download preview image function
function downloadPreviewImage() {
    console.log('💾 Download preview button clicked');
    
    // Priority order: DTF_STATE (most up-to-date) > local state > canvas
    let image = null;
    let source = '';
    
    // First try global DTF_STATE (this gets updated with resized images)
    if (typeof window.DTF_STATE !== 'undefined' && window.DTF_STATE.image) {
        image = window.DTF_STATE.image;
        source = 'DTF_STATE';
    } 
    // Then try local state
    else if (state.image) {
        image = state.image;
        source = 'local state';
    }
    // Then try to get from canvas (for processed images)
    else {
        const canvas = document.getElementById('dtf-preview-canvas');
        if (canvas && canvas.width > 0 && canvas.height > 0) {
            console.log('🎨 Using canvas as image source, dimensions:', canvas.width, 'x', canvas.height);
            downloadCanvasAsFile(canvas, 'dtf-preview');
            return;
        }
    }
    
    if (!image) {
        console.log('❌ No image to download');
        showMessage('Please upload an image first!', 'error');
        return;
    }
    
    console.log('✅ Using image from', source, 'dimensions:', image.width, 'x', image.height);
    
    try {
        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match the image
        canvas.width = image.width;
        canvas.height = image.height;
        
        // Draw the image on the canvas
        ctx.drawImage(image, 0, 0);
        
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
            const filename = `dtf-preview-${timestamp}.png`;
            link.download = filename;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            console.log('✅ Preview image downloaded successfully:', filename);
            showMessage(`✅ Preview downloaded as ${filename}`, 'success');
        }, 'image/png', 1.0); // High quality PNG
        
    } catch (error) {
        console.error('❌ Download error:', error);
        showMessage('Download failed. Please try again.', 'error');
    }
}

// Helper function to download canvas as file
function downloadCanvasAsFile(canvas, prefix = 'canvas') {
    try {
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
            const filename = `${prefix}-${timestamp}.png`;
            link.download = filename;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(url);
            
            console.log('✅ Preview image downloaded successfully:', filename);
            showMessage(`✅ Preview downloaded as ${filename}`, 'success');
        }, 'image/png', 1.0); // High quality PNG
        
    } catch (error) {
        console.error('❌ Download error:', error);
        showMessage('Download failed. Please try again.', 'error');
    }
}

// Make downloadPreviewImage globally available
window.downloadPreviewImage = downloadPreviewImage;

// Make custom color picker functions globally available
window.openCustomColorPicker = openCustomColorPicker;
window.closeCustomColorPicker = closeCustomColorPicker;
window.updateCustomColorFromRGB = updateCustomColorFromRGB;
window.updateCustomColorFromHex = updateCustomColorFromHex;
window.updateCustomColorFromPicker = updateCustomColorFromPicker;
window.applyCustomColor = applyCustomColor;

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

// Generate a robust unique color ID
function generateUniqueColorId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `color_${timestamp}_${random}`;
}

// Reset pixel ownership tracking when loading new image
async function resetPixelOwnership() {
    try {
        console.log('🔄 Resetting pixel ownership tracking...');
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/reset-pixel-ownership`, {
            method: 'POST'
        });
        
        if (response.ok) {
            console.log('✅ Pixel ownership tracking reset successfully');
        } else {
            console.warn('⚠️ Failed to reset pixel ownership tracking');
        }
    } catch (error) {
        console.error('❌ Error resetting pixel ownership:', error);
    }
}

// Debug pixel ownership state
async function debugPixelOwnership() {
    try {
        console.log('🔍 Debugging pixel ownership state...');
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/debug-pixel-ownership`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📊 Pixel ownership state:', data);
            return data;
        } else {
            console.warn('⚠️ Failed to get pixel ownership state');
        }
    } catch (error) {
        console.error('❌ Error getting pixel ownership state:', error);
    }
}

// Make debug functions globally available
window.debugPixelOwnership = debugPixelOwnership;
window.resetPixelOwnership = resetPixelOwnership;

// Store pixel coordinates for a color when first detected
async function storeColorPixels(rgb, colorId) {
    console.log('🎨 storeColorPixels called with:', { rgb, colorId });
    
    if (!state.image) {
        console.log('❌ No image to store pixels for');
        return false;
    }
    
    try {
        // Convert current image to blob
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = state.image.width;
        canvas.height = state.image.height;
        ctx.drawImage(state.image, 0, 0);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // Create form data
        const formData = new FormData();
        formData.append('file', blob, 'image.png');
        formData.append('color_r', rgb[0]);
        formData.append('color_g', rgb[1]);
        formData.append('color_b', rgb[2]);
        formData.append('color_id', colorId);
        formData.append('tolerance', 30);
        
        // Call backend to store pixels
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/store-color-pixels`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Backend error storing pixels:', errorText);
            return false;
        }
        
        const result = await response.json();
        console.log('✅ Pixels stored successfully:', result);
        return result.success;
        
    } catch (error) {
        console.error('❌ Error storing color pixels:', error);
        return false;
    }
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
        // Send unique color ID - ensure it's robust
        let colorId = state.selectedFetchedColor?.match?.uniqueId;
        
        // If no color ID found, try to find it in the current color matches
        if (!colorId && state.colorMatches) {
            const currentColor = state.colorMatches.find(match => 
                match.rgb[0] === oldRgb[0] && 
                match.rgb[1] === oldRgb[1] && 
                match.rgb[2] === oldRgb[2]
            );
            colorId = currentColor?.uniqueId;
        }
        
        // If still no color ID, generate a new one
        if (!colorId) {
            colorId = generateUniqueColorId();
            console.log('⚠️ No existing color ID found, generated new one:', colorId);
        }
        
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
                    // Debug pixel ownership state to help diagnose the issue
                    console.log('🔍 Debugging pixel ownership state...');
                    await debugPixelOwnership();
                    
                    showMessage(`⚠️ No pixels changed. This might be because the color region was not found in the tracking system. Try refreshing the page and selecting the color again.`, 'warning');
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
        
        // Handle custom color button specially
        if (color.isCustom) {
            colorElement.innerHTML = '<i class="fas fa-plus"></i>';
            colorElement.style.backgroundColor = '#f8f9fa';
            colorElement.style.border = '2px dashed #6c757d';
            colorElement.style.color = '#6c757d';
            colorElement.style.display = 'flex';
            colorElement.style.alignItems = 'center';
            colorElement.style.justifyContent = 'center';
            colorElement.style.fontSize = '16px';
            colorElement.title = 'Add Custom Color';
        }
        // Handle transparent color specially
        else if (color.isTransparent) {
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
            if (color.isCustom) {
                openCustomColorPicker();
            } else {
                selectPopupPaletteColor(color, index);
            }
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

// Custom Color Picker Functions
function openCustomColorPicker() {
    console.log('🎨 Opening custom color picker');
    
    // Create custom color picker popup
    const customColorPopup = document.createElement('div');
    customColorPopup.id = 'custom-color-picker-popup';
    customColorPopup.className = 'custom-color-picker-popup';
    customColorPopup.innerHTML = `
        <div class="custom-color-picker-content">
            <div class="custom-color-picker-header">
                <h3><i class="fas fa-palette"></i> Custom Color</h3>
                <button class="custom-color-picker-close" onclick="closeCustomColorPicker()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="custom-color-picker-body">
                <!-- Color Preview -->
                <div class="custom-color-preview-section">
                    <div class="custom-color-preview-box" id="custom-color-preview-box"></div>
                    <div class="custom-color-preview-info">
                        <div class="custom-color-preview-hex" id="custom-color-hex-display">#000000</div>
                        <div class="custom-color-preview-rgb" id="custom-color-rgb-display">RGB(0, 0, 0)</div>
                    </div>
                </div>
                
                <!-- Color Input Methods -->
                <div class="custom-color-inputs">
                    <!-- RGB Inputs -->
                    <div class="color-input-group">
                        <label>RGB Values:</label>
                        <div class="rgb-inputs">
                            <div class="rgb-input-item">
                                <label>R:</label>
                                <input type="number" id="custom-color-r" min="0" max="255" value="0" onchange="updateCustomColorFromRGB()">
                            </div>
                            <div class="rgb-input-item">
                                <label>G:</label>
                                <input type="number" id="custom-color-g" min="0" max="255" value="0" onchange="updateCustomColorFromRGB()">
                            </div>
                            <div class="rgb-input-item">
                                <label>B:</label>
                                <input type="number" id="custom-color-b" min="0" max="255" value="0" onchange="updateCustomColorFromRGB()">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Hex Input -->
                    <div class="color-input-group">
                        <label>Hex Value:</label>
                        <input type="text" id="custom-color-hex" value="#000000" placeholder="#000000" onchange="updateCustomColorFromHex()">
                    </div>
                    
                    <!-- Color Picker -->
                    <div class="color-input-group">
                        <label>Color Picker:</label>
                        <input type="color" id="custom-color-picker" value="#000000" onchange="updateCustomColorFromPicker()">
                    </div>
                </div>
            </div>
            
            <div class="custom-color-picker-actions">
                <button class="custom-color-picker-cancel" onclick="closeCustomColorPicker()">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button class="custom-color-picker-apply" onclick="applyCustomColor()">
                    <i class="fas fa-check"></i> Apply Color
                </button>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(customColorPopup);
    
    // Add CSS styles
    addCustomColorPickerStyles();
    
    // Initialize with current color if available
    if (currentPopupColor) {
        const rgb = currentPopupColor.detected_rgb || [0, 0, 0];
        document.getElementById('custom-color-r').value = rgb[0];
        document.getElementById('custom-color-g').value = rgb[1];
        document.getElementById('custom-color-b').value = rgb[2];
        updateCustomColorFromRGB();
    }
}

function closeCustomColorPicker() {
    const popup = document.getElementById('custom-color-picker-popup');
    if (popup) {
        popup.remove();
    }
}

function updateCustomColorFromRGB() {
    const r = parseInt(document.getElementById('custom-color-r').value) || 0;
    const g = parseInt(document.getElementById('custom-color-g').value) || 0;
    const b = parseInt(document.getElementById('custom-color-b').value) || 0;
    
    const hex = rgbToHex(r, g, b);
    document.getElementById('custom-color-hex').value = hex;
    document.getElementById('custom-color-picker').value = hex;
    
    updateCustomColorPreview(r, g, b, hex);
}

function updateCustomColorFromHex() {
    const hex = document.getElementById('custom-color-hex').value;
    if (hex.match(/^#[0-9A-Fa-f]{6}$/)) {
        const rgb = hexToRgb(hex);
        document.getElementById('custom-color-r').value = rgb.r;
        document.getElementById('custom-color-g').value = rgb.g;
        document.getElementById('custom-color-b').value = rgb.b;
        document.getElementById('custom-color-picker').value = hex;
        
        updateCustomColorPreview(rgb.r, rgb.g, rgb.b, hex);
    }
}

function updateCustomColorFromPicker() {
    const hex = document.getElementById('custom-color-picker').value;
    document.getElementById('custom-color-hex').value = hex;
    
    const rgb = hexToRgb(hex);
    document.getElementById('custom-color-r').value = rgb.r;
    document.getElementById('custom-color-g').value = rgb.g;
    document.getElementById('custom-color-b').value = rgb.b;
    
    updateCustomColorPreview(rgb.r, rgb.g, rgb.b, hex);
}

function updateCustomColorPreview(r, g, b, hex) {
    document.getElementById('custom-color-preview-box').style.backgroundColor = hex;
    document.getElementById('custom-color-hex-display').textContent = hex.toUpperCase();
    document.getElementById('custom-color-rgb-display').textContent = `RGB(${r}, ${g}, ${b})`;
}

function applyCustomColor() {
    const r = parseInt(document.getElementById('custom-color-r').value) || 0;
    const g = parseInt(document.getElementById('custom-color-g').value) || 0;
    const b = parseInt(document.getElementById('custom-color-b').value) || 0;
    const hex = rgbToHex(r, g, b);
    
    const customColor = {
        name: 'Custom Color',
        hex: hex,
        rgb: [r, g, b],
        isCustom: true
    };
    
    console.log('🎨 Custom color applied:', customColor);
    
    // Select the custom color
    selectedPaletteColor = customColor;
    
    // Update preview
    updatePopupPreview(customColor);
    
    // Close popup
    closeCustomColorPicker();
}

// Helper functions for color conversion
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function addCustomColorPickerStyles() {
    if (document.getElementById('custom-color-picker-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'custom-color-picker-styles';
    styles.textContent = `
        .custom-color-picker-popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        
        .custom-color-picker-content {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .custom-color-picker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 25px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .custom-color-picker-header h3 {
            margin: 0;
            color: #495057;
            font-size: 1.2rem;
            font-weight: 600;
        }
        
        .custom-color-picker-header h3 i {
            margin-right: 8px;
            color: #6c757d;
        }
        
        .custom-color-picker-close {
            background: none;
            border: none;
            font-size: 1.2rem;
            color: #6c757d;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .custom-color-picker-close:hover {
            background: #f8f9fa;
            color: #495057;
        }
        
        .custom-color-picker-body {
            padding: 25px;
        }
        
        .custom-color-preview-section {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        
        .custom-color-preview-box {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            border: 2px solid #dee2e6;
            margin-right: 15px;
            background: #000000;
        }
        
        .custom-color-preview-info {
            flex: 1;
        }
        
        .custom-color-preview-hex {
            font-size: 1.1rem;
            font-weight: 600;
            color: #495057;
            margin-bottom: 5px;
        }
        
        .custom-color-preview-rgb {
            font-size: 0.9rem;
            color: #6c757d;
        }
        
        .custom-color-inputs {
            margin-bottom: 25px;
        }
        
        .color-input-group {
            margin-bottom: 20px;
        }
        
        .color-input-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #495057;
            font-size: 0.9rem;
        }
        
        .rgb-inputs {
            display: flex;
            gap: 10px;
        }
        
        .rgb-input-item {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .rgb-input-item label {
            margin: 0;
            font-weight: 500;
            color: #6c757d;
            font-size: 0.8rem;
            min-width: 15px;
        }
        
        .rgb-input-item input {
            flex: 1;
            padding: 8px 10px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .color-input-group input[type="text"] {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            font-size: 1rem;
            font-family: monospace;
        }
        
        .color-input-group input[type="color"] {
            width: 100%;
            height: 50px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            cursor: pointer;
        }
        
        .custom-color-picker-actions {
            display: flex;
            gap: 10px;
            padding: 20px 25px;
            border-top: 1px solid #e9ecef;
            background: #f8f9fa;
            border-radius: 0 0 12px 12px;
        }
        
        .custom-color-picker-cancel,
        .custom-color-picker-apply {
            flex: 1;
            padding: 12px 20px;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .custom-color-picker-cancel {
            background: #6c757d;
            color: white;
        }
        
        .custom-color-picker-cancel:hover {
            background: #5a6268;
        }
        
        .custom-color-picker-apply {
            background: #007bff;
            color: white;
        }
        
        .custom-color-picker-apply:hover {
            background: #0056b3;
        }
        
        .custom-color-picker-cancel i,
        .custom-color-picker-apply i {
            margin-right: 8px;
        }
    `;
    
    document.head.appendChild(styles);
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

function updateColorExtractionMessage(message) {
    const animationContainer = document.querySelector('.color-extraction-animation');
    if (animationContainer) {
        const textElement = animationContainer.querySelector('.animation-text');
        if (textElement) {
            textElement.textContent = message;
        }
    }
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

// updateDownloadButton function removed - download button no longer needed

// Download functionality
// downloadEditedImage function removed - download button no longer needed

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








// Set up dimension control buttons for DTF customizer
function setupDTFDimensionControlButtons() {
    console.log('🔧 Setting up DTF dimension control buttons...');
    
    // Unit toggle button
    const unitToggleBtn = document.getElementById('dtf-unit-toggle');
    if (unitToggleBtn) {
        unitToggleBtn.addEventListener('click', function() {
            console.log('🔄 DTF Unit toggle button clicked');
            toggleDTFDimensionUnits();
        });
        console.log('✅ DTF Unit toggle button event listener added');
    } else {
        console.log('❌ DTF Unit toggle button not found');
    }
    
    // Lock aspect ratio button
    const lockAspectBtn = document.getElementById('dtf-lock-aspect');
    if (lockAspectBtn) {
        lockAspectBtn.addEventListener('click', function() {
            console.log('🔒 DTF Lock aspect ratio button clicked');
            toggleDTFAspectRatioLock();
        });
        console.log('✅ DTF Lock aspect ratio button event listener added');
    } else {
        console.log('❌ DTF Lock aspect ratio button not found');
    }
}

// Toggle dimension units for DTF customizer
function toggleDTFDimensionUnits() {
    const unitsSelect = document.getElementById('dtf-size-units');
    const widthInput = document.getElementById('dtf-size-width');
    const heightInput = document.getElementById('dtf-size-height');
    
    if (!unitsSelect || !widthInput || !heightInput) {
        console.log('❌ Required elements not found for DTF unit toggle');
        return;
    }
    
    const currentUnits = unitsSelect.value;
    const newUnits = currentUnits === 'in' ? 'px' : 'in';
    
    console.log('🔄 DTF Switching units from', currentUnits, 'to', newUnits);
    
    // Update the select
    unitsSelect.value = newUnits;
    
    // Convert values
    const width = parseFloat(widthInput.value) || 0;
    const height = parseFloat(heightInput.value) || 0;
    
    if (currentUnits === 'in' && newUnits === 'px') {
        // Convert inches to pixels (assuming 300 PPI)
        const ppi = parseFloat(document.getElementById('dtf-ppi-input')?.value) || 300;
        widthInput.value = Math.round(width * ppi);
        heightInput.value = Math.round(height * ppi);
    } else if (currentUnits === 'px' && newUnits === 'in') {
        // Convert pixels to inches
        const ppi = parseFloat(document.getElementById('dtf-ppi-input')?.value) || 300;
        widthInput.value = (width / ppi).toFixed(2);
        heightInput.value = (height / ppi).toFixed(2);
    }
    
    // Trigger the unit change handler
    handleSizeUnitChange();
    
    console.log('✅ DTF Units switched successfully');
}

// Toggle aspect ratio lock for DTF customizer
function toggleDTFAspectRatioLock() {
    const lockBtn = document.getElementById('dtf-lock-aspect');
    if (!lockBtn) {
        console.log('❌ DTF Lock aspect ratio button not found');
        return;
    }
    
    const isLocked = lockBtn.classList.contains('locked');
    
    if (isLocked) {
        // Unlock
        lockBtn.classList.remove('locked');
        lockBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
        lockBtn.title = 'Lock aspect ratio';
        console.log('🔓 DTF Aspect ratio unlocked');
    } else {
        // Lock
        lockBtn.classList.add('locked');
        lockBtn.innerHTML = '<i class="fas fa-lock"></i>';
        lockBtn.title = 'Unlock aspect ratio';
        console.log('🔒 DTF Aspect ratio locked');
    }
    
    // Update state
    if (state) {
        state.aspectLocked = !isLocked;
    }
}

// Make DTF customizer functions available globally
window.initializeDTFCustomizerMain = initDTFCustomizer;
window.setupDTFEventListeners = setupDTFEventListeners;
window.handleFileUpload = handleFileUpload;
window.removeBackground = removeBackground;
window.setupDTFDimensionControlButtons = setupDTFDimensionControlButtons;
window.toggleDTFDimensionUnits = toggleDTFDimensionUnits;
window.toggleDTFAspectRatioLock = toggleDTFAspectRatioLock;

// Export Image Processor functions to global scope
window.analyzeImageQuality = analyzeImageQuality;
window.preprocessImageIfNeeded = preprocessImageIfNeeded;
window.getProcessingRecommendation = getProcessingRecommendation;
window.showProcessingStatus = showProcessingStatus;





