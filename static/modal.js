// 獲取彈出視窗元素
let loginModal = document.getElementById('loginModal');
let signupModal = document.getElementById('signupModal');
let backToSignup = document.getElementById('backToSignup');
let backToLogin = document.getElementById('backToLogin');
let loginOrSignupBtn = document.getElementById('loginOrSignup');
let loginClose = document.getElementById('loginClose');
let signupClose = document.getElementById('signupClose');

// 點擊按鈕時顯示彈出視窗
loginOrSignupBtn.onclick = function() {
  loginModal.style.display = 'block';
}

// 點擊關閉按鈕時隱藏彈出視窗
loginClose.onclick = function() {
  loginModal.style.display = 'none';
}

// 點擊關閉按鈕時隱藏彈出視窗
signupClose.onclick = function() {
  signupModal.style.display = 'none';
}

// 點擊關閉按鈕時隱藏彈出視窗
backToSignup.onclick = function() {
  loginModal.style.display = 'none';
  signupModal.style.display = 'block';
}

// 點擊關閉按鈕時隱藏彈出視窗
backToLogin.onclick = function() {
  signupModal.style.display = 'none';
  loginModal.style.display = 'block';
}

// 在點擊視窗以外區域時隱藏彈出視窗
window.onclick = function(event) {
  if (event.target == loginModal) {
    loginModal.style.display = 'none';
  } else if (event.target == signupModal) {
    signupModal.style.display = 'none';
  }
}

document.getElementById('loginForm').addEventListener('submit', loginUser);
document.getElementById('signupForm').addEventListener('submit', signupUser);

// 登入
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
      showLogInUI()
      loginClose.onclick()
      alert('歡迎回來')
    }
  })
  .catch(error => console.error('Login error:', error));
}

// 註冊
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

window.addEventListener('load', () => {
  const loadingOverlay = document.getElementById('loadingOverlay');
  const mainElement = document.querySelector('main');
  const footerElement = document.querySelector('footer');
  loadingOverlay.style.display = 'none';
  mainElement.style.display = 'block';
  footerElement.style.display = 'block';
});

// 檢查使用者狀態
document.addEventListener('DOMContentLoaded', () => {
  checkUserLoginStatus();
});

async function checkUserLoginStatus() {
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
      showLogInUI();
      return { isLoggedIn: true, name: data.data.name, email: data.data.email };
    } else {
      showLogOutUI();
      return false;
    }
  } catch (error) {
    console.error('Error checking user login status:', error);
    return false;
  }
}

function showLogInUI() {
  loginOrSignupBtn.innerText = '登出系統';
  loginOrSignupBtn.addEventListener('click', handleLogout);
}

function handleLogout() {
  localStorage.removeItem('token');
  showLogOutUI();
  alert('已登出')
  loginClose.onclick()
  window.location.reload();
}

function showLogOutUI() {
  loginOrSignupBtn.innerText = '登入/註冊';
}

export { checkUserLoginStatus };

let bookingBtn = document.getElementById('booking');
bookingBtn.addEventListener('click', async () => {
  const isLoggedIn = await checkUserLoginStatus();

  if (isLoggedIn) {
    window.location.href = '/booking';
  } else {
    loginOrSignupBtn.onclick();
  }
})
