import { DatabaseAlert } from "@/components/admin/database-alert";
import { QuizManager } from "@/components/admin/quiz-manager";
import { DEFAULT_QUIZ_CONFIG } from "@/data/quiz-config";
import { describeDbError, prisma } from "@/lib/prisma";
import { normalizeQuizConfig } from "@/lib/quiz-config";

/**
 * Редактор квіза: тексти кроків, варіанти та ваги калькулятора.
 *
 * `normalizeQuizConfig` повертає типові значення, якщо в базі лежить щось
 * невалідне, — тому редактор завжди відкривається заповненим, навіть якщо
 * конфігурацію зіпсовано. За недоступної бази сторінка рендерить
 * `DatabaseAlert` із типовими значеннями замість падіння з 500.
 */
export default async function AdminQuizPage() {
  let config = DEFAULT_QUIZ_CONFIG;
  let dbError: string | null = null;

  try {
    const row = await prisma.quizConfig.findUnique({ where: { id: 1 }, select: { data: true } });
    config = row ? normalizeQuizConfig(row.data) : DEFAULT_QUIZ_CONFIG;
  } catch (error) {
    dbError = describeDbError(error);
  }

  return (
    <div className="space-y-6">
      {dbError ? <DatabaseAlert message={dbError} /> : null}

      <QuizManager config={config} />
    </div>
  );
}
