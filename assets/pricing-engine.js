/**
 * JavaScript Pricing Engine for DTF Customizer
 * Handles all pricing calculations based on Excel data
 */

class PricingEngine {
  constructor() {
    this.pricingConfig = {
      // Quantity tiers based on Excel data
      quantityTiers: [
        { min: 1, max: 23, tier: 0 },
        { min: 24, max: 48, tier: 1 },
        { min: 49, max: 96, tier: 2 },
        { min: 97, max: 144, tier: 3 },
        { min: 145, max: 432, tier: 4 },
        { min: 433, max: 720, tier: 5 },
        { min: 721, max: 1200, tier: 6 },
        { min: 1201, max: 3000, tier: 7 },
        { min: 3001, max: 6000, tier: 8 },
        { min: 6001, max: 999999, tier: 9 }
      ],
      
      // Color pricing matrix from Excel (10 tiers x 8 colors)
      colorPricing: {
        1: [3.03, 2.86, 2.16, 1.60, 1.36, 1.18, 1.05, 0.83, 0.77, 0.67],
        2: [3.88, 3.66, 2.79, 1.95, 1.66, 1.51, 1.26, 1.10, 0.94, 0.77],
        3: [5.20, 4.69, 3.16, 2.12, 1.82, 1.67, 1.37, 1.24, 1.04, 0.84],
        4: [6.52, 5.72, 3.53, 2.29, 1.98, 1.83, 1.48, 1.38, 1.14, 0.91],
        5: [7.84, 6.75, 3.90, 2.46, 2.14, 1.99, 1.59, 1.52, 1.24, 0.98],
        6: [8.89, 8.29, 4.06, 2.42, 2.12, 1.97, 1.67, 1.39, 1.24, 1.04],
        7: [10.09, 9.49, 4.36, 2.52, 2.22, 2.07, 1.77, 1.44, 1.29, 1.09],
        8: [11.29, 10.69, 4.66, 2.62, 2.32, 2.17, 1.87, 1.49, 1.34, 1.14]
      },
      
      // Additional color rate for colors > 8
      additionalColorRate: [1.20, 1.20, 0.30, 0.10, 0.10, 0.10, 0.10, 0.05, 0.05, 0.05],
      
      // New design setup cost
      newDesignSetup: 25.00
    };
    
    this.positionData = {};
    this.shopifyProduct = null;
    this.quantity = 15; // Default quantity
  }

  /**
   * Get quantity tier based on quantity
   */
  getQuantityTier(quantity) {
    for (let tier of this.pricingConfig.quantityTiers) {
      if (quantity >= tier.min && quantity <= tier.max) {
        return tier.tier;
      }
    }
    return 9; // Default to highest tier
  }

  /**
   * Calculate price for a single position
   */
  calculatePositionPrice(position, quantity) {
    const positionInfo = this.positionData[position];
    if (!positionInfo) {
      console.warn(`No position data found for ${position}`);
      return null;
    }

    const colors = positionInfo.colorCount || 0;
    const isNewDesign = positionInfo.isNewDesign || false;
    
    console.log(`🔍 Calculating price for ${position}:`, {
      positionInfo,
      colors,
      isNewDesign,
      quantity
    });
    
    if (colors === 0) {
      console.warn(`No colors detected for ${position} - positionInfo:`, positionInfo);
      return null;
    }

    const tier = this.getQuantityTier(quantity);
    let basePrice;

    if (colors <= 8) {
      // Use direct pricing from matrix
      basePrice = this.pricingConfig.colorPricing[colors][tier];
    } else {
      // Calculate for 8+ colors
      const base8ColorPrice = this.pricingConfig.colorPricing[8][tier];
      const additionalColors = colors - 8;
      const additionalRate = this.pricingConfig.additionalColorRate[tier];
      basePrice = base8ColorPrice + (additionalColors * additionalRate);
    }

    const costPerPiece = basePrice;
    const setupCost = isNewDesign ? this.pricingConfig.newDesignSetup : 0;
    const totalCost = (costPerPiece * quantity) + setupCost;
    
    console.log(`💰 Pricing calculation for ${position}:`, {
      colors,
      isNewDesign,
      quantity,
      tier,
      costPerPiece,
      setupCost,
      totalCost
    });

    return {
      position: position,
      colors: colors,
      isNewDesign: isNewDesign,
      costPerPiece: costPerPiece,
      setupCost: setupCost,
      totalCost: totalCost,
      quantity: quantity,
      tier: tier
    };
  }

  /**
   * Calculate pricing for all positions
   */
  calculateAllPositions(quantity = this.quantity) {
    const results = [];
    const positions = Object.keys(this.positionData);
    
    for (let position of positions) {
      const pricing = this.calculatePositionPrice(position, quantity);
      if (pricing) {
        results.push(pricing);
      }
    }
    
    return results;
  }

  /**
   * Get total design printing cost
   */
  getTotalDesignCost(quantity = this.quantity) {
    const positions = this.calculateAllPositions(quantity);
    return positions.reduce((total, pos) => total + pos.totalCost, 0);
  }

  /**
   * Get Shopify product data
   */
  getShopifyProduct(forceRefresh = false) {
    if (this.shopifyProduct && !forceRefresh) {
      return this.shopifyProduct;
    }

    // Get product data from Liquid template (already rendered)
    const titleElement = document.getElementById('pricing-product-title');
    let priceElement = document.getElementById('pricing-product-price');
    
    // Fallback: try to get price from actual Shopify price element
    if (!priceElement || !priceElement.textContent || priceElement.textContent === '$0.00') {
      priceElement = document.querySelector('[data-product-price]');
      console.log('🔄 Fallback: Using Shopify price element:', priceElement);
    }
    
    const title = titleElement ? titleElement.textContent.trim() : 'Product';
    let price = 0;
    
    if (priceElement) {
      // Extract price from formatted money string (e.g., "$5.64" -> 5.64)
      const priceText = priceElement.textContent.replace(/[^0-9.]/g, '');
      price = parseFloat(priceText) || 0;
      console.log('💰 Extracted price:', priceText, '->', price);
    } else {
      console.warn('❌ No price element found');
    }

    this.shopifyProduct = {
      title: title,
      price: price,
      element: {
        title: titleElement,
        price: priceElement
      }
    };

    console.log('🛍️ Shopify product data:', this.shopifyProduct);
    return this.shopifyProduct;
  }

  /**
   * Calculate final totals
   */
  calculateFinalTotals(quantity = this.quantity) {
    const designCost = this.getTotalDesignCost(quantity);
    const product = this.getShopifyProduct();
    const productCost = product.price * quantity;
    const finalTotal = designCost + productCost;

    return {
      designCost: designCost,
      productCost: productCost,
      finalTotal: finalTotal,
      quantity: quantity,
      product: product
    };
  }

  /**
   * Update position data
   */
  updatePositionData(position, data) {
    console.log(`🔄 Updating position data for ${position} with:`, data);
    this.positionData[position] = {
      ...this.positionData[position],
      ...data
    };
    console.log(`✅ Updated position data for ${position}:`, this.positionData[position]);
    console.log(`📊 All position data:`, this.positionData);
  }

  /**
   * Remove position data
   */
  removePositionData(position) {
    delete this.positionData[position];
    console.log(`Removed position data for ${position}`);
  }

  /**
   * Get all position data
   */
  getPositionData() {
    return this.positionData;
  }

  /**
   * Set quantity
   */
  setQuantity(quantity) {
    this.quantity = parseInt(quantity) || 15;
    console.log(`Quantity set to: ${this.quantity}`);
  }

  /**
   * Get quantity
   */
  getQuantity() {
    return this.quantity;
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return `$${amount.toFixed(2)}`;
  }

  /**
   * Get position display name
   */
  getPositionDisplayName(position) {
    const names = {
      'front': 'Front Design',
      'back': 'Back Design',
      'left-sleeve': 'Left Sleeve Design',
      'right-sleeve': 'Right Sleeve Design',
      'left-chest': 'Left Chest Design',
      'right-chest': 'Right Chest Design'
    };
    return names[position] || position;
  }

  /**
   * Refresh product data (clear cache and re-read)
   */
  refreshProductData() {
    this.shopifyProduct = null;
    return this.getShopifyProduct(true);
  }
}

// Create global instance
window.PricingEngine = new PricingEngine();

console.log('✅ Pricing Engine initialized');
