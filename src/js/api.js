/* API Service for Maison Rosa 2 Backend */

export const API = {
  async getMenu(category = 'All', search = '') {
    const res = await fetch(`/api/menu?category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}`);
    return await res.json();
  },

  async addProduct(productData) {
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    return await res.json();
  },

  async updateProduct(id, productData) {
    const res = await fetch(`/api/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    return await res.json();
  },

  async deleteProduct(id) {
    const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
    return await res.json();
  },

  async getBuildersConfig() {
    const res = await fetch('/api/builders/config');
    return await res.json();
  },

  async updateBuildersConfig(configData) {
    const res = await fetch('/api/builders/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData)
    });
    return await res.json();
  },

  async resetBuildersConfig() {
    const res = await fetch('/api/builders/reset', { method: 'POST' });
    return await res.json();
  },

  async createOrder(orderData) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    return await res.json();
  },

  async getOrders(email = '') {
    const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
    return await res.json();
  },

  async getOrder(id) {
    const res = await fetch(`/api/orders/${id}`);
    return await res.json();
  },

  async updateOrderStatus(id, status) {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await res.json();
  },

  async validateCoupon(code, subtotal) {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal })
    });
    return await res.json();
  },

  async registerUser(userData) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await res.json();
  },

  async loginUser(credentials) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return await res.json();
  },

  async getQuizData() {
    const res = await fetch('/api/quiz');
    return await res.json();
  },

  async calculateQuiz(answers) {
    const res = await fetch('/api/quiz/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    return await res.json();
  },

  async getLoyaltyData(email) {
    const res = await fetch(`/api/loyalty/${encodeURIComponent(email || 'customer@rosa.cafe')}`);
    return await res.json();
  },

  async addLoyaltyStamp(email) {
    const res = await fetch('/api/loyalty/add-stamp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await res.json();
  },

  async claimFreeCoffee(email) {
    const res = await fetch('/api/loyalty/claim-free-coffee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await res.json();
  },

  async redeemLoyaltyPoints(email, rewardId) {
    const res = await fetch('/api/loyalty/redeem-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, rewardId })
    });
    return await res.json();
  },

  async dailyCheckIn(email) {
    const res = await fetch('/api/loyalty/daily-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await res.json();
  },

  async sendChatMessage(message) {
    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return await res.json();
  },

  async getAdminStats() {
    const res = await fetch('/api/admin/stats');
    return await res.json();
  },

  async getAdminCustomers() {
    const res = await fetch('/api/admin/customers');
    return await res.json();
  },

  async adjustCustomerLoyalty(email, stampChange, pointsChange, reason) {
    const res = await fetch('/api/admin/customers/adjust-loyalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, stampChange, pointsChange, reason })
    });
    return await res.json();
  },

  async getStoreStatus() {
    const res = await fetch('/api/admin/store-status');
    return await res.json();
  },

  async updateStoreStatus(statusData) {
    const res = await fetch('/api/admin/store-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusData)
    });
    return await res.json();
  },

  async quickStockAdjust(productId, delta, exactStock) {
    const res = await fetch('/api/admin/products/quick-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, delta, exactStock })
    });
    return await res.json();
  },

  async getAdminCoupons() {
    const res = await fetch('/api/admin/coupons');
    return await res.json();
  },

  async createAdminCoupon(couponData) {
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(couponData)
    });
    return await res.json();
  },

  async deleteAdminCoupon(code) {
    const res = await fetch(`/api/admin/coupons/${code}`, { method: 'DELETE' });
    return await res.json();
  },

  async getRazorpayConfig() {
    const res = await fetch('/api/payment/razorpay/config');
    return await res.json();
  },

  async createRazorpayOrder(orderPayload) {
    let payload = orderPayload;
    if (typeof orderPayload === 'number' || typeof orderPayload === 'string') {
      payload = { amount: orderPayload, currency: 'INR', receipt: `rcpt_${Date.now()}` };
    }
    const res = await fetch('/api/payment/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async verifyRazorpayPayment(payload) {
    const res = await fetch('/api/payment/razorpay/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }
};
