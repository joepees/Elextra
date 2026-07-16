import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DB } from "../db";
import { FoodPlace, Product, FoodMenu } from "../types";
import { 
  Search, MapPin, Clock, Star, Utensils, Sparkles, Plus, Minus,
  Trash2, CheckCircle2, ChevronRight, X, Check, Heart, Sliders, ArrowLeft,
  ShoppingBag, Flame, BadgeAlert, Award, Gift
} from "lucide-react";

// Types for customizable addons
export interface ElextraAddon {
  id: string;
  name: string;
  price: number;
  category: "Extras" | "Protein Options" | "Sides" | "Drinks";
  enabled: boolean;
  meals: string[]; // e.g. plain_rice, waakye, jollof_rice
}

const DEFAULT_ELEXTRA_ADDONS: ElextraAddon[] = [
  { id: "veggies", name: "Veggies", price: 3.0, category: "Extras", enabled: true, meals: ["plain_rice", "waakye", "jollof_rice"] },
  { id: "spaghetti", name: "Spaghetti", price: 4.0, category: "Extras", enabled: true, meals: ["plain_rice", "waakye", "jollof_rice"] },
  { id: "fried_fish", name: "Fried Fish", price: 8.0, category: "Protein Options", enabled: true, meals: ["plain_rice", "waakye", "jollof_rice"] },
  { id: "chicken", name: "Chicken", price: 12.0, category: "Protein Options", enabled: true, meals: ["plain_rice", "waakye", "jollof_rice"] },
  { id: "meat", name: "Meat", price: 10.0, category: "Protein Options", enabled: true, meals: ["plain_rice", "waakye", "jollof_rice"] },
  { id: "egg", name: "Egg", price: 3.0, category: "Protein Options", enabled: true, meals: ["plain_rice", "waakye", "jollof_rice"] },
  { id: "avocado", name: "Avocado Slices", price: 5.0, category: "Extras", enabled: true, meals: ["plain_rice", "waakye"] },
  { id: "gari", name: "Gari Addon", price: 2.0, category: "Extras", enabled: true, meals: ["waakye"] }
];

const DEFAULT_NEW_FOOD_PLACES: FoodPlace[] = [
  {
    id: "pinocchio_osu",
    name: "Pinocchio Osu",
    location: "Osu, Accra Main Street",
    type: "Pizza, Pasta & Italian Desserts",
    hours: "11am–11pm",
    rating: 4.8,
    imgUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    status: "active",
    city: "tarkwa",
    menu: [
      {
        id: "pino_pep_pizza",
        item: "Pepperoni Pizza",
        price: 105.00,
        originalPrice: 150.00,
        description: "Fresh Mozzarella, spicy Italian beef pepperoni, tomato sauce and fresh basil on a hand-stretched crust",
        imgUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        popular: true,
        addons: [
          { id: "pino_cheese", name: "Extra Mozzarella Cheese", price: 12.00, enabled: true },
          { id: "pino_mushrooms", name: "Portobello Mushrooms", price: 8.00, enabled: true }
        ]
      },
      {
        id: "pino_margh_pizza",
        item: "Margherita Pizza",
        price: 84.00,
        originalPrice: 120.00,
        description: "Traditional Italian Margherita with slow-roasted cherry tomatoes, fresh buffalo mozzarella, and sweet basil",
        imgUrl: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        popular: true,
        addons: []
      },
      {
        id: "pino_diavola",
        item: "Spicy Diavola Pizza",
        price: 105.00,
        originalPrice: 150.00,
        description: "Hot salami, spicy Nduja paste, black olives, jalapenos, and mozzarella with chili oil drizzle",
        imgUrl: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        popular: true,
        addons: []
      },
      {
        id: "pino_bruschetta",
        item: "Bruschetta Mix",
        price: 84.00,
        originalPrice: 120.00,
        description: "An assortment of toasted bread topped with our signature olive and anchovy tapenade and fresh tomatoes",
        imgUrl: "https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: [
          { id: "pino_brush_anchovy", name: "Extra Anchovy", price: 10.00, enabled: true }
        ]
      },
      {
        id: "pino_melanzane",
        item: "Melanzane alla Parmigiana",
        price: 105.00,
        originalPrice: 150.00,
        description: "A golden layer of parmesan melting over a baked bed of eggplant slices with rich tomato sauce.",
        imgUrl: "https://images.unsplash.com/photo-1625937329935-23744186045b?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: []
      }
    ]
  },
  {
    id: "elextra",
    name: "ELEXTRA Fast Food",
    location: "Elextra Central Kitchen, Tarkwa Bypass",
    type: "Platform Main Kitchen",
    hours: "24/7 Operations",
    rating: 4.9,
    imgUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    status: "active",
    city: "tarkwa",
    menu: [
      { 
        id: "plain_rice", 
        item: "Plain Rice plate", 
        price: 15.00, 
        description: "Freshly steamed fragrant white rice", 
        imgUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80", 
        enabled: true,
        addons: []
      },
      { 
        id: "waakye", 
        item: "Special Waakye plate", 
        price: 15.00, 
        description: "Authentic Ghanaian waakye cooked with local millet leaves", 
        imgUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?auto=format&fit=crop&w=400&q=80", 
        enabled: true,
        addons: []
      },
      { 
        id: "jollof_rice", 
        item: "Spiced Jollof Rice plate", 
        price: 15.00, 
        description: "Rich, smoky spiced Ghanaian jollof rice", 
        imgUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=400&q=80", 
        enabled: true,
        addons: []
      }
    ]
  },
  {
    id: "kfc_circle",
    name: "KFC Circle Joint",
    location: "Ring Road, Tarkwa Central",
    type: "Burgers & Fried Chicken",
    hours: "10am–11pm",
    rating: 4.5,
    imgUrl: "https://images.unsplash.com/photo-1513639773648-191442a47254?auto=format&fit=crop&w=800&q=80",
    status: "active",
    city: "tarkwa",
    menu: [
      {
        id: "kfc_streetwise5",
        item: "Streetwise 5 - Large Chips",
        price: 120.00,
        description: "5 Pieces of Chicken (Original or Hot & Crispy) and 1 Large portion of golden Fries",
        imgUrl: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: [
          { id: "k_add_coleslaw", name: "Coleslaw Portion", price: 9.60, enabled: true },
          { id: "k_add_zinger", name: "Zinger Dip Sauce", price: 8.00, enabled: true },
          { id: "k_add_chips", name: "Extra Regular Chips", price: 28.80, enabled: true },
          { id: "k_add_coke", name: "300ML Ice Cold Coke", price: 11.20, enabled: true }
        ]
      },
      {
        id: "kfc_wow_deal",
        item: "Wow Deal Burger & Fries",
        price: 54.00,
        description: "Golden crispy chicken fillet burger with creamy mayonnaise and warm fries",
        imgUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: [
          { id: "k_wow_extra_patty", name: "Extra Crispy Fillet Patty", price: 25.00, enabled: true },
          { id: "k_wow_cheese", name: "Double Cheddar Cheese Slice", price: 8.00, enabled: true }
        ]
      },
      {
        id: "kfc_black_stars",
        item: "Black Stars Box Meal",
        price: 120.00,
        description: "2 Pieces of Hot & Crispy chicken, 1 regular burger, chips, and drinks",
        imgUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: []
      }
    ]
  },
  {
    id: "cheezzy_pizza",
    name: "Cheezzy Pizza Ring Road",
    location: "Ring Road Bypass, Tarkwa",
    type: "Pizza",
    hours: "11am–10pm",
    rating: 4.4,
    imgUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    status: "active",
    city: "tarkwa",
    menu: [
      {
        id: "cp_ring_road",
        item: "Cheezzy Pizza Ring Road Special",
        price: 110.00,
        description: "Signature pan crust pizza topped with spicy chicken cubes, sausage, green peppers, and double cheese ring crust",
        imgUrl: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: [
          { id: "cp_add_mozzarella", name: "Double Mozzarella Cheese", price: 15.00, enabled: true },
          { id: "cp_add_pepperoni", name: "Spicy Beef Pepperoni Slices", price: 12.00, enabled: true },
          { id: "cp_add_mushrooms", name: "Fresh Mushrooms Portion", price: 8.00, enabled: true }
        ]
      },
      {
        id: "cp_classic_pep",
        item: "Classic Pepperoni Feast",
        price: 95.00,
        description: "Loaded beef pepperoni, Italian herbs, and rich tomato marinara sauce",
        imgUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: []
      }
    ]
  },
  {
    id: "f_abena",
    name: "Mama Abena's Local Food Joint",
    location: "Atuabo, Tarkwa Bypass",
    type: "Local Food",
    hours: "7am–8pm",
    rating: 4.8,
    imgUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80",
    status: "active",
    city: "tarkwa",
    menu: [
      { 
        id: "abena_red_red",
        item: "Red Red (Plantain & Gobe Beans Stew)", 
        price: 14.00,
        description: "Premium black-eyed beans stew served with sweet ripe plantains and rich palm oil",
        imgUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: [
          { id: "abena_addon_fish", name: "Extra Fried Fish portion", price: 8.0, enabled: true },
          { id: "abena_addon_egg", name: "Fried / Boiled Egg", price: 3.0, enabled: true },
          { id: "abena_addon_avocado", name: "Avocado Pear Slice", price: 5.0, enabled: true }
        ]
      },
      {
        id: "abena_kenkey",
        item: "Kenkey with Fried Fish & Shito",
        price: 16.00,
        description: "Traditional fermented corn dumplings served with crispy fish, green shito, and red pepper sauce",
        imgUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: [
          { id: "abena_addon_extra_fish", name: "Extra Salmon / Fried Fish", price: 8.0, enabled: true },
          { id: "abena_addon_tolo_beef", name: "Pork Rind (Tolo Beef)", price: 5.0, enabled: true }
        ]
      }
    ]
  },
  {
    id: "f2",
    name: "Golden Fork Restaurant",
    location: "Tarkwa Main Street",
    type: "Fried Rice & Fast Food",
    hours: "7am–10pm",
    rating: 4.6,
    imgUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    status: "active",
    city: "tarkwa",
    menu: [
      {
        id: "gold_fried_rice",
        item: "Fried Rice & Chicken Combo",
        price: 35.00,
        description: "Stir-fried seasoned rice with vegetables and marinated chicken cuts",
        imgUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: [
          { id: "gold_addon_sausage", name: "Extra Grilled Sausage", price: 6.0, enabled: true },
          { id: "gold_addon_wing", name: "Extra Sweet Chili Chicken Wing", price: 8.0, enabled: true }
        ]
      }
    ]
  },
  {
    id: "f3",
    name: "Bogoso Mama's Kitchen",
    location: "Bogoso Junction",
    type: "Local Food",
    hours: "6am–8pm",
    rating: 4.7,
    imgUrl: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80",
    status: "active",
    city: "bogoso",
    menu: [
      {
        id: "bogoso_banku",
        item: "Banku & Okro Stew",
        price: 18.00,
        description: "Steamed fermented corn and cassava dough with savory okro soup",
        imgUrl: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: [
          { id: "bogoso_addon_meat", name: "Extra Goat Meat portion", price: 8.0, enabled: true },
          { id: "bogoso_addon_wele", name: "Wele (Soft Cowhide) portion", price: 4.0, enabled: true }
        ]
      },
      {
        id: "bogoso_fufu",
        item: "Fufu & Chicken Light Soup",
        price: 25.00,
        description: "Freshly pounded cassava and plantain fufu served with light chicken soup",
        imgUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80",
        enabled: true,
        addons: [
          { id: "bogoso_addon_egg", name: "Boiled Egg", price: 3.0, enabled: true }
        ]
      }
    ]
  }
];

interface FoodPageProps {
  addToCart: (p: Product) => void;
  wishlist: string[];
  toggleWish: (p: Product) => void;
  cityFilter?: string;
  notify?: (msg: string, type?: "ok" | "err") => void;
}

export function FoodPage({ addToCart, wishlist, toggleWish, cityFilter = "all", notify }: FoodPageProps) {
  const [restaurants, setRestaurants] = useState<FoodPlace[]>([]);
  const [elextraAddons, setElextraAddons] = useState<ElextraAddon[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Selected details overlay
  const [activeRestaurant, setActiveRestaurant] = useState<FoodPlace | null>(null);

  // Advanced filters states
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [filterSortBy, setFilterSortBy] = useState("Most relevant");
  const [filterOffersOnly, setFilterOffersOnly] = useState(false);
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [filterMaxDeliveryFee, setFilterMaxDeliveryFee] = useState<number | null>(null);
  const [filterMaxDeliveryTime, setFilterMaxDeliveryTime] = useState<number | null>(null);
  const [filterPickupOnly, setFilterPickupOnly] = useState(false);
  const [filterMaxDistance, setFilterMaxDistance] = useState<number | null>(null);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);

  // Active eatery/restaurant menu search & filter states
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [showMenuSearch, setShowMenuSearch] = useState(false);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState("All");
  const [showMenuCategories, setShowMenuCategories] = useState(false);

  // Helper values for simulated delivery rates
  const getDeliveryDetails = (restId: string) => {
    const matched = (restaurants || []).find((p: any) => p.id === restId);
    if (matched) {
      return {
        fee: matched.deliveryFee || "GHS 5.00",
        oldFee: matched.id === "elextra" ? "GHS 10.00" : (matched.id === "pinocchio_osu" ? "GHS 10.99" : null),
        time: matched.deliveryTime || "20-40 min",
        discount: matched.promos && matched.promos.length > 0 ? matched.promos[0] : "-15%"
      };
    }
    switch (restId) {
      case "pinocchio_osu":
        return { fee: "GHS 0.99", oldFee: "GHS 10.99", time: "15-35 min", discount: "-30%" };
      case "elextra":
        return { fee: "GHS 2.99", oldFee: "GHS 10.00", time: "15-25 min", discount: "-20%" };
      case "kfc_circle":
        return { fee: "GHS 2.99", oldFee: "GHS 12.99", time: "35-50 min", discount: "-20%" };
      case "cheezzy_pizza":
        return { fee: "GHS 10.49", oldFee: null, time: "40-65 min", discount: "Up to -15%" };
      case "f_abena":
        return { fee: "GHS 3.50", oldFee: "GHS 8.00", time: "20-35 min", discount: "-10%" };
      case "f2":
        return { fee: "GHS 4.00", oldFee: "GHS 10.00", time: "25-40 min", discount: "Up to -15%" };
      case "f3":
        return { fee: "GHS 1.50", oldFee: "GHS 6.00", time: "15-30 min", discount: "-30%" };
      default:
        return { fee: "GHS 5.00", oldFee: null, time: "20-40 min", discount: "-15%" };
    }
  };

  // Parsed and computed helper values for advanced filter matching and sorting
  const getExtendedDetails = (r: FoodPlace) => {
    const details = getDeliveryDetails(r.id);
    
    // Parse fee
    let feeNum = 5.0;
    const feeStr = details.fee;
    if (feeStr.toLowerCase().includes("free")) {
      feeNum = 0;
    } else {
      const match = feeStr.match(/[\d.]+/);
      if (match) feeNum = parseFloat(match[0]);
    }

    // Parse time
    let timeNum = 30;
    const timeStr = details.time;
    const timeMatch = timeStr.match(/(\d+)-(\d+)/) || timeStr.match(/(\d+)/);
    if (timeMatch) {
      if (timeMatch[2]) {
        timeNum = parseInt(timeMatch[2], 10);
      } else {
        timeNum = parseInt(timeMatch[1], 10);
      }
    }

    // Simulated distance
    let distanceNum = 1.5;
    if (r.id === "pinocchio_osu") distanceNum = 0.5;
    else if (r.id === "elextra") distanceNum = 0.8;
    else if (r.id === "kfc_circle") distanceNum = 1.2;
    else if (r.id === "cheezzy_pizza") distanceNum = 2.1;
    else if (r.id === "f_abena") distanceNum = 1.4;
    else if (r.id === "f2") distanceNum = 2.8;
    else if (r.id === "f3") distanceNum = 3.5;
    else {
      let hash = 0;
      for (let i = 0; i < r.id.length; i++) {
        hash = r.id.charCodeAt(i) + ((hash << 5) - hash);
      }
      distanceNum = Math.abs(hash % 35) / 10 + 0.5;
    }

    const hasDiscount = !!(details.discount && details.discount !== "");

    return {
      feeNum,
      timeNum,
      distanceNum,
      hasDiscount,
      ...details
    };
  };

  // Reset menu search and category selections when active restaurant changes
  useEffect(() => {
    setMenuSearchQuery("");
    setShowMenuSearch(false);
    setSelectedMenuCategory("All");
    setShowMenuCategories(false);
  }, [activeRestaurant]);

  // Helper to categorize menu items
  const getMenuCategory = useCallback((item: FoodMenu): string => {
    const name = (item.item || "").toLowerCase();
    if (name.includes("rice") || name.includes("waakye") || name.includes("jollof") || name.includes("yam") || name.includes("plantain") || name.includes("fufu") || name.includes("banku") || name.includes("local")) {
      return "Rice & Local";
    }
    if (name.includes("pizza") || name.includes("slice") || name.includes("crust")) {
      return "Pizza";
    }
    if (name.includes("burger") || name.includes("sandwich") || name.includes("sub") || name.includes("wrap")) {
      return "Burgers & Wraps";
    }
    if (name.includes("chicken") || name.includes("streetwise") || name.includes("drumstick") || name.includes("wing") || name.includes("meat") || name.includes("gizzard") || name.includes("sausage")) {
      return "Chicken & Mains";
    }
    if (name.includes("chips") || name.includes("fries") || name.includes("snack") || name.includes("pie") || name.includes("salad") || name.includes("coleslaw")) {
      return "Sides & Snacks";
    }
    if (name.includes("drink") || name.includes("coke") || name.includes("fanta") || name.includes("sprite") || name.includes("water") || name.includes("beverage") || name.includes("juice") || name.includes("sobolo") || name.includes("malt") || name.includes("soda")) {
      return "Drinks";
    }
    return "Others";
  }, []);

  // Compute available categories for the active restaurant's menu
  const menuCategories = useMemo(() => {
    if (!activeRestaurant) return ["All"];
    const cats = new Set<string>();
    activeRestaurant.menu.forEach(item => {
      if (item.enabled !== false) {
        cats.add(getMenuCategory(item));
      }
    });
    return ["All", ...Array.from(cats)];
  }, [activeRestaurant, getMenuCategory]);

  // Filtered menu items list based on search query and category
  const filteredMenuItems = useMemo(() => {
    if (!activeRestaurant) return [];
    return activeRestaurant.menu.filter(m => {
      if (m.enabled === false) return false;
      
      // Search query filter
      if (menuSearchQuery.trim()) {
        const q = menuSearchQuery.toLowerCase();
        const matchName = (m.item || "").toLowerCase().includes(q);
        const matchDesc = (m.description || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      
      // Selected category filter
      if (selectedMenuCategory !== "All") {
        const itemCat = getMenuCategory(m);
        if (itemCat !== selectedMenuCategory) return false;
      }
      
      return true;
    });
  }, [activeRestaurant, menuSearchQuery, selectedMenuCategory, getMenuCategory]);

  // Customizer popup bottom sheet states
  const [customizingItem, setCustomizingItem] = useState<{
    parentRestaurant: FoodPlace;
    item: FoodMenu;
    isElextra: boolean;
  } | null>(null);

  const [customizingOption, setCustomizingOption] = useState<string>("");
  const [customizingQuantity, setCustomizingQuantity] = useState<number>(1);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [customNotes, setCustomNotes] = useState("");

  // Support physical/hardware Back button on mobile
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If customizer is open, close it first
      if (customizingItem) {
        setCustomizingItem(null);
      } 
      // Otherwise, if restaurant detail is open, close it
      else if (activeRestaurant) {
        setActiveRestaurant(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeRestaurant, customizingItem]);

  // When opening a restaurant, push to history if not already there
  const handleSelectRestaurant = (r: FoodPlace | null) => {
    if (r) {
      window.history.pushState({ isRestaurantOpen: true, restaurantId: r.id }, "");
      setActiveRestaurant(r);
    } else {
      if (activeRestaurant) {
        window.history.back();
      }
    }
  };

  // Handle open customizer bottom sheet
  const handleOpenCustomizer = (restaurant: FoodPlace, item: FoodMenu) => {
    window.history.pushState({ isCustomizerOpen: true, itemId: item.id }, "");
    setCustomizingItem({
      parentRestaurant: restaurant,
      item,
      isElextra: restaurant.id === "elextra"
    });
    setCustomizingOption("Hot & Crispy");
    setCustomizingQuantity(1);
    setSelectedAddons({});
    setCustomNotes("");
  };

  const handleCloseCustomizer = () => {
    if (customizingItem) {
      window.history.back();
    }
  };

  // Speech search triggers
  const [isListening, setIsListening] = useState(false);

  // Load food joints and options
  const loadFoodData = async () => {
    try {
      const storedFP = await DB.get("elx_food_places");
      if (storedFP && Array.isArray(storedFP) && storedFP.length > 0) {
        setRestaurants(storedFP);
      } else {
        setRestaurants(DEFAULT_NEW_FOOD_PLACES);
        await DB.set("elx_food_places", DEFAULT_NEW_FOOD_PLACES);
      }

      const storedAddons = await DB.get("elx_elextra_addons");
      if (storedAddons && Array.isArray(storedAddons) && storedAddons.length > 0) {
        setElextraAddons(storedAddons);
      } else {
        setElextraAddons(DEFAULT_ELEXTRA_ADDONS);
        await DB.set("elx_elextra_addons", DEFAULT_ELEXTRA_ADDONS);
      }

      const storedCats = await DB.get("elx_food_categories");
      if (storedCats && Array.isArray(storedCats) && storedCats.length > 0) {
        setDbCategories(storedCats);
      } else {
        const defaultCats = [
          { name: "Pizza", icon: "🍕" },
          { name: "Burgers", icon: "🍔" },
          { name: "Local Food", icon: "🍲" },
          { name: "Fried Rice", icon: "🍚" },
          { name: "Bakery", icon: "🥖" },
          { name: "Drinks", icon: "🥤" },
          { name: "Desserts", icon: "🍨" }
        ];
        setDbCategories(defaultCats);
        await DB.set("elx_food_categories", defaultCats);
      }
    } catch (err) {
      console.error("Error loading food joints:", err);
    }
  };

  useEffect(() => {
    loadFoodData();

    // Listen for database sync triggers
    const handleSync = (e: any) => {
      const { key, value } = e.detail || {};
      if (key === "elx_food_places") {
        if (value && Array.isArray(value)) setRestaurants(value);
      } else if (key === "elx_elextra_addons") {
        if (value && Array.isArray(value)) setElextraAddons(value);
      } else if (key === "elx_food_categories") {
        if (value && Array.isArray(value)) setDbCategories(value);
      }
    };

    window.addEventListener("elx_db_sync" as any, handleSync);
    window.addEventListener("storage", loadFoodData);

    return () => {
      window.removeEventListener("elx_db_sync" as any, handleSync);
      window.removeEventListener("storage", loadFoodData);
    };
  }, []);

  useEffect(() => {
    if (restaurants.length > 0) {
      const pendingId = localStorage.getItem("elx_deep_link_restaurant_id");
      if (pendingId) {
        const found = restaurants.find(r => r.id === pendingId);
        if (found) {
          setActiveRestaurant(found);
        }
        localStorage.removeItem("elx_deep_link_restaurant_id");
      }
    }
  }, [restaurants]);

  // Voice Speech search API
  const startSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      if (notify) notify("🎙️ Web Speech is not supported in this browser. Try Chrome!", "err");
      return;
    }
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => {
      setIsListening(true);
      if (notify) notify("🎙️ Listening... Say 'KFC', 'Rice', 'Pizza' or 'Burger'!", "ok");
    };
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setSearchQuery(text);
      if (notify) notify(`🎙️ Voice search input: "${text}"`, "ok");
    };
    recognition.onerror = () => {
      setIsListening(false);
      if (notify) notify("Voice recognition failed.", "err");
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  // Categories definition
  const CATEGORIES = useMemo(() => {
    return [{ name: "All", icon: "🍽️" }, ...dbCategories];
  }, [dbCategories]);

  // Multi-tiered restaurant filtering
  const filteredRestaurants = useMemo(() => {
    let result = restaurants.filter(r => {
      if (!r) return false;
      // City filter bounds
      if (cityFilter !== "all" && r.city && r.city !== cityFilter) {
        return false;
      }

      // Selected category match
      if (selectedCategory !== "All") {
        const typeMatch = (r.type || "").toLowerCase().includes((selectedCategory || "").toLowerCase());
        const menuMatch = (r.menu || []).some(m => m && (m.item || "").toLowerCase().includes((selectedCategory || "").toLowerCase()));
        if (!typeMatch && !menuMatch) return false;
      }

      // Search match
      const query = (searchQuery || "").trim().toLowerCase();
      if (query) {
        const nameMatch = (r.name || "").toLowerCase().includes(query);
        const locMatch = (r.location || "").toLowerCase().includes(query);
        const typeMatch = (r.type || "").toLowerCase().includes(query);
        const itemsMatch = (r.menu || []).some(m => m && ((m.item || "").toLowerCase().includes(query) || (m.description || "").toLowerCase().includes(query)));
        if (!nameMatch && !locMatch && !typeMatch && !itemsMatch) return false;
      }

      const details = getExtendedDetails(r);

      // Advanced offers filter
      if (filterOffersOnly && !details.hasDiscount) {
        return false;
      }

      // Advanced rating filter
      if (filterMinRating > 0 && r.rating < filterMinRating) {
        return false;
      }

      // Advanced delivery fee filter
      if (filterMaxDeliveryFee !== null && details.feeNum > filterMaxDeliveryFee) {
        return false;
      }

      // Advanced delivery time filter
      if (filterMaxDeliveryTime !== null && details.timeNum > filterMaxDeliveryTime) {
        return false;
      }

      // Advanced distance filter
      if (filterMaxDistance !== null && details.distanceNum > filterMaxDistance) {
        return false;
      }

      // Advanced category checklist filter
      if (filterCategories.length > 0) {
        const matchesCategory = filterCategories.some(cat => {
          const typeMatch = (r.type || "").toLowerCase().includes(cat.toLowerCase());
          const menuMatch = (r.menu || []).some(m => m && (m.item || "").toLowerCase().includes(cat.toLowerCase()));
          return typeMatch || menuMatch;
        });
        if (!matchesCategory) return false;
      }

      return true;
    });

    // Apply Sorting
    if (filterSortBy === "Closest") {
      result = [...result].sort((a, b) => getExtendedDetails(a).distanceNum - getExtendedDetails(b).distanceNum);
    } else if (filterSortBy === "Cheapest delivery") {
      result = [...result].sort((a, b) => getExtendedDetails(a).feeNum - getExtendedDetails(b).feeNum);
    } else if (filterSortBy === "Fastest delivery") {
      result = [...result].sort((a, b) => getExtendedDetails(a).timeNum - getExtendedDetails(b).timeNum);
    } else if (filterSortBy === "Best Rating") {
      result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [
    restaurants,
    cityFilter,
    selectedCategory,
    searchQuery,
    filterSortBy,
    filterOffersOnly,
    filterMinRating,
    filterMaxDeliveryFee,
    filterMaxDeliveryTime,
    filterMaxDistance,
    filterCategories
  ]);

  // Carousels derived from restaurants list
  const offersRestaurants = useMemo(() => {
    // Simulated offers places (e.g. KFC, Elextra, Cheezzy)
    return filteredRestaurants.filter(r => r && r.id && ["elextra", "kfc_circle", "cheezzy_pizza"].includes(r.id));
  }, [filteredRestaurants]);

  const topRatedRestaurants = useMemo(() => {
    return [...filteredRestaurants].sort((a, b) => (b?.rating || 0) - (a?.rating || 0));
  }, [filteredRestaurants]);

  const saveOnDeliveryRestaurants = useMemo(() => {
    // Free or low delivery fees (GHS 1.50 or GHS 2.99)
    return filteredRestaurants.filter(r => r && r.id && (r.id === "bogoso_kitchen" || r.id === "elextra" || r.id === "f_abena"));
  }, [filteredRestaurants]);

  // Add compiled product to main basket cart
  const handleAddToBasket = () => {
    if (!customizingItem) return;
    const { item, parentRestaurant, isElextra } = customizingItem;

    // Resolve active addons list
    let activeAddons: Array<{ name: string; price: number }> = [];
    if (isElextra) {
      activeAddons = elextraAddons.filter(ad => ad.enabled && ad.meals.includes(item.id || "") && selectedAddons[ad.id]);
    } else {
      activeAddons = (item.addons || []).filter(ad => ad.enabled && selectedAddons[ad.id]);
    }

    const addonPriceTotal = activeAddons.reduce((sum, ad) => sum + ad.price, 0);
    const itemUnitPrice = item.price + addonPriceTotal;
    const finalPriceTotal = itemUnitPrice * customizingQuantity;

    const addonsSummary = activeAddons.map(ad => ad.name).join(", ");
    let serializedName = `${item.item}`;
    
    // Add meta info serialized
    const details: string[] = [];
    if (customizingOption) details.push(`Option: ${customizingOption}`);
    if (addonsSummary) details.push(`Add-ons: ${addonsSummary}`);
    if (customNotes.trim()) details.push(`Note: "${customNotes.trim()}"`);

    if (details.length > 0) {
      serializedName += ` (${details.join(" | ")})`;
    }

    // Set standard icons based on food category
    let iconChar = "🍲";
    const restType = (parentRestaurant.type || "").toLowerCase();
    if (restType.includes("burger") || (item.item || "").toLowerCase().includes("burger")) iconChar = "🍔";
    else if (restType.includes("pizza") || (item.item || "").toLowerCase().includes("pizza")) iconChar = "🍕";
    else if ((item.item || "").toLowerCase().includes("rice") || (item.item || "").toLowerCase().includes("waakye")) iconChar = "🍚";

    const product: Product = {
      id: `${parentRestaurant.id}-${item.id || item.item.replace(/\s+/g, "-")}-${Date.now()}`,
      name: `${serializedName} x${customizingQuantity}`,
      price: finalPriceTotal,
      cat: "Local Fast Food",
      img: item.imgUrl || parentRestaurant.imgUrl || iconChar,
      tag: isElextra ? "Proprietary" : "Hot Delivery",
      unit: "plate",
      shop: parentRestaurant.name
    };

    addToCart(product);
    if (notify) notify(`Added ${customizingQuantity}x ${item.item} to your delivery basket! 🛒`, "ok");
    
    // Reset states
    handleCloseCustomizer();
  };

  return (
    <div className="space-y-6 pb-24 font-sans text-slate-800">
      
      {/* High-fidelity ELEXTRA Kitchens Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 rounded-[24px] p-6 overflow-hidden min-h-[145px] flex flex-col justify-center shadow-lg border border-orange-100/20 text-white"
        id="elextra-kitchens-banner"
      >
        <div className="z-10 max-w-[65%]">
          <span className="bg-white/20 text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-1 rounded-full text-white backdrop-blur-md">
            LOCAL JOINT SPECIALS
          </span>
          <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight mt-2.5">
            Freshly prepared, fast delivered.
          </h2>
          <p className="text-xs opacity-90 mt-1 font-semibold">
            Tarkwa & Bogoso's favorite local kitchens, brought to your doorstep in real-time.
          </p>
        </div>

        {/* Floating food elements animated with Framer Motion */}
        <motion.span 
          animate={{ y: [0, -8, 0], rotate: [0, 8, -8, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="absolute top-4 right-1/3 text-3xl select-none pointer-events-none opacity-20"
        >
          🍛
        </motion.span>
        <motion.span 
          animate={{ y: [0, -12, 0], rotate: [0, -12, 12, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-2 right-12 text-4xl select-none pointer-events-none"
        >
          🍲
        </motion.span>
        <motion.span 
          animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-4 right-20 text-4xl select-none pointer-events-none"
        >
          🍚
        </motion.span>
        <motion.span 
          animate={{ y: [0, -10, 0], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut", delay: 1.5 }}
          className="absolute top-12 right-2 text-3xl select-none pointer-events-none"
        >
          🍗
        </motion.span>
      </motion.div>

      {/* Search and Voice search row - sticky look */}
      <div className="flex gap-2.5 items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder="Search food, restaurants, stores..." 
            className="w-full bg-slate-100 border-0 focus:bg-white focus:ring-2 focus:ring-orange-500 text-slate-800 rounded-2xl py-3.5 pl-12 pr-10 text-sm font-semibold transition shadow-sm outline-none" 
            id="food-search-bar"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={startSpeechRecognition}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all shadow-sm ${
            isListening 
              ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
              : "bg-white hover:bg-slate-100 border border-slate-200 text-orange-500"
          }`}
          title="Voice search"
          id="voice-search-btn"
        >
          🎙️
        </button>
        <button 
          className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all shadow-sm cursor-pointer ${
            isFilterSheetOpen || filterSortBy !== "Most relevant" || filterOffersOnly || filterMinRating > 0 || filterMaxDeliveryFee !== null || filterMaxDeliveryTime !== null || filterMaxDistance !== null || filterCategories.length > 0
              ? "bg-emerald-50 border-emerald-300 text-emerald-600 ring-2 ring-emerald-100" 
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setIsFilterSheetOpen(true)}
          id="filter-sliders-btn"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>

      {/* Categories Horizontal Slider */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`flex items-center gap-2 px-4 py-3 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                isActive 
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              id={`cat-pill-${cat.name.replace(/\s+/g, "-").toLowerCase()}`}
            >
              <span className="text-sm">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main carousels container */}
      <div className="space-y-8">
        
        {/* CAROUSEL A: Explore Offers */}
        {offersRestaurants.length > 0 && (
          <div className="space-y-3" id="offers-carousel-sec">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Explore offers</h3>
                <p className="text-xs text-slate-400 font-medium">Top local discounts and delicious campaign deals</p>
              </div>
              <button 
                onClick={() => {
                  if (notify) notify("Filtering active campaigns! 🔥", "ok");
                }}
                className="text-orange-500 text-xs font-bold hover:underline flex items-center gap-0.5"
              >
                <span>All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none scroll-smooth">
              {offersRestaurants.map(r => {
                const details = getDeliveryDetails(r.id);
                const isFav = wishlist.includes(r.id);
                return (
                  <div 
                    key={`offer-${r.id}`}
                    onClick={() => handleSelectRestaurant(r)}
                    className="w-72 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden flex-shrink-0 cursor-pointer group"
                    id={`restaurant-offer-card-${r.id}`}
                  >
                    {/* Image Box */}
                    <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                      <img 
                        src={r.imgUrl} 
                        alt={r.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      {/* Discount overlay */}
                      <span className="absolute top-3 left-3 bg-red-500 text-white font-extrabold text-[10px] uppercase px-2 py-1 rounded-lg tracking-wider shadow-sm">
                        {details.discount}
                      </span>
                      {/* Wishlist toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWish({
                            id: r.id,
                            name: r.name,
                            price: 0,
                            cat: "Local Fast Food"
                          });
                          if (notify) notify(isFav ? `Removed ${r.name} from saved joints` : `Saved ${r.name} to favorites ❤️`, "ok");
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:scale-110 transition shadow-sm"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                      </button>
                      {/* Rating overlay badge */}
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm text-[10px] font-bold text-slate-800">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{r.rating.toFixed(1)} (500+)</span>
                      </div>
                    </div>

                    {/* Metadata Box */}
                    <div className="p-3.5 space-y-1">
                      <h4 className="font-extrabold text-sm text-slate-800 tracking-tight truncate">{r.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 flex-wrap">
                        <span className="text-orange-500 font-extrabold">🛵 {details.fee}</span>
                        {details.oldFee && (
                          <span className="text-slate-400 line-through font-normal">{details.oldFee}</span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {details.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CAROUSEL B: Top-rated */}
        {topRatedRestaurants.length > 0 && (
          <div className="space-y-3" id="top-rated-carousel-sec">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Top-rated</h3>
                <p className="text-xs text-slate-400 font-medium">The most appreciated kitchens with highest reviews</p>
              </div>
              <button 
                onClick={() => {
                  if (notify) notify("All highest-rated eateries active", "ok");
                }}
                className="text-orange-500 text-xs font-bold hover:underline flex items-center gap-0.5"
              >
                <span>All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none scroll-smooth">
              {topRatedRestaurants.map(r => {
                const details = getDeliveryDetails(r.id);
                const isFav = wishlist.includes(r.id);
                return (
                  <div 
                    key={`top-${r.id}`}
                    onClick={() => handleSelectRestaurant(r)}
                    className="w-72 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden flex-shrink-0 cursor-pointer group"
                    id={`restaurant-top-card-${r.id}`}
                  >
                    <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                      <img 
                        src={r.imgUrl} 
                        alt={r.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      {/* Premium rating tag */}
                      <span className="absolute top-3 left-3 bg-amber-500 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded-lg tracking-wider shadow-sm flex items-center gap-1">
                        <Award className="w-3 h-3 text-white fill-white" />
                        <span>PREMIER</span>
                      </span>
                      {/* Wishlist toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWish({
                            id: r.id,
                            name: r.name,
                            price: 0,
                            cat: "Local Fast Food"
                          });
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:scale-110 transition shadow-sm"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                      </button>
                      {/* Rating overlay badge */}
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm text-[10px] font-extrabold text-slate-800">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{r.rating.toFixed(1)} ★</span>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-1">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-extrabold text-sm text-slate-800 tracking-tight truncate flex-1">{r.name}</h4>
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                          {(r.type || "Food").split(" ")[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 flex-wrap">
                        <span className="text-slate-600 font-bold">🛵 {details.fee}</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {details.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CAROUSEL C: Save on delivery */}
        {saveOnDeliveryRestaurants.length > 0 && (
          <div className="space-y-3" id="save-delivery-carousel-sec">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Save on delivery</h3>
                <p className="text-xs text-slate-400 font-medium">Eateries with the lowest local motorcycle dispatch fee</p>
              </div>
              <button 
                onClick={() => {
                  if (notify) notify("Lowest fees filtered", "ok");
                }}
                className="text-orange-500 text-xs font-bold hover:underline flex items-center gap-0.5"
              >
                <span>All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none scroll-smooth">
              {saveOnDeliveryRestaurants.map(r => {
                const details = getDeliveryDetails(r.id);
                const isFav = wishlist.includes(r.id);
                return (
                  <div 
                    key={`save-${r.id}`}
                    onClick={() => handleSelectRestaurant(r)}
                    className="w-72 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden flex-shrink-0 cursor-pointer group"
                    id={`restaurant-save-card-${r.id}`}
                  >
                    <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                      <img 
                        src={r.imgUrl} 
                        alt={r.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      {/* Cheap delivery tag */}
                      <span className="absolute top-3 left-3 bg-emerald-500 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded-lg tracking-wider shadow-sm flex items-center gap-1">
                        <Gift className="w-3 h-3 text-white fill-white" />
                        <span>ECO FEE</span>
                      </span>
                      {/* Wishlist toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWish({
                            id: r.id,
                            name: r.name,
                            price: 0,
                            cat: "Local Fast Food"
                          });
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:scale-110 transition shadow-sm"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                      </button>
                    </div>

                    <div className="p-3.5 space-y-1">
                      <h4 className="font-extrabold text-sm text-slate-800 tracking-tight truncate">{r.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 flex-wrap">
                        <span className="text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md">🛵 {details.fee} Delivery</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {details.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION D: Explore all places */}
        <div className="space-y-4" id="all-places-grid-sec">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Explore all places</h3>
            <p className="text-xs text-slate-400 font-medium">Order piping hot food cooked fresh from reliable kitchens</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRestaurants.map(r => {
              const details = getDeliveryDetails(r.id);
              const isUnavailable = r.status && r.status !== "active";
              const isFav = wishlist.includes(r.id);

              return (
                <div 
                  key={`all-${r.id}`}
                  onClick={() => handleSelectRestaurant(r)}
                  className={`bg-white rounded-2xl border border-slate-100 hover:border-orange-100 hover:shadow-md cursor-pointer transition overflow-hidden flex gap-3.5 p-3 group relative ${
                    isUnavailable ? "opacity-75" : ""
                  }`}
                  id={`restaurant-all-card-${r.id}`}
                >
                  {/* Photo thumbnail */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50 relative">
                    <img 
                      src={r.imgUrl} 
                      alt={r.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    {isUnavailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider">
                        Closed
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 bg-white/95 px-1.5 py-0.5 rounded text-[8px] font-extrabold text-slate-800 flex items-center gap-0.5 shadow">
                      ★ {r.rating.toFixed(1)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-extrabold text-sm text-slate-800 tracking-tight truncate">{r.name}</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWish({
                              id: r.id,
                              name: r.name,
                              price: 0,
                              cat: "Local Fast Food"
                            });
                          }}
                          className="text-slate-300 hover:text-red-500 transition"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                        </button>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{r.type}</p>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">📍 {r.location}</p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-bold mt-2 text-slate-500">
                      <span className="text-orange-500">🛵 {details.fee}</span>
                      <span className="flex items-center gap-0.5 font-semibold text-slate-400"><Clock className="w-3 h-3 text-slate-300" /> {details.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredRestaurants.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <div className="text-slate-600 font-bold text-sm">No food eateries or dishes found</div>
                <p className="text-xs text-slate-400 mt-1">Try searching for other keywords like 'rice', 'waakye' or clear filters.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RENDER DYNAMIC FULL-SCREEN RESTAURANT DETAIL SCREEN OVERLAY */}
      <AnimatePresence>
        {activeRestaurant && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-0 bg-white z-[1050] overflow-hidden flex flex-col"
            id="restaurant-detail-overlay"
          >
            {/* Top glassmorphic header bar */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between z-20">
              <button 
                onClick={() => handleSelectRestaurant(null)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition"
                id="restaurant-detail-back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">{activeRestaurant.name}</h3>
              <button 
                onClick={() => {
                  toggleWish({
                    id: activeRestaurant.id,
                    name: activeRestaurant.name,
                    price: 0,
                    cat: "Local Fast Food"
                  });
                }}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition"
              >
                <Heart className={`w-5 h-5 ${wishlist.includes(activeRestaurant.id) ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            </div>

            {/* Scrollable contents container */}
            <div className="flex-1 overflow-y-auto pb-24" id="restaurant-detail-scroll-container">
              {/* Giant Hero Cover */}
            <div className="h-56 w-full relative overflow-hidden bg-slate-900 flex-shrink-0">
              <img 
                src={activeRestaurant.imgUrl} 
                alt={activeRestaurant.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Brand Floating Square Logo */}
              <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-2xl bg-white p-1 border-2 border-slate-100 shadow-md flex items-center justify-center z-10">
                <span className="text-2xl">{activeRestaurant.id === "elextra" ? "🍔" : activeRestaurant.id === "cheezzy_pizza" ? "🍕" : "🍲"}</span>
              </div>
            </div>

            {/* Information container */}
            <div className="px-6 pt-10 pb-6 space-y-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{activeRestaurant.name}</h1>
                <p className="text-xs text-orange-500 font-bold hover:underline cursor-pointer mt-1">More info ›</p>
              </div>

              {/* Quick stats row */}
              <div className="flex items-center gap-4 text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-2xl">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>{activeRestaurant.rating.toFixed(1)} (500+)</span>
                </div>
                <div className="text-slate-300">|</div>
                <div>
                  🛵 {getDeliveryDetails(activeRestaurant.id).fee} Delivery
                </div>
                <div className="text-slate-300">|</div>
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{getDeliveryDetails(activeRestaurant.id).time}</span>
                </div>
              </div>

              {/* Active Campaigns list */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="flex-shrink-0 flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 font-extrabold text-[11px] px-3 py-1.5 rounded-full">
                  <Flame className="w-3.5 h-3.5" />
                  <span>20% off everything</span>
                </span>
                <span className="flex-shrink-0 flex items-center gap-1.5 bg-orange-50 text-orange-600 border border-orange-100 font-extrabold text-[11px] px-3 py-1.5 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Up to 45% off selected</span>
                </span>
              </div>

              {/* Action tabs inside eatery */}
              <div className="flex gap-2 pt-1.5">
                <button 
                  onClick={() => {
                    setShowMenuSearch(prev => !prev);
                    if (!showMenuSearch) {
                      setShowMenuCategories(false);
                    } else {
                      setMenuSearchQuery("");
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition shadow-sm ${
                    showMenuSearch 
                      ? "bg-orange-500 text-white hover:bg-orange-600" 
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                  id="menu-search-toggle-btn"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{showMenuSearch ? "Close Search" : "Search Menu"}</span>
                </button>
                <button 
                  onClick={() => {
                    setShowMenuCategories(prev => !prev);
                    if (!showMenuCategories) {
                      setShowMenuSearch(false);
                      setMenuSearchQuery("");
                    } else {
                      setSelectedMenuCategory("All");
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition shadow-sm ${
                    showMenuCategories 
                      ? "bg-orange-500 text-white hover:bg-orange-600" 
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                  id="menu-categories-toggle-btn"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>{showMenuCategories ? "Hide Categories" : "Categories"}</span>
                </button>
              </div>

              {/* Optional Search Input Field */}
              {showMenuSearch && (
                <div className="relative mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text"
                    placeholder="Search dishes, drinks, combos..."
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-12 py-2.5 bg-slate-100 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-orange-100 outline-none transition"
                    autoFocus
                    id="menu-search-input-field"
                  />
                  {menuSearchQuery && (
                    <button 
                      onClick={() => setMenuSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 rounded px-1.5 py-0.5 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Optional Categories Horizontal Scroll Bar */}
              {showMenuCategories && (
                <div className="flex gap-2 overflow-x-auto pt-2 pb-1 scrollbar-none animate-in fade-in slide-in-from-top-2 duration-200">
                  {menuCategories.map((cat) => (
                    <button
                      key={`menu-cat-${cat}`}
                      onClick={() => setSelectedMenuCategory(cat)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition whitespace-nowrap ${
                        selectedMenuCategory === cat 
                          ? "bg-orange-500 text-white shadow-sm" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      id={`menu-cat-pill-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Menu offerings container scroll */}
            <div className="p-6 space-y-6 flex-1 bg-slate-50/50">
              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-10 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                  <div className="text-4xl mb-2">🍽️</div>
                  <h4 className="text-sm font-extrabold text-slate-700">No matching menu items found</h4>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search filters or selected category</p>
                  {(menuSearchQuery || selectedMenuCategory !== "All") && (
                    <button 
                      onClick={() => {
                        setMenuSearchQuery("");
                        setSelectedMenuCategory("All");
                      }}
                      className="mt-3 px-4 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-full text-xs font-bold transition"
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 1. MOST POPULAR HORIZONTAL CAROUSEL (ONLY if no category filter is selected, or category is All) */}
                  {(selectedMenuCategory === "All" && !menuSearchQuery) && (
                    <div className="space-y-3" id="restaurant-most-popular-sec">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        Most popular
                      </h3>
                      
                      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none scroll-smooth">
                        {filteredMenuItems.filter(m => m.popular).map((m, index) => {
                          const isFav = wishlist.includes(m.id || `dish-${activeRestaurant.id}-${index}`);
                          return (
                            <div 
                              key={`pop-${m.id || index}`}
                              onClick={() => handleOpenCustomizer(activeRestaurant, m)}
                              className="w-40 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden flex-shrink-0 cursor-pointer relative group flex flex-col justify-between"
                            >
                              {/* Item image */}
                              <div className="h-28 w-full relative overflow-hidden bg-slate-100">
                                {m.imgUrl ? (
                                  <img 
                                    src={m.imgUrl} 
                                    alt={m.item} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300 text-xl font-bold bg-slate-50">
                                    🍲
                                  </div>
                                )}
                                
                                {/* Popular and discount badges */}
                                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                                  <span className="bg-amber-400 text-slate-900 font-black text-[8px] uppercase px-1.5 py-0.5 rounded shadow-sm">
                                    Popular
                                  </span>
                                  {m.originalPrice && (
                                    <span className="bg-red-500 text-white font-black text-[8px] uppercase px-1.5 py-0.5 rounded shadow-sm">
                                      -30%
                                    </span>
                                  )}
                                </div>

                                {/* Floating Green Plus button inside/over image bottom-right */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCustomizer(activeRestaurant, m);
                                  }}
                                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md hover:scale-110 active:scale-95 transition"
                                >
                                  <Plus className="w-4 h-4 text-white" />
                                </button>
                              </div>

                              {/* Price and Title info */}
                              <div className="p-3 space-y-1">
                                <div className="flex flex-wrap items-baseline gap-1.5">
                                  <span className="font-extrabold text-slate-800 text-sm">
                                    GHS {m.price.toFixed(2)}
                                  </span>
                                  {m.originalPrice && (
                                    <span className="text-[10px] text-slate-400 line-through font-medium">
                                      GHS {m.originalPrice.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-xs text-slate-700 tracking-tight leading-snug line-clamp-1 truncate">{m.item}</h4>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. MENU ITEMS BY CATEGORY LISTS (VERTICALLY RENDERED) */}
                  {["Appetizers", "Pizza", "Burgers & Wraps", "Chicken & Mains", "Rice & Local", "Sides & Snacks", "Drinks", "Others"]
                    .map(category => {
                      const categoryItems = filteredMenuItems.filter(m => {
                        const computedCat = getMenuCategory(m);
                        return computedCat === category;
                      });

                      if (categoryItems.length === 0) return null;

                      return (
                        <div key={`menu-cat-group-${category}`} className="space-y-3 pt-2">
                          <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">
                            {category}
                          </h3>
                          
                          <div className="space-y-3.5">
                            {categoryItems.map((m, index) => {
                              const isFav = wishlist.includes(m.id || `dish-${activeRestaurant.id}-${index}`);
                              return (
                                <div 
                                  key={`item-${m.id || index}`}
                                  onClick={() => handleOpenCustomizer(activeRestaurant, m)}
                                  className="bg-white rounded-2xl border border-slate-100 p-3.5 flex gap-4 shadow-sm hover:shadow-md cursor-pointer transition relative group justify-between items-center"
                                  id={`menu-item-card-${m.id || index}`}
                                >
                                  {/* Left: Content Text */}
                                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                                    <div>
                                      <div className="flex justify-between items-start gap-1">
                                        <h4 className="font-extrabold text-xs md:text-sm text-slate-800 truncate">{m.item}</h4>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleWish({
                                              id: m.id || `dish-${activeRestaurant.id}-${index}`,
                                              name: m.item,
                                              price: m.price,
                                              cat: "Local Fast Food"
                                            });
                                          }}
                                          className="text-slate-300 hover:text-red-500 transition flex-shrink-0"
                                        >
                                          <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                                        </button>
                                      </div>
                                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-snug">
                                        {m.description || "Baked fresh to order with authentic Ghana local toppings and ingredients."}
                                      </p>
                                    </div>

                                    {/* Price section with discount handling */}
                                    <div className="flex items-baseline gap-1.5 mt-2">
                                      <span className="font-black text-slate-800 text-sm">
                                        GHS {m.price.toFixed(2)}
                                      </span>
                                      {m.originalPrice ? (
                                        <span className="text-[10px] text-slate-400 line-through font-medium">
                                          GHS {m.originalPrice.toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 line-through font-medium">
                                          GHS {(m.price * 1.3).toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Food Image & Green Plus Button */}
                                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-50 flex-shrink-0 relative border border-slate-100">
                                    {m.imgUrl ? (
                                      <img 
                                        src={m.imgUrl} 
                                        alt={m.item} 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg font-bold bg-slate-50">
                                        🍲
                                      </div>
                                    )}
                                    
                                    {/* Floating Green Plus button on top-right or bottom-right of the image */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenCustomizer(activeRestaurant, m);
                                      }}
                                      className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition shadow-md active:scale-90 cursor-pointer"
                                    >
                                      <Plus className="w-4 h-4 text-white" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Standard menu section */}
              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight uppercase tracking-wider text-[11px] text-slate-400">Limited Time Offer</h3>
                <div className="bg-slate-100 rounded-2xl p-4 text-center border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-bold">Additional lunch deals refresh every day at 12:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER INTERACTIVE CUSTOMIZER BOTTOM SHEET */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-end justify-center">
            {/* Modal backdrop closer click */}
            <div className="absolute inset-0" onClick={handleCloseCustomizer} />

            {/* Sliding sheet */}
            <motion.div 
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.85 }}
              onDragEnd={(event, info) => {
                if (info.offset.y > 110) {
                  handleCloseCustomizer();
                }
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] relative z-10 touch-pan-y cursor-grab active:cursor-grabbing"
              id="customizer-bottom-sheet"
            >
              {/* Drag line indicator */}
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-3.5 flex-shrink-0 cursor-row-resize" />

              {/* Close button */}
              <button
                onClick={handleCloseCustomizer}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition z-20"
                id="customizer-close-btn"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Scrollable details */}
              <div className="overflow-y-auto flex-1 space-y-6 pb-6 px-6">
                
                {/* Food Image thumbnail box */}
                {customizingItem.item.imgUrl && (
                  <div className="h-48 w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-100 flex-shrink-0">
                    <img 
                      src={customizingItem.item.imgUrl} 
                      alt={customizingItem.item.item} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Title info */}
                <div>
                  <div className="flex gap-2 items-center">
                    <span className="bg-amber-100 text-amber-800 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md">
                      Popular
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold">
                      {customizingItem.parentRestaurant.name}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">{customizingItem.item.item}</h2>
                  
                  {/* High fidelity price labels */}
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-black text-slate-900">
                      GHS {customizingItem.item.price.toFixed(2)}
                    </span>
                    {customizingItem.item.originalPrice ? (
                      <span className="text-xs text-slate-400 line-through font-medium">
                        GHS {customizingItem.item.originalPrice.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 line-through font-medium">
                        GHS {(customizingItem.item.price * 1.3).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-snug mt-2">{customizingItem.item.description || "Freshly cooked to order with pure Ghanaian local ingredients."}</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Choose Extras</h3>
                  
                  <div className="space-y-2.5">
                    {/* Resolve extras based on brand */}
                    {customizingItem.isElextra ? (
                      elextraAddons
                        .filter(ad => ad.enabled && ad.meals.includes(customizingItem.item.id || ""))
                        .map(ad => (
                          <label 
                            key={ad.id}
                            className={`p-3.5 rounded-2xl border-2 cursor-pointer flex justify-between items-center transition ${
                              selectedAddons[ad.id] 
                                ? "border-orange-500 bg-orange-50/40" 
                                : "border-slate-100 hover:border-slate-200"
                            }`}
                            id={`addon-label-${ad.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={!!selectedAddons[ad.id]}
                                onChange={(e) => setSelectedAddons({ ...selectedAddons, [ad.id]: e.target.checked })}
                                className="accent-orange-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs md:text-sm font-extrabold text-slate-700">{ad.name}</span>
                            </div>
                            <span className="text-xs font-extrabold text-orange-500">
                              +GHS {ad.price.toFixed(2)}
                            </span>
                          </label>
                        ))
                    ) : (
                      (customizingItem.item.addons || [])
                        .filter(ad => ad.enabled !== false)
                        .map(ad => (
                          <label 
                            key={ad.id}
                            className={`p-3.5 rounded-2xl border-2 cursor-pointer flex justify-between items-center transition ${
                              selectedAddons[ad.id] 
                                ? "border-orange-500 bg-orange-50/40" 
                                : "border-slate-100 hover:border-slate-200"
                            }`}
                            id={`addon-label-${ad.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={!!selectedAddons[ad.id]}
                                onChange={(e) => setSelectedAddons({ ...selectedAddons, [ad.id]: e.target.checked })}
                                className="accent-orange-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs md:text-sm font-extrabold text-slate-700">{ad.name}</span>
                            </div>
                            <span className="text-xs font-extrabold text-orange-500">
                              +GHS {ad.price.toFixed(2)}
                            </span>
                          </label>
                        ))
                    )}
                  </div>
                </div>

                {/* Custom Chef Note */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Add a note</h3>
                  <p className="text-[11px] text-slate-400 font-medium">It may not be possible to meet all requests</p>
                  <textarea 
                    value={customNotes}
                    onChange={e => setCustomNotes(e.target.value)}
                    placeholder="Example: Put gravy on the side, extra crispy, no spices..."
                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold rounded-2xl p-3 h-20 outline-none transition resize-none"
                    id="customizer-chef-note"
                  />
                </div>

              </div>

              {/* Bottom sticky control bar with Quantity and consolidated Price */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex items-center gap-3 z-20">
                {/* Quantity stepper */}
                <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-full p-1 shadow-sm flex-shrink-0">
                  <button
                    onClick={() => setCustomizingQuantity(Math.max(1, customizingQuantity - 1))}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-600 transition font-extrabold"
                    id="customizer-qty-minus"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-extrabold text-slate-800 text-sm min-w-[16px] text-center">
                    {customizingQuantity}
                  </span>
                  <button
                    onClick={() => setCustomizingQuantity(customizingQuantity + 1)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-600 transition font-extrabold"
                    id="customizer-qty-plus"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleAddToBasket}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center justify-between min-w-0"
                  id="customizer-add-to-basket-btn"
                >
                  <span className="truncate">Add to Basket</span>
                  <span className="font-black bg-black/10 px-2 py-0.5 rounded text-[11px] sm:text-xs ml-1 flex-shrink-0">
                    GHS {(
                      (
                        customizingItem.item.price + 
                        (customizingItem.isElextra 
                          ? elextraAddons.filter(ad => ad.enabled && ad.meals.includes(customizingItem.item.id || "") && selectedAddons[ad.id])
                          : (customizingItem.item.addons || []).filter(ad => ad.enabled && selectedAddons[ad.id])
                        ).reduce((sum, ad) => sum + ad.price, 0)
                      ) * customizingQuantity
                    ).toFixed(2)}
                  </span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HIGH FIDELITY FILTERS BOTTOM DRAWER / SHEET */}
      <AnimatePresence>
        {isFilterSheetOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-end justify-center">
            {/* Modal backdrop closer click */}
            <div className="absolute inset-0" onClick={() => setIsFilterSheetOpen(false)} />

            {/* Sliding sheet */}
            <motion.div 
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.85 }}
              onDragEnd={(event, info) => {
                if (info.offset.y > 110) {
                  setIsFilterSheetOpen(false);
                }
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] relative z-10 touch-pan-y cursor-grab active:cursor-grabbing"
              id="filter-drawer-sheet"
            >
              {/* Drag line indicator */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3.5 flex-shrink-0 cursor-row-resize" />

              {/* Header with Title and Close Button */}
              <div className="px-6 pb-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Filter</h2>
                <button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
                  id="filter-drawer-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Filters Content */}
              <div className="overflow-y-auto flex-1 space-y-6 py-6 px-6" id="filter-drawer-scrollable">
                
                {/* SORT BY */}
                <div className="space-y-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    ⇅ Sort
                  </span>
                  <div className="space-y-2">
                    {[
                      { value: "Most relevant", label: "Most relevant" },
                      { value: "Closest", label: "Closest" },
                      { value: "Cheapest delivery", label: "Cheapest delivery" },
                      { value: "Fastest delivery", label: "Fastest delivery" },
                      { value: "Best Rating", label: "Best Rating" }
                    ].map(option => (
                      <label 
                        key={option.value}
                        onClick={() => setFilterSortBy(option.value)}
                        className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-slate-50 px-2 rounded-xl transition"
                      >
                        <span className={`text-sm font-semibold ${filterSortBy === option.value ? "text-emerald-600 font-bold" : "text-slate-700"}`}>
                          {option.label}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${filterSortBy === option.value ? "border-emerald-500" : "border-slate-300"}`}>
                          {filterSortBy === option.value && (
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* OFFERS DISCOUNTS */}
                <div className="py-4 border-t border-b border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      🏷️ Offers
                    </span>
                    <p className="text-xs font-semibold text-slate-700">Only show places with discounts or other offers</p>
                  </div>
                  <button
                    onClick={() => setFilterOffersOnly(!filterOffersOnly)}
                    className={`w-12 h-6 rounded-full p-0.5 transition-all duration-300 ${filterOffersOnly ? "bg-emerald-500" : "bg-slate-200"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${filterOffersOnly ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* STAR RATING */}
                <div className="space-y-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    ⭐ Rating
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 0, label: "Any" },
                      { value: 4, label: "4 or more" },
                      { value: 4.4, label: "4.4 or more" },
                      { value: 4.7, label: "4.7 or more" }
                    ].map(option => (
                      <button
                        key={`rating-opt-${option.value}`}
                        onClick={() => setFilterMinRating(option.value)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer ${
                          filterMinRating === option.value
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DELIVERY FEE */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    🛵 Delivery fee
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: null, label: "Any" },
                      { value: 0, label: "Free" },
                      { value: 5, label: "GHS 5.00 or less" },
                      { value: 10, label: "GHS 10.00 or less" }
                    ].map((option, idx) => (
                      <button
                        key={`fee-opt-${idx}`}
                        onClick={() => setFilterMaxDeliveryFee(option.value)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer ${
                          filterMaxDeliveryFee === option.value
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DELIVERY TIME */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    ⏱️ Delivery time
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: null, label: "Any" },
                      { value: 15, label: "15 min or less" },
                      { value: 20, label: "20 min or less" },
                      { value: 30, label: "30 min or less" }
                    ].map((option, idx) => (
                      <button
                        key={`time-opt-${idx}`}
                        onClick={() => setFilterMaxDeliveryTime(option.value)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer ${
                          filterMaxDeliveryTime === option.value
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PICKUP OPTION */}
                <div className="py-4 border-t border-b border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      🏃 Pickup
                    </span>
                    <p className="text-xs font-semibold text-slate-700">Only show places with option to collect orders yourself</p>
                  </div>
                  <button
                    onClick={() => setFilterPickupOnly(!filterPickupOnly)}
                    className={`w-12 h-6 rounded-full p-0.5 transition-all duration-300 ${filterPickupOnly ? "bg-emerald-500" : "bg-slate-200"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${filterPickupOnly ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* DISTANCE */}
                <div className="space-y-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    📍 Distance
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: null, label: "Any" },
                      { value: 1, label: "1 km or less" },
                      { value: 2, label: "2 km or less" },
                      { value: 3, label: "3 km or less" }
                    ].map((option, idx) => (
                      <button
                        key={`dist-opt-${idx}`}
                        onClick={() => setFilterMaxDistance(option.value)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer ${
                          filterMaxDistance === option.value
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* POPULAR CATEGORIES CHECKBOX LIST */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    🍕 Categories
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      "Pizza", "Burgers", "Local Food", "Desserts", "Pasta", 
                      "Fast Food Joint", "Chicken & Mains", "Drinks", "Shawarma", 
                      "Seafood", "Indian", "Asian", "Salad", "Sandwich"
                    ].map(cat => {
                      const isChecked = filterCategories.includes(cat);
                      return (
                        <label 
                          key={`chk-cat-${cat}`}
                          onClick={() => {
                            if (isChecked) {
                              setFilterCategories(filterCategories.filter(c => c !== cat));
                            } else {
                              setFilterCategories([...filterCategories, cat]);
                            }
                          }}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                            isChecked 
                              ? "border-emerald-500 bg-emerald-50/20 font-bold" 
                              : "border-slate-100 hover:border-slate-200 font-semibold"
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Controlled by label click
                            className="accent-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs text-slate-700">{cat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Sticky bottom control bar with Count and Apply/Clear */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3 flex-shrink-0 z-20">
                <button
                  onClick={() => {
                    setFilterSortBy("Most relevant");
                    setFilterOffersOnly(false);
                    setFilterMinRating(0);
                    setFilterMaxDeliveryFee(null);
                    setFilterMaxDeliveryTime(null);
                    setFilterPickupOnly(false);
                    setFilterMaxDistance(null);
                    setFilterCategories([]);
                    if (notify) notify("Filters cleared successfully! ✨", "ok");
                  }}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold text-sm rounded-xl transition cursor-pointer"
                >
                  Clear all
                </button>

                <button
                  onClick={() => {
                    setIsFilterSheetOpen(false);
                    if (notify) notify(`Applied filters! Found ${filteredRestaurants.length} matching places`, "ok");
                  }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Show results</span>
                  <span className="bg-black/10 px-2 py-0.5 rounded text-xs font-black">
                    {filteredRestaurants.length}
                  </span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
