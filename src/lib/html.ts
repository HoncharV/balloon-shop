/**
 * Екранування для HTML-вставок.
 *
 * Виділено в окремий модуль, бо це безпекова межа: усе, що приходить
 * від користувача (ім'я, коментар), потрапляє в HTML-розмітку
 * Telegram-повідомлення і в JSON-LD. Без екранування `<b>` у коментарі
 * ламає повідомлення, а в гіршому випадку — стає ін'єкцією.
 */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Екранування для вставки всередину `<script type="application/ld+json">`.
 * В `<script>` недостатньо HTML-сутностей: послідовність `</script>`
 * чи `<!--` завершує блок. Тому ламаємо символи Unicode-escape'ами.
 */
export function escapeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
