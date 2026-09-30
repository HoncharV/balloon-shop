"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LogIn, ShieldAlert } from "lucide-react";

import { sendJson } from "@/app/admin/_lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GENERATE_SECRET =
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`;

/**
 * Форма входу в адмінку.
 *
 * Якщо змінні середовища не задані, форма показує не «невірний пароль»,
 * а точну інструкцію, що саме заповнити: інакше адміністратор шукає
 * проблему в паролі, якого сервер навіть не знає.
 */
export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await sendJson<{ ok: boolean }>("/api/admin/login", "POST", {
      login: login.trim(),
      password,
    });

    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  if (!configured) {
    return (
      <Card className="w-full max-w-xl">
        <CardHeader>
          <span
            className="flex size-11 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground"
            aria-hidden="true"
          >
            <ShieldAlert className="size-5" />
          </span>
          <CardTitle>Вхід ще не налаштований</CardTitle>
          <CardDescription>
            Сервер не бачить облікових даних адміністратора, тому вхід неможливий. Це не помилка
            пароля — потрібно заповнити змінні середовища.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Створіть у корені проєкту файл <code className="font-mono">.env</code> (скопіюйте{" "}
            <code className="font-mono">.env.example</code>) і задайте три змінні:
          </p>

          <ul className="space-y-2">
            <li className="rounded-xl border border-border bg-muted/40 p-3">
              <code className="font-mono text-foreground">ADMIN_LOGIN</code>
              <span className="block text-muted-foreground">ваш логін, наприклад: admin</span>
            </li>
            <li className="rounded-xl border border-border bg-muted/40 p-3">
              <code className="font-mono text-foreground">ADMIN_PASSWORD</code>
              <span className="block text-muted-foreground">надійний пароль</span>
            </li>
            <li className="rounded-xl border border-border bg-muted/40 p-3">
              <code className="font-mono text-foreground">AUTH_SECRET</code>
              <span className="block text-muted-foreground">
                випадковий рядок, щонайменше 16 символів — ним підписується cookie сесії
              </span>
            </li>
          </ul>

          <div className="space-y-1.5">
            <p className="text-muted-foreground">
              Згенерувати <code className="font-mono">AUTH_SECRET</code>:
            </p>
            <code className="block overflow-x-auto rounded-xl border border-border bg-white p-3 font-mono text-xs text-foreground">
              {GENERATE_SECRET}
            </code>
          </div>

          <p className="text-muted-foreground">
            Після зміни <code className="font-mono">.env</code> перезапустіть сервер розробки:
            Next.js читає змінні середовища під час старту.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <span
          className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <KeyRound className="size-5" />
        </span>
        <CardTitle>Вхід в адмінку</CardTitle>
        <CardDescription>Введіть логін і пароль адміністратора Balloon Magic.</CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="admin-login">Логін</Label>
            <Input
              id="admin-login"
              name="login"
              type="text"
              value={login}
              autoComplete="username"
              required
              autoFocus
              onChange={(event) => setLogin(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Пароль</Label>
            <div className="flex gap-2">
              <Input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                required
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Приховати пароль" : "Показати пароль"}
              >
                {showPassword ? (
                  <EyeOff className="size-5" aria-hidden="true" />
                ) : (
                  <Eye className="size-5" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            <LogIn className="size-5" aria-hidden="true" />
            <span>{pending ? "Перевіряємо…" : "Увійти"}</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
