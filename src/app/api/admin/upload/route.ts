/**
 * Завантаження фото з адмінки.
 *
 * Модель загроз тут проста: адмінська cookie може опинитись у чужого,
 * а файли віддаються з того самого домену, що й сайт. Тому будь-який
 * файл міг би стати stored XSS. Захист — чотири незалежні перевірки:
 *
 *  1. білий список MIME-типів; SVG заборонено (він може містити
 *     `<script>` і виконується браузером як документ);
 *  2. обмеження розміру 5 МБ — і за `file.size`, і за фактичною
 *     довжиною буфера;
 *  3. імʼя файлу генерує сервер (`crypto.randomUUID()` + розширення з
 *     MIME-мапи) — `file.name` не потрапляє у шлях НІКОЛИ, інакше це
 *     шлях до path traversal (`../../…`);
 *  4. перевірка «магічних байтів», щоб під виглядом картинки не
 *     зберегти довільний файл.
 */

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { rateLimitByIp } from "@/lib/rate-limit";

import { fail, failRetryAfter, requireAdmin } from "@/app/api/_lib/http";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Читає перші байти як ASCII — для сигнатур контейнерів. */
function asciiAt(buffer: Buffer, start: number, length: number): string {
  return buffer.subarray(start, start + length).toString("latin1");
}

/**
 * Перевірка магічних байтів: розширення з MIME-типу, але вміст мусить
 * відповідати цьому типу.
 */
function matchesSignature(mime: string, buffer: Buffer): boolean {
  switch (mime) {
    case "image/png":
      return (
        buffer.length > 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    case "image/jpeg":
      return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/gif":
      return buffer.length > 6 && asciiAt(buffer, 0, 4) === "GIF8";
    case "image/webp":
      // RIFF…WEBP
      return buffer.length > 12 && asciiAt(buffer, 0, 4) === "RIFF" && asciiAt(buffer, 8, 4) === "WEBP";
    case "image/avif":
      // ISO-BMFF: розмір, 'ftyp', бренд
      return buffer.length > 12 && asciiAt(buffer, 4, 4) === "ftyp" && ["avif", "avis"].includes(asciiAt(buffer, 8, 4));
    default:
      return false;
  }
}

/** MIME-тип → розширення файлу. Саме звідси, а не з `file.name`. */
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/** Чи це взагалі файл із `multipart/form-data`. */
function isUploadedFile(value: unknown): value is File {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { size?: unknown; type?: unknown; arrayBuffer?: unknown };
  return (
    typeof candidate.size === "number" &&
    typeof candidate.type === "string" &&
    typeof candidate.arrayBuffer === "function"
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const limit = rateLimitByIp(request.headers, "upload", 30, 600);
  if (!limit.ok) {
    return failRetryAfter(
      "Забагато завантажень. Спробуйте, будь ласка, за кілька хвилин.",
      limit.retryAfterSeconds,
    );
  }

  let file: unknown;
  try {
    const formData = await request.formData();
    file = formData.get("file");
  } catch {
    return fail("Не вдалося прочитати файл. Спробуйте, будь ласка, ще раз.", 400);
  }

  if (!isUploadedFile(file)) {
    return fail("Додайте, будь ласка, файл у полі «file»", 400);
  }

  const mime = file.type.toLowerCase();
  if (!(mime in EXTENSION_BY_MIME)) {
    return fail(
      "Такий формат не підтримується. Дозволені PNG, JPEG, WebP, AVIF і GIF. SVG завантажувати не можна: він може містити скрипт, а файли відкриваються з того самого домену, що й сайт.",
      400,
    );
  }

  if (file.size === 0) return fail("Файл порожній", 400);
  if (file.size > MAX_UPLOAD_BYTES) return fail("Файл завеликий — максимум 5 МБ", 413);

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return fail("Не вдалося прочитати файл. Спробуйте, будь ласка, ще раз.", 400);
  }

  // Повторна перевірка: `size` приходить із заголовків і йому не можна
  // довіряти як єдиному джерелу правди.
  if (buffer.length === 0) return fail("Файл порожній", 400);
  if (buffer.length > MAX_UPLOAD_BYTES) return fail("Файл завеликий — максимум 5 МБ", 413);

  if (!matchesSignature(mime, buffer)) {
    return fail("Вміст файлу не відповідає його формату — завантаження скасовано", 400);
  }

  const fileName = `${randomUUID()}.${EXTENSION_BY_MIME[mime]}`;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, fileName), buffer);
  } catch (error) {
    console.error("[admin/upload] не вдалося зберегти файл:", error);
    return fail("Не вдалося зберегти файл на сервері", 500);
  }

  return NextResponse.json({ ok: true, url: `/uploads/${fileName}` });
}
