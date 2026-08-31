/* Auth Manager for Customer & Admin Sessions */
import { showToast, switchView } from './main.js';
import { API } from './api.js';

let currentUser = JSON.parse(localStorage.getItem('rosa_user') || 'null');

export const Auth = {
  getUser() {
    return currentUser;
  },

  isAdmin() {
    return currentUser && currentUser.role === 'admin';
  },

  async login(email, password) {
    try {
      const res = await API.loginUser({ email: (email || '').trim(), password });
      if (res && res.success) {
        currentUser = res.user;
        localStorage.setItem('rosa_user', JSON.stringify(currentUser));
        showToast(`Welcome back, ${currentUser.name}!`);
        this.updateNavUI();

        if (currentUser.role === 'admin') {
          switchView('admin');
        } else if (sessionStorage.getItem('rosa_redirect_checkout') === 'true') {
          sessionStorage.removeItem('rosa_redirect_checkout');
          showToast(`Welcome ${currentUser.name}! Resuming your checkout...`);
          switchView('home');
          setTimeout(() => {
            if (window.Cart && typeof window.Cart.openCheckout === 'function') {
              window.Cart.openCheckout();
            }
          }, 350);
        } else {
          switchView('account');
        }
        return { success: true, user: currentUser };
      } else {
        const errorMsg = (res && res.error) || 'Invalid email or password. Please try again.';
        showToast(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = 'Network error during sign in. Please try again.';
      showToast(errorMsg);
      return { success: false, error: errorMsg };
    }
  },

  async register(name, email, password) {
    try {
      const res = await API.registerUser({ name: (name || '').trim(), email: (email || '').trim(), password });
      if (res && res.success) {
        currentUser = res.user;
        localStorage.setItem('rosa_user', JSON.stringify(currentUser));
        showToast(`Account created! Welcome, ${currentUser.name}`);
        this.updateNavUI();
        if (sessionStorage.getItem('rosa_redirect_checkout') === 'true') {
          sessionStorage.removeItem('rosa_redirect_checkout');
          showToast(`Account created! Resuming your checkout...`);
          switchView('home');
          setTimeout(() => {
            if (window.Cart && typeof window.Cart.openCheckout === 'function') {
              window.Cart.openCheckout();
            }
          }, 350);
        } else {
          switchView('account');
        }
        return { success: true, user: currentUser };
      } else {
        const errorMsg = (res && res.error) || 'Registration failed. Please check your details.';
        showToast(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = 'Network error during registration. Please try again.';
      showToast(errorMsg);
      return { success: false, error: errorMsg };
    }
  },

  logout() {
    currentUser = null;
    localStorage.removeItem('rosa_user');
    showToast('Signed out successfully.');
    this.updateNavUI();
    switchView('account');
  },

  updateNavUI() {
    const userBtnText = document.getElementById('nav-user-text');
    const adminLink = document.getElementById('nav-admin-link');
    const mobileAdminLink = document.getElementById('mobile-nav-admin-link');
    const isAdminUser = this.isAdmin();

    if (userBtnText) {
      if (currentUser) {
        userBtnText.textContent = isAdminUser 
          ? `Admin (${currentUser.name.split(' ')[0]})` 
          : currentUser.name.split(' ')[0];
      } else {
        userBtnText.textContent = 'Sign In';
      }
    }

    if (adminLink) {
      if (isAdminUser) {
        adminLink.classList.remove('hidden');
        adminLink.style.display = 'inline-flex';
      } else {
        adminLink.classList.add('hidden');
        adminLink.style.display = 'none';
      }
    }

    if (mobileAdminLink) {
      if (isAdminUser) {
        mobileAdminLink.classList.remove('hidden');
        mobileAdminLink.style.display = 'flex';
      } else {
        mobileAdminLink.classList.add('hidden');
        mobileAdminLink.style.display = 'none';
      }
    }
  }
};

window.Auth = Auth;
