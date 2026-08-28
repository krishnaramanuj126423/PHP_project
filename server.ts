import express from 'express';
import path from 'path';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { getDb, saveDb, Product, Order, Coupon, ChatbotFaq, getDefaultBuildersConfig, getDefaultStoreSettings } from './server/db.js';

let razorpayClient: InstanceType<typeof Razorpay> | null = null;
function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    return null;
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id,
      key_secret
    });
  }
  return razorpayClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', cafe: 'Antiquity Cafe' });
  });

  // Get Menu / Products
  app.get('/api/menu', (req, res) => {
    const db = getDb();
    let products = db.products;
    const category = req.query.category as string;
    const search = req.query.search as string;

    if (category && category !== 'All') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        p.ingredients.some(i => i.toLowerCase().includes(q))
      );
    }

    res.json({
      products,
      categories: db.categories
    });
  });

  // Admin Add Product
  app.post('/api/menu', (req, res) => {
    const db = getDb();
    const newProduct: Product = {
      id: 'p_' + Date.now(),
      name: req.body.name || 'Untitled Item',
      category: req.body.category || 'Coffee',
      price: parseFloat(req.body.price) || 0,
      description: req.body.description || '',
      image: req.body.image || 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80',
      ingredients: Array.isArray(req.body.ingredients) ? req.body.ingredients : (req.body.ingredients || '').split(',').map((s: string) => s.trim()),
      calories: parseInt(req.body.calories) || 100,
      isVegetarian: Boolean(req.body.isVegetarian),
      isVegan: Boolean(req.body.isVegan),
      spiceLevel: parseInt(req.body.spiceLevel) || 0,
      allergens: Array.isArray(req.body.allergens) ? req.body.allergens : [],
      rating: 5.0,
      reviewsCount: 1,
      isBestseller: Boolean(req.body.isBestseller),
      isNew: true,
      isFeatured: Boolean(req.body.isFeatured),
      stock: parseInt(req.body.stock) || 50
    };
    db.products.unshift(newProduct);
    saveDb(db);
    res.json({ success: true, product: newProduct });
  });

  // Admin Edit Product
  app.put('/api/menu/:id', (req, res) => {
    const db = getDb();
    const targetId = String(req.params.id || '').trim();
    const index = db.products.findIndex(p => String(p.id).trim() === targetId);
    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updates = { ...req.body };
    if (updates.price !== undefined) {
      updates.price = parseFloat(updates.price) || 0;
    }
    if (updates.stock !== undefined) {
      updates.stock = parseInt(updates.stock) || 0;
    }
    if (updates.calories !== undefined) {
      updates.calories = parseInt(updates.calories) || 0;
    }

    db.products[index] = { ...db.products[index], ...updates };
    saveDb(db);
    res.json({ success: true, product: db.products[index] });
  });

  // Admin Delete Product
  app.delete('/api/menu/:id', (req, res) => {
    const db = getDb();
    const targetId = String(req.params.id || '').trim();
    const initialCount = db.products.length;
    db.products = db.products.filter(p => String(p.id).trim() !== targetId);
    
    // Also clean up any quiz recommendation references
    if (db.flavourProfiles) {
      Object.keys(db.flavourProfiles).forEach(key => {
        if (db.flavourProfiles[key].recommendations) {
          db.flavourProfiles[key].recommendations = db.flavourProfiles[key].recommendations.filter((pid: string) => String(pid).trim() !== targetId);
        }
      });
    }

    saveDb(db);
    res.json({ 
      success: true, 
      id: targetId,
      deleted: initialCount !== db.products.length,
      remainingCount: db.products.length 
    });
  });

  // Builder Options & Pricing Endpoints (Brew, Meal, Grand Plate)
  app.get('/api/builders/config', (_req, res) => {
    const db = getDb();
    if (!db.buildersConfig || !db.buildersConfig.brew || !db.buildersConfig.meal || !db.buildersConfig.plate) {
      db.buildersConfig = getDefaultBuildersConfig();
      saveDb(db);
    }
    res.json({ success: true, config: db.buildersConfig });
  });

  app.put('/api/builders/config', (req, res) => {
    const db = getDb();
    let newConfig = req.body;
    if (!newConfig) {
      return res.status(400).json({ error: 'Missing builder configuration data' });
    }
    // Unwrap if nested under config property
    if (newConfig.config && (newConfig.config.brew || newConfig.config.meal || newConfig.config.plate)) {
      newConfig = newConfig.config;
    }
    // Ensure all 3 builders exist, falling back to defaults if any is missing
    const defaults = getDefaultBuildersConfig();
    db.buildersConfig = {
      brew: newConfig.brew || defaults.brew,
      meal: newConfig.meal || defaults.meal,
      plate: newConfig.plate || defaults.plate
    };
    saveDb(db);
    res.json({ success: true, config: db.buildersConfig });
  });

  app.post('/api/builders/reset', (_req, res) => {
    const db = getDb();
    db.buildersConfig = getDefaultBuildersConfig();
    saveDb(db);
    res.json({ success: true, config: db.buildersConfig, message: 'Reset to factory default pricing' });
  });

  // Razorpay Payment Integration Endpoints
  app.get('/api/payment/razorpay/config', (_req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const isConfigured = Boolean(keyId && process.env.RAZORPAY_KEY_SECRET);
    res.json({
      keyId: keyId || 'rzp_test_AntiquityDemo',
      isConfigured,
      currency: 'INR'
    });
  });

  app.post('/api/payment/razorpay/create-order', async (req, res) => {
    try {
      const { amount, currency = 'INR', receipt = 'receipt_' + Date.now() } = req.body;
      const razorpay = getRazorpay();
      const amountInSubunits = Math.round((parseFloat(amount) || 0) * 100);

      if (razorpay && amountInSubunits > 0) {
        const rzpOrder = await razorpay.orders.create({
          amount: amountInSubunits,
          currency,
          receipt: String(receipt).substring(0, 40)
        });
        return res.json({
          success: true,
          orderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          isLive: true
        });
      }

      // Seamless test mode fallback when keys are pending in environment
      const mockOrderId = 'order_rzp_' + Math.random().toString(36).substring(2, 14);
      res.json({
        success: true,
        orderId: mockOrderId,
        amount: amountInSubunits,
        currency,
        isLive: false,
        note: 'Razorpay Sandbox Mode Active'
      });
    } catch (err: any) {
      console.error('Razorpay order creation error:', err);
      res.status(500).json({ error: err.message || 'Failed to initialize Razorpay payment order' });
    }
  });

  app.post('/api/payment/razorpay/verify', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (secret && razorpay_signature && razorpay_order_id && razorpay_payment_id) {
      try {
        const generated_signature = crypto
          .createHmac('sha256', secret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex');

        if (generated_signature !== razorpay_signature) {
          return res.status(400).json({ success: false, error: 'Invalid payment signature verification' });
        }
      } catch (e: any) {
        return res.status(400).json({ success: false, error: 'Verification failed: ' + e.message });
      }
    }

    res.json({
      success: true,
      verified: true,
      paymentId: razorpay_payment_id || 'pay_sim_' + Math.random().toString(36).substring(2, 10)
    });
  });

  // Create Order
  app.post('/api/orders', (req, res) => {
    const db = getDb();
    const orderData = req.body;
    const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);

    const newOrder: Order = {
      id: orderId,
      customerName: orderData.customerName || 'Valued Guest',
      email: orderData.email || '',
      phone: orderData.phone || '',
      orderType: orderData.orderType || 'Delivery',
      address: orderData.address || 'Takeaway Counter',
      items: orderData.items || [],
      subtotal: parseFloat(orderData.subtotal) || 0,
      discount: parseFloat(orderData.discount) || 0,
      tax: parseFloat(orderData.tax) || 0,
      deliveryFee: parseFloat(orderData.deliveryFee) || 0,
      total: parseFloat(orderData.total) || 0,
      status: 'Order Received',
      paymentMethod: orderData.paymentMethod || 'Razorpay',
      paymentStatus: (orderData.paymentStatus as any) || (orderData.paymentMethod?.includes('Counter') ? 'Pending' : 'Paid'),
      razorpayOrderId: orderData.razorpayOrderId || '',
      razorpayPaymentId: orderData.razorpayPaymentId || '',
      createdAt: new Date().toISOString()
    };

    db.orders.unshift(newOrder);

    // Update loyalty stamps for user on purchase (+1 Stamp per order)
    const targetEmail = orderData.email || 'customer@rosa.cafe';
    let user = db.users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === 'customer@rosa.cafe');
    }

    let earnedStamp = 0;
    let dailyStreakUnlocked = false;
    let streakBonus = 0;

    if (user) {
      // Mark used voucher as used
      if (orderData.couponCode && user.vouchers) {
        const matchingVoucher = user.vouchers.find((v: any) => v.code.toUpperCase() === orderData.couponCode.toUpperCase() && !v.used);
        if (matchingVoucher) {
          matchingVoucher.used = true;
          matchingVoucher.usedAt = new Date().toISOString();
        }
      }

      user.stamps = (user.stamps || 0) + 1;
      earnedStamp = user.stamps % 8 === 0 ? 8 : (user.stamps % 8);
      const earnedPoints = Math.max(15, Math.floor(newOrder.total) + 25);
      user.points = (user.points || 0) + earnedPoints;

      if (!user.loyaltyHistory) user.loyaltyHistory = [];
      user.loyaltyHistory.unshift({
        id: 'h_' + Date.now(),
        date: new Date().toISOString(),
        title: `Purchase Stamp (Order #${newOrder.id})`,
        stampsChange: 1,
        pointsChange: earnedPoints
      });

      // Automatically unlock daily roastery streak 1 time per day on order
      const todayStr = new Date().toISOString().split('T')[0];
      if (user.lastCheckIn !== todayStr) {
        user.lastCheckIn = todayStr;
        user.checkInStreak = (user.checkInStreak || 0) + 1;
        streakBonus = 15 + Math.min(user.checkInStreak * 2, 20);
        user.points = (user.points || 0) + streakBonus;
        dailyStreakUnlocked = true;

        user.loyaltyHistory.unshift({
          id: 'h_streak_' + Date.now(),
          date: new Date().toISOString(),
          title: `Daily Roastery Order Streak (Day ${user.checkInStreak})`,
          stampsChange: 0,
          pointsChange: streakBonus
        });
      }
    }

    saveDb(db);
    res.json({ success: true, order: newOrder, earnedStamp, dailyStreakUnlocked, streakBonus });
  });

  // Get Orders (Admin or User)
  app.get('/api/orders', (req, res) => {
    const db = getDb();
    const email = req.query.email as string;
    if (email) {
      const userOrders = db.orders.filter(o => o.email.toLowerCase() === email.toLowerCase());
      return res.json({ orders: userOrders });
    }
    res.json({ orders: db.orders });
  });

  // Get Order Status by ID
  app.get('/api/orders/:id', (req, res) => {
    const db = getDb();
    const order = db.orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ order });
  });

  // Admin Update Order Status
  app.put('/api/orders/:id/status', (req, res) => {
    const db = getDb();
    const order = db.orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    order.status = req.body.status;
    saveDb(db);
    res.json({ success: true, order });
  });

  // Coupon Validation
  app.post('/api/coupons/validate', (req, res) => {
    const db = getDb();
    const { code, subtotal } = req.body;
    const coupon = db.coupons.find(c => c.code.toUpperCase() === (code || '').toUpperCase());

    if (!coupon) {
      return res.status(400).json({ valid: false, message: 'Invalid coupon code.' });
    }
    if (subtotal < coupon.minOrder) {
      return res.status(400).json({ valid: false, message: `Minimum order amount of ₹${coupon.minOrder.toFixed(2)} required for this coupon.` });
    }

    let discountAmount = 0;
    if (coupon.discountPercent > 0) {
      discountAmount = (subtotal * coupon.discountPercent) / 100;
    } else if (coupon.discountFixed > 0) {
      discountAmount = coupon.discountFixed;
    }

    res.json({
      valid: true,
      coupon,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      message: `Coupon Applied: ${coupon.description}`
    });
  });

  // User Auth - Register
  app.post('/api/auth/register', (req, res) => {
    const db = getDb();
    const { name, email, password } = req.body;

    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedName = (name || '').trim();

    if (!trimmedEmail || !password) {
      return res.status(400).json({ error: 'Please provide both an email address and password.' });
    }

    const existing = db.users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
    }

    const newUser = {
      id: 'u_' + Date.now(),
      name: trimmedName || trimmedEmail.split('@')[0],
      email: trimmedEmail,
      passwordHash: 'hashed_' + password,
      role: 'customer' as const,
      stamps: 1, // 1 welcome stamp
      points: 25,
      flavourProfile: 'Not taken yet',
      savedCreations: []
    };

    db.users.push(newUser);
    saveDb(db);

    res.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        stamps: newUser.stamps,
        points: newUser.points
      }
    });
  });

  // User Auth - Login
  app.post('/api/auth/login', (req, res) => {
    const db = getDb();
    const { email, password } = req.body;

    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return res.status(400).json({ error: 'Please enter both your email address and password.' });
    }

    // Check admin credentials
    if (
      ((trimmedEmail === 'admin@gmail.com' || trimmedEmail === 'admin@antiquity.cafe' || trimmedEmail === 'admin@rosa.cafe') && (password === '1234' || password === 'admin123')) ||
      (trimmedEmail === 'admin@gmail.com' && password === '1234')
    ) {
      return res.json({
        success: true,
        user: { id: 'a1', name: 'Antiquity Admin Manager', email: trimmedEmail, role: 'admin' }
      });
    }

    const user = db.users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email. Please switch to "Create Account" above.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        stamps: user.stamps || 0,
        points: user.points || 0,
        flavourProfile: user.flavourProfile
      }
    });
  });

  // Flavour Quiz - Questions & Recommendation Engine
  app.get('/api/quiz', (_req, res) => {
    const db = getDb();
    res.json({ questions: db.quizQuestions, profiles: db.flavourProfiles });
  });

  app.post('/api/quiz/calculate', (req, res) => {
    const db = getDb();
    const answers: Record<string, number> = req.body.answers || {};

    // Tally points across profiles
    const scores: Record<string, number> = {
      'Sweet & Creamy': 0,
      'Bold & Rich': 0,
      'Fresh & Fruity': 0,
      'Chocolate Lover': 0,
      'Classic Coffee Lover': 0,
      'Adventurous Explorer': 0
    };

    db.quizQuestions.forEach(q => {
      const selectedIndex = answers[q.id];
      if (selectedIndex !== undefined && q.options[selectedIndex]) {
        const optionPoints = q.options[selectedIndex].points || {};
        Object.entries(optionPoints).forEach(([prof, pts]) => {
          scores[prof] = (scores[prof] || 0) + (pts as number);
        });
      }
    });

    let topProfile = 'Sweet & Creamy';
    let maxScore = -1;
    Object.entries(scores).forEach(([prof, score]) => {
      if (score > maxScore) {
        maxScore = score;
        topProfile = prof;
      }
    });

    const profileData = db.flavourProfiles[topProfile] || db.flavourProfiles['Sweet & Creamy'];
    const recommendedProducts = db.products.filter(p => (profileData.recommendations || []).includes(p.id));

    res.json({
      profileName: topProfile,
      profile: profileData,
      recommendedProducts
    });
  });

  // Loyalty Card API
  app.get('/api/loyalty/:email', (req, res) => {
    const db = getDb();
    const user = db.users.find(u => u.email.toLowerCase() === req.params.email.toLowerCase());
    const stamps = user ? (user.stamps || 0) : 5;
    const points = user ? (user.points || 0) : 140;

    // Initialize default vouchers for user if empty
    if (user && !user.vouchers) {
      user.vouchers = [
        {
          id: 'v_welcome',
          code: 'WELCOME10',
          title: '10% Welcome Member Discount',
          description: 'Enjoy 10% off your entire gourmet coffee & meal order',
          discountPercent: 10,
          discountFixed: 0,
          expiry: '2026-12-31',
          used: false,
          claimedAt: new Date().toISOString()
        }
      ];
      saveDb(db);
    }

    const vouchers = user?.vouchers || [
      {
        id: 'v_welcome',
        code: 'WELCOME10',
        title: '10% Welcome Member Discount',
        description: 'Enjoy 10% off your entire gourmet coffee & meal order',
        discountPercent: 10,
        discountFixed: 0,
        expiry: '2026-12-31',
        used: false,
        claimedAt: new Date().toISOString()
      }
    ];

    const history = user?.loyaltyHistory || [
      { id: 'h1', date: new Date(Date.now() - 86400000 * 2).toISOString(), title: 'Welcome Member Stamp', stampsChange: 1, pointsChange: 20 },
      { id: 'h2', date: new Date(Date.now() - 86400000).toISOString(), title: 'Artisanal Cappuccino Purchase', stampsChange: 1, pointsChange: 25 },
      { id: 'h3', date: new Date().toISOString(), title: 'Daily Coffee Streak Bonus', stampsChange: 0, pointsChange: 15 }
    ];

    // Calculate VIP tier rank
    let tier = 'Bronze Connoisseur';
    if (points >= 3000) tier = 'Diamond Master Roaster';
    else if (points >= 1500) tier = 'Gold VIP Connoisseur';
    else if (points >= 500) tier = 'Silver Patron';

    res.json({
      stamps: stamps % 8,
      totalStampsCollected: stamps,
      freeCoffeeUnlocked: stamps >= 8,
      points,
      tier,
      checkInStreak: user?.checkInStreak || 3,
      lastCheckIn: user?.lastCheckIn || null,
      rewards: db.loyaltyRewards,
      vouchers,
      history
    });
  });

  // Loyalty Add Stamp
  app.post('/api/loyalty/add-stamp', (req, res) => {
    const db = getDb();
    const { email } = req.body;
    let user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());

    if (!user) {
      // Default fallback demo user
      user = db.users.find(u => u.email.toLowerCase() === 'customer@rosa.cafe');
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.stamps = (user.stamps || 0) + 1;
    user.points = (user.points || 0) + 25;

    if (!user.loyaltyHistory) user.loyaltyHistory = [];
    user.loyaltyHistory.unshift({
      id: 'h_' + Date.now(),
      date: new Date().toISOString(),
      title: 'Artisanal Coffee Purchase Stamp',
      stampsChange: 1,
      pointsChange: 25
    });

    saveDb(db);

    const stamps = user.stamps;
    res.json({
      success: true,
      stamps: stamps % 8,
      totalStampsCollected: stamps,
      freeCoffeeUnlocked: stamps >= 8,
      points: user.points,
      vouchers: user.vouchers || [],
      history: user.loyaltyHistory
    });
  });

  // Loyalty Claim Free Coffee Voucher
  app.post('/api/loyalty/claim-free-coffee', (req, res) => {
    const db = getDb();
    const { email } = req.body;
    let user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());

    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === 'customer@rosa.cafe');
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((user.stamps || 0) < 8) {
      return res.status(400).json({ error: 'You need 8 stamps to claim a free coffee voucher.' });
    }

    // Deduct 8 stamps from customer's pass
    user.stamps = Math.max(0, (user.stamps || 0) - 8);

    const voucherCode = `ANTIQ-FREE-${Math.floor(1000 + Math.random() * 9000)}`;
    const newVoucher = {
      id: 'v_' + Date.now(),
      code: voucherCode,
      title: '100% Free Artisanal Coffee Pass',
      description: 'Redeem for 100% discount on any size Artisanal Coffee Brew',
      discountPercent: 100,
      discountFixed: 0,
      expiry: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      used: false,
      claimedAt: new Date().toISOString()
    };

    if (!user.vouchers) user.vouchers = [];
    user.vouchers.unshift(newVoucher);

    // Add coupon to coupons database table so it works at checkout!
    db.coupons.push({
      code: voucherCode,
      discountPercent: 100,
      discountFixed: 0,
      minOrder: 0,
      expiry: newVoucher.expiry,
      description: '100% Free Artisanal Coffee Pass Voucher'
    });

    if (!user.loyaltyHistory) user.loyaltyHistory = [];
    user.loyaltyHistory.unshift({
      id: 'h_' + Date.now(),
      date: new Date().toISOString(),
      title: `Claimed Free Coffee Voucher (${voucherCode})`,
      stampsChange: -8,
      pointsChange: 0
    });

    saveDb(db);

    res.json({
      success: true,
      voucherCode,
      newVoucher,
      stamps: user.stamps % 8,
      freeCoffeeUnlocked: user.stamps >= 8,
      vouchers: user.vouchers,
      message: 'Free Artisanal Coffee Voucher successfully claimed!'
    });
  });

  // Loyalty Redeem Points
  app.post('/api/loyalty/redeem-points', (req, res) => {
    const db = getDb();
    const { email, rewardId } = req.body;
    let user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());

    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === 'customer@rosa.cafe');
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const reward = db.loyaltyRewards.find(r => r.id === rewardId) || {
      id: rewardId,
      title: 'Member Reward',
      pointsCost: 60,
      code: 'REWARD' + Math.floor(1000 + Math.random() * 9000)
    };

    const cost = reward.pointsCost || 60;

    if ((user.points || 0) < cost) {
      return res.status(400).json({ error: `Insufficient points. You need ${cost} points (Current: ${user.points || 0}).` });
    }

    user.points = (user.points || 0) - cost;

    const voucherCode = reward.code || `ANTIQ-${rewardId.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newVoucher = {
      id: 'v_' + Date.now(),
      code: voucherCode,
      title: reward.title,
      description: reward.description || `Member Reward redeemed for ${cost} Points`,
      discountPercent: reward.pointsCost >= 100 ? 100 : 50,
      discountFixed: 5,
      expiry: '2026-12-31',
      used: false,
      claimedAt: new Date().toISOString()
    };

    if (!user.vouchers) user.vouchers = [];
    user.vouchers.unshift(newVoucher);

    // Ensure coupon exists in database
    const existingCoupon = db.coupons.find(c => c.code === voucherCode);
    if (!existingCoupon) {
      db.coupons.push({
        code: voucherCode,
        discountPercent: newVoucher.discountPercent,
        discountFixed: newVoucher.discountFixed,
        minOrder: 0,
        expiry: '2026-12-31',
        description: `Member Reward: ${reward.title}`
      });
    }

    if (!user.loyaltyHistory) user.loyaltyHistory = [];
    user.loyaltyHistory.unshift({
      id: 'h_' + Date.now(),
      date: new Date().toISOString(),
      title: `Redeemed Reward: ${reward.title}`,
      stampsChange: 0,
      pointsChange: -cost
    });

    saveDb(db);

    res.json({
      success: true,
      voucherCode,
      newVoucher,
      remainingPoints: user.points,
      vouchers: user.vouchers,
      message: `Successfully redeemed "${reward.title}" for ${cost} points!`
    });
  });

  // Loyalty Daily Check-in
  app.post('/api/loyalty/daily-checkin', (req, res) => {
    const db = getDb();
    const { email } = req.body;
    let user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());

    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === 'customer@rosa.cafe');
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (user.lastCheckIn === todayStr) {
      return res.status(400).json({ error: 'You have already completed your daily check-in today!' });
    }

    user.lastCheckIn = todayStr;
    user.checkInStreak = (user.checkInStreak || 0) + 1;
    const bonusPoints = 15 + Math.min(user.checkInStreak * 2, 20);
    user.points = (user.points || 0) + bonusPoints;

    if (!user.loyaltyHistory) user.loyaltyHistory = [];
    user.loyaltyHistory.unshift({
      id: 'h_' + Date.now(),
      date: new Date().toISOString(),
      title: `Daily Check-In Streak Day ${user.checkInStreak}`,
      stampsChange: 0,
      pointsChange: bonusPoints
    });

    saveDb(db);

    res.json({
      success: true,
      points: user.points,
      checkInStreak: user.checkInStreak,
      bonusPoints,
      message: `Daily Check-In Complete! +${bonusPoints} Bonus Points earned! Streak: ${user.checkInStreak} Days 🔥`
    });
  });

  // AI Café Chatbot API using Gemini @google/genai
  app.post('/api/chatbot', async (req, res) => {
    const db = getDb();
    const userMessage = (req.body.message || '').trim();

    if (!userMessage) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    // Attempt Gemini AI call if GEMINI_API_KEY is available
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const menuContext = db.products.map(p => `- ${p.name} (₹${p.price}): ${p.description} (${p.category}, Calories: ${p.calories}, Allergens: ${p.allergens.join(', ') || 'None'})`).join('\n');

        const systemPrompt = `You are "Antiquity AI", the warm, sophisticated, and attentive AI Barista Assistant for Antiquity Cafe.
Location: 42 Artisanal Blvd, Gourmet Quarter. Hours: 7:00 AM - 10:00 PM daily.
Current Menu Items:
${menuContext}

Special Features:
1. Custom Brews (Espresso/Latte with Whole/Almond/Oat/Soy Milk, Sweetness 0-100%, Toppings).
2. Custom Meals (Pasta/Rice/Wrap with Chicken/Paneer/Tofu, Sauces).
3. Flavour Profile Quiz & Loyalty Stamp Card (8 stamps = 1 free coffee!).

Instructions:
Be polite, elegant, enthusiastic about coffee/pastries, concise (2-4 sentences max), and offer specific menu recommendations with exact item names when applicable. If asked about allergies or vegan options, answer accurately from the menu data above.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: userMessage,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7
          }
        });

        if (response.text) {
          return res.json({ reply: response.text });
        }
      } catch (err) {
        console.error('Gemini Chatbot error, falling back to knowledge engine:', err);
      }
    }

    // Knowledge base fallback match
    const lowerMsg = userMessage.toLowerCase();
    let reply = "Welcome to Antiquity Cafe! I am your AI Barista. I can help you explore our menu, recommend artisanal drinks, check vegan or gluten-free options, or assist with custom meal & brew creations. What would you like today?";

    if (lowerMsg.includes('hour') || lowerMsg.includes('open') || lowerMsg.includes('time')) {
      reply = "Antiquity Cafe is open daily from 7:00 AM to 10:00 PM (Kitchen closes at 9:30 PM). Come enjoy our terrace!";
    } else if (lowerMsg.includes('location') || lowerMsg.includes('where') || lowerMsg.includes('address')) {
      reply = "We are located at 42 Artisanal Boulevard, Gourmet Quarter. Valet parking and outdoor garden seating are available.";
    } else if (lowerMsg.includes('coffee') || lowerMsg.includes('espresso') || lowerMsg.includes('drink')) {
      reply = "Our signatures are the Velvet Gold Espresso (₹4.50) with jasmine notes and our Artisanal Antiquity Cappuccino (₹5.80) dusted with Ceylon cinnamon. You can also build your own custom brew!";
    } else if (lowerMsg.includes('vegan') || lowerMsg.includes('dairy-free')) {
      reply = "We offer Oat, Almond, Soy, and Coconut milks! Our Kyoto Matcha Silk Latte, Smoky Vanilla Cold Brew, and Berry Acai Bowl are 100% vegan!";
    } else if (lowerMsg.includes('stamp') || lowerMsg.includes('point') || lowerMsg.includes('loyalty')) {
      reply = "Our Loyalty Card awards 1 stamp for every coffee! Collect 8 stamps to claim a complimentary Artisanal Coffee of your choice!";
    } else if (lowerMsg.includes('food') || lowerMsg.includes('meal') || lowerMsg.includes('lunch') || lowerMsg.includes('dinner')) {
      reply = "Try our Avocado & Truffle Tartine (₹14.50) or Wild Mushroom Saffron Rigatoni (₹18.50). Or create your own custom meal & visual plate in our interactive builder!";
    }

    res.json({ reply });
  });

  // Admin Dashboard Statistics & Analytics
  app.get('/api/admin/stats', (_req, res) => {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = db.orders.filter(o => o.createdAt.startsWith(today));

    const totalRevenue = db.orders.reduce((sum, o) => sum + o.total, 0);
    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = db.orders.filter(o => o.status === 'Order Received' || o.status === 'Preparing' || o.status === 'Confirmed').length;
    const completedOrders = db.orders.filter(o => o.status === 'Delivered' || o.status === 'Ready').length;

    // Category breakdown
    const categorySales: Record<string, number> = {};
    db.orders.forEach(o => {
      o.items.forEach(i => {
        const prod = db.products.find(p => p.name.toLowerCase() === i.name.toLowerCase());
        const cat = prod ? prod.category : 'Artisanal Specials';
        categorySales[cat] = (categorySales[cat] || 0) + (i.price * i.quantity);
      });
    });

    // 7-day trend
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const revenueTrend = [420.50, 580.00, 710.25, 640.80, 890.00, 1240.50, 1180.00];

    res.json({
      todaySales: parseFloat(todaySales.toFixed(2)),
      totalOrders: db.orders.length,
      pendingOrders,
      completedOrders,
      totalCustomers: db.users.length,
      totalProducts: db.products.length,
      lowStockProducts: db.products.filter(p => (p.stock || 0) < 15).length,
      revenue: parseFloat(totalRevenue.toFixed(2)),
      loyaltyRedemptions: 28,
      categorySales,
      revenueTrend: days.map((day, idx) => ({ day, revenue: revenueTrend[idx] })),
      popularProducts: db.products.slice(0, 6)
    });
  });

  // Admin Customer CRM List
  app.get('/api/admin/customers', (_req, res) => {
    const db = getDb();
    const customers = db.users.map(u => {
      const customerOrders = db.orders.filter(o => o.email.toLowerCase() === u.email.toLowerCase());
      const totalSpent = customerOrders.reduce((s, o) => s + o.total, 0);
      const stamps = u.stamps || 0;
      let tier = 'Bronze Patron';
      if (stamps >= 24) tier = 'Platinum Connoisseur';
      else if (stamps >= 16) tier = 'Gold Connoisseur';
      else if (stamps >= 8) tier = 'Silver Aficionado';

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        stamps: stamps % 8,
        totalStamps: stamps,
        points: u.points || 0,
        tier,
        flavourProfile: u.flavourProfile || 'Adventurous Explorer',
        orderCount: customerOrders.length,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        lastActive: u.lastCheckIn || 'Recent'
      };
    });

    res.json({ customers });
  });

  // Admin Adjust Customer Loyalty
  app.post('/api/admin/customers/adjust-loyalty', (req, res) => {
    const db = getDb();
    const { email, stampChange, pointsChange, reason } = req.body;
    const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());

    if (!user) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    user.stamps = Math.max(0, (user.stamps || 0) + (parseInt(stampChange) || 0));
    user.points = Math.max(0, (user.points || 0) + (parseInt(pointsChange) || 0));

    if (!user.loyaltyHistory) user.loyaltyHistory = [];
    user.loyaltyHistory.unshift({
      id: 'h_' + Date.now(),
      date: new Date().toISOString(),
      title: `Manager Adjustment: ${reason || 'VIP Patron Courtesy'}`,
      stampsChange: parseInt(stampChange) || 0,
      pointsChange: parseInt(pointsChange) || 0
    });

    saveDb(db);
    res.json({ success: true, user: { name: user.name, email: user.email, stamps: user.stamps, points: user.points } });
  });

  // Store Operation Status (Persisted to Database)
  app.get('/api/admin/store-status', (_req, res) => {
    const db = getDb();
    res.json(db.storeSettings || getDefaultStoreSettings());
  });

  app.get('/api/store-status', (_req, res) => {
    const db = getDb();
    res.json(db.storeSettings || getDefaultStoreSettings());
  });

  app.put('/api/admin/store-status', (req, res) => {
    const db = getDb();
    const current = db.storeSettings || getDefaultStoreSettings();
    db.storeSettings = { ...current, ...req.body };
    saveDb(db);
    res.json({ success: true, settings: db.storeSettings });
  });

  // Admin Quick Stock Adjuster
  app.post('/api/admin/products/quick-stock', (req, res) => {
    const db = getDb();
    const { productId, delta, exactStock } = req.body;
    const prod = db.products.find(p => p.id === productId);

    if (!prod) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (exactStock !== undefined) {
      prod.stock = Math.max(0, parseInt(exactStock) || 0);
    } else if (delta !== undefined) {
      prod.stock = Math.max(0, (prod.stock || 0) + (parseInt(delta) || 0));
    }

    saveDb(db);
    res.json({ success: true, product: prod });
  });

  // Admin Coupon Management
  app.get('/api/admin/coupons', (_req, res) => {
    const db = getDb();
    res.json({ coupons: db.coupons });
  });

  app.post('/api/admin/coupons', (req, res) => {
    const db = getDb();
    const newCoupon: Coupon = {
      code: (req.body.code || '').toUpperCase(),
      discountPercent: parseFloat(req.body.discountPercent) || 0,
      discountFixed: parseFloat(req.body.discountFixed) || 0,
      minOrder: parseFloat(req.body.minOrder) || 0,
      expiry: req.body.expiry || '2026-12-31',
      description: req.body.description || 'Special Promotion'
    };
    db.coupons.push(newCoupon);
    saveDb(db);
    res.json({ success: true, coupon: newCoupon });
  });

  app.delete('/api/admin/coupons/:code', (req, res) => {
    const db = getDb();
    db.coupons = db.coupons.filter(c => c.code.toLowerCase() !== req.params.code.toLowerCase());
    saveDb(db);
    res.json({ success: true });
  });

  // Vite middleware or Production static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
