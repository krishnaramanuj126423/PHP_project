/* Flavour Profile Quiz Controller */
import { API } from './api.js';
import { Cart } from './cart.js';
import { showToast } from './main.js';

let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let resultData = null;

export const Quiz = {
  async init() {
    try {
      const data = await API.getQuizData();
      quizQuestions = data.questions || [];
      currentQuestionIndex = 0;
      userAnswers = {};
      resultData = null;
      this.renderQuestion();
    } catch (err) {
      console.error('Error initializing quiz:', err);
    }
  },

  renderQuestion() {
    const cardEl = document.getElementById('quiz-card-container');
    if (!cardEl) return;

    if (currentQuestionIndex >= quizQuestions.length) {
      this.calculateResults();
      return;
    }

    const q = quizQuestions[currentQuestionIndex];
    const progressPct = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

    cardEl.innerHTML = `
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width: ${progressPct}%"></div>
      </div>
      
      <span class="text-xs font-semibold text-amber-700 tracking-wider uppercase">Question ${currentQuestionIndex + 1} of ${quizQuestions.length}</span>
      <h3 class="font-serif text-2xl font-semibold text-stone-900 mt-2 mb-6">${q.text}</h3>

      <div class="space-y-3">
        ${q.options.map((opt, idx) => `
          <button class="quiz-option-btn" onclick="Quiz.selectAnswer('${q.id}', ${idx})">
            <span>${opt.label}</span>
            <i class="fa-solid fa-arrow-right text-amber-700"></i>
          </button>
        `).join('')}
      </div>
    `;
  },

  async selectAnswer(questionId, optionIndex) {
    userAnswers[questionId] = optionIndex;
    currentQuestionIndex++;
    this.renderQuestion();
  },

  async calculateResults() {
    const cardEl = document.getElementById('quiz-card-container');
    if (!cardEl) return;

    cardEl.innerHTML = `
      <div class="text-center py-12">
        <i class="fa-solid fa-wand-magic-sparkles text-4xl text-amber-600 fa-bounce mb-3"></i>
        <h3 class="font-serif text-2xl text-stone-900">Calculating your unique flavour profile...</h3>
      </div>
    `;

    try {
      const res = await API.calculateQuiz(userAnswers);
      resultData = res;

      cardEl.innerHTML = `
        <div class="text-center">
          <span class="text-xs font-bold text-amber-700 tracking-widest uppercase">Your Flavour Identity</span>
          <h2 class="profile-result-badge mt-2">${res.profileName}</h2>
          <p class="text-stone-600 text-sm max-w-lg mx-auto mb-8 leading-relaxed">${res.profile.description}</p>

          <h4 class="font-serif text-xl font-semibold text-stone-900 text-left mb-4">Recommended Artisanal Items For You:</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            ${res.recommendedProducts.map(item => `
              <div class="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col justify-between text-left">
                <div>
                  <img src="${item.image}" class="w-full h-28 object-cover rounded-lg mb-2">
                  <h5 class="font-semibold text-stone-900 text-sm">${item.name}</h5>
                  <p class="text-xs text-stone-500 mb-2">₹${item.price.toFixed(2)}</p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button class="btn-rosa text-[11px] py-1.5 px-2 w-full" onclick="Quiz.addSingleItem('${item.id}')">Quick Add</button>
                  <button class="btn-rosa-outline text-[11px] py-1.5 px-2 w-full" onclick="Quiz.customizeItem('${item.id}')">Customize</button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="flex flex-wrap gap-3 justify-center">
            <button class="btn-gold text-sm py-3 px-6" onclick="Quiz.addAllRecommendations()">
              <i class="fa-solid fa-cart-arrow-down"></i> Add All Recommended Items to Cart
            </button>
            <button class="btn-rosa-outline text-sm py-3 px-6" onclick="Quiz.init()">
              <i class="fa-solid fa-rotate-left"></i> Retake Quiz
            </button>
          </div>
        </div>
      `;
    } catch (err) {
      cardEl.innerHTML = `<p class="text-center text-red-600">Error calculating flavour profile.</p>`;
    }
  },

  addSingleItem(itemId) {
    if (!resultData) return;
    const item = resultData.recommendedProducts.find(p => p.id === itemId);
    if (item) {
      Cart.addItem(item, 1);
    }
  },

  customizeItem(itemId) {
    if (typeof Menu !== 'undefined' && Menu.openCustomizeModal) {
      Menu.openCustomizeModal(itemId);
    } else {
      this.addSingleItem(itemId);
    }
  },

  addAllRecommendations() {
    if (!resultData || !resultData.recommendedProducts) return;
    resultData.recommendedProducts.forEach(item => {
      Cart.addItem(item, 1, 'Flavour Quiz Recommendation');
    });
    showToast('Added all recommended items to cart!');
  }
};

window.Quiz = Quiz;
