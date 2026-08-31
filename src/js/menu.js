/* Digital Cafe Menu Controller */
import { API } from './api.js';
import { Cart } from './cart.js';
import { showToast } from './main.js';

let activeCategory = 'All';
let currentSearch = '';
let currentSort = 'featured';
let activeFilters = {
  veg: false,
  vegan: false,
  bestseller: false,
  spicy: false,
  lowCalorie: false
};

let allProducts = [];
let eventsBound = false;
let activeModalState = null;

export function getDefaultCustomizationOptions(item) {
  if (item && item.customizationOptions) {
    return {
      sizes: item.customizationOptions.sizes || [],
      milks: item.customizationOptions.milks || [],
      syrups: item.customizationOptions.syrups || [],
      dressings: item.customizationOptions.dressings || [],
      addOns: item.customizationOptions.addOns || []
    };
  }

  const category = item ? item.category : '';
  const isDrink = ['Coffee', 'Tea', 'Cold Drinks', 'Smoothies', 'Signature Drinks'].includes(category);
  const isDessert = ['Desserts', 'Pastries', 'Dessert'].includes(category);

  if (isDrink) {
    return {
      sizes: [
        { name: 'Piccolo (8oz)', price: -10 },
        { name: 'Standard (12oz)', price: 0 },
        { name: 'Grand (16oz)', price: 20 }
      ],
      milks: [
        { name: 'Organic Whole Milk', price: 0 },
        { name: 'Barista Oat Milk', price: 30 },
        { name: 'Roasted Almond Milk', price: 30 },
        { name: 'Sweet Cold Foam', price: 35 },
        { name: 'Pure Black / None', price: 0 }
      ],
      syrups: [
        { name: 'None (Pure)', price: 0 },
        { name: 'Madagascar Bourbon Vanilla', price: 25 },
        { name: 'House Salted Caramel', price: 25 },
        { name: 'Hazelnut Praline', price: 25 },
        { name: 'Lavender Honey', price: 30 },
        { name: 'Belgian Dark Mocha', price: 35 }
      ],
      dressings: [],
      addOns: [
        { name: 'Extra Espresso Shot', price: 35 },
        { name: 'House Whipped Cream', price: 25 },
        { name: 'Ceylon Cinnamon Dust', price: 15 },
        { name: '24k Edible Gold Leaf', price: 60 },
        { name: 'Warm Caramel Drizzle', price: 20 },
        { name: 'Dark Belgian Shavings', price: 25 }
      ]
    };
  } else if (isDessert) {
    return {
      sizes: [
        { name: 'Single Artisan Portion', price: 0 },
        { name: 'Grande Sharing Duo', price: 80 }
      ],
      milks: [],
      syrups: [],
      dressings: [],
      addOns: [
        { name: 'Vanilla Bean Gelato Scoop', price: 55 },
        { name: 'Warm Chocolate Ganache', price: 35 },
        { name: 'Crushed Sicilian Pistachios', price: 40 },
        { name: 'Fresh Berry Compote', price: 40 },
        { name: '24k Edible Gold Leaf', price: 60 },
        { name: 'Extra Clotted Cream', price: 35 }
      ]
    };
  } else {
    // Food / Kitchen Items
    return {
      sizes: [
        { name: 'Regular Portion', price: 0 },
        { name: 'Chef Grande (+35%)', price: Math.round((item ? item.price : 100) * 0.35) }
      ],
      milks: [],
      syrups: [],
      dressings: [
        { name: 'Chef Recommended Dressing', price: 0 },
        { name: 'Extra 24-Mo Shaved Parmesan', price: 35 },
        { name: 'Dressing on the Side', price: 0 },
        { name: 'Light Dressing', price: 0 }
      ],
      addOns: [
        { name: 'White Truffle Oil Drizzle', price: 50 },
        { name: 'Whole Fresh Burrata', price: 90 },
        { name: 'Poached Farm Egg', price: 40 },
        { name: 'Fresh Hass Avocado', price: 50 },
        { name: 'Sautéed Garlic Mushrooms', price: 60 },
        { name: 'Rosemary Focaccia Slice', price: 40 }
      ]
    };
  }
}

export const Menu = {
  async init() {
    this.bindEvents();
    await this.loadMenu();
  },

  async loadMenu() {
    const gridEl = document.getElementById('menu-grid');
    if (!gridEl) return;

    gridEl.innerHTML = `
      <div class="col-span-full text-center py-16 text-stone-500">
        <i class="fa-solid fa-spinner fa-spin text-3xl mb-3 text-amber-700"></i>
        <p class="font-serif text-lg text-stone-800">Fetching artisanal menu selections...</p>
        <p class="text-xs text-stone-400 mt-1">Single-origin beans & freshly prepared kitchen items</p>
      </div>
    `;

    try {
      const data = await API.getMenu(activeCategory, currentSearch);
      allProducts = data.products || [];
      this.renderMenu();
    } catch (err) {
      gridEl.innerHTML = `
        <div class="col-span-full text-center py-12 text-red-600 bg-red-50 rounded-2xl border border-red-200">
          <i class="fa-solid fa-triangle-exclamation text-2xl mb-2"></i>
          <p class="font-bold">Unable to load café menu</p>
          <p class="text-xs text-stone-600 mt-1">Please check your connection and try refreshing.</p>
        </div>
      `;
    }
  },

  renderMenu() {
    const gridEl = document.getElementById('menu-grid');
    const countEl = document.getElementById('menu-item-count');
    const clearBtn = document.getElementById('menu-clear-all-filters');
    if (!gridEl) return;

    let filtered = [...allProducts];

    // Filter tags
    if (activeFilters.veg) filtered = filtered.filter(p => p.isVegetarian);
    if (activeFilters.vegan) filtered = filtered.filter(p => p.isVegan);
    if (activeFilters.bestseller) filtered = filtered.filter(p => p.isBestseller);
    if (activeFilters.spicy) filtered = filtered.filter(p => p.spiceLevel > 0);
    if (activeFilters.lowCalorie) filtered = filtered.filter(p => p.calories <= 250);

    // Sorting
    if (currentSort === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (currentSort === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (currentSort === 'calories-asc') {
      filtered.sort((a, b) => a.calories - b.calories);
    } else if (currentSort === 'popular') {
      filtered.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
    }

    // Has active filter?
    const hasActiveFilter = Object.values(activeFilters).some(Boolean) || activeCategory !== 'All' || currentSearch.trim() !== '';
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !hasActiveFilter);
    }

    // Item count update
    if (countEl) {
      countEl.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'item' : 'items'}`;
    }

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div class="col-span-full text-center py-16 bg-white/70 backdrop-blur-sm rounded-2xl border border-stone-200 shadow-sm">
          <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center text-2xl border border-amber-200">
            <i class="fa-solid fa-mug-saucer"></i>
          </div>
          <h3 class="font-serif text-2xl font-bold text-stone-900 mb-1">No items found</h3>
          <p class="text-xs text-stone-500 max-w-md mx-auto mb-5">
            We couldn't find any creations matching your search "${currentSearch}" or active dietary filters.
          </p>
          <button class="btn-rosa text-xs py-2 px-5" onclick="Menu.resetAllFilters()">
            <i class="fa-solid fa-rotate-left mr-1"></i> Clear All Filters
          </button>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filtered.map(item => `
      <div class="rosa-card flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <!-- Image & Tags -->
        <div class="relative overflow-hidden aspect-[4/3] bg-stone-100">
          <img src="${item.image}" alt="${item.name}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          
          <!-- Top Badges -->
          <div class="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            ${item.isBestseller ? `<span class="bg-amber-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm"><i class="fa-solid fa-star text-[9px] mr-1"></i>Bestseller</span>` : ''}
            ${item.isNew ? `<span class="bg-stone-900 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">New</span>` : ''}
          </div>

          <div class="absolute top-3 right-3 flex gap-1.5 z-10">
            ${item.isVegetarian ? `<span class="diet-tag diet-veg shadow-sm">VEG</span>` : ''}
            ${item.isVegan ? `<span class="diet-tag diet-vegan shadow-sm">VEGAN</span>` : ''}
          </div>

          <div class="absolute bottom-3 left-3 bg-stone-950/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-mono font-medium">
            ${item.category}
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <h3 class="font-serif text-xl font-bold text-stone-900 leading-snug group-hover:text-amber-800 transition-colors">${item.name}</h3>
              <span class="font-serif font-bold text-xl text-stone-900 whitespace-nowrap">₹${item.price.toFixed(2)}</span>
            </div>
            
            <p class="text-stone-600 text-xs line-clamp-2 mb-3.5 leading-relaxed">${item.description}</p>
            
            <div class="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
              <span class="bg-amber-50/80 text-amber-950 border border-amber-200/60 px-2 py-0.5 rounded-md font-semibold">
                <i class="fa-solid fa-fire text-amber-700 text-[10px] mr-1"></i>${item.calories} kcal
              </span>
              ${item.spiceLevel > 0 ? `<span class="spice-indicator" title="Spice level: ${item.spiceLevel}">${'🌶️'.repeat(item.spiceLevel)}</span>` : ''}
              <span class="text-stone-600 font-medium ml-auto">
                <i class="fa-solid fa-star text-amber-500 text-[10px]"></i> ${item.rating} <span class="text-stone-400">(${item.reviewsCount})</span>
              </span>
            </div>

            <!-- Ingredients tags -->
            ${item.ingredients && item.ingredients.length > 0 ? `
              <div class="text-[10px] text-stone-400 mb-4 line-clamp-1">
                <span class="font-semibold text-stone-500">Includes:</span> ${item.ingredients.slice(0, 4).join(', ')}
              </div>
            ` : ''}
          </div>

          <!-- Bottom Action Buttons -->
          <div class="flex gap-2 pt-3.5 border-t border-stone-100">
            <button class="btn-rosa text-xs py-2.5 px-3 flex-1 flex items-center justify-center gap-1.5 shadow-sm" onclick="Menu.quickAdd('${item.id}')">
              <i class="fa-solid fa-cart-plus"></i>
              <span>Quick Add</span>
            </button>
            <button class="btn-rosa-outline text-xs py-2.5 px-3.5 flex items-center justify-center gap-1.5 hover:bg-stone-900 hover:text-white transition-colors" onclick="Menu.openCustomizeModal('${item.id}')">
              <i class="fa-solid fa-sliders text-[11px]"></i>
              <span>Customize</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  quickAdd(productId) {
    const item = allProducts.find(p => p.id === productId);
    if (item) {
      Cart.addItem(item, 1);
    }
  },

  resetAllFilters() {
    activeCategory = 'All';
    currentSearch = '';
    currentSort = 'featured';
    activeFilters = {
      veg: false,
      vegan: false,
      bestseller: false,
      spicy: false,
      lowCalorie: false
    };

    // Update UI elements
    document.querySelectorAll('.category-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.category === 'All');
    });

    document.querySelectorAll('.filter-tag-btn').forEach(btn => {
      btn.classList.remove('bg-stone-900', 'text-white');
    });

    const searchInput = document.getElementById('menu-search-input');
    const clearSearchBtn = document.getElementById('menu-search-clear');
    const sortSelect = document.getElementById('menu-sort-select');

    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    if (sortSelect) sortSelect.value = 'featured';

    this.loadMenu();
    showToast('Filters reset to default view.');
  },

  async openCustomizeModal(productId) {
    let item = allProducts.find(p => p.id === productId);
    if (!item) {
      try {
        const menuData = await API.getMenu('All', '');
        if (menuData && menuData.products) {
          allProducts = menuData.products;
          item = allProducts.find(p => p.id === productId);
        }
      } catch (e) {
        console.error('Error fetching menu items for modal:', e);
      }
    }

    if (!item) {
      showToast('Could not load product details. Please try again.');
      return;
    }

    const modalEl = document.getElementById('customize-modal');
    const contentEl = document.getElementById('customize-modal-content');
    if (!modalEl || !contentEl) return;

    const isDrink = ['Coffee', 'Tea', 'Cold Drinks', 'Smoothies', 'Signature Drinks'].includes(item.category);
    const isDessert = ['Desserts', 'Pastries', 'Dessert'].includes(item.category);
    const opts = getDefaultCustomizationOptions(item);

    const initialSize = (opts.sizes && opts.sizes.find(s => s.price === 0)) || (opts.sizes && opts.sizes[0]) || { name: 'Standard Serving', price: 0 };
    const initialMilk = (opts.milks && opts.milks.length > 0) ? ((opts.milks.find(m => m.price === 0)) || opts.milks[0]) : null;
    const initialSyrup = (opts.syrups && opts.syrups.length > 0) ? ((opts.syrups.find(s => s.price === 0)) || opts.syrups[0]) : null;
    const initialDressing = (opts.dressings && opts.dressings.length > 0) ? ((opts.dressings.find(d => d.price === 0)) || opts.dressings[0]) : null;

    activeModalState = {
      product: item,
      basePrice: item.price,
      quantity: 1,
      optionsConfig: opts,
      size: initialSize,
      temperature: isDrink 
        ? 'Steaming Hot' 
        : (isDessert ? 'Fresh & Chilled' : 'Freshly Prepared'),
      milk: initialMilk,
      sweetness: isDrink ? '50% Semi-Sweet' : (isDessert ? 'Standard Chef Dusting' : null),
      syrup: initialSyrup,
      dressing: initialDressing,
      spice: (!isDrink && !isDessert) ? (item.spiceLevel || 0) : 0,
      addOns: [],
      notes: ''
    };

    this.renderModalContent();
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  renderModalContent() {
    const contentEl = document.getElementById('customize-modal-content');
    if (!contentEl || !activeModalState) return;

    // Preserve any existing notes user typed
    const existingNotesInput = document.getElementById('modal-notes-input');
    if (existingNotesInput) {
      activeModalState.notes = existingNotesInput.value;
    }

    const item = activeModalState.product;
    const isDrink = ['Coffee', 'Tea', 'Cold Drinks', 'Smoothies', 'Signature Drinks'].includes(item.category);
    const isDessert = ['Desserts', 'Pastries', 'Dessert'].includes(item.category);
    const opts = activeModalState.optionsConfig || getDefaultCustomizationOptions(item);

    // Compute unit price
    let unitPrice = activeModalState.basePrice + (activeModalState.size?.price || 0);
    if (activeModalState.milk) unitPrice += activeModalState.milk.price;
    if (activeModalState.syrup) unitPrice += activeModalState.syrup.price;
    if (activeModalState.dressing) unitPrice += activeModalState.dressing.price;
    unitPrice += activeModalState.addOns.reduce((sum, a) => sum + a.price, 0);

    const totalPrice = unitPrice * activeModalState.quantity;

    contentEl.innerHTML = `
      <div class="p-6 md:p-8">
        <!-- Header -->
        <div class="flex justify-between items-start border-b border-stone-100 pb-4 mb-5">
          <div class="flex items-center gap-4">
            <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-xl object-cover border border-stone-200 shadow-sm" />
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">${item.category}</span>
                ${item.isVegetarian ? '<span class="diet-tag diet-veg">VEG</span>' : ''}
                ${item.isVegan ? '<span class="diet-tag diet-vegan">VEGAN</span>' : ''}
              </div>
              <h3 class="font-serif text-2xl font-bold text-stone-900 mt-1">${item.name}</h3>
              <p class="text-xs text-stone-500 font-mono">Base: ₹${item.price.toFixed(2)} • ${item.calories} kcal</p>
            </div>
          </div>
          <button class="text-stone-400 hover:text-stone-800 text-2xl leading-none p-1 transition-colors" onclick="Menu.closeCustomizeModal()">&times;</button>
        </div>

        <p class="text-xs text-stone-600 mb-6 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/60">
          ${item.description}
        </p>

        <!-- Options Container -->
        <div class="space-y-5 text-xs">
          <!-- 1. Size / Portion Selection -->
          ${opts.sizes && opts.sizes.length > 0 ? `
          <div>
            <label class="block font-bold text-stone-800 mb-2 uppercase tracking-wider text-[11px]">
              <i class="fa-solid fa-expand text-amber-800 mr-1"></i> Select Serving Size & Portion
            </label>
            <div class="grid ${opts.sizes.length > 2 ? 'grid-cols-3' : 'grid-cols-2'} gap-2">
              ${opts.sizes.map(s => `
                <button type="button" class="modal-opt-btn modal-size-btn ${activeModalState.size?.name === s.name ? 'active' : ''}" data-name="${s.name}" data-price="${s.price}">
                  <span class="font-bold">${s.name}</span>
                  <span class="text-[10px] block opacity-75">${s.price > 0 ? `+₹${Number(s.price).toFixed(2)}` : (s.price < 0 ? `-₹${Math.abs(Number(s.price)).toFixed(2)}` : 'Standard')}</span>
                </button>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <!-- 2. Temperature / Prep Style -->
          <div>
            <label class="block font-bold text-stone-800 mb-2 uppercase tracking-wider text-[11px]">
              <i class="fa-solid fa-temperature-three-quarters text-amber-800 mr-1"></i> Preparation & Temperature
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              ${isDrink ? `
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Steaming Hot' ? 'active' : ''}" data-temp="Steaming Hot">
                  <i class="fa-solid fa-mug-hot text-amber-700 block mb-1"></i> Hot (65°C)
                </button>
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Extra Hot' ? 'active' : ''}" data-temp="Extra Hot">
                  <i class="fa-solid fa-fire text-amber-800 block mb-1"></i> Extra Hot (75°C)
                </button>
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Over Ice' ? 'active' : ''}" data-temp="Over Ice">
                  <i class="fa-solid fa-cube text-cyan-600 block mb-1"></i> Over Ice
                </button>
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Nitro Chilled' ? 'active' : ''}" data-temp="Nitro Chilled">
                  <i class="fa-solid fa-wand-magic text-blue-600 block mb-1"></i> Nitro Velvet
                </button>
              ` : (isDessert ? `
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Fresh & Chilled' ? 'active' : ''}" data-temp="Fresh & Chilled">
                  <i class="fa-solid fa-snowflake text-cyan-600 block mb-1"></i> Fresh & Chilled
                </button>
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Warmed & Soft' ? 'active' : ''}" data-temp="Warmed & Soft">
                  <i class="fa-solid fa-fire-flame-curved text-amber-700 block mb-1"></i> Warmed & Soft
                </button>
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Room Temperature' ? 'active' : ''}" data-temp="Room Temperature">
                  <i class="fa-solid fa-sun text-amber-600 block mb-1"></i> Room Temp
                </button>
              ` : `
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Freshly Prepared' ? 'active' : ''}" data-temp="Freshly Prepared">
                  <i class="fa-solid fa-utensils text-amber-700 block mb-1"></i> Standard Chef
                </button>
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Extra Crispy' ? 'active' : ''}" data-temp="Extra Crispy">
                  <i class="fa-solid fa-fire-flame-curved text-amber-800 block mb-1"></i> Extra Crispy
                </button>
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Warm & Soft' ? 'active' : ''}" data-temp="Warm & Soft">
                  <i class="fa-solid fa-bread-slice text-amber-600 block mb-1"></i> Warm & Tender
                </button>
                <button type="button" class="modal-opt-btn modal-temp-btn ${activeModalState.temperature === 'Extra Hot' ? 'active' : ''}" data-temp="Extra Hot">
                  <i class="fa-solid fa-fire text-red-600 block mb-1"></i> Sizzling Hot
                </button>
              `)}
            </div>
          </div>

          <!-- 3. Dairy / Plant Milk (If Drink or if milks configured) -->
          ${opts.milks && opts.milks.length > 0 ? `
            <div>
              <label class="block font-bold text-stone-800 mb-2 uppercase tracking-wider text-[11px]">
                <i class="fa-solid fa-droplet text-amber-800 mr-1"></i> Dairy & Plant Milk Selection
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                ${opts.milks.map(m => `
                  <button type="button" class="modal-opt-btn modal-milk-btn ${activeModalState.milk?.name === m.name ? 'active' : ''}" data-name="${m.name}" data-price="${m.price}">
                    ${m.name} ${m.price > 0 ? `(+₹${Number(m.price).toFixed(2)})` : '(+₹0.00)'}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 4. Sweetness & Craft Syrup / Dusting -->
          ${isDrink ? `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-stone-800 mb-2 uppercase tracking-wider text-[11px]">
                  <i class="fa-solid fa-cube text-amber-800 mr-1"></i> Sweetness Intensity
                </label>
                <select id="modal-sweetness-select" class="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:border-amber-700 font-medium cursor-pointer">
                  <option value="0% Unsweetened" ${activeModalState.sweetness === '0% Unsweetened' ? 'selected' : ''}>0% (Unsweetened)</option>
                  <option value="25% Light Sweet" ${activeModalState.sweetness === '25% Light Sweet' ? 'selected' : ''}>25% (Light Sweet)</option>
                  <option value="50% Semi-Sweet" ${activeModalState.sweetness === '50% Semi-Sweet' ? 'selected' : ''}>50% (Semi-Sweet • Barista Rec)</option>
                  <option value="75% Sweet" ${activeModalState.sweetness === '75% Sweet' ? 'selected' : ''}>75% (Sweet)</option>
                  <option value="100% Full Sweet" ${activeModalState.sweetness === '100% Full Sweet' ? 'selected' : ''}>100% (Full Sweet)</option>
                </select>
              </div>

              ${opts.syrups && opts.syrups.length > 0 ? `
              <div>
                <label class="block font-bold text-stone-800 mb-2 uppercase tracking-wider text-[11px]">
                  <i class="fa-solid fa-wand-magic-sparkles text-amber-800 mr-1"></i> Artisanal Syrup
                </label>
                <select id="modal-syrup-select" class="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:border-amber-700 font-medium cursor-pointer">
                  ${opts.syrups.map(s => `
                    <option value="${s.name}" data-price="${s.price}" ${activeModalState.syrup?.name === s.name ? 'selected' : ''}>
                      ${s.name} ${s.price > 0 ? `(+₹${Number(s.price).toFixed(2)})` : '(+₹0.00)'}
                    </option>
                  `).join('')}
                </select>
              </div>
              ` : ''}
            </div>
          ` : (isDessert ? `
            <!-- Dessert Sweetness & Topping style -->
            <div>
              <label class="block font-bold text-stone-800 mb-2 uppercase tracking-wider text-[11px]">
                <i class="fa-solid fa-wand-magic-sparkles text-amber-800 mr-1"></i> Chef Dusting & Topping
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button type="button" class="modal-opt-btn modal-dessert-sweet-btn ${activeModalState.sweetness === 'Standard Chef Dusting' ? 'active' : ''}" data-name="Standard Chef Dusting">
                  Standard Chef
                </button>
                <button type="button" class="modal-opt-btn modal-dessert-sweet-btn ${activeModalState.sweetness === 'Extra Cinnamon & Cocoa' ? 'active' : ''}" data-name="Extra Cinnamon & Cocoa">
                  Extra Cocoa & Spice
                </button>
                <button type="button" class="modal-opt-btn modal-dessert-sweet-btn ${activeModalState.sweetness === 'Light Sugar Dusting' ? 'active' : ''}" data-name="Light Sugar Dusting">
                  Light Sweet
                </button>
              </div>
            </div>
          ` : `
            <!-- Food Spice & Dressing Preference -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-bold text-stone-800 mb-2 uppercase tracking-wider text-[11px]">
                  <i class="fa-solid fa-pepper-hot text-red-600 mr-1"></i> Spice Level
                </label>
                <div class="grid grid-cols-4 gap-2">
                  <button type="button" class="modal-opt-btn modal-spice-btn ${activeModalState.spice === 0 ? 'active' : ''}" data-spice="0">Mild / None</button>
                  <button type="button" class="modal-opt-btn modal-spice-btn ${activeModalState.spice === 1 ? 'active' : ''}" data-spice="1">🌶️ Med</button>
                  <button type="button" class="modal-opt-btn modal-spice-btn ${activeModalState.spice === 2 ? 'active' : ''}" data-spice="2">🌶️🌶️ Hot</button>
                  <button type="button" class="modal-opt-btn modal-spice-btn ${activeModalState.spice === 3 ? 'active' : ''}" data-spice="3">🌶️🌶️🌶️</button>
                </div>
              </div>

              ${opts.dressings && opts.dressings.length > 0 ? `
              <div>
                <label class="block font-bold text-stone-800 mb-2 uppercase tracking-wider text-[11px]">
                  <i class="fa-solid fa-bottle-droplet text-amber-800 mr-1"></i> Cheese & Dressing
                </label>
                <select id="modal-dressing-select" class="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:border-amber-700 font-medium cursor-pointer">
                  ${opts.dressings.map(d => `
                    <option value="${d.name}" data-price="${d.price}" ${activeModalState.dressing?.name === d.name ? 'selected' : ''}>
                      ${d.name} ${d.price > 0 ? `(+₹${Number(d.price).toFixed(2)})` : '(+₹0.00)'}
                    </option>
                  `).join('')}
                </select>
              </div>
              ` : ''}
            </div>
          `)}

          <!-- 5. Gourmet Add-ons & Garnishes (Multi-Selectable) -->
          ${opts.addOns && opts.addOns.length > 0 ? `
          <div>
            <label class="block font-bold text-stone-800 mb-2 uppercase tracking-wider text-[11px]">
              <i class="fa-solid fa-plus-circle text-amber-800 mr-1"></i> Gourmet Add-ons & Custom Garnishes
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${opts.addOns.map(a => {
                const isSelected = activeModalState.addOns.some(x => x.name === a.name);
                return `
                  <button type="button" class="modal-addon-btn ${isSelected ? 'selected' : ''}" data-name="${a.name}" data-price="${a.price}">
                    <span class="flex items-center">
                      <i class="fa-solid ${isSelected ? 'fa-check text-amber-800' : 'fa-plus text-stone-400'} text-xs mr-1.5"></i>
                      ${a.name}
                    </span>
                    <span class="font-bold font-mono">+₹${Number(a.price).toFixed(2)}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}

          <!-- 6. Special Chef / Barista Notes -->
          <div>
            <label class="block font-bold text-stone-800 mb-1.5 uppercase tracking-wider text-[11px]">
              <i class="fa-solid fa-pen text-stone-500 mr-1"></i> Special Preparation / Dietary Instructions
            </label>
            <input type="text" id="modal-notes-input" value="${activeModalState.notes || ''}" placeholder="e.g. Less ice, sauce on side, extra crispy, gluten sensitive..." class="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-amber-700 bg-white" />
          </div>

          <!-- Allergen Notice -->
          <div class="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
            <i class="fa-solid fa-shield-halved text-amber-700 text-sm"></i>
            <div>
              <span class="font-bold">Allergen Safety:</span> 
              ${item.allergens && item.allergens.length ? item.allergens.join(', ') : 'No common allergens declared.'}
            </div>
          </div>
        </div>

        <!-- Quantity & Add to Cart Footer -->
        <div class="mt-8 pt-5 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- Quantity Control -->
          <div class="flex items-center border border-stone-300 rounded-full bg-white px-2 py-1 shadow-sm">
            <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-100 text-sm font-bold transition-colors" onclick="Menu.adjustModalQty(-1)">-</button>
            <span class="w-10 text-center font-bold text-stone-900 text-sm font-mono">${activeModalState.quantity}</span>
            <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-100 text-sm font-bold transition-colors" onclick="Menu.adjustModalQty(1)">+</button>
          </div>

          <!-- Add Button with dynamic price -->
          <button type="button" class="btn-rosa text-xs py-3.5 px-6 w-full sm:w-auto flex-1 flex items-center justify-between shadow-md" onclick="Menu.confirmCustomize()">
            <span class="flex items-center gap-2">
              <i class="fa-solid fa-cart-shopping"></i>
              <span class="font-bold">Add Customized Creation</span>
            </span>
            <span class="font-serif font-bold text-sm bg-white/20 px-3 py-1 rounded-full">₹${totalPrice.toFixed(2)}</span>
          </button>
        </div>
      </div>
    `;

    this.bindModalListeners();
  },

  bindModalListeners() {
    // Size buttons
    document.querySelectorAll('.modal-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeModalState.size = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price) || 0
        };
        this.renderModalContent();
      });
    });

    // Temp buttons
    document.querySelectorAll('.modal-temp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeModalState.temperature = btn.dataset.temp;
        this.renderModalContent();
      });
    });

    // Milk buttons
    document.querySelectorAll('.modal-milk-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeModalState.milk = {
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price) || 0
        };
        this.renderModalContent();
      });
    });

    // Dessert sweet buttons
    document.querySelectorAll('.modal-dessert-sweet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeModalState.sweetness = btn.dataset.name;
        this.renderModalContent();
      });
    });

    // Sweetness dropdown
    const sweetEl = document.getElementById('modal-sweetness-select');
    if (sweetEl) {
      sweetEl.addEventListener('change', (e) => {
        activeModalState.sweetness = e.target.value;
      });
    }

    // Syrup dropdown
    const syrupEl = document.getElementById('modal-syrup-select');
    if (syrupEl) {
      syrupEl.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        activeModalState.syrup = {
          name: e.target.value,
          price: parseFloat(opt?.dataset?.price) || 0
        };
        this.renderModalContent();
      });
    }

    // Dressing dropdown
    const dressEl = document.getElementById('modal-dressing-select');
    if (dressEl) {
      dressEl.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        activeModalState.dressing = {
          name: e.target.value,
          price: parseFloat(opt?.dataset?.price) || 0
        };
        this.renderModalContent();
      });
    }

    // Spice buttons
    document.querySelectorAll('.modal-spice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeModalState.spice = parseInt(btn.dataset.spice) || 0;
        this.renderModalContent();
      });
    });

    // Addons toggle buttons
    document.querySelectorAll('.modal-addon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price) || 0;
        const idx = activeModalState.addOns.findIndex(a => a.name === name);
        if (idx >= 0) {
          activeModalState.addOns.splice(idx, 1);
        } else {
          activeModalState.addOns.push({ name, price });
        }
        this.renderModalContent();
      });
    });

    // Notes input
    const notesInput = document.getElementById('modal-notes-input');
    if (notesInput) {
      notesInput.addEventListener('input', (e) => {
        activeModalState.notes = e.target.value;
      });
    }
  },

  adjustModalQty(delta) {
    if (!activeModalState) return;
    const newQty = activeModalState.quantity + delta;
    if (newQty >= 1 && newQty <= 50) {
      activeModalState.quantity = newQty;
      this.renderModalContent();
    }
  },

  confirmCustomize() {
    if (!activeModalState) return;

    const item = activeModalState.product;
    const notesInput = document.getElementById('modal-notes-input');
    if (notesInput) activeModalState.notes = notesInput.value;

    let unitPrice = activeModalState.basePrice + (activeModalState.size?.price || 0);
    if (activeModalState.milk) unitPrice += activeModalState.milk.price;
    if (activeModalState.syrup) unitPrice += activeModalState.syrup.price;
    if (activeModalState.dressing) unitPrice += activeModalState.dressing.price;
    unitPrice += activeModalState.addOns.reduce((sum, a) => sum + a.price, 0);

    // Build readable detail string
    const details = [];
    if (activeModalState.size?.name) details.push(activeModalState.size.name);
    if (activeModalState.temperature) details.push(activeModalState.temperature);
    if (activeModalState.milk && activeModalState.milk.name !== 'Pure Black / None') details.push(activeModalState.milk.name);
    if (activeModalState.sweetness) details.push(activeModalState.sweetness);
    if (activeModalState.syrup && activeModalState.syrup.name !== 'None (Pure)') details.push(`w/ ${activeModalState.syrup.name}`);
    if (activeModalState.dressing && activeModalState.dressing.name !== 'Chef Recommended Dressing') details.push(activeModalState.dressing.name);
    if (activeModalState.spice > 0) details.push(`Spice: ${'🌶️'.repeat(activeModalState.spice)}`);
    if (activeModalState.addOns.length > 0) details.push(`+ ${activeModalState.addOns.map(a => a.name.replace('+ ', '')).join(', ')}`);
    if (activeModalState.notes && activeModalState.notes.trim()) details.push(`Note: "${activeModalState.notes.trim()}"`);

    const customDetailStr = details.join(' • ');

    Cart.addItem(
      {
        id: item.id,
        name: item.name,
        price: unitPrice,
        image: item.image
      },
      activeModalState.quantity,
      customDetailStr
    );

    this.closeCustomizeModal();
  },

  closeCustomizeModal() {
    const modalEl = document.getElementById('customize-modal');
    if (modalEl) modalEl.classList.remove('open');
    document.body.style.overflow = '';
    activeModalState = null;
  },

  bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    // Category pills
    document.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategory = pill.dataset.category || 'All';
        this.loadMenu();
      });
    });

    // Search input
    const searchInput = document.getElementById('menu-search-input');
    const clearSearchBtn = document.getElementById('menu-search-clear');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        if (clearSearchBtn) {
          clearSearchBtn.classList.toggle('hidden', !currentSearch);
        }
        this.loadMenu();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        currentSearch = '';
        clearSearchBtn.classList.add('hidden');
        this.loadMenu();
      });
    }

    // Sort select
    const sortSelect = document.getElementById('menu-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        this.renderMenu();
      });
    }

    // Filter tags
    document.querySelectorAll('.filter-tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filterKey = btn.dataset.filter;
        activeFilters[filterKey] = !activeFilters[filterKey];
        btn.classList.toggle('bg-stone-900', activeFilters[filterKey]);
        btn.classList.toggle('text-white', activeFilters[filterKey]);
        this.renderMenu();
      });
    });

    // Clear all filters button
    const clearAllBtn = document.getElementById('menu-clear-all-filters');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.resetAllFilters();
      });
    }

    // Close modal on backdrop click
    const modalEl = document.getElementById('customize-modal');
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
          this.closeCustomizeModal();
        }
      });
    }

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('customize-modal');
        if (modal && modal.classList.contains('open')) {
          this.closeCustomizeModal();
        }
      }
    });
  }
};

window.Menu = Menu;
window.openCustomizeModal = (id) => Menu.openCustomizeModal(id);
