/* Customer Account & Order History Management Module */
import { Auth } from './auth.js';
import { API } from './api.js';
import { Cart } from './cart.js';
import { showToast, switchView } from './main.js';

let currentAccountTab = 'orders';
let activeOrderFilter = 'all';
let searchQuery = '';
let fetchedOrders = [];
let userLoyaltyData = null;

export const Account = {
  async init() {
    this.render();
  },

  switchTab(tab) {
    currentAccountTab = tab;
    this.render();
  },

  setFilter(filter) {
    activeOrderFilter = filter;
    this.renderOrdersList();
  },

  setSearch(query) {
    searchQuery = (query || '').toLowerCase().trim();
    this.renderOrdersList();
  },

  async render() {
    const accountEl = document.getElementById('account-container');
    if (!accountEl) return;

    const user = Auth.getUser();

    if (!user) {
      this.renderUnauthenticated(accountEl);
      return;
    }

    // Fetch loyalty data and orders in parallel
    try {
      const [loyaltyRes, ordersRes] = await Promise.all([
        API.getLoyaltyData(user.email).catch(() => null),
        API.getOrders(user.email).catch(() => ({ orders: [] }))
      ]);

      if (loyaltyRes) userLoyaltyData = loyaltyRes;
      fetchedOrders = ordersRes.orders || [];
    } catch (err) {
      console.error('Error fetching account data:', err);
    }

    this.renderAuthenticated(accountEl, user);
  },

  renderUnauthenticated(container) {
    container.innerHTML = `
      <div class="max-w-md mx-auto bg-white p-8 md:p-10 rounded-3xl border border-stone-200 shadow-2xl text-center relative overflow-hidden">
        <div class="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl mx-auto mb-4 shadow-inner">
          <i class="fa-solid fa-mug-hot"></i>
        </div>
        <span class="editorial-badge mb-2"><i class="fa-solid fa-crown"></i> Antiquity Cafe Club</span>
        <h3 class="font-serif text-3xl font-bold text-stone-900 mb-2">Welcome to Antiquity Cafe</h3>
        <p class="text-xs text-stone-500 mb-6 leading-relaxed">Sign in or create an account to view your order history, repeat gourmet orders, and access your digital loyalty rewards pass.</p>

        <!-- Inline Status Alert -->
        <div id="auth-alert" class="hidden mb-5 p-3.5 rounded-xl text-xs flex items-center gap-2.5 text-left transition-all"></div>

        <!-- Auth Tabs Toggle -->
        <div class="flex p-1 bg-stone-100 rounded-xl mb-6 text-xs font-semibold">
          <button type="button" id="auth-tab-login" class="flex-1 py-2.5 rounded-lg bg-white shadow-sm text-stone-900 transition">
            <i class="fa-solid fa-right-to-bracket mr-1.5 text-amber-700"></i> Sign In
          </button>
          <button type="button" id="auth-tab-register" class="flex-1 py-2.5 rounded-lg text-stone-500 hover:text-stone-900 transition">
            <i class="fa-solid fa-user-plus mr-1.5 text-amber-700"></i> Create Account
          </button>
        </div>

        <!-- Sign In Form -->
        <form id="account-login-form" class="space-y-4 text-left">
          <div>
            <label class="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
            <div class="relative">
              <span class="absolute left-3.5 top-3 text-stone-400 text-xs"><i class="fa-solid fa-envelope"></i></span>
              <input type="email" id="login-email" required placeholder="name@example.com" class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700">
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-stone-700 mb-1">Password</label>
            <div class="relative">
              <span class="absolute left-3.5 top-3 text-stone-400 text-xs"><i class="fa-solid fa-lock"></i></span>
              <input type="password" id="login-password" required placeholder="••••••••" class="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700">
              <button type="button" id="toggle-login-pass" class="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs focus:outline-none" title="Toggle password visibility">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>
          <button type="submit" id="btn-login-submit" class="btn-rosa text-xs w-full py-3.5 mt-2 shadow-md flex items-center justify-center gap-2">
            <i class="fa-solid fa-right-to-bracket"></i> <span>Sign In to Account</span>
          </button>

          <p class="text-center text-xs text-stone-500 pt-2">
            New to Antiquity Cafe? <button type="button" id="switch-to-register-link" class="text-amber-800 font-bold hover:underline">Create an account</button>
          </p>
        </form>

        <!-- Register Form -->
        <form id="account-register-form" class="space-y-4 text-left hidden">
          <div>
            <label class="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
            <div class="relative">
              <span class="absolute left-3.5 top-3 text-stone-400 text-xs"><i class="fa-solid fa-user"></i></span>
              <input type="text" id="reg-name" required placeholder="Sophia Laurent" class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700">
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
            <div class="relative">
              <span class="absolute left-3.5 top-3 text-stone-400 text-xs"><i class="fa-solid fa-envelope"></i></span>
              <input type="email" id="reg-email" required placeholder="sophia@example.com" class="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700">
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-stone-700 mb-1">Password</label>
            <div class="relative">
              <span class="absolute left-3.5 top-3 text-stone-400 text-xs"><i class="fa-solid fa-lock"></i></span>
              <input type="password" id="reg-password" required placeholder="Create a password" class="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700">
              <button type="button" id="toggle-reg-pass" class="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs focus:outline-none" title="Toggle password visibility">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>
          <button type="submit" id="btn-reg-submit" class="btn-rosa text-xs w-full py-3.5 mt-2 shadow-md flex items-center justify-center gap-2">
            <i class="fa-solid fa-user-plus"></i> <span>Register & Get 1 Free Stamp</span>
          </button>

          <p class="text-center text-xs text-stone-500 pt-2">
            Already registered? <button type="button" id="switch-to-login-link" class="text-amber-800 font-bold hover:underline">Sign in here</button>
          </p>
        </form>

        <!-- Staff Access Hint -->
        <div class="mt-6 pt-5 border-t border-stone-100 text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-shield-halved text-amber-700"></i>
          <span>Staff & Manager Access: Sign in with your management credentials.</span>
        </div>
      </div>
    `;

    const tabLogin = document.getElementById('auth-tab-login');
    const tabRegister = document.getElementById('auth-tab-register');
    const formLogin = document.getElementById('account-login-form');
    const formRegister = document.getElementById('account-register-form');
    const authAlert = document.getElementById('auth-alert');
    const switchRegLink = document.getElementById('switch-to-register-link');
    const switchLoginLink = document.getElementById('switch-to-login-link');
    const toggleLoginPass = document.getElementById('toggle-login-pass');
    const toggleRegPass = document.getElementById('toggle-reg-pass');

    const showAlert = (msg, isError = true) => {
      if (!authAlert) return;
      authAlert.classList.remove('hidden', 'bg-red-50', 'text-red-800', 'border', 'border-red-200', 'bg-emerald-50', 'text-emerald-800', 'border-emerald-200');
      if (isError) {
        authAlert.classList.add('bg-red-50', 'text-red-800', 'border', 'border-red-200');
        authAlert.innerHTML = `<i class="fa-solid fa-circle-exclamation text-sm flex-shrink-0"></i> <span>${msg}</span>`;
      } else {
        authAlert.classList.add('bg-emerald-50', 'text-emerald-800', 'border', 'border-emerald-200');
        authAlert.innerHTML = `<i class="fa-solid fa-circle-check text-sm flex-shrink-0"></i> <span>${msg}</span>`;
      }
    };

    const hideAlert = () => {
      if (authAlert) authAlert.classList.add('hidden');
    };

    const activateLoginTab = () => {
      hideAlert();
      tabLogin?.classList.add('bg-white', 'shadow-sm', 'text-stone-900');
      tabLogin?.classList.remove('text-stone-500');
      tabRegister?.classList.remove('bg-white', 'shadow-sm', 'text-stone-900');
      tabRegister?.classList.add('text-stone-500');
      formLogin?.classList.remove('hidden');
      formRegister?.classList.add('hidden');
      document.getElementById('login-email')?.focus();
    };

    const activateRegisterTab = () => {
      hideAlert();
      tabRegister?.classList.add('bg-white', 'shadow-sm', 'text-stone-900');
      tabRegister?.classList.remove('text-stone-500');
      tabLogin?.classList.remove('bg-white', 'shadow-sm', 'text-stone-900');
      tabLogin?.classList.add('text-stone-500');
      formRegister?.classList.remove('hidden');
      formLogin?.classList.add('hidden');
      document.getElementById('reg-name')?.focus();
    };

    tabLogin?.addEventListener('click', activateLoginTab);
    tabRegister?.addEventListener('click', activateRegisterTab);
    switchRegLink?.addEventListener('click', activateRegisterTab);
    switchLoginLink?.addEventListener('click', activateLoginTab);

    // Password visibility togglers
    toggleLoginPass?.addEventListener('click', () => {
      const passInput = document.getElementById('login-password');
      if (passInput) {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleLoginPass.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
      }
    });

    toggleRegPass?.addEventListener('click', () => {
      const passInput = document.getElementById('reg-password');
      if (passInput) {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleRegPass.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
      }
    });

    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();
      const email = document.getElementById('login-email')?.value?.trim();
      const pass = document.getElementById('login-password')?.value;
      const btn = document.getElementById('btn-login-submit');

      if (!email || !pass) {
        showAlert('Please enter both your email address and password.');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Signing In...</span>`;
      }

      const res = await Auth.login(email, pass);
      if (!res || !res.success) {
        showAlert(res?.error || 'Invalid email or password. Please try again.');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> <span>Sign In to Account</span>`;
        }
      }
    });

    formRegister?.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();
      const name = document.getElementById('reg-name')?.value?.trim();
      const email = document.getElementById('reg-email')?.value?.trim();
      const pass = document.getElementById('reg-password')?.value;
      const btn = document.getElementById('btn-reg-submit');

      if (!name || !email || !pass) {
        showAlert('Please fill in your name, email, and password.');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Creating Account...</span>`;
      }

      const res = await Auth.register(name, email, pass);
      if (!res || !res.success) {
        showAlert(res?.error || 'Registration failed. Please check your details.');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> <span>Register & Get 1 Free Stamp</span>`;
        }
      }
    });
  },

  renderAuthenticated(container, user) {
    const points = userLoyaltyData ? userLoyaltyData.points : (user.points || 0);
    const stamps = userLoyaltyData ? userLoyaltyData.stamps : ((user.stamps || 0) % 8);
    const activeVouchers = (userLoyaltyData?.vouchers || user?.vouchers || []).filter(v => !v.used);
    const tier = userLoyaltyData?.tier || 'Gold Connoisseur';
    const totalSpent = fetchedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-8">
        <!-- Account Hero Header -->
        <div class="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-stone-700 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-900 flex items-center justify-center font-serif font-bold text-2xl md:text-3xl shadow-lg border-2 border-amber-200/50">
                ${user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    <i class="fa-solid fa-crown mr-1"></i> ${tier}
                  </span>
                  <span class="text-[10px] text-stone-400">Member #${user.id || 'RM-8842'}</span>
                </div>
                <h2 class="font-serif text-2xl md:text-3xl font-bold text-white mt-1">${user.name}</h2>
                <p class="text-xs text-stone-300">${user.email}</p>
              </div>
            </div>

            <!-- Quick Member Metrics -->
            <div class="grid grid-cols-3 gap-3 bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 w-full md:w-auto text-center">
              <div class="px-3 border-r border-white/10">
                <span class="text-[10px] text-amber-300 uppercase tracking-wider block font-semibold">Orders</span>
                <span class="font-serif text-xl font-bold text-white">${fetchedOrders.length}</span>
              </div>
              <div class="px-3 border-r border-white/10">
                <span class="text-[10px] text-amber-300 uppercase tracking-wider block font-semibold">Points</span>
                <span class="font-serif text-xl font-bold text-amber-400">${points}</span>
              </div>
              <div class="px-3">
                <span class="text-[10px] text-amber-300 uppercase tracking-wider block font-semibold">Stamps</span>
                <span class="font-serif text-xl font-bold text-white">${stamps}/8</span>
              </div>
            </div>
          </div>

          <!-- Account Top Action Bar -->
          <div class="flex flex-wrap gap-2.5 mt-6 pt-6 border-t border-white/10 items-center justify-between">
            <div class="flex flex-wrap gap-2 text-xs">
              ${user.role === 'admin' ? `
                <button class="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2 rounded-full transition shadow-lg flex items-center gap-1.5 border border-amber-300 animate-pulse" onclick="switchView('admin')">
                  <i class="fa-solid fa-shield-halved"></i> Launch Manager Portal
                </button>
              ` : ''}
              <button class="bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold px-4 py-2 rounded-full transition shadow-sm flex items-center gap-1.5" onclick="switchView('loyalty')">
                <i class="fa-solid fa-stamp"></i> Digital Stamp Card (${stamps}/8)
              </button>
              ${activeVouchers.length > 0 ? `
                <button class="bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30 font-semibold px-4 py-2 rounded-full transition flex items-center gap-1.5" onclick="switchView('loyalty'); if (typeof Loyalty !== 'undefined') Loyalty.switchTab('vouchers');">
                  <i class="fa-solid fa-ticket"></i> My Vouchers (${activeVouchers.length})
                </button>
              ` : ''}
            </div>

            <div class="flex items-center gap-2">
              ${user.role === 'admin' ? `
                <button class="text-xs text-amber-400 hover:text-white px-3 py-1.5 rounded-lg border border-amber-500/40 hover:border-amber-400 transition flex items-center gap-1.5" onclick="switchView('admin')">
                  <i class="fa-solid fa-chart-pie"></i> Admin Panel
                </button>
              ` : ''}
              <button class="text-xs text-stone-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30 transition flex items-center gap-1.5" onclick="Auth.logout()">
                <i class="fa-solid fa-right-from-bracket"></i> Sign Out
              </button>
            </div>
          </div>
        </div>

        ${user.role === 'admin' ? `
          <!-- Admin Quick Action Notice -->
          <div class="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center text-lg font-bold shadow-md flex-shrink-0">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h4 class="font-bold text-[#FAF6F2] text-sm">Manager Privileges Active</h4>
                <p class="text-xs text-stone-300">You are signed in as a Café Administrator with full access to live KDS, inventory, and promotions.</p>
              </div>
            </div>
            <button class="btn-rosa text-xs py-2.5 px-5 font-bold shadow-md flex items-center gap-2 whitespace-nowrap" onclick="switchView('admin')">
              <i class="fa-solid fa-chart-pie"></i> Open Admin Operations
            </button>
          </div>
        ` : ''}

        <!-- Sub-Navigation Tabs -->
        <div class="flex flex-wrap justify-center sm:justify-start gap-2 bg-stone-200/60 p-1.5 rounded-2xl max-w-xl text-xs font-semibold">
          <button class="px-5 py-2.5 rounded-xl transition-all ${currentAccountTab === 'orders' ? 'bg-stone-900 text-amber-400 shadow-md' : 'text-stone-600 hover:text-stone-900'}" onclick="Account.switchTab('orders')">
            <i class="fa-solid fa-receipt mr-1.5"></i> Order History (${fetchedOrders.length})
          </button>
          <button class="px-5 py-2.5 rounded-xl transition-all ${currentAccountTab === 'profile' ? 'bg-stone-900 text-amber-400 shadow-md' : 'text-stone-600 hover:text-stone-900'}" onclick="Account.switchTab('profile')">
            <i class="fa-solid fa-id-card-clip mr-1.5"></i> Flavour Profile & Pass
          </button>
          <button class="px-5 py-2.5 rounded-xl transition-all ${currentAccountTab === 'creations' ? 'bg-stone-900 text-amber-400 shadow-md' : 'text-stone-600 hover:text-stone-900'}" onclick="Account.switchTab('creations')">
            <i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i> Custom Creations
          </button>
        </div>

        <!-- TAB CONTENT CONTAINER -->
        <div id="account-tab-content">
          ${currentAccountTab === 'orders' ? this.getOrderHistoryMarkup() : ''}
          ${currentAccountTab === 'profile' ? this.getProfileMarkup(user, points, stamps, tier, totalSpent) : ''}
          ${currentAccountTab === 'creations' ? this.getCustomCreationsMarkup(user) : ''}
        </div>
      </div>
    `;

    if (currentAccountTab === 'orders') {
      this.renderOrdersList();
    }
  },

  getOrderHistoryMarkup() {
    return `
      <div class="space-y-6">
        <!-- Order History Controls & Filter Bar -->
        <div class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <!-- Filter Buttons -->
          <div class="flex flex-wrap gap-1.5 text-xs font-semibold" id="order-filter-buttons">
            <button class="px-3.5 py-1.5 rounded-xl transition ${activeOrderFilter === 'all' ? 'bg-amber-800 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}" onclick="Account.setFilter('all')">
              All Orders (${fetchedOrders.length})
            </button>
            <button class="px-3.5 py-1.5 rounded-xl transition ${activeOrderFilter === 'active' ? 'bg-amber-800 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}" onclick="Account.setFilter('active')">
              Active / In Progress (${fetchedOrders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length})
            </button>
            <button class="px-3.5 py-1.5 rounded-xl transition ${activeOrderFilter === 'completed' ? 'bg-amber-800 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}" onclick="Account.setFilter('completed')">
              Delivered (${fetchedOrders.filter(o => o.status === 'Delivered').length})
            </button>
            <button class="px-3.5 py-1.5 rounded-xl transition ${activeOrderFilter === 'dinein' ? 'bg-amber-800 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}" onclick="Account.setFilter('dinein')">
              <i class="fa-solid fa-utensils mr-1"></i> Dine-In
            </button>
            <button class="px-3.5 py-1.5 rounded-xl transition ${activeOrderFilter === 'delivery' ? 'bg-amber-800 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}" onclick="Account.setFilter('delivery')">
              <i class="fa-solid fa-bicycle mr-1"></i> Delivery
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative min-w-[220px]">
            <span class="absolute left-3 top-2.5 text-stone-400 text-xs"><i class="fa-solid fa-magnifying-glass"></i></span>
            <input type="text" id="order-search-input" placeholder="Search orders or items..." class="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-amber-700 bg-stone-50/50" value="${searchQuery}" oninput="Account.setSearch(this.value)">
          </div>
        </div>

        <!-- Orders List Target -->
        <div id="orders-list-target" class="space-y-4">
          <!-- Populated by renderOrdersList() -->
        </div>
      </div>
    `;
  },

  renderOrdersList() {
    const listEl = document.getElementById('orders-list-target');
    if (!listEl) return;

    let filtered = [...fetchedOrders];

    // Filter by tab
    if (activeOrderFilter === 'active') {
      filtered = filtered.filter(o => !['Delivered', 'Cancelled'].includes(o.status));
    } else if (activeOrderFilter === 'completed') {
      filtered = filtered.filter(o => o.status === 'Delivered');
    } else if (activeOrderFilter === 'dinein') {
      filtered = filtered.filter(o => (o.orderType || '').toLowerCase().includes('dine'));
    } else if (activeOrderFilter === 'delivery') {
      filtered = filtered.filter(o => (o.orderType || '').toLowerCase().includes('delivery'));
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(o => {
        const idMatch = o.id.toLowerCase().includes(searchQuery);
        const itemMatch = (o.items || []).some(i => i.name.toLowerCase().includes(searchQuery) || (i.customDetails || '').toLowerCase().includes(searchQuery));
        const addrMatch = (o.address || '').toLowerCase().includes(searchQuery);
        return idMatch || itemMatch || addrMatch;
      });
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="bg-white p-12 rounded-3xl border border-stone-200 text-center shadow-sm">
          <div class="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center text-3xl mx-auto mb-4">
            <i class="fa-solid fa-receipt"></i>
          </div>
          <h4 class="font-serif text-2xl font-bold text-stone-900 mb-2">No Orders Found</h4>
          <p class="text-xs text-stone-500 max-w-md mx-auto mb-6">
            ${searchQuery ? `No past orders matching "${searchQuery}". Try a different search term.` : 'You haven’t placed any orders matching this filter yet. Explore our handcrafted artisanal menu or build your own brew!'}
          </p>
          <div class="flex justify-center gap-3">
            <button class="btn-rosa text-xs py-2.5 px-6" onclick="switchView('menu')">
              <i class="fa-solid fa-book-open mr-1"></i> Explore Digital Menu
            </button>
            <button class="btn-rosa-outline text-xs py-2.5 px-6" onclick="switchView('builders')">
              <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Custom Brew Builder
            </button>
          </div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(order => this.renderSingleOrderCard(order)).join('');
  },

  renderSingleOrderCard(order) {
    const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Recent Order';

    const statusBadgeClasses = {
      'Order Received': 'bg-blue-100 text-blue-800 border-blue-200',
      'Confirmed': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Preparing': 'bg-amber-100 text-amber-800 border-amber-200',
      'Ready': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Out for Delivery': 'bg-purple-100 text-purple-800 border-purple-200',
      'Delivered': 'bg-stone-100 text-stone-800 border-stone-200',
      'Cancelled': 'bg-red-100 text-red-800 border-red-200'
    };

    const statusBadge = statusBadgeClasses[order.status] || 'bg-stone-100 text-stone-800 border-stone-200';

    const orderTypeIcon = (order.orderType || '').toLowerCase().includes('dine') ? 'fa-utensils' :
      (order.orderType || '').toLowerCase().includes('takeaway') ? 'fa-bag-shopping' : 'fa-bicycle';

    const totalItemQty = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

    return `
      <div class="bg-white rounded-3xl border border-stone-200/90 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden" id="order-card-${order.id}">
        <!-- Order Header Banner -->
        <div class="bg-stone-50 p-5 border-b border-stone-200 flex flex-wrap justify-between items-center gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center text-base font-bold shadow-sm">
              <i class="fa-solid ${orderTypeIcon}"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-serif font-bold text-lg text-stone-900">Order #${order.id}</span>
                <span class="text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${statusBadge}">
                  <span class="w-1.5 h-1.5 rounded-full inline-block mr-1 ${order.status === 'Preparing' || order.status === 'Out for Delivery' ? 'animate-pulse bg-amber-600' : 'bg-stone-600'}"></span>
                  ${order.status}
                </span>
              </div>
              <p class="text-[11px] text-stone-500 flex items-center gap-2">
                <span><i class="fa-regular fa-calendar mr-1"></i> ${formattedDate}</span>
                <span>•</span>
                <span><i class="fa-solid fa-location-dot mr-1"></i> ${order.address || 'Antiquity Counter'}</span>
              </p>
            </div>
          </div>

          <!-- Total & Repeat Action Header Shortcut -->
          <div class="flex items-center gap-3">
            <div class="text-right">
              <span class="text-[10px] uppercase tracking-wider font-semibold text-stone-400 block">Total Paid</span>
              <span class="font-serif text-xl font-bold text-stone-900">₹${(order.total || 0).toFixed(2)}</span>
            </div>
            <button class="btn-rosa text-xs py-2.5 px-4 shadow-sm hover:scale-[1.02] active:scale-95 transition-transform flex items-center gap-1.5" onclick="Account.repeatOrder('${order.id}')" title="Reorder all items from this order">
              <i class="fa-solid fa-rotate-right"></i>
              <span class="font-bold">Repeat Order</span>
            </button>
          </div>
        </div>

        <!-- Order Items Section -->
        <div class="p-5 md:p-6 space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${(order.items || []).map((item, idx) => `
              <div class="flex items-center justify-between p-3 rounded-2xl bg-stone-50/80 border border-stone-200/70 hover:bg-stone-50 transition">
                <div class="flex items-center gap-3 min-w-0">
                  <img src="${item.image || 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=200&q=80'}" alt="${item.name}" class="w-12 h-12 object-cover rounded-xl border border-stone-200 shrink-0" onerror="this.src='https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=200&q=80'">
                  <div class="min-w-0">
                    <p class="font-bold text-xs text-stone-900 truncate flex items-center gap-1.5">
                      <span class="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md">${item.quantity || 1}x</span>
                      <span class="truncate">${item.name}</span>
                    </p>
                    ${item.customDetails ? `<p class="text-[11px] text-amber-800/90 italic truncate">${item.customDetails}</p>` : ''}
                    <p class="text-[11px] font-semibold text-stone-600 mt-0.5">₹${(item.price || 0).toFixed(2)} each</p>
                  </div>
                </div>
                <button class="text-xs text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1.5 rounded-xl font-bold ml-2 shrink-0 transition" onclick="Account.repeatSingleItem('${order.id}', ${idx})" title="Add this item to cart">
                  <i class="fa-solid fa-cart-plus mr-1"></i> Add
                </button>
              </div>
            `).join('')}
          </div>

          <!-- Order Summary Breakdown Footer -->
          <div class="pt-4 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-stone-600">
            <div class="flex flex-wrap gap-4 text-[11px]">
              <span>Subtotal: <strong class="text-stone-800">₹${(order.subtotal || 0).toFixed(2)}</strong></span>
              ${order.discount > 0 ? `<span class="text-emerald-700">Discount: <strong>-₹${(order.discount || 0).toFixed(2)}</strong></span>` : ''}
              <span>Tax: <strong class="text-stone-800">₹${(order.tax || 0).toFixed(2)}</strong></span>
              <span>Delivery Fee: <strong class="text-stone-800">₹${(order.deliveryFee || 0).toFixed(2)}</strong></span>
            </div>

            <!-- Action Controls -->
            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button class="text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition flex items-center gap-1" onclick="Account.showReceiptModal('${order.id}')">
                <i class="fa-solid fa-receipt text-stone-500"></i> View Receipt
              </button>
              <button class="text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition flex items-center gap-1" onclick="Account.trackOrder('${order.id}')">
                <i class="fa-solid fa-location-arrow"></i> Live Track
              </button>
              <button class="btn-rosa text-xs py-1.5 px-4 font-bold shadow-sm flex items-center gap-1.5" onclick="Account.repeatOrder('${order.id}')">
                <i class="fa-solid fa-rotate-right"></i> Repeat Order (${totalItemQty})
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  getProfileMarkup(user, points, stamps, tier, totalSpent) {
    return `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
          <div>
            <h4 class="font-serif text-2xl font-bold text-stone-900 mb-1">Patron Profile & Preferences</h4>
            <p class="text-xs text-stone-500">Manage your culinary profile, taste quiz preferences, and saved café configurations.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div class="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span class="text-[10px] text-amber-700 font-bold uppercase block tracking-wider">Full Name</span>
              <p class="font-serif text-lg font-bold text-stone-900 mt-1">${user.name}</p>
            </div>
            <div class="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span class="text-[10px] text-amber-700 font-bold uppercase block tracking-wider">Email Address</span>
              <p class="font-mono text-xs font-bold text-stone-900 mt-1">${user.email}</p>
            </div>
            <div class="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span class="text-[10px] text-amber-700 font-bold uppercase block tracking-wider">Payment Preference</span>
              <div class="flex items-center justify-between mt-1">
                <p class="font-mono text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <i class="fa-solid fa-bolt text-amber-600"></i>
                  <span>Razorpay / Cards / UPI</span>
                </p>
                <span class="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">Active</span>
              </div>
              <span class="text-[10px] text-stone-500 mt-1 block">Secure online & counter payments</span>
            </div>
            <div class="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span class="text-[10px] text-amber-700 font-bold uppercase block tracking-wider">Flavour Profile Identity</span>
              <p class="font-serif text-sm font-bold text-amber-900 mt-1">
                ${user.flavourProfile || 'Sweet & Creamy Connoisseur'}
              </p>
              <button class="text-[11px] text-amber-800 underline font-semibold mt-2 block" onclick="switchView('quiz')">Retake Flavour Quiz <i class="fa-solid fa-arrow-right ml-1"></i></button>
            </div>
            <div class="p-4 rounded-2xl bg-stone-50 border border-stone-200 sm:col-span-2">
              <span class="text-[10px] text-amber-700 font-bold uppercase block tracking-wider">Lifetime Café Spend</span>
              <p class="font-serif text-lg font-bold text-stone-900 mt-1">₹${totalSpent.toFixed(2)}</p>
              <span class="text-[10px] text-stone-500">${fetchedOrders.length} completed orders &bull; 100% digital payment verified</span>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-white p-6 rounded-3xl border border-amber-400/30 shadow-xl flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start mb-4">
              <span class="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full font-bold uppercase">
                ${tier}
              </span>
              <i class="fa-solid fa-crown text-amber-400 text-xl"></i>
            </div>
            <h5 class="font-serif text-2xl font-bold text-white mb-2">Digital Pass Wallet</h5>
            <p class="text-xs text-stone-300 leading-relaxed mb-6">Your pass earns 1 stamp for every coffee order. 8 stamps automatically earns you a 100% Free Artisanal Brew Pass.</p>

            <div class="bg-white/10 p-4 rounded-2xl border border-white/15 mb-4">
              <div class="flex justify-between text-xs font-bold text-amber-300 mb-2">
                <span>Stamp Progress</span>
                <span>${stamps} / 8 Stamps</span>
              </div>
              <div class="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden">
                <div class="bg-amber-400 h-full rounded-full transition-all duration-500" style="width: ${(stamps / 8) * 100}%"></div>
              </div>
            </div>
          </div>

          <button class="btn-gold text-xs py-3 w-full" onclick="switchView('loyalty')">
            <i class="fa-solid fa-id-card mr-1.5"></i> Open Full Loyalty Pass
          </button>
        </div>
      </div>
    `;
  },

  getCustomCreationsMarkup(user) {
    return `
      <div class="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-3xl mx-auto mb-2">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </div>
        <h4 class="font-serif text-2xl font-bold text-stone-900">Custom Crafted Recipes</h4>
        <p class="text-xs text-stone-500 max-w-md mx-auto">Design bespoke coffee brews, personalized bronze-cut pasta bowls, or grand top-down meal plates in our Interactive Studio.</p>
        <div class="flex flex-wrap justify-center gap-3 pt-2">
          <button class="btn-rosa text-xs py-2.5 px-6" onclick="switchView('builders')">
            <i class="fa-solid fa-mug-hot mr-1.5"></i> Create Your Brew
          </button>
          <button class="btn-rosa-outline text-xs py-2.5 px-6" onclick="switchView('builders')">
            <i class="fa-solid fa-utensils mr-1.5"></i> Create Your Meal
          </button>
        </div>
      </div>
    `;
  },

  repeatOrder(orderId) {
    const order = fetchedOrders.find(o => o.id === orderId);
    if (!order) {
      showToast('Order not found.');
      return;
    }

    Cart.repeatOrder(order);
  },

  repeatSingleItem(orderId, itemIndex) {
    const order = fetchedOrders.find(o => o.id === orderId);
    if (!order || !order.items || !order.items[itemIndex]) {
      showToast('Item not found.');
      return;
    }

    const item = order.items[itemIndex];
    Cart.addOrderItem(item);
  },

  trackOrder(orderId) {
    switchView('order-tracking');
    if (typeof window.loadOrderTracking === 'function') {
      window.loadOrderTracking(orderId);
    }
  },

  showReceiptModal(orderId) {
    const order = fetchedOrders.find(o => o.id === orderId);
    if (!order) return;

    let modal = document.getElementById('account-receipt-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'account-receipt-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Recent Order';

    modal.innerHTML = `
      <div class="modal-container max-w-lg bg-white rounded-3xl p-8 shadow-2xl border border-stone-200 relative">
        <button class="absolute top-5 right-5 text-stone-400 hover:text-stone-800 text-2xl font-bold" onclick="document.getElementById('account-receipt-modal').classList.remove('open')">&times;</button>
        
        <div class="text-center pb-6 border-b border-dashed border-stone-300">
          <span class="editorial-badge mb-2"><i class="fa-solid fa-mug-saucer"></i> Official Cafe Receipt</span>
          <h3 class="font-serif text-3xl font-bold text-stone-900">Antiquity Cafe</h3>
          <p class="text-[11px] text-stone-500">42 Artisanal Boulevard • Gourmet Quarter</p>
          <p class="text-[11px] text-stone-400 mt-1">Order Ref: <span class="font-mono font-bold text-stone-800">#${order.id}</span> • ${formattedDate}</p>
        </div>

        <div class="py-6 space-y-3 border-b border-dashed border-stone-300 text-xs">
          ${(order.items || []).map(i => `
            <div class="flex justify-between items-start">
              <div>
                <span class="font-bold text-stone-900">${i.quantity}x ${i.name}</span>
                ${i.customDetails ? `<p class="text-[10px] text-stone-500 italic">${i.customDetails}</p>` : ''}
              </div>
              <span class="font-semibold text-stone-900">₹${((i.price || 0) * (i.quantity || 1)).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>

        <div class="py-4 space-y-2 text-xs border-b border-stone-200">
          <div class="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span>₹${(order.subtotal || 0).toFixed(2)}</span>
          </div>
          ${order.discount > 0 ? `
            <div class="flex justify-between text-emerald-700 font-semibold">
              <span>Member Discount</span>
              <span>-₹${(order.discount || 0).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="flex justify-between text-stone-600">
            <span>Tax (9%)</span>
            <span>₹${(order.tax || 0).toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-stone-600">
            <span>Delivery / Service</span>
            <span>₹${(order.deliveryFee || 0).toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-base font-serif font-bold text-stone-900 pt-2 border-t border-stone-200">
            <span>Total Paid</span>
            <span class="text-amber-900">₹${(order.total || 0).toFixed(2)}</span>
          </div>
          <div class="flex justify-between items-center text-[11px] pt-1 text-stone-500">
            <span>Payment Method</span>
            <span class="font-semibold text-stone-800 flex items-center gap-1">
              ${(order.paymentMethod || '').includes('Razorpay') ? '<i class="fa-solid fa-bolt text-amber-600"></i>' : '<i class="fa-solid fa-credit-card"></i>'}
              ${order.paymentMethod || 'Razorpay'} (${order.paymentStatus || 'Paid'})
            </span>
          </div>
        </div>

        <div class="pt-4 text-center space-y-3">
          <p class="text-[11px] text-stone-500">Delivered to: <strong class="text-stone-800">${order.address}</strong></p>
          <div class="flex gap-2">
            <button class="btn-rosa text-xs py-2.5 flex-1 shadow-sm font-bold" onclick="Account.repeatOrder('${order.id}'); document.getElementById('account-receipt-modal').classList.remove('open');">
              <i class="fa-solid fa-rotate-right mr-1"></i> Repeat Order Now
            </button>
            <button class="btn-rosa-outline text-xs py-2.5 px-4" onclick="window.print()">
              <i class="fa-solid fa-print mr-1"></i> Print
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }
};

window.Account = Account;
