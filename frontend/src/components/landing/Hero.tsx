import { HERO_CONTENT } from "./data";
import { PlaceholderImage } from "./PlaceholderImage";

// Textura de fundo do Hero: padrão SVG de pontos discreto (data URI, sem
// rede/dependência nova) sobreposto por uma camada #1B3A6B semi-transparente,
// no lugar do bloco de cor sólida. Placeholder até existir uma foto real de
// distribuição/logística da empresa.
const HERO_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%2393B4D9' fill-opacity='0.4'/%3E%3C/svg%3E\")";

export function Hero({ whatsappHref }: { whatsappHref: string | null }) {
  return (
    <section id="home" className="grid lg:min-h-[600px] lg:grid-cols-2">
      <div className="relative order-1 flex flex-col justify-center overflow-hidden px-6 py-16 text-white sm:px-10 lg:order-1 lg:py-20">
        <div
          className="absolute inset-0 bg-[#152D54]"
          style={{ backgroundImage: HERO_PATTERN, backgroundSize: "28px 28px" }}
        />
        <div className="absolute inset-0 bg-[#1B3A6B]/[0.83]" />

        <div className="relative z-10 flex flex-col">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#93B4D9]">
            Distribuidora de óleo automotivo e lubrificantes
          </p>
          <h1 className="text-4xl font-black uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            {HERO_CONTENT.title}
          </h1>
          <p className="mt-6 max-w-md text-white/80 sm:text-lg">{HERO_CONTENT.subtitle}</p>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex w-fit items-center justify-center rounded-full bg-[#F59E0B] px-8 py-3.5 font-semibold text-white shadow-lg transition hover:bg-[#D97706]"
            >
              Onde comprar
            </a>
          )}
        </div>
      </div>

      <div className="order-2 lg:order-2">
        <PlaceholderImage
          label="Linha de produtos TechFlow (placeholder)"
          className="h-64 w-full sm:h-80 lg:h-full"
        />
      </div>
    </section>
  );
}
