const ADMIN_TOKEN_KEY = "bwcom_admin_id_token";

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function buildAdminAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Admin sign-in required");
  }

  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchAdminSession(): Promise<{ email: string; name: string }> {
  const token = getAdminToken();
  if (!token) {
    throw new Error("Missing token");
  }

  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Session check failed (${response.status})`);
  }

  const data = (await response.json()) as { user: { email: string; name: string } };
  return data.user;
}
