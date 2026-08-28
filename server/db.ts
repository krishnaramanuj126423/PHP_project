import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'database', 'cafe_data.json');

export interface CustomizationOptionItem {
  id?: string;
  name: string;
  price: number;
}

export interface CustomizationOptions {
  sizes?: CustomizationOptionItem[];
  milks?: CustomizationOptionItem[];
  syrups?: CustomizationOptionItem[];
  dressings?: CustomizationOptionItem[];
  addOns?: CustomizationOptionItem[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  ingredients: string[];
  calories: number;
  isVegetarian: boolean;
  isVegan: boolean;
  spiceLevel: number;
  allergens: string[];
  rating: number;
  reviewsCount: number;
  isBestseller: boolean;
  isNew: boolean;
  isFeatured: boolean;
  stock: number;
  customizationOptions?: CustomizationOptions;
}

export interface Coupon {
  code: string;
  discountPercent: number;
  discountFixed: number;
  minOrder: number;
  expiry: string;
  description: string;
}

export interface ChatbotFaq {
  keyword: string;
  question: string;
  answer: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  customDetails?: string;
}

export interface Order {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  orderType: string;
  address: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: 'Order Received' | 'Confirmed' | 'Preparing' | 'Ready' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  paymentMethod?: string;
  paymentStatus?: 'Paid' | 'Pending' | 'Failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

export interface LoyaltyHistoryItem {
  id: string;
  date: string;
  title: string;
  stampsChange: number;
  pointsChange: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  stamps?: number;
  points?: number;
  flavourProfile?: string;
  savedCreations?: any[];
  loyaltyHistory?: LoyaltyHistoryItem[];
  vouchers?: any[];
  lastCheckIn?: string;
  checkInStreak?: number;
}

export interface BuilderOptionItem {
  name: string;
  price: number;
  cal?: number;
  icon?: string;
  color?: string;
  scale?: number;
  shots?: number;
  caff?: number;
  drizzle?: string;
  fill?: number;
  foam?: number;
  caffeine?: number;
  tempType?: string;
}

export interface BuildersConfig {
  brew: {
    sizes: BuilderOptionItem[];
    coffees: BuilderOptionItem[];
    shots: BuilderOptionItem[];
    milks: BuilderOptionItem[];
    flavors: BuilderOptionItem[];
    toppings: BuilderOptionItem[];
  };
  meal: {
    bases: BuilderOptionItem[];
    proteins: BuilderOptionItem[];
    veggies: BuilderOptionItem[];
    sauces: BuilderOptionItem[];
    extras: BuilderOptionItem[];
  };
  plate: {
    mains: BuilderOptionItem[];
    sides: BuilderOptionItem[];
    salads: BuilderOptionItem[];
    sauces: BuilderOptionItem[];
    drinks: BuilderOptionItem[];
    desserts: BuilderOptionItem[];
  };
}

export function getDefaultBuildersConfig(): BuildersConfig {
  return {
    brew: {
      sizes: [
        { name: 'Small (8oz Piccolo)', price: 120, scale: 0.85, shots: 1 },
        { name: 'Standard (12oz Antiquity)', price: 160, scale: 1.0, shots: 2 },
        { name: 'Grand (16oz Artisanal)', price: 200, scale: 1.15, shots: 3 }
      ],
      coffees: [
        { name: 'Velvety Latte', price: 0, color: '#5C3826', fill: 70, caffeine: 150, foam: 35 },
        { name: 'Double Espresso', price: 0, color: '#2A1810', fill: 40, caffeine: 160, foam: 10 },
        { name: 'Microfoam Cappuccino', price: 20, color: '#4A2E1B', fill: 60, caffeine: 150, foam: 45 },
        { name: 'Cold Brew Infusion', price: 30, color: '#1B0F09', fill: 85, caffeine: 200, foam: 0 },
        { name: 'Cortado 1:1', price: 0, color: '#3D2415', fill: 50, caffeine: 150, foam: 20 },
        { name: 'Caffè Americano', price: -15, color: '#26140B', fill: 80, caffeine: 150, foam: 5 }
      ],
      shots: [
        { name: 'Double Shot (Standard)', price: 0, caff: 150 },
        { name: 'Single Shot (Lighter)', price: 0, caff: 75 },
        { name: 'Triple Shot (+1 Extra)', price: 35, caff: 225 },
        { name: 'Quad Shot (+2 Extra)', price: 60, caff: 300 }
      ],
      milks: [
        { name: 'Barista Oat Milk', price: 30, color: '#F3E9D5', cal: 90 },
        { name: 'Roasted Almond Milk', price: 30, color: '#FFF8EC', cal: 45 },
        { name: 'Organic Whole Dairy Milk', price: 0, color: '#FFFFFF', cal: 130 },
        { name: 'Silk Coconut Milk', price: 30, color: '#FFFDF7', cal: 70 },
        { name: 'Sicilian Pistachio Milk', price: 40, color: '#EDF7E7', cal: 95 },
        { name: 'Sweet Vanilla Cold Foam', price: 35, color: '#FFF5DE', cal: 110 },
        { name: 'None (Pure Black Roast)', price: 0, color: 'transparent', cal: 5 }
      ],
      flavors: [
        { name: 'Madagascar Bourbon Vanilla', price: 25, cal: 60 },
        { name: 'House Salted Caramel', price: 25, cal: 70 },
        { name: 'Hazelnut Praline', price: 25, cal: 65 },
        { name: 'Lavender Blossom Honey', price: 30, cal: 55 },
        { name: 'Spiced Brown Sugar & Cardamom', price: 30, cal: 60 },
        { name: 'Belgian Dark Mocha', price: 35, cal: 85 },
        { name: 'None (Unflavored)', price: 0, cal: 0 }
      ],
      toppings: [
        { name: 'House Whipped Cream', price: 25, cal: 80, drizzle: '#FFFFFF' },
        { name: 'Artisanal Caramel Drizzle', price: 20, cal: 40, drizzle: '#C59B27' },
        { name: 'Belgian Dark Cocoa Dust', price: 15, cal: 15, drizzle: '#3B2219' },
        { name: 'Ceylon Cinnamon Dust', price: 15, cal: 5, drizzle: '#8B5A2B' },
        { name: '24k Edible Gold Leaf', price: 60, cal: 0, drizzle: '#FFD700' }
      ]
    },
    meal: {
      bases: [
        { name: 'Pasta (Bronze Rigatoni)', price: 180, cal: 220, icon: 'fa-wheat-awn' },
        { name: 'Organic Jasmine Rice', price: 140, cal: 180, icon: 'fa-bowl-rice' },
        { name: 'Saffron Carnaroli Risotto', price: 210, cal: 240, icon: 'fa-spoon' },
        { name: 'Artisanal Sourdough Toast', price: 160, cal: 200, icon: 'fa-bread-slice' },
        { name: 'Mediterranean Herb Quinoa', price: 170, cal: 170, icon: 'fa-seedling' },
        { name: 'Fresh Wild Greens Bowl', price: 150, cal: 90, icon: 'fa-leaf' }
      ],
      proteins: [
        { name: 'Grilled Tuscan Herb Chicken', price: 120, cal: 240, icon: 'fa-drumstick-bite' },
        { name: 'Pan-Seared Atlantic Salmon', price: 180, cal: 280, icon: 'fa-fish' },
        { name: 'Slow-Braised Prime Short Rib', price: 220, cal: 320, icon: 'fa-bacon' },
        { name: 'Pan-Seared Golden Paneer', price: 100, cal: 260, icon: 'fa-cheese' },
        { name: 'Crispy Organic Tofu Cubes', price: 90, cal: 180, icon: 'fa-cubes' },
        { name: 'Organic Poached Farm Egg', price: 45, cal: 140, icon: 'fa-egg' }
      ],
      veggies: [
        { name: 'Chanterelle Mushrooms', price: 45, cal: 30, icon: 'fa-shield-halved' },
        { name: 'Sun-Dried Sicilian Tomatoes', price: 35, cal: 40, icon: 'fa-sun' },
        { name: 'Charred Garlic Broccolini', price: 45, cal: 45, icon: 'fa-seedling' },
        { name: 'Caramelized Cipollini Onions', price: 35, cal: 50, icon: 'fa-circle' },
        { name: 'Fire-Roasted Bell Peppers', price: 35, cal: 35, icon: 'fa-pepper-hot' },
        { name: 'Baby Spinach Garlic Sauté', price: 40, cal: 25, icon: 'fa-leaf' }
      ],
      sauces: [
        { name: 'Creamy White Truffle Alfredo', price: 55, cal: 180, icon: 'fa-bottle-droplet' },
        { name: 'San Marzano Tomato Basil', price: 40, cal: 90, icon: 'fa-apple-whole' },
        { name: 'Artisanal Basil Pesto', price: 50, cal: 160, icon: 'fa-mortar-pestle' },
        { name: 'Spicy Calabrian Chili Butter', price: 45, cal: 140, icon: 'fa-fire' },
        { name: 'Lemon Herb Garlic Reduction', price: 40, cal: 110, icon: 'fa-lemon' }
      ],
      extras: [
        { name: 'Aged Parmesan Shavings', price: 35, cal: 60, icon: 'fa-cheese' },
        { name: 'Toasted Pine Nuts', price: 40, cal: 70, icon: 'fa-cubes-stacked' },
        { name: 'Crispy Fried Shallots', price: 25, cal: 45, icon: 'fa-sparkles' },
        { name: 'White Truffle Oil Drizzle', price: 50, cal: 50, icon: 'fa-droplet' },
        { name: 'Fresh Micro-Basil', price: 20, cal: 5, icon: 'fa-leaf' }
      ]
    },
    plate: {
      mains: [
        { name: 'Tuscan Grilled Chicken', price: 260, cal: 320, icon: 'fa-drumstick-bite' },
        { name: 'Pan-Seared Salmon Fillet', price: 340, cal: 380, icon: 'fa-fish' },
        { name: 'Truffle Mushroom Rigatoni', price: 280, cal: 290, icon: 'fa-wheat-awn' },
        { name: 'Slow-Braised Prime Short Rib', price: 380, cal: 420, icon: 'fa-bacon' },
        { name: 'Roasted Golden Cauliflower Steak', price: 220, cal: 180, icon: 'fa-leaf' }
      ],
      sides: [
        { name: 'Truffle Roasted Potatoes', price: 95, cal: 210, icon: 'fa-bowl-food' },
        { name: 'Rosemary Garlic Focaccia', price: 75, cal: 180, icon: 'fa-bread-slice' },
        { name: 'Creamy Saffron Polenta', price: 85, cal: 190, icon: 'fa-spoon' },
        { name: 'Crispy Sweet Potato Wedges', price: 85, cal: 160, icon: 'fa-carrot' },
        { name: 'French Butter Haricots Verts', price: 75, cal: 60, icon: 'fa-seedling' }
      ],
      salads: [
        { name: 'Wild Arugula & Parmesan', price: 80, cal: 90, icon: 'fa-seedling' },
        { name: 'Heirloom Caprese & Basil', price: 110, cal: 130, icon: 'fa-apple-whole' },
        { name: 'Mediterranean Quinoa', price: 90, cal: 140, icon: 'fa-bowl-rice' },
        { name: 'Citrus Shaved Fennel Slaw', price: 80, cal: 70, icon: 'fa-lemon' }
      ],
      sauces: [
        { name: 'Artisanal Pesto Reduction', price: 45, cal: 120, icon: 'fa-bottle-droplet' },
        { name: 'Aged Modena Balsamic Glaze', price: 35, cal: 60, icon: 'fa-wine-bottle' },
        { name: 'Truffle Herb Aioli', price: 45, cal: 140, icon: 'fa-jar' },
        { name: 'Chimichurri Herb Butter', price: 45, cal: 110, icon: 'fa-cubes-stacked' },
        { name: 'Roasted Garlic Crème', price: 40, cal: 95, icon: 'fa-shield-heart' }
      ],
      drinks: [
        { name: 'Sparkling Citrus Tonic', price: 85, cal: 45, icon: 'fa-glass-water' },
        { name: 'Single-Origin Cold Brew', price: 110, cal: 15, icon: 'fa-mug-hot' },
        { name: 'Hibiscus Rosehip Berry Spritz', price: 95, cal: 40, icon: 'fa-martini-glass-citrus' },
        { name: 'Iced Peach White Tea', price: 85, cal: 30, icon: 'fa-leaf' },
        { name: 'Classic Antiquity Lemonade', price: 75, cal: 70, icon: 'fa-lemon' }
      ],
      desserts: [
        { name: 'Mini Dark Chocolate Tart', price: 95, cal: 180, icon: 'fa-cookie' },
        { name: 'Madagascar Vanilla Gelato Scoop', price: 80, cal: 140, icon: 'fa-ice-cream' },
        { name: 'Sicilian Lemon Sorbet', price: 75, cal: 90, icon: 'fa-lemon' },
        { name: 'Salted Caramel Macaron', price: 65, cal: 110, icon: 'fa-cookie-bite' }
      ]
    }
  };
}

export interface StoreSettings {
  isOpen: boolean;
  kitchenRushMode: boolean;
  estimatedWaitMinutes: number;
  announcement: string;
  taxRate?: number;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
}

export function getDefaultStoreSettings(): StoreSettings {
  return {
    isOpen: true,
    kitchenRushMode: false,
    estimatedWaitMinutes: 12,
    announcement: 'Fresh morning roast drop is now active. Table service is running smoothly!',
    taxRate: 5,
    deliveryFee: 40,
    freeDeliveryThreshold: 499
  };
}

export interface DatabaseSchema {
  products: Product[];
  categories: string[];
  quizQuestions: any[];
  flavourProfiles: Record<string, any>;
  loyaltyRewards: any[];
  coupons: Coupon[];
  chatbotFaq: ChatbotFaq[];
  users: User[];
  orders: Order[];
  buildersConfig?: BuildersConfig;
  storeSettings?: StoreSettings;
}

let cachedDb: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (cachedDb) {
    if (!cachedDb.buildersConfig) {
      cachedDb.buildersConfig = getDefaultBuildersConfig();
    }
    if (!cachedDb.storeSettings) {
      cachedDb.storeSettings = getDefaultStoreSettings();
    }
    return cachedDb;
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      cachedDb = JSON.parse(data);
      if (!cachedDb!.buildersConfig) {
        cachedDb!.buildersConfig = getDefaultBuildersConfig();
      }
      if (!cachedDb!.storeSettings) {
        cachedDb!.storeSettings = getDefaultStoreSettings();
      }
      return cachedDb!;
    }
  } catch (err) {
    console.error('Error reading DB_FILE:', err);
  }
  return {
    products: [],
    categories: [],
    quizQuestions: [],
    flavourProfiles: {},
    loyaltyRewards: [],
    coupons: [],
    chatbotFaq: [],
    users: [],
    orders: [],
    buildersConfig: getDefaultBuildersConfig(),
    storeSettings: getDefaultStoreSettings()
  };
}

export function saveDb(db: DatabaseSchema) {
  cachedDb = db;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB_FILE:', err);
  }
}
