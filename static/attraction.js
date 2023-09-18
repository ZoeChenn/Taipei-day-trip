let images;
let currentImageIndex = 0;
const currentURL = window.location.href;
const attractionId = currentURL.match(/\/attraction\/(\d+)/)[1];
const radioUp = document.querySelector('.radio-up')
const radioDown = document.querySelector('.radio-down')

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
    console.log(`照片總共有 ${images.length} 張`)
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

// 照片輪播部分
const prevBtn = document.querySelector(".prev");
const nextBtn = document.querySelector(".next");
const dotsContainer = document.querySelector(".dots");
const pictureDiv = document.querySelector(".picture");

function updateSlide() {
  const imgSlides = document.querySelectorAll('.attraction_img');
  const containerWidth = pictureDiv.clientWidth;
  const offset = currentImageIndex * containerWidth * -1;
  console.log(containerWidth)
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
  console.log('currentImageIndex',currentImageIndex)
  if (currentImageIndex > 0) {
    currentImageIndex--;
  } else {
    currentImageIndex = images.length - 1;
  }
  updateSlide();
});

nextBtn.addEventListener("click", () => {
  console.log('currentImageIndex',currentImageIndex)
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
