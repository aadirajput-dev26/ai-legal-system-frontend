const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    // Try refreshing the token
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      localStorage.setItem('accessToken', data.data.accessToken);
      headers['Authorization'] = `Bearer ${data.data.accessToken}`;
      const retryRes = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });
      if (!retryRes.ok) throw new Error(`API Error: ${retryRes.status}`);
      return retryRes.json();
    }
    // Refresh also failed — redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const errMsg = errorBody?.error?.message || errorBody?.error || `API Error: ${res.status}`;
    throw new Error(errMsg);
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────
export const auth = {
  signup: (body: { name: string; email: string; password: string }) =>
    request<any>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  refresh: () =>
    request<any>('/auth/refresh', { method: 'POST' }),
  logout: () =>
    request<any>('/auth/logout', { method: 'POST' }),
  me: () =>
    request<any>('/auth/me'),
};

// ── Organisations ──────────────────────────────────────────────────
export const organisations = {
  list: () =>
    request<any>('/organisations'),
  create: (body: { name: string; description?: string }) =>
    request<any>('/organisations', { method: 'POST', body: JSON.stringify(body) }),
  get: (id: string) =>
    request<any>(`/organisations/${id}`),
  update: (id: string, body: { name?: string; description?: string }) =>
    request<any>(`/organisations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<any>(`/organisations/${id}`, { method: 'DELETE' }),
  members: {
    list: (orgId: string) =>
      request<any>(`/organisations/${orgId}/members`),
    add: (orgId: string, body: { email: string; role: string }) =>
      request<any>(`/organisations/${orgId}/members`, { method: 'POST', body: JSON.stringify(body) }),
    updateRole: (orgId: string, userId: string, body: { role: string }) =>
      request<any>(`/organisations/${orgId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (orgId: string, userId: string) =>
      request<any>(`/organisations/${orgId}/members/${userId}`, { method: 'DELETE' }),
  },
};

// ── Cases ──────────────────────────────────────────────────────────
export const cases = {
  list: (orgId: string) =>
    request<any>(`/organisations/${orgId}/cases`),
  create: (orgId: string, body: any) =>
    request<any>(`/organisations/${orgId}/cases`, { method: 'POST', body: JSON.stringify(body) }),
  get: (caseId: string) =>
    request<any>(`/cases/${caseId}`),
  update: (caseId: string, body: any) =>
    request<any>(`/cases/${caseId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (caseId: string) =>
    request<any>(`/cases/${caseId}`, { method: 'DELETE' }),
  members: {
    list: (caseId: string) =>
      request<any>(`/cases/${caseId}/members`),
    add: (caseId: string, body: { userId: string; role: string }) =>
      request<any>(`/cases/${caseId}/members`, { method: 'POST', body: JSON.stringify(body) }),
    updateRole: (caseId: string, userId: string, body: { role: string }) =>
      request<any>(`/cases/${caseId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (caseId: string, userId: string) =>
      request<any>(`/cases/${caseId}/members/${userId}`, { method: 'DELETE' }),
  },
};

// ── Documents ─────────────────────────────────────────────────────
export const documents = {
  list: (caseId: string) =>
    request<any>(`/cases/${caseId}/documents`),
  create: (caseId: string, body: FormData | object) => {
    if (body instanceof FormData) {
      return request<any>(`/cases/${caseId}/documents`, { method: 'POST', body });
    }
    return request<any>(`/cases/${caseId}/documents`, { method: 'POST', body: JSON.stringify(body) });
  },
};

// ── Chat ──────────────────────────────────────────────────────────
export const chat = {
  listThreads: (caseId: string) =>
    request<any>(`/cases/${caseId}/chats`),
  createThread: (caseId: string, title?: string) =>
    request<any>(`/cases/${caseId}/chats`, { method: 'POST', body: JSON.stringify({ title: title || 'New Chat' }) }),
  getHistory: (caseId: string, chatId: string) =>
    request<any>(`/cases/${caseId}/chats/${chatId}/history`),
  sendMessage: (caseId: string, chatId: string, message: string) =>
    request<any>(`/cases/${caseId}/chats/${chatId}/message`, { method: 'POST', body: JSON.stringify({ message }) }),

  sendMessageStream: async (
    caseId: string,
    chatId: string,
    message: string,
    onDelta: (chunk: string) => void,
    onDone?: (usage: any) => void,
  ): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const res = await fetch(`${API_BASE}/cases/${caseId}/chats/${chatId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ message }),
    });

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `API Error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.event === 'delta' && parsed.content) {
            onDelta(parsed.content);
          } else if (parsed.event === 'done') {
            onDone?.(parsed.usage);
          }
        } catch {
          // Partial or non-JSON line — skip
        }
      }
    }
  },
};

// ── Hearings ──────────────────────────────────────────────────────
export const hearings = {
  list: (caseId: string) =>
    request<any>(`/cases/${caseId}/hearings`),
  create: (caseId: string, body: { date: string; notes?: string }) =>
    request<any>(`/cases/${caseId}/hearings`, { method: 'POST', body: JSON.stringify(body) }),
};
