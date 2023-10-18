import { checkUserLoginStatus } from '/static/js/modal.js';

let images;
let currentImageIndex = 0;
const currentURL = window.location.href;
const attractionId = currentURL.match(/\/attraction\/(\d+)/)[1];
const radioUp = document.querySelector('.radio-up')
const radioDown = document.querySelector('.radio-down')
const dateInput = document.querySelector('.dateSelect');
const prevBtn = document.querySelector(".prev");
const nextBtn = document.querySelector(".next");
const dotsContainer = document.querySelector(".dots");
const pictureDiv = document.querySelector(".picture");
const bookThisSpotBtn = document.getElementById('bookThisSpot');
const loginOrSignupBtn = document.getElementById('loginOrSignup');

if (attractionId) {
  const apiUrl = `/api/attraction/${attractionId}`;
  fetch(apiUrl)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`網路回應不正常: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    images = data.data.images;
    renderAttractionDetail(data);
    updateSlide();
  })
  .catch((error) => {
    console.error("獲取景點資料時出錯:", error);
  });
}

function renderAttractionDetail(data) {
  const attractionName = data.data.name;
  const attractionMrt = data.data.mrt;
  const attractionCategory = data.data.category;
  const attractionAddress = data.data.address;
  const attractionTransport = data.data.transport;
  const attractionDescription = data.data.description;

  const nameDiv = document.querySelector(".attraction_name");
  const cateMrtDiv = document.querySelector(".attraction_cateMrt");
  const descriptionDiv = document.querySelector(".attraction_description");
  const addressDiv = document.querySelector(".attraction_address");
  const transportDiv = document.querySelector(".attraction_transport");

  nameDiv.textContent = attractionName;
  cateMrtDiv.textContent = `${attractionCategory} at ${attractionMrt}`;
  descriptionDiv.textContent = attractionDescription;
  addressDiv.querySelector("p").textContent = attractionAddress;
  transportDiv.querySelector("p").textContent = attractionTransport;

  for (const imageUrl of data.data.images) {
    const image = document.createElement("img");
    image.classList.add("attraction_img");
    image.src = imageUrl;
    image.alt = attractionName;

    const pictureDiv = document.querySelector(".picture");
    pictureDiv.appendChild(image);
  }
  updateSlide();
}

radioUp.addEventListener('click', () => {
  const fee = document.querySelector('.fee')
  fee.textContent = ' 2000 ';
})

radioDown.addEventListener('click', () => {
  const fee = document.querySelector('.fee')
  fee.textContent = ' 2500 ';
})

function updateSlide() {
  const imgSlides = document.querySelectorAll('.attraction_img');
  const containerWidth = pictureDiv.clientWidth;
  const offset = currentImageIndex * containerWidth * -1;

  imgSlides.forEach((slide) => {
    slide.style.transform = `translateX(${offset}px)`;
  });
  updateDots();
}

function updateDots() {
  dotsContainer.innerHTML = "";
  for (let i = 0; i < images.length; i++) {
    const dot = document.createElement("span");
    dot.classList.add("dot");
    if (i === currentImageIndex) {
      dot.classList.add("active");
    }
    dotsContainer.appendChild(dot);
  }
}

prevBtn.addEventListener("click", () => {
  if (currentImageIndex > 0) {
    currentImageIndex--;
  } else {
    currentImageIndex = images.length - 1;
  }
  updateSlide();
});

nextBtn.addEventListener("click", () => {
  if (currentImageIndex < images.length - 1) {
    currentImageIndex++;
  } else {
    currentImageIndex = 0;
  }
  updateSlide();
});

dotsContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("dot")) {
    const dotIndex = Array.from(dotsContainer.children).indexOf(e.target);
    currentImageIndex = dotIndex;
    updateSlide();
  }
});

bookThisSpotBtn.addEventListener('click', async () => {
  const isLoggedIn = await checkUserLoginStatus();
  const date = dateInput.value
  const time = radioDown.checked ? 'afternoon' : 'morning';
  const tourFee = document.querySelector('.fee').innerText.trim();
  const token = localStorage.getItem('token');

  if ( !date ) {
    alert('請選擇預約日期')
  }
  else if (!isLoggedIn) {
    loginOrSignupBtn.onclick();
  }
  else {
    fetch('/api/booking', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attractionId: attractionId,
        date: date,
        time: time,
        price: tourFee
      })
    })
    .then(response => response.json())
    .then(data => {
      window.location.href = '/booking';
    })
    .catch(error => console.error('Signup error:', error));
  }
})

// 動態調整 date 的最小值（避免選取今日及過去時間）
// 取得目前日期並轉換成 YYYY-MM-DD 格式
const today = new Date();
const year = today.getFullYear();
let month = today.getMonth() + 1;
let day = today.getDate() + 1;

// 若月份和日期為個位數的情況，補零
month = month < 10 ? `0${month}` : month;
day = day < 10 ? `0${day}` : day;

// 設定 min 屬性為目前日期
const formattedToday = `${year}-${month}-${day}`;
dateInput.setAttribute('min', formattedToday);
