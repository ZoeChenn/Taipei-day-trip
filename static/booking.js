import { checkUserLoginStatus } from '/static/modal.js';

document.addEventListener('DOMContentLoaded', async () => {
  const { isLoggedIn, name, email } = await checkUserLoginStatus();

  if (!isLoggedIn) {
    window.location.href = '/';
  } else {
    const bookingData = await apiBookingData();
    renderBookingData({ ...bookingData, name, email });
  }
});

async function apiBookingData() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/booking', {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      console.log('fail to fetch data');
      return false;
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.log('fetch error:', error);
    return false;
  }
}

export { apiBookingData };

function renderBookingData(data) {
  const orderName = document.getElementById('nameInput');
  const orderEmail = document.getElementById('emailInput');
  const bookingContainer = document.querySelector('.booking_container');
  const bookingContainerTop = document.querySelector('.booking_container-top');
  const total = document.querySelector('.total');

  if (!data || !data.attraction) {
    bookingContainer.innerHTML = '<p class="booking_message">目前沒有任何待預定的行程。</p>';
    return;
  }

  const { email, name, attraction, date, time, price } = data;
  let timeShower;

  if (time === "morning") {
    timeShower = "早上 9 點到下午 4 點"
  } else if (time === "afternoon") {
    timeShower = "下午 4 點到晚上 9 點"
  }

  const bookingContent = `
    <h2>您好，${name}，待預訂的行程如下：</h2>
    <div class="top_warp">
      <div class="booking_picture">
        <img src="${attraction.image}" alt="" class="pictureUrl">
      </div>
      <div class="booking_title">
        <div class="booking_name">台北一日遊：${attraction.name}</div>
        <div class="booking_detail">
          <h3>日期：</h3><span class="date">${date}</span><br>
          <h3>時間：</h3><span class="time">${timeShower}</span><br>
          <h3>費用：</h3><span class="price">新台幣 ${price} 元</span><br>
          <h3>地點：</h3><span class="address">${attraction.address}</span>
        </div>
      </div>
      <span class="booking_deleteBtn"></span>
    </div>
  `;

  total.innerHTML = price;
  bookingContainerTop.innerHTML = bookingContent;
  orderName.value = name;
  orderEmail.value = email;

  const deleteBtn = bookingContainerTop.querySelector('.booking_deleteBtn');
  deleteBtn.addEventListener('click', () => {
    apiDeleteBooking();
  });
}

async function apiDeleteBooking() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/booking', {
      method: 'DELETE',
      headers: {
        'Authorization': token,
      }
    });
    if (!response.ok) {
      console.log('fail to fetch data')
      return false;
    }
    renderBookingData(null);
    return true;
  } catch (error) {
    console.log('fetch error:', error);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const phoneInput = document.getElementById('telInput');
  // 限制手機號碼只能輸入數字，且長度最多 10 碼
  phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
  });
});
