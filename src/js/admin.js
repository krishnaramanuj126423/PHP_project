/* ==================== ADVANCED ADMIN MANAGEMENT MODULE ==================== */
import { API } from './api.js';
import { showToast, switchView } from './main.js';
import { getDefaultCustomizationOptions } from './menu.js';
import { Auth } from './auth.js';

let activeTab = 'overview';
let builderSubTab = 'brew';
let cachedBuildersConfig = null;
let orderFilter = 'all';
let orderTypeFilter = 'all';
let orderSearch = '';
let productCategoryFilter = 'All';
let productSearch = '';
let customerSearch = '';
let soundEnabled = true;
let refreshInterval = null;

// Audio notification chime using Web Audio API
function playChime() {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio context muted or blocked
  }
}

export const Admin = {
  activeTab,

  async init() {
    if (!Auth.isAdmin()) {
      this.renderAccessGate();
      return;
    }

    this.renderSidebar();
    await this.loadTab(activeTab);

    // Auto refresh every 20 seconds for live order tracking
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
      if (Auth.isAdmin() && (activeTab === 'orders' || activeTab === 'overview')) {
        this.loadTab(activeTab, true);
      }
    }, 20000);
  },

  renderAccessGate() {
    const sidebarEl = document.getElementById('admin-sidebar-nav');
    const contentEl = document.getElementById('admin-content-area');
    if (sidebarEl) sidebarEl.innerHTML = '';
    if (!contentEl) return;

    const currentUser = Auth.getUser();

    contentEl.innerHTML = `
      <div class="max-w-md mx-auto my-12 bg-[#1C1814] p-8 md:p-10 rounded-3xl border border-[#382F26] shadow-2xl text-center">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl mx-auto mb-4 border border-amber-500/30">
          <i class="fa-solid fa-shield-halved"></i>
        </div>
        <span class="editorial-badge mb-2"><i class="fa-solid fa-lock"></i> Restricted Staff Access</span>
        <h2 class="font-serif text-3xl font-bold text-[#FAF6F2] mb-2">Manager Operations Portal</h2>
        <p class="text-xs text-[#B5A596] mb-6 leading-relaxed">
          ${currentUser ? `You are signed in as <strong class="text-white">${currentUser.name}</strong> (${currentUser.email}), but manager privileges are required to access this portal.` : 'Please authenticate with administrative credentials to access live KDS, sales analytics, and menu management.'}
        </p>

        <form id="admin-gate-login-form" class="space-y-4 text-left">
          <div>
            <label class="block text-xs font-bold text-[#E2D6C8] mb-1">Admin Email</label>
            <div class="relative">
              <span class="absolute left-3.5 top-3 text-[#B5A596] text-xs"><i class="fa-solid fa-envelope"></i></span>
              <input type="email" id="admin-gate-email" required value="admin@rosa.cafe" class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#382F26] bg-[#241E19] text-[#FAF6F2] text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-[#E2D6C8] mb-1">Manager Password</label>
            <div class="relative">
              <span class="absolute left-3.5 top-3 text-[#B5A596] text-xs"><i class="fa-solid fa-lock"></i></span>
              <input type="password" id="admin-gate-password" required value="admin123" class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#382F26] bg-[#241E19] text-[#FAF6F2] text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
            </div>
          </div>

          <button type="submit" id="btn-admin-gate-submit" class="btn-rosa text-xs w-full py-3.5 mt-2 shadow-lg flex items-center justify-center gap-2 font-bold">
            <i class="fa-solid fa-key"></i> <span>Authenticate as Manager</span>
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-[#382F26] flex items-center justify-between text-xs text-[#B5A596]">
          <button class="hover:text-amber-400 transition-colors flex items-center gap-1.5" onclick="switchView('home')">
            <i class="fa-solid fa-arrow-left"></i> Return to Storefront
          </button>
          <span class="font-mono text-[10px] text-amber-500/80">Demo: admin@rosa.cafe / admin123</span>
        </div>
      </div>
    `;

    document.getElementById('admin-gate-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-gate-email')?.value?.trim();
      const pass = document.getElementById('admin-gate-password')?.value;
      const btn = document.getElementById('btn-admin-gate-submit');

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Verifying...</span>`;
      }

      const res = await Auth.login(email, pass);
      if (res && res.success && res.user.role === 'admin') {
        Admin.init();
      } else {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-key"></i> <span>Authenticate as Manager</span>`;
        }
      }
    });
  },

  renderSidebar() {
    const sidebarEl = document.getElementById('admin-sidebar-nav');
    if (!sidebarEl) return;

    const navItems = [
      { id: 'overview', label: 'Command Overview', icon: 'fa-chart-pie' },
      { id: 'orders', label: 'Kitchen & Orders (KDS)', icon: 'fa-bag-shopping' },
      { id: 'products', label: 'Menu & Inventory', icon: 'fa-utensils' },
      { id: 'builders', label: 'Custom Builders Pricing', icon: 'fa-wand-magic-sparkles' },
      { id: 'coupons', label: 'Promotions & Coupons', icon: 'fa-ticket' },
      { id: 'customers', label: 'Patron CRM & Loyalty', icon: 'fa-users' },
      { id: 'settings', label: 'Café Operations', icon: 'fa-sliders' }
    ];

    sidebarEl.innerHTML = `
      <div>
        <div class="flex items-center gap-3 px-3 py-2 mb-6 border-b border-stone-800 pb-4">
          <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/30">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h4 class="font-serif font-bold text-white text-sm">Antiquity Cafe</h4>
            <span class="text-[11px] text-amber-400 font-mono font-medium">Manager Portal</span>
          </div>
        </div>

        <nav class="space-y-1">
          ${navItems.map(item => `
            <div class="admin-nav-item ${activeTab === item.id ? 'active' : ''}" onclick="Admin.switchTab('${item.id}')">
              <i class="fa-solid ${item.icon} w-5 text-center"></i>
              <span>${item.label}</span>
            </div>
          `).join('')}
        </nav>
      </div>

      <div class="pt-6 border-t border-stone-800/80 mt-6 space-y-2.5">
        <div class="flex items-center justify-between text-xs px-2 text-stone-400">
          <span>Audio Alert</span>
          <button class="text-xs px-2 py-1 rounded ${soundEnabled ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400'}" onclick="Admin.toggleSound()">
            <i class="fa-solid ${soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}"></i> ${soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <button class="w-full text-xs text-amber-300 hover:text-white py-2.5 px-3 rounded-xl bg-stone-900 border border-amber-500/30 hover:border-amber-400 flex items-center justify-center gap-2 transition-colors font-semibold" onclick="window.switchView('home')">
          <i class="fa-solid fa-store"></i> Back to Storefront
        </button>

        <button class="w-full text-xs text-stone-400 hover:text-red-400 py-2 px-3 rounded-xl bg-transparent hover:bg-stone-900/60 flex items-center justify-center gap-2 transition-colors" onclick="Auth.logout()">
          <i class="fa-solid fa-right-from-bracket"></i> Sign Out Admin
        </button>
      </div>
    `;
  },

  toggleSound() {
    soundEnabled = !soundEnabled;
    if (soundEnabled) playChime();
    showToast(`Order sound chime ${soundEnabled ? 'Enabled' : 'Disabled'}`);
    this.renderSidebar();
  },

  async switchTab(tabId) {
    activeTab = tabId;
    this.activeTab = tabId;
    this.renderSidebar();
    await this.loadTab(tabId);
  },

  async loadTab(tabId, isSilent = false) {
    const contentEl = document.getElementById('admin-content-area');
    if (!contentEl) return;

    if (!isSilent) {
      contentEl.innerHTML = `<div class="py-16 text-center text-stone-500"><i class="fa-solid fa-spinner fa-spin text-3xl mb-3 text-amber-700"></i><p class="text-xs">Loading ${tabId} suite...</p></div>`;
    }

    try {
      if (tabId === 'overview') {
        await this.renderOverview(contentEl);
      } else if (tabId === 'orders') {
        await this.renderOrders(contentEl);
      } else if (tabId === 'products') {
        await this.renderProducts(contentEl);
      } else if (tabId === 'builders') {
        await this.renderBuilders(contentEl);
      } else if (tabId === 'coupons') {
        await this.renderCoupons(contentEl);
      } else if (tabId === 'customers') {
        await this.renderCustomers(contentEl);
      } else if (tabId === 'settings') {
        await this.renderSettings(contentEl);
      }
    } catch (err) {
      contentEl.innerHTML = `<div class="p-6 bg-red-50 text-red-700 rounded-xl text-xs">Error loading admin data: ${err}</div>`;
    }
  },

  /* ==================== 1. OVERVIEW & ANALYTICS ==================== */
  async renderOverview(container) {
    const [stats, storeStatus] = await Promise.all([
      API.getAdminStats(),
      API.getStoreStatus().catch(() => ({ isOpen: true, kitchenRushMode: false, estimatedWaitMinutes: 12 }))
    ]);

    const maxRev = Math.max(...(stats.revenueTrend || []).map((t) => t.revenue), 100);

    container.innerHTML = `
      <!-- Top Manager Header Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span class="editorial-badge mb-2"><i class="fa-solid fa-chart-line"></i> Real-time Operations</span>
          <h2 class="font-serif text-3xl font-bold text-stone-900">Café Operations Command</h2>
        </div>

        <div class="flex items-center gap-3 flex-wrap">
          <!-- Store Status Pill -->
          <div class="store-status-pill ${storeStatus.isOpen ? (storeStatus.kitchenRushMode ? 'store-rush' : 'store-open') : 'store-closed'}">
            <span class="w-2 h-2 rounded-full ${storeStatus.isOpen ? (storeStatus.kitchenRushMode ? 'bg-amber-500' : 'bg-green-500') : 'bg-red-500'}"></span>
            <span>${storeStatus.isOpen ? (storeStatus.kitchenRushMode ? 'Rush Mode (15m delay)' : 'Accepting Orders') : 'Kitchen Closed'}</span>
          </div>

          <button class="btn-rosa-outline text-xs py-2 px-3" onclick="Admin.loadTab('overview')">
            <i class="fa-solid fa-rotate-right mr-1"></i> Refresh
          </button>
        </div>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="admin-stat-card">
          <div class="flex justify-between items-start">
            <span class="text-xs font-bold text-stone-500 uppercase tracking-wider">Today's Revenue</span>
            <span class="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-md"><i class="fa-solid fa-arrow-trend-up"></i> +14.2%</span>
          </div>
          <h3 class="font-serif text-3xl font-bold text-stone-900 mt-2">₹${stats.todaySales.toFixed(2)}</h3>
          <p class="text-[11px] text-stone-500 mt-1">Lifetime: ₹${stats.revenue.toFixed(2)}</p>
        </div>

        <div class="admin-stat-card">
          <div class="flex justify-between items-start">
            <span class="text-xs font-bold text-stone-500 uppercase tracking-wider">Active Kitchen Queue</span>
            <span class="pulse-indicator"></span>
          </div>
          <h3 class="font-serif text-3xl font-bold text-amber-700 mt-2">${stats.pendingOrders} Orders</h3>
          <p class="text-[11px] text-stone-500 mt-1">Total completed: ${stats.completedOrders || 0}</p>
        </div>

        <div class="admin-stat-card">
          <div class="flex justify-between items-start">
            <span class="text-xs font-bold text-stone-500 uppercase tracking-wider">Inventory Health</span>
            <span class="text-xs ${stats.lowStockProducts > 0 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'} px-2 py-0.5 rounded-md font-semibold">
              ${stats.lowStockProducts} Low Stock
            </span>
          </div>
          <h3 class="font-serif text-3xl font-bold text-stone-900 mt-2">${stats.totalProducts} Items</h3>
          <p class="text-[11px] text-stone-500 mt-1"><a href="javascript:Admin.switchTab('products')" class="text-amber-700 underline font-medium">Manage stock levels</a></p>
        </div>

        <div class="admin-stat-card">
          <div class="flex justify-between items-start">
            <span class="text-xs font-bold text-stone-500 uppercase tracking-wider">Patron Community</span>
            <span class="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">${stats.loyaltyRedemptions} Rewards Claimed</span>
          </div>
          <h3 class="font-serif text-3xl font-bold text-stone-900 mt-2">${stats.totalCustomers} Patrons</h3>
          <p class="text-[11px] text-stone-500 mt-1"><a href="javascript:Admin.switchTab('customers')" class="text-amber-700 underline font-medium">View CRM & Stamps</a></p>
        </div>
      </div>

      <!-- Charts & Visual Analytics Section -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- 7-Day Revenue Trend Chart -->
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="font-serif text-xl font-bold text-stone-900">7-Day Sales Volume Trend</h3>
              <p class="text-xs text-stone-500">Gross revenue performance across the past 7 days</p>
            </div>
            <span class="text-xs font-semibold bg-stone-100 px-3 py-1 rounded-full text-stone-700">Weekly Total: ₹4,982.05</span>
          </div>

          <!-- Bar Chart Visualizer -->
          <div class="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-stone-100">
            ${(stats.revenueTrend || []).map((t) => {
              const heightPct = Math.max(15, Math.round((t.revenue / maxRev) * 100));
              return `
                <div class="flex-1 flex flex-col items-center gap-2 group relative">
                  <!-- Hover Tooltip -->
                  <div class="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900 text-white text-[10px] font-mono py-1 px-2 rounded pointer-events-none z-10 whitespace-nowrap shadow-lg">
                    ₹${t.revenue.toFixed(2)}
                  </div>
                  <div class="w-full bg-amber-100 group-hover:bg-amber-600 rounded-t-lg transition-all duration-300" style="height: ${heightPct}%"></div>
                  <span class="text-[11px] font-semibold text-stone-600">${t.day}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Peak Hours & Kitchen Service Heatmap -->
        <div class="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 class="font-serif text-xl font-bold text-stone-900 mb-1">Peak Service Rush</h3>
            <p class="text-xs text-stone-500 mb-6">Hourly order density & table capacity</p>

            <div class="space-y-4 text-xs">
              <div>
                <div class="flex justify-between font-semibold text-stone-800 mb-1">
                  <span>Morning Roastery (7:00 – 10:30 AM)</span>
                  <span class="text-amber-700 font-bold">94% Capacity</span>
                </div>
                <div class="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div class="h-full bg-amber-600 rounded-full" style="width: 94%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between font-semibold text-stone-800 mb-1">
                  <span>Lunch Artisan Meals (12:00 – 2:30 PM)</span>
                  <span class="text-amber-700 font-bold">88% Capacity</span>
                </div>
                <div class="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div class="h-full bg-amber-500 rounded-full" style="width: 88%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between font-semibold text-stone-800 mb-1">
                  <span>Afternoon Pastry & Tea (3:30 – 5:30 PM)</span>
                  <span class="text-stone-600">62% Capacity</span>
                </div>
                <div class="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div class="h-full bg-stone-400 rounded-full" style="width: 62%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between font-semibold text-stone-800 mb-1">
                  <span>Evening Bistro Service (6:00 – 9:30 PM)</span>
                  <span class="text-stone-700 font-bold">78% Capacity</span>
                </div>
                <div class="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div class="h-full bg-amber-700 rounded-full" style="width: 78%"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Avg Preparation Time:</span>
            <span class="font-bold text-stone-900">7.8 Minutes</span>
          </div>
        </div>
      </div>

      <!-- Top Selling Menu Leaderboard & Quick Action Banner -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Top Menu Items -->
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-serif text-xl font-bold text-stone-900">Bestselling Menu Creations</h3>
            <button class="text-xs text-amber-700 font-semibold hover:underline" onclick="Admin.switchTab('products')">View all products &rarr;</button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-stone-700">
              <thead class="bg-stone-50 text-stone-900 uppercase font-semibold">
                <tr>
                  <th class="p-3">Product</th>
                  <th class="p-3">Category</th>
                  <th class="p-3">Price</th>
                  <th class="p-3">Stock Status</th>
                  <th class="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-100">
                ${(stats.popularProducts || []).map((p) => `
                  <tr class="hover:bg-stone-50/50">
                    <td class="p-3 flex items-center gap-3">
                      <img src="${p.image}" class="w-9 h-9 rounded-lg object-cover" />
                      <div>
                        <p class="font-bold text-stone-900">${p.name}</p>
                        <p class="text-[11px] text-stone-400">${p.calories} kcal</p>
                      </div>
                    </td>
                    <td class="p-3"><span class="bg-stone-100 px-2 py-0.5 rounded text-[11px] font-medium">${p.category}</span></td>
                    <td class="p-3 font-semibold text-stone-900">₹${p.price.toFixed(2)}</td>
                    <td class="p-3">
                      <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${p.stock < 15 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700'}">
                        ${p.stock} units
                      </span>
                    </td>
                    <td class="p-3 text-right">
                      <button class="admin-action-btn" onclick="Admin.openEditProductModal('${p.id}')">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Manager Quick Shortcuts -->
        <div class="bg-gradient-to-br from-stone-900 to-stone-950 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg mb-4">
              <i class="fa-solid fa-bolt"></i>
            </div>
            <h3 class="font-serif text-xl font-bold mb-2">Manager Quick Actions</h3>
            <p class="text-xs text-stone-400 leading-relaxed mb-6">Instantly trigger daily promotional flash sales, export audit data, or adjust store operating states.</p>

            <div class="space-y-2.5">
              <button class="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-left flex items-center justify-between transition-colors" onclick="Admin.openAddProductModal()">
                <span><i class="fa-solid fa-plus text-amber-400 mr-2"></i> Add New Menu Item</span>
                <i class="fa-solid fa-chevron-right text-stone-500 text-[10px]"></i>
              </button>

              <button class="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-left flex items-center justify-between transition-colors" onclick="Admin.openAddCouponModal()">
                <span><i class="fa-solid fa-ticket text-amber-400 mr-2"></i> Launch Promo Coupon</span>
                <i class="fa-solid fa-chevron-right text-stone-500 text-[10px]"></i>
              </button>

              <button class="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-left flex items-center justify-between transition-colors" onclick="Admin.exportOrdersCSV()">
                <span><i class="fa-solid fa-file-csv text-amber-400 mr-2"></i> Export Orders Ledger (CSV)</span>
                <i class="fa-solid fa-download text-stone-500 text-[10px]"></i>
              </button>
            </div>
          </div>

          <div class="pt-6 border-t border-stone-800 text-[11px] text-stone-400 flex justify-between items-center mt-6">
            <span>System Status: <strong class="text-green-400">All Nodes Active</strong></span>
            <span class="font-mono">v2.4.0</span>
          </div>
        </div>
      </div>
    `;
  },

  /* ==================== 2. KITCHEN DISPLAY & ORDERS (KDS) ==================== */
  async renderOrders(container) {
    const ordersData = await API.getOrders();
    const allOrders = ordersData.orders || [];

    // Filter orders
    let filtered = allOrders;
    if (orderFilter === 'active') {
      filtered = filtered.filter(o => ['Order Received', 'Confirmed', 'Preparing'].includes(o.status));
    } else if (orderFilter === 'ready') {
      filtered = filtered.filter(o => ['Ready', 'Out for Delivery'].includes(o.status));
    } else if (orderFilter === 'completed') {
      filtered = filtered.filter(o => o.status === 'Delivered');
    } else if (orderFilter === 'cancelled') {
      filtered = filtered.filter(o => o.status === 'Cancelled');
    }

    if (orderTypeFilter !== 'all') {
      filtered = filtered.filter(o => (o.orderType || '').toLowerCase() === orderTypeFilter.toLowerCase());
    }

    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      filtered = filtered.filter(o => 
        o.id.toLowerCase().includes(q) || 
        o.customerName.toLowerCase().includes(q) ||
        (o.phone && o.phone.toLowerCase().includes(q)) ||
        (o.address && o.address.toLowerCase().includes(q))
      );
    }

    const activeCount = allOrders.filter(o => ['Order Received', 'Confirmed', 'Preparing'].includes(o.status)).length;
    const readyCount = allOrders.filter(o => ['Ready', 'Out for Delivery'].includes(o.status)).length;
    const completedCount = allOrders.filter(o => o.status === 'Delivered').length;

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span class="editorial-badge mb-2"><i class="fa-solid fa-utensils"></i> Live Kitchen Stream</span>
          <h2 class="font-serif text-3xl font-bold text-stone-900">Orders & Fulfillment (KDS)</h2>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn-rosa text-xs py-2 px-4" onclick="Admin.exportOrdersCSV()">
            <i class="fa-solid fa-file-export mr-1"></i> Export CSV
          </button>
          <button class="btn-rosa-outline text-xs py-2 px-3" onclick="Admin.loadTab('orders')">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
        </div>
      </div>

      <!-- Filter Controls & Search -->
      <div class="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm mb-6 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Status Tabs -->
          <div class="flex flex-wrap gap-1.5">
            <button class="category-pill ${orderFilter === 'all' ? 'active' : ''}" onclick="Admin.setOrderFilter('all')">
              All Orders (${allOrders.length})
            </button>
            <button class="category-pill ${orderFilter === 'active' ? 'active' : ''}" onclick="Admin.setOrderFilter('active')">
              <span class="pulse-indicator mr-1"></span> Active Kitchen (${activeCount})
            </button>
            <button class="category-pill ${orderFilter === 'ready' ? 'active' : ''}" onclick="Admin.setOrderFilter('ready')">
              Ready for Pickup (${readyCount})
            </button>
            <button class="category-pill ${orderFilter === 'completed' ? 'active' : ''}" onclick="Admin.setOrderFilter('completed')">
              Completed (${completedCount})
            </button>
            <button class="category-pill ${orderFilter === 'cancelled' ? 'active' : ''}" onclick="Admin.setOrderFilter('cancelled')">
              Cancelled
            </button>
          </div>

          <!-- Fulfillment Type Selector -->
          <select class="text-xs p-2 rounded-xl border border-stone-300 bg-stone-50 font-medium" onchange="Admin.setOrderTypeFilter(this.value)">
            <option value="all" ${orderTypeFilter === 'all' ? 'selected' : ''}>All Fulfillment Types</option>
            <option value="Dine-in" ${orderTypeFilter === 'Dine-in' ? 'selected' : ''}>🍽️ Dine-In Tables</option>
            <option value="Takeaway" ${orderTypeFilter === 'Takeaway' ? 'selected' : ''}>🛍️ Counter Takeaway</option>
            <option value="Delivery" ${orderTypeFilter === 'Delivery' ? 'selected' : ''}>🚚 Gourmet Delivery</option>
          </select>
        </div>

        <!-- Live Search Input -->
        <div class="relative">
          <span class="absolute left-3.5 top-3 text-stone-400 text-xs"><i class="fa-solid fa-magnifying-glass"></i></span>
          <input type="text" placeholder="Search orders by Order ID (ORD-1234), customer name, phone, or address..." value="${orderSearch}" class="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50/50" oninput="Admin.setOrderSearch(this.value)" />
        </div>
      </div>

      <!-- Orders List Display -->
      ${filtered.length === 0 ? `
        <div class="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-500">
          <i class="fa-solid fa-clipboard-check text-4xl text-stone-300 mb-3"></i>
          <p class="font-serif text-lg font-bold text-stone-800">No Orders Found</p>
          <p class="text-xs text-stone-400 mt-1">There are no orders matching the selected filter criteria.</p>
        </div>
      ` : `
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          ${filtered.map(o => {
            let statusClass = 'status-received';
            if (o.status === 'Confirmed') statusClass = 'status-confirmed';
            else if (o.status === 'Preparing') statusClass = 'status-preparing';
            else if (o.status === 'Ready') statusClass = 'status-ready';
            else if (o.status === 'Out for Delivery') statusClass = 'status-delivery';
            else if (o.status === 'Delivered') statusClass = 'status-delivered';
            else if (o.status === 'Cancelled') statusClass = 'status-cancelled';

            const nextStatusMap = {
              'Order Received': 'Preparing',
              'Confirmed': 'Preparing',
              'Preparing': 'Ready',
              'Ready': o.orderType === 'Delivery' ? 'Out for Delivery' : 'Delivered',
              'Out for Delivery': 'Delivered'
            };
            const nextStatus = nextStatusMap[o.status];

            return `
              <div class="kds-order-card shadow-sm flex flex-col justify-between">
                <div>
                  <div class="flex justify-between items-start gap-2 mb-3 border-b border-stone-100 pb-3">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-stone-900 text-base">${o.id}</span>
                        <span class="status-badge ${statusClass}">${o.status}</span>
                      </div>
                      <p class="text-xs text-stone-500 mt-1">
                        <i class="fa-solid fa-clock text-[10px] mr-1"></i> ${new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; 
                        <span class="font-semibold text-stone-700">${o.orderType}</span>
                      </p>
                    </div>

                    <div class="text-right">
                      <span class="font-serif text-xl font-bold text-stone-900">₹${o.total.toFixed(2)}</span>
                      <p class="text-[10px] text-stone-400">${o.items.length} item(s)</p>
                      <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 mt-1 rounded-md ${o.paymentStatus === 'Paid' || !o.paymentStatus ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}">
                        <i class="fa-solid fa-credit-card text-[9px]"></i> ${o.paymentMethod || 'Razorpay'} (${o.paymentStatus || 'Paid'})
                      </span>
                    </div>
                  </div>

                  <!-- Customer Details -->
                  <div class="bg-stone-50 p-3 rounded-xl mb-3 text-xs text-stone-700">
                    <div class="flex justify-between items-center mb-1">
                      <span class="font-bold text-stone-900">${o.customerName}</span>
                      <a href="tel:${o.phone}" class="text-amber-700 font-semibold hover:underline"><i class="fa-solid fa-phone text-[10px]"></i> ${o.phone || 'No phone'}</a>
                    </div>
                    <p class="text-[11px] text-stone-500"><i class="fa-solid fa-location-dot text-[10px] mr-1"></i> ${o.address || 'In-store counter'}</p>
                  </div>

                  <!-- Item Line Details -->
                  <div class="space-y-2 mb-4 text-xs">
                    ${o.items.map(item => `
                      <div class="flex justify-between items-start border-b border-dashed border-stone-100 pb-1.5">
                        <div>
                          <span class="font-bold text-stone-900">${item.quantity}x ${item.name}</span>
                          ${item.customDetails ? `
                            <p class="text-[11px] text-amber-800 font-medium pl-3 mt-0.5">&#8627; ${item.customDetails}</p>
                          ` : ''}
                        </div>
                        <span class="font-medium text-stone-700">₹${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Footer Operations & Status Jump -->
                <div class="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <select class="text-xs py-1.5 px-2 rounded-lg border border-stone-300 font-semibold" onchange="Admin.updateOrderStatus('${o.id}', this.value)">
                      <option value="Order Received" ${o.status === 'Order Received' ? 'selected' : ''}>Received</option>
                      <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                      <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                      <option value="Ready" ${o.status === 'Ready' ? 'selected' : ''}>Ready</option>
                      <option value="Out for Delivery" ${o.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                      <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                      <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>

                    <button class="admin-action-btn text-xs" onclick="Admin.printReceipt('${o.id}')" title="Print Kitchen Thermal Slip">
                      <i class="fa-solid fa-print"></i> Slip
                    </button>
                  </div>

                  ${nextStatus ? `
                    <button class="btn-rosa text-xs py-1.5 px-3 bg-amber-700 text-white font-bold rounded-lg hover:bg-amber-800 shadow-sm" onclick="Admin.updateOrderStatus('${o.id}', '${nextStatus}')">
                      Next: ${nextStatus} &rarr;
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },

  setOrderFilter(filter) {
    orderFilter = filter;
    this.renderOrders(document.getElementById('admin-content-area'));
  },

  setOrderTypeFilter(type) {
    orderTypeFilter = type;
    this.renderOrders(document.getElementById('admin-content-area'));
  },

  setOrderSearch(query) {
    orderSearch = query;
    this.renderOrders(document.getElementById('admin-content-area'));
  },

  async updateOrderStatus(id, status) {
    await API.updateOrderStatus(id, status);
    showToast(`Order ${id} is now "${status}"`);
    this.renderOrders(document.getElementById('admin-content-area'));
  },

  /* ==================== 3. PRODUCT CATALOG & INVENTORY ==================== */
  async renderProducts(container) {
    const menuData = await API.getMenu('All');
    let products = menuData.products || [];

    if (productCategoryFilter !== 'All') {
      products = products.filter(p => p.category.toLowerCase() === productCategoryFilter.toLowerCase());
    }

    if (productSearch) {
      const q = productSearch.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }

    const categories = ['All', ...(menuData.categories || ['Coffee', 'Signature Drinks', 'Breakfast', 'Mains', 'Pastries', 'Dessert'])];
    const lowStockCount = (menuData.products || []).filter((p) => p.stock < 15).length;

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span class="editorial-badge mb-2"><i class="fa-solid fa-boxes-stacked"></i> Inventory Master</span>
          <h2 class="font-serif text-3xl font-bold text-stone-900">Menu & Product Management</h2>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn-rosa text-xs py-2 px-4" onclick="Admin.openAddProductModal()">
            <i class="fa-solid fa-plus mr-1"></i> Add New Product
          </button>
          <button class="btn-rosa-outline text-xs py-2 px-3" onclick="Admin.exportInventoryCSV()">
            <i class="fa-solid fa-download mr-1"></i> Export Inventory
          </button>
        </div>
      </div>

      <!-- Category Filter Pills & Search -->
      <div class="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm mb-6 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap gap-1.5">
            ${categories.map(cat => `
              <button class="category-pill ${productCategoryFilter === cat ? 'active' : ''}" onclick="Admin.setProductCategory('${cat}')">
                ${cat}
              </button>
            `).join('')}
          </div>

          <div class="text-xs font-semibold text-stone-500">
            Total: <strong>${(menuData.products || []).length}</strong> items &bull; 
            <span class="${lowStockCount > 0 ? 'text-red-600 font-bold' : 'text-green-600'}">${lowStockCount} Low Stock</span>
          </div>
        </div>

        <div class="relative">
          <span class="absolute left-3.5 top-3 text-stone-400 text-xs"><i class="fa-solid fa-magnifying-glass"></i></span>
          <input type="text" placeholder="Search menu catalog by name or description..." value="${productSearch}" class="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50/50" oninput="Admin.setProductSearch(this.value)" />
        </div>
      </div>

      <!-- Products Master Table -->
      <div class="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-stone-700">
            <thead class="bg-stone-100 text-stone-900 uppercase font-semibold">
              <tr>
                <th class="p-3">Product</th>
                <th class="p-3">Category</th>
                <th class="p-3">Price</th>
                <th class="p-3">Stock & Quick Adjust</th>
                <th class="p-3">Dietary / Tags</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100">
              ${products.map(p => `
                <tr class="hover:bg-stone-50/60 transition-colors">
                  <td class="p-3 flex items-center gap-3">
                    <img src="${p.image}" class="w-12 h-12 object-cover rounded-xl border border-stone-200" />
                    <div>
                      <p class="font-bold text-stone-900 text-sm">${p.name}</p>
                      <p class="text-[11px] text-stone-400 line-clamp-1 max-w-xs">${p.description}</p>
                      <span class="text-[10px] text-stone-500 font-mono">${p.calories} kcal</span>
                    </div>
                  </td>
                  <td class="p-3"><span class="bg-stone-100 text-stone-800 px-2.5 py-1 rounded-md font-semibold text-[11px]">${p.category}</span></td>
                  <td class="p-3">
                    <div class="flex items-center gap-1.5">
                      <span class="font-serif font-bold text-stone-900 text-sm">₹${p.price.toFixed(2)}</span>
                      <button class="text-stone-400 hover:text-amber-700 p-1" onclick="Admin.openQuickPriceModal('${p.id}', ${p.price}, '${p.name.replace(/'/g, "\\'")}')" title="Quick Edit Base Price">
                        <i class="fa-solid fa-pen text-[10px]"></i>
                      </button>
                    </div>
                  </td>
                  <td class="p-3">
                    <div class="flex items-center gap-1.5">
                      <span class="px-2 py-0.5 rounded-full text-xs font-bold ${p.stock < 15 ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800'}">
                        ${p.stock} units
                      </span>
                      <button class="px-1.5 py-0.5 rounded bg-stone-200 hover:bg-stone-300 font-bold text-[11px]" onclick="Admin.adjustStock('${p.id}', -5)" title="Deduct 5">-5</button>
                      <button class="px-1.5 py-0.5 rounded bg-stone-200 hover:bg-stone-300 font-bold text-[11px]" onclick="Admin.adjustStock('${p.id}', 5)" title="Add 5">+5</button>
                      <button class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold text-[11px]" onclick="Admin.adjustStock('${p.id}', 25)" title="Restock +25">+25</button>
                    </div>
                  </td>
                  <td class="p-3">
                    <div class="flex flex-wrap gap-1">
                      ${p.isVegetarian ? `<span class="diet-veg text-[10px] px-1.5 py-0.5 rounded font-bold">VEG</span>` : ''}
                      ${p.isVegan ? `<span class="diet-vegan text-[10px] px-1.5 py-0.5 rounded font-bold">VEGAN</span>` : ''}
                      ${p.isBestseller ? `<span class="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5 rounded font-bold">★ TOP</span>` : ''}
                    </div>
                  </td>
                  <td class="p-3 text-right space-x-1 whitespace-nowrap">
                    <button class="admin-action-btn border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100" onclick="Admin.openCustomizePricingModal('${p.id}')" title="Configure Customization Options & Pricing">
                      <i class="fa-solid fa-sliders text-amber-700"></i> Customize Prices
                    </button>
                    <button class="admin-action-btn" onclick="Admin.openEditProductModal('${p.id}')">
                      <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button class="text-stone-400 hover:text-red-600 p-2" onclick="Admin.deleteProduct('${p.id}')" title="Delete Product">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  setProductCategory(cat) {
    productCategoryFilter = cat;
    this.renderProducts(document.getElementById('admin-content-area'));
  },

  setProductSearch(query) {
    productSearch = query;
    this.renderProducts(document.getElementById('admin-content-area'));
  },

  async adjustStock(productId, delta) {
    await API.quickStockAdjust(productId, delta);
    showToast(`Stock updated (${delta > 0 ? '+' + delta : delta})`);
    this.renderProducts(document.getElementById('admin-content-area'));
  },

  openQuickPriceModal(id, currentPrice, productName) {
    this.showModal(`
      <div class="p-6 max-w-sm w-full">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
            <i class="fa-solid fa-tag"></i> Quick Price Update
          </span>
          <button class="text-stone-400 hover:text-stone-700 text-xl leading-none" onclick="Admin.closeModal()">&times;</button>
        </div>

        <form onsubmit="Admin.submitQuickPrice(event, '${id}')" class="space-y-4 text-left">
          <div>
            <h3 class="font-serif text-xl font-bold text-stone-900 mb-1">Update Item Price</h3>
            <p class="text-xs text-stone-500 font-medium">${productName}</p>
          </div>

          <div>
            <label class="block font-bold text-xs text-stone-700 mb-1.5">New Base Price (₹)</label>
            <div class="relative">
              <span class="absolute left-3.5 top-2.5 text-stone-400 font-bold text-sm">₹</span>
              <input type="number" step="0.01" min="0" id="quick-price-input" value="${currentPrice}" required autofocus class="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 font-serif font-bold text-base bg-white focus:outline-none focus:border-amber-600 shadow-sm" />
            </div>
            <p class="text-[11px] text-stone-400 mt-1.5">This price will immediately update across all customer menus, cart checkout, and digital receipts.</p>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <button type="button" class="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors" onclick="Admin.closeModal()">
              Cancel
            </button>
            <button type="submit" id="btn-save-quick-price" class="btn-rosa px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm">
              <i class="fa-solid fa-check mr-1"></i> Save Price
            </button>
          </div>
        </form>
      </div>
    `);
  },

  async submitQuickPrice(e, id) {
    e.preventDefault();
    const input = document.getElementById('quick-price-input');
    const newPrice = parseFloat(input ? input.value : '0');

    if (isNaN(newPrice) || newPrice < 0) {
      showToast('Please enter a valid price amount.');
      return;
    }

    const btn = document.getElementById('btn-save-quick-price');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...`;
    }

    try {
      await API.updateProduct(id, { price: newPrice });
      showToast(`Price updated to ₹${newPrice.toFixed(2)} and saved!`);
      this.closeModal();
      this.renderProducts(document.getElementById('admin-content-area'));
    } catch (err) {
      console.error('Failed to update price:', err);
      showToast('Failed to save price changes. Please try again.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-check mr-1"></i> Save Price`;
      }
    }
  },

  async openDeleteProductModal(id) {
    const menuData = await API.getMenu('All');
    const p = (menuData.products || []).find((x) => String(x.id).trim() === String(id).trim());
    if (!p) {
      showToast('Product not found or already removed.');
      this.renderProducts(document.getElementById('admin-content-area'));
      return;
    }

    this.showModal(`
      <div class="p-6 max-w-md w-full">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
            <i class="fa-solid fa-triangle-exclamation"></i> Permanent Menu Action
          </span>
          <button class="text-stone-400 hover:text-stone-700 text-xl leading-none" onclick="Admin.closeModal()">&times;</button>
        </div>

        <div class="text-left">
          <h3 class="font-serif text-2xl font-bold text-stone-900 mb-2">Delete Menu Item?</h3>
          <p class="text-xs text-stone-600 mb-4 leading-relaxed">
            Are you sure you want to permanently remove this product from the café catalog? This item will immediately be removed from the active menu, inventory logs, and customer ordering.
          </p>

          <!-- Item Preview Card -->
          <div class="flex items-center gap-3.5 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 mb-5">
            <img src="${p.image}" alt="${p.name}" class="w-14 h-14 object-cover rounded-xl border border-stone-200 shadow-sm" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-bold text-stone-900 text-sm truncate">${p.name}</p>
                <span class="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">${p.category}</span>
              </div>
              <p class="text-xs text-stone-700 font-serif font-bold mt-1">₹${p.price.toFixed(2)} &bull; <span class="font-sans font-normal text-stone-500">${p.stock} units in stock</span></p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
            <button type="button" class="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors" onclick="Admin.closeModal()">
              Cancel
            </button>
            <button type="button" id="btn-confirm-delete-product" class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors" onclick="Admin.confirmDeleteProduct('${p.id}')">
              <i class="fa-solid fa-trash"></i> <span>Delete Product Permanently</span>
            </button>
          </div>
        </div>
      </div>
    `);
  },

  async confirmDeleteProduct(id) {
    const btn = document.getElementById('btn-confirm-delete-product');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Deleting...</span>`;
    }

    try {
      const res = await API.deleteProduct(id);
      showToast('Product permanently deleted from menu catalog.');
      this.closeModal();
      this.renderProducts(document.getElementById('admin-content-area'));
    } catch (err) {
      console.error('Error deleting product:', err);
      showToast('Failed to delete product. Please try again.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-trash"></i> <span>Delete Product Permanently</span>`;
      }
    }
  },

  deleteProduct(id) {
    this.openDeleteProductModal(id);
  },

  /* ==================== 4. CUSTOM BUILDERS & STUDIO PRICING ==================== */
  async renderBuilders(container) {
    if (!cachedBuildersConfig || !cachedBuildersConfig.brew) {
      const res = await API.getBuildersConfig();
      cachedBuildersConfig = (res && res.config) ? res.config : (res || {});
    }

    const currentConfig = cachedBuildersConfig || {};

    const builderGroupMeta = {
      brew: [
        { key: 'sizes', title: 'Serving Sizes & Cup Volumes', icon: 'fa-expand', desc: 'Base beverage sizes with foundation pricing and liquid volumes.' },
        { key: 'coffees', title: 'Coffee Base & Espresso Style', icon: 'fa-mug-hot', desc: 'Velvety Latte, Double Espresso, Microfoam Cappuccino, Cold Brew, etc.' },
        { key: 'shots', title: 'Espresso Intensity & Extra Extraction', icon: 'fa-bolt', desc: 'Single, Double (Standard), Triple, and Quad extra shot pricing.' },
        { key: 'milks', title: 'Milks & Plant Dairy Alternatives', icon: 'fa-droplet', desc: 'Organic Whole Milk, Barista Oat, Almond, Pistachio, Cold Foam, etc.' },
        { key: 'flavors', title: 'Artisanal Syrups & Flavor Infusions', icon: 'fa-wand-magic-sparkles', desc: 'Bourbon Vanilla, Salted Caramel, Hazelnut, Honey Cardamom, Mocha, etc.' },
        { key: 'toppings', title: 'Gourmet Garnishes & Foams', icon: 'fa-sparkles', desc: 'Whipped Cream, Artisanal Drizzles, Cocoa Dust, Cinnamon, 24k Gold Leaf.' }
      ],
      meal: [
        { key: 'bases', title: 'Bases, Pastas & Warm Grains', icon: 'fa-bowl-rice', desc: 'Bronze-Cut Rigatoni, Jasmine Rice, Saffron Risotto, Sourdough, Quinoa, Greens.' },
        { key: 'proteins', title: 'Gourmet Proteins & Mains', icon: 'fa-drumstick-bite', desc: 'Tuscan Chicken, Atlantic Salmon, Prime Short Rib, Golden Paneer, Tofu, Egg.' },
        { key: 'veggies', title: 'Farm-Fresh Vegetables', icon: 'fa-carrot', desc: 'Chanterelles, Sun-Dried Tomatoes, Charred Broccolini, Cipollini Onions, Peppers, Spinach.' },
        { key: 'sauces', title: 'Signature Sauces & Dressings', icon: 'fa-bottle-droplet', desc: 'Truffle Alfredo, San Marzano Marinara, Basil Pesto, Calabrian Chili Butter, Lemon Herb.' },
        { key: 'extras', title: 'Gourmet Garnishes & Cheeses', icon: 'fa-cheese', desc: 'Aged Parmesan, Toasted Pine Nuts, Crispy Shallots, Truffle Oil, Micro-Basil.' }
      ],
      plate: [
        { key: 'mains', title: 'Grand Plate Main Specialties', icon: 'fa-plate-wheat', desc: 'Tuscan Grilled Chicken, Salmon Fillet, Truffle Rigatoni, Prime Short Rib, Cauliflower Steak.' },
        { key: 'sides', title: 'Artisanal Sides & Roast Grains', icon: 'fa-bowl-food', desc: 'Truffle Roasted Potatoes, Garlic Focaccia, Saffron Polenta, Sweet Potato Wedges, Haricots Verts.' },
        { key: 'salads', title: 'Garden Salads & Greens', icon: 'fa-seedling', desc: 'Wild Arugula & Parmesan, Heirloom Caprese, Mediterranean Quinoa, Citrus Fennel Slaw.' },
        { key: 'sauces', title: 'Signature Sauces & Dips', icon: 'fa-mortar-pestle', desc: 'Pesto Reduction, Balsamic Glaze, Truffle Herb Aioli, Chimichurri, Roasted Garlic Crème.' },
        { key: 'drinks', title: 'Beverage & Mocktail Pairings', icon: 'fa-glass-water', desc: 'Citrus Tonic, Single-Origin Cold Brew, Berry Spritz, Peach White Tea, Lemonade.' },
        { key: 'desserts', title: 'Confectionery Desserts & Tarts', icon: 'fa-cookie', desc: 'Dark Chocolate Tart, Madagascar Vanilla Gelato, Lemon Sorbet, Salted Caramel Macaron.' }
      ]
    };

    const currentMetaList = builderGroupMeta[builderSubTab] || [];
    const activeBuilderData = currentConfig[builderSubTab] || {};

    let totalOptionsCount = 0;
    currentMetaList.forEach(m => {
      const items = activeBuilderData[m.key] || [];
      totalOptionsCount += items.length;
    });

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span class="editorial-badge mb-2"><i class="fa-solid fa-wand-magic-sparkles"></i> Custom Studio Engine</span>
          <h2 class="font-serif text-3xl font-bold text-stone-900">Custom Builders & Studio Pricing</h2>
          <p class="text-xs text-stone-600 mt-1">Configure options, base prices, extra charges, calories, and icons for all 3 interactive customer builders.</p>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn-rosa text-xs py-2.5 px-4 shadow-md font-bold" onclick="Admin.saveBuildersConfig()">
            <i class="fa-solid fa-floppy-disk mr-1"></i> Save All Builder Changes
          </button>
          <button class="btn-rosa-outline text-xs py-2 px-3 text-stone-700 hover:bg-stone-100" onclick="Admin.resetBuildersConfig()" title="Restore Factory Defaults">
            <i class="fa-solid fa-rotate-left mr-1"></i> Reset Defaults
          </button>
        </div>
      </div>

      <!-- Builder Type Selector Sub-Tabs -->
      <div class="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          <button class="category-pill ${builderSubTab === 'brew' ? 'active' : ''}" onclick="Admin.setBuilderSubTab('brew')">
            <i class="fa-solid fa-mug-hot mr-1.5 text-amber-500"></i> Create Your Own Brew Studio
          </button>
          <button class="category-pill ${builderSubTab === 'meal' ? 'active' : ''}" onclick="Admin.setBuilderSubTab('meal')">
            <i class="fa-solid fa-utensils mr-1.5 text-amber-500"></i> Create Your Own Custom Meal
          </button>
          <button class="category-pill ${builderSubTab === 'plate' ? 'active' : ''}" onclick="Admin.setBuilderSubTab('plate')">
            <i class="fa-solid fa-plate-wheat mr-1.5 text-amber-500"></i> Create Your Own Grand Plate
          </button>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-stone-400 text-xs"></i>
            <input type="text" id="builder-option-search" placeholder="Filter options..." oninput="Admin.filterBuilderOptions(this.value)" class="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs bg-stone-50 text-stone-900 focus:outline-none focus:border-amber-600 w-44" />
          </div>
          <span class="text-xs bg-amber-500/10 text-amber-800 border border-amber-500/20 px-2.5 py-1 rounded-lg font-mono font-bold">
            ${totalOptionsCount} total options
          </span>
        </div>
      </div>

      <!-- Groups List -->
      <div class="space-y-6" id="builder-groups-list">
        ${currentMetaList.map(meta => {
          const items = activeBuilderData[meta.key] || [];
          return `
            <div class="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm builder-group-card" data-group-key="${meta.key}">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-lg border border-amber-500/30">
                    <i class="fa-solid ${meta.icon}"></i>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="font-serif text-lg font-bold text-stone-900">${meta.title}</h4>
                      <span class="group-count-badge text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-mono font-bold">${items.length} options</span>
                    </div>
                    <p class="text-[11px] text-stone-500">${meta.desc}</p>
                  </div>
                </div>

                <button type="button" class="btn-rosa-outline text-xs py-1.5 px-3 self-start sm:self-auto flex items-center gap-1.5" onclick="Admin.addBuilderOptionRow('${meta.key}')">
                  <i class="fa-solid fa-plus text-amber-500"></i>
                  <span>Add Option</span>
                </button>
              </div>

              <!-- Options Container -->
              <div id="builder-group-${meta.key}" class="builder-group-container space-y-2.5" data-group-key="${meta.key}">
                ${items.length === 0 ? `
                  <div class="empty-group-msg text-center py-6 text-stone-400 text-xs">
                    <i class="fa-solid fa-circle-info mr-1"></i> No options configured yet. Click "Add Option" above to create one.
                  </div>
                ` : ''}
                ${items.map((item) => {
                  const metaPayload = encodeURIComponent(JSON.stringify(item));
                  return `
                    <div class="builder-opt-row flex flex-wrap md:flex-nowrap items-center gap-2.5 p-2.5 rounded-xl bg-stone-50/70 border border-stone-200 hover:border-amber-400/60 transition-colors" data-meta="${metaPayload}">
                      <!-- Name Input -->
                      <div class="flex-1 min-w-[180px]">
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Option Name</label>
                        <input type="text" value="${item.name || ''}" placeholder="Option Name" class="builder-item-name w-full p-2 rounded-lg border border-stone-300 text-xs font-semibold bg-white text-stone-900 focus:outline-none focus:border-amber-600" required />
                      </div>

                      <!-- Price (₹ INR) -->
                      <div class="w-28">
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Price (₹)</label>
                        <div class="relative">
                          <span class="absolute left-2.5 top-2 text-stone-400 font-bold text-xs">₹</span>
                          <input type="number" step="0.01" value="${item.price !== undefined ? item.price : 0}" placeholder="0" class="builder-item-price w-full pl-6 pr-2 py-2 rounded-lg border border-stone-300 text-xs font-mono font-bold bg-white text-stone-900 focus:outline-none focus:border-amber-600" required />
                        </div>
                      </div>

                      <!-- Calories (kcal) -->
                      <div class="w-24">
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Calories</label>
                        <div class="relative">
                          <input type="number" min="0" value="${item.cal !== undefined ? item.cal : 0}" placeholder="kcal" class="builder-item-cal w-full pl-2 pr-6 py-2 rounded-lg border border-stone-300 text-xs font-mono bg-white text-stone-900 focus:outline-none focus:border-amber-600" />
                          <span class="absolute right-2 top-2 text-stone-400 text-[10px]">cal</span>
                        </div>
                      </div>

                      <!-- Icon Class -->
                      <div class="w-36">
                        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">FA Icon</label>
                        <div class="flex items-center gap-1.5">
                          <div class="w-8 h-8 rounded-lg bg-stone-200 flex items-center justify-center text-stone-700 text-xs shrink-0 icon-preview-box">
                            <i class="fa-solid ${item.icon || 'fa-circle'}"></i>
                          </div>
                          <input type="text" value="${item.icon || 'fa-circle'}" placeholder="fa-icon" oninput="Admin.updateIconPreview(this)" class="builder-item-icon w-full p-2 rounded-lg border border-stone-300 text-xs font-mono bg-white text-stone-900 focus:outline-none focus:border-amber-600" />
                        </div>
                      </div>

                      <!-- Delete Button -->
                      <div class="self-end md:self-center pt-2 md:pt-4">
                        <button type="button" class="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" onclick="Admin.removeBuilderOptionRow(this)" title="Delete Option">
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Bottom Save Action Bar -->
      <div class="mt-8 pt-5 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm">
        <div class="flex items-center gap-2 text-xs text-stone-500">
          <i class="fa-solid fa-circle-check text-green-600"></i>
          <span>Changes are saved directly to the café database and synchronized in real time to the customer studios.</span>
        </div>

        <div class="flex items-center gap-3">
          <button type="button" class="btn-rosa-outline text-xs py-2.5 px-4 text-stone-700" onclick="Admin.resetBuildersConfig()">
            <i class="fa-solid fa-rotate-left mr-1"></i> Reset to Factory Defaults
          </button>
          <button type="button" class="btn-rosa text-xs py-2.5 px-6 shadow-md font-bold" onclick="Admin.saveBuildersConfig()">
            <i class="fa-solid fa-floppy-disk mr-1.5"></i> Save All Builder Changes
          </button>
        </div>
      </div>
    `;
  },

  setBuilderSubTab(tab) {
    this.collectCurrentBuilderState();
    builderSubTab = tab;
    this.renderBuilders(document.getElementById('admin-content-area'));
  },

  filterBuilderOptions(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('.builder-opt-row');
    rows.forEach(r => {
      const name = (r.querySelector('.builder-item-name')?.value || '').toLowerCase();
      const price = (r.querySelector('.builder-item-price')?.value || '').toLowerCase();
      if (!q || name.includes(q) || price.includes(q)) {
        r.style.display = 'flex';
      } else {
        r.style.display = 'none';
      }
    });
  },

  updateIconPreview(input) {
    const previewBox = input.closest('.builder-opt-row')?.querySelector('.icon-preview-box');
    if (previewBox) {
      const iconClass = input.value.trim() || 'fa-circle';
      previewBox.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    }
  },

  addBuilderOptionRow(groupKey) {
    const container = document.getElementById(`builder-group-${groupKey}`);
    if (!container) return;

    const emptyMsg = container.querySelector('.empty-group-msg');
    if (emptyMsg) emptyMsg.remove();

    const row = document.createElement('div');
    row.className = 'builder-opt-row flex flex-wrap md:flex-nowrap items-center gap-2.5 p-2.5 rounded-xl bg-stone-50/70 border border-stone-200 hover:border-amber-400/60 transition-colors animate-fadeIn';
    row.setAttribute('data-meta', encodeURIComponent(JSON.stringify({ icon: 'fa-circle' })));
    row.innerHTML = `
      <div class="flex-1 min-w-[180px]">
        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Option Name</label>
        <input type="text" placeholder="New Option Name" class="builder-item-name w-full p-2 rounded-lg border border-stone-300 text-xs font-semibold bg-white text-stone-900 focus:outline-none focus:border-amber-600" required />
      </div>

      <div class="w-28">
        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Price (₹)</label>
        <div class="relative">
          <span class="absolute left-2.5 top-2 text-stone-400 font-bold text-xs">₹</span>
          <input type="number" step="0.01" value="0" placeholder="0" class="builder-item-price w-full pl-6 pr-2 py-2 rounded-lg border border-stone-300 text-xs font-mono font-bold bg-white text-stone-900 focus:outline-none focus:border-amber-600" required />
        </div>
      </div>

      <div class="w-24">
        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Calories</label>
        <div class="relative">
          <input type="number" min="0" value="50" placeholder="kcal" class="builder-item-cal w-full pl-2 pr-6 py-2 rounded-lg border border-stone-300 text-xs font-mono bg-white text-stone-900 focus:outline-none focus:border-amber-600" />
          <span class="absolute right-2 top-2 text-stone-400 text-[10px]">cal</span>
        </div>
      </div>

      <div class="w-36">
        <label class="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">FA Icon</label>
        <div class="flex items-center gap-1.5">
          <div class="w-8 h-8 rounded-lg bg-stone-200 flex items-center justify-center text-stone-700 text-xs shrink-0 icon-preview-box">
            <i class="fa-solid fa-circle"></i>
          </div>
          <input type="text" value="fa-circle" placeholder="fa-icon" oninput="Admin.updateIconPreview(this)" class="builder-item-icon w-full p-2 rounded-lg border border-stone-300 text-xs font-mono bg-white text-stone-900 focus:outline-none focus:border-amber-600" />
        </div>
      </div>

      <div class="self-end md:self-center pt-2 md:pt-4">
        <button type="button" class="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" onclick="Admin.removeBuilderOptionRow(this)" title="Delete Option">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(row);

    // Update count badge
    const card = container.closest('.builder-group-card');
    const badge = card?.querySelector('.group-count-badge');
    if (badge) {
      const count = container.querySelectorAll('.builder-opt-row').length;
      badge.textContent = `${count} options`;
    }

    // Focus on new name field
    const nameInput = row.querySelector('.builder-item-name');
    if (nameInput) nameInput.focus();
  },

  removeBuilderOptionRow(btn) {
    const row = btn.closest('.builder-opt-row');
    if (row) {
      const container = row.closest('.builder-group-container');
      const card = row.closest('.builder-group-card');
      row.remove();

      if (container && card) {
        const count = container.querySelectorAll('.builder-opt-row').length;
        const badge = card.querySelector('.group-count-badge');
        if (badge) badge.textContent = `${count} options`;

        if (count === 0 && !container.querySelector('.empty-group-msg')) {
          container.innerHTML = `
            <div class="empty-group-msg text-center py-6 text-stone-400 text-xs">
              <i class="fa-solid fa-circle-info mr-1"></i> No options configured yet. Click "Add Option" above to create one.
            </div>
          `;
        }
      }
    }
  },

  collectCurrentBuilderState() {
    if (!cachedBuildersConfig) cachedBuildersConfig = {};
    if (!cachedBuildersConfig[builderSubTab]) cachedBuildersConfig[builderSubTab] = {};

    const groupContainers = document.querySelectorAll('.builder-group-container');
    groupContainers.forEach(container => {
      const groupKey = container.dataset.groupKey;
      if (!groupKey) return;

      const rows = container.querySelectorAll('.builder-opt-row');
      const items = [];
      rows.forEach(r => {
        const nameInput = r.querySelector('.builder-item-name');
        const priceInput = r.querySelector('.builder-item-price');
        const calInput = r.querySelector('.builder-item-cal');
        const iconInput = r.querySelector('.builder-item-icon');

        const name = nameInput ? nameInput.value.trim() : '';
        if (name) {
          let metaObj = {};
          try {
            const rawMeta = r.getAttribute('data-meta');
            if (rawMeta) metaObj = JSON.parse(decodeURIComponent(rawMeta));
          } catch (e) {}

          const itemPrice = parseFloat(priceInput ? priceInput.value : 0);
          const itemCal = parseInt(calInput ? calInput.value : 0);
          const itemIcon = iconInput && iconInput.value.trim() ? iconInput.value.trim() : (metaObj.icon || 'fa-circle');

          items.push({
            ...metaObj,
            name,
            price: isNaN(itemPrice) ? 0 : itemPrice,
            cal: isNaN(itemCal) ? 0 : itemCal,
            icon: itemIcon
          });
        }
      });

      cachedBuildersConfig[builderSubTab][groupKey] = items;
    });
  },

  async saveBuildersConfig() {
    this.collectCurrentBuilderState();

    if (!cachedBuildersConfig) {
      showToast('No builder configuration to save.');
      return;
    }

    try {
      const res = await API.updateBuildersConfig(cachedBuildersConfig);
      if (res && res.config) {
        cachedBuildersConfig = res.config;
      }
      showToast('All builder options and pricing updated successfully!');

      // Live sync client builders if active on storefront
      if (typeof window !== 'undefined' && window.Builders) {
        if (typeof window.Builders.loadConfig === 'function') {
          await window.Builders.loadConfig();
        } else if (typeof window.Builders.init === 'function') {
          await window.Builders.init();
        }
      }

      await this.renderBuilders(document.getElementById('admin-content-area'));
    } catch (err) {
      showToast(`Error saving builder configuration: ${err.message || err}`);
    }
  },

  async resetBuildersConfig() {
    if (confirm('Are you sure you want to reset all Create Your Own builders (Brew, Meal, Grand Plate) to factory defaults?')) {
      try {
        const res = await API.resetBuildersConfig();
        cachedBuildersConfig = (res && res.config) ? res.config : res;
        showToast('All builders reset to factory default options & pricing.');

        // Live sync client builders if active on storefront
        if (typeof window !== 'undefined' && window.Builders) {
          if (typeof window.Builders.loadConfig === 'function') {
            await window.Builders.loadConfig();
          } else if (typeof window.Builders.init === 'function') {
            await window.Builders.init();
          }
        }

        await this.renderBuilders(document.getElementById('admin-content-area'));
      } catch (err) {
        showToast(`Error resetting builders: ${err.message || err}`);
      }
    }
  },

  /* ==================== 5. PROMOTIONS & COUPONS ==================== */
  async renderCoupons(container) {
    const couponsData = await API.getAdminCoupons();
    const coupons = couponsData.coupons || [];

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span class="editorial-badge mb-2"><i class="fa-solid fa-tags"></i> Marketing Engine</span>
          <h2 class="font-serif text-3xl font-bold text-stone-900">Promotions & Coupon Codes</h2>
        </div>

        <button class="btn-rosa text-xs py-2 px-4" onclick="Admin.openAddCouponModal()">
          <i class="fa-solid fa-plus mr-1"></i> Create New Coupon
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${coupons.map(c => `
          <div class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start mb-3">
                <span class="bg-amber-100 text-amber-950 font-mono font-bold px-3 py-1 rounded-lg text-sm tracking-wider border border-amber-200">
                  ${c.code}
                </span>
                <button class="text-stone-400 hover:text-amber-700 text-xs" onclick="navigator.clipboard.writeText('${c.code}'); showToast('Coupon code copied to clipboard!');" title="Copy Code">
                  <i class="fa-solid fa-copy"></i> Copy
                </button>
              </div>

              <h4 class="font-serif text-lg font-bold text-stone-900">
                ${c.discountPercent ? `${c.discountPercent}% OFF Entire Order` : `₹${c.discountFixed.toFixed(2)} OFF Order`}
              </h4>
              <p class="text-xs text-stone-600 mt-1">${c.description}</p>
            </div>

            <div class="pt-4 border-t border-stone-100 mt-4 flex items-center justify-between text-xs">
              <span class="text-stone-500 font-medium">Min Spend: <strong>₹${c.minOrder}</strong> &bull; Exp: ${c.expiry}</span>
              <button class="text-stone-400 hover:text-red-600 p-1" onclick="Admin.deleteCoupon('${c.code}')" title="Delete Coupon">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  openDeleteCouponModal(code) {
    this.showModal(`
      <div class="p-6 max-w-sm w-full text-center">
        <div class="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 text-lg">
          <i class="fa-solid fa-ticket-simple"></i>
        </div>
        <h3 class="font-serif text-xl font-bold text-stone-900 mb-1">Delete Coupon?</h3>
        <p class="text-xs text-stone-600 mb-4 font-mono font-bold text-amber-900">${code}</p>
        <p class="text-xs text-stone-500 mb-5">This promotional coupon code will immediately become invalid for all patrons at checkout.</p>
        <div class="flex gap-2">
          <button type="button" class="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50" onclick="Admin.closeModal()">Cancel</button>
          <button type="button" class="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs" onclick="Admin.confirmDeleteCoupon('${code}')">Delete</button>
        </div>
      </div>
    `);
  },

  async confirmDeleteCoupon(code) {
    await API.deleteAdminCoupon(code);
    showToast(`Coupon "${code}" removed.`);
    this.closeModal();
    this.renderCoupons(document.getElementById('admin-content-area'));
  },

  deleteCoupon(code) {
    this.openDeleteCouponModal(code);
  },

  /* ==================== 5. PATRON CRM & LOYALTY ==================== */
  async renderCustomers(container) {
    const data = await API.getAdminCustomers();
    let customers = data.customers || [];

    if (customerSearch) {
      const q = customerSearch.toLowerCase();
      customers = customers.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span class="editorial-badge mb-2"><i class="fa-solid fa-award"></i> Patron CRM</span>
          <h2 class="font-serif text-3xl font-bold text-stone-900">Customer Accounts & Loyalty Passes</h2>
        </div>

        <div class="relative w-full sm:w-72">
          <span class="absolute left-3.5 top-3 text-stone-400 text-xs"><i class="fa-solid fa-magnifying-glass"></i></span>
          <input type="text" placeholder="Search customer name or email..." value="${customerSearch}" class="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs bg-white" oninput="Admin.setCustomerSearch(this.value)" />
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-stone-700">
            <thead class="bg-stone-100 text-stone-900 uppercase font-semibold">
              <tr>
                <th class="p-3">Customer Patron</th>
                <th class="p-3">VIP Tier</th>
                <th class="p-3">Stamp Pass Progress</th>
                <th class="p-3">Loyalty Points</th>
                <th class="p-3">Orders / Lifetime Spend</th>
                <th class="p-3 text-right">Loyalty Adjustment</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100">
              ${customers.map((c) => `
                <tr class="hover:bg-stone-50/60">
                  <td class="p-3">
                    <p class="font-bold text-stone-900 text-sm">${c.name}</p>
                    <p class="text-[11px] text-stone-500 font-mono">${c.email}</p>
                    <span class="text-[10px] text-amber-800 font-semibold">&#9749; ${c.flavourProfile}</span>
                  </td>
                  <td class="p-3">
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
                      ${c.tier}
                    </span>
                  </td>
                  <td class="p-3">
                    <div class="flex items-center gap-1">
                      ${Array.from({ length: 8 }).map((_, idx) => `
                        <span class="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${idx < c.stamps ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-400'}">
                          ${idx < c.stamps ? '✓' : idx + 1}
                        </span>
                      `).join('')}
                      <span class="text-xs font-bold text-stone-700 ml-1.5">${c.stamps}/8</span>
                    </div>
                  </td>
                  <td class="p-3 font-bold text-stone-900">${c.points} Pts</td>
                  <td class="p-3 font-semibold text-stone-900">
                    ${c.orderCount} Orders &bull; ₹${c.totalSpent.toFixed(2)}
                  </td>
                  <td class="p-3 text-right">
                    <button class="admin-action-btn" onclick="Admin.openAdjustLoyaltyModal('${c.email}', '${c.name}', ${c.stamps}, ${c.points})">
                      <i class="fa-solid fa-gift"></i> Adjust Pass
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  setCustomerSearch(query) {
    customerSearch = query;
    this.renderCustomers(document.getElementById('admin-content-area'));
  },

  /* ==================== 6. CAFÉ OPERATIONS & SETTINGS ==================== */
  async renderSettings(container) {
    const storeStatus = await API.getStoreStatus();

    container.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <div>
          <span class="editorial-badge mb-2"><i class="fa-solid fa-gear"></i> Store Engine</span>
          <h2 class="font-serif text-3xl font-bold text-stone-900">Café Operations & Kitchen Settings</h2>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Operational Toggles -->
        <div class="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <h3 class="font-serif text-xl font-bold text-stone-900">Store Ordering State</h3>

          <form id="admin-settings-form" class="space-y-4 text-xs" onsubmit="Admin.saveStoreSettings(event)">
            <div>
              <label class="block font-bold text-stone-800 mb-1">Store Status</label>
              <select id="setting-store-status" class="w-full p-2.5 rounded-xl border border-stone-300 font-semibold">
                <option value="open" ${storeStatus.isOpen && !storeStatus.kitchenRushMode ? 'selected' : ''}>🟢 Open & Accepting Orders</option>
                <option value="rush" ${storeStatus.isOpen && storeStatus.kitchenRushMode ? 'selected' : ''}>🟡 Kitchen Rush Mode (Auto-add 15m delay notice)</option>
                <option value="closed" ${!storeStatus.isOpen ? 'selected' : ''}>🔴 Kitchen Closed (Disable Ordering)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-stone-800 mb-1">Estimated Wait Time (Minutes)</label>
              <input type="number" id="setting-wait-time" value="${storeStatus.estimatedWaitMinutes || 12}" class="w-full p-2.5 rounded-xl border border-stone-300" />
            </div>

            <div>
              <label class="block font-bold text-stone-800 mb-1">Live Storefront Announcement Banner</label>
              <textarea id="setting-announcement" rows="3" class="w-full p-2.5 rounded-xl border border-stone-300">${storeStatus.announcement || ''}</textarea>
            </div>

            <button type="submit" class="btn-rosa text-xs py-3 px-6 w-full font-bold">
              <i class="fa-solid fa-floppy-disk mr-1"></i> Save Store Settings
            </button>
          </form>
        </div>

        <!-- Hours and Location Info -->
        <div class="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 class="font-serif text-xl font-bold text-stone-900">Trading Hours & Table Service</h3>

          <div class="p-4 bg-stone-50 rounded-xl space-y-2 text-xs text-stone-700">
            <div class="flex justify-between font-medium"><span>Mon – Fri</span><span>7:00 AM – 10:00 PM</span></div>
            <div class="flex justify-between font-medium"><span>Saturday & Sunday</span><span>8:00 AM – 10:00 PM</span></div>
            <div class="flex justify-between font-bold text-amber-800 pt-2 border-t border-stone-200"><span>Kitchen Orders Cutoff</span><span>9:30 PM Daily</span></div>
          </div>

          <div class="p-4 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200">
            <h5 class="font-bold mb-1"><i class="fa-solid fa-circle-info"></i> Table Service Mode</h5>
            <p>Dine-in orders are automatically matched to in-store table numbers and sent to the Barista KDS terminal instantly.</p>
          </div>
        </div>
      </div>
    `;
  },

  async saveStoreSettings(e) {
    e.preventDefault();
    const statusVal = document.getElementById('setting-store-status').value;
    const waitTime = parseInt(document.getElementById('setting-wait-time').value) || 12;
    const announcement = document.getElementById('setting-announcement').value;

    const payload = {
      isOpen: statusVal !== 'closed',
      kitchenRushMode: statusVal === 'rush',
      estimatedWaitMinutes: waitTime,
      announcement
    };

    await API.updateStoreStatus(payload);
    showToast('Store settings updated successfully!');
    this.renderSidebar();
  },

  /* ==================== MODALS: PRODUCT & COUPON & LOYALTY & RECEIPT ==================== */
  openAddProductModal() {
    this.showModal(`
      <div class="p-6 max-w-lg w-full">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-serif text-2xl font-bold text-stone-900">Add New Menu Item</h3>
          <button class="text-stone-400 text-2xl" onclick="Admin.closeModal()">&times;</button>
        </div>

        <form onsubmit="Admin.submitAddProduct(event)" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold mb-1">Item Name</label>
            <input type="text" id="p-name" required class="w-full p-2.5 rounded-lg border border-stone-300" placeholder="e.g. Vanilla Honey Oat Latte" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold mb-1">Category</label>
              <select id="p-category" class="w-full p-2.5 rounded-lg border border-stone-300">
                <option value="Coffee">Coffee</option>
                <option value="Signature Drinks">Signature Drinks</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Mains">Mains</option>
                <option value="Pastries">Pastries</option>
                <option value="Dessert">Dessert</option>
              </select>
            </div>
            <div>
              <label class="block font-bold mb-1">Price (₹)</label>
              <input type="number" step="0.01" id="p-price" required class="w-full p-2.5 rounded-lg border border-stone-300" placeholder="5.50" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold mb-1">Calories (kcal)</label>
              <input type="number" id="p-calories" value="180" class="w-full p-2.5 rounded-lg border border-stone-300" />
            </div>
            <div>
              <label class="block font-bold mb-1">Initial Stock</label>
              <input type="number" id="p-stock" value="50" class="w-full p-2.5 rounded-lg border border-stone-300" />
            </div>
          </div>

          <div>
            <label class="block font-bold mb-1">Image URL</label>
            <input type="url" id="p-image" required class="w-full p-2.5 rounded-lg border border-stone-300" value="https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80" />
          </div>

          <div>
            <label class="block font-bold mb-1">Description</label>
            <textarea id="p-desc" rows="2" class="w-full p-2.5 rounded-lg border border-stone-300" placeholder="Artisanal description..."></textarea>
          </div>

          <div class="flex gap-4 pt-2">
            <label class="flex items-center gap-1.5"><input type="checkbox" id="p-veg" /> Vegetarian</label>
            <label class="flex items-center gap-1.5"><input type="checkbox" id="p-vegan" /> Vegan</label>
            <label class="flex items-center gap-1.5"><input type="checkbox" id="p-bestseller" /> Bestseller</label>
          </div>

          <button type="submit" class="btn-rosa w-full py-3 mt-4 text-xs font-bold">
            Create Menu Product
          </button>
        </form>
      </div>
    `);
  },

  async submitAddProduct(e) {
    e.preventDefault();
    const productPayload = {
      name: document.getElementById('p-name').value,
      category: document.getElementById('p-category').value,
      price: parseFloat(document.getElementById('p-price').value),
      calories: parseInt(document.getElementById('p-calories').value),
      stock: parseInt(document.getElementById('p-stock').value),
      image: document.getElementById('p-image').value,
      description: document.getElementById('p-desc').value,
      isVegetarian: document.getElementById('p-veg').checked,
      isVegan: document.getElementById('p-vegan').checked,
      isBestseller: document.getElementById('p-bestseller').checked
    };

    await API.addProduct(productPayload);
    showToast('New product added to café menu!');
    this.closeModal();
    this.renderProducts(document.getElementById('admin-content-area'));
  },

  openQuickPriceModal(id, currentPrice, productName) {
    this.showModal(`
      <div class="p-6 max-w-sm w-full">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-serif text-xl font-bold text-stone-900">Update Base Price</h3>
          <button class="text-stone-400 text-2xl leading-none hover:text-stone-800" onclick="Admin.closeModal()">&times;</button>
        </div>
        <p class="text-xs text-stone-600 mb-4 font-medium">${productName}</p>

        <form onsubmit="Admin.submitQuickPrice(event, '${id}')" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-stone-700 mb-1.5 uppercase tracking-wider text-[11px]">Base Price (₹ INR)</label>
            <div class="relative">
              <span class="absolute left-3.5 top-2.5 font-bold text-stone-500 text-sm">₹</span>
              <input type="number" step="0.01" min="0" id="quick-price-input" value="${currentPrice}" required class="w-full pl-8 pr-3 py-2.5 rounded-xl border border-stone-300 font-bold text-sm text-stone-900 focus:outline-none focus:border-amber-700 bg-white" />
            </div>
          </div>
          <div class="flex gap-2 pt-2">
            <button type="button" class="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold flex-1 hover:bg-stone-50" onclick="Admin.closeModal()">Cancel</button>
            <button type="submit" class="btn-rosa py-2.5 px-4 font-bold flex-1 shadow-sm">Save Price</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitQuickPrice(e, id) {
    e.preventDefault();
    const newPrice = parseFloat(document.getElementById('quick-price-input').value);
    if (isNaN(newPrice) || newPrice < 0) {
      showToast('Please enter a valid price in ₹ INR');
      return;
    }
    await API.updateProduct(id, { price: newPrice });
    showToast(`Base price updated to ₹${newPrice.toFixed(2)}`);
    this.closeModal();
    this.renderProducts(document.getElementById('admin-content-area'));
  },

  async openCustomizePricingModal(id) {
    const menuData = await API.getMenu('All');
    const p = (menuData.products || []).find((x) => x.id === id);
    if (!p) {
      showToast('Product not found.');
      return;
    }

    const opts = getDefaultCustomizationOptions(p);

    this.showModal(`
      <div class="p-6 max-w-2xl w-full max-h-[88vh] overflow-y-auto">
        <div class="flex justify-between items-start border-b border-stone-200 pb-4 mb-5">
          <div class="flex items-center gap-3">
            <img src="${p.image}" alt="${p.name}" class="w-12 h-12 rounded-xl object-cover border border-stone-200" />
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">${p.category}</span>
              <h3 class="font-serif text-2xl font-bold text-stone-900 mt-0.5">Customize Options & Prices</h3>
              <p class="text-xs text-stone-500 font-medium">${p.name}</p>
            </div>
          </div>
          <button class="text-stone-400 hover:text-stone-800 text-2xl leading-none" onclick="Admin.closeModal()">&times;</button>
        </div>

        <form id="custom-pricing-form" onsubmit="Admin.submitCustomizePricing(event, '${p.id}')" class="space-y-6 text-xs">
          <!-- 1. Base Price -->
          <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <label class="block font-bold text-stone-800 mb-1 uppercase tracking-wider text-[11px]">
              <i class="fa-solid fa-indian-rupee-sign text-amber-800 mr-1"></i> Base Product Price (₹ INR)
            </label>
            <p class="text-[11px] text-stone-500 mb-2">Standard base price of the item before any customer add-ons or size adjustments.</p>
            <div class="relative max-w-xs">
              <span class="absolute left-3.5 top-2.5 font-bold text-stone-500 text-sm">₹</span>
              <input type="number" step="0.01" min="0" id="cp-base-price" value="${p.price}" required class="w-full pl-8 pr-3 py-2 rounded-lg border border-stone-300 font-bold text-sm bg-white" />
            </div>
          </div>

          <!-- 2. Serving Sizes -->
          <div class="border border-stone-200 rounded-xl p-4 bg-white">
            <div class="flex justify-between items-center mb-3">
              <div>
                <h4 class="font-bold text-stone-900 text-sm"><i class="fa-solid fa-expand text-amber-800 mr-1"></i> Serving Sizes & Portion Adjustments</h4>
                <p class="text-[11px] text-stone-500">Portion names and extra price (+ / -) added to the base price.</p>
              </div>
              <button type="button" class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200" onclick="Admin.addCustomOptionRow('sizes')">
                <i class="fa-solid fa-plus mr-1"></i> Add Size
              </button>
            </div>
            <div id="opts-container-sizes" class="space-y-2">
              ${(opts.sizes || []).map((s) => `
                <div class="opt-row flex items-center gap-2" data-group="sizes">
                  <input type="text" placeholder="Size Name (e.g. Grand 16oz)" value="${s.name}" class="opt-name flex-1 p-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50" required />
                  <div class="relative w-32">
                    <span class="absolute left-2.5 top-2 text-stone-400 font-bold text-xs">₹</span>
                    <input type="number" step="0.01" placeholder="Price" value="${s.price}" class="opt-price w-full pl-6 pr-2 py-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50 font-mono font-bold" required />
                  </div>
                  <button type="button" class="text-stone-400 hover:text-red-600 p-2" onclick="Admin.removeCustomOptionRow(this)" title="Remove Option">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 3. Milks & Plant Alternatives -->
          <div class="border border-stone-200 rounded-xl p-4 bg-white">
            <div class="flex justify-between items-center mb-3">
              <div>
                <h4 class="font-bold text-stone-900 text-sm"><i class="fa-solid fa-droplet text-amber-800 mr-1"></i> Milks & Dairy Selection</h4>
                <p class="text-[11px] text-stone-500">Milk choices and upgrade charges (e.g. Whole Milk ₹0, Oat Milk ₹40).</p>
              </div>
              <button type="button" class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200" onclick="Admin.addCustomOptionRow('milks')">
                <i class="fa-solid fa-plus mr-1"></i> Add Milk
              </button>
            </div>
            <div id="opts-container-milks" class="space-y-2">
              ${(opts.milks || []).map((m) => `
                <div class="opt-row flex items-center gap-2" data-group="milks">
                  <input type="text" placeholder="Milk Name (e.g. Barista Oat Milk)" value="${m.name}" class="opt-name flex-1 p-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50" required />
                  <div class="relative w-32">
                    <span class="absolute left-2.5 top-2 text-stone-400 font-bold text-xs">₹</span>
                    <input type="number" step="0.01" min="0" placeholder="Price" value="${m.price}" class="opt-price w-full pl-6 pr-2 py-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50 font-mono font-bold" required />
                  </div>
                  <button type="button" class="text-stone-400 hover:text-red-600 p-2" onclick="Admin.removeCustomOptionRow(this)" title="Remove Option">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 4. Artisanal Syrups & Flavors -->
          <div class="border border-stone-200 rounded-xl p-4 bg-white">
            <div class="flex justify-between items-center mb-3">
              <div>
                <h4 class="font-bold text-stone-900 text-sm"><i class="fa-solid fa-wand-magic-sparkles text-amber-800 mr-1"></i> Artisanal Syrups & Flavors</h4>
                <p class="text-[11px] text-stone-500">Syrup and flavor shot options & pricing.</p>
              </div>
              <button type="button" class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200" onclick="Admin.addCustomOptionRow('syrups')">
                <i class="fa-solid fa-plus mr-1"></i> Add Syrup
              </button>
            </div>
            <div id="opts-container-syrups" class="space-y-2">
              ${(opts.syrups || []).map((s) => `
                <div class="opt-row flex items-center gap-2" data-group="syrups">
                  <input type="text" placeholder="Syrup Name (e.g. Madagascar Vanilla)" value="${s.name}" class="opt-name flex-1 p-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50" required />
                  <div class="relative w-32">
                    <span class="absolute left-2.5 top-2 text-stone-400 font-bold text-xs">₹</span>
                    <input type="number" step="0.01" min="0" placeholder="Price" value="${s.price}" class="opt-price w-full pl-6 pr-2 py-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50 font-mono font-bold" required />
                  </div>
                  <button type="button" class="text-stone-400 hover:text-red-600 p-2" onclick="Admin.removeCustomOptionRow(this)" title="Remove Option">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 5. Dressings & Sauces -->
          <div class="border border-stone-200 rounded-xl p-4 bg-white">
            <div class="flex justify-between items-center mb-3">
              <div>
                <h4 class="font-bold text-stone-900 text-sm"><i class="fa-solid fa-bottle-droplet text-amber-800 mr-1"></i> Dressings, Sauces & Cheeses</h4>
                <p class="text-[11px] text-stone-500">Dressings, sauces, and gourmet cheeses for kitchen items.</p>
              </div>
              <button type="button" class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200" onclick="Admin.addCustomOptionRow('dressings')">
                <i class="fa-solid fa-plus mr-1"></i> Add Dressing
              </button>
            </div>
            <div id="opts-container-dressings" class="space-y-2">
              ${(opts.dressings || []).map((d) => `
                <div class="opt-row flex items-center gap-2" data-group="dressings">
                  <input type="text" placeholder="Dressing Name (e.g. Extra Aged Parmesan)" value="${d.name}" class="opt-name flex-1 p-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50" required />
                  <div class="relative w-32">
                    <span class="absolute left-2.5 top-2 text-stone-400 font-bold text-xs">₹</span>
                    <input type="number" step="0.01" min="0" placeholder="Price" value="${d.price}" class="opt-price w-full pl-6 pr-2 py-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50 font-mono font-bold" required />
                  </div>
                  <button type="button" class="text-stone-400 hover:text-red-600 p-2" onclick="Admin.removeCustomOptionRow(this)" title="Remove Option">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 6. Gourmet Add-ons & Garnishes -->
          <div class="border border-stone-200 rounded-xl p-4 bg-white">
            <div class="flex justify-between items-center mb-3">
              <div>
                <h4 class="font-bold text-stone-900 text-sm"><i class="fa-solid fa-plus-circle text-amber-800 mr-1"></i> Gourmet Add-ons & Garnishes</h4>
                <p class="text-[11px] text-stone-500">Premium extra toppings, extra espresso shots, truffles, edible gold leaf, etc.</p>
              </div>
              <button type="button" class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200" onclick="Admin.addCustomOptionRow('addOns')">
                <i class="fa-solid fa-plus mr-1"></i> Add Add-on
              </button>
            </div>
            <div id="opts-container-addOns" class="space-y-2">
              ${(opts.addOns || []).map((a) => `
                <div class="opt-row flex items-center gap-2" data-group="addOns">
                  <input type="text" placeholder="Add-on Name (e.g. Extra Espresso Shot)" value="${a.name}" class="opt-name flex-1 p-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50" required />
                  <div class="relative w-32">
                    <span class="absolute left-2.5 top-2 text-stone-400 font-bold text-xs">₹</span>
                    <input type="number" step="0.01" min="0" placeholder="Price" value="${a.price}" class="opt-price w-full pl-6 pr-2 py-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50 font-mono font-bold" required />
                  </div>
                  <button type="button" class="text-stone-400 hover:text-red-600 p-2" onclick="Admin.removeCustomOptionRow(this)" title="Remove Option">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-stone-200">
            <button type="button" class="text-xs text-stone-500 hover:text-red-700 font-medium" onclick="Admin.resetCustomOptionsToDefault('${p.id}')">
              <i class="fa-solid fa-rotate-left mr-1"></i> Reset to Factory Defaults
            </button>
            <div class="flex gap-2">
              <button type="button" class="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold hover:bg-stone-50" onclick="Admin.closeModal()">Cancel</button>
              <button type="submit" class="btn-rosa py-2.5 px-6 font-bold shadow-md">
                <i class="fa-solid fa-floppy-disk mr-1.5"></i> Save All Customizations & Prices
              </button>
            </div>
          </div>
        </form>
      </div>
    `);
  },

  addCustomOptionRow(groupKey) {
    const container = document.getElementById(`opts-container-${groupKey}`);
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'opt-row flex items-center gap-2';
    row.dataset.group = groupKey;
    row.innerHTML = `
      <input type="text" placeholder="Option Name" class="opt-name flex-1 p-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50" required />
      <div class="relative w-32">
        <span class="absolute left-2.5 top-2 text-stone-400 font-bold text-xs">₹</span>
        <input type="number" step="0.01" placeholder="Price" value="0" class="opt-price w-full pl-6 pr-2 py-2 rounded-lg border border-stone-300 text-xs bg-stone-50/50 font-mono font-bold" required />
      </div>
      <button type="button" class="text-stone-400 hover:text-red-600 p-2" onclick="Admin.removeCustomOptionRow(this)" title="Remove Option">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
    container.appendChild(row);
  },

  removeCustomOptionRow(btn) {
    const row = btn.closest('.opt-row');
    if (row) row.remove();
  },

  async resetCustomOptionsToDefault(id) {
    this.showModal(`
      <div class="p-6 max-w-sm w-full text-center">
        <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 text-lg">
          <i class="fa-solid fa-rotate-left"></i>
        </div>
        <h3 class="font-serif text-xl font-bold text-stone-900 mb-1">Reset Customizations?</h3>
        <p class="text-xs text-stone-600 mb-5 leading-relaxed">This will revert all sizes, milks, syrups, and add-on pricing for this item back to the café standard defaults.</p>
        <div class="flex gap-2">
          <button type="button" class="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50" onclick="Admin.openCustomizePricingModal('${id}')">Cancel</button>
          <button type="button" class="flex-1 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs" onclick="Admin.confirmResetCustomOptions('${id}')">Reset Defaults</button>
        </div>
      </div>
    `);
  },

  async confirmResetCustomOptions(id) {
    await API.updateProduct(id, { customizationOptions: null });
    showToast('Custom options reset to standard defaults.');
    this.openCustomizePricingModal(id);
  },

  async submitCustomizePricing(e, id) {
    e.preventDefault();

    const basePrice = parseFloat(document.getElementById('cp-base-price').value);

    const parseRows = (groupKey) => {
      const container = document.getElementById(`opts-container-${groupKey}`);
      if (!container) return [];
      const rows = container.querySelectorAll('.opt-row');
      const items = [];
      rows.forEach(r => {
        const nameInput = r.querySelector('.opt-name');
        const priceInput = r.querySelector('.opt-price');
        if (nameInput && nameInput.value.trim()) {
          items.push({
            name: nameInput.value.trim(),
            price: parseFloat(priceInput ? priceInput.value : 0) || 0
          });
        }
      });
      return items;
    };

    const customizationOptions = {
      sizes: parseRows('sizes'),
      milks: parseRows('milks'),
      syrups: parseRows('syrups'),
      dressings: parseRows('dressings'),
      addOns: parseRows('addOns')
    };

    await API.updateProduct(id, {
      price: basePrice,
      customizationOptions
    });

    showToast('Customization options and pricing updated successfully!');
    this.closeModal();
    this.renderProducts(document.getElementById('admin-content-area'));
  },

  async openEditProductModal(id) {
    const menuData = await API.getMenu('All');
    const p = (menuData.products || []).find((x) => x.id === id);
    if (!p) return;

    this.showModal(`
      <div class="p-6 max-w-lg w-full">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-serif text-2xl font-bold text-stone-900">Edit Product: ${p.name}</h3>
          <button class="text-stone-400 text-2xl" onclick="Admin.closeModal()">&times;</button>
        </div>

        <form onsubmit="Admin.submitEditProduct(event, '${p.id}')" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold mb-1">Item Name</label>
            <input type="text" id="pe-name" value="${p.name}" required class="w-full p-2.5 rounded-lg border border-stone-300" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold mb-1">Category</label>
              <select id="pe-category" class="w-full p-2.5 rounded-lg border border-stone-300">
                <option value="Coffee" ${p.category === 'Coffee' ? 'selected' : ''}>Coffee</option>
                <option value="Signature Drinks" ${p.category === 'Signature Drinks' ? 'selected' : ''}>Signature Drinks</option>
                <option value="Breakfast" ${p.category === 'Breakfast' ? 'selected' : ''}>Breakfast</option>
                <option value="Mains" ${p.category === 'Mains' ? 'selected' : ''}>Mains</option>
                <option value="Pastries" ${p.category === 'Pastries' ? 'selected' : ''}>Pastries</option>
                <option value="Dessert" ${p.category === 'Dessert' ? 'selected' : ''}>Dessert</option>
              </select>
            </div>
            <div>
              <label class="block font-bold mb-1">Price (₹)</label>
              <input type="number" step="0.01" id="pe-price" value="${p.price}" required class="w-full p-2.5 rounded-lg border border-stone-300" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold mb-1">Calories (kcal)</label>
              <input type="number" id="pe-calories" value="${p.calories || 150}" class="w-full p-2.5 rounded-lg border border-stone-300" />
            </div>
            <div>
              <label class="block font-bold mb-1">Stock Quantity</label>
              <input type="number" id="pe-stock" value="${p.stock || 50}" class="w-full p-2.5 rounded-lg border border-stone-300" />
            </div>
          </div>

          <div>
            <label class="block font-bold mb-1">Image URL</label>
            <input type="url" id="pe-image" value="${p.image}" required class="w-full p-2.5 rounded-lg border border-stone-300" />
          </div>

          <div>
            <label class="block font-bold mb-1">Description</label>
            <textarea id="pe-desc" rows="2" class="w-full p-2.5 rounded-lg border border-stone-300">${p.description}</textarea>
          </div>

          <!-- Customization Pricing Manager Shortcut -->
          <div class="pt-2">
            <button type="button" class="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 font-bold text-xs flex items-center justify-between hover:bg-amber-100 transition-colors shadow-sm" onclick="Admin.openCustomizePricingModal('${p.id}')">
              <span class="flex items-center gap-2">
                <i class="fa-solid fa-sliders text-amber-700 text-sm"></i>
                <span>Edit Customization Options, Sizes & Add-on Prices</span>
              </span>
              <i class="fa-solid fa-chevron-right text-[10px] text-amber-700"></i>
            </button>
          </div>

          <div class="flex items-center justify-between gap-3 pt-3 border-t border-stone-200 mt-4">
            <button type="button" class="px-3.5 py-2.5 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs flex items-center gap-1.5 transition-colors" onclick="Admin.openDeleteProductModal('${p.id}')">
              <i class="fa-solid fa-trash"></i> Delete Product
            </button>
            <div class="flex items-center gap-2">
              <button type="button" class="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50" onclick="Admin.closeModal()">
                Cancel
              </button>
              <button type="submit" class="btn-rosa py-2.5 px-5 text-xs font-bold shadow-sm">
                Update Product Details
              </button>
            </div>
          </div>
        </form>
      </div>
    `);
  },

  async submitEditProduct(e, id) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('pe-name').value,
      category: document.getElementById('pe-category').value,
      price: parseFloat(document.getElementById('pe-price').value),
      calories: parseInt(document.getElementById('pe-calories').value),
      stock: parseInt(document.getElementById('pe-stock').value),
      image: document.getElementById('pe-image').value,
      description: document.getElementById('pe-desc').value
    };

    await API.updateProduct(id, payload);
    showToast('Product updated.');
    this.closeModal();
    this.renderProducts(document.getElementById('admin-content-area'));
  },

  openAddCouponModal() {
    this.showModal(`
      <div class="p-6 max-w-md w-full">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-serif text-2xl font-bold text-stone-900">Create Promotion Coupon</h3>
          <button class="text-stone-400 text-2xl" onclick="Admin.closeModal()">&times;</button>
        </div>

        <form onsubmit="Admin.submitAddCoupon(event)" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold mb-1">Coupon Code (Uppercase)</label>
            <input type="text" id="c-code" required class="w-full p-2.5 rounded-lg border border-stone-300 uppercase font-mono font-bold" placeholder="e.g. FLASH20" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold mb-1">Discount %</label>
              <input type="number" id="c-pct" value="15" class="w-full p-2.5 rounded-lg border border-stone-300" />
            </div>
            <div>
              <label class="block font-bold mb-1">Min Spend (₹)</label>
              <input type="number" id="c-min" value="20" class="w-full p-2.5 rounded-lg border border-stone-300" />
            </div>
          </div>

          <div>
            <label class="block font-bold mb-1">Description</label>
            <input type="text" id="c-desc" required value="15% Off All Artisanal Orders" class="w-full p-2.5 rounded-lg border border-stone-300" />
          </div>

          <div>
            <label class="block font-bold mb-1">Expiry Date</label>
            <input type="date" id="c-exp" value="2026-12-31" class="w-full p-2.5 rounded-lg border border-stone-300" />
          </div>

          <button type="submit" class="btn-rosa w-full py-3 mt-4 text-xs font-bold">
            Publish Coupon Code
          </button>
        </form>
      </div>
    `);
  },

  async submitAddCoupon(e) {
    e.preventDefault();
    const payload = {
      code: document.getElementById('c-code').value,
      discountPercent: parseFloat(document.getElementById('c-pct').value) || 0,
      discountFixed: 0,
      minOrder: parseFloat(document.getElementById('c-min').value) || 0,
      description: document.getElementById('c-desc').value,
      expiry: document.getElementById('c-exp').value
    };

    await API.createAdminCoupon(payload);
    showToast(`Coupon "${payload.code}" is now live!`);
    this.closeModal();
    this.renderCoupons(document.getElementById('admin-content-area'));
  },

  openAdjustLoyaltyModal(email, name, stamps, points) {
    this.showModal(`
      <div class="p-6 max-w-md w-full">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 class="font-serif text-2xl font-bold text-stone-900">Adjust Patron Pass</h3>
            <p class="text-xs text-stone-500">${name} (${email})</p>
          </div>
          <button class="text-stone-400 text-2xl" onclick="Admin.closeModal()">&times;</button>
        </div>

        <form onsubmit="Admin.submitAdjustLoyalty(event, '${email}')" class="space-y-3 text-xs">
          <div class="p-3 bg-stone-100 rounded-xl mb-3 flex justify-between font-semibold">
            <span>Current Stamps: <strong>${stamps}/8</strong></span>
            <span>Points: <strong>${points} Pts</strong></span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold mb-1">Stamps Delta (+/-)</label>
              <input type="number" id="adj-stamps" value="1" class="w-full p-2.5 rounded-lg border border-stone-300" />
            </div>
            <div>
              <label class="block font-bold mb-1">Points Delta (+/-)</label>
              <input type="number" id="adj-points" value="50" class="w-full p-2.5 rounded-lg border border-stone-300" />
            </div>
          </div>

          <div>
            <label class="block font-bold mb-1">Reason / Note</label>
            <input type="text" id="adj-reason" required value="VIP Courtesy Bonus" class="w-full p-2.5 rounded-lg border border-stone-300" />
          </div>

          <button type="submit" class="btn-rosa w-full py-3 mt-4 text-xs font-bold">
            Confirm Adjustment
          </button>
        </form>
      </div>
    `);
  },

  async submitAdjustLoyalty(e, email) {
    e.preventDefault();
    const stampChange = parseInt(document.getElementById('adj-stamps').value) || 0;
    const pointsChange = parseInt(document.getElementById('adj-points').value) || 0;
    const reason = document.getElementById('adj-reason').value;

    await API.adjustCustomerLoyalty(email, stampChange, pointsChange, reason);
    showToast('Customer loyalty pass updated.');
    this.closeModal();
    this.renderCustomers(document.getElementById('admin-content-area'));
  },

  async printReceipt(orderId) {
    const data = await API.getOrder(orderId);
    const o = data.order;
    if (!o) return;

    this.showModal(`
      <div class="p-6 max-w-sm w-full">
        <div class="flex justify-between items-center mb-4">
          <span class="font-bold text-xs uppercase text-stone-500">Thermal Kitchen Slip</span>
          <button class="text-stone-400 text-2xl" onclick="Admin.closeModal()">&times;</button>
        </div>

        <div class="thermal-receipt text-xs space-y-3">
          <div class="text-center border-b border-dashed border-stone-400 pb-2">
            <h4 class="font-bold text-base">ANTIQUITY CAFE</h4>
            <p class="text-[10px]">42 Artisanal Blvd &bull; Gourmet Quarter</p>
            <p class="text-[10px]">${new Date(o.createdAt).toLocaleString()}</p>
          </div>

          <div class="flex justify-between font-bold">
            <span>ORDER: ${o.id}</span>
            <span>${o.orderType}</span>
          </div>

          <div class="text-[11px]">
            <p><strong>Customer:</strong> ${o.customerName}</p>
            <p><strong>Table / Loc:</strong> ${o.address}</p>
          </div>

          <div class="border-t border-b border-dashed border-stone-400 py-2 space-y-1.5">
            ${o.items.map((i) => `
              <div class="flex justify-between">
                <div>
                  <span>${i.quantity}x ${i.name}</span>
                  ${i.customDetails ? `<p class="text-[9px] text-stone-600 pl-2">&#8627; ${i.customDetails}</p>` : ''}
                </div>
                <span>₹${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>

          <div class="space-y-1 text-right">
            <div class="flex justify-between"><span>Subtotal:</span><span>₹${o.subtotal.toFixed(2)}</span></div>
            ${o.discount > 0 ? `<div class="flex justify-between text-green-700"><span>Discount:</span><span>-₹${o.discount.toFixed(2)}</span></div>` : ''}
            <div class="flex justify-between font-bold text-sm pt-1 border-t border-stone-300"><span>TOTAL:</span><span>₹${o.total.toFixed(2)}</span></div>
          </div>

          <div class="text-center text-[10px] text-stone-500 pt-2">
            *** THANK YOU FOR VISITING ***
          </div>
        </div>

        <button class="btn-rosa w-full mt-4 text-xs py-2.5 font-bold" onclick="window.print()">
          <i class="fa-solid fa-print mr-1"></i> Send to Hardware Printer
        </button>
      </div>
    `);
  },

  /* CSV Export Utilities */
  async exportOrdersCSV() {
    const data = await API.getOrders();
    const orders = data.orders || [];
    let csv = 'Order ID,Date,Customer,Phone,Type,Items,Total,Status\n';

    orders.forEach((o) => {
      const itemsStr = o.items.map((i) => `${i.quantity}x ${i.name}`).join('; ').replace(/"/g, '""');
      csv += `"${o.id}","${o.createdAt}","${o.customerName}","${o.phone || ''}","${o.orderType}","${itemsStr}","${o.total}","${o.status}"\n`;
    });

    this.downloadCSV(csv, `maison_rosa_orders_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Orders CSV exported!');
  },

  async exportInventoryCSV() {
    const data = await API.getMenu('All');
    const products = data.products || [];
    let csv = 'ID,Name,Category,Price,Calories,Stock,Vegetarian,Vegan\n';

    products.forEach((p) => {
      csv += `"${p.id}","${p.name.replace(/"/g, '""')}","${p.category}","${p.price}","${p.calories}","${p.stock}","${p.isVegetarian}","${p.isVegan}"\n`;
    });

    this.downloadCSV(csv, `maison_rosa_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Inventory CSV exported!');
  },

  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  },

  /* Modal Helpers */
  showModal(htmlContent) {
    let modalEl = document.getElementById('admin-dynamic-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'admin-dynamic-modal';
      modalEl.className = 'modal-overlay';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `<div class="modal-container p-0 overflow-hidden">${htmlContent}</div>`;
    modalEl.classList.add('open');
  },

  closeModal() {
    const modalEl = document.getElementById('admin-dynamic-modal');
    if (modalEl) modalEl.classList.remove('open');
  }
};

window.Admin = Admin;
