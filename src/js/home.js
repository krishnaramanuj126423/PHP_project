/* Maison Rosa II - Home View Controller */
import { API } from './api.js';
import { Menu } from './menu.js';
import { Cart } from './cart.js';
import { showToast, switchView } from './main.js';

let homeFeaturedProducts = [];

export const Home = {
  async init() {
    this.bindEvents();
    await this.loadFeaturedOfferings();
  },

  async loadFeaturedOfferings() {
    const container = document.getElementById('home-featured-grid');
    if (!container) return;

    try {
      const data = await API.getMenu('All', '');
      const products = data.products || [];
      // Pick top 4 curated featured/bestseller items
      homeFeaturedProducts = products.filter(p => p.isFeatured || p.isBestseller).slice(0, 4);
      if (homeFeaturedProducts.length === 0) {
        homeFeaturedProducts = products.slice(0, 4);
      }
      this.renderFeaturedGrid();
    } catch (err) {
      console.warn('Could not load home featured products', err);
    }
  },

  renderFeaturedGrid() {
    const container = document.getElementById('home-featured-grid');
    if (!container || homeFeaturedProducts.length === 0) return;

    container.innerHTML = homeFeaturedProducts.map(item => `
      <div class="rosa-card flex flex-col group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-[#1C1814] border border-[#332A22]">
        <div class="relative overflow-hidden aspect-[4/3] bg-[#141210]">
          <img src="${item.image}" alt="${item.name}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          
          <div class="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            ${item.isBestseller ? `<span class="bg-amber-600 text-stone-950 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md"><i class="fa-solid fa-star text-[9px] mr-1"></i>Bestseller</span>` : ''}
            ${item.isNew ? `<span class="bg-stone-900 text-amber-400 border border-amber-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">New</span>` : ''}
          </div>

          <div class="absolute top-3 right-3 flex gap-1.5 z-10">
            ${item.isVegetarian ? `<span class="diet-tag diet-veg shadow-md">VEG</span>` : ''}
            ${item.isVegan ? `<span class="diet-tag diet-vegan shadow-md">VEGAN</span>` : ''}
          </div>

          <div class="absolute bottom-3 left-3 bg-stone-950/85 border border-stone-700/60 backdrop-blur-sm text-stone-200 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium">
            ${item.category}
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <h3 class="font-serif text-xl font-bold text-stone-100 leading-snug group-hover:text-amber-400 transition-colors">${item.name}</h3>
              <span class="font-serif font-bold text-xl text-amber-400 whitespace-nowrap">₹${item.price.toFixed(2)}</span>
            </div>
            
            <p class="text-stone-300 text-xs line-clamp-2 mb-3.5 leading-relaxed">${item.description}</p>
            
            <div class="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
              <span class="bg-amber-950/70 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-md font-semibold">
                <i class="fa-solid fa-fire text-amber-400 text-[10px] mr-1"></i>${item.calories} kcal
              </span>
              <span class="text-stone-300 font-medium ml-auto">
                <i class="fa-solid fa-star text-amber-400 text-[10px]"></i> ${item.rating} <span class="text-stone-400">(${item.reviewsCount})</span>
              </span>
            </div>
          </div>

          <div class="flex gap-2 pt-3.5 border-t border-[#332A22]">
            <button class="btn-rosa text-xs py-2.5 px-3 flex-1 flex items-center justify-center gap-1.5 shadow-md" onclick="Home.quickAdd('${item.id}')">
              <i class="fa-solid fa-cart-plus"></i>
              <span>Quick Add</span>
            </button>
            <button class="btn-rosa-outline text-xs py-2.5 px-3.5 flex items-center justify-center gap-1.5 border-amber-500/50 text-stone-200 hover:bg-amber-500 hover:text-stone-950 transition-colors" onclick="Home.customize('${item.id}')">
              <i class="fa-solid fa-sliders text-[11px]"></i>
              <span>Customize</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  quickAdd(productId) {
    const item = homeFeaturedProducts.find(p => p.id === productId);
    if (item) {
      Cart.addItem(item, 1);
    }
  },

  customize(productId) {
    // If Menu has customize modal, trigger it
    if (typeof Menu !== 'undefined' && Menu.openCustomizeModal) {
      Menu.openCustomizeModal(productId);
    } else {
      const item = homeFeaturedProducts.find(p => p.id === productId);
      if (item) Cart.addItem(item, 1);
    }
  },

  bindEvents() {
    // Newsletter form submit
    const newsletterForm = document.getElementById('home-newsletter-form');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('home-newsletter-email');
        if (input && input.value) {
          showToast(`Thank you! Exclusive invitations sent to ${input.value}`);
          input.value = '';
        }
      });
    }

    // Quick reserve button
    const reserveBtn = document.getElementById('home-quick-reserve-btn');
    if (reserveBtn) {
      reserveBtn.addEventListener('click', () => {
        showToast('Table reservations: Please call +1 (555) 019-8822 or select Dine-In at checkout.');
      });
    }
  }
};

window.Home = Home;
