import { renderBookingData, apiBookingData } from '/static/js/booking.js';
import { renderMemberData, apiMemberData } from '/static/js/member.js';

const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const backToSignup = document.getElementById('backToSignup');
const backToLogin = document.getElementById('backToLogin');
const loginOrSignupBtn = document.getElementById('loginOrSignup');
const loginClose = document.getElementById('loginClose');
const signupClose = document.getElementById('signupClose');
const bookingBtn = document.getElementById('booking');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

loginClose.onclick = () => {
  loginModal.style.display = 'none';
}

signupClose.onclick = () => {
  signupModal.style.display = 'none';
}

backToSignup.onclick = () => {
  loginModal.style.display = 'none';
  signupModal.style.display = 'block';
}

backToLogin.onclick = () => {
  signupModal.style.display = 'none';
  loginModal.style.display = 'block';
}

window.onclick = (e) => {
  if (e.target == loginModal) {
    loginModal.style.display = 'none';
  } else if (e.target == signupModal) {
    signupModal.style.display = 'none';
  }
}

window.addEventListener('load', () => {
  const loadingOverlay = document.getElementById('loadingOverlay');
  const mainElement = document.querySelector('main');
  const footerElement = document.querySelector('footer');
  loadingOverlay.style.display = 'none';
  mainElement.style.display = 'block';
  footerElement.style.display = 'block';
});

document.addEventListener('DOMContentLoaded', async () => {
  const { isLoggedIn, name, email, phone, profileUrl } = await checkUserLoginStatus();
  const path = window.location.pathname;
  const restrictedPaths = ['/booking', '/member', '/thankyou'];

  if (!isLoggedIn && restrictedPaths.includes(path)) {
    window.location.href = '/';
  }

  if (path === '/booking') {
    const bookingData = await apiBookingData();
    renderBookingData({ ...bookingData, name, email, phone });
    const phoneInput = document.getElementById('telInput');
    // 限制手機號碼只能輸入數字，且長度最多 10 碼
    if (Object.keys(bookingData).length > 0) {
      phoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      });
    }
  }

  if (path === '/member') {
    const historyData = await apiMemberData();
    renderMemberData({ ...historyData, name, phone, profileUrl });
    showLogOutUI()
  }
});

bookingBtn.addEventListener('click', async () => {
  bookingBtn.removeEventListener('click', handleBooking);
  const isLoggedIn = await checkUserLoginStatus();

  if (isLoggedIn) {
    window.location.href = '/booking';
  } else {
    handleLoginOrSignup();
  }
});

function loginUser(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  fetch('/api/user/auth', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      password: password
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      const loginError = document.getElementById('loginError');
      loginError.innerText = data.message;
    } else {
      localStorage.setItem('token', data.token);
      loginClose.onclick()
      alert('歡迎回來')
      showMemberSectionUI()
    }
  })
  .catch(error => console.error('Login error:', error));
}

function signupUser(e) {
  e.preventDefault();

  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  fetch('/api/user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: name,
      email: email,
      password: password
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      const signupError = document.getElementById('signupError');
      signupError.innerText = data.message;
    } else {
      signupError.innerText = '註冊成功';
      document.getElementById('signupName').value = '';
      document.getElementById('signupEmail').value = '';
      document.getElementById('signupPassword').value = '';
    }
  })
  .catch(error => console.error('Signup error:', error));
}

export async function checkUserLoginStatus() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/user/auth', {
      method: 'GET',
      headers: {
        'Authorization': token,
      }
    });
    const data = await response.json();
    if (data.data) {
      showMemberSectionUI();
      return { isLoggedIn: true,
        name: data.data.name,
        email: data.data.email,
        phone: data.data.phone,
        profileUrl: data.data.profileUrl
      };
    } else {
      showLogInUI();
      return false;
    }
  } catch (error) {
    console.error('Error checking user login status:', error);
    return false;
  }
}

export function setUserData(data) {
  userData = data;
}

export function getUserData() {
  return userData;
}

function showLogOutUI() {
  loginOrSignupBtn.innerText = '登出系統';
  loginOrSignupBtn.addEventListener('click', handleLogout);
}

function showLogInUI() {
  loginOrSignupBtn.innerText = '登入/註冊';
}

function showMemberSectionUI() {
  loginOrSignupBtn.innerText = '會員專區';
  loginOrSignupBtn.removeEventListener('click', handleLoginOrSignup);
  loginOrSignupBtn.addEventListener('click', async () => {
    const isLoggedIn = await checkUserLoginStatus();

    if (isLoggedIn) {
      window.location.href = '/member';
    } else {
      // loginOrSignupBtn.onclick();
      handleLoginOrSignup();
    }
  });
}

function handleLogout() {
  localStorage.removeItem('token');
  showLogOutUI();
  alert('已登出')
  loginClose.onclick()
  window.location.reload();
}

function handleLoginOrSignup() {
  loginModal.style.display = 'block';
}

function handleBooking() {
  window.location.href = '/booking';
}

loginForm.addEventListener('submit', loginUser);
signupForm.addEventListener('submit', signupUser);
loginOrSignupBtn.addEventListener('click', handleLoginOrSignup);
bookingBtn.addEventListener('click', handleBooking);
