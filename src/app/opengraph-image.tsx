import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Зображення для соцмереж (Open Graph / Twitter card).
 *
 * Генерується на етапі збірки (`force-static`), тому жодних звернень до
 * мережі в рантаймі. Шрифти беремо з `public/fonts`: у кожного підмножини
 * (latin / cyrillic) свій файл, і satori добирає глифи з наступного
 * зареєстрованого шрифту — тому в списку є всі чотири. Без цього
 * український текст перетворився б на «квадратики».
 *
 * Шрифти завантажені з @fontsource/inter (OFL), файли лежать у репозиторії.
 */

export const runtime = "nodejs";
export const alt = "Balloon Magic — повітряні кульки для будь-якого свята";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

const FONT_DIR = join(process.cwd(), "public", "fonts");

async function loadFont(file: string): Promise<ArrayBuffer> {
  const buffer = await readFile(join(FONT_DIR, file));
  // Копіюємо у свіжий ArrayBuffer: Buffer може бути частиною спільного
  // пулу, а satori очікує власний ArrayBuffer.
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/** Кулька: еліпс із градієнтом, блиском і ниточкою. */
function Balloon({
  left,
  top,
  width,
  height,
  from,
  to,
  rotate,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  from: string;
  to: string;
  rotate: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        display: "flex",
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          width,
          height,
          borderRadius: "50%",
          background: `linear-gradient(140deg, ${from}, ${to})`,
          boxShadow: "0 18px 40px rgba(255,105,180,0.28)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: width * 0.22,
          top: height * 0.16,
          width: width * 0.26,
          height: height * 0.2,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.55)",
        }}
      />
    </div>
  );
}

export default async function OpengraphImage() {
  const [interCyrillic400, interCyrillic700, interLatin400, interLatin700] = await Promise.all([
    loadFont("inter-cyrillic-400-normal.woff"),
    loadFont("inter-cyrillic-700-normal.woff"),
    loadFont("inter-latin-400-normal.woff"),
    loadFont("inter-latin-700-normal.woff"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #FFF1F8 0%, #F2F9FF 55%, #FFFBEB 100%)",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* Декоративні кульки праворуч */}
        <Balloon left={880} top={70} width={150} height={185} from="#FF69B4" to="#FF9ECD" rotate={-6} />
        <Balloon left={1030} top={210} width={118} height={146} from="#87CEEB" to="#BCE5F7" rotate={7} />
        <Balloon left={930} top={392} width={168} height={206} from="#FFD700" to="#FFE97A" rotate={4} />

        {/* Верхній рядок: бренд */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(140deg, #FF69B4, #FFB3D9)",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#1F2937", letterSpacing: -0.5 }}>
            Balloon Magic
          </div>
        </div>

        {/* Центр: заголовок */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 780 }}>
          <div
            style={{
              display: "flex",
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#1F2937",
              letterSpacing: -1.5,
            }}
          >
            Повітряні кульки для будь-якого свята
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: "#5B6472", lineHeight: 1.35 }}>
            Доставка кульок, фотозони та оформлення свят у Києві
          </div>
        </div>

        {/* Нижній рядок: переваги */}
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: "#FF69B4" }}>
            Гарантія польоту 7 днів
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#5B6472" }}>Доставка день у день</div>
          <div style={{ display: "flex", fontSize: 24, color: "#5B6472" }}>1000+ свят</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: interCyrillic400, weight: 400, style: "normal" },
        { name: "Inter", data: interCyrillic700, weight: 700, style: "normal" },
        { name: "Inter", data: interLatin400, weight: 400, style: "normal" },
        { name: "Inter", data: interLatin700, weight: 700, style: "normal" },
      ],
    },
  );
}
