/**
 * Multi-language Support (English, Twi, Fante) Dictionary for ELEXTRA
 */

export type LangCode = "EN" | "TW" | "FN";

export const DICT: Record<LangCode, Record<string, string>> = {
  EN: {
    // Header & Navigation
    logo_sub: "Tarkwa · Bogoso · Ghana",
    search_placeholder: "Search catalogs, food, shops…",
    nav_home: "🏠 Home",
    nav_food: "🍽️ Fast Food",
    nav_malls: "🏪 Retail Stores",
    nav_market: "🛍️ Market",
    nav_dispatch: "🚚 Dispatch",
    nav_track: "📍 Track",
    nav_partners: "🤝 Partner Hub",
    nav_terms: "📋 T&C",
    sign_in: "Sign In",
    sign_out: "Sign Out Session",

    // Banner & Main Titles
    main_title: "ELEXTRA Fast Logistics",
    main_sub: "Instant motorcycle delivery and bulk heavy transport in Tarkwa & Bogoso",
    food_title: "🍽️ Food & Fast Food Joints",
    food_sub: "Order authentic dishes directly to your hub base via rapid motorcycle dispatch!",
    market_title: "🛍️ ELEXTRA Marketplace",
    market_sub: "Rates fluctuate to align with local markets · Updated today",

    // Sections
    category_all: "All Items",
    add_to_cart: "Add to Cart 🛒",
    wishlist_title: "❤️ Wishlist Vault",
    wishlist_sub: "Saved product entries for dispatch runs",

    // Future Enhancements Labels
    loyalty_rewards: "🏆 Loyalty Points & Rewards",
    referral_program: "👥 Share & Earn (Referrals)",
    subscription_plans: "⭐ Elextra Plus (Free Delivery)",
    table_reservations: "📅 Restaurant Table Booking",
    catering_orders: "🍲 Event Catering Booking",
    voice_ordering: "🎙️ Voice Ordering",
    qr_ordering: "📸 QR Code Dining Scanner",
    offline_riders: "📴 Rider Offline Queue"
  },
  TW: {
    // Header & Navigation
    logo_sub: "Tarkwa · Bogoso · Ghana",
    search_placeholder: "Hwehwɛ aduane anaa nneɛma…",
    nav_home: "🏠 Fie",
    nav_food: "🍽️ Aduane dɛdɛ",
    nav_malls: "🏪 Sitoo Panyin",
    nav_market: "🛍️ Dwaso",
    nav_dispatch: "🚚 Ehyɛn Dwuma",
    nav_track: "📍 Hwehwɛ",
    nav_partners: "🤝 Adwumayɛfoɔ",
    nav_terms: "📋 Nhyehyɛeɛ",
    sign_in: "Kɔ mu",
    sign_out: "Pue Firi Mu",

    // Banner & Main Titles
    main_title: "ELEXTRA Ntɛmsoɔ Som",
    main_sub: "Mmofra ehyɛn ntɛmsoɔ ne nnwinneɛ kɛseɛ akwantu wɔ Tarkwa ne Bogoso",
    food_title: "🍽️ Aduane ne Ndidi Bea",
    food_sub: "Tumi hyɛ aduane dɛdɛ nkran ntɛmsoɔ kɔ wo baabi wɔ Tarkwa anaa Bogoso!",
    market_title: "🛍️ ELEXTRA Dwaso",
    market_sub: "Nneɛma boɔ sesa ma ɛne gua so pɛpɛɛpɛ nnɛ",

    // Sections
    category_all: "Nneɛma Nyinaa",
    add_to_cart: "Fa to Basket mu 🛒",
    wishlist_title: "❤️ Akoradeɛ",
    wishlist_sub: "Nneɛma a woagye ato hɔ ama ehyɛn dwuma",

    // Future Enhancements Labels
    loyalty_rewards: "🏆 Loyalty Points & Akyɛdeɛ",
    referral_program: "👥 Sɛn Nnamfoɔ Na Nya Sika",
    subscription_plans: "⭐ Elextra Plus (Kwa Delivery)",
    table_reservations: "📅 Didibea Ponosane didi",
    catering_orders: "🍲 Apontoɔ Aduane Nhyehyɛeɛ",
    voice_ordering: "🎙️ Kasa Hyɛ Nneɛma Nkran",
    qr_ordering: "📸 QR Code Pono So Guasodeɛ",
    offline_riders: "📴 Rider a Onni Intanɛt"
  },
  FN: {
    // Header & Navigation
    logo_sub: "Tarkwa · Bogoso · Ghana",
    search_placeholder: "Hwehwɛ edziban anaa nkyɛmu…",
    nav_home: "🏠 Fie",
    nav_food: "🍽️ Edziban dɛdɛ",
    nav_malls: "🏪 Sitoo Panyin",
    nav_market: "🛍️ Dwaso",
    nav_dispatch: "🚚 Dwumadzi",
    nav_track: "📍 Hwehwɛ baabi a ɔwɔ",
    nav_partners: "🤝 Adwumayɛfo",
    nav_terms: "📋 Nhyehyɛɛ",
    sign_in: "Kɔ mu",
    sign_out: "Pue Fi Mu",

    // Banner & Main Titles
    main_title: "ELEXTRA Ntɛm Som",
    main_sub: "Instant motor delivery na heavy cargo transport wɔ Tarkwa na Bogoso",
    food_title: "🍽️ Edziban Ndidibea",
    food_sub: "Gye edziban pa dɛdɛ kɔ wo baabi ntɛm ara wɔ didibea guasodeɛ!",
    market_title: "🛍️ ELEXTRA Dwaso",
    market_sub: "Ngyinado bo sesa gyina kurom gua so",

    // Sections
    category_all: "Nneɛma Nyinaa",
    add_to_cart: "Kɔm fa to Basket mu 🛒",
    wishlist_title: "❤️ Akoradze",
    wishlist_sub: "Nkyɛmu nneɛma a woahyehyɛ ama dispatch runs",

    // Future Enhancements Labels
    loyalty_rewards: "🏆 Loyalty Points & Akyɛdze",
    referral_program: "👥 Bɔ Nkorɔfo Kɔkɔ Na Nya Sika",
    subscription_plans: "⭐ Elextra Plus (Free Delivery)",
    table_reservations: "📅 Pono Nhyehyɛɛ wɔ Ndidibea",
    catering_orders: "🍲 Aponto Edziban Nhyehyɛɛ",
    voice_ordering: "🎙️ Ndze Hyɛ Edziban Nkran",
    qr_ordering: "📸 QR Code Pono Do Scanner",
    offline_riders: "📴 Rider a Onnyi Ndzenden"
  }
};

export function getTxt(lang: LangCode, key: string, fallback: string = ""): string {
  return DICT[lang]?.[key] || fallback || key;
}
