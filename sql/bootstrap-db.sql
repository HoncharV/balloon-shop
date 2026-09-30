-- ============================================================================
-- Разове створення ролі та бази для застосунку Balloon Magic.
--
-- Потрібно ЛИШЕ якщо ви піднімаєте PostgreSQL нативно (без Docker):
--     & "C:\Program Files\PostgreSQL\16\bin\psql.exe" `
--         -U postgres -h 127.0.0.1 -d postgres -f sql/bootstrap-db.sql
--
-- Виконується від імені суперкористувача `postgres`.
-- Ідемпотентний: повторний запуск нічого не зламає.
--
-- Логін/пароль застосунку — `balloon` / `balloon`, тобто рівно ті самі, що
-- в docker-compose.yml. Завдяки цьому `DATABASE_URL` у .env однаковий для
-- обох способів запуску, і перемикатися між ними можна без правок.
--
-- ⚠️ Тихий інсталятор winget задає суперкористувачу postgres пароль `postgres`
--    (маніфест запускає інсталятор з `--mode unattended` без `--superpassword`),
--    тому попередній крок із власним паролем завершується помилкою автентифікації.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'balloon') THEN
    CREATE ROLE balloon WITH LOGIN PASSWORD 'balloon';
  END IF;
END
$$;

-- CREATE DATABASE не можна виконувати всередині транзакції / DO-блоку,
-- тому використовуємо psql-ідіому `\gexec`: спершу формуємо команду
-- (або нічого), потім виконуємо її.
SELECT 'CREATE DATABASE balloon_magic OWNER balloon'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'balloon_magic')\gexec
