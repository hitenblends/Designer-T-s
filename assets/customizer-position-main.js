
// Multi-Position Screen Printing Customizer JavaScript
(function() {
  'use strict';
  
  // Configuration
  const POSITION_LABELS = {
    'front': { name: 'Front', icon: 'fas fa-tshirt', description: 'Main front design' },
    'back': { name: 'Back', icon: 'fas fa-tshirt', description: 'Back design' },
    'left-chest': { name: 'Left Chest', icon: 'fas fa-heart', description: 'Left chest pocket area' },
    'right-chest': { name: 'Right Chest', icon: 'fas fa-heart', description: 'Right chest pocket area' },
    'left-sleeve': { name: 'Left Sleeve', icon: 'fas fa-hand-paper', description: 'Left sleeve area' },
    'right-sleeve': { name: 'Right Sleeve', icon: 'fas fa-hand-paper', description: 'Right sleeve area' }
  };
  
  // State
  let selectedPositions = []; // Will be populated from checkboxes
  window.selectedPositions = selectedPositions; // Make it global for pricing integration
  let positionData = {};
  let currentEditingPosition = null;
  let hasInitialized = false; // Track if user has made initial selection
  
  // Make variables global for JavaScript access
  window.POSITION_LABELS = POSITION_LABELS;
  window.positionData = positionData;
  
  // Color Analysis Loader Control Functions
  window.showColorAnalysisLoader = function() {
    const loader = document.getElementById('dtf-color-loader');
    const placeholder = document.getElementById('dtf-preview-placeholder');
    
    if (loader) {
      loader.style.display = 'flex';
      
      // Hide placeholder if visible
      if (placeholder) {
        placeholder.style.display = 'none';
      }
      
      // Update initial status
      window.updateLoaderStatus('Initializing color analysis...', '');
    }
  };

  window.hideColorAnalysisLoader = function() {
    const loader = document.getElementById('dtf-color-loader');
    const placeholder = document.getElementById('dtf-preview-placeholder');
    
    if (loader) {
      loader.style.display = 'none';
      
      // Show placeholder if no image is loaded
      if (placeholder && !window.state?.image) {
        placeholder.style.display = 'flex';
      }
    }
  };

  window.updateLoaderStatus = function(status, details = '') {
    const statusElement = document.getElementById('dtf-loader-status');
    const detailsElement = document.getElementById('dtf-loader-details');
    
    if (statusElement) {
      statusElement.textContent = status;
    }
    
    if (detailsElement) {
      if (details) {
        detailsElement.innerHTML = details;
      } else {
        detailsElement.innerHTML = '';
      }
    }
  };

  window.updateLoaderDetails = function(processed = 0, skipped = 0, errors = 0) {
    let detailsHtml = '';
    
    if (processed > 0) {
      detailsHtml += `<div class="dtf-processed">✓ Processed: ${processed}</div>`;
    }
    
    if (skipped > 0) {
      detailsHtml += `<div class="dtf-skipped">⚠ Skipped: ${skipped}</div>`;
    }
    
    if (errors > 0) {
      detailsHtml += `<div class="dtf-error">✗ Errors: ${errors}</div>`;
    }
    
    const detailsElement = document.getElementById('dtf-loader-details');
    if (detailsElement) {
      detailsElement.innerHTML = detailsHtml;
    }
  };
  
  // Initialize
  function init() {
    setupEventListeners();
    // Show initial state - no position blocks, just highlighted button
    showInitialState();
  }
  
  
  // Setup event listeners
  function setupEventListeners() {
    // Position selector button
    const positionSelectorBtn = document.getElementById('sp-position-selector-btn');
    if (positionSelectorBtn) {
      positionSelectorBtn.addEventListener('click', openPositionPopup);
    }
    
    // Position popup close buttons
    const popupClose = document.getElementById('sp-popup-close');
    const popupCancel = document.getElementById('sp-popup-cancel');
    const popupApply = document.getElementById('sp-popup-apply');
    
    if (popupClose) {
      popupClose.addEventListener('click', closePositionPopup);
    }
    
    if (popupCancel) {
      popupCancel.addEventListener('click', closePositionPopup);
    }
    
    if (popupApply) {
      popupApply.addEventListener('click', applyPositionSelection);
    }
    
    // Close popup on background click
    const popup = document.getElementById('sp-position-popup');
    if (popup) {
      popup.addEventListener('click', function(e) {
        if (e.target === popup) {
          closePositionPopup();
        }
      });
    }
    
    // Handle checkbox changes
    const checkboxes = document.querySelectorAll('#sp-position-popup input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', updatePositionOptionState);
    });
    

    
    // Modal close button
    const modalClose = document.getElementById('sp-modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }
    
    // Close modal on background click
    const modal = document.getElementById('sp-dtf-modal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeModal();
        }
      });
    }
    
    // Add to cart button
    const addToCartBtn = document.getElementById('sp-add-to-cart');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', addToCart);
    }
  }
  
  // Generate position blocks
  function generatePositionBlocks() {
    const container = document.getElementById('sp-positions-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    selectedPositions.forEach((positionKey, index) => {
      const position = POSITION_LABELS[positionKey];
      const isCompleted = positionData[positionKey] && positionData[positionKey].completed;
      
      const block = document.createElement('div');
      block.className = `sp-position-block ${isCompleted ? 'completed' : ''}`;
      block.dataset.position = positionKey;
      
      block.innerHTML = `
        <div class="sp-position-close-btn" onclick="removePosition('${positionKey}')" title="Remove position">
          <i class="fas fa-times"></i>
        </div>
        <div class="sp-position-icon">
          <i class="${position.icon}"></i>
        </div>
        <div class="sp-position-title">${position.name}</div>
        <div class="sp-position-description">${position.description}</div>
        <div class="sp-position-status ${isCompleted ? 'completed' : 'empty'}">
          ${isCompleted ? 'Completed' : 'Click to customize'}
        </div>
        ${isCompleted ? 
          (positionData[positionKey].thumbnail ? 
            `<div class="sp-thumbnail-container">
              <img src="${positionData[positionKey].thumbnail}" class="sp-preview-thumbnail" alt="${position.name} preview">
              <div class="sp-thumbnail-overlay">
                <button class="sp-view-full-btn" onclick="viewFullImage('${positionKey}')" title="View full image">
                  <i class="fas fa-expand"></i>
                </button>
                <button class="sp-edit-btn" onclick="editPosition('${positionKey}')" title="Edit design">
                  <i class="fas fa-edit"></i>
                </button>
              </div>
            </div>` : 
            `<div class="sp-thumbnail-loading">
              <div class="sp-loading-spinner"></div>
              <span>Generating preview...</span>
            </div>`
          ) : 
          ''
        }
      `;
      
      block.addEventListener('click', () => openCustomizer(positionKey));
      container.appendChild(block);
    });
  }
  
  // Remove position function
  function removePosition(positionKey) {
    console.log('🗑️ Removing position:', positionKey);
    
    // Prevent event bubbling to avoid opening customizer
    event.stopPropagation();
    
    // Remove from selectedPositions array
    const index = selectedPositions.indexOf(positionKey);
    if (index > -1) {
      selectedPositions.splice(index, 1);
      console.log('✅ Removed from selectedPositions:', selectedPositions);
    }
    
    // Update global selectedPositions
    window.selectedPositions = selectedPositions;
    
    // Remove from positionData
    if (positionData[positionKey]) {
      delete positionData[positionKey];
      console.log('✅ Removed from positionData:', positionData);
    }
    
    // Update pricing system
    // Wait for PricingController to be available (it loads with defer)
    const waitToRemovePricing = () => {
      if (window.PricingController) {
        window.PricingController.removePositionData(positionKey);
        console.log('✅ Removed from pricing system');
      } else {
        setTimeout(waitToRemovePricing, 100);
      }
    };
    waitToRemovePricing();
    
    // Regenerate position blocks
    generatePositionBlocks();
    
    // Update selected count
    updateSelectedCount();
    
    // Update checkboxes in position popup to deselect the removed position
    updateCheckboxesFromSelection();
    console.log('✅ Updated position popup checkboxes - deselected:', positionKey);
    
    // Hide pricing section if no positions selected
    if (selectedPositions.length === 0) {
      const waitToHidePricing = () => {
        if (window.PricingController) {
          window.PricingController.hidePricingSection();
          console.log('✅ Pricing section hidden');
        } else {
          setTimeout(waitToHidePricing, 100);
        }
      };
      waitToHidePricing();
    }
    
    // Show success message
    showMessage(`✅ Removed ${POSITION_LABELS[positionKey].name} from selection`, 'success');
  }
  
  // Position popup functions
  function openPositionPopup() {
    const popup = document.getElementById('sp-position-popup');
    const button = document.getElementById('sp-position-selector-btn');
    
    if (popup && button) {
      popup.classList.add('show');
      button.classList.add('active');
      
      // Update visual states of checkboxes based on current selection
      const checkboxes = document.querySelectorAll('#sp-position-popup input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        updatePositionOptionState({ target: checkbox });
      });
    }
  }
  
  function closePositionPopup() {
    const popup = document.getElementById('sp-position-popup');
    const button = document.getElementById('sp-position-selector-btn');
    
    if (popup && button) {
      popup.classList.remove('show');
      button.classList.remove('active');
    }
  }
  
  function updateSelectionFromCheckboxes() {
    const checkboxes = document.querySelectorAll('#sp-position-popup input[type="checkbox"]');
    selectedPositions = [];
    
    if (checkboxes.length === 0) {
      selectedPositions = [];
      window.selectedPositions = selectedPositions; // Update global reference
      return;
    }
    
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        selectedPositions.push(checkbox.value);
      }
    });
    
    // Update global reference
    window.selectedPositions = selectedPositions;
    
    // Update the count display immediately
    updateSelectedCount();
  }
  
  function updateCheckboxesFromSelection() {
    const checkboxes = document.querySelectorAll('#sp-position-popup input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const shouldBeChecked = selectedPositions.includes(checkbox.value);
      checkbox.checked = shouldBeChecked;
      updatePositionOptionState({ target: checkbox });
    });
  }
  
  function updatePositionOptionState(event) {
    const checkbox = event.target;
    const option = checkbox.closest('.sp-position-option');
    
    if (checkbox.checked) {
      option.classList.add('checked');
    } else {
      option.classList.remove('checked');
    }
  }
  
  function showInitialState() {
    // Clear any existing position blocks
    const container = document.getElementById('sp-positions-container');
    if (container) {
      container.innerHTML = '';
    }
    
    // Update button text
    const countElement = document.getElementById('sp-selected-count');
    if (countElement) {
      countElement.textContent = 'Click to Select Positions';
    }
    
    // Order summary removed - using pricing system instead
  }
  
  function applyPositionSelection() {
    // Update selection from checkboxes (absolute source of truth)
    updateSelectionFromCheckboxes();
    
    // Ensure at least one position is selected
    if (selectedPositions.length === 0) {
      alert('Please select at least one position.');
      return;
    }
    
    // Mark as initialized
    hasInitialized = true;
    
    // Remove highlighted class
    const button = document.getElementById('sp-position-selector-btn');
    if (button) {
      button.classList.remove('sp-highlighted');
    }
    
    
    updateSelectedCount();
    generatePositionBlocks();
    // updateOrderSummary(); // Removed order summary
    
    // Show pricing section when positions are selected
    // Wait for PricingController to be available (it loads with defer)
    const waitToShowPricing = () => {
      if (window.PricingController) {
        window.PricingController.showPricingSection();
        console.log('✅ Pricing section shown');
      } else {
        setTimeout(waitToShowPricing, 100);
      }
    };
    waitToShowPricing();
    
    // Position selection updated
    
    closePositionPopup();
  }
  
  function updateSelectedCount() {
    const countElement = document.getElementById('sp-selected-count');
    if (countElement) {
      const count = selectedPositions.length;
      countElement.textContent = `${count} Position${count !== 1 ? 's' : ''} Selected`;
    }
  }
  
  
  // Open customizer for position
  function openCustomizer(position) {
    console.log('🎯 Opening customizer for position:', position);
    currentEditingPosition = position;
    const modal = document.getElementById('sp-dtf-modal');
    const modalTitle = document.getElementById('sp-modal-title');
    const modalBody = document.getElementById('sp-modal-body');
    
    if (!modal || !modalTitle || !modalBody) {
      console.error('❌ Modal elements not found');
      return;
    }
    
    modalTitle.innerHTML = `<i class="fas fa-palette"></i> DTF Customizer - ${POSITION_LABELS[position].name}`;
    modalBody.innerHTML = '<div style="text-align: center; padding: 50px;">Loading customizer...</div>';
    
    modal.style.display = 'flex';
    console.log('✅ Modal displayed');
    
    // Load the DTF customizer here
    loadDTFCustomizer(position);
    
    // If there's already an image loaded, populate size controls after a delay
    setTimeout(() => {
      if (window.originalDimensions) {
        console.log('🔄 Modal opened with existing dimensions, populating size controls');
        updateSizeControls(
          window.originalDimensions.widthIn, 
          window.originalDimensions.heightIn, 
          window.originalDimensions.widthPx, 
          window.originalDimensions.heightPx
        );
      }
    }, 500);
  }
  
  // Load DTF customizer
  function loadDTFCustomizer(position) {
    console.log('🔄 Loading DTF customizer for position:', position);
    currentEditingPosition = position;
    
    const modalBody = document.getElementById('sp-modal-body');
    
    if (!modalBody) {
      console.error('❌ Modal body not found');
      return;
    }
    
    // Check if we're editing an existing design
    const isEditing = positionData[position] && positionData[position].completed;
    
    // Load the complete DTF customizer HTML content
    modalBody.innerHTML = `
      <div class="dtf-customizer-container">
        <!-- Main Content -->
        <div class="dtf-main">
          <!-- Integrated Progress Bar -->
          <div id="dtf-progress-bar" class="dtf-progress-bar" style="display: none;">
            <div class="dtf-progress-bar-fill"></div>
            <div class="dtf-progress-bar-content">
              <span class="dtf-progress-icon"></span>
              <span class="dtf-progress-text"></span>
            </div>
          </div>
          <!-- Left: Preview Section -->
          <div class="dtf-preview-section">
            <h3><i class="fas fa-image"></i> Design Preview</h3>
            <div id="dtf-preview">
              <div id="dtf-preview-placeholder" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6c757d;">
                Upload your design to see preview
              </div>
              
              <!-- Color Analysis Loader -->
              <div id="dtf-color-loader" class="dtf-color-loader" style="display: none;">
                <div class="dtf-loader-content">
                  <div class="dtf-loader-spinner">
                    <div class="dtf-spinner-ring"></div>
                    <div class="dtf-spinner-ring"></div>
                    <div class="dtf-spinner-ring"></div>
                  </div>
                  <div class="dtf-loader-text">
                    <div class="dtf-loader-title">Analyzing Colors</div>
                    <div class="dtf-loader-status" id="dtf-loader-status">Initializing...</div>
                    <div class="dtf-loader-details" id="dtf-loader-details"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Zoom Controls -->
            <div class="dtf-zoom-controls">
              <button id="dtf-zoom-out" class="dtf-zoom-btn" title="Zoom Out">
                <i class="fas fa-search-minus"></i>
              </button>
              <button id="dtf-zoom-fit" class="dtf-zoom-btn" title="Fit to Screen">
                <i class="fas fa-expand-arrows-alt"></i>
              </button>
              <button id="dtf-zoom-in" class="dtf-zoom-btn" title="Zoom In">
                <i class="fas fa-search-plus"></i>
              </button>
              <span id="dtf-zoom-level" class="dtf-zoom-level">100%</span>
            </div>
            
            <!-- Permanent Download Preview Button -->
            <div id="dtf-permanent-download-section" class="dtf-permanent-download-section" style="display: none;">
              <button id="dtf-permanent-download-btn" class="dtf-permanent-download-btn" onclick="downloadPreviewImage()">
                <i class="fas fa-download"></i> Download Preview
            </button>
            </div>
            
          </div>
          
          <!-- Right: Controls -->
          <div class="dtf-controls">
            <!-- File Upload Block -->
            <div class="dtf-block">
              <div class="dtf-block-header">
                <h3><i class="fas fa-upload"></i> Upload Design</h3>
              </div>
              <div class="dtf-block-content">
                <div class="dtf-file-upload">
                  <input type="file" id="dtf-file-input" accept="image/*" style="display: none;">
                  <label for="dtf-file-input" id="dtf-file-label">
                    <i class="fas fa-cloud-upload-alt"></i> Choose Image File
                  </label>
                  <p class="dtf-upload-hint">
                    <i class="fas fa-info-circle"></i> Supported: PNG, JPG, JPEG (Max 10MB)
                  </p>
                </div>
                
                <!-- New Design Checkbox -->
                <div class="dtf-new-design-section">
                  <label class="dtf-new-design-checkbox">
                    <input type="checkbox" id="dtf-new-design-checkbox" data-position="${position}">
                    <span class="dtf-new-design-mark"></span>
                    <span class="dtf-new-design-label">New Design (+$25 setup charge)</span>
                  </label>
                  <p class="dtf-new-design-hint">
                    <i class="fas fa-info-circle"></i> Check this if this design has never been ordered before
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Background Removal Block -->
            <div class="dtf-block">
              <div class="dtf-block-header">
                <h3><i class="fas fa-cut"></i> Background Removal</h3>
              </div>
              <div class="dtf-block-content">
                <div class="dtf-bg-status">
                  <div class="dtf-status-item" id="dtf-bg-status" style="display: none;">
                    <span class="dtf-label">Status:</span>
                    <span class="dtf-value" id="dtf-bg-status-text"></span>
                  </div>
                  <div class="dtf-status-item" id="dtf-bg-details" style="display: none;">
                    <span class="dtf-label">Details:</span>
                    <span class="dtf-value" id="dtf-bg-details-text"></span>
                  </div>
                </div>
                <div class="dtf-bg-controls">
                  <button id="dtf-remove-bg">Remove Background (OpenCV)</button>
                </div>
                <p style="text-align: center; margin-top: 15px; color: #6c757d; font-size: 0.9rem;">
                  Remove background using OpenCV processing
                </p>
              </div>
            </div>
            
            <!-- Color Customization Block -->
            <div class="dtf-block">
              <div class="dtf-block-header">
                <h3><i class="fas fa-palette"></i> Color Customization</h3>
                <button id="dtf-reanalyze-colors" class="dtf-reanalyze-btn">
                  <i class="fas fa-sync-alt"></i> Re-analyze Colors
                </button>
              </div>
              <div class="dtf-block-content">
                <!-- Color Picker Layout -->
                <div class="dtf-color-picker-container">
                  <!-- Section 1: Choose which color to change -->
                  <div class="dtf-fetched-colors-section">
                    <div class="dtf-section-title">Choose which color to change</div>
                    <div class="dtf-fetched-colors" id="dtf-fetched-colors">
                      <p class="dtf-no-colors">Upload a design to see detected colors</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Size & PPI Block -->
            <div class="dtf-block">
              <div class="dtf-block-header">
                <h3><i class="fas fa-ruler"></i> Size & PPI</h3>
              </div>
              <div class="dtf-block-content">
                <div class="dtf-ppi-control">
                  <label for="dtf-ppi-input">
                    <i class="fas fa-cog"></i> PPI (Pixels Per Inch):
                  </label>
                  <input type="number" id="dtf-ppi-input" value="300" min="72" max="600" step="1">
                </div>
                
                                  
                <!-- Size Controls -->
                <div class="dtf-size-controls">
                  <div class="dtf-size-field">
                    <label for="dtf-size-width">
                      <i class="fas fa-arrows-alt-h"></i>
                      Width
                    </label>
                    <input type="number" id="dtf-size-width" min="0.1" step="0.01" value="0">
                  </div>
                  
                  <div class="dtf-size-field">
                    <label for="dtf-size-height">
                      <i class="fas fa-arrows-alt-v"></i>
                      Height
                    </label>
                    <input type="number" id="dtf-size-height" min="0.1" step="0.01" value="0">
                  </div>
                  
                  <select id="dtf-size-units" class="dtf-units-select" title="Units">
                    <option value="in">in</option>
                    <option value="mm">mm</option>
                    <option value="px">px</option>
                  </select>
                  
                  <div class="dtf-size-actions">
                    <button id="dtf-aspect-toggle" class="dtf-icon-btn secondary" title="Lock/Unlock Aspect Ratio">
                      <i class="fas fa-lock"></i>
                    </button>
                    <button id="dtf-apply-size" class="dtf-icon-btn primary" title="Apply Size">
                      <i class="fas fa-check"></i>
                  </button>
                  </div>
                </div>
                
              </div>
            </div>
  </div>

</div>
        
        <!-- Save Button for Multi-Position -->
        <div class="dtf-save-section">
          <button id="dtf-save-design" class="dtf-save-btn">
            <i class="fas fa-save"></i> Save Design for ${POSITION_LABELS[position].name}
          </button>
        </div>
      </div>
      
      <!-- Color Edit Popup (required for color editing functionality) -->
      <div id="color-edit-popup" class="color-edit-popup" style="display: none;">
        <div class="color-popup-content">
          <div class="color-popup-header">
            <h3><i class="fas fa-palette"></i> Choose a new color</h3>
            <button class="color-popup-close" onclick="closeColorPopup()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="color-popup-body">
            <!-- Current Color Preview -->
            <div class="color-preview-section">
              <div class="color-preview-box" id="color-preview-box"></div>
              <div class="color-preview-info">
                <div class="color-preview-hex" id="color-hex-input"></div>
                <div class="color-preview-rgb" id="color-rgb-input"></div>
              </div>
            </div>
            
            <!-- Color Palette Grid -->
            <div class="color-palette-section">
              <h4>Available Colors</h4>
              <div class="color-palette-grid" id="color-palette-grid">
                <!-- Palette colors will be populated here -->
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="color-popup-actions">
              <button class="color-popup-cancel" onclick="closeColorPopup()">
                <i class="fas fa-times"></i> Cancel
              </button>
              <button class="color-popup-apply" onclick="saveColorChange()">
                <i class="fas fa-check"></i> Apply Color
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    console.log('✅ DTF customizer HTML loaded');
    
    // Load the complete DTF customizer JavaScript
    loadCompleteDTFJavaScript();
    
    // Add event listeners for close button
    setTimeout(() => {
      const modalCloseBtn = document.getElementById('sp-modal-close');
      
      if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeDTFModal);
        console.log('✅ Added event listener to modal close button');
      }
      
      // Set up new design checkbox listener
      const newDesignCheckbox = document.getElementById('dtf-new-design-checkbox');
      if (newDesignCheckbox) {
        newDesignCheckbox.addEventListener('change', handleNewDesignCheckboxChange);
        console.log('✅ New design checkbox listener added');
      } else {
        console.log('⚠️ New design checkbox not found after customizer load');
      }
    }, 100);
  }
  
  // Handle new design checkbox change
  function handleNewDesignCheckboxChange(event) {
    const checkbox = event.target;
    const position = checkbox.getAttribute('data-position');
    const isNewDesign = checkbox.checked;
    
    console.log(`🆕 New design checkbox changed for ${position}:`, isNewDesign);
    
  }

  // Load complete DTF customizer JavaScript functionality
  function loadCompleteDTFJavaScript() {
    console.log('🔄 Loading DTF customizer JavaScript functionality');
    
    // Since we don't have the external DTF customizer JS file in Shopify,
    // we need to create the essential functions that the customizer needs
    
         // Create a comprehensive loadImageFromFile function that integrates with DTF customizer
     window.loadImageFromFile = function(file) {
       console.log('🔄 loadImageFromFile called with file:', file);
       
       if (!file) {
         console.error('❌ No file provided to loadImageFromFile');
         return;
       }
       
       const reader = new FileReader();
       reader.onload = function(e) {
         const img = new Image();
         img.onload = function() {
           console.log('✅ Image loaded in loadImageFromFile, dimensions:', img.width, 'x', img.height);
           
           // Initialize DTF state if it doesn't exist
           if (!window.state) {
             window.state = {
               image: null,
               originalImage: null,
               hasImage: false,
               useLocalBackend: false
             };
           }
           
                          // Set the image in the state
               window.state.image = img;
               window.state.originalImage = img;
               window.state.hasImage = true;
               
               // Calculate and set the original aspect ratio
               window.state.originalAspect = img.width / img.height;
               console.log('✅ Set window.state.image in loadImageFromFile, aspect ratio:', window.state.originalAspect);
               
               // Also set simple aspect ratio for the simple handler
               if (window.aspectState) {
                 window.aspectState.ratio = img.width / img.height;
                 console.log('✅ Set window.aspectState.ratio:', window.aspectState.ratio);
               }
           
           // Also set DTF_STATE if it exists
           if (window.DTF_STATE) {
             window.DTF_STATE.image = img;
             window.DTF_STATE.originalImage = img;
             window.DTF_STATE.hasImage = true;
             console.log('✅ Set window.DTF_STATE.image in loadImageFromFile');
           }
           
           // Update the preview canvas
           const canvas = document.getElementById('dtf-preview-canvas');
           if (canvas) {
             const ctx = canvas.getContext('2d');
             canvas.width = img.width;
             canvas.height = img.height;
             ctx.drawImage(img, 0, 0);
             console.log('✅ Updated preview canvas in loadImageFromFile');
           }
           
           // Call DTF customizer functions if they exist
           if (window.updatePreview && typeof window.updatePreview === 'function') {
             window.updatePreview();
             console.log('✅ Called window.updatePreview');
           }
           
           if (window.updatePrintSize && typeof window.updatePrintSize === 'function') {
             window.updatePrintSize(img);
             console.log('✅ Called window.updatePrintSize');
           }
           
           if (window.extractColorsWithPalette && typeof window.extractColorsWithPalette === 'function') {
             window.extractColorsWithPalette();
             console.log('✅ Called window.extractColorsWithPalette');
           }
           
           // Update download button
           if (window.updateDownloadButton && typeof window.updateDownloadButton === 'function') {
             window.updateDownloadButton();
           }
           
           // Show and update dimensions section
           showDimensionsSection(img);
           
           console.log('✅ loadImageFromFile completed successfully');
         };
         img.src = e.target.result;
       };
       reader.readAsDataURL(file);
     };
    
             // Create a basic updateDownloadButton function
         window.updateDownloadButton = function() {
           console.log('🔄 updateDownloadButton called');
           const downloadBtn = document.getElementById('dtf-download-btn');
           if (downloadBtn) {
             downloadBtn.style.display = 'block';
             console.log('✅ Download button shown');
           }
         };
         
         // Function to update dimensions section
         window.showDimensionsSection = function(img) {
           console.log('🔄 Updating dimensions section for image:', img.width, 'x', img.height);
           
           const dimensionsSection = document.getElementById('dtf-dimensions');
           if (!dimensionsSection) {
             console.warn('⚠️ Dimensions section not found');
             return;
           }
           
           // Calculate dimensions in different units
           const widthPx = img.width;
           const heightPx = img.height;
           const widthIn = (widthPx / 300).toFixed(2); // Assuming 300 DPI
           const heightIn = (heightPx / 300).toFixed(2);
           const widthMm = (widthIn * 25.4).toFixed(1);
           const heightMm = (heightIn * 25.4).toFixed(1);
           const aspectRatio = (widthPx / heightPx).toFixed(2);
           
           // Store original dimensions for reference
           window.originalDimensions = {
             widthPx, heightPx, widthIn, heightIn, widthMm, heightMm, aspectRatio
           };
           
           // Update the size controls with detected dimensions (with delay to ensure elements are rendered)
           console.log('🔄 About to call updateSizeControls with:', { widthIn, heightIn, widthPx, heightPx });
           
           // Try multiple times with increasing delays
           setTimeout(() => {
             console.log('🔄 Calling updateSizeControls after 100ms timeout');
             updateSizeControls(widthIn, heightIn, widthPx, heightPx);
           }, 100);
           
           setTimeout(() => {
             console.log('🔄 Calling updateSizeControls after 500ms timeout');
             updateSizeControls(widthIn, heightIn, widthPx, heightPx);
           }, 500);
           
           setTimeout(() => {
             console.log('🔄 Calling updateSizeControls after 1000ms timeout');
             updateSizeControls(widthIn, heightIn, widthPx, heightPx);
           }, 1000);
           
           // Update the dimensions content
           const dimensionsContent = dimensionsSection.querySelector('.dimensions-content');
           if (dimensionsContent) {
             dimensionsContent.innerHTML = `
               <div class="dimension-item" style="animation-delay: 0.1s;">
                 <div class="dimension-label">
                   <i class="fas fa-arrows-alt-h"></i>
                   Width
               </div>
                 <div class="dimension-inputs">
                   <div class="dimension-input-group">
                     <div class="dimension-input-label">Pixels</div>
                     <input type="number" class="dimension-input" id="width-px" value="${widthPx}" min="1" max="10000">
                     <span class="dimension-unit">px</span>
               </div>
                   <div class="dimension-input-group">
                     <div class="dimension-input-label">Inches</div>
                     <input type="number" class="dimension-input" id="width-in" value="${widthIn}" min="0.1" max="50" step="0.1">
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
                     <input type="number" class="dimension-input" id="height-px" value="${heightPx}" min="1" max="10000">
                     <span class="dimension-unit">px</span>
                   </div>
                   <div class="dimension-input-group">
                     <div class="dimension-input-label">Inches</div>
                     <input type="number" class="dimension-input" id="height-in" value="${heightIn}" min="0.1" max="50" step="0.1">
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
                 <div class="dimension-value">${aspectRatio}:1</div>
               </div>
               
               <div class="dimension-item" style="animation-delay: 0.4s;">
                 <div class="dimension-label">
                   <i class="fas fa-info-circle"></i>
                   Total Pixels
                 </div>
                 <div class="dimension-value">${(widthPx * heightPx).toLocaleString()}</div>
               </div>
             `;
             
             // Add event listeners for dimension inputs
             setupDimensionInputListeners();
           }
           
           console.log('✅ Dimensions section updated with image data');
         };
         
         // Function to setup dimension input listeners
         function setupDimensionInputListeners() {
           const widthPxInput = document.getElementById('width-px');
           const widthInInput = document.getElementById('width-in');
           const widthMmInput = document.getElementById('width-mm');
           const heightPxInput = document.getElementById('height-px');
           const heightInInput = document.getElementById('height-in');
           const heightMmInput = document.getElementById('height-mm');
           
           if (!widthPxInput || !widthInInput || !widthMmInput || !heightPxInput || !heightInInput || !heightMmInput) {
             console.warn('⚠️ Dimension inputs not found');
             return;
           }
           
           // Width conversions
           widthPxInput.addEventListener('input', () => {
             const pxValue = parseFloat(widthPxInput.value) || 0;
             const inValue = (pxValue / 300).toFixed(2);
             const mmValue = (inValue * 25.4).toFixed(1);
             
             widthInInput.value = inValue;
             widthMmInput.value = mmValue;
             
             updateAspectRatio();
           });
           
           widthInInput.addEventListener('input', () => {
             const inValue = parseFloat(widthInInput.value) || 0;
             const pxValue = Math.round(inValue * 300);
             const mmValue = (inValue * 25.4).toFixed(1);
             
             widthPxInput.value = pxValue;
             widthMmInput.value = mmValue;
             
             updateAspectRatio();
           });
           
           widthMmInput.addEventListener('input', () => {
             const mmValue = parseFloat(widthMmInput.value) || 0;
             const inValue = (mmValue / 25.4).toFixed(2);
             const pxValue = Math.round(inValue * 300);
             
             widthPxInput.value = pxValue;
             widthInInput.value = inValue;
             
             updateAspectRatio();
           });
           
           // Height conversions
           heightPxInput.addEventListener('input', () => {
             const pxValue = parseFloat(heightPxInput.value) || 0;
             const inValue = (pxValue / 300).toFixed(2);
             const mmValue = (inValue * 25.4).toFixed(1);
             
             heightInInput.value = inValue;
             heightMmInput.value = mmValue;
             
             updateAspectRatio();
           });
           
           heightInInput.addEventListener('input', () => {
             const inValue = parseFloat(heightInInput.value) || 0;
             const pxValue = Math.round(inValue * 300);
             const mmValue = (inValue * 25.4).toFixed(1);
             
             heightPxInput.value = pxValue;
             heightMmInput.value = mmValue;
             
             updateAspectRatio();
           });
           
           heightMmInput.addEventListener('input', () => {
             const mmValue = parseFloat(heightMmInput.value) || 0;
             const inValue = (mmValue / 25.4).toFixed(2);
             const pxValue = Math.round(inValue * 300);
             
             heightPxInput.value = pxValue;
             heightInInput.value = inValue;
             
             updateAspectRatio();
           });
           
           console.log('✅ Dimension input listeners setup complete');
         }
         
         // Function to update aspect ratio and total pixels
         function updateAspectRatio() {
           const widthPx = parseFloat(document.getElementById('width-px')?.value) || 0;
           const heightPx = parseFloat(document.getElementById('height-px')?.value) || 0;
           
           if (widthPx > 0 && heightPx > 0) {
             const aspectRatio = (widthPx / heightPx).toFixed(2);
             const totalPixels = (widthPx * heightPx).toLocaleString();
             
             // Update aspect ratio display
             const aspectRatioItem = document.querySelector('.dimension-item:nth-child(3) .dimension-value');
             if (aspectRatioItem) {
               aspectRatioItem.textContent = `${aspectRatio}:1`;
             }
             
             // Update total pixels display
             const totalPixelsItem = document.querySelector('.dimension-item:nth-child(4) .dimension-value');
             if (totalPixelsItem) {
               totalPixelsItem.textContent = totalPixels;
             }
           }
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
         
         // Global function to manually populate size controls (for testing)
         window.populateSizeControls = function(widthIn = 5.0, heightIn = 3.0) {
           console.log('🧪 Manual size controls population:', { widthIn, heightIn });
           const widthPx = widthIn * 300;
           const heightPx = heightIn * 300;
           updateSizeControls(widthIn, heightIn, widthPx, heightPx);
         };
         
         // Global function to force populate size controls with current dimensions
         window.forcePopulateSizeControls = function() {
           if (window.originalDimensions) {
             console.log('🧪 Force populating size controls with stored dimensions:', window.originalDimensions);
             updateSizeControls(
               window.originalDimensions.widthIn, 
               window.originalDimensions.heightIn, 
               window.originalDimensions.widthPx, 
               window.originalDimensions.heightPx
             );
           } else {
             console.warn('⚠️ No original dimensions found. Use populateSizeControls(width, height) instead.');
           }
         };
         
         // Global function to check if size control elements exist
         window.checkSizeControls = function() {
           const widthInput = document.getElementById('dtf-size-width');
           const heightInput = document.getElementById('dtf-size-height');
           const unitsSelect = document.getElementById('dtf-size-units');
           
           console.log('🔍 Size control elements check:', {
             widthInput: !!widthInput,
             heightInput: !!heightInput,
             unitsSelect: !!unitsSelect,
             widthInputValue: widthInput ? widthInput.value : 'N/A',
             heightInputValue: heightInput ? heightInput.value : 'N/A',
             unitsSelectValue: unitsSelect ? unitsSelect.value : 'N/A'
           });
           
           return {
             widthInput: !!widthInput,
             heightInput: !!heightInput,
             unitsSelect: !!unitsSelect
           };
         };
         
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
         
         // Function to reset dimensions section to empty state
         window.resetDimensionsSection = function() {
           const dimensionsSection = document.getElementById('dtf-dimensions');
           if (!dimensionsSection) {
             return;
           }
           
           // Reset size controls
           const widthInput = document.getElementById('dtf-size-width');
           const heightInput = document.getElementById('dtf-size-height');
           const unitsSelect = document.getElementById('dtf-size-units');
           
           if (widthInput && heightInput && unitsSelect) {
             widthInput.value = 0;
             heightInput.value = 0;
             unitsSelect.value = 'in';
             console.log('✅ Size controls reset');
           }
           
           const dimensionsContent = dimensionsSection.querySelector('.dimensions-content');
           if (dimensionsContent) {
             dimensionsContent.innerHTML = `
               <div class="empty-state">
                 <i class="fas fa-upload"></i>
                 Upload an image to see dimensions
               </div>
             `;
           }
           console.log('✅ Dimensions section reset to empty state');
         };
         
         // Initialize aspect ratio functionality
         if (!window.state) {
           window.state = {
             image: null,
             colorMatches: [],
             zoom: 1,
             pan: { x: 0, y: 0 },
             ppi: 300,
             isDragging: false,
             lastMousePos: { x: 0, y: 0 },
             selectedFetchedColor: null,
             useLocalBackend: false
           };
         }
         
         // State for sizing (exact copy from main tool)
         window.state.sizeUnits = 'in';
         window.state.aspectLocked = true;
         window.state.originalAspect = null;
         
         // Function to handle size field changes with aspect ratio (exact copy from main tool)
         window.onSizeFieldChanged = function(changed) {
           console.log('🔄 onSizeFieldChanged called with:', changed);
           console.log('🔍 Current state:', window.state);
           
           if (!window.state) {
             console.error('❌ window.state not found!');
             return;
           }
           
           if (!window.state.aspectLocked || !window.state.originalAspect) {
             console.log('🔓 Aspect ratio is unlocked or originalAspect not set');
             return;
           }
           
           const wEl = document.getElementById('dtf-size-width');
           const hEl = document.getElementById('dtf-size-height');
           if (!wEl || !hEl) {
             console.error('❌ Width or height input not found!');
             return;
           }
           
           const wVal = parseFloat(wEl.value) || 0;
           const hVal = parseFloat(hEl.value) || 0;
           
           console.log('📏 Current values - Width:', wVal, 'Height:', hVal);
           console.log('📐 Original aspect ratio:', window.state.originalAspect);
           console.log('📐 Size units:', window.state.sizeUnits);
           
           if (changed === 'width') {
             if (window.state.sizeUnits === 'px') {
               const newHeight = Math.max(0.1, (wVal / window.state.originalAspect)).toFixed(2);
               console.log('📏 Calculating new height (px):', newHeight);
               hEl.value = newHeight;
             } else {
               // convert to inches then compute
               const wIn = window.state.sizeUnits === 'mm' ? wVal / 25.4 : wVal;
               const hIn = wIn / window.state.originalAspect;
               const newHeight = Number((window.state.sizeUnits === 'mm' ? hIn * 25.4 : hIn).toFixed(2));
               console.log('📏 Calculating new height (in/mm):', newHeight);
               hEl.value = newHeight;
             }
           } else if (changed === 'height') {
             if (window.state.sizeUnits === 'px') {
               const newWidth = Math.max(0.1, (hVal * window.state.originalAspect)).toFixed(2);
               console.log('📏 Calculating new width (px):', newWidth);
               wEl.value = newWidth;
             } else {
               const hIn = window.state.sizeUnits === 'mm' ? hVal / 25.4 : hVal;
               const wIn = hIn * window.state.originalAspect;
               const newWidth = Number((window.state.sizeUnits === 'mm' ? wIn * 25.4 : wIn).toFixed(2));
               console.log('📏 Calculating new width (in/mm):', newWidth);
               wEl.value = newWidth;
             }
           }
         };
         
         // Function to update size inputs from image
         window.updateSizeInputsFromImage = function() {
           if (!window.state || !window.state.image) return;
           
           const widthIn = window.state.image.width / window.state.ppi;
           const heightIn = window.state.image.height / window.state.ppi;
           let w = widthIn, h = heightIn;
           
           if (window.state.sizeUnits === 'mm') { 
             w = widthIn * 25.4; 
             h = heightIn * 25.4; 
           }
           if (window.state.sizeUnits === 'px') { 
             w = window.state.image.width; 
             h = window.state.image.height; 
           }
           
           const wEl = document.getElementById('dtf-size-width');
           const hEl = document.getElementById('dtf-size-height');
           if (wEl) wEl.value = Number(w.toFixed(2));
           if (hEl) hEl.value = Number(h.toFixed(2));
         };
    
             // Simple aspect ratio setup - direct approach
         setTimeout(() => {
           console.log('🔧 Setting up aspect ratio controls (simple approach)...');
           
           // Initialize simple state
           if (!window.aspectState) {
             window.aspectState = {
               locked: true,
               ratio: null
             };
           }
           
           const aspectBtn = document.getElementById('dtf-aspect-toggle');
           const widthInput = document.getElementById('dtf-size-width');
           const heightInput = document.getElementById('dtf-size-height');
           
           console.log('🔍 Found elements:', {
             aspectBtn: !!aspectBtn,
             widthInput: !!widthInput,
             heightInput: !!heightInput
           });
           
           // Simple aspect ratio toggle
           if (aspectBtn) {
             console.log('✅ Adding click listener to aspect button');
             aspectBtn.addEventListener('click', function() {
               console.log('🔒 Aspect button clicked!');
               window.aspectState.locked = !window.aspectState.locked;
               
               // Update icon and classes
               if (window.aspectState.locked) {
                 aspectBtn.innerHTML = '<i class="fas fa-lock"></i>';
                 aspectBtn.classList.remove('unlocked');
                 aspectBtn.classList.add('locked');
               } else {
                 aspectBtn.innerHTML = '<i class="fas fa-unlock"></i>';
                 aspectBtn.classList.remove('locked');
                 aspectBtn.classList.add('unlocked');
               }
               
               console.log('🔒 Aspect ratio', window.aspectState.locked ? 'locked' : 'unlocked');
               
               // Enhanced visual feedback
               aspectBtn.style.transform = 'scale(1.2)';
               setTimeout(() => aspectBtn.style.transform = 'scale(1)', 300);
               
               // Add pulse effect
               aspectBtn.style.animation = 'pulseGlow 0.6s ease-out';
               setTimeout(() => aspectBtn.style.animation = '', 600);
             });
           }
           
           // Simple width change handler
           if (widthInput) {
             console.log('✅ Adding input listener to width field');
             widthInput.addEventListener('input', function() {
               console.log('📏 Width changed to:', this.value);
               
               // Add visual feedback
               this.parentElement.style.borderColor = '#667eea';
               this.parentElement.style.transform = 'translateY(-1px)';
               this.parentElement.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
               
               if (window.aspectState.locked && window.aspectState.ratio) {
                 const newHeight = (parseFloat(this.value) / window.aspectState.ratio).toFixed(2);
                 console.log('📏 Auto-updating height to:', newHeight);
                 heightInput.value = newHeight;
                 
                 // Add visual feedback to height field
                 heightInput.parentElement.style.borderColor = '#28a745';
                 heightInput.parentElement.style.transform = 'translateY(-1px)';
                 heightInput.parentElement.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.15)';
               }
               
               // Reset visual feedback after animation
               setTimeout(() => {
                 this.parentElement.style.borderColor = '#e9ecef';
                 this.parentElement.style.transform = 'translateY(0)';
                 this.parentElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                 if (heightInput.parentElement) {
                   heightInput.parentElement.style.borderColor = '#e9ecef';
                   heightInput.parentElement.style.transform = 'translateY(0)';
                   heightInput.parentElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                 }
               }, 1000);
             });
           }
           
           // Simple height change handler
           if (heightInput) {
             console.log('✅ Adding input listener to height field');
             heightInput.addEventListener('input', function() {
               console.log('📏 Height changed to:', this.value);
               
               // Add visual feedback
               this.parentElement.style.borderColor = '#667eea';
               this.parentElement.style.transform = 'translateY(-1px)';
               this.parentElement.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
               
               if (window.aspectState.locked && window.aspectState.ratio) {
                 const newWidth = (parseFloat(this.value) * window.aspectState.ratio).toFixed(2);
                 console.log('📏 Auto-updating width to:', newWidth);
                 widthInput.value = newWidth;
                 
                 // Add visual feedback to width field
                 widthInput.parentElement.style.borderColor = '#28a745';
                 widthInput.parentElement.style.transform = 'translateY(-1px)';
                 widthInput.parentElement.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.15)';
               }
               
               // Reset visual feedback after animation
               setTimeout(() => {
                 this.parentElement.style.borderColor = '#e9ecef';
                 this.parentElement.style.transform = 'translateY(0)';
                 this.parentElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                 if (widthInput.parentElement) {
                   widthInput.parentElement.style.borderColor = '#e9ecef';
                   widthInput.parentElement.style.transform = 'translateY(0)';
                   widthInput.parentElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                 }
               }, 1000);
             });
           }
           
           // Units select handler to update unit displays
           const unitsSelect = document.getElementById('dtf-size-units');
           const widthUnitDisplay = document.getElementById('width-unit');
           const heightUnitDisplay = document.getElementById('height-unit');
           
           if (unitsSelect && widthUnitDisplay && heightUnitDisplay) {
             console.log('✅ Adding units select listener');
             unitsSelect.addEventListener('change', function() {
               const selectedUnit = this.value;
               console.log('📏 Units changed to:', selectedUnit);
               
               // Update unit displays
               widthUnitDisplay.textContent = selectedUnit;
               heightUnitDisplay.textContent = selectedUnit;
               
               // Add visual feedback
               this.style.transform = 'scale(1.05)';
               setTimeout(() => this.style.transform = 'scale(1)', 200);
               
               // Update window state if it exists
               if (window.aspectState) {
                 window.aspectState.units = selectedUnit;
               }
             });
           }
           
           // File input handler to set aspect ratio when new image is uploaded
           const fileInput = document.getElementById('dtf-file-input');
           if (fileInput) {
             console.log('✅ Adding file input listener');
             fileInput.addEventListener('change', function(e) {
               const file = e.target.files[0];
               if (file) {
                 console.log('📁 File selected:', file.name);
                 const reader = new FileReader();
                 reader.onload = function(e) {
                   const img = new Image();
                   img.onload = function() {
                     console.log('📸 New image loaded, dimensions:', img.width, 'x', img.height);
                     if (window.aspectState) {
                       window.aspectState.ratio = img.width / img.height;
                       console.log('✅ Set window.aspectState.ratio from file upload:', window.aspectState.ratio);
                     }
                   };
                   img.src = e.target.result;
                 };
                 reader.readAsDataURL(file);
               }
             });
           }
           
           console.log('✅ Simple aspect ratio controls initialized');
         }, 1000);
         
         // Initialize DTF customizer
         console.log('🔄 About to initialize DTF customizer...');
         initializeDTFCustomizer();
         console.log('✅ DTF customizer JavaScript functionality loaded');
         
         // Set up dimension control buttons
         setTimeout(() => {
           setupDimensionControlButtons();
         }, 1500);
         
         // Background removal button will be handled by Feature Extensions
  }
  
  // Wait for DTF customizer to be available
  function waitForDTFCustomizer(callback, maxAttempts = 10) {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.handleFileUpload && typeof window.handleFileUpload === 'function') {
        console.log('✅ DTF customizer functions available');
        clearInterval(checkInterval);
        callback();
      } else if (attempts >= maxAttempts) {
        console.error('❌ DTF customizer functions not available after', maxAttempts, 'attempts');
        clearInterval(checkInterval);
      } else {
        console.log('⏳ Waiting for DTF customizer functions...', attempts);
      }
    }, 500);
  }

  // Initialize DTF customizer with multi-position integration
  function initializeDTFCustomizer() {
    console.log('🔄 Initializing DTF customizer...');
    
    // Set up permanent download button
    setTimeout(() => {
      if (typeof window.setupPermanentDownloadButton === 'function') {
        window.setupPermanentDownloadButton();
      }
    }, 1000);
    
    // Set up DTF dimension control buttons
    setTimeout(() => {
      if (typeof window.setupDTFDimensionControlButtons === 'function') {
        window.setupDTFDimensionControlButtons();
      }
    }, 1200);
    
    // Wait for DTF customizer to be available
    waitForDTFCustomizer(() => {
      console.log('🔄 DTF customizer is ready, proceeding with initialization...');
      
      // Set up file input listener directly
      setTimeout(() => {
        const fileInput = document.getElementById('dtf-file-input');
        if (fileInput) {
          console.log('🔧 Setting up file input listener');
          fileInput.addEventListener('change', function(event) {
            console.log('📁 File input change event triggered:', event.target.files[0]);
            if (window.handleFileUpload && typeof window.handleFileUpload === 'function') {
              window.handleFileUpload(event);
            } else {
              console.error('❌ handleFileUpload function not available - DTF customizer JS not loaded');
            }
          });
        } else {
          console.error('❌ File input element not found');
        }
        
        // Set up zoom button event listeners
        const zoomInBtn = document.getElementById('dtf-zoom-in');
        const zoomOutBtn = document.getElementById('dtf-zoom-out');
        const zoomFitBtn = document.getElementById('dtf-zoom-fit');
        
        if (zoomInBtn) {
          zoomInBtn.addEventListener('click', () => {
            console.log('🔍 Zoom in clicked');
            if (window.zoomImage && typeof window.zoomImage === 'function') {
              window.zoomImage(1.15); // Smaller increment for smoother zoom
            } else {
              console.error('❌ zoomImage function not available');
            }
          });
          console.log('✅ Zoom in button listener added');
        }
        
        if (zoomOutBtn) {
          zoomOutBtn.addEventListener('click', () => {
            console.log('🔍 Zoom out clicked');
            if (window.zoomImage && typeof window.zoomImage === 'function') {
              window.zoomImage(0.85); // Smaller decrement for smoother zoom
            } else {
              console.error('❌ zoomImage function not available');
            }
          });
          console.log('✅ Zoom out button listener added');
        }
        
        if (zoomFitBtn) {
          zoomFitBtn.addEventListener('click', () => {
            console.log('🔍 Fit to screen clicked');
            if (window.fitImageToScreen && typeof window.fitImageToScreen === 'function') {
              window.fitImageToScreen();
            } else {
              console.error('❌ fitImageToScreen function not available');
            }
          });
          console.log('✅ Fit to screen button listener added');
        }
      }, 100);
    
    // Download button removed - no longer needed
    
    console.log('✅ DTF customizer initialized successfully');
    
    // Override the save button
    const saveBtn = document.getElementById('dtf-save-design');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        if (currentEditingPosition) {
          savePositionFromDTF(currentEditingPosition);
        }
      });
    }
    
    // Initialize the DTF customizer if the function exists
    if (window.init && typeof window.init === 'function') {
      window.init();
    }
    
    }); // Close the waitForDTFCustomizer callback
    
    // Load saved image if editing existing design
    if (isEditing && positionData[position].fileUrl) {
      console.log('🔄 Loading saved image for editing:', positionData[position].fileUrl);
      // Add a small delay to ensure DTF customizer is fully initialized
      setTimeout(() => {
        loadSavedImageForEditing(position);
        // Restore checkbox state
        restoreCheckboxState(position);
      }, 500);
    }
  }
  
  // Load saved image for editing
  async function loadSavedImageForEditing(position) {
    console.log('🔄 Loading saved image for editing position:', position);
    console.log('🔄 Current positionData:', positionData);
    console.log('🔄 Position data for position', position, ':', positionData[position]);
    
    try {
      const savedData = positionData[position];
      console.log('🔍 Saved data for position', position, ':', savedData);
      console.log('🔍 Saved data type:', typeof savedData);
      console.log('🔍 Saved data keys:', savedData ? Object.keys(savedData) : 'null');
      
      if (!savedData || !savedData.fileUrl) {
        console.error('❌ No saved data found for position:', position);
        console.error('❌ Available positions:', Object.keys(positionData));
        console.error('❌ Available position data:', positionData);
        return;
      }
      
      console.log('📸 Loading image from URL:', savedData.fileUrl);
      console.log('📸 URL type:', typeof savedData.fileUrl);
      console.log('📸 URL length:', savedData.fileUrl ? savedData.fileUrl.length : 'null');
      
      // Create a new image element
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS if needed
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('✅ Image loaded successfully, dimensions:', img.width, 'x', img.height);
          resolve();
        };
        img.onerror = (error) => {
          console.error('❌ Failed to load image:', error);
          reject(error);
        };
        img.src = savedData.fileUrl;
      });
      
      // Set the image in the DTF customizer state
      if (window.state) {
        window.state.image = img;
        window.state.originalImage = img;
        window.state.hasImage = true;
        
        // Calculate and set the original aspect ratio
        window.state.originalAspect = img.width / img.height;
        console.log('✅ Image set in window.state, aspect ratio:', window.state.originalAspect);
        
        // Also set simple aspect ratio for the simple handler
        if (window.aspectState) {
          window.aspectState.ratio = img.width / img.height;
          console.log('✅ Set window.aspectState.ratio in loadSavedImageForEditing:', window.aspectState.ratio);
        }
      } else {
        console.warn('⚠️ window.state not found, creating it');
        window.state = { 
          image: img,
          originalImage: img,
          hasImage: true,
          aspectLocked: true,
          originalAspect: img.width / img.height,
          sizeUnits: 'in'
        };
        console.log('✅ Created window.state with aspect ratio:', window.state.originalAspect);
      }
      
      // Also set in DTF_STATE if it exists
      if (window.DTF_STATE) {
        window.DTF_STATE.image = img;
        console.log('✅ Image set in window.DTF_STATE');
      }
      
      // Update the preview display
      const preview = document.getElementById('dtf-preview');
      if (preview) {
        // Clear existing content
        preview.innerHTML = '';
        
        // Create and add the image
        const previewImg = document.createElement('img');
        previewImg.src = savedData.fileUrl;
        previewImg.style.maxWidth = '100%';
        previewImg.style.maxHeight = '100%';
        previewImg.style.objectFit = 'contain';
        preview.appendChild(previewImg);
        
        console.log('✅ Preview updated with saved image');
      } else {
        console.error('❌ Preview element not found');
      }
      
      // Update download button
      if (window.updateDownloadButton && typeof window.updateDownloadButton === 'function') {
        window.updateDownloadButton();
      }
      
      // Show and update dimensions section
      showDimensionsSection(img);
      
      // Try to trigger DTF customizer's file loading mechanism
      if (window.loadImageFromFile && typeof window.loadImageFromFile === 'function') {
        console.log('🔄 Attempting to use DTF customizer file loading mechanism');
        try {
          // Convert image to blob and trigger file loading
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], 'saved-design.png', { type: 'image/png' });
              console.log('🔄 Calling window.loadImageFromFile with file:', file);
              window.loadImageFromFile(file);
              console.log('✅ Triggered DTF customizer file loading');
            } else {
              console.error('❌ Failed to create blob from canvas');
            }
          }, 'image/png');
        } catch (error) {
          console.warn('⚠️ Could not trigger DTF customizer file loading:', error);
        }
      } else {
        console.log('⚠️ window.loadImageFromFile function not available');
        console.log('⚠️ Available window functions:', Object.keys(window).filter(key => key.includes('load') || key.includes('image') || key.includes('file')));
      }
      
      // Also try to manually update the DTF customizer's canvas
      const dtfCanvas = document.getElementById('dtf-preview-canvas');
      if (dtfCanvas) {
        const dtfCtx = dtfCanvas.getContext('2d');
        dtfCanvas.width = img.width;
        dtfCanvas.height = img.height;
        dtfCtx.drawImage(img, 0, 0);
        console.log('✅ Manually updated DTF customizer canvas');
        
        // Try to call DTF customizer functions if they exist
        if (window.updatePreview && typeof window.updatePreview === 'function') {
          window.updatePreview();
          console.log('✅ Called window.updatePreview');
        }
        
        if (window.updatePrintSize && typeof window.updatePrintSize === 'function') {
          window.updatePrintSize(img);
          console.log('✅ Called window.updatePrintSize');
        }
        
        if (window.extractColorsWithPalette && typeof window.extractColorsWithPalette === 'function') {
          window.extractColorsWithPalette();
          console.log('✅ Called window.extractColorsWithPalette');
        }
      } else {
        console.log('⚠️ DTF customizer canvas not found');
      }
      
      // Show success message
      showMessage(`✅ Loaded saved ${POSITION_LABELS[position].name} design for editing`, 'success');
      
    } catch (error) {
      console.error('❌ Error loading saved image:', error);
      showMessage(`❌ Failed to load saved design: ${error.message}`, 'error');
    }
  }
  
  // Restore checkbox state when editing existing design
  function restoreCheckboxState(position) {
    console.log('🔄 Restoring checkbox state for position:', position);
    
    const savedData = positionData[position];
    if (!savedData) {
      console.log('⚠️ No saved data found for position:', position);
      return;
    }
    
    const newDesignCheckbox = document.getElementById('dtf-new-design-checkbox');
    if (newDesignCheckbox) {
      const isNewDesign = savedData.isNewDesign || false;
      newDesignCheckbox.checked = isNewDesign;
      console.log(`✅ Restored checkbox state for ${position}: isNewDesign = ${isNewDesign}`);
    } else {
      console.log('⚠️ New design checkbox not found');
    }
  }
  
  // Save position data from DTF customizer
  async function savePositionFromDTF(position) {
    console.log('🎯 savePositionFromDTF called for position:', position);
    console.log('🔍 Initial state check:');
    console.log('  - window.state exists:', !!window.state);
    console.log('  - window.DTF_STATE exists:', !!window.DTF_STATE);
    console.log('  - window.state.image exists:', !!(window.state && window.state.image));
    console.log('  - window.DTF_STATE.image exists:', !!(window.DTF_STATE && window.DTF_STATE.image));
    console.log('  - Canvas exists:', !!document.getElementById('dtf-preview-canvas'));
    console.log('  - Preview exists:', !!document.getElementById('dtf-preview'));
    
    let img = null;
    
    // First, try to get the current processed image from canvas (if any changes were made)
    const canvas = document.getElementById('dtf-preview-canvas');
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      console.log('🎨 Found canvas with content, dimensions:', canvas.width, 'x', canvas.height);
      // Convert canvas to image
      const canvasImg = new Image();
      canvasImg.src = canvas.toDataURL('image/png');
      img = canvasImg;
      console.log('✅ Using canvas image');
    } else {
      console.log('🎨 Canvas not found or has zero dimensions:', canvas ? `${canvas.width}x${canvas.height}` : 'not found');
    }
    
    // If no canvas or canvas is empty, try to get the original uploaded image
    if (!img) {
      console.log('🔄 No canvas content, looking for original image...');
      
      // Try to get from DTF customizer state (original uploaded image)
      if (window.state && window.state.image) {
        img = window.state.image;
        console.log('💾 Got original image from window.state:', img);
      }
      
      // Try to get from DTF_STATE
      if (!img && window.DTF_STATE && window.DTF_STATE.image) {
        img = window.DTF_STATE.image;
        console.log('💾 Got original image from window.DTF_STATE:', img);
      }
      
      // Try to get from DTF customizer's originalImage
      if (!img && window.state && window.state.originalImage) {
        img = window.state.originalImage;
        console.log('💾 Got original image from window.state.originalImage:', img);
      }
      
      // Try to find any image in the DTF customizer container
      if (!img) {
        const dtfContainer = document.querySelector('.sp-modal-body .dtf-customizer-container');
        if (dtfContainer) {
          const allImages = dtfContainer.querySelectorAll('img');
          console.log('🔍 Found', allImages.length, 'images in DTF container');
          if (allImages.length > 0) {
            img = allImages[0];
            console.log('✅ Using first image from DTF container:', img);
          }
        }
      }
      
      // Try to get from preview element
      if (!img) {
    const preview = document.getElementById('dtf-preview');
        if (preview) {
          const previewImg = preview.querySelector('img');
          if (previewImg) {
            img = previewImg;
            console.log('✅ Using image from preview element:', img);
          } else {
            console.log('🔍 Preview element found but no img inside');
          }
        } else {
          console.log('🔍 Preview element not found');
        }
      }
      
      // Try to get from file input (if user just uploaded)
    if (!img) {
        const fileInput = document.getElementById('dtf-file-input');
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
          console.log('📁 Found file in input, creating image from file');
          const file = fileInput.files[0];
          const reader = new FileReader();
          reader.onload = function(e) {
            const tempImg = new Image();
            tempImg.onload = function() {
              img = tempImg;
              console.log('✅ Created image from file input');
            };
            tempImg.src = e.target.result;
          };
          reader.readAsDataURL(file);
        } else {
          console.log('🔍 No file in input element');
        }
      }
    }
    
    if (!img) {
      console.log('❌ No image found after all attempts');
      console.log('🔍 Debugging image detection:');
      console.log('  - Canvas:', document.getElementById('dtf-preview-canvas'));
      console.log('  - window.state:', window.state);
      console.log('  - window.DTF_STATE:', window.DTF_STATE);
      console.log('  - DTF container images:', document.querySelectorAll('.sp-modal-body .dtf-customizer-container img').length);
      console.log('  - Preview images:', document.querySelectorAll('#dtf-preview img').length);
      console.log('  - All images in modal:', document.querySelectorAll('#sp-modal-body img').length);
      
      // Try one more time with a different approach
      const allImages = document.querySelectorAll('img');
      console.log('🔍 Found', allImages.length, 'total images on page');
      for (let i = 0; i < allImages.length; i++) {
        const testImg = allImages[i];
        if (testImg.src && testImg.src !== 'data:,' && testImg.width > 0 && testImg.height > 0) {
          console.log('✅ Found valid image at index', i, ':', testImg.src.substring(0, 50) + '...');
          img = testImg;
          break;
        }
      }
      
      if (!img) {
        alert('Please upload an image first!');
      return;
      }
    }
    
    // Validate image has dimensions
    let imgWidth = img.width || img.naturalWidth || 0;
    let imgHeight = img.height || img.naturalHeight || 0;
    
    console.log('📏 Image dimensions:', {
      width: imgWidth,
      height: imgHeight,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      src: img.src ? img.src.substring(0, 50) + '...' : 'no src'
    });
    
    // If image dimensions are 0, wait a bit for the image to load
    if (imgWidth === 0 || imgHeight === 0) {
      console.log('⏳ Image dimensions are 0, waiting for image to load...');
      
      // Wait for image to load if it's not complete
      if (!img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          // Timeout after 3 seconds
          setTimeout(resolve, 3000);
        });
      }
      
      // Try to get dimensions again
      imgWidth = img.width || img.naturalWidth || 0;
      imgHeight = img.height || img.naturalHeight || 0;
      
      console.log('📏 Image dimensions after waiting:', {
        width: imgWidth,
        height: imgHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    }
    
    if (imgWidth === 0 || imgHeight === 0) {
      console.error('❌ Image still has zero dimensions after waiting');
      alert('The image appears to be corrupted or not loaded properly. Please try uploading again.');
      return;
    }
    
    console.log('✅ Image found and validated, proceeding with save:', img);
    
    // Show loading state
    showMessage(`🔄 Saving ${POSITION_LABELS[position].name} design...`, 'info');
    
    try {
      // Convert image to blob for uploading
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Handle different image sources
      console.log('🖼️ Image element type:', img.tagName);
      console.log('🖼️ Image dimensions:', {
        width: imgWidth,
        height: imgHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    
    if (img.tagName === 'CANVAS') {
      // If it's already a canvas, copy it
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      console.log('✅ Copied canvas to new canvas');
    } else {
      // If it's an img element, wait for it to load if needed
      if (!img.complete || img.naturalWidth === 0) {
        console.log('⏳ Image not fully loaded, waiting...');
        await new Promise((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = resolve;
            img.onerror = resolve;
            // Timeout after 5 seconds
            setTimeout(resolve, 5000);
          }
        });
      }
      
      // Use the validated dimensions
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      ctx.drawImage(img, 0, 0);
      console.log('✅ Drew image to canvas with dimensions:', canvas.width, 'x', canvas.height);
    }
    
    console.log('🎨 Canvas dimensions:', { width: canvas.width, height: canvas.height });
    
    // Validate canvas has content
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas has zero dimensions. Please ensure an image is loaded.');
    }
    
    // Check if canvas has any content
    const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 10), Math.min(canvas.height, 10));
    const hasContent = imageData.data.some(pixel => pixel !== 0);
    
    if (!hasContent) {
      console.warn('⚠️ Canvas appears to be empty, but proceeding anyway...');
    }
      
      // Create blob with better error handling
      let blob;
      try {
        blob = await new Promise((resolve, reject) => {
          // Set a timeout to prevent hanging
          const timeout = setTimeout(() => {
            reject(new Error('Canvas toBlob timeout'));
          }, 5000);
          
          canvas.toBlob((result) => {
            clearTimeout(timeout);
            if (result) {
              console.log('✅ Canvas toBlob successful, blob size:', result.size);
              resolve(result);
            } else {
              reject(new Error('Canvas toBlob returned null'));
            }
          }, 'image/png', 0.95);
        });
      } catch (error) {
        console.error('❌ Canvas toBlob failed:', error);
        throw new Error(`Canvas toBlob failed: ${error.message}`);
      }
      
      // Validate blob
      if (!blob || !(blob instanceof Blob)) {
        console.error('❌ Canvas toBlob failed, trying alternative method');
        
        try {
          // Alternative method: convert canvas to data URL then to blob
          console.log('🔄 Trying alternative blob creation method...');
          const dataURL = canvas.toDataURL('image/png', 0.95);
          console.log('📸 Data URL created, length:', dataURL.length);
          
          const response = await fetch(dataURL);
          if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status}`);
          }
          
          const alternativeBlob = await response.blob();
          console.log('🔄 Alternative blob created, size:', alternativeBlob.size);
          
          if (!alternativeBlob || !(alternativeBlob instanceof Blob)) {
            throw new Error('Alternative method returned invalid blob');
          }
          
          console.log('✅ Created blob using alternative method');
          blob = alternativeBlob;
        } catch (altError) {
          console.error('❌ Alternative blob creation also failed:', altError);
          
          // Third fallback: try with different canvas settings
          try {
            console.log('🔄 Trying third fallback method...');
            
            // Create a new canvas with different settings
            const fallbackCanvas = document.createElement('canvas');
            const fallbackCtx = fallbackCanvas.getContext('2d');
            
            // Set canvas size
            fallbackCanvas.width = canvas.width;
            fallbackCanvas.height = canvas.height;
            
            // Draw with different settings
            fallbackCtx.imageSmoothingEnabled = false;
            fallbackCtx.drawImage(canvas, 0, 0);
            
            // Try toBlob with different quality
            const fallbackBlob = await new Promise((resolve, reject) => {
              fallbackCanvas.toBlob((result) => {
                if (result) {
                  resolve(result);
                } else {
                  reject(new Error('Fallback canvas toBlob failed'));
                }
              }, 'image/png', 1.0); // Use maximum quality
            });
            
            console.log('✅ Created blob using third fallback method');
            blob = fallbackBlob;
          } catch (fallbackError) {
            console.error('❌ All blob creation methods failed:', fallbackError);
            throw new Error(`All blob creation methods failed. Please try uploading a different image or refresh the page.`);
          }
        }
      } else {
        console.log('✅ Blob created successfully from canvas');
      }
      
      // Create a high-quality thumbnail
      const thumbnailCanvas = document.createElement('canvas');
      const thumbnailCtx = thumbnailCanvas.getContext('2d');
      thumbnailCanvas.width = 80;
      thumbnailCanvas.height = 80;
      
      // Enable high-quality image rendering
      thumbnailCtx.imageSmoothingEnabled = true;
      thumbnailCtx.imageSmoothingQuality = 'high';
      
      // Draw image with proper aspect ratio
      const thumbnailImgWidth = img.naturalWidth || img.width;
      const thumbnailImgHeight = img.naturalHeight || img.height;
      const aspectRatio = thumbnailImgWidth / thumbnailImgHeight;
      let drawWidth = 80;
      let drawHeight = 80;
      let offsetX = 0;
      let offsetY = 0;
      
      if (aspectRatio > 1) {
        // Landscape
        drawHeight = 80 / aspectRatio;
        offsetY = (80 - drawHeight) / 2;
      } else {
        // Portrait
        drawWidth = 80 * aspectRatio;
        offsetX = (80 - drawWidth) / 2;
      }
      
      // Fill background with white
      thumbnailCtx.fillStyle = '#ffffff';
      thumbnailCtx.fillRect(0, 0, 80, 80);
      
      // Draw the image
      thumbnailCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      
      const thumbnail = thumbnailCanvas.toDataURL('image/png', 0.9);
      
      // Upload to server
      const fileUrl = await uploadFileToServer(blob, position);
      console.log('💾 Generated file URL:', fileUrl);
      console.log('💾 File URL type:', typeof fileUrl);
      
      // Get color count from current state
      console.log('🔍 Debugging color count extraction:');
      console.log('  - window.state exists:', !!window.state);
      console.log('  - window.state.colorMatches exists:', !!(window.state && window.state.colorMatches));
      console.log('  - window.state.colorMatches length:', window.state && window.state.colorMatches ? window.state.colorMatches.length : 'N/A');
      console.log('  - window.state.colorMatches content:', window.state && window.state.colorMatches ? window.state.colorMatches : 'N/A');
      
      let colorCount = 0;
      
      // Try to get color count from window.state first
      if (window.state && window.state.colorMatches) {
        colorCount = window.state.colorMatches.length;
        console.log('🎨 Got color count from window.state.colorMatches:', colorCount);
      } else if (window.DTF_STATE && window.DTF_STATE.colorMatches) {
        colorCount = window.DTF_STATE.colorMatches.length;
        console.log('🎨 Got color count from window.DTF_STATE.colorMatches:', colorCount);
      } else {
        // Fallback: try to get from the DTF customizer state
        const dtfState = window.state || window.DTF_STATE;
        if (dtfState && dtfState.colorMatches) {
          colorCount = dtfState.colorMatches.length;
          console.log('🎨 Got color count from fallback state:', colorCount);
        } else {
          // Last resort: call the backend API to get color count
          console.log('🔄 Calling backend API to get color count...');
          try {
            const formData = new FormData();
            formData.append('image', blob, 'design.png');
            
            // Get backend URL from configuration
            const backendUrl = window.SHOPIFY_CONFIG?.backendUrl || window.BACKEND_CONFIG?.render || 'https://api.designerts.online';
            const response = await fetch(`${backendUrl}/extract-colors`, {
              method: 'POST',
              body: formData
            });
            
            if (response.ok) {
              const result = await response.json();
              // Backend returns result.matches, not result.colors
              const matches = result.matches || result.colors || [];
              colorCount = matches.length;
              console.log('🎨 Got color count from backend API:', colorCount);
              console.log('🎨 Backend response:', result);
              
              // Also update window.state.colorMatches for future use
              if (window.state && matches.length > 0) {
                window.state.colorMatches = matches.map((color, index) => ({
                  detected_rgb: color.detected_rgb || color.rgb,
                  detected_hex: color.detected_hex || color.hex,
                  detected_percentage: color.detected_percentage || color.percentage,
                  matched_palette: color.matched_palette || null,
                  similarity_score: color.similarity_score || null,
                  uniqueId: `color_${Date.now()}_${index}`,
                  originalRgb: color.detected_rgb || color.rgb
                }));
                console.log('🔄 Updated window.state.colorMatches from backend response');
              }
            } else {
              console.warn('⚠️ Backend API call failed, using 0');
              colorCount = 0;
            }
          } catch (error) {
            console.warn('⚠️ Backend API call error:', error, 'using 0');
            colorCount = 0;
          }
        }
      }
      
      console.log('🎨 Final color count for position:', position, 'colors:', colorCount);
      
      // Get new design status from checkbox BEFORE saving
      const newDesignCheckbox = document.getElementById('dtf-new-design-checkbox');
      const isNewDesign = newDesignCheckbox ? newDesignCheckbox.checked : false;
      console.log('🆕 New design checkbox status:', isNewDesign);
      
      // Save position data with server URL
      positionData[position] = {
        completed: true,
        thumbnail: thumbnail,
        fileUrl: fileUrl,
        timestamp: new Date().toISOString(),
        fileName: `design-${POSITION_LABELS[position].name.toLowerCase().replace(' ', '-')}.png`,
        position: position,
        positionName: POSITION_LABELS[position].name,
        colorCount: colorCount,
        isNewDesign: isNewDesign  // ✅ Save isNewDesign flag to positionData
      };
      
      // Update global positionData reference
      window.positionData = positionData;
      
      console.log('💾 Saved position data:', positionData[position]);
      console.log('💾 Full positionData object:', positionData);
      console.log('💾 positionData keys:', Object.keys(positionData));
      
      // Update UI
      console.log('🔄 Updating UI after successful save...');
      generatePositionBlocks();
      // updateOrderSummary(); // Removed order summary
      
      // Update pricing system with design data
      // Wait for PricingController to be available (it loads with defer)
      const waitForPricing = () => {
        if (window.PricingController) {
          const designData = {
            fileUrl: fileUrl,
            colorCount: colorCount,
            isNewDesign: isNewDesign,
            width: null,
            height: null
          };
          
          console.log('🔄 Updating pricing system with data:', designData);
          
          // Update pricing system
          window.PricingController.updatePositionData(position, designData);
          
          // Show pricing section if it's not already visible
          window.PricingController.showPricingSection();
          
          // Add a small delay to ensure data is properly processed
          setTimeout(() => {
            console.log('✅ Design saved and pricing updated for position:', position);
            console.log('✅ Current pricing data:', window.PricingController.getCurrentPricing());
          }, 100);
        } else {
          console.warn('⏳ PricingController not ready yet, waiting...');
          setTimeout(waitForPricing, 100); // Retry after 100ms
        }
      };
      
      waitForPricing();
      
      console.log('🔄 Closing modal...');
      closeModal();
      
      // Force close the modal with additional methods
      const modal = document.getElementById('sp-dtf-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
        console.log('✅ Modal force-closed');
      }
      
      // Show success message
      showMessage(`✅ ${POSITION_LABELS[position].name} design saved successfully!`, 'success');
      console.log('✅ Save process completed successfully');
      
      // Ensure modal closes with a timeout as backup
      setTimeout(() => {
        const modal = document.getElementById('sp-dtf-modal');
        if (modal && modal.style.display !== 'none') {
          console.log('🔄 Backup modal close triggered');
          modal.style.display = 'none';
          modal.classList.remove('active');
        }
      }, 100);
      
    } catch (error) {
      console.error('Error saving design:', error);
      showMessage(`❌ Failed to save ${POSITION_LABELS[position].name} design: ${error.message}`, 'error');
    }
  }
  
  // Upload file to server and get URL
  async function uploadFileToServer(blob, position) {
    console.log('📤 Starting file upload for position:', position);
    console.log('📤 Blob details:', {
      type: blob?.type,
      size: blob?.size,
      isBlob: blob instanceof Blob
    });
    
    // Validate blob
    if (!blob || !(blob instanceof Blob)) {
      throw new Error('Invalid blob provided for upload');
    }
    
    const formData = new FormData();
    const fileName = `design-${POSITION_LABELS[position].name.toLowerCase().replace(' ', '-')}-${Date.now()}.png`;
    
    console.log('📤 Appending to FormData:', { fileName, position });
    formData.append('file', blob, fileName);
    formData.append('position', position);
    formData.append('positionName', POSITION_LABELS[position].name);
    
    console.log('✅ FormData created successfully');
    
    // Try multiple upload methods
    try {
      // Method 1: Upload to Shopify Files API
      console.log('📤 Trying Shopify Files API upload...');
      const shopifyUrl = await uploadToShopifyFiles(formData);
      if (shopifyUrl) {
        console.log('✅ Shopify Files API upload successful:', shopifyUrl);
        return shopifyUrl;
      }
    } catch (error) {
      console.log('❌ Shopify Files upload failed, trying alternative:', error);
    }
    
    try {
      // Method 2: Upload to custom backend
      console.log('📤 Trying backend upload...');
      const backendUrl = await uploadToBackend(formData);
      if (backendUrl) {
        console.log('✅ Backend upload successful:', backendUrl);
        return backendUrl;
      }
    } catch (error) {
      console.log('❌ Backend upload failed, using fallback:', error);
    }
    
    // Method 3: Fallback to blob URL (temporary)
    console.log('⚠️ Using blob URL fallback (temporary)');
    const blobUrl = URL.createObjectURL(blob);
    console.log('📤 Generated blob URL:', blobUrl);
    return blobUrl;
  }
  
  // Upload to Shopify Files API
  async function uploadToShopifyFiles(formData) {
    // Get access token from Shopify configuration
    const accessToken = window.SHOPIFY_CONFIG?.accessToken || '';
    if (!accessToken) {
      throw new Error('Shopify access token not configured. Please set SHOPIFY_ACCESS_TOKEN in theme settings.');
    }
    
    const response = await fetch('/admin/api/2023-10/files.json', {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'multipart/form-data'
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Shopify Files API error: ${response.status}`);
    }
    
    const result = await response.json();
    return result.file.url;
  }
  
  // Upload to custom backend
  async function uploadToBackend(formData) {
    const backendUrl = getBackendUrl();
    console.log('📤 Uploading to backend URL:', `${backendUrl}/upload-design`);
    
    const response = await fetch(`${backendUrl}/upload-design`, {
      method: 'POST',
      body: formData
    });
    
    console.log('📤 Backend response status:', response.status);
    console.log('📤 Backend response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend upload error response:', errorText);
      throw new Error(`Backend upload error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📤 Backend upload result:', result);
    return result.fileUrl;
  }
  
  // Get backend URL (from DTF customizer)
  function getBackendUrl() {
    console.log('🔍 getBackendUrl called');
    console.log('🔍 window.state:', window.state);
    console.log('🔍 window.state.useLocalBackend:', window.state?.useLocalBackend);
    
    // Force Hostinger backend with SSL for Shopify snippet
    console.log('🔍 Using Hostinger backend: https://api.designerts.online');
      return 'https://api.designerts.online';
    
    // Original logic (commented out for debugging)
    // if (window.state && window.state.useLocalBackend) {
    //   console.log('🔍 Using local backend: http://localhost:8000');
    //   return 'http://localhost:8000';
    // }
    // console.log('🔍 Using Render backend: https://dtf-customizer-backend.onrender.com');
    // return 'https://dtf-customizer-backend.onrender.com';
  }
  
  // Show message function - Now uses integrated progress bar
  function showMessage(message, type = 'info') {
    const progressBar = document.getElementById('dtf-progress-bar');
    if (!progressBar) return;
    
    // Show progress bar
    progressBar.style.display = 'block';
    progressBar.className = `dtf-progress-bar ${type}`;
    
    // Set icon based on type
    const iconElement = progressBar.querySelector('.dtf-progress-icon');
    const textElement = progressBar.querySelector('.dtf-progress-text');
    
    const icons = {
      'success': '✓',
      'error': '✗',
      'warning': '⚠',
      'info': 'ℹ'
    };
    
    if (iconElement) iconElement.textContent = icons[type] || 'ℹ';
    if (textElement) textElement.textContent = message;
    
    // Auto-hide after delay (3 seconds for success/error, 5 seconds for info/warning)
    const timeout = (type === 'success' || type === 'error') ? 3000 : 5000;
    setTimeout(() => {
      progressBar.style.display = 'none';
    }, timeout);
  }
  
  // Download preview image function
  function downloadPreviewImage() {
    console.log('💾 Download preview button clicked');
    
    // Priority order: DTF customizer state (most up-to-date) > global state > canvas
    let image = null;
    let source = '';
    
    // First try DTF customizer state (this gets updated with resized images)
    if (typeof window.DTF_STATE !== 'undefined' && window.DTF_STATE.image) {
      image = window.DTF_STATE.image;
      source = 'DTF_STATE';
    } 
    // Then try global state
    else if (typeof state !== 'undefined' && state.image) {
      image = state.image;
      source = 'global state';
    }
    // Then try to get from canvas (for processed images)
    else {
      const canvas = document.getElementById('dtf-preview-canvas');
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        console.log('🎨 Using canvas as image source, dimensions:', canvas.width, 'x', canvas.height);
        downloadCanvasAsFile(canvas, 'dtf-preview');
        return;
      }
      // Fallback to preview canvas
      const previewCanvas = document.getElementById('dtf-preview');
      if (previewCanvas && previewCanvas.tagName === 'CANVAS') {
        console.log('🎨 Using preview canvas as image source');
        downloadCanvasAsFile(previewCanvas, 'dtf-preview');
        return;
      }
    }
    
    if (image) {
      console.log('✅ Using image from', source, 'dimensions:', image.width, 'x', image.height);
      downloadImageAsFile(image, 'dtf-preview');
    } else {
      console.log('❌ No image available for download');
      showMessage('No image available for download', 'error');
    }
  }
  
  // Helper function to download image as file
  function downloadImageAsFile(image, prefix = 'image') {
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
  
  // Show/hide permanent download button
  function showPermanentDownloadButton() {
    const downloadSection = document.getElementById('dtf-permanent-download-section');
    if (downloadSection) {
      downloadSection.style.display = 'flex';
      console.log('✅ Permanent download button shown');
    }
  }
  
  function hidePermanentDownloadButton() {
    const downloadSection = document.getElementById('dtf-permanent-download-section');
    if (downloadSection) {
      downloadSection.style.display = 'none';
      console.log('✅ Permanent download button hidden');
    }
  }
  
  // Make functions globally available
  window.showPermanentDownloadButton = showPermanentDownloadButton;
  window.hidePermanentDownloadButton = hidePermanentDownloadButton;
  
  // Set up permanent download button event listener
  function setupPermanentDownloadButton() {
    const permanentDownloadBtn = document.getElementById('dtf-permanent-download-btn');
    if (permanentDownloadBtn) {
      // Remove any existing event listeners
      permanentDownloadBtn.replaceWith(permanentDownloadBtn.cloneNode(true));
      const newBtn = document.getElementById('dtf-permanent-download-btn');
      
      newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('💾 Permanent download button clicked');
        downloadPreviewImage();
      });
      console.log('✅ Permanent download button event listener set up');
    } else {
      console.log('❌ Permanent download button not found');
    }
  }
  
  // Set up on DOM ready
  document.addEventListener('DOMContentLoaded', setupPermanentDownloadButton);
  
  // Also set up when the customizer is initialized
  window.setupPermanentDownloadButton = setupPermanentDownloadButton;
  
  // Set up dimension control buttons
  function setupDimensionControlButtons() {
    console.log('🔧 Setting up dimension control buttons...');
    
    // Unit toggle button
    const unitToggleBtn = document.getElementById('dtf-unit-toggle');
    if (unitToggleBtn) {
      unitToggleBtn.addEventListener('click', function() {
        console.log('🔄 Unit toggle button clicked');
        toggleDimensionUnits();
      });
      console.log('✅ Unit toggle button event listener added');
    } else {
      console.log('❌ Unit toggle button not found');
    }
    
    // Lock aspect ratio button
    const lockAspectBtn = document.getElementById('dtf-lock-aspect');
    if (lockAspectBtn) {
      lockAspectBtn.addEventListener('click', function() {
        console.log('🔒 Lock aspect ratio button clicked');
        toggleAspectRatioLock();
      });
      console.log('✅ Lock aspect ratio button event listener added');
    } else {
      console.log('❌ Lock aspect ratio button not found');
    }
  }
  
  // Toggle dimension units between inches and pixels
  function toggleDimensionUnits() {
    const unitsSelect = document.getElementById('dtf-size-units');
    const widthInput = document.getElementById('dtf-size-width');
    const heightInput = document.getElementById('dtf-size-height');
    
    if (!unitsSelect || !widthInput || !heightInput) {
      console.log('❌ Required elements not found for unit toggle');
      return;
    }
    
    const currentUnits = unitsSelect.value;
    const newUnits = currentUnits === 'in' ? 'px' : 'in';
    
    console.log('🔄 Switching units from', currentUnits, 'to', newUnits);
    
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
    
    console.log('✅ Units switched successfully');
  }
  
  // Toggle aspect ratio lock
  function toggleAspectRatioLock() {
    const lockBtn = document.getElementById('dtf-lock-aspect');
    if (!lockBtn) {
      console.log('❌ Lock aspect ratio button not found');
      return;
    }
    
    const isLocked = lockBtn.classList.contains('locked');
    
    if (isLocked) {
      // Unlock
      lockBtn.classList.remove('locked');
      lockBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
      lockBtn.title = 'Lock aspect ratio';
      console.log('🔓 Aspect ratio unlocked');
    } else {
      // Lock
      lockBtn.classList.add('locked');
      lockBtn.innerHTML = '<i class="fas fa-lock"></i>';
      lockBtn.title = 'Unlock aspect ratio';
      console.log('🔒 Aspect ratio locked');
    }
    
    // Update global state
    if (window.aspectState) {
      window.aspectState.locked = !isLocked;
    }
  }
  
  // Make functions globally available
  window.setupDimensionControlButtons = setupDimensionControlButtons;
  window.toggleDimensionUnits = toggleDimensionUnits;
  window.toggleAspectRatioLock = toggleAspectRatioLock;
  
  // Save position data (legacy function for compatibility)
  function savePosition(position) {
    // This function is now handled by savePositionFromDTF
    // But we keep it for compatibility
    if (currentEditingPosition) {
      savePositionFromDTF(currentEditingPosition);
    }
  }
  

  
  // Close modal
  function closeModal() {
    const modal = document.getElementById('sp-dtf-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    currentEditingPosition = null;
  }

  // Test function for pricing system
  window.testPricingSystem = function() {
    console.log('🧪 Testing pricing system...');
    
    if (window.PricingController) {
      // Add test data
      window.PricingController.updatePositionData('front', { colorCount: 3, isNewDesign: false });
      window.PricingController.updatePositionData('back', { colorCount: 2, isNewDesign: true });
      
      // Show pricing section
      window.PricingController.showPricingSection();
      
      // Get current pricing
      const pricing = window.PricingController.getCurrentPricing();
      console.log('✅ Test pricing data:', pricing);
      
      return pricing;
    } else {
      console.error('❌ PricingController not available');
      return null;
    }
  };

  // Test function for Shopify product data
  window.testShopifyProduct = function() {
    console.log('🛍️ Testing Shopify product data...');
    const titleElement = document.getElementById('pricing-product-title');
    const priceElement = document.getElementById('pricing-product-price');
    const shopifyPriceElement = document.querySelector('[data-product-price]');
    
    console.log('Title element:', titleElement);
    console.log('Price element (pricing UI):', priceElement);
    console.log('Shopify price element:', shopifyPriceElement);
    console.log('Title text:', titleElement ? titleElement.textContent : 'Not found');
    console.log('Price text (pricing UI):', priceElement ? priceElement.textContent : 'Not found');
    console.log('Shopify price text:', shopifyPriceElement ? shopifyPriceElement.textContent : 'Not found');
    
    if (window.PricingEngine) {
      // Force refresh to get latest data
      const product = window.PricingEngine.refreshProductData();
      console.log('✅ Shopify product data (refreshed):', product);
      return product;
    } else {
      console.error('❌ PricingEngine not available');
      return null;
    }
  };
  
  // Close DTF customizer modal function
  function closeDTFModal() {
    console.log('🔴 Closing DTF customizer modal');
    const modal = document.getElementById('sp-dtf-modal');
    if (modal) {
      modal.style.display = 'none';
      currentEditingPosition = null;
      console.log('✅ DTF customizer modal closed');
    } else {
      console.error('❌ Modal not found!');
    }
  }
  
  // Make sure the function is globally accessible
  window.closeDTFModal = closeDTFModal;
  
  // Add click outside to close functionality
  document.addEventListener('click', function(event) {
    const modal = document.getElementById('sp-dtf-modal');
    if (modal && modal.style.display === 'block') {
      if (event.target === modal) {
        closeDTFModal();
      }
    }
  });
  
  // Add escape key to close functionality
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const modal = document.getElementById('sp-dtf-modal');
      if (modal && modal.style.display === 'block') {
        closeDTFModal();
      }
    }
  });
  
  // Update price breakdown (formerly order summary)
  function updateOrderSummary() {
    const summary = document.getElementById('sp-order-summary');
    const summaryContent = document.getElementById('sp-summary-content');
    
    if (!summary || !summaryContent) return;
    
    // Show if there are selected positions (not just completed ones)
    if (selectedPositions.length === 0) {
      summary.style.display = 'none';
      return;
    }
    
    summary.style.display = 'block';
    
    
    let summaryHTML = '';
    
    
    // Add each selected position
    selectedPositions.forEach(pos => {
      const position = POSITION_LABELS[pos];
      const data = positionData[pos];
      const hasDesign = data && data.completed;
      const colorCount = hasDesign ? (data.colorCount || 0) : 0;
      
      summaryHTML += `
        <div class="sp-summary-item">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div class="sp-summary-thumbnail">
              ${hasDesign ? `
                <img src="${data.thumbnail}" alt="${position.name} preview" class="sp-summary-thumbnail-img">
                <div class="sp-summary-thumbnail-overlay">
                  <button onclick="viewFullImage('${pos}')" title="View full image">
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
                  ${hasDesign ? `${colorCount} colors` : 'Upload design to see details'}
                </div>
              ${hasDesign ? `
                <div style="font-size: 0.7rem; color: #999;">Saved: ${new Date(data.timestamp).toLocaleDateString()}</div>
              ` : `
                <div style="font-size: 0.7rem; color: #999;">Click to customize</div>
              `}
            </div>
          </div>
            <div class="sp-summary-price">
              <span style="font-size: 1.2rem; font-weight: 600; color: #6c757d;">$0.00</span>
            </div>
        </div>
      `;
    });
    
    
    // Add order info button if there are completed positions
    const completedPositions = Object.keys(positionData).filter(pos => positionData[pos].completed);
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
    
  }
  
  // Add to cart
  async function addToCart() {
    const completedPositions = Object.keys(positionData).filter(pos => positionData[pos].completed);
    
    if (completedPositions.length === 0) {
      showMessage('Please complete at least one design before adding to cart.', 'warning');
      return;
    }
    
    // Show loading state
    const addToCartBtn = document.getElementById('sp-add-to-cart');
    const originalText = addToCartBtn.innerHTML;
    addToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding to Cart...';
    addToCartBtn.disabled = true;
    
    try {
      // Prepare data for Shopify
      const lineItemProperties = {};
      const orderNotes = [];
      const designSummary = [];
      
      completedPositions.forEach(pos => {
        const position = POSITION_LABELS[pos];
        const data = positionData[pos];
        
        // Add file URL as line item property
        lineItemProperties[`${position.name.toLowerCase().replace(' ', '_')}_design`] = data.fileUrl;
        lineItemProperties[`${position.name.toLowerCase().replace(' ', '_')}_filename`] = data.fileName;
        lineItemProperties[`${position.name.toLowerCase().replace(' ', '_')}_timestamp`] = data.timestamp;
        
        // Add to order notes
        orderNotes.push(`${position.name}: ${data.fileUrl} (${data.fileName})`);
        designSummary.push(`${position.name} Design`);
      });
      
      // Create comprehensive order notes
      const fullOrderNotes = [
        '=== CUSTOMIZED DESIGNS ===',
        `Total Designs: ${completedPositions.length}`,
        `Designs: ${designSummary.join(', ')}`,
        '',
        '=== DESIGN FILES ===',
        ...orderNotes,
        '',
        `Generated: ${new Date().toISOString()}`,
        '=== END CUSTOMIZED DESIGNS ==='
      ].join('\n');
      
      // Add metadata
      lineItemProperties['customization_completed'] = 'true';
      lineItemProperties['total_positions'] = completedPositions.length.toString();
      lineItemProperties['customization_timestamp'] = new Date().toISOString();
      lineItemProperties['design_summary'] = designSummary.join(', ');
      lineItemProperties['order_notes'] = fullOrderNotes;
      
      // Get current product variant ID
      const productVariantId = getCurrentVariantId();
      
      if (!productVariantId) {
        throw new Error('Product variant not found. Please select a size/color.');
      }
      
      // Prepare cart item data
      const cartData = {
        id: productVariantId,
        quantity: 1,
        properties: lineItemProperties
      };
      
      console.log('Adding to cart with:', cartData);
      
      // Add to Shopify cart
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(cartData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add to cart');
      }
      
      const result = await response.json();
      
      // Save order notes to backend for admin access
      await saveOrderNotesToBackend({
        lineItemProperties,
        orderNotes: fullOrderNotes,
        completedPositions: completedPositions.length
      });
      
      // Show success message with order details
      const orderSummary = `
        ✅ Successfully added ${completedPositions.length} customized design(s) to cart!
        
        📋 Order Details:
        • Designs: ${designSummary.join(', ')}
        • Files: ${completedPositions.length} uploaded
        • Order ID: ${result.id || 'Generated'}
        
        📁 File URLs saved to line item properties:
        ${orderNotes.map(note => `• ${note}`).join('\n')}
      `;
      
      showMessage(orderSummary, 'success');
      
      // Update cart count if element exists
      updateCartCount();
      
      // Close modal after successful add
      setTimeout(() => {
        closeModal();
      }, 3000);
      
    } catch (error) {
      console.error('Add to cart error:', error);
      showMessage(`❌ Failed to add to cart: ${error.message}`, 'error');
    } finally {
      // Restore button state
      addToCartBtn.innerHTML = originalText;
      addToCartBtn.disabled = false;
    }
  }
  
  // Get current product variant ID
  function getCurrentVariantId() {
    // Try to get variant ID from various sources
    const variantSelect = document.querySelector('select[name="id"]');
    if (variantSelect) {
      return variantSelect.value;
    }
    
    const variantInput = document.querySelector('input[name="id"]:checked');
    if (variantInput) {
      return variantInput.value;
    }
    
    const variantData = document.querySelector('[data-variant-id]');
    if (variantData) {
      return variantData.getAttribute('data-variant-id');
    }
    
    // Fallback: try to get from URL or other Shopify-specific selectors
    const productForm = document.querySelector('form[action*="/cart/add"]');
    if (productForm) {
      const formData = new FormData(productForm);
      return formData.get('id');
    }
    
    return null;
  }
  
  // Update cart count display
  function updateCartCount() {
    // Try to update cart count in various locations
    const cartCountSelectors = [
      '.cart-count',
      '.cart-link .count',
      '.header-cart .count',
      '[data-cart-count]'
    ];
    
    cartCountSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const currentCount = parseInt(element.textContent) || 0;
        element.textContent = currentCount + 1;
      });
    });
  }
  
  // Save order notes to backend for admin access
  async function saveOrderNotesToBackend(orderData) {
    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/save-order-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: `temp-${Date.now()}`, // Temporary ID until real order is created
          customerEmail: getCustomerEmail(),
          lineItemProperties: orderData.lineItemProperties,
          orderNotes: orderData.orderNotes,
          completedPositions: orderData.completedPositions,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Order notes saved to backend:', result);
        return result;
      }
    } catch (error) {
      console.log('Failed to save order notes to backend:', error);
      // Don't throw error - this is optional
    }
  }
  
  // Get customer email if available
  function getCustomerEmail() {
    // Try to get customer email from various sources
    const emailSelectors = [
      'input[name="customer[email]"]',
      'input[type="email"]',
      '.customer-email',
      '[data-customer-email]'
    ];
    
    for (const selector of emailSelectors) {
      const element = document.querySelector(selector);
      if (element && element.value) {
        return element.value;
      }
    }
    
    return 'guest@example.com'; // Fallback
  }
  
  // View full image modal
  function viewFullImage(position) {
    const data = positionData[position];
    if (!data || !data.fileUrl) return;
    
    // Create modal for full image view
    const modal = document.createElement('div');
    modal.className = 'sp-full-image-modal';
    modal.innerHTML = `
      <div class="sp-full-image-content">
        <div class="sp-full-image-header">
          <h3>${POSITION_LABELS[position].name} Design</h3>
          <button class="sp-close-full-image" onclick="closeFullImageModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="sp-full-image-body">
          <img src="${data.fileUrl}" alt="${POSITION_LABELS[position].name} design" class="sp-full-image">
          <div class="sp-image-info">
            <p><strong>File:</strong> ${data.fileName}</p>
            <p><strong>Saved:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
            <p><strong>URL:</strong> <a href="${data.fileUrl}" target="_blank">${data.fileUrl}</a></p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeFullImageModal();
      }
    });
  }
  
  // Close full image modal
  function closeFullImageModal() {
    const modal = document.querySelector('.sp-full-image-modal');
    if (modal) {
      modal.remove();
    }
  }
  
  // Edit existing position
  function editPosition(position) {
    console.log('🎯 editPosition called for position:', position);
    console.log('🎯 Current positionData:', positionData);
    console.log('🎯 Position data for position', position, ':', positionData[position]);
    console.log('🎯 positionData keys:', Object.keys(positionData));
    console.log('🎯 positionData values:', Object.values(positionData));
    
    // Check if we have saved data for this position
    if (positionData[position] && positionData[position].completed) {
      console.log('✅ Found saved data, opening customizer for editing');
      console.log('✅ Saved data details:', {
        completed: positionData[position].completed,
        fileUrl: positionData[position].fileUrl,
        fileName: positionData[position].fileName,
        timestamp: positionData[position].timestamp
      });
    } else {
      console.warn('⚠️ No saved data found for position', position, '- opening as new design');
      console.warn('⚠️ Available positions with data:', Object.keys(positionData).filter(key => positionData[key] && positionData[key].completed));
    }
    
    // Open the customizer with existing data
    openCustomizer(position);
  }
  
  // Display order information modal
  function showOrderInfo() {
    const completedPositions = Object.keys(positionData).filter(pos => positionData[pos].completed);
    
    if (completedPositions.length === 0) {
      showMessage('No completed designs to show order information.', 'warning');
      return;
    }
    
    const orderNotes = [];
    const designSummary = [];
    
    completedPositions.forEach(pos => {
      const position = POSITION_LABELS[pos];
      const data = positionData[pos];
      orderNotes.push(`${position.name}: ${data.fileUrl} (${data.fileName})`);
      designSummary.push(`${position.name} Design`);
    });
    
    const orderInfo = `
      <div class="sp-order-info-modal">
        <div class="sp-order-info-content">
          <div class="sp-order-info-header">
            <h3><i class="fas fa-shopping-cart"></i> Order Information</h3>
            <button class="sp-close-order-info" onclick="closeOrderInfoModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="sp-order-info-body">
            <div class="sp-order-summary-section">
              <h4>📋 Order Summary</h4>
              <p><strong>Total Designs:</strong> ${completedPositions.length}</p>
              <p><strong>Designs:</strong> ${designSummary.join(', ')}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="sp-order-files-section">
              <h4>📁 Design Files</h4>
              <div class="sp-order-files-list">
                ${orderNotes.map(note => `<div class="sp-order-file-item">• ${note}</div>`).join('')}
              </div>
            </div>
            
            <div class="sp-order-integration-section">
              <h4>🔗 Shopify Integration</h4>
              <p><strong>Line Item Properties:</strong> All file URLs and metadata will be saved as line item properties</p>
              <p><strong>Order Notes:</strong> Complete order information will be added to order notes</p>
              <p><strong>Backend Storage:</strong> Order data will be saved to backend for admin access</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', orderInfo);
    
    // Close on background click
    const modal = document.querySelector('.sp-order-info-modal');
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeOrderInfoModal();
      }
    });
  }
  
  // Close order info modal
  function closeOrderInfoModal() {
    const modal = document.querySelector('.sp-order-info-modal');
    if (modal) {
      modal.remove();
    }
  }
  
  // Make functions globally available
  window.savePosition = savePosition;
  window.viewFullImage = viewFullImage;
  window.editPosition = editPosition;
  window.closeFullImageModal = closeFullImageModal;
  window.showOrderInfo = showOrderInfo;
  window.closeOrderInfoModal = closeOrderInfoModal;

  
  // Make color popup functions globally available (for DTF customizer integration)
  // These will be overridden by the DTF customizer when it loads
  window.closeColorPopup = function() {
    console.log('closeColorPopup called - will be overridden by DTF customizer');
  };
  window.saveColorChange = function() {
    console.log('saveColorChange called - will be overridden by DTF customizer');
  };
  
  // Make removePosition function globally available
  window.removePosition = function(positionKey) {
    removePosition(positionKey);
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Small delay to ensure all elements are rendered
      setTimeout(init, 100);
    });
  } else {
    // Small delay to ensure all elements are rendered
    setTimeout(init, 100);
  }
})();
