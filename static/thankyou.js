import { checkUserLoginStatus } from '/static/modal.js';

const urlParams = new URLSearchParams(window.location.search);
const orderNumber = urlParams.get('number');
const orderNumberDiv = document.getElementById('orderNumberDiv');
orderNumberDiv.innerText = `${orderNumber}`;

document.addEventListener('DOMContentLoaded', async () => {
  const isLoggedIn = await checkUserLoginStatus();
  console.log(orderNumber)
  if (!isLoggedIn || orderNumber === null) {
    window.location.href = '/';
  }
});
