const urlParams = new URLSearchParams(window.location.search);
const orderNumber = urlParams.get('number');
const orderNumberDiv = document.getElementById('orderNumberDiv');
orderNumberDiv.innerText = `${orderNumber}`;
