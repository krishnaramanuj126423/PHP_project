/* Advanced Digital Stamp & Loyalty Card Controller */
import { API } from './api.js';
import { Auth } from './auth.js';
import { showToast } from './main.js';
import { Cart } from './cart.js';

export const Loyalty = {
  currentTab: 'pass', // 'pass' | 'rewards' | 'tiers' | 'history'
  loyaltyData: null,

  async init() {
    const user = Auth.getUser();
    const email = user ? user.email : 'customer@rosa.cafe';

    try {
      const data = await API.getLoyaltyData(email);
      this.loyaltyData = data;

      // Check if user just completed a purchase order
      const newStampEarned = sessionStorage.getItem('rosa_new_stamp_earned');
      let newlyAddedSlot = null;

      if (newStampEarned) {
        newlyAddedSlot = parseInt(sessionStorage.getItem('rosa_stamp_slot') || '1', 10);
        sessionStorage.removeItem('rosa_new_stamp_earned');
        sessionStorage.removeItem('rosa_stamp_slot');

        this.playStampSound(data.freeCoffeeUnlocked);
      }

      this.renderLoyaltyView(newlyAddedSlot);
    } catch (err) {
      console.error('Loyalty load error:', err);
    }
  },

  playStampSound(isVictory = false) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      // 1. Heavy thud / brass stamp slam
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.9, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);

      // 2. Ink contact snap / noise slap
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();

      // 3. Celebratory arpeggio chime if free coffee unlocked
      if (isVictory) {
        setTimeout(() => {
          const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
          notes.forEach((freq, idx) => {
            const chimeOsc = ctx.createOscillator();
            const chimeGain = ctx.createGain();
            chimeOsc.type = 'sine';
            chimeOsc.frequency.value = freq;

            const startTime = ctx.currentTime + idx * 0.08;
            chimeGain.gain.setValueAtTime(0, startTime);
            chimeGain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
            chimeGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

            chimeOsc.connect(chimeGain);
            chimeGain.connect(ctx.destination);
            chimeOsc.start(startTime);
            chimeOsc.stop(startTime + 0.5);
          });
        }, 180);
      }
    } catch (err) {
      console.warn('Audio Context sound play error:', err);
    }
  },

  renderLoyaltyView(newlyAddedSlotIndex = null) {
    const container = document.getElementById('loyalty-card-box');
    if (!container || !this.loyaltyData) return;

    const data = this.loyaltyData;
    const user = Auth.getUser();
    const userName = user ? user.name : 'Elegance Member';
    const email = user ? user.email : 'customer@rosa.cafe';
    const currentStamps = data.stamps;
    const TOTAL_STAMPS = 8;
    const isUnlocked = data.freeCoffeeUnlocked;

    const todayStr = new Date().toISOString().split('T')[0];
    const isCheckedInToday = data.lastCheckIn === todayStr;

    // Stamp slots generator
    let stampSlotsHtml = '';
    for (let i = 1; i <= TOTAL_STAMPS; i++) {
      const isActive = i <= currentStamps || (newlyAddedSlotIndex === 8 && i === 8);
      const isNewlyAdded = i === newlyAddedSlotIndex;

      const slotClasses = [
        'stamp-slot',
        isActive ? 'active' : '',
        isUnlocked && isActive ? 'unlocked' : '',
        isNewlyAdded ? 'stamp-falling' : ''
      ].filter(Boolean).join(' ');

      stampSlotsHtml += `
        <div class="${slotClasses}">
          <i class="fa-solid ${isActive ? 'fa-mug-hot' : 'fa-mug-saucer'} text-xl"></i>
          <span class="text-[9px] font-bold mt-1 ${isActive ? 'text-stone-900' : 'text-stone-400'}">Stamp #${i}</span>
          ${isNewlyAdded ? '<div class="stamp-ripple-effect"></div>' : ''}
        </div>
      `;
    }

    const activeVouchers = (data.vouchers || []).filter(v => !v.used);
    const usedVouchers = (data.vouchers || []).filter(v => v.used);

    container.innerHTML = `
      <!-- Sub-Navigation Tabs -->
      <div class="flex flex-wrap justify-center gap-2 mb-8 bg-stone-200/60 p-1.5 rounded-full max-w-2xl mx-auto text-xs">
        <button class="px-4 py-2 rounded-full font-bold transition-all ${this.currentTab === 'pass' ? 'bg-stone-900 text-amber-400 shadow-sm' : 'text-stone-600 hover:text-stone-900'}" onclick="Loyalty.switchTab('pass')">
          <i class="fa-solid fa-id-card mr-1.5"></i> Digital Pass
        </button>
        <button class="px-4 py-2 rounded-full font-bold transition-all ${this.currentTab === 'vouchers' ? 'bg-stone-900 text-amber-400 shadow-sm' : 'text-stone-600 hover:text-stone-900'}" onclick="Loyalty.switchTab('vouchers')">
          <i class="fa-solid fa-ticket mr-1.5"></i> My Vouchers (${activeVouchers.length})
        </button>
        <button class="px-4 py-2 rounded-full font-bold transition-all ${this.currentTab === 'rewards' ? 'bg-stone-900 text-amber-400 shadow-sm' : 'text-stone-600 hover:text-stone-900'}" onclick="Loyalty.switchTab('rewards')">
          <i class="fa-solid fa-gift mr-1.5"></i> Points Shop (${data.points} pts)
        </button>
        <button class="px-4 py-2 rounded-full font-bold transition-all ${this.currentTab === 'tiers' ? 'bg-stone-900 text-amber-400 shadow-sm' : 'text-stone-600 hover:text-stone-900'}" onclick="Loyalty.switchTab('tiers')">
          <i class="fa-solid fa-crown mr-1.5"></i> VIP Status
        </button>
        <button class="px-4 py-2 rounded-full font-bold transition-all ${this.currentTab === 'history' ? 'bg-stone-900 text-amber-400 shadow-sm' : 'text-stone-600 hover:text-stone-900'}" onclick="Loyalty.switchTab('history')">
          <i class="fa-solid fa-clock-rotate-left mr-1.5"></i> Stamp History
        </button>
      </div>

      <!-- TAB 1: DIGITAL STAMP PASS -->
      <div class="${this.currentTab === 'pass' ? 'block' : 'hidden'} space-y-6">
        <!-- Active Vouchers Quick Alert Banner -->
        ${activeVouchers.length > 0 ? `
          <div class="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border border-amber-400/40 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500 text-stone-900 flex items-center justify-center font-bold text-lg">
                <i class="fa-solid fa-ticket-simple"></i>
              </div>
              <div>
                <p class="text-xs font-bold text-stone-900">You have ${activeVouchers.length} Active Digital Member Voucher${activeVouchers.length > 1 ? 's' : ''} Ready!</p>
                <p class="text-[11px] text-stone-600">Redeem on your next gourmet coffee order or show barcode in cafe.</p>
              </div>
            </div>
            <button class="btn-gold text-xs py-2 px-4 shadow-sm" onclick="Loyalty.switchTab('vouchers')">
              View My Vouchers <i class="fa-solid fa-arrow-right ml-1"></i>
            </button>
          </div>
        ` : ''}

        <!-- Main Member Pass Card -->
        <div class="loyalty-card-container ${newlyAddedSlotIndex ? 'impact-shake' : ''}">
          <!-- Card Header -->
          <div class="flex flex-wrap justify-between items-start gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  ${data.tier || 'Bronze Connoisseur'}
                </span>
                <span class="text-xs text-stone-300 font-mono">ID: ANTIQ-${Math.abs((email || '').split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)) % 90000 + 10000}</span>
              </div>
              <h3 class="font-serif text-3xl font-bold mt-2 text-white">${userName}</h3>
              <p class="text-xs text-amber-200/80">Antiquity Cafe Roastery Patron Pass</p>
            </div>

            <div class="text-right">
              <div class="bg-amber-400/10 border border-amber-400/30 px-4 py-2 rounded-2xl text-right inline-block">
                <span class="text-[10px] text-amber-300 font-bold block uppercase tracking-wider">Available Balance</span>
                <span class="text-2xl font-bold font-serif text-amber-300">${data.points}</span> <span class="text-xs text-amber-200">Points</span>
              </div>
            </div>
          </div>

          <!-- Stamp Grid -->
          <div class="loyalty-stamp-grid">
            ${stampSlotsHtml}
          </div>

          <!-- Stamp Progress Bar & Action Controls -->
          <div class="pt-4 border-t border-white/10 flex flex-wrap justify-between items-center gap-4 text-xs">
            <div>
              <p class="text-stone-200 font-semibold mb-1">
                <span class="text-white font-bold text-sm">${currentStamps} / ${TOTAL_STAMPS}</span> Stamps Completed
              </p>
              <p class="text-[11px] text-amber-200/70">
                ${isUnlocked 
                  ? '🎉 Congratulations! You have unlocked 1 Free Artisanal Coffee!' 
                  : `${TOTAL_STAMPS - currentStamps} more stamps needed. Earn +1 Stamp with every purchase order!`}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <button class="btn-stamp-action flex items-center gap-2 text-xs" onclick="switchView('menu')">
                <i class="fa-solid fa-mug-hot text-stone-900"></i> Order Coffee to Earn Stamp (+1)
              </button>

              ${isUnlocked ? `
                <button class="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2.5 rounded-full shadow-lg border border-green-400 animate-bounce flex items-center gap-2 text-xs" onclick="Loyalty.claimFreeCoffee()">
                  <i class="fa-solid fa-gift"></i> Claim Free Coffee Voucher
                </button>
              ` : ''}

              <button class="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-full border border-white/20 text-xs flex items-center gap-1.5" onclick="Loyalty.showQRModal()">
                <i class="fa-solid fa-qrcode"></i> Scan QR
              </button>
            </div>
          </div>

          <!-- Policy Banner -->
          <div class="mt-4 pt-3 border-t border-white/10 text-[11px] text-amber-200/80 flex items-center gap-2">
            <i class="fa-solid fa-circle-check text-amber-400"></i>
            <span><strong>Loyalty Policy:</strong> 1 Digital Stamp is automatically added to your pass on every completed order purchase!</span>
          </div>
        </div>

        <!-- Daily Streak & Check-in Widget -->
        <div class="rosa-card p-6 bg-gradient-to-r from-amber-900/10 via-stone-900/5 to-amber-900/10 flex flex-wrap justify-between items-center gap-4 border border-amber-200/60">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl ${isCheckedInToday ? 'bg-amber-500 text-stone-900' : 'bg-amber-800 text-amber-300'} flex items-center justify-center text-2xl font-bold shadow-sm">
              <i class="fa-solid fa-fire-flame-curved"></i>
            </div>
            <div>
              <span class="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Daily Roastery Streak</span>
              <h4 class="font-serif text-xl font-bold text-stone-900">${data.checkInStreak || 1}-Day Coffee Streak 🔥</h4>
              <p class="text-xs text-stone-600">
                ${isCheckedInToday 
                  ? '✨ Streak unlocked for today! Place orders daily or check in to maintain your streak.' 
                  : 'Place any coffee purchase order today to automatically unlock your daily streak bonus (+15 Pts)!'}
              </p>
            </div>
          </div>

          ${isCheckedInToday ? `
            <div class="bg-green-100 border border-green-300 text-green-800 font-bold text-xs py-2.5 px-5 rounded-full flex items-center gap-2 shadow-sm">
              <i class="fa-solid fa-circle-check text-green-600 text-base"></i> Streak Unlocked Today 🔥
            </div>
          ` : `
            <button class="btn-rosa text-xs py-3 px-6" onclick="Loyalty.doDailyCheckIn()">
              <i class="fa-solid fa-calendar-check mr-1.5"></i> Check In Today (+15 Pts)
            </button>
          `}
        </div>
      </div>

      <!-- TAB: MY DIGITAL MEMBER VOUCHERS -->
      <div class="${this.currentTab === 'vouchers' ? 'block' : 'hidden'} space-y-6">
        <div class="flex flex-wrap justify-between items-center bg-white p-6 rounded-2xl border border-stone-200 shadow-sm gap-4">
          <div>
            <h4 class="font-serif text-2xl font-bold text-stone-900">My Member Vouchers & Passes</h4>
            <p class="text-xs text-stone-500">Digital vouchers earned via coffee stamps or redeemed with points. Apply directly to cart or show barcode in-store.</p>
          </div>
          <div class="text-right">
            <span class="text-xs text-stone-500 block font-semibold">Active Member Vouchers</span>
            <span class="font-serif text-2xl font-bold text-amber-800">${activeVouchers.length}</span>
          </div>
        </div>

        ${activeVouchers.length === 0 ? `
          <div class="text-center py-12 bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
            <div class="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-3xl mx-auto mb-4">
              <i class="fa-solid fa-ticket-simple"></i>
            </div>
            <h5 class="font-serif text-xl font-bold text-stone-900 mb-2">No Active Vouchers Yet</h5>
            <p class="text-xs text-stone-500 max-w-md mx-auto mb-6">Earn 8 digital stamps on coffee purchases to unlock a 100% Free Coffee Pass, or exchange points in our Rewards Shop!</p>
            <div class="flex justify-center gap-3">
              <button class="btn-rosa text-xs py-2.5 px-5" onclick="switchView('menu')">Order Coffee to Earn Stamps</button>
              <button class="btn-rosa-outline text-xs py-2.5 px-5" onclick="Loyalty.switchTab('rewards')">Explore Points Shop</button>
            </div>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${activeVouchers.map(v => `
              <div class="bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900 text-white p-6 rounded-2xl shadow-xl border border-amber-400/30 relative overflow-hidden flex flex-col justify-between">
                <div class="absolute -right-6 -top-6 w-24 h-24 bg-amber-400/10 rounded-full blur-xl pointer-events-none"></div>

                <div>
                  <div class="flex justify-between items-start mb-3">
                    <span class="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                      ${v.discountPercent ? `${v.discountPercent}% OFF` : `₹${v.discountFixed} OFF`} MEMBER PASS
                    </span>
                    <span class="text-[10px] text-stone-300">Expires: ${v.expiry || '2026-12-31'}</span>
                  </div>

                  <h5 class="font-serif text-xl font-bold text-amber-300 mb-1">${v.title}</h5>
                  <p class="text-xs text-stone-300 mb-4">${v.description}</p>

                  <div class="bg-white/10 p-3 rounded-xl border border-amber-400/30 flex items-center justify-between my-3">
                    <div>
                      <span class="text-[9px] text-amber-300 font-bold block uppercase tracking-wider">PROMO CODE</span>
                      <span class="font-mono text-lg font-bold text-white tracking-widest select-all">${v.code}</span>
                    </div>
                    <button class="text-xs text-amber-300 hover:text-white underline font-semibold" onclick="navigator.clipboard.writeText('${v.code}'); showToast('Voucher code copied!');">
                      <i class="fa-solid fa-copy mr-1"></i> Copy
                    </button>
                  </div>
                </div>

                <div class="flex gap-2 mt-4 pt-3 border-t border-white/10">
                  <button class="btn-gold text-xs py-2.5 flex-1" onclick="Loyalty.copyAndApplyVoucher('${v.code}')">
                    <i class="fa-solid fa-cart-plus mr-1"></i> Apply to Cart
                  </button>
                  <button class="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs py-2.5 px-4 rounded-full border border-white/20" onclick="Loyalty.showVoucherModal('${v.title}', '${v.code}', '${v.description}')">
                    <i class="fa-solid fa-qrcode mr-1"></i> Barcode
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}

        ${usedVouchers.length > 0 ? `
          <div class="mt-8 pt-6 border-t border-stone-200">
            <h5 class="font-serif text-lg font-bold text-stone-700 mb-4">Past / Redeemed Vouchers</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${usedVouchers.map(v => `
                <div class="bg-stone-100 text-stone-500 p-4 rounded-xl border border-stone-200 flex justify-between items-center text-xs opacity-75">
                  <div>
                    <p class="font-bold text-stone-800">${v.title}</p>
                    <p class="text-[10px] text-stone-500 font-mono">Code: ${v.code}</p>
                  </div>
                  <span class="bg-stone-200 text-stone-600 px-2.5 py-1 rounded-full text-[10px] font-bold">Used</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- TAB 2: POINTS REWARD SHOP -->
      <div class="${this.currentTab === 'rewards' ? 'block' : 'hidden'} space-y-6">
        <div class="flex justify-between items-center bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <div>
            <h4 class="font-serif text-xl font-bold text-stone-900">Member Points Exchange Store</h4>
            <p class="text-xs text-stone-500">Redeem your accumulated Roastery points for exclusive coupons & free items.</p>
          </div>
          <div class="text-right">
            <span class="text-xs text-stone-500 block">Your Points</span>
            <span class="font-serif text-2xl font-bold text-amber-800">${data.points} Pts</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="rosa-card p-6 flex flex-col justify-between group">
            <div>
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg mb-3">
                <i class="fa-solid fa-mug-hot"></i>
              </div>
              <span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">100 Points</span>
              <h5 class="font-serif text-lg font-bold text-stone-900 mt-2">Free Artisanal Beverage</h5>
              <p class="text-xs text-stone-600 mt-1">100% discount on any size Cappuccino, Latte, Espresso, or Cold Brew.</p>
            </div>
            <button class="btn-rosa text-xs py-2.5 w-full mt-4" onclick="Loyalty.redeemPoints('r1', 100, 'Free Artisanal Beverage')">
              Redeem for 100 Pts
            </button>
          </div>

          <div class="rosa-card p-6 flex flex-col justify-between group">
            <div>
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg mb-3">
                <i class="fa-solid fa-cookie-bite"></i>
              </div>
              <span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">60 Points</span>
              <h5 class="font-serif text-lg font-bold text-stone-900 mt-2">50% Off Any Bakery Item</h5>
              <p class="text-xs text-stone-600 mt-1">Valid on Valrhona ganache tart, baklava bites, or truffle tartine.</p>
            </div>
            <button class="btn-rosa text-xs py-2.5 w-full mt-4" onclick="Loyalty.redeemPoints('r2', 60, '50% Off Bakery Item')">
              Redeem for 60 Pts
            </button>
          </div>

          <div class="rosa-card p-6 flex flex-col justify-between group">
            <div>
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg mb-3">
                <i class="fa-solid fa-plate-wheat"></i>
              </div>
              <span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">150 Points</span>
              <h5 class="font-serif text-lg font-bold text-stone-900 mt-2">Chef's Meal Truffle Upgrade</h5>
              <p class="text-xs text-stone-600 mt-1">Free truffle sauce & extra cheese upgrade on any custom pasta or meal.</p>
            </div>
            <button class="btn-rosa text-xs py-2.5 w-full mt-4" onclick="Loyalty.redeemPoints('r3', 150, 'Chef Truffle Upgrade')">
              Redeem for 150 Pts
            </button>
          </div>

          <div class="rosa-card p-6 flex flex-col justify-between group">
            <div>
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg mb-3">
                <i class="fa-solid fa-truck-fast"></i>
              </div>
              <span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">80 Points</span>
              <h5 class="font-serif text-lg font-bold text-stone-900 mt-2">Free Local Delivery Pass</h5>
              <p class="text-xs text-stone-600 mt-1">Waives ₹5.00 delivery fees on your next gourmet order.</p>
            </div>
            <button class="btn-rosa text-xs py-2.5 w-full mt-4" onclick="Loyalty.redeemPoints('r4', 80, 'Free Delivery Pass')">
              Redeem for 80 Pts
            </button>
          </div>

          <div class="rosa-card p-6 flex flex-col justify-between group">
            <div>
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg mb-3">
                <i class="fa-solid fa-box-open"></i>
              </div>
              <span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">300 Points</span>
              <h5 class="font-serif text-lg font-bold text-stone-900 mt-2">Antiquity Cafe Tote & Beans</h5>
              <p class="text-xs text-stone-600 mt-1">Collect 1 bag of Ethiopian Yirgacheffe coffee beans + Canvas Tote.</p>
            </div>
            <button class="btn-rosa text-xs py-2.5 w-full mt-4" onclick="Loyalty.redeemPoints('r5', 300, 'Tote Bag & Coffee Beans')">
              Redeem for 300 Pts
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 3: VIP TIER STATUS -->
      <div class="${this.currentTab === 'tiers' ? 'block' : 'hidden'} space-y-6">
        <div class="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div class="flex justify-between items-center mb-4">
            <div>
              <span class="text-xs text-amber-700 font-bold uppercase tracking-wider">Patron Status Level</span>
              <h4 class="font-serif text-2xl font-bold text-stone-900">${data.tier || 'Bronze Connoisseur'}</h4>
            </div>
            <div class="text-right">
              <span class="text-xs text-stone-500">Lifetime Points: <strong class="text-stone-900">${data.points}</strong></span>
            </div>
          </div>

          <!-- Progress Bar to Next Rank -->
          <div class="relative w-full h-3 bg-stone-200 rounded-full overflow-hidden mb-2">
            <div class="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 transition-all duration-500" style="width: ${Math.min((data.points / 3000) * 100, 100)}%"></div>
          </div>
          <div class="flex justify-between text-[11px] text-stone-500 font-semibold">
            <span>Bronze (0 pt)</span>
            <span>Silver (500 pt)</span>
            <span>Gold VIP (1500 pt)</span>
            <span>Diamond Master (3000+ pt)</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="vip-tier-card border-l-4 border-l-amber-700">
            <div class="flex justify-between items-start mb-2">
              <h5 class="font-serif text-lg font-bold text-stone-900">Bronze Connoisseur</h5>
              <span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">0 – 499 Pts</span>
            </div>
            <ul class="text-xs text-stone-600 space-y-2 mt-3">
              <li><i class="fa-solid fa-check text-green-600 mr-2"></i> Earn 1 digital stamp per coffee order</li>
              <li><i class="fa-solid fa-check text-green-600 mr-2"></i> 5% cashback points on all purchases</li>
              <li><i class="fa-solid fa-check text-green-600 mr-2"></i> Welcome complimentary birthday roast</li>
            </ul>
          </div>

          <div class="vip-tier-card border-l-4 border-l-stone-400">
            <div class="flex justify-between items-start mb-2">
              <h5 class="font-serif text-lg font-bold text-stone-900">Silver Patron</h5>
              <span class="text-[10px] bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full font-bold">500 – 1,499 Pts</span>
            </div>
            <ul class="text-xs text-stone-600 space-y-2 mt-3">
              <li><i class="fa-solid fa-check text-green-600 mr-2"></i> 1.25x Points earning multiplier</li>
              <li><i class="fa-solid fa-check text-green-600 mr-2"></i> Free Oat/Almond artisanal milk upgrades</li>
              <li><i class="fa-solid fa-check text-green-600 mr-2"></i> Priority table reservations on weekends</li>
            </ul>
          </div>

          <div class="vip-tier-card border-l-4 border-l-amber-500">
            <div class="flex justify-between items-start mb-2">
              <h5 class="font-serif text-lg font-bold text-stone-900">Gold VIP Connoisseur</h5>
              <span class="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">1,500 – 2,999 Pts</span>
            </div>
            <ul class="text-xs text-stone-600 space-y-2 mt-3">
              <li><i class="fa-solid fa-check text-green-600 mr-2"></i> 1.5x Points earning multiplier</li>
              <li><i class="fa-solid fa-check text-green-600 mr-2"></i> Secret off-menu coffee tastings with Barista</li>
              <li><i class="fa-solid fa-check text-green-600 mr-2"></i> Zero delivery fees on all local orders</li>
            </ul>
          </div>

          <div class="vip-tier-card border-l-4 border-l-stone-900 bg-stone-900 text-white">
            <div class="flex justify-between items-start mb-2">
              <h5 class="font-serif text-lg font-bold text-amber-400">Diamond Master Roaster</h5>
              <span class="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">3,000+ Pts</span>
            </div>
            <ul class="text-xs text-stone-300 space-y-2 mt-3">
              <li><i class="fa-solid fa-check text-amber-400 mr-2"></i> 2.0x Points earning multiplier</li>
              <li><i class="fa-solid fa-check text-amber-400 mr-2"></i> Private annual coffee roasting masterclass ticket</li>
              <li><i class="fa-solid fa-check text-amber-400 mr-2"></i> Custom engraved porcelain mug reserved at cafe bar</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- TAB 4: STAMP ACTIVITY HISTORY -->
      <div class="${this.currentTab === 'history' ? 'block' : 'hidden'} space-y-4">
        <div class="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h4 class="font-serif text-xl font-bold text-stone-900 mb-4">Stamp & Points Activity History</h4>
          <div class="space-y-3">
            ${(data.history || []).length === 0 ? `
              <p class="text-xs text-stone-500 italic py-4 text-center">No history recorded yet.</p>
            ` : (data.history || []).map(item => `
              <div class="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center text-xs">
                <div>
                  <p class="font-bold text-stone-900">${item.title}</p>
                  <p class="text-[10px] text-stone-500">${new Date(item.date).toLocaleString()}</p>
                </div>
                <div class="text-right flex items-center gap-2">
                  ${item.stampsChange > 0 ? `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">+${item.stampsChange} Stamp</span>` : ''}
                  <span class="font-mono font-bold ${item.pointsChange >= 0 ? 'text-green-700' : 'text-red-600'}">
                    ${item.pointsChange >= 0 ? '+' : ''}${item.pointsChange} Pts
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- DIGITAL VOUCHER CODE MODAL -->
      <div id="voucher-modal" class="modal-overlay">
        <div class="modal-container p-6 max-w-md">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-serif text-2xl font-bold text-stone-900">Digital Member Voucher</h3>
            <button class="text-stone-400 text-2xl" onclick="document.getElementById('voucher-modal').classList.remove('open')">&times;</button>
          </div>

          <div id="voucher-modal-content"></div>
        </div>
      </div>

      <!-- DIGITAL QR CODE MODAL -->
      <div id="qr-modal" class="modal-overlay">
        <div class="modal-container p-6 text-center max-w-sm">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-serif text-xl font-bold text-stone-900">Member Pass QR Code</h3>
            <button class="text-stone-400 text-2xl" onclick="document.getElementById('qr-modal').classList.remove('open')">&times;</button>
          </div>

          <p class="text-xs text-stone-600 mb-4">Present this barcode or QR code to the barista at Antiquity Cafe counter to collect digital stamps.</p>

          <div class="p-6 bg-white border border-stone-300 rounded-2xl inline-block shadow-inner mb-4">
            <div class="w-44 h-44 bg-stone-900 rounded-xl flex items-center justify-center p-2 text-white text-center">
              <i class="fa-solid fa-qrcode text-8xl text-amber-400"></i>
            </div>
            <p class="font-mono font-bold text-stone-900 text-xs mt-3 tracking-widest">ANTIQ-MEM-88219</p>
          </div>

          <button class="btn-rosa text-xs py-2.5 w-full" onclick="document.getElementById('qr-modal').classList.remove('open')">Done</button>
        </div>
      </div>
    `;
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.renderLoyaltyView();
  },

  async claimFreeCoffee() {
    const user = Auth.getUser();
    const email = user ? user.email : 'customer@rosa.cafe';

    try {
      const res = await API.claimFreeCoffee(email);
      if (res.success) {
        this.showVoucherModal('Free Artisanal Coffee Pass', res.voucherCode, 'Redeem for 100% discount on any size Coffee Brew!');
        await this.init(); // Refresh data
      }
    } catch (err) {
      showToast('Error claiming voucher.');
    }
  },

  async redeemPoints(rewardId, pointsCost, title) {
    const user = Auth.getUser();
    const email = user ? user.email : 'customer@rosa.cafe';

    if ((this.loyaltyData?.points || 0) < pointsCost) {
      showToast(`You need ${pointsCost} points to redeem this reward. (Current: ${this.loyaltyData?.points || 0})`);
      return;
    }

    try {
      const res = await API.redeemLoyaltyPoints(email, rewardId);
      if (res.success) {
        showToast(res.message);
        this.showVoucherModal(title, res.voucherCode, `Redeemed for ${pointsCost} Roastery Points`);
        await this.init(); // Refresh
      } else {
        showToast(res.error || 'Failed to redeem reward.');
      }
    } catch (err) {
      showToast('Error redeeming reward.');
    }
  },

  async doDailyCheckIn() {
    const user = Auth.getUser();
    const email = user ? user.email : 'customer@rosa.cafe';

    try {
      const res = await API.dailyCheckIn(email);
      if (res.success) {
        showToast(res.message);
        await this.init();
      } else {
        showToast(res.error || 'Already checked in today!');
      }
    } catch (err) {
      showToast('You have already completed your daily check-in today!');
    }
  },

  showVoucherModal(title, code, desc) {
    const modal = document.getElementById('voucher-modal');
    const content = document.getElementById('voucher-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="voucher-ticket text-center">
        <span class="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Antiquity Cafe Roastery Pass</span>
        <h4 class="font-serif text-2xl font-bold text-white mt-1 mb-2">${title}</h4>
        <p class="text-xs text-stone-300 mb-6">${desc}</p>

        <div class="bg-white/10 p-3 rounded-xl border border-amber-400/30 mb-4 inline-block w-full">
          <span class="text-[10px] text-amber-300 block font-semibold mb-1">PROMO / VOUCHER CODE</span>
          <p class="font-mono text-2xl font-bold text-amber-300 tracking-wider select-all">${code}</p>
        </div>

        <div class="barcode-strip my-4"></div>

        <div class="flex gap-2">
          <button class="btn-gold text-xs py-2.5 flex-1" onclick="Loyalty.copyAndApplyVoucher('${code}')">
            <i class="fa-solid fa-cart-plus mr-1"></i> Apply directly to Cart
          </button>
          <button class="btn-rosa-outline border-white text-white text-xs py-2.5 px-4" onclick="navigator.clipboard.writeText('${code}'); showToast('Code copied to clipboard!');">
            <i class="fa-solid fa-copy"></i> Copy
          </button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  copyAndApplyVoucher(code) {
    Cart.applyCouponCode(code);
    document.getElementById('voucher-modal')?.classList.remove('open');
    if (typeof window.toggleCartDrawer === 'function') {
      const drawer = document.getElementById('cart-drawer');
      if (drawer && !drawer.classList.contains('open')) {
        window.toggleCartDrawer();
      }
    }
  },

  showQRModal() {
    document.getElementById('qr-modal')?.classList.add('open');
  }
};

window.Loyalty = Loyalty;
