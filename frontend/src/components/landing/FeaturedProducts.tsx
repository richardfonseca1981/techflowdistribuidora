import { PLACEHOLDER_PRODUCTS } from "./data";
import { PlaceholderImage } from "./PlaceholderImage";

export function FeaturedProducts({ whatsappHref }: { whatsappHref: string | null }) {
  return (
    <section id="produtos" className="bg-[#F8FAFC] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#1B3A6B]">Produtos em destaque</p>
          <h2 className="mt-2 text-2xl font-bold text-[#1A1A1A] sm:text-3xl">Conheça alguns de nossos produtos</h2>
          <p className="mt-4 text-[#64748B]">
            Catálogo completo em construção. Os itens abaixo são exemplos ilustrativos da nossa linha
            de produtos.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLACEHOLDER_PRODUCTS.map((product) => (
            <div
              key={product.name}
              className="flex flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm transition hover:shadow-md"
            >
              <PlaceholderImage label="Imagem do produto (placeholder)" className="h-44 w-full" />
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-semibold text-[#1A1A1A]">{product.name}</h3>
                <p className="mt-1 flex-1 text-sm text-[#64748B]">{product.description}</p>
                {whatsappHref ? (
                  <a
                    href={`${whatsappHref}?text=${encodeURIComponent(`Olá! Tenho interesse em saber mais sobre: ${product.name}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D97706]"
                  >
                    Saiba mais
                  </a>
                ) : (
                  <span className="mt-4 inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#94A3B8]">
                    Saiba mais
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          {/* Sem página de catálogo real ainda — leva para o WhatsApp com uma
              mensagem genérica. Trocar por link para a página de catálogo
              completo quando ela existir. */}
          {whatsappHref && (
            <a
              href={`${whatsappHref}?text=${encodeURIComponent("Olá! Gostaria de conhecer o catálogo completo de produtos.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-[#F59E0B] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D97706]"
            >
              Visualizar todos os produtos
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
