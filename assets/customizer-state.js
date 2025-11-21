// Multi-Position Customizer State Management
(function() {
  'use strict';
  
  // State variables
  let selectedPositions = [];
  let positionData = {};
  let currentEditingPosition = null;
  let hasInitialized = false;
  
  // Make globally accessible
  window.selectedPositions = selectedPositions;
  window.positionData = positionData;
  window.currentEditingPosition = currentEditingPosition;
  window.hasInitialized = hasInitialized;
  
  // State update functions
  window.updateSelectedPositions = function(positions) {
    selectedPositions = positions;
    window.selectedPositions = selectedPositions;
  };
  
  window.updatePositionData = function(position, data) {
    positionData[position] = data;
    window.positionData = positionData;
  };
  
  window.setCurrentEditingPosition = function(position) {
    currentEditingPosition = position;
    window.currentEditingPosition = currentEditingPosition;
  };
  
  window.setHasInitialized = function(value) {
    hasInitialized = value;
    window.hasInitialized = hasInitialized;
  };
  
})();
