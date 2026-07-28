import { toast } from "sonner";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  toast?: boolean;
  errorMessage?: string;
};

type ApiResponse<T = unknown> = {
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
  } = options;

  const queryString = buildQueryString(params);
  const fullUrl = url + queryString;

  const headers: Record<string, string> = {
    ...customHeaders,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      if (showToast) toast.error("Session expired. Please log in again.");
      window.location.href = "/auth/login";
      return { data: null as T, ok: false, status: 401 };
    }

    const contentType = res.headers.get("content-type") || "";
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
      return { data, ok: false, status: res.status };
    }

    return { data, ok: true, status: res.status };
  } catch (err) {
    const msg = errorMessage || "Network error. Please try again.";
    if (showToast) toast.error(msg);
    return { data: null as T, ok: false, status: 0 };
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
    file: File,
    opts?: { params?: Record<string, string>; headers?: Record<string, string>; toast?: boolean; errorMessage?: string }
  ) {
    const { params, headers: customHeaders, toast: showToast = true, errorMessage } = opts || {};
    const queryString = buildQueryString(params);
    const fullUrl = url + queryString;

    return (async (): Promise<ApiResponse<T>> => {
      try {
        const res = await fetch(fullUrl, {
          method: "POST",
          headers: { ...customHeaders },
          body: file,
        });

        if (res.status === 401) {
          if (showToast) toast.error("Session expired. Please log in again.");
          window.location.href = "/auth/login";
          return { data: null as T, ok: false, status: 401 };
        }

        const data = await res.json();

        if (!res.ok) {
          const msg = errorMessage || data.error || `Upload failed (${res.status})`;
          if (showToast) toast.error(msg);
          return { data, ok: false, status: res.status };
        }

        return { data, ok: true, status: res.status };
      } catch {
        const msg = errorMessage || "Upload failed. Please try again.";
        if (showToast) toast.error(msg);
        return { data: null as T, ok: false, status: 0 };
      }
    })();
  },

  download: request<Blob>,
};
