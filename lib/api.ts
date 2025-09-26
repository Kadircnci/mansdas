// API Client with Standardized Response Handling

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ApiError extends Error {
  public status: number;
  public code: string;
  public details?: any;

  constructor(message: string, status: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE ?? '/api';
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  private removeAuthTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  private setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const result: ApiResponse = await response.json();
      
      if (result.success && result.data?.access_token) {
        this.setAuthToken(result.data.access_token);
        if (result.data.refresh_token) {
          this.setRefreshToken(result.data.refresh_token);
        }
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private handleUnauthorized(): void {
    this.removeAuthTokens();
    if (typeof window !== 'undefined' && window.location.pathname !== '/giris') {
      window.location.href = '/giris';
    }
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retried = false
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized
      if (response.status === 401 && !retried) {
        const refreshSuccessful = await this.refreshAccessToken();
        
        if (refreshSuccessful) {
          // Retry the original request once
          return this.request<T>(endpoint, options, true);
        } else {
          this.handleUnauthorized();
          throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
        }
      }

      const result: ApiResponse<T> = await response.json();

      // Handle API errors (when response is not 2xx but has proper format)
      if (!response.ok) {
        throw new ApiError(
          result.error?.message || 'An error occurred',
          response.status,
          result.error?.code || 'UNKNOWN_ERROR',
          result.error?.details
        );
      }

      // Handle successful responses that indicate failure
      if (!result.success) {
        throw new ApiError(
          result.error?.message || 'Request failed',
          response.status,
          result.error?.code || 'REQUEST_FAILED',
          result.error?.details
        );
      }

      return result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  // GET request
  public async get<T = any>(
    endpoint: string,
    params?: Record<string, string | number | boolean>
  ): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return this.request<T>(url.pathname + url.search);
  }

  // POST request
  public async post<T = any>(
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  public async put<T = any>(
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  public async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Upload files
  public async upload<T = any>(
    endpoint: string,
    formData: FormData
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }
}

// Export singleton instance
export const api = new ApiClient();

// Legacy function for backward compatibility
export async function apiFetch(
  input: string, 
  init: RequestInit = {}, 
  _retried = false
): Promise<Response> {
  try {
    const result = await api.request(input, init, _retried);
    
    // Convert back to Response-like object for backward compatibility
    const response = new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      const response = new Response(JSON.stringify({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response;
    }
    
    throw error;
  }
}

// Specific API methods for common operations
export const postsApi = {
  // Get paginated posts
  getPosts: (params?: PaginationParams & { 
    status?: string; 
    platform?: string; 
    search?: string; 
  }) => api.get('/posts', params as Record<string, string | number | boolean>),
  
  // Get single post
  getPost: (id: string) => api.get(`/posts/${id}`),
  
  // Create new post
  createPost: (data: any) => api.post('/posts', data),
  
  // Update post
  updatePost: (id: string, data: any) => api.put(`/posts/${id}`, data),
  
  // Delete post
  deletePost: (id: string) => api.delete(`/posts/${id}`),
};

export const accountsApi = {
  // Get user accounts
  getAccounts: (params?: { platform?: string; active?: boolean }) => 
    api.get('/accounts', params as Record<string, string | number | boolean>),
  
  // Get single account
  getAccount: (id: string) => api.get(`/accounts/${id}`),
  
  // Connect new account
  connectAccount: (data: any) => api.post('/accounts', data),
  
  // Update account
  updateAccount: (id: string, data: any) => api.put(`/accounts/${id}`, data),
  
  // Delete account
  deleteAccount: (id: string) => api.delete(`/accounts/${id}`),
};

export const contentApi = {
  // Generate content with AI
  generateContent: (data: {
    prompt: string;
    tone?: string;
    platform?: string;
    language?: string;
    maxTokens?: number;
  }) => api.post('/content/generate', data),
  
  // Generate caption for existing content
  generateCaption: (data: {
    title: string;
    content: string;
    platform?: string;
    tone?: string;
    language?: string;
  }) => api.post('/content/caption', data),
};

export const authApi = {
  // Login
  login: (credentials: { username: string; password: string }) => 
    api.post('/auth/login', credentials),
  
  // Register
  register: (data: { username: string; password: string; email?: string }) => 
    api.post('/auth/register', data),
  
  // Get current user
  getCurrentUser: () => api.get('/auth/me'),
  
  // Refresh token
  refreshToken: (refreshToken: string) => 
    api.post('/auth/refresh', { refresh_token: refreshToken }),
};


