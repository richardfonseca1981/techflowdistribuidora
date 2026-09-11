const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER;
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL;

export function Landing() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <span className="text-xl font-bold tracking-tight text-slate-900">TechFlow Distribuidora</span>
        </div>
      </header>

      <section className="bg-slate-900 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Óleo automotivo e lubrificantes de qualidade</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300 sm:text-lg">
            Distribuição confiável para o seu negócio, com foco em qualidade e atendimento.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h2 className="text-2xl font-semibold text-slate-900">Sobre</h2>
        <p className="mt-4 leading-relaxed text-slate-600">
          A TechFlow Distribuidora atua no fornecimento de óleo automotivo e lubrificantes, com
          compromisso em qualidade e atendimento.
        </p>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Catálogo em breve</h2>
          <p className="mt-4 text-slate-600">
            Nosso catálogo completo de produtos está em construção. Em breve você poderá consultar
            toda a nossa linha de óleos e lubrificantes por aqui.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h2 className="text-center text-2xl font-semibold text-slate-900">Contato</h2>
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {WHATSAPP_NUMBER && (
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-center font-medium text-white hover:bg-emerald-700 sm:w-auto"
            >
              Falar no WhatsApp
            </a>
          )}
          {CONTACT_EMAIL && (
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="w-full rounded-lg border border-slate-300 px-6 py-3 text-center font-medium text-slate-700 hover:bg-slate-100 sm:w-auto"
            >
              {CONTACT_EMAIL}
            </a>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-slate-500">
          <p className="font-medium text-slate-700">TechFlow Distribuidora</p>
          <p className="mt-1">© {year} TechFlow Distribuidora. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
