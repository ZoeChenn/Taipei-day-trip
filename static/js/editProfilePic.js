let croppieInstance = null;
const uploadPic = document.getElementById('croppieContainer');
const editIcon = document.getElementById('editIcon');
const editImageModal = document.getElementById('editImageModal');
const editImageClose = document.getElementById('editImageClose');
const confirmCropBtn = document.getElementById('confirmCropBtn');
const profileUrl = document.getElementById('profileUrl');

function initializeCroppie(imageUrl) {
  if (croppieInstance) {
    croppieInstance.destroy();
  }
  croppieInstance = new Croppie( uploadPic, {
    enableExif: true,
    viewport: {
      width: 200,
      height: 200,
    },
    boundary: {
      width: 300,
      height: 300
    },
    showZoomer: true
  });

  croppieInstance.bind({
    url: imageUrl
  });
}

if (editIcon) {
  editIcon.addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
  
    fileInput.addEventListener('change', (e) => {
      const selectedFile = e.target.files[0];
  
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const imageUrl = e.target.result;
          initializeCroppie(imageUrl);
        };
        reader.readAsDataURL(selectedFile);
      }
    });
    const defaultImageUrl = '/static/image/profile.png';
    initializeCroppie(defaultImageUrl);
    editImageModal.style.display = 'block';
  });

  editImageClose.addEventListener('click', () => {
    editImageModal.style.display = 'none';
    if (croppieInstance !== null) {
      croppieInstance.destroy();
      croppieInstance = null;
    }
  });
  
  confirmCropBtn.addEventListener('click', () => {
    croppieInstance.result({
      type: 'canvas',
      size: { width: 200, height: 200 },
      format: 'jpeg',
      quality: 0.85
    }).then((croppedImage) => {
      profileUrl.src = croppedImage;
      editImageModal.style.display = 'none';
      croppieInstance.destroy();
      croppieInstance = null;
    });
  });
}

export function convertBase64ToFile(base64String, filename) {
  const arr = base64String.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}