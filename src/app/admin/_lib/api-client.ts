/**
 * Звернення до `/api/admin/*` з клієнтських компонентів адмінки.
 *
 * Усі адмінські роути відповідають однаковим конвертом
 * `{ ok, message?, fields? }`, тому розбір відповіді та переклад мережевої
 * помилки в українське речення живуть в одному місці. Інакше кожна форма
 * мала б свою копію `try/catch` і свій текст помилки.
 *
 * Папка `_lib` (з підкресленням) не стає маршрутом — це приватний модуль.
 */

/** Конверт відповіді всіх API-роутів адмінки. */
type ApiEnvelope = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields?: Record<string, string> };

const NETWORK_ERROR =
  "Не вдалося звернутися до сервера. Перевірте, будь ласка, з’єднання й спробуйте ще раз.";

function parseEnvelope(payload: unknown): ApiEnvelope {
  if (typeof payload !== "object" || payload === null) return {};
  return payload as ApiEnvelope;
}

/**
 * `POST` / `PATCH` / `DELETE` з JSON-тілом.
 *
 * Ніколи не кидає виняток: мережева помилка, некоректний JSON і відповідь
 * зі статусом помилки повертаються однаково — `{ ok: false, message }`.
 */
export async function sendJson<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const envelope = parseEnvelope(payload);
    if (!response.ok || envelope.ok === false) {
      return {
        ok: false,
        message: envelope.message ?? `Сервер відповів помилкою (${response.status})`,
        fields: envelope.fields,
      };
    }

    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}

/**
 * Завантаження фото через `XMLHttpRequest`.
 *
 * `fetch` не дає прогресу передавання, а адміністратор має бачити, що
 * файл справді завантажується, — тому тут XHR із подією `progress`.
 */
export function uploadImage(
  file: File,
  onProgress: (percent: number) => void,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    const form = new FormData();
    form.append("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/upload");

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    request.addEventListener("load", () => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = null;
      }

      const envelope = parseEnvelope(payload) as ApiEnvelope & { url?: string };
      if (request.status >= 200 && request.status < 300 && envelope.ok && envelope.url) {
        resolve({ ok: true, url: envelope.url });
        return;
      }

      resolve({
        ok: false,
        message: envelope.message ?? `Не вдалося завантажити файл (${request.status})`,
      });
    });

    request.addEventListener("error", () => {
      resolve({ ok: false, message: NETWORK_ERROR });
    });

    request.send(form);
  });
}
