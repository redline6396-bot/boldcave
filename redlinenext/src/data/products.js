const PLACEHOLDER_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

export const products = [
  {
    id: "vertex",
    slug: "vertex",
    name: "VERTEX",
    category: "Men",
    images: [PLACEHOLDER_IMAGE],
    shortDescription: "A bold fruity-woody fragrance with a smooth smoky-musky finish.",
    description:
      "VERTEX is a bold expression of confidence and ambition. A vibrant fruity opening develops into a sophisticated woody heart before settling into a smooth, smoky and musky base.",
    fragranceProfile: "Fruity, Woody, Smoky",
    personality: "Confident, successful, sophisticated",
    positioning: "Built for those who lead.",
    bestFor: ["Office", "Business meetings", "Dates", "Events", "Everyday premium wear"],
    bestSeason: ["Spring", "Autumn", "Mild winter"],
    fragranceNotes: {
      top: ["Bergamot", "Blackcurrant", "Apple", "Pineapple"],
      heart: ["Jasmine", "Birch", "Juniper", "Patchouli"],
      base: ["Oakmoss", "Musk", "Vanilla", "Ambergris-style accord"],
    },
    variants: [
      {
        size: "10 ML",
        mrp: 499,
        sellingPrice: 399,
        costPrice: 170,
        stock: 48,
      },
      {
        size: "50 ML",
        mrp: 1999,
        sellingPrice: 1699,
        costPrice: 720,
        stock: 26,
      },
    ],
    faq: [
      {
        question: "What type of fragrance is VERTEX?",
        answer: "VERTEX is a fruity, woody and smoky men's fragrance.",
      },
      {
        question: "When is VERTEX best worn?",
        answer: "It is suited for office wear, meetings, dates, events and everyday premium use.",
      },
      {
        question: "Which seasons suit VERTEX?",
        answer: "VERTEX works best in spring, autumn and mild winter weather.",
      },
      {
        question: "Does VERTEX feel more fresh or deep?",
        answer: "It opens fruity and vibrant, then settles into a smoother woody-smoky base.",
      },
    ],
    legalInformation: {
      ingredients: "Final ingredient declaration will be added before launch.",
      caution: "Final safety and regulatory information will be added before launch.",
    },
    featured: true,
    bestseller: true,
  },
  {
    id: "noir",
    slug: "noir",
    name: "NOIR",
    category: "Men",
    images: [PLACEHOLDER_IMAGE],
    shortDescription: "An intense spicy-aromatic fragrance with a rich woody-amber character.",
    description:
      "NOIR is an intense and commanding fragrance built around vibrant citrus, warm spices and aromatic lavender, finishing with a rich woody-amber character.",
    fragranceProfile: "Spicy, Aromatic, Woody, Amber",
    personality: "Powerful, mysterious, intense",
    positioning: "Power after dark.",
    bestFor: ["Night parties", "Dates", "Weddings", "Dinner", "Special occasions"],
    bestSeason: ["Autumn", "Winter", "Cool evenings"],
    fragranceNotes: {
      top: ["Grapefruit", "Cinnamon", "Nutmeg", "Cardamom"],
      heart: ["Lavender", "Herbs", "Coumarin"],
      base: ["Woods", "Amber", "Licorice", "Patchouli", "Vetiver"],
    },
    variants: [
      {
        size: "10 ML",
        mrp: 549,
        sellingPrice: 449,
        costPrice: 190,
        stock: 36,
      },
      {
        size: "50 ML",
        mrp: 2299,
        sellingPrice: 1899,
        costPrice: 810,
        stock: 22,
      },
    ],
    faq: [
      {
        question: "What type of fragrance is NOIR?",
        answer: "NOIR is a spicy, aromatic, woody and amber men's fragrance.",
      },
      {
        question: "When is NOIR best worn?",
        answer: "It is best suited for night parties, dates, weddings, dinners and special occasions.",
      },
      {
        question: "Which seasons suit NOIR?",
        answer: "NOIR is made for autumn, winter and cool evening wear.",
      },
      {
        question: "Is NOIR a light daytime fragrance?",
        answer: "NOIR is positioned as a deeper evening fragrance with warm spice and rich woods.",
      },
    ],
    legalInformation: {
      ingredients: "Final ingredient declaration will be added before launch.",
      caution: "Final safety and regulatory information will be added before launch.",
    },
    featured: true,
    bestseller: true,
  },
  {
    id: "blue",
    slug: "blue",
    name: "BLUE",
    category: "Men",
    images: [PLACEHOLDER_IMAGE],
    shortDescription: "A refined fresh aromatic-woody fragrance with a smooth musky finish.",
    description:
      "BLUE is a refined aromatic-woody fragrance combining sparkling citrus freshness with elegant woods and a smooth musky finish.",
    fragranceProfile: "Aromatic, Woody, Fresh, Musky",
    personality: "Clean, elegant, confident",
    positioning: "Elegance without effort.",
    bestFor: ["Office", "College", "Business", "Dates", "Daily wear", "Dinner"],
    bestSeason: ["All year"],
    fragranceNotes: {
      top: ["Grapefruit", "Lemon", "Bergamot", "Citrus"],
      heart: ["Lavender", "Ginger", "Herbs", "Cedar"],
      base: ["Sandalwood", "Cedarwood", "Tonka", "Vanilla", "Musk"],
    },
    variants: [
      {
        size: "10 ML",
        mrp: 459,
        sellingPrice: 349,
        costPrice: 155,
        stock: 62,
      },
      {
        size: "50 ML",
        mrp: 1899,
        sellingPrice: 1499,
        costPrice: 665,
        stock: 34,
      },
    ],
    faq: [
      {
        question: "What type of fragrance is BLUE?",
        answer: "BLUE is a fresh aromatic, woody and musky men's fragrance.",
      },
      {
        question: "When is BLUE best worn?",
        answer: "It fits office, college, business, dates, daily wear and dinner settings.",
      },
      {
        question: "Which seasons suit BLUE?",
        answer: "BLUE is designed as an all-year fragrance.",
      },
      {
        question: "Does BLUE lean fresh or sweet?",
        answer: "BLUE leans fresh and elegant, with citrus notes over woods and musk.",
      },
    ],
    legalInformation: {
      ingredients: "Final ingredient declaration will be added before launch.",
      caution: "Final safety and regulatory information will be added before launch.",
    },
    featured: true,
    bestseller: false,
  },
  {
    id: "elite",
    slug: "elite",
    name: "ELITE",
    category: "Men",
    images: [PLACEHOLDER_IMAGE],
    shortDescription: "A warm amber-woody fragrance with sweet aromatic depth.",
    description:
      "ELITE is a warm and seductive fragrance with a refreshing aromatic opening that develops into creamy lavender, sweet benzoin and rich tonka.",
    fragranceProfile: "Amber, Woody, Sweet, Aromatic",
    personality: "Seductive, warm, bold",
    positioning: "Made to be remembered.",
    bestFor: ["Dates", "Parties", "Nightlife", "Weddings", "Winter evenings"],
    bestSeason: ["Autumn", "Winter"],
    fragranceNotes: {
      top: ["Mint", "Fresh", "Aromatic"],
      heart: ["Lavender", "Benzoin", "Vanilla"],
      base: ["Tonka", "Honey", "Tobacco", "Woods"],
    },
    variants: [
      {
        size: "10 ML",
        mrp: 599,
        sellingPrice: 499,
        costPrice: 215,
        stock: 30,
      },
      {
        size: "50 ML",
        mrp: 2499,
        sellingPrice: 2199,
        costPrice: 940,
        stock: 18,
      },
    ],
    faq: [
      {
        question: "What type of fragrance is ELITE?",
        answer: "ELITE is an amber, woody, sweet and aromatic men's fragrance.",
      },
      {
        question: "When is ELITE best worn?",
        answer: "It is best for dates, parties, nightlife, weddings and winter evenings.",
      },
      {
        question: "Which seasons suit ELITE?",
        answer: "ELITE is most suited for autumn and winter.",
      },
      {
        question: "Does ELITE feel warm?",
        answer: "Yes, ELITE is positioned as a warm fragrance with sweet tonka, honey and woods.",
      },
    ],
    legalInformation: {
      ingredients: "Final ingredient declaration will be added before launch.",
      caution: "Final safety and regulatory information will be added before launch.",
    },
    featured: false,
    bestseller: false,
  },
  {
    id: "aqua",
    slug: "aqua",
    name: "AQUA",
    category: "Men",
    images: [PLACEHOLDER_IMAGE],
    shortDescription: "A fresh aquatic-citrus fragrance with aromatic herbs and woody musk.",
    description:
      "AQUA captures the freshness of the open sea with sparkling citrus and marine notes, followed by aromatic herbs and a smooth woody-musky finish.",
    fragranceProfile: "Aquatic, Citrus, Aromatic, Woody",
    personality: "Fresh, energetic, clean",
    positioning: "Dive into freshness.",
    bestFor: ["Summer", "Gym", "College", "Office", "Travel", "Casual daytime"],
    bestSeason: ["Summer", "Spring"],
    fragranceNotes: {
      top: ["Mandarin", "Bergamot", "Marine"],
      heart: ["Rosemary", "Lavender", "Cypress"],
      base: ["Patchouli", "Musk", "Woods"],
    },
    variants: [
      {
        size: "10 ML",
        mrp: 399,
        sellingPrice: 299,
        costPrice: 135,
        stock: 74,
      },
      {
        size: "50 ML",
        mrp: 1599,
        sellingPrice: 1199,
        costPrice: 540,
        stock: 41,
      },
    ],
    faq: [
      {
        question: "What type of fragrance is AQUA?",
        answer: "AQUA is an aquatic, citrus, aromatic and woody men's fragrance.",
      },
      {
        question: "When is AQUA best worn?",
        answer: "It is suited for summer, gym, college, office, travel and casual daytime use.",
      },
      {
        question: "Which seasons suit AQUA?",
        answer: "AQUA works best in summer and spring.",
      },
      {
        question: "Does AQUA feel clean and fresh?",
        answer: "Yes, AQUA is built around marine freshness, citrus and clean aromatic notes.",
      },
    ],
    legalInformation: {
      ingredients: "Final ingredient declaration will be added before launch.",
      caution: "Final safety and regulatory information will be added before launch.",
    },
    featured: false,
    bestseller: false,
  },
];
