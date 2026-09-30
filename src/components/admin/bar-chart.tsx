/**
 * Стовпчиковий графік на CSS — без бібліотек графіків.
 *
 * Висота стовпчика — відсоток від максимуму в наборі даних, тому графік
 * читається за будь-якого масштабу цифр. Значення підписане над
 * стовпчиком, дата — під ним. Серверний компонент: статична розмітка,
 * жодних вимірювань у браузері.
 */
export function BarChart({
  data,
  title,
}: {
  data: { label: string; value: number }[];
  title?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Даних поки немає</p>;
  }

  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <div className="space-y-3">
      {title ? <p className="text-sm font-medium text-muted-foreground">{title}</p> : null}

      <div className="flex items-end gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        {data.map((point) => {
          // Навіть нульове значення має лишити видиму позначку, інакше
          // порожній день виглядає як відсутність даних.
          const height = point.value === 0 ? 2 : Math.max(6, Math.round((point.value / max) * 100));

          return (
            <div key={point.label} className="flex min-w-8 flex-1 flex-col items-center gap-1.5">
              <span className="text-[0.65rem] font-semibold text-foreground">{point.value}</span>
              <div
                className="flex h-32 w-full items-end rounded-t-md bg-muted"
                title={`${point.label}: ${point.value}`}
              >
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-primary to-brand-blue"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[0.65rem] whitespace-nowrap text-muted-foreground">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
