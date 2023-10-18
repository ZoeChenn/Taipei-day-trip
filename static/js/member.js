import { convertBase64ToFile } from '/static/js/editProfilePic.js';

export async function apiMemberData() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/user/history', {
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

export function renderMemberData(data) {
  const memberName = document.getElementById('nameInput');
  const memberTel = document.getElementById('telInput');
  const profileUrl = document.getElementById('profileUrl');
  const historyOrderList = document.querySelector('.historyOrderList');
  
  if (!data || !data[0]) {
    historyOrderList.innerHTML = '<p class="history_message">目前沒有任何歷史行程。</p>';
    return;
  }
  
  memberName.value = data.name;
  memberTel.value = data.phone || '';
  profileUrl.src = data.profileUrl || '/static/image/profile.png';
  
  let historyContent = '';
  
  for (const key in data) {
    if (key !== 'name' && key !== 'tel') {
      const orderData = data[key];

      if (orderData && orderData.attraction) {
        const { attraction, creation_time, number, date, time, price, contact_name, contact_email, contact_tel } = orderData;
        let timeShower;
        
        if (time === 'morning') {
          timeShower = '早上 9 點到下午 4 點';
        } else if (time === 'afternoon') {
          timeShower = '下午 4 點到晚上 9 點';
        }
  
        historyContent += `
        <div class="warp">
        <div class="historyOrder_picture">
        <img src="${attraction.image}" alt="" class="pictureUrl">
        </div>
        <div class="historyOrder_detail">
        <div class="historyOrder_title">
        <h3>訂單編號：</h3><span class="orderNumber">${number}</span>
        <br>
        <h3>成立時間：</h3><span class="CreateDate">${creation_time}</span>
        <br>
        <h3>景點名稱：</h3><span class="name">${attraction.name}</span>
        <br>
        <h3>地點：</h3><span class="address">${attraction.address}</span>
        <br>
        <h3>旅遊日：</h3><span class="date">${date}</span>
        <br>
        <h3>時間：</h3><span class="time">${timeShower}</span>
        <br>
        <h3>費用：</h3><span class="price">新台幣 ${price} 元</span>
        </div>
        <div class="historyOrder_contact">
        <h3>聯絡人：</h3><span class="price">${contact_name}</span>
        <br>
        <h3>聯絡信箱：</h3><span class="price">${contact_email}</span>
        <br>
        <h3>聯絡電話：</h3><span class="price">${contact_tel}</span>
        </div>
        </div>
        </div>
        `;
      }
    }
  }
  historyOrderList.innerHTML = historyContent;
}

const saveProfileBtn = document.getElementById('saveProfileBtn');
if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const name = document.getElementById('nameInput').value;
    const phone = document.getElementById('telInput').value;
    const fileName = document.getElementById('fileInput').files[0].name;
    const croppedImageBase64 = document.getElementById('profileUrl').src;
    const croppedImageFile = convertBase64ToFile(croppedImageBase64, fileName)
  
    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('croppedImage', croppedImageFile);
  
    fetch('/api/user/member', {
      method: 'POST',
      headers: {
        'Authorization': token,
      },
      body: formData,
    })
    .then(response => response.json())
    .then(data => {
      const updateMessage = document.getElementById('updateMessage');
      if (data.error) {
        updateMessage.innerText = data.message;
      } else {
        updateMessage.innerText = '更新成功';
      }
    })
    .catch(error => {
      alert("發生錯誤：" + error);
      console.error('upload error:', error);
    });
  });
}
