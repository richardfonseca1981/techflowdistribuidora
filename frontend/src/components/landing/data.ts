// Todo o conteúdo abaixo marcado como "placeholder" é provisório e deve ser
// substituído quando o catálogo real, as fotos e o blog do cliente estiverem
// disponíveis. Nenhum destes dados vem de API — são estáticos, conforme
// decisão de escopo do projeto (site 100% independente de backend).

// "Onde Comprar" é um link direto para o WhatsApp (não uma âncora — não há
// seção "Onde Comprar" no corpo da página). "Contato" abre o modal "Fale
// Conosco" em vez de navegar.
export const NAV_LINKS = [
  { kind: "anchor", href: "#home", label: "Home" },
  { kind: "anchor", href: "#sobre", label: "Sobre Nós" },
  { kind: "anchor", href: "#produtos", label: "Produtos" },
  { kind: "whatsapp", label: "Onde Comprar" },
  { kind: "anchor", href: "#blog", label: "Blog" },
  { kind: "anchor", href: "#faq", label: "FAQ" },
  { kind: "modal", label: "Contato" },
] as const;

// Hero em layout split (coluna de texto + coluna de imagem), estático —
// sem carrossel.
export const HERO_CONTENT = {
  title: "Óleo automotivo e lubrificantes de qualidade",
  subtitle: "Distribuição confiável para o seu negócio, com foco em qualidade e atendimento.",
};

// Produtos placeholder — nomes genéricos só para preencher o grid
// visualmente. Substituir pelo catálogo real assim que ele for integrado.
export const PLACEHOLDER_PRODUCTS = [
  { name: "Óleo Sintético 5W30", description: "Alta performance para motores modernos" },
  { name: "Óleo Semissintético 10W40", description: "Equilíbrio entre proteção e custo" },
  { name: "Óleo Mineral 20W50", description: "Indicado para motores de tecnologia mais simples" },
  { name: "Óleo Sintético 0W20", description: "Baixa viscosidade para economia de combustível" },
  { name: "Óleo Diesel 15W40", description: "Proteção para motores pesados a diesel" },
  { name: "Óleo Bruto Industrial", description: "Para aplicações industriais diversas" },
  { name: "Óleo para Câmbio Automático (ATF)", description: "Fluido específico para transmissões automáticas" },
  { name: "Óleo Sintético para Motos 10W30", description: "Formulado para embreagem úmida" },
  { name: "Graxa Multiuso Industrial", description: "Lubrificação de rolamentos e componentes móveis" },
];

export const FAQ_ITEMS = [
  {
    question: "O que é viscosidade de um óleo lubrificante?",
    answer:
      "Viscosidade é a resistência que o óleo oferece ao escoamento — em termos simples, o quão \"grosso\" ou \"fino\" ele é em uma dada temperatura. Ela é indicada pela classificação SAE, como em 5W30: o número antes do \"W\" (de winter, inverno) indica o comportamento do óleo a frio — quanto menor, mais fácil ele flui em baixas temperaturas, facilitando a lubrificação no momento da partida do motor. O número depois do \"W\" indica a viscosidade do óleo já na temperatura de operação do motor (por volta de 100°C). Óleos multigrade, como o 5W30, são formulados para manter a proteção adequada tanto a frio quanto a quente.",
  },
  {
    question: "Qual a diferença entre óleo mineral, semissintético e sintético?",
    answer:
      "O óleo mineral é obtido diretamente do refino do petróleo bruto, com um processo de purificação menos intenso — suas moléculas são mais heterogêneas, o que resulta em menor estabilidade térmica e oxidativa e, geralmente, intervalos de troca mais curtos. O óleo sintético passa por processos químicos mais avançados (como hidrocraqueamento ou síntese molecular), gerando moléculas mais uniformes, com melhor desempenho em temperaturas extremas, maior resistência à oxidação e intervalos de troca mais longos. O óleo semissintético é uma mistura das duas bases, buscando um equilíbrio intermediário entre desempenho e custo.",
  },
  {
    question: "O que significam as especificações API?",
    answer:
      "API (American Petroleum Institute) é um sistema de classificação que indica a categoria de serviço do óleo. Óleos para motores a gasolina usam a letra \"S\" (Service) seguida de uma segunda letra que indica a geração da especificação — por exemplo, SN ou SP, sendo letras mais avançadas no alfabeto categorias mais recentes e exigentes. Óleos para motores a diesel usam a letra \"C\" (Commercial), como em CJ-4 ou CK-4. A classificação API indica que o óleo atende aos requisitos mínimos de proteção e desempenho para motores de uma determinada geração tecnológica — mas o ideal é sempre conferir a especificação mínima exigida no manual do veículo.",
  },
  {
    question: "O que significam as especificações ACEA?",
    answer:
      "ACEA (Associação dos Fabricantes Europeus de Automóveis) é outro sistema de classificação, complementar ao API, mais alinhado a motores e sistemas de pós-tratamento de emissões europeus. As categorias são organizadas por letra e número: A/B para motores a gasolina e a diesel leve de passeio, C para óleos de baixo teor de cinzas sulfatadas (low SAPS), compatíveis com veículos equipados com catalisadores e filtros de partículas, e E para motores diesel pesados. Assim como a API, a especificação ACEA exigida deve ser sempre conferida no manual do fabricante do veículo.",
  },
  {
    question: "Com que frequência devo trocar o óleo do motor?",
    answer:
      "O intervalo ideal depende do tipo de óleo, do fabricante do veículo e das condições de uso. Como referência geral: óleos minerais costumam exigir troca a cada 5.000 km, semissintéticos entre 7.500 e 10.000 km, e sintéticos entre 10.000 e 15.000 km. Condições severas de uso — trajetos curtos frequentes, trânsito parado, ambientes com muita poeira ou reboque de carga — reduzem esses intervalos. Essas faixas são apenas uma referência: o manual do veículo é sempre a fonte definitiva para o intervalo correto.",
  },
  {
    question: "Posso misturar óleos de marcas ou viscosidades diferentes?",
    answer:
      "Como regra geral, não é recomendado. Mesmo óleos compatíveis entre si podem ter pacotes de aditivos diferentes, e a mistura pode comprometer o equilíbrio dessas formulações. Em uma situação de emergência, sem alternativa, prefira misturar óleos da mesma viscosidade e especificação API/ACEA mais próximas possível, e faça a troca completa do óleo assim que puder.",
  },
  {
    question: "O que são aditivos no óleo lubrificante?",
    answer:
      "Aditivos são substâncias químicas misturadas à base do óleo para melhorar ou conferir propriedades que a base sozinha não teria em nível suficiente. Os principais tipos incluem: detergentes e dispersantes (mantêm resíduos de combustão em suspensão, evitando depósitos e borra), antioxidantes (retardam a degradação do óleo pelo calor e oxigênio), antidesgaste (formam uma película protetora entre peças metálicas em contato), anticorrosivos, e melhoradores do índice de viscosidade (ajudam o óleo a manter comportamento estável em uma faixa maior de temperatura, essencial para óleos multigrade). A qualidade e o equilíbrio do pacote de aditivos é um dos principais fatores que diferenciam óleos de especificações distintas.",
  },
  {
    question: "Existe diferença entre óleo para motor de moto e de carro?",
    answer:
      "Sim. Motos com embreagem \"a úmido\" (banhada em óleo, compartilhando o mesmo óleo do motor) exigem uma formulação com menos aditivos modificadores de fricção — óleos automotivos modernos costumam ter esses aditivos para reduzir atrito e economizar combustível, mas isso pode fazer a embreagem da moto \"patinar\". Por isso existem classificações específicas para motos, como a JASO MA/MB, que indicam o nível de fricção adequado para embreagens úmidas. Usar o óleo errado pode comprometer a embreagem ou a transmissão da moto.",
  },
  {
    question: "É verdade que \"óleo claro é óleo bom\"?",
    answer:
      "Não necessariamente — isso é um mito comum. A cor do óleo não é um indicador confiável de qualidade ou de necessidade de troca. Óleos escurecem naturalmente com o uso porque os aditivos detergentes/dispersantes fazem exatamente o trabalho de manter fuligem e resíduos de combustão em suspensão — um óleo que escurece rápido pode estar, na verdade, cumprindo bem essa função. O intervalo de troca deve seguir o manual do veículo e a quilometragem/tempo de uso, não a aparência visual do óleo.",
  },
  {
    question: "Preciso trocar o filtro de óleo toda vez que troco o óleo?",
    answer:
      "Sim, essa é a recomendação padrão da maioria dos fabricantes. O filtro retém partículas e contaminantes que se acumulam com o uso; reaproveitar um filtro já saturado em uma troca de óleo novo reduz a eficácia da filtragem e pode recontaminar o óleo recém-trocado mais rapidamente. Trocar o filtro junto com o óleo é uma prática de baixo custo comparado ao benefício de manter a lubrificação limpa e eficiente.",
  },
  {
    question: "O que é \"borra\" no motor e como ela se forma?",
    answer:
      "Borra (ou sludge) é um depósito espesso, geralmente de cor escura, formado pela combinação de óleo degradado, fuligem, umidade e produtos de oxidação que não foram mantidos em suspensão pelos aditivos dispersantes. Ela se acumula em galerias de óleo, no cárter e em componentes internos do motor, podendo obstruir a circulação de óleo e prejudicar a lubrificação. As causas mais comuns são troca de óleo em intervalos muito longos, uso de óleo de qualidade inadequada para o motor, ou trajetos curtos e frequentes que não permitem o motor atingir a temperatura ideal para evaporar a umidade acumulada.",
  },
  {
    question: "Motores de alta quilometragem precisam de óleo mais viscoso?",
    answer:
      "Em muitos casos, sim — motores com muitos quilômetros rodados tendem a ter maior desgaste interno (folgas maiores entre pistão/cilindro e demais componentes), e um óleo com viscosidade levemente mais alta pode ajudar a manter a pressão de óleo adequada e reduzir o consumo de óleo por vazamento entre folgas. Por isso existem linhas de óleo específicas para \"alta quilometragem\", com viscosidade ajustada e aditivos extras de vedação e antidesgaste. Ainda assim, a recomendação do fabricante do veículo deve ser sempre o ponto de partida.",
  },
];

// Cards de blog placeholder — sem sistema de blog funcional ainda, apenas a
// estrutura visual da seção.
export const BLOG_PLACEHOLDER_POSTS = [
  {
    title: "Como escolher o óleo certo para o seu veículo",
    excerpt: "Entenda os principais fatores — viscosidade, especificação e tipo de base — antes de decidir.",
  },
  {
    title: "Sintético vale o preço? Entenda os benefícios reais",
    excerpt: "Comparamos custo-benefício, desempenho e intervalos de troca entre as diferentes bases de óleo.",
  },
  {
    title: "Manutenção preventiva: além da troca de óleo",
    excerpt: "Outros cuidados que ajudam a prolongar a vida útil do motor do seu veículo.",
  },
];

export const GALLERY_PLACEHOLDER_ITEMS = [
  "Instalações",
  "Linha de produtos",
  "Estoque e logística",
  "Distribuição",
  "Atendimento",
  "Produtos em destaque",
];
