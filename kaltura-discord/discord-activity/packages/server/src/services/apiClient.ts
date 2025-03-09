import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ApiClientOptions {
  baseUrl: string;
  timeout?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(options: ApiClientOptions) {
    this.client = axios.create({
      baseURL: options.baseUrl,
      timeout: options.timeout || 10000,
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        console.error('API request failed:', error.message);
        
        // Handle specific error cases
        if (error.response) {
          console.error('Error response:', {
            status: error.response.status,
            data: error.response.data
          });
        } else if (error.request) {
          console.error('No response received:', error.request);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if a token is set
   * @returns True if a token is set, false otherwise
   */
  hasToken(): boolean {
    return this.token !== null;
  }

  /**
   * Set the authentication token
   * @param token The token to set
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Clear the authentication token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Make a GET request
   * @param url The URL to request
   * @param config Optional request configuration
   * @returns A promise that resolves to the response data
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Make a POST request
   * @param url The URL to request
   * @param data The data to send
   * @param config Optional request configuration
   * @returns A promise that resolves to the response data
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   * @param url The URL to request
   * @param data The data to send
   * @param config Optional request configuration
   * @returns A promise that resolves to the response data
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request
   * @param url The URL to request
   * @param config Optional request configuration
   * @returns A promise that resolves to the response data
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient({
  baseUrl: process.env.API_GATEWAY_URL || 'http://localhost:3000/api',
});