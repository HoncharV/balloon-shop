/**
 * Спільні налаштування cookie.
 *
 * ГОЛОВНЕ: прапорець `Secure` НЕ можна виводити з `NODE_ENV`.
 *
 * Чому це не очевидно й чому це справжній баг:
 *  · у production-збірці, відкритій по звичайному http (не лише
 *    `http://localhost`, а й, наприклад, `http://192.168.1.50:3000`),
 *    cookie отримає `Secure` — і браузер його просто не надішле;
 *  · для адмінки це виглядає так: логін «проходить», сторінка
 *    перезавантажується, і ви знову на формі входу, без жодної помилки;
 *  · для лічильника відвідувань — кожен запит рахується як новий
 *    відвідувач, тому статистика перебільшена.
 *
 * (Chrome вважає `localhost` безпечним джерелом і надсилає `Secure`-cookie
 * навіть по http, тому на `npm run dev` проблема не проявляється. Через це
 * її легко не помітити до самого деплою.)
 *
 * Єдине надійне джерело правди — публічна адреса сайту: якщо вона `https://`,
 * cookie має бути `Secure`. TLS нерідко завершується на проксі, тому
 * орієнтуватись на сам факт запиту теж не можна.
 */

/**
 * Чи має cookie позначатися як `Secure`.
 *
 * Назва свідомо НЕ починається з `use`: правило `react-hooks/rules-of-hooks`
 * інакше вважає функцію React-хуком і забороняє викликати її зі звичайної
 * функції (`httpOnlyCookieOptions`).
 */
export function shouldUseSecureCookies(): boolean {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().startsWith("https://");
}

/**
 * Типові налаштування cookie для сесії та ідентифікаторів відвідувача.
 * `httpOnly` обов'язковий: цим cookie не має керувати JavaScript.
 */
export function httpOnlyCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge,
  };
}
