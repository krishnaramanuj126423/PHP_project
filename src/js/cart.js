/* Shopping Cart State & Drawer Logic */
import { showToast, switchView } from './main.js';
import { API } from './api.js';
import { Auth } from './auth.js';

let cartItems = JSON.parse(localStorage.getItem('rosa_cart') || '[]');
let appliedCoupon = null;
let pendingCouponCode = null;

export const Cart = {
  getItems() {
    return cartItems;
  },

  getAppliedCouponCode() {
    return appliedCoupon ? appliedCoupon.code : (pendingCouponCode || '');
  },

  addItem(product, quantity = 1, customDetails = '') {
    const existingIndex = cartItems.findIndex(
      item => item.id === product.id && item.customDetails === customDetails
    );

    if (existingIndex > -1) {
      cartItems[existingIndex].quantity += quantity;
    } else {
      cartItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity,
        customDetails
      });
    }

    this.save();

    // Auto-apply pending coupon if exists
    if (pendingCouponCode && !appliedCoupon) {
      this.applyCouponCode(pendingCouponCode);
    } else {
      this.render();
    }
    showToast(`Added "${product.name}" to cart!`);
  },

  updateQuantity(index, quantity) {
    if (quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      cartItems[index].quantity = quantity;
    }
    this.save();
    this.render();
  },

  removeItem(index) {
    cartItems.splice(index, 1);
    this.save();
    this.render();
    showToast('Item removed from cart.');
  },

  clear() {
    cartItems = [];
    appliedCoupon = null;
    pendingCouponCode = null;
    this.save();
    this.render();
  },

  save() {
    localStorage.setItem('rosa_cart', JSON.stringify(cartItems));
  },

  getSubtotal() {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getDiscount() {
    if (!appliedCoupon) return 0;
    const subtotal = this.getSubtotal();
    if (appliedCoupon.discountPercent > 0) {
      return (subtotal * appliedCoupon.discountPercent) / 100;
    }
    return appliedCoupon.discountFixed || 0;
  },

  getTax() {
    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    return Math.max(0, subtotal - discount) * 0.09; // 9% tax
  },

  getDeliveryFee() {
    const subtotal = this.getSubtotal();
    return subtotal > 0 ? (subtotal > 50 ? 0 : 3.50) : 0;
  },

  getTotal() {
    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    const tax = this.getTax();
    const fee = this.getDeliveryFee();
    return Math.max(0, subtotal - discount + tax + fee);
  },

  async applyCouponCode(code) {
    const inputEl = document.getElementById('coupon-input-field');
    if (inputEl) inputEl.value = code;

    const subtotal = this.getSubtotal();
    if (subtotal <= 0) {
      pendingCouponCode = code;
      showToast(`Voucher code "${code}" saved! Add items to cart to redeem discount.`);
      this.render();
      return;
    }

    try {
      const res = await API.validateCoupon(code, subtotal);
      if (res.valid) {
        appliedCoupon = res.coupon;
        pendingCouponCode = null;
        showToast(res.message || `Voucher code ${code} applied successfully! 🎉`);
        this.render();
      } else {
        showToast(res.message || 'Invalid coupon.');
      }
    } catch (err) {
      showToast('Error validating coupon.');
    }
  },

  repeatOrder(order, replaceCart = false) {
    if (!order || !order.items || order.items.length === 0) {
      showToast('No items found in this order to repeat.');
      return;
    }

    if (replaceCart) {
      cartItems = [];
    }

    let addedCount = 0;
    for (const item of order.items) {
      const existingIndex = cartItems.findIndex(
        ci => ci.name === item.name && (ci.customDetails || '') === (item.customDetails || '')
      );

      const itemImage = item.image || (
        item.name.toLowerCase().includes('cappuccino') ? 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80' :
        item.name.toLowerCase().includes('espresso') ? 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80' :
        item.name.toLowerCase().includes('latte') || item.name.toLowerCase().includes('matcha') ? 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80' :
        item.name.toLowerCase().includes('cold brew') || item.name.toLowerCase().includes('iced') ? 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80' :
        item.name.toLowerCase().includes('tartine') || item.name.toLowerCase().includes('avocado') ? 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80' :
        item.name.toLowerCase().includes('pasta') || item.name.toLowerCase().includes('rigatoni') ? 'https://images.unsplash.com/photo-1621996346565-e3d5d628165d?auto=format&fit=crop&w=600&q=80' :
        item.name.toLowerCase().includes('croissant') ? 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80' :
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80'
      );

      const qty = item.quantity || 1;
      addedCount += qty;

      if (existingIndex > -1) {
        cartItems[existingIndex].quantity += qty;
      } else {
        cartItems.push({
          id: item.id || 'reorder_' + Math.random().toString(36).substring(2, 9),
          name: item.name,
          price: item.price || 0,
          image: itemImage,
          quantity: qty,
          customDetails: item.customDetails || ''
        });
      }
    }

    this.save();
    this.render();
    showToast(`Repeated Order #${order.id}! ${addedCount} items loaded to cart. 🎉`);

    // Auto open the cart drawer
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer && !drawer.classList.contains('open')) {
      drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
    }
  },

  addOrderItem(item) {
    if (!item) return;
    const itemImage = item.image || (
      item.name.toLowerCase().includes('cappuccino') ? 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80' :
      item.name.toLowerCase().includes('espresso') ? 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80' :
      item.name.toLowerCase().includes('latte') || item.name.toLowerCase().includes('matcha') ? 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80' :
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80'
    );

    const existingIndex = cartItems.findIndex(
      ci => ci.name === item.name && (ci.customDetails || '') === (item.customDetails || '')
    );

    const qty = item.quantity || 1;
    if (existingIndex > -1) {
      cartItems[existingIndex].quantity += qty;
    } else {
      cartItems.push({
        id: item.id || 'reorder_item_' + Math.random().toString(36).substring(2, 9),
        name: item.name,
        price: item.price || 0,
        image: itemImage,
        quantity: qty,
        customDetails: item.customDetails || ''
      });
    }

    this.save();
    this.render();
    showToast(`Added "${item.name}" to cart! ☕`);

    // Auto open cart drawer
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer && !drawer.classList.contains('open')) {
      drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
    }
  },

  render() {
    const cartCountEl = document.getElementById('cart-badge-count');
    const drawerListEl = document.getElementById('cart-drawer-list');
    const drawerSubtotalEl = document.getElementById('cart-drawer-subtotal');
    const drawerTotalEl = document.getElementById('cart-drawer-total');
    const drawerDiscountEl = document.getElementById('cart-drawer-discount');

    const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountEl) cartCountEl.textContent = totalQty;

    if (drawerListEl) {
      if (cartItems.length === 0) {
        drawerListEl.innerHTML = `
          <div class="text-center py-12 text-stone-400">
            <i class="fa-solid fa-mug-hot text-4xl mb-3 text-amber-800/30"></i>
            <p class="font-medium text-stone-600">Your cart is currently empty</p>
            <p class="text-xs text-stone-400 mt-1">Explore our artisanal menu or create a custom brew!</p>
          </div>
        `;
      } else {
        drawerListEl.innerHTML = cartItems.map((item, index) => `
          <div class="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/60">
            <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg">
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-sm text-stone-900 truncate">${item.name}</h4>
              ${item.customDetails ? `<p class="text-xs text-amber-800/80 italic truncate">${item.customDetails}</p>` : ''}
              <p class="text-sm font-semibold text-stone-900 mt-1">₹${item.price.toFixed(2)}</p>
            </div>
            <div class="flex items-center gap-2">
              <button class="w-6 h-6 rounded-full bg-stone-200 text-stone-800 text-xs hover:bg-stone-300 font-bold" onclick="Cart.updateQuantity(${index}, ${item.quantity - 1})">-</button>
              <span class="text-xs font-semibold w-4 text-center">${item.quantity}</span>
              <button class="w-6 h-6 rounded-full bg-stone-200 text-stone-800 text-xs hover:bg-stone-300 font-bold" onclick="Cart.updateQuantity(${index}, ${item.quantity + 1})">+</button>
              <button class="text-stone-400 hover:text-red-600 text-sm ml-1" onclick="Cart.removeItem(${index})"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
        `).join('');
      }
    }

    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    const total = this.getTotal();

    if (drawerSubtotalEl) drawerSubtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (drawerDiscountEl) drawerDiscountEl.textContent = `-₹${discount.toFixed(2)}`;
    if (drawerTotalEl) drawerTotalEl.textContent = `₹${total.toFixed(2)}`;
  },

  openCheckout() {
    const user = Auth.getUser();

    // Enforce Login Requirement to Order
    if (!user) {
      showToast('Please sign in or create an account to proceed with your order.');
      sessionStorage.setItem('rosa_redirect_checkout', 'true');
      
      const drawer = document.getElementById('cart-drawer');
      const overlay = document.getElementById('cart-overlay');
      if (drawer) drawer.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      
      switchView('account');
      return;
    }

    if (cartItems.length === 0) {
      showToast('Your cart is empty. Please add gourmet items from our menu first.');
      return;
    }

    // Populate user profile info in checkout modal
    const userDisplay = document.getElementById('checkout-user-display');
    const authBanner = document.getElementById('checkout-auth-banner');
    const loginGuard = document.getElementById('checkout-login-guard');
    const nameInput = document.getElementById('checkout-name');
    const emailInput = document.getElementById('checkout-email');

    if (userDisplay) {
      userDisplay.textContent = `${user.name} (${user.email})`;
    }
    if (authBanner) authBanner.classList.remove('hidden');
    if (loginGuard) loginGuard.classList.add('hidden');

    if (nameInput && (!nameInput.value || nameInput.value.trim() === '')) {
      nameInput.value = user.name || '';
    }
    if (emailInput) {
      emailInput.value = user.email || '';
      emailInput.readOnly = true;
      emailInput.classList.add('bg-stone-50', 'text-stone-700');
    }

    this.renderCheckoutSummary();

    const checkoutModal = document.getElementById('checkout-modal');
    if (checkoutModal) {
      checkoutModal.classList.add('open');
    }
  },

  renderCheckoutSummary() {
    const itemsCountEl = document.getElementById('checkout-items-count');
    const summaryTotalEl = document.getElementById('checkout-summary-total');
    const itemsListEl = document.getElementById('checkout-items-list');
    const subtotalEl = document.getElementById('checkout-subtotal-val');
    const discountEl = document.getElementById('checkout-discount-val');
    const taxEl = document.getElementById('checkout-tax-val');
    const deliveryEl = document.getElementById('checkout-delivery-val');
    const submitTextEl = document.getElementById('checkout-submit-text');

    const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    const tax = this.getTax();
    const delivery = this.getDeliveryFee();
    const total = this.getTotal();

    if (itemsCountEl) itemsCountEl.textContent = totalQty;
    if (summaryTotalEl) summaryTotalEl.textContent = `₹${total.toFixed(2)}`;
    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `-₹${discount.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `₹${tax.toFixed(2)}`;
    if (deliveryEl) deliveryEl.textContent = delivery > 0 ? `₹${delivery.toFixed(2)}` : 'FREE';

    if (itemsListEl) {
      itemsListEl.innerHTML = cartItems.map(item => `
        <div class="flex justify-between items-center py-1 text-stone-700">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-5 h-5 rounded-md bg-stone-200 text-stone-800 flex items-center justify-center text-[10px] font-bold flex-shrink-0">${item.quantity}x</span>
            <span class="truncate font-medium">${item.name}</span>
          </div>
          <span class="font-semibold text-stone-900 ml-2">₹${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      `).join('');
    }

    // Update submit button with active total
    const activeMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'Razorpay';
    const submitBtn = document.getElementById('checkout-submit-btn');
    if (submitTextEl) {
      if (activeMethod === 'Razorpay') {
        submitTextEl.textContent = `Pay with Razorpay (₹${total.toFixed(2)})`;
        if (submitBtn) {
          const icon = submitBtn.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-bolt';
        }
      } else if (activeMethod === 'Credit/Debit Card') {
        submitTextEl.textContent = `Pay with Card (₹${total.toFixed(2)})`;
        if (submitBtn) {
          const icon = submitBtn.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-credit-card';
        }
      } else {
        submitTextEl.textContent = `Confirm & Pay at Counter (₹${total.toFixed(2)})`;
        if (submitBtn) {
          const icon = submitBtn.querySelector('i');
          if (icon) icon.className = 'fa-solid fa-money-bill-wave';
        }
      }
    }
  }
};

window.Cart = Cart;
