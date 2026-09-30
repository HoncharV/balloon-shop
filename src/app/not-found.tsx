import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div className="max-w-md">
        <p className="font-display text-6xl font-bold text-gradient-brand">404</p>
        <h1 className="mt-4 text-3xl font-bold">Такої сторінки немає</h1>
        <p className="mt-3 text-muted-foreground">
          Можливо, посилання застаріло. Поверніться на головну — там кульки, набори й
          калькулятор вартості.
        </p>
        <Link href="/" className={`${buttonVariants({ size: "lg" })} mt-8`}>
          На головну
        </Link>
      </div>
    </main>
  );
}
