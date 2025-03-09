import { NetworkQuality } from '../types/userPresence';

/**
 * Network quality indicator component
 * Displays a visual indicator of network quality
 */
export class NetworkIndicator {
  private container: HTMLElement;
  private indicator: HTMLElement;
  private qualityText: HTMLElement;
  private currentQuality: NetworkQuality = 'good';
  
  /**
   * Create a new network quality indicator
   * @param container The container element to append the indicator to
   */
  constructor(container: HTMLElement) {
    this.container = container;
    
    // Create indicator container
    const indicatorContainer = document.createElement('div');
    indicatorContainer.className = 'network-indicator-container';
    indicatorContainer.style.display = 'flex';
    indicatorContainer.style.alignItems = 'center';
    indicatorContainer.style.padding = '5px';
    indicatorContainer.style.borderRadius = '4px';
    indicatorContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    indicatorContainer.style.color = 'white';
    indicatorContainer.style.fontSize = '12px';
    indicatorContainer.style.position = 'absolute';
    indicatorContainer.style.top = '10px';
    indicatorContainer.style.right = '10px';
    indicatorContainer.style.zIndex = '1000';
    
    // Create indicator dot
    this.indicator = document.createElement('div');
    this.indicator.className = 'network-indicator-dot';
    this.indicator.style.width = '10px';
    this.indicator.style.height = '10px';
    this.indicator.style.borderRadius = '50%';
    this.indicator.style.marginRight = '5px';
    
    // Create quality text
    this.qualityText = document.createElement('span');
    this.qualityText.className = 'network-indicator-text';
    
    // Append elements
    indicatorContainer.appendChild(this.indicator);
    indicatorContainer.appendChild(this.qualityText);
    this.container.appendChild(indicatorContainer);
    
    // Set initial quality
    this.setQuality('good');
  }
  
  /**
   * Set the network quality
   * @param quality The network quality
   */
  setQuality(quality: NetworkQuality): void {
    this.currentQuality = quality;
    
    // Update indicator color
    switch (quality) {
      case 'good':
        this.indicator.style.backgroundColor = '#4CAF50'; // Green
        this.qualityText.textContent = 'Good Connection';
        break;
      case 'fair':
        this.indicator.style.backgroundColor = '#FFC107'; // Yellow
        this.qualityText.textContent = 'Fair Connection';
        break;
      case 'poor':
        this.indicator.style.backgroundColor = '#F44336'; // Red
        this.qualityText.textContent = 'Poor Connection';
        break;
    }
  }
  
  /**
   * Get the current network quality
   * @returns The current network quality
   */
  getQuality(): NetworkQuality {
    return this.currentQuality;
  }
  
  /**
   * Show the network indicator
   */
  show(): void {
    this.container.style.display = 'block';
  }
  
  /**
   * Hide the network indicator
   */
  hide(): void {
    this.container.style.display = 'none';
  }
  
  /**
   * Update the position of the network indicator
   * @param position The position object with top, right, bottom, left properties
   */
  updatePosition(position: { top?: string; right?: string; bottom?: string; left?: string }): void {
    const parent = this.indicator.parentElement;
    if (!parent) return;
    
    if (position.top !== undefined) parent.style.top = position.top;
    if (position.right !== undefined) parent.style.right = position.right;
    if (position.bottom !== undefined) parent.style.bottom = position.bottom;
    if (position.left !== undefined) parent.style.left = position.left;
  }
}