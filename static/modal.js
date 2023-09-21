// 獲取彈出視窗元素
var loginModal = document.getElementById('loginModal');
var signupModal = document.getElementById('signupModal');
var backToSignup = document.getElementById('backToSignup');
var backToLogin = document.getElementById('backToLogin');
var loginOrSignupBtn = document.getElementById('loginOrSignup');
var loginClose = document.getElementById('loginClose');
var signupClose = document.getElementById('signupClose');

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

// 檢查使用者狀態
document.addEventListener('DOMContentLoaded', () => {
  checkUserLoginStatus();
});

function checkUserLoginStatus() {
  const token = localStorage.getItem('token');

  fetch('/api/user/auth', {
    method: 'GET',
    headers: {
      'Authorization': token,
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.data) {
      showLogInUI();
    } else {
      showLogOutUI();
    }
  })
  .catch(error => console.error('Error checking user login status:', error));
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
