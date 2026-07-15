export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(body: ApiErrorBody["error"]) {
    super(body.message);
    this.code = body.code;
    this.details = body.details;
  }
}

function humanizeRawErrorBody(status: number, text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return `Server error (${status})`;
  if (/<html[\s>]/i.test(trimmed) || /internal server error/i.test(trimmed)) {
    return `שגיאת שרת פנימית (${status}). בדקו לוגים ב-backend עבור social_publish_crash / unhandled_api_error.`;
  }
  if (trimmed.length > 280) {
    return `${trimmed.slice(0, 280)}…`;
  }
  return trimmed;
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: humanizeRawErrorBody(res.status, text) };
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = options;
  const res = await fetch(path, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await parseResponseBody(res);
  if (!res.ok) {
    const payload = data as { error?: ApiErrorBody["error"]; message?: string } | null;
    if (payload?.error) {
      const details = payload.error.details;
      const detailMsg =
        details && typeof details.exception_message === "string"
          ? ` — ${details.exception_type || "Error"}: ${details.exception_message}`
          : "";
      throw new ApiError({
        ...payload.error,
        message: `${payload.error.message}${detailMsg}`,
      });
    }
    if (res.status === 502) {
      throw new Error("השרת אינו זמין כרגע. ודאו שה-Backend פועל או נסו שוב בעוד רגע.");
    }
    throw new Error(payload?.message || `Server error (${res.status})`);
  }
  return data as T;
}
