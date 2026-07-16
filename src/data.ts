/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FoodPlace, Mall, Product, Driver } from "./types";

// ─── DAILY PRICE SIMULATION (updates every 24h based on date seed) ────────────
export function getDailyMultiplier(): number {
  return 1.0; // Locked to original site/market rates
}

const DM = getDailyMultiplier();
export const dp = (base: number): number => base;

export const today = new Date().toLocaleDateString("en-GH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric"
});

// ─── TRANSPORT NEED LOGIC ─────────────────────────────────────────────────────
export function needsTransport(items: { name: string }[]): boolean {
  const heavy = [
    "Cement", "Iron Rods", "Sand", "Gravel", "Blocks", "Roofing Sheet", "Plywood", "Plank",
    "Refrigerator", "Washing Machine", "TV 55\"", "TV 65\"", "Chest Freezer", "Standing Fan (Box)",
    "Water Heater", "Generator", "Water Tank", "Toilet Bowl", "Bath Tub", "Door", "Window Frame",
    "Wheelbarrow"
  ];
  return (items || []).some(i => i && i.name && heavy.some(h => i.name.includes(h) || i.name.startsWith(h.split(" ")[0])));
}

// ─── TAG COLOURS ─────────────────────────────────────────────────────────────
export const TC: Record<string, string> = {
  "Flash Deal": "#ff4757",
  "Hot": "#ff6348",
  "New": "#2ed573",
  "Popular": "#ffa502",
  "Bulk": "#1e90ff",
  "Trending": "#a29bfe",
  "Best Seller": "#fd79a8",
  "Fresh": "#00b894",
  "Wholesale": "#e17055",
  "Retail": "#6c5ce7",
  "Premium": "#3b82f6"
};

// ─── DATA ────────────────────────────────────────────────────────────────────
export const FOOD_PLACES: FoodPlace[] = [
  {
    id: "f_abena",
    name: "Mama Abena's Local Food Joint",
    location: "Atuabo, Tarkwa Bypass",
    type: "Fast Food Joint",
    hours: "7am–8pm",
    rating: 4.9,
    imgUrl: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80",
    menu: [
      { item: "Red Red (Fried Plantain & Beans Stew - Gobe)", price: dp(14) },
      { item: "Eto Special (Mashed Plantain, Egg, Avocado & Groundnuts)", price: dp(18) },
      { item: "Omo Tuo (Rice Balls) & Groundnut Soup", price: dp(20) },
      { item: "Kenkey with Fried Fish, Pepper Sauce & Shito", price: dp(16) },
      { item: "Boiled Yam (Ampesi) & Kontomire Abom (Snails + Egg)", price: dp(22) },
      { item: "Konkonte with Groundnut Soup & Salmon", price: dp(18) },
      { item: "Fufu with Fresh Snail & Bushmeat Light Soup", price: dp(28) },
      { item: "Tuo Zaafi (TZ) with Ayoyo Soup & Goat Meat", price: dp(22) }
    ]
  },
  {
    id: "f1",
    name: "Auntie Efua's Fast Food",
    location: "Tarkwa Market Area",
    type: "Local Fast Food",
    hours: "6am–9pm",
    rating: 4.8,
    imgUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=600&q=80",
    menu: [
      { item: "Fufu & Goat Light Soup", price: dp(22) },
      { item: "Banku & Tilapia", price: dp(25) },
      { item: "Jollof Rice & Chicken", price: dp(20) },
      { item: "Waakye with Stew", price: dp(15) },
      { item: "Fried Yam & Sauce", price: dp(12) },
      { item: "Kenkey & Fish", price: dp(14) },
      { item: "Ampesi & Kontomire", price: dp(18) },
      { item: "Rice & Stew", price: dp(15) },
      { item: "Fufu & Palm Nut Soup", price: dp(22) }
    ]
  },
  {
    id: "f2",
    name: "Golden Fork Restaurant",
    location: "Tarkwa Main Street",
    type: "Restaurant",
    hours: "7am–10pm",
    rating: 4.6,
    imgUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
    menu: [
      { item: "Fried Rice & Chicken", price: dp(35) },
      { item: "Spaghetti Bolognese", price: dp(40) },
      { item: "Grilled Tilapia & Banku", price: dp(45) },
      { item: "Beef Burger & Fries", price: dp(38) },
      { item: "Club Sandwich", price: dp(30) },
      { item: "Jollof Rice (Large)", price: dp(28) },
      { item: "Pepper Soup", price: dp(25) },
      { item: "Pork Ribs", price: dp(55) },
      { item: "Freshly Squeezed Juice", price: dp(12) }
    ]
  },
  {
    id: "f3",
    name: "Bogoso Mama's Kitchen",
    location: "Bogoso Junction",
    type: "Local Fast Food",
    hours: "6am–8pm",
    rating: 4.7,
    imgUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
    menu: [
      { item: "Banku & Okro Stew", price: dp(18) },
      { item: "Fufu & Chicken Soup", price: dp(25) },
      { item: "Omo Tuo & Groundnut Soup", price: dp(20) },
      { item: "Boiled Yam & Kontomire", price: dp(15) },
      { item: "Rice & Beans (Gobe)", price: dp(12) },
      { item: "Kelewele (Spicy Plantain)", price: dp(8) },
      { item: "Tuo Zaafi & Ayoyo", price: dp(18) },
      { item: "Abenkwan (Palm Soup) & Fufu", price: dp(22) }
    ]
  },
  {
    id: "f4",
    name: "Crown Plaza Hotel Restaurant",
    location: "Tarkwa, Near Mining Area",
    type: "Hotel Restaurant",
    hours: "7am–11pm",
    rating: 4.5,
    imgUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
    menu: [
      { item: "Continental Breakfast", price: dp(55) },
      { item: "Grilled Chicken & Chips", price: dp(65) },
      { item: "Seafood Platter", price: dp(120) },
      { item: "T-Bone Steak", price: dp(150) },
      { item: "Pizza Margherita", price: dp(70) },
      { item: "Caesar Salad", price: dp(45) },
      { item: "Freshly Brewed Coffee", price: dp(18) },
      { item: "Smoothie Bowl", price: dp(35) }
    ]
  },
  {
    id: "f5",
    name: "Tarkwa Fast Foods",
    location: "Tarkwa Commercial Area",
    type: "Fast Food",
    hours: "8am–10pm",
    rating: 4.4,
    imgUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
    menu: [
      { item: "Meat Pie", price: dp(8) },
      { item: "Sausage Roll", price: dp(6) },
      { item: "Spring Roll (x3)", price: dp(15) },
      { item: "Fried Chicken Piece", price: dp(18) },
      { item: "Chips & Chicken Combo", price: dp(35) },
      { item: "Egg Sandwich", price: dp(12) },
      { item: "Doughnut (x2)", price: dp(10) },
      { item: "Malt Drink", price: dp(8) },
      { item: "Bottled Water", price: dp(4) }
    ]
  },
  {
    id: "f6",
    name: "Miners' Spot Canteen",
    location: "Bogoso, Near AngloGold Area",
    type: "Workers Canteen",
    hours: "5am–8pm",
    rating: 4.6,
    imgUrl: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=600&q=80",
    menu: [
      { item: "Heavy Breakfast (Egg+Bread+Tea)", price: dp(20) },
      { item: "Fufu & Soup (Large)", price: dp(28) },
      { item: "Banku & Pepper Sauce", price: dp(22) },
      { item: "Rice & Beef Stew", price: dp(25) },
      { item: "Tom Brown (Porridge)", price: dp(10) },
      { item: "Kooko & Koose", price: dp(8) }
    ]
  },
  {
    id: "f_kfc",
    name: "KFC (Kentucky Fried Chicken) Ghana",
    location: "Tarkwa Bypass, Tarkwa",
    type: "American Fast Food",
    hours: "10am–11pm",
    rating: 4.8,
    imgUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80",
    city: "tarkwa",
    menu: [
      { item: "KFC Streetwise 1 (1 Piece Chicken & Chips)", price: dp(45) },
      { item: "KFC Streetwise 2 (2 Pieces Chicken & Chips)", price: dp(75) },
      { item: "KFC Streetwise 3 (3 Pieces Chicken & Chips)", price: dp(110) },
      { item: "KFC Zinger Burger", price: dp(60) },
      { item: "KFC Zinger Burger Meal (Burger, Chips & drink)", price: dp(95) },
      { item: "KFC Colonel Burger", price: dp(55) },
      { item: "KFC Colonel’s Bucket (9 Pieces of Fried Chicken)", price: dp(230) },
      { item: "KFC Colonel’s Bucket (15 Pieces of Fried Chicken)", price: dp(365) },
      { item: "Regular French Fries", price: dp(30) },
      { item: "Large French Fries", price: dp(45) }
    ]
  }
];

export const MALLS_SHOPS: Mall[] = [
  {
    id: "m1",
    name: "Tarkwa Super Mall",
    location: "Tarkwa Town Centre",
    type: "Shopping Mall",
    hours: "8am–9pm",
    rating: 4.7,
    sells: [
      "Clothing & Accessories", "Electronics & Gadgets", "Groceries & Provisions", "Cosmetics & Beauty",
      "Footwear", "Stationery", "Children's Toys", "Household Items", "Pharmaceutical Products"
    ]
  },
  {
    id: "m2",
    name: "Bogoso Market Complex",
    location: "Bogoso Main Market",
    type: "Market Complex",
    hours: "6am–7pm",
    rating: 4.5,
    sells: [
      "Fresh Vegetables & Fruits", "Frozen Foods & Fish", "Fabric & Clothing", "Building Materials",
      "Second-hand Clothes (Okirika)", "Spare Parts", "Foodstuffs (Wholesale & Retail)", "Cooking Utensils"
    ]
  },
  {
    id: "m3",
    name: "GoldCity Shopping Centre",
    location: "Tarkwa, Goldfields Road",
    type: "Shopping Centre",
    hours: "8am–8pm",
    rating: 4.6,
    sells: [
      "Premium Groceries", "Electronics", "Clothing & Fashion", "Pharmacy", "Bakery Products",
      "Soft Drinks & Beverages", "Baby Products", "Stationery & Office Supplies"
    ]
  },
  {
    id: "m4",
    name: "Akosua Provision Store",
    location: "Tarkwa Market",
    type: "Provision Shop",
    hours: "6am–9pm",
    rating: 4.8,
    sells: [
      "Canned & Tinned Foods", "Beverages (Milk, Milo, Coffee)", "Toiletries (Soap, Lotion, Toothpaste)",
      "Cooking Oil & Margarine", "Seasoning & Spices", "Sachet Water & Bottled Water",
      "Bread & Biscuits", "Sugar & Salt", "Matches & Candles"
    ]
  },
  {
    id: "m5",
    name: "Asante Wholesale Depot",
    location: "Tarkwa Industrial Area",
    type: "Wholesale Store",
    hours: "7am–6pm",
    rating: 4.7,
    sells: [
      "Rice (50kg Bags)", "Sugar (50kg Bags)", "Cooking Oil (Drums & Cartons)", "Flour (Bags)",
      "Canned Tomatoes (Cartons)", "Sardines & Mackerel (Cartons)", "Beverages (Cartons)",
      "Washing Powder (Cartons)", "Detergents (Bulk)", "Toilet Rolls (Bulk Packs)"
    ]
  },
  {
    id: "m6",
    name: "Bogoso Traders Association Market",
    location: "Bogoso, New Site",
    type: "Market (Retail & Wholesale)",
    hours: "7am–6pm",
    rating: 4.5,
    sells: [
      "Palm Oil (Wholesale & Retail)", "Gari & Cassava Products", "Dried Fish & Smoked Fish",
      "Yam & Plantain (Wholesale)", "Onions & Pepper (Wholesale)", "Tomatoes (Crates)",
      "Charcoal (Bags)", "Firewood", "Agricultural Produce"
    ]
  }
];

// Handyman services bookings are stored dynamically in IndexedDB (elx_handyman_bookings)

export const GROCERY_ITEMS: Product[] = [
  // Staples
  { id: "g1", name: "Rice – Ofada (50kg)", price: dp(380), cat: "Staples", img: "🌾", tag: "Wholesale", unit: "bag", heavy: true },
  { id: "g2", name: "Rice – Locally Milled (25kg)", price: dp(185), cat: "Staples", img: "🌾", tag: "Retail", unit: "bag", heavy: true },
  { id: "g3", name: "Gari (25kg)", price: dp(120), cat: "Staples", img: "🥣", tag: "Wholesale", unit: "bag", heavy: true },
  { id: "g4", name: "Gari (1kg)", price: dp(6), cat: "Staples", img: "🥣", tag: "Retail", unit: "pack" },
  { id: "g5", name: "Maize Flour (25kg)", price: dp(130), cat: "Staples", img: "🌽", tag: "Wholesale", unit: "bag", heavy: true },
  { id: "g6", name: "Wheat Flour (50kg)", price: dp(290), cat: "Staples", img: "🌾", tag: "Wholesale", unit: "bag", heavy: true },
  { id: "g7", name: "Plantain (Bunch)", price: dp(35), cat: "Staples", img: "🍌", tag: "Fresh", unit: "bunch" },
  { id: "g8", name: "Yam (50kg Bag)", price: dp(180), cat: "Staples", img: "🥔", tag: "Wholesale", unit: "bag", heavy: true },
  { id: "g9", name: "Cassava (50kg)", price: dp(90), cat: "Staples", img: "🥬", tag: "Wholesale", unit: "bag", heavy: true },
  { id: "g10", name: "Cocoyam (25kg)", price: dp(80), cat: "Staples", img: "🪴", tag: "Fresh", unit: "bag" },
  // Proteins
  { id: "g11", name: "Chicken – Live (Per Bird)", price: dp(75), cat: "Proteins", img: "🐔", tag: "Fresh", unit: "pc" },
  { id: "g12", name: "Broiler Chicken (Frozen, Whole)", price: dp(95), cat: "Proteins", img: "🍗", tag: "Hot", unit: "pc" },
  { id: "g13", name: "Tilapia Fish (1kg)", price: dp(45), cat: "Proteins", img: "🐟", tag: "Fresh", unit: "kg" },
  { id: "g14", name: "Smoked Herrings (Momoni, 500g)", price: dp(22), cat: "Proteins", img: "🐠", tag: "Popular", unit: "pack" },
  { id: "g15", name: "Mackerel (Frozen, 1kg)", price: dp(38), cat: "Proteins", img: "🐟", tag: "Retail", unit: "kg" },
  { id: "g16", name: "Beef (Bone-In, 1kg)", price: dp(65), cat: "Proteins", img: "🥩", tag: "Fresh", unit: "kg" },
  { id: "g17", name: "Eggs (Crate – 30pcs)", price: dp(48), cat: "Proteins", img: "🥚", tag: "Popular", unit: "crate" },
  { id: "g18", name: "Corned Beef Tin (300g)", price: dp(28), cat: "Proteins", img: "🥫", tag: "Retail", unit: "tin" },
  // Vegetables
  { id: "g19", name: "Tomatoes – Fresh (1kg)", price: dp(15), cat: "Vegetables", img: "🍅", tag: "Flash Deal", unit: "kg" },
  { id: "g20", name: "Tomatoes – Canned (400g)", price: dp(12), cat: "Vegetables", img: "🫙", tag: "Retail", unit: "tin" },
  { id: "g21", name: "Onions (1kg)", price: dp(18), cat: "Vegetables", img: "🧅", tag: "Fresh", unit: "kg" },
  { id: "g22", name: "Garden Eggs (500g)", price: dp(10), cat: "Vegetables", img: "🍆", tag: "Fresh", unit: "pack" },
  { id: "g23", name: "Pepper – Mixed (500g)", price: dp(20), cat: "Vegetables", img: "🌶️", tag: "Fresh", unit: "pack" },
  { id: "g24", name: "Okro (500g)", price: dp(12), cat: "Vegetables", img: "🥦", tag: "Fresh", unit: "pack" },
  { id: "g25", name: "Spinach / Kontomire (Bunch)", price: dp(8), cat: "Vegetables", img: "🥬", tag: "Fresh", unit: "bunch" },
  { id: "g26", name: "Carrots (500g)", price: dp(10), cat: "Vegetables", img: "🥕", tag: "Fresh", unit: "pack" },
  { id: "g27", name: "Cabbage (Head)", price: dp(12), cat: "Vegetables", img: "🥬", tag: "Fresh", unit: "head" },
  // Oils & Fats
  { id: "g28", name: "Palm Oil (4L Bottle)", price: dp(68), cat: "Oils", img: "🛢️", tag: "Popular", unit: "bottle" },
  { id: "g29", name: "Vegetable Oil – Frytol (5L)", price: dp(95), cat: "Oils", img: "🫙", tag: "Hot", unit: "bottle" },
  { id: "g30", name: "Groundnut Oil (1L)", price: dp(38), cat: "Oils", img: "🫙", tag: "Retail", unit: "bottle" },
  { id: "g31", name: "Margarine – Blue Band (500g)", price: dp(25), cat: "Oils", img: "🧈", tag: "Retail", unit: "pack" },
  // Seasonings
  { id: "g32", name: "Maggi Cube (Box 100pcs)", price: dp(18), cat: "Seasonings", img: "🧂", tag: "Bulk", unit: "box" },
  { id: "g33", name: "Shito (Black Pepper Sauce, 500g)", price: dp(32), cat: "Seasonings", img: "🌶️", tag: "Popular", unit: "jar" },
  { id: "g34", name: "Dawadawa (Locust Beans, 200g)", price: dp(15), cat: "Seasonings", img: "🫘", tag: "Fresh", unit: "pack" },
  { id: "g35", name: "Curry Powder (200g)", price: dp(12), cat: "Seasonings", img: "🟡", tag: "Retail", unit: "pack" },
  // Beverages
  { id: "g36", name: "Milo (400g Tin)", price: dp(55), cat: "Beverages", img: "🍫", tag: "Popular", unit: "tin" },
  { id: "g37", name: "Nescafe Coffee (200g)", price: dp(48), cat: "Beverages", img: "☕", tag: "Retail", unit: "jar" },
  { id: "g38", name: "Hollandia Yoghurt (1L)", price: dp(28), cat: "Beverages", img: "🥛", tag: "Fresh", unit: "bottle" },
  { id: "g39", name: "Coke (500ml Bottle)", price: dp(8), cat: "Beverages", img: "🥤", tag: "Hot", unit: "bottle" },
  { id: "g40", name: "Malta Guinness (330ml)", price: dp(10), cat: "Beverages", img: "🍺", tag: "Popular", unit: "can" },
  { id: "g41", name: "Voltic Water (1.5L)", price: dp(6), cat: "Beverages", img: "💧", tag: "Retail", unit: "bottle" },
  { id: "g42", name: "Sachet Water (30-pack)", price: dp(8), cat: "Beverages", img: "💧", tag: "Bulk", unit: "pack" },
  // Provisions
  { id: "g43", name: "Sugar (50kg Bag)", price: dp(340), cat: "Provisions", img: "🍬", tag: "Wholesale", unit: "bag", heavy: true },
  { id: "g44", name: "Sugar (1kg)", price: dp(9), cat: "Provisions", img: "🍬", tag: "Retail", unit: "pack" },
  { id: "g45", name: "Sardines – Gino (125g, x3)", price: dp(25), cat: "Provisions", img: "🐟", tag: "Retail", unit: "pack" },
  { id: "g46", name: "Geisha Mackerel (155g)", price: dp(14), cat: "Provisions", img: "🐟", tag: "Retail", unit: "tin" },
  { id: "g47", name: "Tom Brown (500g)", price: dp(18), cat: "Provisions", img: "🥣", tag: "Fresh", unit: "pack" },
  { id: "g48", name: "Ideal Milk (410g Tin)", price: dp(22), cat: "Provisions", img: "🥛", tag: "Popular", unit: "tin" }
];

export const ELECTRONICS: Product[] = [
  // --- FANS ---
  { id: "e5", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Standing Fan – Binatone", price: dp(185), cat: "Fans", img: "💨", tag: "Popular", unit: "unit" },
  { id: "e6", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Ceiling Fan – Ox", price: dp(220), cat: "Fans", img: "💨", tag: "Retail", unit: "unit" },
  { id: "e7", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Table Fan – NASCO", price: dp(120), cat: "Fans", img: "💨", tag: "Hot", unit: "unit" },
  { id: "e31", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Wall Fan – Binatone (16-inch)", price: dp(165), cat: "Fans", img: "💨", tag: "Retail", unit: "unit" },
  { id: "e32", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Rechargeable Fan with LED Light", price: dp(380), cat: "Fans", img: "💨", tag: "New", unit: "unit" },

  // --- REFRIGERATORS ---
  { id: "e8", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "LG Side-by-Side Refrigerator", price: dp(4800), cat: "Refrigerators", img: "🧊", tag: "Premium", unit: "unit" },
  { id: "e9", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "Haier Single-Door Fridge", price: dp(1650), cat: "Refrigerators", img: "🧊", tag: "Popular", unit: "unit" },
  { id: "e10", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "Scanfrost Chest Freezer (350L)", price: dp(2800), cat: "Refrigerators", img: "🧊", tag: "Hot", unit: "unit" },

  // --- WASHING MACHINES ---
  { id: "e11", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "Maxi Washing Machine (7kg)", price: dp(1950), cat: "Washing Machines", img: "🫧", tag: "New", unit: "unit" },
  { id: "e12", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "LG Top-Load Washer", price: dp(2400), cat: "Washing Machines", img: "🫧", tag: "Best Seller", unit: "unit" },

  // --- COOKERS ---
  { id: "e13", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "Gas Cooker (4-Burner)", price: dp(980), cat: "Cookers", img: "🍳", tag: "Hot", unit: "unit" },
  { id: "e14", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "Electric Cooker (2-Plate)", price: dp(350), cat: "Cookers", img: "🍳", tag: "Popular", unit: "unit" },
  { id: "e15", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "Microwave Oven – Samsung", price: dp(680), cat: "Cookers", img: "📦", tag: "New", unit: "unit" },

  // --- GENERATORS & POWER ---
  { id: "e16", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Clipper Generator (3.5KVA)", price: dp(2200), cat: "Generators", img: "⚡", tag: "Hot", unit: "unit" },
  { id: "e17", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Firman Generator (7KVA)", price: dp(4100), cat: "Generators", img: "⚡", tag: "Popular", unit: "unit" },
  { id: "e18", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Sukam Inverter (1500W)", price: dp(1800), cat: "Power", img: "🔋", tag: "New", unit: "unit" },
  { id: "e19", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Solar Panel (200W)", price: dp(650), cat: "Power", img: "☀️", tag: "Trending", unit: "unit" },
  { id: "e20", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Deep Cycle Battery (200Ah)", price: dp(1200), cat: "Power", img: "🔋", tag: "Popular", unit: "unit" },

  // --- VOLTAGE PROTECTORS & SURGE REGULATORS ---
  { id: "e33", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Sollatek TVGuard Surge Protector", price: dp(85), cat: "Power", img: "⚡", tag: "Best Seller", unit: "unit" },
  { id: "e34", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Sollatek FridgeGuard Surge Protector", price: dp(90), cat: "Power", img: "⚡", tag: "Popular", unit: "unit" },
  { id: "e35", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Gaza Voltage Regulator AVS30", price: dp(240), cat: "Power", img: "⚡", tag: "Hot", unit: "unit" },

  // --- AIR CONDITIONING ---
  { id: "e23", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "AC – NASCO 1.5HP", price: dp(3200), cat: "Air Conditioning", img: "❄️", tag: "Hot", unit: "unit" },
  { id: "e24", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "AC – Midea 2HP", price: dp(4100), cat: "Air Conditioning", img: "❄️", tag: "New", unit: "unit" },

  // --- KEYPAD PHONES ONLY (NO SMARTPHONES!) ---
  { id: "e36", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Nokia 105 Keypad Phone (Dual SIM)", price: dp(180), cat: "Phones", img: "📱", tag: "Best Seller", unit: "unit" },
  { id: "e37", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Itel 2160 Keypad Phone with FM", price: dp(115), cat: "Phones", img: "📱", tag: "Popular", unit: "unit" },
  { id: "e38", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Tecno T301 Keypad Phone", price: dp(130), cat: "Phones", img: "📱", tag: "Hot", unit: "unit" },
  { id: "e39", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Nokia 110 Keypad Phone with Camera", price: dp(210), cat: "Phones", img: "📱", tag: "New", unit: "unit" },

  // --- AUDIO ---
  { id: "e28", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Bluetooth Speaker – JBL Go 3", price: dp(280), cat: "Audio", img: "🔊", tag: "Trending", unit: "unit" },
  { id: "e29", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "True Wireless Earbuds", price: dp(180), cat: "Audio", img: "🎧", tag: "New", unit: "unit" },
  { id: "e40", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Rechargeable FM Radio with USB/SD Slot", price: dp(95), cat: "Audio", img: "📻", tag: "Popular", unit: "unit" },

  // --- HOME APPLIANCES & KITCHEN APPLIANCES ---
  { id: "e21", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Electric Iron – Philips", price: dp(185), cat: "Home Appliances", img: "🧹", tag: "Retail", unit: "unit" },
  { id: "e22", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Water Pump – Grundfos", price: dp(950), cat: "Home Appliances", img: "💧", tag: "Popular", unit: "unit" },
  { id: "e30", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Electric Kettle (1.8L)", price: dp(145), cat: "Home Appliances", img: "☕", tag: "Retail", unit: "unit" },
  { id: "e41", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "Rice Cooker – Binatone (1.8L)", price: dp(340), cat: "Home Appliances", img: "🍚", tag: "Best Seller", unit: "unit" },
  { id: "e42", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "Blender & Grinder – Kenwood", price: dp(390), cat: "Home Appliances", img: "🥤", tag: "Popular", unit: "unit" },
  { id: "e43", shop: "Goldfields Electronics", location: "Tarkwa, Near Total Station", name: "Hand Mixer – Nasco", price: dp(110), cat: "Home Appliances", img: "🍳", tag: "Retail", unit: "unit" },
  { id: "e44", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Electric Hair Clipper", price: dp(120), cat: "Home Appliances", img: "✂️", tag: "New", unit: "unit" },

  // --- BASIC POWER ACCESSORIES / LIGHTING (Basic electronic stuffs) ---
  { id: "e45", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Oraimo Dual USB Fast Charger", price: dp(55), cat: "Home Appliances", img: "🔌", tag: "New", unit: "unit" },
  { id: "e46", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Oraimo Type-C Fast Charging Cable", price: dp(25), cat: "Home Appliances", img: "🔌", tag: "Popular", unit: "unit" },
  { id: "e47", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "4-Way Extension Board (3m)", price: dp(65), cat: "Home Appliances", img: "🔌", tag: "Best Seller", unit: "unit" },
  { id: "e48", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Multi-Socket Adapter with USB ports", price: dp(45), cat: "Home Appliances", img: "🔌", tag: "Popular", unit: "unit" },
  { id: "e49", shop: "TechZone Tarkwa", location: "Tarkwa Commercial Street", name: "Philips LED Bulb 12W (Pack of 3)", price: dp(75), cat: "Home Appliances", img: "💡", tag: "Hot", unit: "pack" },
  { id: "e50", shop: "Bogoso Power Electronics", location: "Bogoso Market Area", name: "Rechargeable LED Emergency Torch", price: dp(40), cat: "Home Appliances", img: "🔦", tag: "Best Seller", unit: "unit" }
];

export const CONSTRUCTION: Product[] = [
  // Structural
  { id: "c1", name: "Cement – Ghacem (50kg)", price: dp(95), cat: "Structural", img: "🧱", tag: "Bulk", unit: "bag", heavy: true, transport: true },
  { id: "c2", name: "Cement – Diamond (50kg)", price: dp(90), cat: "Structural", img: "🧱", tag: "Bulk", unit: "bag", heavy: true, transport: true },
  { id: "c3", name: "Iron Rod (Y12, 6m length)", price: dp(145), cat: "Structural", img: "📏", tag: "Hot", unit: "rod", heavy: true, transport: true },
  { id: "c4", name: "Iron Rod (Y16, 6m length)", price: dp(200), cat: "Structural", img: "📏", tag: "Hot", unit: "rod", heavy: true, transport: true },
  { id: "c5", name: "Iron Rod (Y8, 6m length)", price: dp(95), cat: "Structural", img: "📏", tag: "Popular", unit: "rod", heavy: true, transport: true },
  { id: "c6", name: "Binding Wire (Coil, 25kg)", price: dp(120), cat: "Structural", img: "🔩", tag: "Bulk", unit: "coil", heavy: true },
  { id: "c7", name: "Sandcrete Blocks (9-inch, x1)", price: dp(8), cat: "Structural", img: "⬛", tag: "Retail", unit: "block", heavy: true, transport: true },
  { id: "c8", name: "Sandcrete Blocks (6-inch, x1)", price: dp(6), cat: "Structural", img: "⬛", tag: "Retail", unit: "block", heavy: true, transport: true },
  { id: "c9", name: "Plank (2x4 inch, 12ft)", price: dp(35), cat: "Structural", img: "🪵", tag: "Popular", unit: "pc", heavy: true, transport: true },
  { id: "c10", name: "Plywood Board (4x8 ft)", price: dp(120), cat: "Structural", img: "🟫", tag: "Hot", unit: "sheet", heavy: true, transport: true },
  { id: "c11", name: "Roofing Sheet (Long Span)", price: dp(185), cat: "Roofing", img: "🏠", tag: "Popular", unit: "sheet", heavy: true, transport: true },
  { id: "c12", name: "Roofing Sheets (Aluminium)", price: dp(220), cat: "Roofing", img: "🏠", tag: "Premium", unit: "sheet", heavy: true, transport: true },
  { id: "c13", name: "Sand (Tipper Load)", price: dp(650), cat: "Structural", img: "🏖️", tag: "Bulk", unit: "load", heavy: true, transport: true },
  { id: "c14", name: "Gravel / Chippings (Tipper)", price: dp(800), cat: "Structural", img: "🪨", tag: "Bulk", unit: "load", heavy: true, transport: true },
  // Finishes
  { id: "c15", name: "Wall Tiles (Box – 2.88sqm)", price: dp(145), cat: "Finishes", img: "🔲", tag: "Popular", unit: "box", heavy: true },
  { id: "c16", name: "Floor Tiles (Box – 1.8sqm)", price: dp(165), cat: "Finishes", img: "🔳", tag: "Hot", unit: "box", heavy: true },
  { id: "c17", name: "Emulsion Paint (20L, Dulux)", price: dp(380), cat: "Finishes", img: "🎨", tag: "Popular", unit: "bucket" },
  { id: "c18", name: "Gloss Paint (4L)", price: dp(95), cat: "Finishes", img: "🎨", tag: "Retail", unit: "tin" },
  { id: "c19", name: "Tile Adhesive / Cement (25kg)", price: dp(65), cat: "Finishes", img: "🪣", tag: "Bulk", unit: "bag", heavy: true },
  { id: "c20", name: "Door (Solid Flush, 2.1m)", price: dp(750), cat: "Finishes", img: "🚪", tag: "New", unit: "pc", heavy: true, transport: true },
  { id: "c21", name: "Window Frame (Aluminium)", price: dp(420), cat: "Finishes", img: "🪟", tag: "Popular", unit: "unit", heavy: true, transport: true },
  // Plumbing
  { id: "c22", name: "PVC Pipe (3-inch, 6m)", price: dp(85), cat: "Plumbing", img: "🔵", tag: "Popular", unit: "length", heavy: true },
  { id: "c23", name: "PVC Pipe (2-inch, 6m)", price: dp(55), cat: "Plumbing", img: "🔵", tag: "Retail", unit: "length" },
  { id: "c24", name: "PVC Pipe (4-inch, 6m)", price: dp(110), cat: "Plumbing", img: "🔵", tag: "Hot", unit: "length", heavy: true },
  { id: "c25", name: "Ball Valve (1-inch)", price: dp(25), cat: "Plumbing", img: "🔧", tag: "Retail", unit: "pc" },
  { id: "c26", name: "Gate Valve (1.5-inch)", price: dp(45), cat: "Plumbing", img: "🔧", tag: "Retail", unit: "pc" },
  { id: "c27", name: "Toilet Bowl (Close-Coupled)", price: dp(480), cat: "Plumbing", img: "🚽", tag: "Popular", unit: "unit", heavy: true, transport: true },
  { id: "c28", name: "Bath Tub (Acrylic)", price: dp(1200), cat: "Plumbing", img: "🛁", tag: "Premium", unit: "unit", heavy: true, transport: true },
  { id: "c29", name: "Hand Basin with Stand", price: dp(320), cat: "Plumbing", img: "🚿", tag: "Popular", unit: "unit", heavy: true },
  { id: "c30", name: "Water Tank (1000L Polytank)", price: dp(950), cat: "Plumbing", img: "💧", tag: "Hot", unit: "unit", heavy: true, transport: true },
  { id: "c31", name: "Water Tank (500L)", price: dp(520), cat: "Plumbing", img: "💧", tag: "Popular", unit: "unit", heavy: true, transport: true },
  { id: "c32", name: "Flexible Hose (1m)", price: dp(18), cat: "Plumbing", img: "🔵", tag: "Retail", unit: "pc" },
  { id: "c33", name: "Elbow Joint (2-inch PVC)", price: dp(5), cat: "Plumbing", img: "🔵", tag: "Retail", unit: "pc" },
  { id: "c34", name: "Tap / Faucet (Chrome)", price: dp(85), cat: "Plumbing", img: "🚰", tag: "Popular", unit: "pc" },
  { id: "c35", name: "Shower Head Set", price: dp(110), cat: "Plumbing", img: "🚿", tag: "New", unit: "set" },
  // Electrical
  { id: "c36", name: "PVC Conduit Pipe (1-inch)", price: dp(12), cat: "Electrical", img: "⚡", tag: "Retail", unit: "length" },
  { id: "c37", name: "Electrical Wire (2.5mm, 100m)", price: dp(280), cat: "Electrical", img: "🔌", tag: "Hot", unit: "roll" },
  { id: "c38", name: "Electrical Wire (1.5mm, 100m)", price: dp(195), cat: "Electrical", img: "🔌", tag: "Popular", unit: "roll" },
  { id: "c39", name: "Circuit Breaker (MCB, 40A)", price: dp(45), cat: "Electrical", img: "⚡", tag: "Retail", unit: "pc" },
  { id: "c40", name: "Distribution Board (12-way)", price: dp(185), cat: "Electrical", img: "🔌", tag: "Popular", unit: "unit" },
  { id: "c41", name: "Socket Outlet (Double, 13A)", price: dp(22), cat: "Electrical", img: "🔌", tag: "Retail", unit: "pc" },
  { id: "c42", name: "Light Switch (1-gang)", price: dp(10), cat: "Electrical", img: "💡", tag: "Retail", unit: "pc" },
  { id: "c43", name: "LED Bulb (15W, Philips)", price: dp(15), cat: "Electrical", img: "💡", tag: "Popular", unit: "pc" },
  { id: "c44", name: "Fluorescent Tube (36W)", price: dp(20), cat: "Electrical", img: "💡", tag: "Retail", unit: "pc" },
  { id: "c45", name: "Meter Box (Prepaid Ready)", price: dp(120), cat: "Electrical", img: "📟", tag: "New", unit: "unit" },
  { id: "c46", name: "Extension Board (4-way, 5m)", price: dp(45), cat: "Electrical", img: "🔌", tag: "Hot", unit: "pc" },
  { id: "c47", name: "Earthing Rod (Copper, 1.2m)", price: dp(55), cat: "Electrical", img: "⚡", tag: "Retail", unit: "pc" },
  // Tools
  { id: "c48", name: "Hammer (500g)", price: dp(35), cat: "Tools", img: "🔨", tag: "Retail", unit: "pc" },
  { id: "c49", name: "Wheelbarrow", price: dp(280), cat: "Tools", img: "🛒", tag: "Popular", unit: "unit", heavy: true },
  { id: "c50", name: "Spade / Shovel", price: dp(65), cat: "Tools", img: "⛏️", tag: "Retail", unit: "pc" },
  { id: "c51", name: "Measuring Tape (5m)", price: dp(25), cat: "Tools", img: "📏", tag: "Retail", unit: "pc" },
  { id: "c52", name: "Spirit Level (1.2m)", price: dp(55), cat: "Tools", img: "📐", tag: "Retail", unit: "pc" },
  { id: "c53", name: "Concrete Mixer (Electric)", price: dp(3500), cat: "Tools", img: "🏗️", tag: "Hot", unit: "unit", heavy: true, transport: true }
];

export const DRIVERS: Driver[] = [
  { id: "D1", name: "Kwame Asante", vehicle: "Honda CB200 (Motorcycle)", plate: "GW 1234-23", rating: 4.9, trips: 1240, eta: 3 },
  { id: "D2", name: "Abena Mensah", vehicle: "Toyota Corolla (Eco Saloon)", plate: "GW 5678-22", rating: 4.8, trips: 876, eta: 5 },
  { id: "D3", name: "Kofi Boateng", vehicle: "Bajaj Boxer (Motorcycle)", plate: "GW 9012-24", rating: 4.7, trips: 634, eta: 7 },
  { id: "D4", name: "Yaw Darko", vehicle: "Aboboya (Tricycle)", plate: "GW 3344-23", rating: 4.8, trips: 2100, eta: 10, heavy: true },
  { id: "D5", name: "Ama Owusu", vehicle: "Hyundai Mighty (Pickup Truck)", plate: "GW 7788-22", rating: 4.9, trips: 560, eta: 15, heavy: true }
];

// ─── FEES CONFIG ─────────────────────────────────────────────────────────────
export const FEES = {
  platform: 0.05,          // 5% platform fee
  deliveryStandard: 10,
  deliveryExpress: 20,
  deliverySameDay: 30,
  transportAboboya: 50,    // heavy goods transport
  transportPickup: 120,    // pickup truck
  paymentMobileMoney: 0.0005,// 0.05% MoMo charge
  paymentCard: 0.015,      // 1.5% card charge
};

// Map exact photorealistic Unsplash images globally for all products
import { PRODUCT_IMAGES } from "./productImages";
[...GROCERY_ITEMS, ...ELECTRONICS, ...CONSTRUCTION].forEach(p => {
  if (PRODUCT_IMAGES[p.id]) {
    p.img = PRODUCT_IMAGES[p.id];
  }
});

