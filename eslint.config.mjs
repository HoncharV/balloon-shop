import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/uploads/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Свідоме вимкнення `next/no-img-element`.
    //
    // Ілюстрації сайту — це SVG (логотип, hero, 12 робіт у галереї), а
    // `next/image` не оптимізує SVG. У `next.config.ts` увімкнено
    // `images.unoptimized`, тому оптимізатор усе одно не працює, і
    // звичайний `<img>` з `loading="lazy"` дає той самий результат без
    // зайвої обгортки. Фото з адмінки теж віддаються як є.
    files: ["src/components/**/*.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
