import { toast } from "sonner";

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  toast?: boolean;
  errorMessage?: string;
  onLoading?: (loading: boolean) => void;
  retries?: number;
  retryDelayMs?: number;
  credentials?: RequestCredentials;
};

export type ApiResponse<T = unknown> = {
  data: T;
  error?: string;
  ok: boolean;
  status: number;
};

function buildQueryString(
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    params,
    headers: customHeaders,
    toast: showToast = true,
    errorMessage,
    onLoading,
    retries = method === "GET" ? 1 : 0,
    retryDelayMs = 1000,
    credentials = "same-origin",
  } = options;

  const queryString = buildQueryString(params);
  const fullUrl = url + queryString;

  const headers: Record<string, string> = {
    ...customHeaders,
  };

  if (body !== undefined && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) {
    headers["Content-Type"] = "application/json";
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[API ${method}] ${fullUrl}`);
  }

  onLoading?.(true);

  let attempt = 0;
  let lastError: unknown;
  let res: Response | null = null;

  while (attempt <= retries) {
    try {
      let reqBody: BodyInit | undefined;
      if (body !== undefined) {
        if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer || typeof body === "string") {
          reqBody = body as BodyInit;
        } else {
          reqBody = JSON.stringify(body);
        }
      }

      res = await fetch(fullUrl, {
        method,
        headers,
        body: reqBody,
        credentials,
      });

      // If server error (5xx) and we have retries remaining, retry
      if (res.status >= 500 && attempt < retries) {
        attempt++;
        await delay(retryDelayMs * Math.pow(2, attempt - 1));
        continue;
      }

      break;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        attempt++;
        await delay(retryDelayMs * Math.pow(2, attempt - 1));
        continue;
      }
      break;
    }
  }

  try {
    if (!res) {
      const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      const msg = errorMessage || (isOffline 
        ? "You are offline. Please check your internet connection."
        : "Network error or timeout. Please check your connection and try again.");
      if (showToast) toast.error(msg);
      return { data: null as T, error: msg, ok: false, status: 0 };
    }

    if (res.status === 401) {
      const msg = errorMessage || "Session expired. Please log in again.";
      if (showToast) toast.error(msg);
      if (typeof window !== "undefined" && window.location.pathname !== "/auth/login") {
        try {
          window.location.href = "/auth/login";
        } catch {
          // Ignore navigation error in test environment (jsdom)
        }
      }
      return { data: null as T, error: msg, ok: false, status: 401 };
    }

    if (res.status === 403) {
      const msg = errorMessage || "Access denied. You do not have permission to perform this action.";
      if (showToast) toast.error(msg);
      return { data: null as T, error: msg, ok: false, status: 403 };
    }

    if (res.status === 429) {
      const retryAfter = res.headers ? res.headers.get("retry-after") : null;
      const msg = errorMessage || (retryAfter
        ? `Rate limit exceeded. Please try again in ${retryAfter} seconds.`
        : "Rate limit exceeded. Please try again later.");
      if (showToast) toast.error(msg);
      return { data: null as T, error: msg, ok: false, status: 429 };
    }

    const contentType = res.headers ? (res.headers.get("content-type") || "") : "";
    let data: T;

    if (contentType.includes("application/json")) {
      data = await res.json();
    } else if (contentType.includes("application/zip") || contentType.includes("application/octet-stream")) {
      data = (await res.blob()) as unknown as T;
    } else {
      data = (await res.text()) as unknown as T;
    }

    if (!res.ok) {
      const msg =
        errorMessage ||
        (typeof data === "object" && data !== null && "error" in data
          ? String((data as { error: unknown }).error)
          : `Request failed (${res.status})`);
      if (showToast) toast.error(msg);
      return { data, error: msg, ok: false, status: res.status };
    }

    return { data, ok: true, status: res.status };
  } finally {
    onLoading?.(false);
  }
}

export const api = {
  get<T = unknown>(
    url: string,
    opts?: Omit<RequestOptions, "method" | "body">
  ) {
    return request<T>(url, { ...opts, method: "GET" });
  },

  post<T = unknown>(
    url: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ) {
    return request<T>(url, { ...opts, method: "POST", body });
  },

  put<T = unknown>(
    url: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ) {
    return request<T>(url, { ...opts, method: "PUT", body });
  },

  patch<T = unknown>(
    url: string,
    body?: unknown,
    opts?: Omit<RequestOptions, "method" | "body">
  ) {
    return request<T>(url, { ...opts, method: "PATCH", body });
  },

  delete<T = unknown>(
    url: string,
    opts?: Omit<RequestOptions, "method" | "body">
  ) {
    return request<T>(url, { ...opts, method: "DELETE" });
  },

  upload<T = unknown>(
    url: string,
    file: File | Blob,
    opts?: { params?: Record<string, string>; headers?: Record<string, string>; toast?: boolean; errorMessage?: string; onLoading?: (loading: boolean) => void }
  ) {
    return request<T>(url, {
      ...opts,
      method: "POST",
      body: file,
    });
  },

  download(
    url: string,
    opts?: RequestOptions
  ) {
    return request<Blob>(url, { method: "GET", ...opts });
  },
};
