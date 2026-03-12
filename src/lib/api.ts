const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("trident_token");
}

function setToken(token: string): void {
  localStorage.setItem("trident_token", token);
}

function clearToken(): void {
  localStorage.removeItem("trident_token");
}

function getUser(): any | null {
  const data = localStorage.getItem("trident_user");
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setUser(user: any): void {
  localStorage.setItem("trident_user", JSON.stringify(user));
}

function clearUser(): void {
  localStorage.removeItem("trident_user");
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle token expiry — auto-logout on 401
  if (res.status === 401 && token) {
    clearToken();
    clearUser();
    // Dispatch a custom event so AuthContext can react
    window.dispatchEvent(new CustomEvent("auth:expired"));
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // --- Auth ---
  auth: {
    async register(data: { name: string; email: string; phone?: string; password: string }) {
      const result = await request<{ token: string; user: any }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setToken(result.token);
      setUser(result.user);
      return result;
    },

    async login(data: { email: string; password: string }) {
      const result = await request<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setToken(result.token);
      setUser(result.user);
      return result;
    },

    async me() {
      const result = await request<{ user: any }>("/auth/me");
      // Persist refreshed user data to localStorage to prevent desync
      if (result.user) {
        setUser(result.user);
      }
      return result;
    },

    logout() {
      clearToken();
      clearUser();
    },

    getToken,
    getUser,
    isLoggedIn: () => !!getToken(),
  },

  // --- Consoles ---
  consoles: {
    list: () => request<any[]>("/consoles"),
    grouped: () => request<any[]>("/consoles/grouped"),
    get: (id: string) => request<any>(`/consoles/${id}`),
    updateStatus: (id: string, status: string) =>
      request(`/consoles/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },

  // --- Bookings ---
  bookings: {
    list: () => request<any[]>("/bookings"),
    availability: (date: string, consoleType?: string) => {
      const params = new URLSearchParams({ date });
      if (consoleType) params.set("console_type", consoleType);
      return request<any[]>(`/bookings/availability?${params}`);
    },
    create: (data: {
      console_type: string;
      date: string;
      time_slot: string;
      players?: number;
      duration_hours?: number;
    }) =>
      request<any>("/bookings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    cancel: (id: string) =>
      request(`/bookings/${id}/cancel`, { method: "PATCH" }),
  },

  // --- Snacks ---
  snacks: {
    list: () => request<any[]>("/snacks"),
  },

  // --- Orders ---
  orders: {
    list: () => request<any[]>("/orders"),
    create: (data: { items: { id: number; quantity: number }[]; console_id?: string }) =>
      request<any>("/orders", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      request(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },

  // --- Pricing ---
  pricing: {
    list: () => request<any[]>("/pricing"),
  },

  // --- Loyalty ---
  loyalty: {
    get: () => request<any>("/loyalty"),
    rewards: () => request<any[]>("/loyalty/rewards"),
    leaderboard: () => request<any[]>("/loyalty/leaderboard"),
    redeem: (rewardId: string) =>
      request(`/loyalty/redeem/${rewardId}`, { method: "POST" }),
  },

  // --- Admin ---
  admin: {
    stats: () => request<any>("/admin/stats"),
    sessions: () => request<any[]>("/admin/sessions"),
    orders: (status?: string) => {
      const params = status ? `?status=${status}` : "";
      return request<any[]>(`/admin/orders${params}`);
    },
    bookings: (filters?: { date?: string; status?: string }) => {
      const params = new URLSearchParams();
      if (filters?.date) params.set("date", filters.date);
      if (filters?.status) params.set("status", filters.status);
      const qs = params.toString();
      return request<any[]>(`/admin/bookings${qs ? `?${qs}` : ""}`);
    },
    customers: () => request<any[]>("/admin/customers"),
    endSession: (id: string) =>
      request(`/admin/sessions/${id}/end`, { method: "POST" }),

    // Console CRUD
    addConsole: (data: { id: string; name: string; type: string; image: string; players?: string; features?: string[] }) =>
      request<any>("/admin/consoles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    removeConsole: (id: string) =>
      request(`/admin/consoles/${id}`, { method: "DELETE" }),

    // Snack CRUD
    snacks: () => request<any[]>("/admin/snacks"),
    addSnack: (data: { name: string; price: number; image: string; category?: string }) =>
      request<any>("/admin/snacks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    editSnack: (id: number, data: { name?: string; price?: number; image?: string; category?: string; available?: boolean }) =>
      request<any>(`/admin/snacks/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    removeSnack: (id: number) =>
      request(`/admin/snacks/${id}`, { method: "DELETE" }),

    // Pricing CRUD
    pricing: () => request<any[]>("/admin/pricing"),
    addPricing: (data: { name: string; price: number; duration: string; description: string; features?: string[]; console_type: string; popular?: boolean; color?: string }) =>
      request<any>("/admin/pricing", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    editPricing: (id: string, data: { name?: string; price?: number; duration?: string; description?: string; features?: string[]; console_type?: string; popular?: boolean; color?: string }) =>
      request<any>(`/admin/pricing/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    removePricing: (id: string) =>
      request(`/admin/pricing/${id}`, { method: "DELETE" }),

    // Games CRUD
    games: () => request<any[]>("/admin/games"),
    addGame: (data: { title: string; image: string; genre: string; rating?: string; players?: string; display_order?: number; active?: boolean }) =>
      request<any>("/admin/games", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    editGame: (id: number, data: { title?: string; image?: string; genre?: string; rating?: string; players?: string; display_order?: number; active?: boolean }) =>
      request<any>(`/admin/games/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    removeGame: (id: number) =>
      request(`/admin/games/${id}`, { method: "DELETE" }),

    // Visit controls
    updateVisits: (userId: string, delta: number) =>
      request<any>(`/admin/customers/${userId}/visits`, {
        method: "PATCH",
        body: JSON.stringify({ delta }),
      }),

    // Booking approval flow
    approveBooking: (id: string) =>
      request(`/admin/bookings/${id}/approve`, { method: "POST" }),

    // Start session from confirmed booking
    startSession: (bookingId: string, playerName: string) =>
      request<any>("/admin/sessions/start", {
        method: "POST",
        body: JSON.stringify({ booking_id: bookingId, player_name: playerName }),
      }),

    // Cleanup test data
    cleanupTestData: () =>
      request("/admin/cleanup-test-data", { method: "POST" }),
  },

  // --- Games (public) ---
  games: {
    list: () => request<any[]>("/games"),
  },

  // --- Health ---
  health: () => request<{ status: string; timestamp: string }>("/health"),
};
