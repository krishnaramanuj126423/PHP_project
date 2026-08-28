/* Interactive Builders Logic (Meal, Coffee Brew, Visual Plate) */
import { Cart } from './cart.js';
import { showToast } from './main.js';
import { API } from './api.js';

// --- 1. MEAL BUILDER STATE ---
let customMeal = {
  base: { name: 'Pasta (Bronze Rigatoni)', price: 180, cal: 220, icon: 'fa-wheat-awn' },
  protein: { name: 'Grilled Tuscan Herb Chicken', price: 120, cal: 240, icon: 'fa-drumstick-bite' },
  veggies: [
    { name: 'Chanterelle Mushrooms', price: 45, cal: 30, icon: 'fa-shield-halved' },
    { name: 'Sun-Dried Sicilian Tomatoes', price: 35, cal: 40, icon: 'fa-sun' }
  ],
  sauce: { name: 'Creamy White Truffle Alfredo', price: 55, cal: 180, icon: 'fa-bottle-droplet' },
  extras: [
    { name: 'Aged Parmesan Shavings', price: 35, cal: 60, icon: 'fa-cheese' }
  ],
  spice: 'Mild'
};

// --- 2. COFFEE BREW BUILDER STATE ---
let customBrew = {
  size: { name: 'Standard (12oz Antiquity)', price: 160, scale: 1.0, shots: 2 },
  temp: 'Steaming Hot',
  tempType: 'hot',
  coffee: { name: 'Velvety Latte', price: 0, color: '#5C3826', fillPct: 70, caffeine: 150, foam: 35 },
  roast: { name: 'Ethiopia Yirgacheffe (Floral & Bergamot)' },
  shots: { name: 'Double Shot (Standard)', price: 0, caff: 150 },
  milk: { name: 'Barista Oat Milk', price: 30, color: '#F3E9D5', cal: 90 },
  flavor: { name: 'Madagascar Bourbon Vanilla', price: 25, cal: 60 },
  toppings: [
    { name: 'House Whipped Cream', price: 25, cal: 80, drizzle: '#FFFFFF' },
    { name: 'Artisanal Caramel Drizzle', price: 20, cal: 40, drizzle: '#C59B27' }
  ],
  sweetness: 50
};

// --- 3. VISUAL PLATE BUILDER STATE ---
let customPlate = {
  main: { name: 'Tuscan Grilled Chicken', price: 260, cal: 320, icon: 'fa-drumstick-bite' },
  side: { name: 'Truffle Roasted Potatoes', price: 95, cal: 210, icon: 'fa-bowl-food' },
  salad: { name: 'Wild Arugula & Parmesan', price: 80, cal: 90, icon: 'fa-seedling' },
  sauce: { name: 'Artisanal Pesto Reduction', price: 45, cal: 120, icon: 'fa-bottle-droplet' },
  drink: { name: 'Sparkling Citrus Tonic', price: 85, cal: 45, icon: 'fa-glass-water' },
  dessert: { name: 'Mini Dark Chocolate Tart', price: 95, cal: 180, icon: 'fa-cookie' }
};

export const Builders = {
  config: null,

  async init() {
    await this.loadConfig();
    this.renderMealSummary();
    this.renderBrewPreview();
    this.renderPlateCanvas();
    this.bindMealEvents();
    this.bindBrewEvents();
    this.bindPlateEvents();
  },

  async loadConfig() {
    try {
      const res = await API.getBuildersConfig();
      if (res && res.config) {
        this.config = res.config;
        this.renderAllOptionPills();
        this.syncInitialStateWithConfig();
      }
    } catch (e) {
      console.warn('Could not load dynamic builder config, using defaults:', e);
    }
  },

  syncInitialStateWithConfig() {
    if (!this.config) return;

    // Sync Brew
    if (this.config.brew) {
      const matchSize = this.config.brew.sizes?.find(s => s.name === customBrew.size.name);
      if (matchSize) customBrew.size.price = matchSize.price;

      const matchCoffee = this.config.brew.coffees?.find(c => c.name === customBrew.coffee.name);
      if (matchCoffee) customBrew.coffee.price = matchCoffee.price;

      const matchShots = this.config.brew.shots?.find(s => s.name === customBrew.shots.name);
      if (matchShots) customBrew.shots.price = matchShots.price;

      const matchMilk = this.config.brew.milks?.find(m => m.name === customBrew.milk.name);
      if (matchMilk) customBrew.milk.price = matchMilk.price;

      if (customBrew.flavor) {
        const matchFlavor = this.config.brew.flavors?.find(f => f.name === customBrew.flavor.name);
        if (matchFlavor) customBrew.flavor.price = matchFlavor.price;
      }

      customBrew.toppings = customBrew.toppings.map(t => {
        const matchTop = this.config.brew.toppings?.find(top => top.name === t.name);
        return matchTop ? { ...t, price: matchTop.price } : t;
      });
    }

    // Sync Meal
    if (this.config.meal) {
      const matchBase = this.config.meal.bases?.find(b => b.name === customMeal.base.name);
      if (matchBase) customMeal.base.price = matchBase.price;

      const matchProtein = this.config.meal.proteins?.find(p => p.name === customMeal.protein.name);
      if (matchProtein) customMeal.protein.price = matchProtein.price;

      const matchSauce = this.config.meal.sauces?.find(s => s.name === customMeal.sauce.name);
      if (matchSauce) customMeal.sauce.price = matchSauce.price;

      customMeal.veggies = customMeal.veggies.map(v => {
        const matchVeg = this.config.meal.veggies?.find(veg => veg.name === v.name);
        return matchVeg ? { ...v, price: matchVeg.price } : v;
      });

      customMeal.extras = customMeal.extras.map(e => {
        const matchExtra = this.config.meal.extras?.find(ex => ex.name === e.name);
        return matchExtra ? { ...e, price: matchExtra.price } : e;
      });
    }

    // Sync Plate
    if (this.config.plate) {
      const matchMain = this.config.plate.mains?.find(m => m.name === customPlate.main.name);
      if (matchMain) customPlate.main.price = matchMain.price;

      const matchSide = this.config.plate.sides?.find(s => s.name === customPlate.side.name);
      if (matchSide) customPlate.side.price = matchSide.price;

      const matchSalad = this.config.plate.salads?.find(s => s.name === customPlate.salad.name);
      if (matchSalad) customPlate.salad.price = matchSalad.price;

      const matchSauce = this.config.plate.sauces?.find(s => s.name === customPlate.sauce.name);
      if (matchSauce) customPlate.sauce.price = matchSauce.price;

      const matchDrink = this.config.plate.drinks?.find(d => d.name === customPlate.drink.name);
      if (matchDrink) customPlate.drink.price = matchDrink.price;

      const matchDessert = this.config.plate.desserts?.find(d => d.name === customPlate.dessert.name);
      if (matchDessert) customPlate.dessert.price = matchDessert.price;
    }
  },

  renderAllOptionPills() {
    if (!this.config) return;

    // 1. Brew Containers
    if (this.config.brew) {
      const { sizes, coffees, shots, milks, flavors, toppings } = this.config.brew;

      // Sizes
      const sizesEl = document.getElementById('brew-sizes-container');
      if (sizesEl && sizes) {
        sizesEl.innerHTML = sizes.map(s => `
          <button class="builder-option-pill brew-option-size ${customBrew.size.name === s.name ? 'selected' : ''}" data-name="${s.name}" data-price="${s.price}" data-scale="${s.scale || 1.0}" data-shots="${s.shots || 2}">
            <i class="fa-solid fa-mug-saucer text-amber-700"></i> ${s.name.split(' ')[0]} <span class="text-stone-400 font-normal">(₹${s.price.toFixed(2)})</span>
          </button>
        `).join('');
      }

      // Coffees / Espresso Style
      const coffeesEl = document.getElementById('brew-coffees-container');
      if (coffeesEl && coffees) {
        coffeesEl.innerHTML = coffees.map(c => `
          <button class="builder-option-pill brew-option-coffee ${customBrew.coffee.name === c.name ? 'selected' : ''}" data-name="${c.name}" data-price="${c.price}" data-color="${c.color || '#5C3826'}" data-fill="${c.fill || 70}" data-caffeine="${c.caffeine || 150}" data-foam="${c.foam || 30}">
            <i class="fa-solid fa-mug-hot text-amber-700"></i> ${c.name} <span class="text-stone-400 font-normal">(${c.price > 0 ? '+₹' + c.price.toFixed(2) : c.price < 0 ? '-₹' + Math.abs(c.price).toFixed(2) : 'Included'})</span>
          </button>
        `).join('');
      }

      // Shots Intensity
      const shotsEl = document.getElementById('brew-shots-container');
      if (shotsEl && shots) {
        shotsEl.innerHTML = shots.map(s => `
          <button class="builder-option-pill brew-option-shots text-left ${customBrew.shots.name === s.name ? 'selected' : ''}" data-name="${s.name}" data-price="${s.price}" data-caff="${s.caff || 150}">
            <i class="fa-solid fa-bolt text-amber-700"></i> ${s.name.split('(')[0]} <span class="text-stone-400 font-normal">(${s.price > 0 ? '+₹' + s.price.toFixed(2) : 'Included'})</span>
          </button>
        `).join('');
      }

      // Milks
      const milksEl = document.getElementById('brew-milks-container');
      if (milksEl && milks) {
        milksEl.innerHTML = milks.map(m => `
          <button class="builder-option-pill brew-option-milk ${customBrew.milk.name === m.name ? 'selected' : ''}" data-name="${m.name}" data-price="${m.price}" data-color="${m.color || '#FFFFFF'}" data-cal="${m.cal || 0}">
            <i class="fa-solid fa-wheat-awn text-amber-700"></i> ${m.name.split('(')[0]} <span class="text-stone-400 font-normal">(${m.price > 0 ? '+₹' + m.price.toFixed(2) : '₹0.00'} • ${m.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Flavors
      const flavorsEl = document.getElementById('brew-flavors-container');
      if (flavorsEl && flavors) {
        const curFlavorName = customBrew.flavor ? customBrew.flavor.name : 'None (Unflavored)';
        flavorsEl.innerHTML = flavors.map(f => `
          <button class="builder-option-pill brew-option-flavor ${curFlavorName === f.name ? 'selected' : ''}" data-name="${f.name}" data-price="${f.price}" data-cal="${f.cal || 0}">
            <i class="fa-solid fa-wand-magic text-amber-700"></i> ${f.name.split('(')[0]} <span class="text-stone-400 font-normal">(${f.price > 0 ? '+₹' + f.price.toFixed(2) : '₹0.00'} • ${f.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Toppings
      const toppingsEl = document.getElementById('brew-toppings-container');
      if (toppingsEl && toppings) {
        const selectedToppingNames = customBrew.toppings.map(t => t.name);
        toppingsEl.innerHTML = toppings.map(t => `
          <button class="builder-option-pill brew-option-topping ${selectedToppingNames.includes(t.name) ? 'selected' : ''}" data-name="${t.name}" data-price="${t.price}" data-cal="${t.cal || 0}" data-drizzle="${t.drizzle || '#C59B27'}">
            <i class="fa-solid fa-sparkles text-amber-600"></i> ${t.name} <span class="text-stone-400 font-normal">(+₹${t.price.toFixed(2)} • ${t.cal || 0} kcal)</span>
          </button>
        `).join('');
      }
    }

    // 2. Meal Containers
    if (this.config.meal) {
      const { bases, proteins, veggies, sauces, extras } = this.config.meal;

      // Bases
      const basesEl = document.getElementById('meal-bases-container');
      if (basesEl && bases) {
        basesEl.innerHTML = bases.map(b => `
          <button class="builder-option-pill meal-option-base ${customMeal.base.name === b.name ? 'selected' : ''}" data-name="${b.name}" data-price="${b.price}" data-cal="${b.cal || 200}" data-icon="${b.icon || 'fa-wheat-awn'}">
            <i class="fa-solid ${b.icon || 'fa-wheat-awn'} text-amber-700"></i> ${b.name.split('(')[0]} <span class="text-stone-400 font-normal">(₹${b.price.toFixed(2)} • ${b.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Proteins
      const proteinsEl = document.getElementById('meal-proteins-container');
      if (proteinsEl && proteins) {
        proteinsEl.innerHTML = proteins.map(p => `
          <button class="builder-option-pill meal-option-protein ${customMeal.protein.name === p.name ? 'selected' : ''}" data-name="${p.name}" data-price="${p.price}" data-cal="${p.cal || 200}" data-icon="${p.icon || 'fa-drumstick-bite'}">
            <i class="fa-solid ${p.icon || 'fa-drumstick-bite'} text-amber-700"></i> ${p.name.split('(')[0]} <span class="text-stone-400 font-normal">(₹${p.price.toFixed(2)} • ${p.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Veggies
      const veggiesEl = document.getElementById('meal-veggies-container');
      if (veggiesEl && veggies) {
        const selectedVeggieNames = customMeal.veggies.map(v => v.name);
        veggiesEl.innerHTML = veggies.map(v => `
          <button class="builder-option-pill meal-option-veggie ${selectedVeggieNames.includes(v.name) ? 'selected' : ''}" data-name="${v.name}" data-price="${v.price}" data-cal="${v.cal || 30}" data-icon="${v.icon || 'fa-shield-halved'}">
            <i class="fa-solid ${v.icon || 'fa-leaf'} text-emerald-700"></i> ${v.name} <span class="text-stone-400 font-normal">(+₹${v.price.toFixed(2)} • ${v.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Sauces
      const saucesEl = document.getElementById('meal-sauces-container');
      if (saucesEl && sauces) {
        saucesEl.innerHTML = sauces.map(s => `
          <button class="builder-option-pill meal-option-sauce ${customMeal.sauce.name === s.name ? 'selected' : ''}" data-name="${s.name}" data-price="${s.price}" data-cal="${s.cal || 100}" data-icon="${s.icon || 'fa-bottle-droplet'}">
            <i class="fa-solid ${s.icon || 'fa-bottle-droplet'} text-amber-800"></i> ${s.name} <span class="text-stone-400 font-normal">(₹${s.price.toFixed(2)} • ${s.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Extras
      const extrasEl = document.getElementById('meal-extras-container');
      if (extrasEl && extras) {
        const selectedExtraNames = customMeal.extras.map(e => e.name);
        extrasEl.innerHTML = extras.map(e => `
          <button class="builder-option-pill meal-option-extra ${selectedExtraNames.includes(e.name) ? 'selected' : ''}" data-name="${e.name}" data-price="${e.price}" data-cal="${e.cal || 50}" data-icon="${e.icon || 'fa-cheese'}">
            <i class="fa-solid ${e.icon || 'fa-sparkles'} text-purple-700"></i> ${e.name} <span class="text-stone-400 font-normal">(+₹${e.price.toFixed(2)} • ${e.cal || 0} kcal)</span>
          </button>
        `).join('');
      }
    }

    // 3. Plate Containers
    if (this.config.plate) {
      const { mains, sides, salads, sauces, drinks, desserts } = this.config.plate;

      // Mains
      const mainsEl = document.getElementById('plate-mains-container');
      if (mainsEl && mains) {
        mainsEl.innerHTML = mains.map(m => `
          <button class="builder-option-pill plate-option-main ${customPlate.main.name === m.name ? 'selected' : ''}" data-name="${m.name}" data-price="${m.price}" data-cal="${m.cal || 300}" data-icon="${m.icon || 'fa-drumstick-bite'}">
            <i class="fa-solid ${m.icon || 'fa-drumstick-bite'} text-amber-700"></i> ${m.name} <span class="text-stone-400 font-normal">(₹${m.price.toFixed(2)} • ${m.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Sides
      const sidesEl = document.getElementById('plate-sides-container');
      if (sidesEl && sides) {
        sidesEl.innerHTML = sides.map(s => `
          <button class="builder-option-pill plate-option-side ${customPlate.side.name === s.name ? 'selected' : ''}" data-name="${s.name}" data-price="${s.price}" data-cal="${s.cal || 200}" data-icon="${s.icon || 'fa-bowl-food'}">
            <i class="fa-solid ${s.icon || 'fa-bowl-food'} text-amber-700"></i> ${s.name} <span class="text-stone-400 font-normal">(₹${s.price.toFixed(2)} • ${s.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Salads
      const saladsEl = document.getElementById('plate-salads-container');
      if (saladsEl && salads) {
        saladsEl.innerHTML = salads.map(s => `
          <button class="builder-option-pill plate-option-salad ${customPlate.salad.name === s.name ? 'selected' : ''}" data-name="${s.name}" data-price="${s.price}" data-cal="${s.cal || 90}" data-icon="${s.icon || 'fa-seedling'}">
            <i class="fa-solid ${s.icon || 'fa-seedling'} text-emerald-700"></i> ${s.name} <span class="text-stone-400 font-normal">(₹${s.price.toFixed(2)} • ${s.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Sauces
      const saucesEl = document.getElementById('plate-sauces-container');
      if (saucesEl && sauces) {
        saucesEl.innerHTML = sauces.map(s => `
          <button class="builder-option-pill plate-option-sauce ${customPlate.sauce.name === s.name ? 'selected' : ''}" data-name="${s.name}" data-price="${s.price}" data-cal="${s.cal || 100}" data-icon="${s.icon || 'fa-bottle-droplet'}">
            <i class="fa-solid ${s.icon || 'fa-bottle-droplet'} text-amber-800"></i> ${s.name} <span class="text-stone-400 font-normal">(₹${s.price.toFixed(2)} • ${s.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Drinks
      const drinksEl = document.getElementById('plate-drinks-container');
      if (drinksEl && drinks) {
        drinksEl.innerHTML = drinks.map(d => `
          <button class="builder-option-pill plate-option-drink ${customPlate.drink.name === d.name ? 'selected' : ''}" data-name="${d.name}" data-price="${d.price}" data-cal="${d.cal || 50}" data-icon="${d.icon || 'fa-glass-water'}">
            <i class="fa-solid ${d.icon || 'fa-glass-water'} text-amber-400"></i> ${d.name} <span class="text-stone-400 font-normal">(₹${d.price.toFixed(2)} • ${d.cal || 0} kcal)</span>
          </button>
        `).join('');
      }

      // Desserts
      const dessertsEl = document.getElementById('plate-desserts-container');
      if (dessertsEl && desserts) {
        dessertsEl.innerHTML = desserts.map(d => `
          <button class="builder-option-pill plate-option-dessert ${customPlate.dessert.name === d.name ? 'selected' : ''}" data-name="${d.name}" data-price="${d.price}" data-cal="${d.cal || 150}" data-icon="${d.icon || 'fa-cookie'}">
            <i class="fa-solid ${d.icon || 'fa-cookie'} text-white"></i> ${d.name} <span class="text-stone-400 font-normal">(₹${d.price.toFixed(2)} • ${d.cal || 0} kcal)</span>
          </button>
        `).join('');
      }
    }
  },

  // Helper to find dynamic price from config
  lookupOption(categoryType, groupName, itemName, defaultObj) {
    if (this.config && this.config[categoryType] && this.config[categoryType][groupName]) {
      const found = this.config[categoryType][groupName].find(item => item.name === itemName || item.name.includes(itemName) || itemName.includes(item.name));
      if (found) {
        return {
          name: found.name,
          price: found.price,
          cal: found.cal !== undefined ? found.cal : defaultObj.cal,
          icon: found.icon || defaultObj.icon,
          color: found.color || defaultObj.color,
          scale: found.scale || defaultObj.scale,
          shots: found.shots || defaultObj.shots,
          caff: found.caff || defaultObj.caff,
          drizzle: found.drizzle || defaultObj.drizzle
        };
      }
    }
    return defaultObj;
  },

  // --- MEAL BUILDER METHODS ---
  renderMealSummary() {
    const totalPrice = customMeal.base.price + customMeal.protein.price +
      customMeal.veggies.reduce((s, v) => s + v.price, 0) +
      customMeal.sauce.price +
      customMeal.extras.reduce((s, e) => s + e.price, 0);

    const totalCal = (customMeal.base.cal || 0) + (customMeal.protein.cal || 0) +
      customMeal.veggies.reduce((s, v) => s + (v.cal || 0), 0) +
      (customMeal.sauce.cal || 0) +
      customMeal.extras.reduce((s, e) => s + (e.cal || 0), 0);

    const totalItems = 2 + customMeal.veggies.length + 1 + customMeal.extras.length;

    // 1. Update Live Bowl Visualizer Elements
    const slotBase = document.getElementById('meal-slot-base');
    const slotProtein = document.getElementById('meal-slot-protein');
    const slotSauce = document.getElementById('meal-slot-sauce');
    const slotVeggies = document.getElementById('meal-slot-veggies');
    const slotExtras = document.getElementById('meal-slot-extras');

    if (slotBase) {
      slotBase.innerHTML = `<i class="fa-solid ${customMeal.base.icon || 'fa-wheat-awn'} text-amber-800"></i> ${customMeal.base.name}`;
    }
    if (slotProtein) {
      slotProtein.innerHTML = `<i class="fa-solid ${customMeal.protein.icon || 'fa-drumstick-bite'} text-red-800"></i> ${customMeal.protein.name}`;
    }
    if (slotSauce) {
      slotSauce.innerHTML = `<i class="fa-solid ${customMeal.sauce.icon || 'fa-bottle-droplet'} text-amber-900"></i> ${customMeal.sauce.name}`;
    }
    if (slotVeggies) {
      if (customMeal.veggies.length > 0) {
        slotVeggies.innerHTML = customMeal.veggies.map(v => `
          <span class="meal-layer-badge meal-badge-veggie">
            <i class="fa-solid ${v.icon || 'fa-leaf'} text-emerald-800"></i> ${v.name}
          </span>
        `).join('');
      } else {
        slotVeggies.innerHTML = `<span class="text-[10px] text-stone-400 italic">No vegetables added</span>`;
      }
    }
    if (slotExtras) {
      if (customMeal.extras.length > 0) {
        slotExtras.innerHTML = customMeal.extras.map(e => `
          <span class="meal-layer-badge meal-badge-extra">
            <i class="fa-solid ${e.icon || 'fa-sparkles'} text-purple-800"></i> ${e.name}
          </span>
        `).join('');
      } else {
        slotExtras.innerHTML = '';
      }
    }

    // 2. Update Section Selection Badges
    const badgeBase = document.getElementById('meal-badge-base');
    const badgeProtein = document.getElementById('meal-badge-protein');
    const badgeVeggies = document.getElementById('meal-badge-veggies');
    const badgeSauce = document.getElementById('meal-badge-sauce');
    const badgeExtras = document.getElementById('meal-badge-extras');

    if (badgeBase) badgeBase.textContent = `${customMeal.base.name} (₹${customMeal.base.price.toFixed(2)})`;
    if (badgeProtein) badgeProtein.textContent = `${customMeal.protein.name} (₹${customMeal.protein.price.toFixed(2)})`;
    if (badgeVeggies) badgeVeggies.textContent = `${customMeal.veggies.length} Selected (+₹${customMeal.veggies.reduce((s, v) => s + v.price, 0).toFixed(2)})`;
    if (badgeSauce) badgeSauce.textContent = `${customMeal.sauce.name} (₹${customMeal.sauce.price.toFixed(2)})`;
    if (badgeExtras) badgeExtras.textContent = `${customMeal.extras.length} Selected (+₹${customMeal.extras.reduce((s, e) => s + e.price, 0).toFixed(2)})`;

    // 3. Render Itemized Summary Box
    const summaryEl = document.getElementById('meal-summary-box');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
          <h4 class="font-serif text-lg font-bold text-stone-900">Chef's Custom Bowl Recipe</h4>
          <span class="text-[11px] bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded-full border border-amber-200">
            ${totalItems} Components • ${customMeal.spice}
          </span>
        </div>

        <ul class="text-xs space-y-1.5 text-stone-600 mb-4 divide-y divide-stone-50">
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">1. Base:</span>
            <span class="text-stone-700">${customMeal.base.name}</span>
            <span class="font-mono text-stone-900">₹${customMeal.base.price.toFixed(2)}</span>
          </li>
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">2. Protein:</span>
            <span class="text-stone-700">${customMeal.protein.name}</span>
            <span class="font-mono text-stone-900">₹${customMeal.protein.price.toFixed(2)}</span>
          </li>
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">3. Veggies:</span>
            <span class="text-stone-700 truncate max-w-[180px]">${customMeal.veggies.map(v => v.name).join(', ') || 'None'}</span>
            <span class="font-mono text-stone-900">+₹${customMeal.veggies.reduce((s, v) => s + v.price, 0).toFixed(2)}</span>
          </li>
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">4. Sauce:</span>
            <span class="text-stone-700">${customMeal.sauce.name}</span>
            <span class="font-mono text-stone-900">₹${customMeal.sauce.price.toFixed(2)}</span>
          </li>
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">5. Garnishes:</span>
            <span class="text-stone-700 truncate max-w-[180px]">${customMeal.extras.map(e => e.name).join(', ') || 'None'}</span>
            <span class="font-mono text-stone-900">+₹${customMeal.extras.reduce((s, e) => s + e.price, 0).toFixed(2)}</span>
          </li>
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">Heat Level:</span>
            <span class="text-stone-700">${customMeal.spice} Heat</span>
            <span class="text-[10px] text-stone-400 font-mono">Included</span>
          </li>
        </ul>

        <div class="pt-3 border-t border-stone-200 flex justify-between items-center mb-4">
          <div>
            <p class="text-[11px] text-stone-500 font-medium">Estimated Nutritional Energy</p>
            <p class="font-bold text-stone-900 flex items-center gap-1.5">
              <i class="fa-solid fa-fire text-amber-700 text-xs"></i> ${totalCal} Calories
            </p>
          </div>
          <div class="text-right">
            <p class="text-[11px] text-stone-500 font-medium">Custom Bowl Total</p>
            <p class="font-serif text-2xl font-bold text-stone-900">₹${totalPrice.toFixed(2)}</p>
          </div>
        </div>

        <button class="btn-rosa text-xs w-full py-3 shadow-md" onclick="Builders.addMealToCart()">
          <i class="fa-solid fa-cart-plus mr-1"></i> Add Custom Meal to Cart
        </button>
      `;
    }
  },

  addMealToCart() {
    const totalPrice = customMeal.base.price + customMeal.protein.price +
      customMeal.veggies.reduce((s, v) => s + v.price, 0) +
      customMeal.sauce.price +
      customMeal.extras.reduce((s, e) => s + e.price, 0);

    const veggieStr = customMeal.veggies.length > 0 ? ` with ${customMeal.veggies.map(v => v.name).join(' & ')}` : '';
    const extraStr = customMeal.extras.length > 0 ? ` topped with ${customMeal.extras.map(e => e.name).join(', ')}` : '';
    const details = `${customMeal.base.name} & ${customMeal.protein.name}${veggieStr} in ${customMeal.sauce.name}${extraStr} (${customMeal.spice} Heat)`;

    Cart.addItem({
      id: 'custom_meal_' + Date.now(),
      name: `Custom ${customMeal.protein.name} Bowl`,
      price: totalPrice,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
    }, 1, details);

    showToast(`Added Custom Bowl (₹${totalPrice.toFixed(2)}) to Cart!`);
  },

  loadMealPreset(type) {
    const presets = {
      'truffle-chicken': {
        base: this.lookupOption('meal', 'bases', 'Pasta (Bronze Rigatoni)', { name: 'Pasta (Bronze Rigatoni)', price: 180, cal: 220, icon: 'fa-wheat-awn' }),
        protein: this.lookupOption('meal', 'proteins', 'Grilled Tuscan Herb Chicken', { name: 'Grilled Tuscan Herb Chicken', price: 120, cal: 240, icon: 'fa-drumstick-bite' }),
        veggies: [
          this.lookupOption('meal', 'veggies', 'Chanterelle Mushrooms', { name: 'Chanterelle Mushrooms', price: 45, cal: 30, icon: 'fa-shield-halved' }),
          this.lookupOption('meal', 'veggies', 'Sun-Dried Sicilian Tomatoes', { name: 'Sun-Dried Sicilian Tomatoes', price: 35, cal: 40, icon: 'fa-sun' })
        ],
        sauce: this.lookupOption('meal', 'sauces', 'Creamy White Truffle Alfredo', { name: 'Creamy White Truffle Alfredo', price: 55, cal: 180, icon: 'fa-bottle-droplet' }),
        extras: [
          this.lookupOption('meal', 'extras', 'Aged Parmesan Shavings', { name: 'Aged Parmesan Shavings', price: 35, cal: 60, icon: 'fa-cheese' }),
          this.lookupOption('meal', 'extras', 'White Truffle Oil Drizzle', { name: 'White Truffle Oil Drizzle', price: 50, cal: 50, icon: 'fa-droplet' })
        ],
        spice: 'Mild'
      },
      'salmon-quinoa': {
        base: this.lookupOption('meal', 'bases', 'Mediterranean Herb Quinoa', { name: 'Mediterranean Herb Quinoa', price: 170, cal: 170, icon: 'fa-seedling' }),
        protein: this.lookupOption('meal', 'proteins', 'Pan-Seared Atlantic Salmon', { name: 'Pan-Seared Atlantic Salmon', price: 180, cal: 280, icon: 'fa-fish' }),
        veggies: [
          this.lookupOption('meal', 'veggies', 'Charred Garlic Broccolini', { name: 'Charred Garlic Broccolini', price: 45, cal: 45, icon: 'fa-seedling' }),
          this.lookupOption('meal', 'veggies', 'Sun-Dried Sicilian Tomatoes', { name: 'Sun-Dried Sicilian Tomatoes', price: 35, cal: 40, icon: 'fa-sun' })
        ],
        sauce: this.lookupOption('meal', 'sauces', 'Lemon Herb Garlic Reduction', { name: 'Lemon Herb Garlic Reduction', price: 40, cal: 110, icon: 'fa-lemon' }),
        extras: [
          this.lookupOption('meal', 'extras', 'Toasted Pine Nuts', { name: 'Toasted Pine Nuts', price: 40, cal: 70, icon: 'fa-cubes-stacked' }),
          this.lookupOption('meal', 'extras', 'Fresh Micro-Basil', { name: 'Fresh Micro-Basil', price: 20, cal: 5, icon: 'fa-leaf' })
        ],
        spice: 'Mild'
      },
      'shortrib-risotto': {
        base: this.lookupOption('meal', 'bases', 'Saffron Carnaroli Risotto', { name: 'Saffron Carnaroli Risotto', price: 210, cal: 240, icon: 'fa-spoon' }),
        protein: this.lookupOption('meal', 'proteins', 'Slow-Braised Prime Short Rib', { name: 'Slow-Braised Prime Short Rib', price: 220, cal: 320, icon: 'fa-bacon' }),
        veggies: [
          this.lookupOption('meal', 'veggies', 'Chanterelle Mushrooms', { name: 'Chanterelle Mushrooms', price: 45, cal: 30, icon: 'fa-shield-halved' }),
          this.lookupOption('meal', 'veggies', 'Caramelized Cipollini Onions', { name: 'Caramelized Cipollini Onions', price: 35, cal: 50, icon: 'fa-circle' })
        ],
        sauce: this.lookupOption('meal', 'sauces', 'San Marzano Tomato Basil', { name: 'San Marzano Tomato Basil', price: 40, cal: 90, icon: 'fa-apple-whole' }),
        extras: [
          this.lookupOption('meal', 'extras', 'Aged Parmesan Shavings', { name: 'Aged Parmesan Shavings', price: 35, cal: 60, icon: 'fa-cheese' }),
          this.lookupOption('meal', 'extras', 'Crispy Fried Shallots', { name: 'Crispy Fried Shallots', price: 25, cal: 45, icon: 'fa-sparkles' })
        ],
        spice: 'Medium'
      },
      'vegan-bowl': {
        base: this.lookupOption('meal', 'bases', 'Fresh Wild Greens Bowl', { name: 'Fresh Wild Greens Bowl', price: 150, cal: 90, icon: 'fa-leaf' }),
        protein: this.lookupOption('meal', 'proteins', 'Crispy Organic Tofu Cubes', { name: 'Crispy Organic Tofu Cubes', price: 90, cal: 180, icon: 'fa-cubes' }),
        veggies: [
          this.lookupOption('meal', 'veggies', 'Fire-Roasted Bell Peppers', { name: 'Fire-Roasted Bell Peppers', price: 35, cal: 35, icon: 'fa-pepper-hot' }),
          this.lookupOption('meal', 'veggies', 'Charred Garlic Broccolini', { name: 'Charred Garlic Broccolini', price: 45, cal: 45, icon: 'fa-seedling' }),
          this.lookupOption('meal', 'veggies', 'Sun-Dried Sicilian Tomatoes', { name: 'Sun-Dried Sicilian Tomatoes', price: 35, cal: 40, icon: 'fa-sun' })
        ],
        sauce: this.lookupOption('meal', 'sauces', 'Artisanal Basil Pesto', { name: 'Artisanal Basil Pesto', price: 50, cal: 160, icon: 'fa-mortar-pestle' }),
        extras: [
          this.lookupOption('meal', 'extras', 'Toasted Pine Nuts', { name: 'Toasted Pine Nuts', price: 40, cal: 70, icon: 'fa-cubes-stacked' }),
          this.lookupOption('meal', 'extras', 'Fresh Micro-Basil', { name: 'Fresh Micro-Basil', price: 20, cal: 5, icon: 'fa-leaf' })
        ],
        spice: 'Medium'
      }
    };

    if (presets[type]) {
      customMeal = JSON.parse(JSON.stringify(presets[type]));

      // Synchronize single-select pills
      this.syncMealPillSingle('.meal-option-base', customMeal.base.name);
      this.syncMealPillSingle('.meal-option-protein', customMeal.protein.name);
      this.syncMealPillSingle('.meal-option-sauce', customMeal.sauce.name);
      this.syncMealPillSingle('.meal-option-spice', customMeal.spice);

      // Synchronize multi-select pills
      const veggieNames = customMeal.veggies.map(v => v.name);
      document.querySelectorAll('.meal-option-veggie').forEach(btn => {
        if (veggieNames.includes(btn.dataset.name)) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });

      const extraNames = customMeal.extras.map(e => e.name);
      document.querySelectorAll('.meal-option-extra').forEach(btn => {
        if (extraNames.includes(btn.dataset.name)) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });

      this.renderMealSummary();
      showToast(`Loaded ${type.replace('-', ' ').toUpperCase()} signature meal preset!`);
    }
  },

  syncMealPillSingle(selector, activeName) {
    document.querySelectorAll(selector).forEach(btn => {
      if (btn.dataset.name === activeName) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  },

  bindMealEvents() {
    // 1. Base selection
    document.querySelectorAll('.meal-option-base').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.meal-option-base').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customMeal.base = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          cal: parseInt(btn.dataset.cal) || 200,
          icon: btn.dataset.icon || 'fa-wheat-awn'
        };
        this.renderMealSummary();
      });
    });

    // 2. Protein selection
    document.querySelectorAll('.meal-option-protein').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.meal-option-protein').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customMeal.protein = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          cal: parseInt(btn.dataset.cal) || 200,
          icon: btn.dataset.icon || 'fa-drumstick-bite'
        };
        this.renderMealSummary();
      });
    });

    // 3. Sautéed Veggies selection (Multi-Select toggle)
    document.querySelectorAll('.meal-option-veggie').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const cal = parseInt(btn.dataset.cal) || 30;
        const icon = btn.dataset.icon || 'fa-leaf';

        const existingIdx = customMeal.veggies.findIndex(v => v.name === name);
        if (existingIdx >= 0) {
          customMeal.veggies.splice(existingIdx, 1);
          btn.classList.remove('selected');
        } else {
          customMeal.veggies.push({ name, price, cal, icon });
          btn.classList.add('selected');
        }
        this.renderMealSummary();
      });
    });

    // 4. Sauce selection
    document.querySelectorAll('.meal-option-sauce').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.meal-option-sauce').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customMeal.sauce = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          cal: parseInt(btn.dataset.cal) || 100,
          icon: btn.dataset.icon || 'fa-bottle-droplet'
        };
        this.renderMealSummary();
      });
    });

    // 5. Finishing Garnishes & Crunch (Multi-Select toggle)
    document.querySelectorAll('.meal-option-extra').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const cal = parseInt(btn.dataset.cal) || 50;
        const icon = btn.dataset.icon || 'fa-cheese';

        const existingIdx = customMeal.extras.findIndex(e => e.name === name);
        if (existingIdx >= 0) {
          customMeal.extras.splice(existingIdx, 1);
          btn.classList.remove('selected');
        } else {
          customMeal.extras.push({ name, price, cal, icon });
          btn.classList.add('selected');
        }
        this.renderMealSummary();
      });
    });

    // 6. Spice heat level
    document.querySelectorAll('.meal-option-spice').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.meal-option-spice').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customMeal.spice = btn.dataset.name;
        this.renderMealSummary();
      });
    });
  },

  // --- BREW BUILDER METHODS ---
  renderBrewPreview() {
    const fillEl = document.getElementById('brew-liquid-fill');
    const foamEl = document.getElementById('brew-milk-foam');
    const drizzleEl = document.getElementById('brew-topping-drizzle');
    const dustEl = document.getElementById('brew-topping-dust');
    const whippedCreamEl = document.getElementById('brew-whipped-cream');
    const latteArtEl = document.getElementById('brew-latte-art');
    const iceLayerEl = document.getElementById('brew-ice-layer');
    const steamEl = document.getElementById('brew-steam-effect');
    const strawEl = document.getElementById('brew-straw');
    const cupAssembly = document.getElementById('brew-cup-assembly');
    const cupContainer = document.getElementById('brew-cup-container');
    const cupHandle = document.getElementById('brew-cup-handle');
    const summaryBoxEl = document.getElementById('brew-summary-box');

    const isIced = customBrew.tempType === 'iced' || customBrew.temp.includes('Ice') || customBrew.temp.includes('Nitro');
    const hasWhippedCream = customBrew.toppings.some(t => t.name.includes('Whipped Cream'));
    const drizzleTopping = customBrew.toppings.find(t => t.drizzle && !t.name.includes('Dust') && !t.name.includes('Whipped') && !t.name.includes('Gold'));
    const dustTopping = customBrew.toppings.find(t => t.name.includes('Dust') || t.name.includes('Gold') || t.name.includes('Cocoa') || t.name.includes('Cinnamon'));

    // 1. Update Live Cup Visualizer
    if (cupAssembly && customBrew.size.scale) {
      cupAssembly.style.transform = `scale(${customBrew.size.scale})`;
    }

    if (cupContainer) {
      if (isIced) {
        cupContainer.classList.add('is-iced');
      } else {
        cupContainer.classList.remove('is-iced');
      }
    }

    if (fillEl) {
      fillEl.style.height = `${customBrew.coffee.fillPct || 70}%`;
      fillEl.style.backgroundColor = customBrew.coffee.color || '#5C3826';
    }

    if (foamEl) {
      if (customBrew.milk.name.includes('None')) {
        foamEl.style.height = '0px';
        foamEl.style.opacity = '0';
      } else {
        foamEl.style.height = `${customBrew.coffee.foam || 32}px`;
        foamEl.style.opacity = '1';
        foamEl.style.backgroundColor = customBrew.milk.color || '#FFF8E7';
      }
    }

    // Whipped cream topping
    if (whippedCreamEl) {
      if (hasWhippedCream) {
        whippedCreamEl.style.opacity = '1';
        whippedCreamEl.style.transform = 'translateX(-50%) translateY(0)';
      } else {
        whippedCreamEl.style.opacity = '0';
        whippedCreamEl.style.transform = 'translateX(-50%) translateY(8px)';
      }
    }

    // Latte art display
    if (latteArtEl) {
      if (!customBrew.milk.name.includes('None') && !hasWhippedCream) {
        latteArtEl.style.opacity = '0.7';
      } else {
        latteArtEl.style.opacity = '0';
      }
    }

    // Drizzle topping
    if (drizzleEl) {
      if (drizzleTopping) {
        drizzleEl.style.opacity = '1';
        drizzleEl.style.backgroundColor = drizzleTopping.drizzle || '#C59B27';
      } else {
        drizzleEl.style.opacity = '0';
      }
    }

    // Dusting topping
    if (dustEl) {
      if (dustTopping) {
        dustEl.style.opacity = '1';
        if (dustTopping.name.includes('Gold')) {
          dustEl.style.background = 'radial-gradient(circle, rgba(255, 215, 0, 0.7) 10%, transparent 60%)';
        } else if (dustTopping.name.includes('Cocoa')) {
          dustEl.style.background = 'radial-gradient(circle, rgba(60, 30, 15, 0.6) 20%, transparent 70%)';
        } else {
          dustEl.style.background = 'radial-gradient(circle, rgba(140, 75, 30, 0.6) 20%, transparent 70%)';
        }
      } else {
        dustEl.style.opacity = '0';
      }
    }

    if (iceLayerEl) {
      iceLayerEl.style.opacity = isIced ? '1' : '0';
    }

    if (steamEl) {
      steamEl.style.opacity = isIced ? '0' : '1';
    }

    if (strawEl) {
      strawEl.style.opacity = isIced ? '1' : '0';
      strawEl.style.transform = isIced ? 'rotate(18deg) translateY(0)' : 'rotate(18deg) translateY(-20px)';
    }

    if (cupHandle) {
      cupHandle.style.opacity = isIced ? '0' : '1';
      cupHandle.style.pointerEvents = isIced ? 'none' : 'auto';
    }

    // 2. Update Section Selection Badges
    const badgeSize = document.getElementById('brew-badge-size');
    const badgeCoffee = document.getElementById('brew-badge-coffee');
    const badgeMilk = document.getElementById('brew-badge-milk');
    const badgeFlavor = document.getElementById('brew-badge-flavor');
    const badgeToppings = document.getElementById('brew-badge-toppings');

    if (badgeSize) badgeSize.textContent = `${customBrew.size.name} • ${customBrew.temp}`;
    if (badgeCoffee) badgeCoffee.textContent = `${customBrew.coffee.name} (${customBrew.shots.name})`;
    if (badgeMilk) badgeMilk.textContent = `${customBrew.milk.name} (+₹${customBrew.milk.price.toFixed(2)})`;
    if (badgeFlavor) badgeFlavor.textContent = customBrew.flavor ? `${customBrew.flavor.name} (+₹${customBrew.flavor.price.toFixed(2)})` : 'None';
    if (badgeToppings) badgeToppings.textContent = `${customBrew.toppings.length} Selected (+₹${customBrew.toppings.reduce((s, t) => s + t.price, 0).toFixed(2)})`;

    // 3. Price, Calorie & Caffeine Totals
    const basePrice = customBrew.size.price + customBrew.coffee.price + customBrew.shots.price;
    const milkPrice = customBrew.milk.price;
    const flavorPrice = customBrew.flavor ? customBrew.flavor.price : 0;
    const toppingsPrice = customBrew.toppings.reduce((s, t) => s + t.price, 0);
    const totalPrice = basePrice + milkPrice + flavorPrice + toppingsPrice;

    const totalCal = (customBrew.coffee.cal || 10) + (customBrew.milk.cal || 0) +
      (customBrew.flavor ? customBrew.flavor.cal : 0) +
      customBrew.toppings.reduce((s, t) => s + (t.cal || 0), 0);

    const totalCaff = (customBrew.shots.caff || 150);

    // 4. Render Itemized Summary Box
    if (summaryBoxEl) {
      summaryBoxEl.innerHTML = `
        <div class="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
          <h4 class="font-serif text-lg font-bold text-stone-900">Barista's Custom Craft Recipe</h4>
          <span class="text-[11px] bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded-full border border-amber-200">
            ${customBrew.size.name.split(' ')[0]} • ${customBrew.temp}
          </span>
        </div>

        <ul class="text-xs space-y-1.5 text-stone-600 mb-4 divide-y divide-stone-50">
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">1. Size & Base:</span>
            <span class="text-stone-700">${customBrew.size.name} • ${customBrew.coffee.name}</span>
            <span class="font-mono text-stone-900">₹${(customBrew.size.price + customBrew.coffee.price).toFixed(2)}</span>
          </li>
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">2. Roast & Intensity:</span>
            <span class="text-stone-700 truncate max-w-[170px]">${customBrew.roast.name.split('(')[0]} (${customBrew.shots.name})</span>
            <span class="font-mono text-stone-900">${customBrew.shots.price > 0 ? '+₹' + customBrew.shots.price.toFixed(2) : 'Included'}</span>
          </li>
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">3. Dairy / Plant Milk:</span>
            <span class="text-stone-700">${customBrew.milk.name}</span>
            <span class="font-mono text-stone-900">${customBrew.milk.price > 0 ? '+₹' + customBrew.milk.price.toFixed(2) : '₹0.00'}</span>
          </li>
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">4. Craft Syrup:</span>
            <span class="text-stone-700">${customBrew.flavor ? customBrew.flavor.name : 'Pure (No Syrup)'}</span>
            <span class="font-mono text-stone-900">${customBrew.flavor && customBrew.flavor.price > 0 ? '+₹' + customBrew.flavor.price.toFixed(2) : '₹0.00'}</span>
          </li>
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">5. Finishing Garnishes:</span>
            <span class="text-stone-700 truncate max-w-[170px]">${customBrew.toppings.map(t => t.name).join(', ') || 'None'}</span>
            <span class="font-mono text-stone-900">${toppingsPrice > 0 ? '+₹' + toppingsPrice.toFixed(2) : '₹0.00'}</span>
          </li>
          <li class="flex justify-between items-center pt-1">
            <span class="font-semibold text-stone-800">6. Sweetness:</span>
            <span class="text-stone-700">${customBrew.sweetness}% Sweetness</span>
            <span class="text-[10px] text-stone-400 font-mono">Included</span>
          </li>
        </ul>

        <div class="pt-3 border-t border-stone-200 grid grid-cols-2 gap-2 mb-4 bg-stone-50 p-2.5 rounded-xl">
          <div>
            <p class="text-[10px] text-stone-500 font-medium">Estimated Energy</p>
            <p class="font-bold text-stone-900 flex items-center gap-1 text-xs">
              <i class="fa-solid fa-fire text-amber-700"></i> ${totalCal} Calories
            </p>
          </div>
          <div>
            <p class="text-[10px] text-stone-500 font-medium">Caffeine Intensity</p>
            <p class="font-bold text-stone-900 flex items-center gap-1 text-xs">
              <i class="fa-solid fa-bolt text-amber-600"></i> ~${totalCaff} mg Caffeine
            </p>
          </div>
        </div>

        <div class="flex justify-between items-center mb-4">
          <p class="text-xs text-stone-500 font-medium">Custom Brew Total</p>
          <p class="font-serif text-2xl font-bold text-stone-900">₹${totalPrice.toFixed(2)}</p>
        </div>

        <button class="btn-rosa text-xs w-full py-3 shadow-md" onclick="Builders.addBrewToCart()">
          <i class="fa-solid fa-mug-hot mr-1.5"></i> Add Custom Brew to Cart
        </button>
      `;
    }
  },

  addBrewToCart() {
    const basePrice = customBrew.size.price + customBrew.coffee.price + customBrew.shots.price;
    const milkPrice = customBrew.milk.price;
    const flavorPrice = customBrew.flavor ? customBrew.flavor.price : 0;
    const toppingsPrice = customBrew.toppings.reduce((s, t) => s + t.price, 0);
    const totalPrice = basePrice + milkPrice + flavorPrice + toppingsPrice;

    const toppingStr = customBrew.toppings.length > 0 ? ` + ${customBrew.toppings.map(t => t.name).join(', ')}` : '';
    const flavorStr = customBrew.flavor && !customBrew.flavor.name.includes('None') ? ` w/ ${customBrew.flavor.name}` : '';
    const details = `${customBrew.temp} • ${customBrew.size.name} • ${customBrew.roast.name.split('(')[0]} ${customBrew.coffee.name} w/ ${customBrew.milk.name}${flavorStr}${toppingStr} (${customBrew.sweetness}% Sweet)`;

    Cart.addItem({
      id: 'custom_brew_' + Date.now(),
      name: `Custom ${customBrew.coffee.name}`,
      price: totalPrice,
      image: customBrew.tempType === 'iced'
        ? 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80'
    }, 1, details);

    showToast(`Added Custom Brew (₹${totalPrice.toFixed(2)}) to Cart!`);
  },

  loadBrewPreset(type) {
    const presets = {
      'madagascar-latte': {
        size: this.lookupOption('brew', 'sizes', 'Standard (12oz Antiquity)', { name: 'Standard (12oz Antiquity)', price: 160, scale: 1.0, shots: 2 }),
        temp: 'Steaming Hot',
        tempType: 'hot',
        coffee: this.lookupOption('brew', 'coffees', 'Velvety Latte', { name: 'Velvety Latte', price: 0, color: '#5C3826', fillPct: 70, caffeine: 150, foam: 35 }),
        roast: { name: 'Ethiopia Yirgacheffe (Floral & Bergamot)' },
        shots: this.lookupOption('brew', 'shots', 'Double Shot (Standard)', { name: 'Double Shot (Standard)', price: 0, caff: 150 }),
        milk: this.lookupOption('brew', 'milks', 'Barista Oat Milk', { name: 'Barista Oat Milk', price: 30, color: '#F3E9D5', cal: 90 }),
        flavor: this.lookupOption('brew', 'flavors', 'Madagascar Bourbon Vanilla', { name: 'Madagascar Bourbon Vanilla', price: 25, cal: 60 }),
        toppings: [
          this.lookupOption('brew', 'toppings', 'House Whipped Cream', { name: 'House Whipped Cream', price: 25, cal: 80, drizzle: '#FFFFFF' }),
          this.lookupOption('brew', 'toppings', 'Ceylon Cinnamon Dust', { name: 'Ceylon Cinnamon Dust', price: 15, cal: 5, drizzle: '#8B5A2B' })
        ],
        sweetness: 50
      },
      'caramel-coldbrew': {
        size: this.lookupOption('brew', 'sizes', 'Grand (16oz Artisanal)', { name: 'Grand (16oz Artisanal)', price: 200, scale: 1.15, shots: 3 }),
        temp: 'Over Hand-Carved Ice',
        tempType: 'iced',
        coffee: this.lookupOption('brew', 'coffees', 'Cold Brew Infusion', { name: 'Cold Brew Infusion', price: 30, color: '#1B0F09', fillPct: 85, caffeine: 200, foam: 0 }),
        roast: { name: 'Colombia Supremo (Toasted Almond & Caramel)' },
        shots: this.lookupOption('brew', 'shots', 'Double Shot (Standard)', { name: 'Double Shot (Standard)', price: 0, caff: 200 }),
        milk: this.lookupOption('brew', 'milks', 'Sweet Vanilla Cold Foam', { name: 'Sweet Vanilla Cold Foam', price: 35, color: '#FFF5DE', cal: 110 }),
        flavor: this.lookupOption('brew', 'flavors', 'House Salted Caramel', { name: 'House Salted Caramel', price: 25, cal: 70 }),
        toppings: [
          this.lookupOption('brew', 'toppings', 'Artisanal Caramel Drizzle', { name: 'Artisanal Caramel Drizzle', price: 20, cal: 40, drizzle: '#C59B27' })
        ],
        sweetness: 75
      },
      'truffle-mocha': {
        size: this.lookupOption('brew', 'sizes', 'Standard (12oz Antiquity)', { name: 'Standard (12oz Antiquity)', price: 160, scale: 1.0, shots: 2 }),
        temp: 'Steaming Hot',
        tempType: 'hot',
        coffee: this.lookupOption('brew', 'coffees', 'Microfoam Cappuccino', { name: 'Microfoam Cappuccino', price: 20, color: '#4A2E1B', fillPct: 60, caffeine: 150, foam: 45 }),
        roast: { name: 'Italian Velvet Dark Roast (Cacao & Walnut)' },
        shots: this.lookupOption('brew', 'shots', 'Triple Shot (+1 Extra)', { name: 'Triple Shot (+1 Extra)', price: 35, caff: 225 }),
        milk: this.lookupOption('brew', 'milks', 'Organic Whole Dairy Milk', { name: 'Organic Whole Dairy Milk', price: 0, color: '#FFFFFF', cal: 130 }),
        flavor: this.lookupOption('brew', 'flavors', 'Belgian Dark Mocha', { name: 'Belgian Dark Mocha', price: 35, cal: 85 }),
        toppings: [
          this.lookupOption('brew', 'toppings', 'House Whipped Cream', { name: 'House Whipped Cream', price: 25, cal: 80, drizzle: '#FFFFFF' }),
          this.lookupOption('brew', 'toppings', 'Belgian Dark Cocoa Dust', { name: 'Belgian Dark Cocoa Dust', price: 15, cal: 15, drizzle: '#3B2219' })
        ],
        sweetness: 50
      },
      'honey-macchiato': {
        size: this.lookupOption('brew', 'sizes', 'Small (8oz Piccolo)', { name: 'Small (8oz Piccolo)', price: 120, scale: 0.85, shots: 1 }),
        temp: 'Steaming Hot',
        tempType: 'hot',
        coffee: this.lookupOption('brew', 'coffees', 'Cortado 1:1', { name: 'Cortado 1:1', price: 0, color: '#3D2415', fillPct: 50, caffeine: 150, foam: 20 }),
        roast: { name: 'Ethiopia Yirgacheffe (Floral & Bergamot)' },
        shots: this.lookupOption('brew', 'shots', 'Double Shot (Standard)', { name: 'Double Shot (Standard)', price: 0, caff: 150 }),
        milk: this.lookupOption('brew', 'milks', 'Barista Oat Milk', { name: 'Barista Oat Milk', price: 30, color: '#F3E9D5', cal: 90 }),
        flavor: this.lookupOption('brew', 'flavors', 'Lavender Blossom Honey', { name: 'Lavender Blossom Honey', price: 30, cal: 55 }),
        toppings: [
          this.lookupOption('brew', 'toppings', 'Ceylon Cinnamon Dust', { name: 'Ceylon Cinnamon Dust', price: 15, cal: 5, drizzle: '#8B5A2B' })
        ],
        sweetness: 25
      }
    };

    if (presets[type]) {
      customBrew = JSON.parse(JSON.stringify(presets[type]));

      // Synchronize single-select pills
      this.syncBrewPillSingle('.brew-option-size', customBrew.size.name);
      this.syncBrewPillSingle('.brew-option-temp', customBrew.temp);
      this.syncBrewPillSingle('.brew-option-coffee', customBrew.coffee.name);
      this.syncBrewPillSingle('.brew-option-roast', customBrew.roast.name);
      this.syncBrewPillSingle('.brew-option-shots', customBrew.shots.name);
      this.syncBrewPillSingle('.brew-option-milk', customBrew.milk.name);
      this.syncBrewPillSingle('.brew-option-flavor', customBrew.flavor ? customBrew.flavor.name : 'None (Unflavored)');

      // Synchronize multi-select toppings
      const toppingNames = customBrew.toppings.map(t => t.name);
      document.querySelectorAll('.brew-option-topping').forEach(btn => {
        if (toppingNames.includes(btn.dataset.name)) {
          btn.classList.add('selected');
        } else {
          btn.classList.remove('selected');
        }
      });

      // Synchronize sweetness slider
      const sweetSlider = document.getElementById('brew-sweetness-slider');
      const sweetVal = document.getElementById('brew-sweetness-val');
      if (sweetSlider) sweetSlider.value = customBrew.sweetness;
      if (sweetVal) sweetVal.textContent = `${customBrew.sweetness}% (${customBrew.sweetness === '0' || customBrew.sweetness === 0 ? 'Unsweetened' : customBrew.sweetness <= 25 ? 'Light' : customBrew.sweetness <= 50 ? 'Semi-Sweet' : 'Sweet'})`;

      this.renderBrewPreview();
      showToast(`Loaded ${type.replace('-', ' ').toUpperCase()} Barista Creation!`);
    }
  },

  syncBrewPillSingle(selector, activeName) {
    document.querySelectorAll(selector).forEach(btn => {
      if (btn.dataset.name === activeName) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  },

  bindBrewEvents() {
    // 1. Size Selection
    document.querySelectorAll('.brew-option-size').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.brew-option-size').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customBrew.size = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          scale: parseFloat(btn.dataset.scale) || 1.0,
          shots: parseInt(btn.dataset.shots) || 2
        };
        this.renderBrewPreview();
      });
    });

    // 2. Temperature Selection
    document.querySelectorAll('.brew-option-temp').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.brew-option-temp').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customBrew.temp = btn.dataset.name;
        customBrew.tempType = btn.dataset.tempType || 'hot';
        this.renderBrewPreview();
      });
    });

    // 3. Espresso Style Selection
    document.querySelectorAll('.brew-option-coffee').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.brew-option-coffee').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customBrew.coffee = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          color: btn.dataset.color || '#5C3826',
          fillPct: parseInt(btn.dataset.fill) || 70,
          caffeine: parseInt(btn.dataset.caffeine) || 150,
          foam: parseInt(btn.dataset.foam) || 30
        };
        this.renderBrewPreview();
      });
    });

    // 4. Bean Origin Selection
    document.querySelectorAll('.brew-option-roast').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.brew-option-roast').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customBrew.roast = { name: btn.dataset.name };
        this.renderBrewPreview();
      });
    });

    // 5. Espresso Shot Intensity Selection
    document.querySelectorAll('.brew-option-shots').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.brew-option-shots').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customBrew.shots = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          caff: parseInt(btn.dataset.caff) || 150
        };
        this.renderBrewPreview();
      });
    });

    // 6. Milk Choice Selection
    document.querySelectorAll('.brew-option-milk').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.brew-option-milk').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customBrew.milk = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          color: btn.dataset.color || '#FFF',
          cal: parseInt(btn.dataset.cal) || 0
        };
        this.renderBrewPreview();
      });
    });

    // 7. Craft Flavor Selection
    document.querySelectorAll('.brew-option-flavor').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.brew-option-flavor').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customBrew.flavor = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          cal: parseInt(btn.dataset.cal) || 0
        };
        this.renderBrewPreview();
      });
    });

    // 8. Finishing Toppings & Drizzles (Multi-Select toggle)
    document.querySelectorAll('.brew-option-topping').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const cal = parseInt(btn.dataset.cal) || 0;
        const drizzle = btn.dataset.drizzle || '#C59B27';

        const existingIdx = customBrew.toppings.findIndex(t => t.name === name);
        if (existingIdx >= 0) {
          customBrew.toppings.splice(existingIdx, 1);
          btn.classList.remove('selected');
        } else {
          customBrew.toppings.push({ name, price, cal, drizzle });
          btn.classList.add('selected');
        }
        this.renderBrewPreview();
      });
    });

    // 9. Sweetness Slider
    const sweetSlider = document.getElementById('brew-sweetness-slider');
    const sweetVal = document.getElementById('brew-sweetness-val');
    if (sweetSlider) {
      sweetSlider.addEventListener('input', (e) => {
        customBrew.sweetness = e.target.value;
        const levelText = e.target.value === '0' || e.target.value === 0
          ? 'Unsweetened'
          : e.target.value <= 25
          ? 'Light'
          : e.target.value <= 50
          ? 'Semi-Sweet'
          : e.target.value <= 75
          ? 'Sweet'
          : 'Full Sweet';
        if (sweetVal) sweetVal.textContent = `${e.target.value}% (${levelText})`;
        this.renderBrewPreview();
      });
    }
  },

  // --- PLATE BUILDER METHODS ---
  renderPlateCanvas() {
    const slotMain = document.getElementById('plate-slot-main');
    const slotSide = document.getElementById('plate-slot-side');
    const slotSalad = document.getElementById('plate-slot-salad');
    const slotSauce = document.getElementById('plate-slot-sauce');
    const slotDrink = document.getElementById('plate-slot-drink');
    const slotDessert = document.getElementById('plate-slot-dessert');

    if (slotMain) slotMain.innerHTML = `<i class="fa-solid ${customPlate.main.icon || 'fa-drumstick-bite'} text-amber-700"></i> ${customPlate.main.name}`;
    if (slotSide) slotSide.innerHTML = `<i class="fa-solid ${customPlate.side.icon || 'fa-bowl-food'} text-amber-700"></i> ${customPlate.side.name}`;
    if (slotSalad) slotSalad.innerHTML = `<i class="fa-solid ${customPlate.salad.icon || 'fa-seedling'} text-emerald-700"></i> ${customPlate.salad.name}`;
    if (slotSauce) slotSauce.innerHTML = `<i class="fa-solid ${customPlate.sauce.icon || 'fa-bottle-droplet'} text-amber-800"></i> ${customPlate.sauce.name}`;
    if (slotDrink) slotDrink.innerHTML = `<i class="fa-solid ${customPlate.drink.icon || 'fa-glass-water'} text-amber-400"></i> ${customPlate.drink.name}`;
    if (slotDessert) slotDessert.innerHTML = `<i class="fa-solid ${customPlate.dessert.icon || 'fa-cookie'} text-white"></i> ${customPlate.dessert.name}`;

    // Update section badges
    const badgeMain = document.getElementById('plate-badge-main');
    const badgeSide = document.getElementById('plate-badge-side');
    const badgeSalad = document.getElementById('plate-badge-salad');
    const badgeSauce = document.getElementById('plate-badge-sauce');
    const badgeDrink = document.getElementById('plate-badge-drink');
    const badgeDessert = document.getElementById('plate-badge-dessert');

    if (badgeMain) badgeMain.textContent = `${customPlate.main.name} (₹${customPlate.main.price.toFixed(2)})`;
    if (badgeSide) badgeSide.textContent = `${customPlate.side.name} (₹${customPlate.side.price.toFixed(2)})`;
    if (badgeSalad) badgeSalad.textContent = `${customPlate.salad.name} (₹${customPlate.salad.price.toFixed(2)})`;
    if (badgeSauce) badgeSauce.textContent = `${customPlate.sauce.name} (₹${customPlate.sauce.price.toFixed(2)})`;
    if (badgeDrink) badgeDrink.textContent = `${customPlate.drink.name} (₹${customPlate.drink.price.toFixed(2)})`;
    if (badgeDessert) badgeDessert.textContent = `${customPlate.dessert.name} (₹${customPlate.dessert.price.toFixed(2)})`;

    const totalPrice = customPlate.main.price + customPlate.side.price +
      customPlate.salad.price + customPlate.sauce.price +
      customPlate.drink.price + customPlate.dessert.price;

    const totalCal = (customPlate.main.cal || 0) + (customPlate.side.cal || 0) +
      (customPlate.salad.cal || 0) + (customPlate.sauce.cal || 0) +
      (customPlate.drink.cal || 0) + (customPlate.dessert.cal || 0);

    const summaryEl = document.getElementById('plate-summary-box');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
          <h4 class="font-serif text-lg font-bold text-stone-900">Grand Plate Bill of Fare</h4>
          <span class="text-[11px] bg-amber-50 text-amber-800 font-semibold px-2.5 py-1 rounded-full border border-amber-200">
            6 Selected Items
          </span>
        </div>

        <ul class="text-xs space-y-1.5 text-stone-600 mb-4 divide-y divide-stone-50">
          <li class="flex justify-between items-center pt-1"><span class="font-semibold text-stone-800">1. Main:</span> <span class="text-stone-700">${customPlate.main.name}</span> <span class="font-mono text-stone-900">₹${customPlate.main.price.toFixed(2)}</span></li>
          <li class="flex justify-between items-center pt-1"><span class="font-semibold text-stone-800">2. Side:</span> <span class="text-stone-700">${customPlate.side.name}</span> <span class="font-mono text-stone-900">₹${customPlate.side.price.toFixed(2)}</span></li>
          <li class="flex justify-between items-center pt-1"><span class="font-semibold text-stone-800">3. Salad:</span> <span class="text-stone-700">${customPlate.salad.name}</span> <span class="font-mono text-stone-900">₹${customPlate.salad.price.toFixed(2)}</span></li>
          <li class="flex justify-between items-center pt-1"><span class="font-semibold text-stone-800">4. Drizzle:</span> <span class="text-stone-700">${customPlate.sauce.name}</span> <span class="font-mono text-stone-900">₹${customPlate.sauce.price.toFixed(2)}</span></li>
          <li class="flex justify-between items-center pt-1"><span class="font-semibold text-stone-800">5. Drink:</span> <span class="text-stone-700">${customPlate.drink.name}</span> <span class="font-mono text-stone-900">₹${customPlate.drink.price.toFixed(2)}</span></li>
          <li class="flex justify-between items-center pt-1"><span class="font-semibold text-stone-800">6. Dessert:</span> <span class="text-stone-700">${customPlate.dessert.name}</span> <span class="font-mono text-stone-900">₹${customPlate.dessert.price.toFixed(2)}</span></li>
        </ul>

        <div class="pt-3 border-t border-stone-200 flex justify-between items-center mb-4">
          <div>
            <p class="text-[11px] text-stone-500 font-medium">Estimated Nutritional Energy</p>
            <p class="font-bold text-stone-900 flex items-center gap-1.5">
              <i class="fa-solid fa-fire text-amber-700 text-xs"></i> ${totalCal} Calories
            </p>
          </div>
          <div class="text-right">
            <p class="text-[11px] text-stone-500 font-medium">Combination Total</p>
            <p class="font-serif text-2xl font-bold text-stone-900">₹${totalPrice.toFixed(2)}</p>
          </div>
        </div>

        <div class="space-y-2">
          <button class="btn-rosa text-xs w-full py-3 shadow-md" onclick="Builders.addPlateToCart()">
            <i class="fa-solid fa-cart-plus mr-1"></i> Add Custom Grand Plate to Cart
          </button>
        </div>
      `;
    }
  },

  addPlateToCart() {
    const totalPrice = customPlate.main.price + customPlate.side.price +
      customPlate.salad.price + customPlate.sauce.price +
      customPlate.drink.price + customPlate.dessert.price;

    const details = `${customPlate.main.name} with ${customPlate.side.name}, ${customPlate.salad.name}, ${customPlate.sauce.name}, ${customPlate.drink.name} & ${customPlate.dessert.name}`;

    Cart.addItem({
      id: 'custom_plate_' + Date.now(),
      name: 'Custom Artisanal Grand Plate',
      price: totalPrice,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80'
    }, 1, details);

    showToast(`Added Grand Plate (₹${totalPrice.toFixed(2)}) to Cart!`);
  },

  loadPlatePreset(type) {
    const presets = {
      tuscan: {
        main: this.lookupOption('plate', 'mains', 'Tuscan Grilled Chicken', { name: 'Tuscan Grilled Chicken', price: 260, cal: 320, icon: 'fa-drumstick-bite' }),
        side: this.lookupOption('plate', 'sides', 'Truffle Roasted Potatoes', { name: 'Truffle Roasted Potatoes', price: 95, cal: 210, icon: 'fa-bowl-food' }),
        salad: this.lookupOption('plate', 'salads', 'Wild Arugula & Parmesan', { name: 'Wild Arugula & Parmesan', price: 80, cal: 90, icon: 'fa-seedling' }),
        sauce: this.lookupOption('plate', 'sauces', 'Artisanal Pesto Reduction', { name: 'Artisanal Pesto Reduction', price: 45, cal: 120, icon: 'fa-bottle-droplet' }),
        drink: this.lookupOption('plate', 'drinks', 'Sparkling Citrus Tonic', { name: 'Sparkling Citrus Tonic', price: 85, cal: 45, icon: 'fa-glass-water' }),
        dessert: this.lookupOption('plate', 'desserts', 'Mini Dark Chocolate Tart', { name: 'Mini Dark Chocolate Tart', price: 95, cal: 180, icon: 'fa-cookie' })
      },
      salmon: {
        main: this.lookupOption('plate', 'mains', 'Pan-Seared Salmon Fillet', { name: 'Pan-Seared Salmon Fillet', price: 340, cal: 380, icon: 'fa-fish' }),
        side: this.lookupOption('plate', 'sides', 'French Butter Haricots Verts', { name: 'French Butter Haricots Verts', price: 75, cal: 60, icon: 'fa-seedling' }),
        salad: this.lookupOption('plate', 'salads', 'Citrus Shaved Fennel Slaw', { name: 'Citrus Fennel Slaw', price: 80, cal: 70, icon: 'fa-lemon' }),
        sauce: this.lookupOption('plate', 'sauces', 'Chimichurri Herb Butter', { name: 'Chimichurri Herb Butter', price: 45, cal: 110, icon: 'fa-cubes-stacked' }),
        drink: this.lookupOption('plate', 'drinks', 'Iced Peach White Tea', { name: 'Iced Peach White Tea', price: 85, cal: 30, icon: 'fa-leaf' }),
        dessert: this.lookupOption('plate', 'desserts', 'Sicilian Lemon Sorbet', { name: 'Lemon Ricotta Tartlet', price: 75, cal: 90, icon: 'fa-sun' })
      },
      truffle: {
        main: this.lookupOption('plate', 'mains', 'Truffle Mushroom Rigatoni', { name: 'Truffle Mushroom Rigatoni', price: 280, cal: 290, icon: 'fa-wheat-awn' }),
        side: this.lookupOption('plate', 'sides', 'Rosemary Garlic Focaccia', { name: 'Rosemary Garlic Focaccia', price: 75, cal: 180, icon: 'fa-bread-slice' }),
        salad: this.lookupOption('plate', 'salads', 'Heirloom Caprese & Basil', { name: 'Heirloom Caprese & Basil', price: 110, cal: 130, icon: 'fa-apple-whole' }),
        sauce: this.lookupOption('plate', 'sauces', 'Aged Modena Balsamic Glaze', { name: 'Aged Modena Balsamic Glaze', price: 35, cal: 60, icon: 'fa-wine-bottle' }),
        drink: this.lookupOption('plate', 'drinks', 'Single-Origin Cold Brew', { name: 'Single-Origin Cold Brew', price: 110, cal: 15, icon: 'fa-mug-hot' }),
        dessert: this.lookupOption('plate', 'desserts', 'Salted Caramel Macaron', { name: 'Pistachio Cardamom Cannoli', price: 65, cal: 110, icon: 'fa-cookie-bite' })
      },
      garden: {
        main: this.lookupOption('plate', 'mains', 'Roasted Golden Cauliflower Steak', { name: 'Roasted Golden Cauliflower', price: 220, cal: 180, icon: 'fa-leaf' }),
        side: this.lookupOption('plate', 'sides', 'Crispy Sweet Potato Wedges', { name: 'Crispy Sweet Potato Wedges', price: 85, cal: 160, icon: 'fa-carrot' }),
        salad: this.lookupOption('plate', 'salads', 'Mediterranean Quinoa', { name: 'Lemon Herb Quinoa', price: 90, cal: 140, icon: 'fa-bowl-rice' }),
        sauce: this.lookupOption('plate', 'sauces', 'Artisanal Pesto Reduction', { name: 'Artisanal Pesto Reduction', price: 45, cal: 120, icon: 'fa-bottle-droplet' }),
        drink: this.lookupOption('plate', 'drinks', 'Hibiscus Rosehip Berry Spritz', { name: 'Hibiscus Rosehip Berry Spritz', price: 95, cal: 40, icon: 'fa-martini-glass-citrus' }),
        dessert: this.lookupOption('plate', 'desserts', 'Salted Caramel Macaron', { name: 'Artisanal Macaron Duo', price: 65, cal: 110, icon: 'fa-circle-dot' })
      }
    };

    if (presets[type]) {
      customPlate = { ...presets[type] };

      // Update UI active classes on button pills
      this.syncPlatePillState('.plate-option-main', customPlate.main.name);
      this.syncPlatePillState('.plate-option-side', customPlate.side.name);
      this.syncPlatePillState('.plate-option-salad', customPlate.salad.name);
      this.syncPlatePillState('.plate-option-sauce', customPlate.sauce.name);
      this.syncPlatePillState('.plate-option-drink', customPlate.drink.name);
      this.syncPlatePillState('.plate-option-dessert', customPlate.dessert.name);

      this.renderPlateCanvas();
      showToast(`Loaded ${type.charAt(0).toUpperCase() + type.slice(1)} Grand Plate preset!`);
    }
  },

  syncPlatePillState(selector, activeName) {
    document.querySelectorAll(selector).forEach(btn => {
      if (btn.dataset.name === activeName) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  },

  bindPlateEvents() {
    // Main course selection
    document.querySelectorAll('.plate-option-main').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.plate-option-main').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customPlate.main = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          cal: parseInt(btn.dataset.cal) || 300,
          icon: btn.dataset.icon || 'fa-drumstick-bite'
        };
        this.renderPlateCanvas();
      });
    });

    // Side selection
    document.querySelectorAll('.plate-option-side').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.plate-option-side').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customPlate.side = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          cal: parseInt(btn.dataset.cal) || 200,
          icon: btn.dataset.icon || 'fa-bowl-food'
        };
        this.renderPlateCanvas();
      });
    });

    // Salad selection
    document.querySelectorAll('.plate-option-salad').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.plate-option-salad').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customPlate.salad = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          cal: parseInt(btn.dataset.cal) || 90,
          icon: btn.dataset.icon || 'fa-seedling'
        };
        this.renderPlateCanvas();
      });
    });

    // Sauce selection
    document.querySelectorAll('.plate-option-sauce').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.plate-option-sauce').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customPlate.sauce = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          cal: parseInt(btn.dataset.cal) || 100,
          icon: btn.dataset.icon || 'fa-bottle-droplet'
        };
        this.renderPlateCanvas();
      });
    });

    // Drink selection
    document.querySelectorAll('.plate-option-drink').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.plate-option-drink').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customPlate.drink = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          cal: parseInt(btn.dataset.cal) || 50,
          icon: btn.dataset.icon || 'fa-glass-water'
        };
        this.renderPlateCanvas();
      });
    });

    // Dessert selection
    document.querySelectorAll('.plate-option-dessert').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.plate-option-dessert').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        customPlate.dessert = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price),
          cal: parseInt(btn.dataset.cal) || 150,
          icon: btn.dataset.icon || 'fa-cookie'
        };
        this.renderPlateCanvas();
      });
    });
  }
};

window.Builders = Builders;

