import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/token-store";
import type {
  AuthUser,
  LoginResponse,
  RefreshResponse,
} from "@/lib/auth/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

type ApiRequestOptions = {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

type JsonRecord = Record<string, unknown>;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let refreshPromise: Promise<string | null> | null = null;

function buildHeaders(
  initHeaders: HeadersInit | undefined,
  token: string | null,
  auth: boolean,
  body: BodyInit | null,
): Headers {
  const headers = new Headers(initHeaders);

  if (body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`;

  try {
    const data = (await response.json()) as JsonRecord;
    const message = data.message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      clearAccessToken();
      return null;
    }

    const data = (await response.json()) as RefreshResponse;
    const token = data.accessToken;

    if (!token) {
      clearAccessToken();
      return null;
    }

    setAccessToken(token);
    return token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  const auth = options.auth ?? true;
  const retryOnUnauthorized = options.retryOnUnauthorized ?? true;
  const token = getAccessToken();
  const headers = buildHeaders(init.headers, token, auth, init.body ?? null);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      const retryHeaders = buildHeaders(
        init.headers,
        newToken,
        auth,
        init.body ?? null,
      );
      const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        credentials: "include",
        headers: retryHeaders,
      });

      if (!retryResponse.ok) {
        throw new ApiError(
          await readErrorMessage(retryResponse),
          retryResponse.status,
        );
      }

      return (await retryResponse.json()) as T;
    }

    throw new ApiError("Unauthorized", 401);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const data = await apiRequest<LoginResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    { auth: false, retryOnUnauthorized: false },
  );

  setAccessToken(data.accessToken);
}

export async function logoutSession(): Promise<void> {
  try {
    await apiRequest<{ message: string }>(
      "/auth/logout",
      {
        method: "POST",
      },
      { auth: false, retryOnUnauthorized: false },
    );
  } finally {
    clearAccessToken();
  }
}

export async function getAuthenticatedUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/me");
}

export function getGoogleLoginUrl(): string {
  return `${API_BASE_URL}/auth/google`;
}
