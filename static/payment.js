import { apiBookingData } from '/static/booking.js';

TPDirect.setupSDK(137103, 'app_DIQpPqwBHRBuZWv8BaenpET2Jv8SK9uloQPDoX3YMeKGIN4siDmkaxOBv1vi', 'sandbox')
TPDirect.card.setup({
  fields: {
    number: {
      element: '#card-number',
      placeholder: '**** **** **** ****'
    },
    expirationDate: {
        element: '#card-expiration-date',
        placeholder: 'MM / YY'
    },
    ccv: {
        element: '#card-ccv',
        placeholder: 'ccv'
    }
  },
  styles: {
    'input': {
      'font-size': '16px',
      'font-weight': '500',
    },
    ':focus': {
      'color': 'orange'
    },
    '.valid': {
      'color': 'green'
    },
    '.invalid': {
      'color': 'red'
    }
  },
  // 卡號輸入正確後，顯示前六及後四碼
  isMaskCreditCardNumber: true,
  maskCreditCardNumberRange: {
    beginIndex: 6, 
    endIndex: 11
  }
})

TPDirect.card.onUpdate(function (update) {
  const submitButton = document.getElementById('payBtn');
  if (update.canGetPrime) {
    submitButton.removeAttribute('disabled')
  } else {
    submitButton.setAttribute('disabled', true)
  }

  // 判斷輸入欄位狀態錯誤與否：卡片號碼
  if (update.status.number === 2) {
    setNumberFormGroupToError('.card-number-group')
  } else if (update.status.number === 0) {
    setNumberFormGroupToSuccess('.card-number-group')
  } else {
    setNumberFormGroupToNormal('.card-number-group')
  }

  // 判斷輸入欄位狀態錯誤與否：過期時間
  if (update.status.expiry === 2) {
    setNumberFormGroupToError('.expiration-date-group')
  } else if (update.status.expiry === 0) {
    setNumberFormGroupToSuccess('.expiration-date-group')
  } else {
    setNumberFormGroupToNormal('.expiration-date-group')
  }

  // 判斷輸入欄位狀態錯誤與否：驗證密碼
  if (update.status.ccv === 2) {
    setNumberFormGroupToError('.ccv-group')
  } else if (update.status.ccv === 0) {
    setNumberFormGroupToSuccess('.ccv-group')
  } else {
    setNumberFormGroupToNormal('.ccv-group')
  }
})

function setNumberFormGroupToError(selector) {
  $(selector).addClass('has-error')
  $(selector).removeClass('has-success')
}

function setNumberFormGroupToSuccess(selector) {
  $(selector).removeClass('has-error')
  $(selector).addClass('has-success')
}

function setNumberFormGroupToNormal(selector) {
  $(selector).removeClass('has-error')
  $(selector).removeClass('has-success')
}

$(document).on('click', '.payBtn', (e) => {
  e.preventDefault()
  // 取得 TapPay Fields 的 status
  const tappayStatus = TPDirect.card.getTappayFieldsStatus()
  const orderName = document.getElementById('nameInput').value;
  const orderEmail = document.getElementById('emailInput').value;
  const orderTel = document.getElementById('telInput').value;

  // 確認是否可以 getPrime
  if (tappayStatus.canGetPrime === false) {
    console.log('can not get prime')
    return
  }

  // Get prime
  TPDirect.card.getPrime((result) => {
    if (result.status !== 0) {
      console.log('get prime error ' + result.msg)
      return
    }
    console.log('get prime 成功')
    sendPrimeToServer(result.card.prime, orderName, orderEmail, orderTel);
  })
})

async function sendPrimeToServer(prime, orderName, orderEmail, orderTel) {
  const bookingData = await apiBookingData();
  const token = localStorage.getItem('token');
  console.log(orderName, orderEmail, orderTel)
  const requestData = {
    prime: prime,
    order: {
      price: bookingData.price,
      trip: {
        attraction: {
          id: bookingData.attraction.id,
          name: bookingData.attraction.name,
          address: bookingData.attraction.address,
          image: bookingData.attraction.image
        },
        date: bookingData.date,
        time: bookingData.time
      },
      contact: {
        name: orderName,
        email: orderEmail,
        phone: orderTel
      }
    }
  };

  fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  })
  .then(response => response.json())
  .then(data => {
    console.log('Response from server:', data);
    const orderNumber = data.data.number;
    window.location.href = `/thankyou?number=${orderNumber}`;
  })
  .catch(error => {
    console.error('Error sending data to server:', error);
  });
}
