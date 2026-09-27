const form = document.getElementById('propertyForm');
const fileInput = document.getElementById('imageUpload');
const imageGrid = document.getElementById('imageGrid');
const uploadBox = document.getElementById('uploadBox');
const browseFilesBtn = document.getElementById('browseFilesBtn');
const previewTitle = document.getElementById('previewTitle');
const previewPrice = document.getElementById('previewPrice');
const previewLocation = document.getElementById('previewLocation');
const previewBedrooms = document.getElementById('previewBedrooms');
const previewBathrooms = document.getElementById('previewBathrooms');
const previewAmenities = document.getElementById('previewAmenities');
const submitDialog = document.getElementById('submitDialog');
const cancelSubmitBtn = document.getElementById('cancelSubmitBtn');
const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
const propertyMap = document.getElementById('propertyMap');
const latValue = document.getElementById('latValue');
const lngValue = document.getElementById('lngValue');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');

window.initMap = () => {
  const defaultLat = -1.2858;
  const defaultLng = 36.8162;

  const updateLatLng = (lat, lng) => {
    if (latitudeInput) latitudeInput.value = lat.toFixed(6);
    if (longitudeInput) longitudeInput.value = lng.toFixed(6);
    if (latValue) latValue.textContent = lat.toFixed(6);
    if (lngValue) lngValue.textContent = lng.toFixed(6);
  };

  if (!propertyMap || typeof google === 'undefined') {
    return;
  }

  const map = new google.maps.Map(propertyMap, {
    center: { lat: defaultLat, lng: defaultLng },
    zoom: 14,
    mapTypeControl: false,
    streetViewControl: false,
  });

  const marker = new google.maps.Marker({
    position: { lat: defaultLat, lng: defaultLng },
    map,
    draggable: true,
    title: 'Property location',
  });

  map.addListener('click', (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    marker.setPosition({ lat, lng });
    updateLatLng(lat, lng);
  });

  marker.addListener('dragend', (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    updateLatLng(lat, lng);
  });

  const searchInput = document.getElementById('mapSearch');
  const searchBtn = document.getElementById('searchLocationBtn');
  const geocoder = new google.maps.Geocoder();

  searchBtn?.addEventListener('click', () => {
    const query = searchInput?.value.trim();
    if (!query) return;
    geocoder.geocode({ address: query }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        map.setCenter(location);
        marker.setPosition(location);
        updateLatLng(location.lat(), location.lng());
      }
    });
  });

  updateLatLng(defaultLat, defaultLng);
};

const state = {
  files: [],
  activeImage: null,
};

const formatPrice = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toLocaleString('en-KE') : '0';
};

const updatePreview = () => {
  const title = document.getElementById('title').value || 'Spacious 2 Bedroom Apartment';
  const price = document.getElementById('price').value || '25000';
  const county = document.getElementById('county').value || 'Nairobi';
  const town = document.getElementById('town').value || 'Westlands';
  const bedrooms = document.getElementById('bedrooms').value || '2';
  const bathrooms = document.getElementById('bathrooms').value || '2';
  const amenities = Array.from(document.querySelectorAll('input[name="amenities"]:checked')).map((input) => input.value);

  previewTitle.textContent = title;
  previewPrice.textContent = formatPrice(price);
  previewLocation.textContent = `${town}, ${county}`;
  previewBedrooms.textContent = bedrooms;
  previewBathrooms.textContent = bathrooms;

  previewAmenities.innerHTML = '';
  if (amenities.length) {
    amenities.slice(0, 3).forEach((item) => {
      const chip = document.createElement('span');
      chip.textContent = item;
      previewAmenities.appendChild(chip);
    });
  } else {
    ['Parking', 'Wi-Fi', 'Security'].forEach((item) => {
      const chip = document.createElement('span');
      chip.textContent = item;
      previewAmenities.appendChild(chip);
    });
  }
};

const renderImages = () => {
  imageGrid.innerHTML = '';
  state.files.forEach((file, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'uploaded-image';

    const img = document.createElement('img');
    img.src = file.preview || '/images/default-property.jpg';
    img.alt = `Property photo ${index + 1}`;

    const actions = document.createElement('div');
    actions.className = 'image-actions';

    const badge = document.createElement('span');
    badge.className = 'image-badge';
    badge.textContent = index === 0 ? 'Primary' : 'Image';

    const setPrimary = document.createElement('button');
    setPrimary.type = 'button';
    setPrimary.className = 'primary-toggle';
    setPrimary.textContent = index === 0 ? 'Primary' : 'Set as primary';
    setPrimary.addEventListener('click', () => {
      const [primary] = state.files.splice(index, 1);
      state.files.unshift(primary);
      renderImages();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-image-btn';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      state.files.splice(index, 1);
      renderImages();
    });

    actions.appendChild(badge);
    actions.appendChild(setPrimary);
    actions.appendChild(remove);
    wrapper.appendChild(img);
    wrapper.appendChild(actions);
    imageGrid.appendChild(wrapper);
  });
};

const readFiles = (list) => {
  const selected = Array.from(list || []).filter((file) => file && file.type.startsWith('image/'));
  if (!selected.length) return;

  selected.forEach((file) => {
    const previewUrl = URL.createObjectURL(file);
    state.files.push({ ...file, preview: previewUrl });
  });

  if (fileInput && typeof DataTransfer !== 'undefined') {
    const dataTransfer = new DataTransfer();
    state.files.forEach((item) => dataTransfer.items.add(item));
    fileInput.files = dataTransfer.files;
  }

  renderImages();
  updatePreview();
};

if (browseFilesBtn) {
  browseFilesBtn.addEventListener('click', () => fileInput.click());
}

if (uploadBox) {
  uploadBox.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadBox.style.borderColor = '#1d4ed8';
  });

  uploadBox.addEventListener('dragleave', () => {
    uploadBox.style.borderColor = 'rgba(29,78,216,0.34)';
  });

  uploadBox.addEventListener('drop', (event) => {
    event.preventDefault();
    uploadBox.style.borderColor = 'rgba(29,78,216,0.34)';
    readFiles(event.dataTransfer.files);
  });
}

if (fileInput) {
  fileInput.addEventListener('change', (event) => {
    readFiles(event.target.files);
    fileInput.value = '';
  });
}

const validateField = (fieldName) => {
  const field = document.getElementById(fieldName);
  const error = document.querySelector(`[data-error-for="${fieldName}"]`);

  if (!field || !error) return true;

  if (field.type === 'checkbox') {
    const valid = field.checked;
    error.textContent = valid ? '' : 'Please confirm that the information is accurate.';
    return valid;
  }

  const value = field.value ? field.value.trim() : '';
  let message = '';

  if (fieldName === 'title' && !value) message = 'Please enter the property title.';
  if (fieldName === 'property_type' && !value) message = 'Please select the property type.';
  if (fieldName === 'description' && !value) message = 'Please enter the property description.';
  if (fieldName === 'price' && (!value || Number(value) <= 0)) message = 'Please enter the monthly rent.';
  if (fieldName === 'bedrooms' && (!value || Number(value) < 0)) message = 'Please specify the number of bedrooms.';
  if (fieldName === 'bathrooms' && (!value || Number(value) < 0)) message = 'Please specify the number of bathrooms.';
  if (fieldName === 'county' && !value) message = 'Please select the county.';
  if (fieldName === 'town' && !value) message = 'Please enter the town or area.';
  if (fieldName === 'address' && !value) message = 'Please enter the street address.';
  if (fieldName === 'accuracy_confirmed' && !document.getElementById('accuracy_confirmed').checked) {
    message = 'Please confirm that the information is accurate.';
  }

  error.textContent = message;
  return !message;
};

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const requiredFields = ['title', 'property_type', 'description', 'price', 'bedrooms', 'bathrooms', 'county', 'town', 'address', 'accuracy_confirmed'];
    const errors = requiredFields.filter((field) => !validateField(field));

    if (!state.files.length) {
      const imageError = document.querySelector('[data-error-for="images"]') || document.createElement('small');
      imageError.className = 'error-message';
      imageError.textContent = 'Please upload at least one property image.';
      imageError.setAttribute('data-error-for', 'images');
      const uploadBoxContainer = document.getElementById('uploadBox');
      if (uploadBoxContainer && !uploadBoxContainer.querySelector('[data-error-for="images"]')) {
        uploadBoxContainer.appendChild(imageError);
      }
      errors.push('images');
    }

    if (errors.length) {
      const firstError = document.querySelector('.error-message:not(:empty)');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    submitDialog?.classList.remove('hidden');
  });
}

confirmSubmitBtn?.addEventListener('click', () => {
  submitDialog?.classList.add('hidden');
  form?.submit();
});

cancelSubmitBtn?.addEventListener('click', () => {
  submitDialog?.classList.add('hidden');
});

if (document.getElementById('title')) {
  ['title', 'price', 'county', 'town', 'bedrooms', 'bathrooms'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updatePreview);
    }
  });

  document.querySelectorAll('input[name="amenities"]').forEach((input) => {
    input.addEventListener('change', updatePreview);
  });

  document.querySelectorAll('.amenity-card').forEach((card) => {
    const checkbox = card.querySelector('input');
    if (!checkbox) return;
    card.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
      card.classList.toggle('selected', checkbox.checked);
      updatePreview();
    });
  });
}

mobileMenuBtn?.addEventListener('click', () => {
  sidebar?.classList.toggle('open');
});

window.addEventListener('load', window.initMap);
updatePreview();
