const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export async function apiJson<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  document.dispatchEvent(new CustomEvent('api-loading', { detail: true }));
  try {
    const url = `${BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Set default content type to JSON if not provided and body is present and not FormData/URLSearchParams
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    let errorMessage = response.statusText || 'API Error';
    try {
      errorData = await response.json();
      if (errorData?.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ');
        } else {
          errorMessage = errorData.detail;
        }
      }
    } catch {
      // Ignore JSON parse errors for non-JSON error responses
    }
    throw new Error(errorMessage);
  }

  // Handle empty 204 responses
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
  } finally {
    document.dispatchEvent(new CustomEvent('api-loading', { detail: false }));
  }
}

export async function apiUpload<T = any>(endpoint: string, formData: FormData, options: RequestInit = {}): Promise<T> {
  document.dispatchEvent(new CustomEvent('api-loading', { detail: true }));
  try {
    const url = `${BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    method: options.method || 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      // Ignore
    }
    throw new Error(errorData?.detail || response.statusText || 'API Error');
  }

  return response.json();
  } finally {
    document.dispatchEvent(new CustomEvent('api-loading', { detail: false }));
  }
}
