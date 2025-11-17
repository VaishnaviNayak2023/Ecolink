/* ============================================================
   Fixed guidedreport.js
   - Leaflet map (search via Nominatim)
   - Category selection enforced
   - Dynamic review population + small review-map
   - File preview
   - Submit via AJAX to guidedreport.php (JSON expected)
   ============================================================ */

(() => {
  // --- Step / Sidebar helpers
  const steps = document.querySelectorAll('.step-section');
  const sidebarSteps = document.querySelectorAll('.steps li');
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');

  function goToStep(step) {
    steps.forEach((s, i) => s.classList.toggle('active', i === step - 1));
    sidebarSteps.forEach((li, i) => {
      li.classList.toggle('active', i === step - 1);
      li.classList.toggle('completed', i < step - 1);
    });
    const percent = (step / steps.length) * 100;
    progressBar.style.width = percent + '%';
    progressLabel.textContent = `${step} of ${steps.length}`;

    // refresh map sizes if needed
    if (step === 2 && window.leafletMap) {
      setTimeout(() => window.leafletMap.invalidateSize(), 250);
    }

    // when entering review, update the review and render map
    if (step === 6) {
      updateReview();
      renderReviewMap();
    }
  }

  // --- Step Buttons wiring
  document.getElementById('toStep2').addEventListener('click', () => goToStep(2));
  document.getElementById('backToStep1').addEventListener('click', () => goToStep(1));
  document.getElementById('toStep3').addEventListener('click', () => goToStep(3));
  document.getElementById('backToStep2').addEventListener('click', () => goToStep(2));
  document.getElementById('toStep4').addEventListener('click', () => goToStep(4));
  document.getElementById('backToStep3').addEventListener('click', () => goToStep(3));
  document.getElementById('toStep5').addEventListener('click', () => goToStep(5));
  document.getElementById('backToStep4').addEventListener('click', () => goToStep(4));
  document.getElementById('toStep6').addEventListener('click', () => {
    // ensure reporter info required fields exist
    const name = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    if (!name || !email) {
      alert('Please provide your name and email in Reporter Information before proceeding.');
      goToStep(5);
      return;
    }
    goToStep(6);
  });
  document.getElementById('backToStep5').addEventListener('click', () => goToStep(5));

  // --- Category selection (Step 1)
  const categoryCards = document.querySelectorAll('.category-grid .card');
  const buttonToStep2 = document.getElementById('toStep2');
  let selectedCategory = null;

  // initialize continue disabled until selection
  buttonToStep2.classList.add('disabled');

  categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      categoryCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCategory = card.getAttribute('data-category');
      buttonToStep2.classList.remove('disabled');
    });
  });

  // override step2 transfer: ensure category chosen
  buttonToStep2.addEventListener('click', (e) => {
    if (!selectedCategory) {
      alert('Please select an incident category before continuing.');
      e.preventDefault();
      return;
    }
    goToStep(2);
  });

  // --- Character counter for details
  const detailsText = document.getElementById('details');
  const charCount = document.getElementById('charCount');
  if (detailsText && charCount) {
    detailsText.addEventListener('input', () => {
      charCount.textContent = `${detailsText.value.length} / 1000`;
    });
  }

  // --- File upload preview
  const fileUpload = document.getElementById('fileUpload');
  const fileList = document.getElementById('fileList');

  if (fileUpload && fileList) {
    fileUpload.addEventListener('change', () => {
      fileList.innerHTML = '';
      const files = Array.from(fileUpload.files || []);
      files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
        fileList.appendChild(item);
      });
    });
  }

  // --- Leaflet map init (Step 2)
  const latField = document.getElementById('latitude');
  const lngField = document.getElementById('longitude');
  const searchAddress = document.getElementById('searchAddress');
  const useLocationBtn = document.getElementById('useLocationBtn');

  // default view: Manila as in your original (14.5995, 120.9842)
  const defaultLat = 14.5995;
  const defaultLng = 120.9842;
  const defaultZoom = 12;

  const leafletMap = L.map('map').setView([defaultLat, defaultLng], defaultZoom);
  window.leafletMap = leafletMap;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(leafletMap);

  // draggable marker
  let marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(leafletMap);
  // populate lat/lng initially
  latField.value = defaultLat.toFixed(6);
  lngField.value = defaultLng.toFixed(6);

  marker.on('dragend', () => {
    const pos = marker.getLatLng();
    latField.value = pos.lat.toFixed(6);
    lngField.value = pos.lng.toFixed(6);
  });

  // Nominatim geocoding
  async function geocode(query) {
    if (!query) return alert('Please enter an address to search.');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (!data || data.length === 0) {
        alert('Location not found.');
        return;
      }
      const { lat, lon } = data[0];
      leafletMap.setView([lat, lon], 15);
      marker.setLatLng([lat, lon]);
      latField.value = parseFloat(lat).toFixed(6);
      lngField.value = parseFloat(lon).toFixed(6);
    } catch (err) {
      console.error(err);
      alert('Error searching location.');
    }
  }

  // search on Enter or on change
  searchAddress.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      geocode(searchAddress.value.trim());
    }
  });

  // use current location
  useLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported.');
      return;
    }
    useLocationBtn.textContent = 'Locating...';
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      leafletMap.setView([latitude, longitude], 16);
      marker.setLatLng([latitude, longitude]);
      latField.value = latitude.toFixed(6);
      lngField.value = longitude.toFixed(6);
      useLocationBtn.textContent = 'Use my current location';
    }, (err) => {
      console.warn(err);
      alert('Unable to retrieve your location.');
      useLocationBtn.textContent = 'Use my current location';
    });
  });

  // --- REVIEW population
  function getSelectedImpacts() {
    const checked = document.querySelectorAll("input[name='impacts[]']:checked");
    const arr = Array.from(checked).map(i => i.value);
    // include otherImpacts if provided
    const other = (document.getElementById('otherImpacts').value || '').trim();
    if (other) arr.push(other);
    return arr;
  }

  function updateReview() {
    // Category
    document.getElementById('review-category').textContent = selectedCategory || '—';

    // Location
    const lat = latField.value || '—';
    const lng = lngField.value || '—';
    document.getElementById('review-location').textContent = `${lat}, ${lng}`;
    document.getElementById('review-landmark').textContent = document.getElementById('landmark').value || '—';

    // Details
    document.getElementById('review-impacts').textContent = getSelectedImpacts().join(', ') || '—';
    document.getElementById('review-description').textContent = (document.getElementById('details').value || '—');
    document.getElementById('review-severity').textContent = (document.getElementById('severity').value || '—');
    const dateVal = document.getElementById('date').value || '';
    const timeVal = document.getElementById('time').value || '';
    document.getElementById('review-datetime').textContent = (dateVal || timeVal) ? `${dateVal} ${timeVal}`.trim() : '—';

    // Files
    const files = Array.from(fileUpload.files || []);
    document.getElementById('review-files-count').textContent = files.length;
    const filesListEl = document.getElementById('review-files-list');
    filesListEl.innerHTML = '';
    files.forEach(f => {
      const d = document.createElement('div');
      d.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
      filesListEl.appendChild(d);
    });

    // Reporter
    document.getElementById('review-name').textContent = document.getElementById('fullname').value || '—';
    document.getElementById('review-email').textContent = document.getElementById('email').value || '—';
    document.getElementById('review-phone').textContent = document.getElementById('phone').value || '—';
  }

  // --- Review map: render small map with marker at chosen coords
  let reviewMap, reviewMapMarker;
  function renderReviewMap() {
    const lat = parseFloat(latField.value) || defaultLat;
    const lng = parseFloat(lngField.value) || defaultLng;

    // create map only once
    if (!reviewMap) {
      reviewMap = L.map('reviewMap', { scrollWheelZoom: false, attributionControl: false }).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(reviewMap);
      reviewMapMarker = L.marker([lat, lng]).addTo(reviewMap);
    } else {
      reviewMap.setView([lat, lng], 13);
      reviewMapMarker.setLatLng([lat, lng]);
      reviewMap.invalidateSize();
    }
  }

  // --- Accordion simple toggle
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      item.classList.toggle('active');
      const arrow = header.querySelector('.arrow');
      arrow.textContent = item.classList.contains('active') ? '⌄' : '›';
    });
  });

  // --- Submit logic (AJAX)
  document.getElementById('submitReport').addEventListener('click', async () => {
    const confirmChecked = document.getElementById('confirmCheckbox').checked;
    if (!confirmChecked) {
      alert('Please confirm the accuracy of your report before submitting.');
      return;
    }

    // validate minimal required fields
    if (!selectedCategory) { alert('Category required.'); goToStep(1); return; }
    if (!latField.value || !lngField.value) { alert('Please select a location.'); goToStep(2); return; }
    if (!document.getElementById('details').value.trim()) { alert('Please add a description in Details.'); goToStep(3); return; }
    if (!document.getElementById('fullname').value.trim() || !document.getElementById('email').value.trim()) {
      alert('Please provide reporter name and email.'); goToStep(5); return;
    }

    const formData = new FormData();
    formData.append('category', selectedCategory);
    formData.append('latitude', latField.value);
    formData.append('longitude', lngField.value);
    formData.append('landmark', document.getElementById('landmark').value || '');
    getSelectedImpacts().forEach(imp => formData.append('impacts[]', imp));
    formData.append('otherImpacts', document.getElementById('otherImpacts').value || '');
    formData.append('details', document.getElementById('details').value || '');
    formData.append('severity', document.getElementById('severity').value || '');
    formData.append('date', document.getElementById('date').value || '');
    formData.append('time', document.getElementById('time').value || '');
    formData.append('fullname', document.getElementById('fullname').value || '');
    formData.append('email', document.getElementById('email').value || '');
    formData.append('phone', document.getElementById('phone').value || '');

    // append files
    Array.from(fileUpload.files || []).forEach(file => {
      formData.append('evidence[]', file);
    });

    // show loading message
    const resultEl = document.getElementById('submitResult');
    resultEl.innerHTML = 'Submitting...';

    try {
      const r = await fetch('guidedreport.php', {
        method: 'POST',
        body: formData
      });
      const json = await r.json();
      if (json.success) {
        resultEl.innerHTML = `<div class="success-box">${json.message || 'Report submitted successfully.'}
            ${json.report_id ? `<div><strong>Report ID:</strong> ${json.report_id}</div>` : ''}</div>`;
        // optionally clear form or move to a 'done' state
        // reset UI (but keep uploaded files visible in case)
      } else {
        resultEl.innerHTML = `<div class="error-box">Submission failed: ${json.message || 'Unknown error'}</div>`;
        // show field errors if any
        if (json.errors) {
          console.warn('Validation errors:', json.errors);
        }
      }
    } catch (err) {
      console.error(err);
      resultEl.innerHTML = `<div class="error-box">Network or server error while submitting.</div>`;
    }
  });

  // initialize to step 1
  goToStep(1);
})();
