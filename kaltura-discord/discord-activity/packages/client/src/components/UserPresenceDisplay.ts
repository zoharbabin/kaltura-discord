import { UserPresence, NetworkQuality } from '../types/userPresence';

/**
 * User presence display component
 * Displays a list of users with their presence information
 */
export class UserPresenceDisplay {
  private container: HTMLElement;
  private userList: HTMLElement;
  private users: Map<string, HTMLElement> = new Map();
  
  /**
   * Create a new user presence display
   * @param container The container element to append the display to
   */
  constructor(container: HTMLElement) {
    this.container = container;
    
    // Create user list container
    const userListContainer = document.createElement('div');
    userListContainer.className = 'user-presence-container';
    userListContainer.style.position = 'absolute';
    userListContainer.style.top = '10px';
    userListContainer.style.right = '10px';
    userListContainer.style.width = '200px';
    userListContainer.style.maxHeight = '300px';
    userListContainer.style.overflowY = 'auto';
    userListContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    userListContainer.style.borderRadius = '4px';
    userListContainer.style.padding = '10px';
    userListContainer.style.color = 'white';
    userListContainer.style.fontSize = '14px';
    userListContainer.style.zIndex = '1000';
    
    // Create header with close button
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '10px';
    header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
    header.style.paddingBottom = '5px';
    
    // Add header title
    const headerTitle = document.createElement('span');
    headerTitle.textContent = 'Viewers';
    headerTitle.style.fontWeight = 'bold';
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×'; // × is the multiplication sign, looks like an X
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '16px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0 5px';
    closeButton.style.lineHeight = '1';
    closeButton.title = 'Close viewers panel';
    
    // Add click event to close button
    closeButton.addEventListener('click', () => {
      userListContainer.style.display = 'none';
    });
    
    // Add elements to header
    header.appendChild(headerTitle);
    header.appendChild(closeButton);
    
    // Create user list
    this.userList = document.createElement('div');
    this.userList.className = 'user-list';
    
    // Append elements
    userListContainer.appendChild(header);
    userListContainer.appendChild(this.userList);
    this.container.appendChild(userListContainer);
  }
  
  /**
   * Update the user presence display with new user data
   * @param users Array of user presence objects
   */
  updateUsers(users: UserPresence[]): void {
    // Track existing user IDs to remove users who left
    const currentUserIds = new Set<string>();
    
    // Update or add users
    users.forEach(user => {
      currentUserIds.add(user.id);
      
      if (this.users.has(user.id)) {
        // Update existing user
        this.updateUserElement(user);
      } else {
        // Add new user
        this.addUserElement(user);
      }
    });
    
    // Remove users who are no longer present
    this.users.forEach((element, userId) => {
      if (!currentUserIds.has(userId)) {
        element.remove();
        this.users.delete(userId);
      }
    });
  }
  
  /**
   * Add a new user element to the display
   * @param user The user presence object
   */
  private addUserElement(user: UserPresence): void {
    const userElement = document.createElement('div');
    userElement.className = 'user-item';
    userElement.dataset.userId = user.id;
    userElement.style.display = 'flex';
    userElement.style.alignItems = 'center';
    userElement.style.marginBottom = '5px';
    userElement.style.padding = '5px';
    userElement.style.borderRadius = '4px';
    
    // Status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator';
    statusIndicator.style.width = '8px';
    statusIndicator.style.height = '8px';
    statusIndicator.style.borderRadius = '50%';
    statusIndicator.style.marginRight = '8px';
    
    // Network quality indicator
    const networkIndicator = document.createElement('div');
    networkIndicator.className = 'network-indicator';
    networkIndicator.style.width = '8px';
    networkIndicator.style.height = '8px';
    networkIndicator.style.borderRadius = '50%';
    networkIndicator.style.marginRight = '8px';
    
    // Username
    const username = document.createElement('span');
    username.className = 'username';
    username.textContent = user.username;
    username.style.flex = '1';
    
    // Host badge
    const hostBadge = document.createElement('span');
    hostBadge.className = 'host-badge';
    hostBadge.textContent = 'HOST';
    hostBadge.style.fontSize = '10px';
    hostBadge.style.backgroundColor = '#4CAF50';
    hostBadge.style.color = 'white';
    hostBadge.style.padding = '2px 4px';
    hostBadge.style.borderRadius = '2px';
    hostBadge.style.marginLeft = '5px';
    hostBadge.style.display = user.isHost ? 'inline-block' : 'none';
    
    // Append elements
    userElement.appendChild(statusIndicator);
    userElement.appendChild(networkIndicator);
    userElement.appendChild(username);
    userElement.appendChild(hostBadge);
    
    // Add to user list
    this.userList.appendChild(userElement);
    this.users.set(user.id, userElement);
    
    // Update status and network quality
    this.updateUserStatus(user.id, user.status);
    this.updateUserNetworkQuality(user.id, user.networkQuality || 'good');
  }
  
  /**
   * Update an existing user element
   * @param user The user presence object
   */
  private updateUserElement(user: UserPresence): void {
    const userElement = this.users.get(user.id);
    if (!userElement) return;
    
    // Update username
    const username = userElement.querySelector('.username');
    if (username) username.textContent = user.username;
    
    // Update host badge
    const hostBadge = userElement.querySelector('.host-badge') as HTMLElement;
    if (hostBadge) hostBadge.style.display = user.isHost ? 'inline-block' : 'none';
    
    // Update status
    this.updateUserStatus(user.id, user.status);
    
    // Update network quality
    this.updateUserNetworkQuality(user.id, user.networkQuality || 'good');
  }
  
  /**
   * Update a user's status indicator
   * @param userId The user ID
   * @param status The user status
   */
  updateUserStatus(userId: string, status: string): void {
    const userElement = this.users.get(userId);
    if (!userElement) return;
    
    const statusIndicator = userElement.querySelector('.status-indicator') as HTMLElement;
    if (!statusIndicator) return;
    
    // Update status color
    switch (status) {
      case 'active':
        statusIndicator.style.backgroundColor = '#4CAF50'; // Green
        break;
      case 'inactive':
        statusIndicator.style.backgroundColor = '#FFC107'; // Yellow
        break;
      case 'away':
        statusIndicator.style.backgroundColor = '#9E9E9E'; // Gray
        break;
    }
  }
  
  /**
   * Update a user's network quality indicator
   * @param userId The user ID
   * @param quality The network quality
   */
  updateUserNetworkQuality(userId: string, quality: NetworkQuality): void {
    const userElement = this.users.get(userId);
    if (!userElement) return;
    
    const networkIndicator = userElement.querySelector('.network-indicator') as HTMLElement;
    if (!networkIndicator) return;
    
    // Update network quality color
    switch (quality) {
      case 'good':
        networkIndicator.style.backgroundColor = '#4CAF50'; // Green
        break;
      case 'fair':
        networkIndicator.style.backgroundColor = '#FFC107'; // Yellow
        break;
      case 'poor':
        networkIndicator.style.backgroundColor = '#F44336'; // Red
        break;
    }
  }
  
  /**
   * Show the user presence display
   */
  show(): void {
    this.container.style.display = 'block';
  }
  
  /**
   * Hide the user presence display
   */
  hide(): void {
    this.container.style.display = 'none';
  }
  
  /**
   * Update the position of the user presence display
   * @param position The position object with top, right, bottom, left properties
   */
  updatePosition(position: { top?: string; right?: string; bottom?: string; left?: string }): void {
    const parent = this.userList.parentElement;
    if (!parent) return;
    
    if (position.top !== undefined) parent.style.top = position.top;
    if (position.right !== undefined) parent.style.right = position.right;
    if (position.bottom !== undefined) parent.style.bottom = position.bottom;
    if (position.left !== undefined) parent.style.left = position.left;
  }
}