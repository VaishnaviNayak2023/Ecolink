document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('report-form');
    const fileUpload = document.getElementById('file-upload');
    const fileDropArea = document.getElementById('file-drop-area');
    const fileList = document.getElementById('file-list');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const categoryInput = document.getElementById('category');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const currentLocationText = document.getElementById('current-location-text');

    // --- 1. LEAFLET MAP INITIALIZATION AND LOCATION ---
    
    const DEFAULT_LAT = 34.0522; // Default to Los Angeles
    const DEFAULT_LNG = -118.2437; 
    const INITIAL_ZOOM = 13;

    // Initialize Map
    const map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], INITIAL_ZOOM);

    // Add Tile Layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Create a marker for the incident location
    let incidentMarker = L.marker([DEFAULT_LAT, DEFAULT_LNG]).addTo(map);

    // Function to update the marker and hidden fields
    const updateLocation = (lat, lng) => {
        latitudeInput.value = lat;
        longitudeInput.value = lng;
        incidentMarker.setLatLng([lat, lng]);
        map.setView([lat, lng], map.getZoom());
    };
    
    // Handle map click to set a new location
    map.on('click', (e) => {
        updateLocation(e.latlng.lat, e.latlng.lng);
        currentLocationText.textContent = `Manual Location Set: Lat ${e.latlng.lat.toFixed(5)}, Lng ${e.latlng.lng.toFixed(5)}`;
    });

    // Get User's Current Location (Geolocation API)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            updateLocation(lat, lng);
            currentLocationText.textContent = 'Current Location Detected (Click map to adjust)';
        }, (error) => {
            console.error('Geolocation failed:', error);
            currentLocationText.textContent = 'Could not detect current location. Please click on the map.';
            updateLocation(DEFAULT_LAT, DEFAULT_LNG); 
        });
    } else {
        currentLocationText.textContent = 'Geolocation not supported by browser. Please click on the map.';
        updateLocation(DEFAULT_LAT, DEFAULT_LNG);
    }
    
    // --- 2. FILE UPLOAD HANDLING ---

    let selectedFiles = []; 
    const MAX_FILE_SIZE_MB = 10;
    const SUPPORTED_MIMES = {
        'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/gif': 'GIF',
        'video/mp4': 'MP4', 'video/quicktime': 'MOV',
        'application/pdf': 'PDF'
    };

    const renderFileList = () => {
        fileList.innerHTML = ''; 
        if (selectedFiles.length === 0) {
            fileList.innerHTML = '<p style="color: #6c757d; font-size: 0.9em;">No files selected.</p>';
            return;
        }

        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.classList.add('file-item');
            
            let iconClass = 'far fa-file';
            if (file.type.startsWith('image')) iconClass = 'far fa-image';
            else if (file.type.startsWith('video')) iconClass = 'far fa-video';
            else if (file.type.includes('pdf')) iconClass = 'far fa-file-pdf';
            
            fileItem.innerHTML = `
                <i class="${iconClass}"></i>
                <span>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                <i class="fas fa-times remove-file" data-index="${index}"></i>
            `;
            fileList.appendChild(fileItem);
        });
        
        document.querySelectorAll('.remove-file').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.target.dataset.index);
                selectedFiles.splice(indexToRemove, 1);
                renderFileList();
            });
        });
    };

    const handleFiles = (files) => {
        Array.from(files).forEach(file => {
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                 alert(`File ${file.name} is too large (max ${MAX_FILE_SIZE_MB}MB).`);
                 return;
            }
            if (!SUPPORTED_MIMES[file.type] && !Object.keys(SUPPORTED_MIMES).some(mime => file.type.startsWith(mime.split('/')[0]))) {
                 // Basic type check fallback
                 alert(`File ${file.name} has an unsupported format.`);
                 return;
            }
            selectedFiles.push(file);
        });
        renderFileList();
    };

    // File input change handler
    fileUpload.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileUpload.value = null; 
    });
    
    // Drag and drop handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, () => {
            fileDropArea.classList.add('highlight');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileDropArea.addEventListener(eventName, () => {
            fileDropArea.classList.remove('highlight');
        }, false);
    });

    fileDropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        handleFiles(dt.files);
    }, false);


    // --- 3. CATEGORY SELECTION ---

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            categoryInput.value = button.dataset.category;
        });
    });
    
    // --- 4. FORM SUBMISSION ---

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        // 1. Validation
        if (!categoryInput.value) {
            alert('Please select an incident category.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
            return;
        }
        if (selectedFiles.length === 0 && !document.getElementById('description').value.trim()) {
            alert('A report requires either a description or at least one file/photo.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
            return;
        }

        // 2. Collect form data
        const formData = new FormData();
        formData.append('description', document.getElementById('description').value);
        formData.append('category', categoryInput.value);
        formData.append('latitude', latitudeInput.value);
        formData.append('longitude', longitudeInput.value);
        
        selectedFiles.forEach(file => {
             formData.append('evidence[]', file, file.name);
        });

        // 3. Send data to PHP script
        try {
            const response = await fetch('quickreport_submit.php', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                alert(`✅ Success! Report submitted successfully. Incident ID: ${result.incident_id}`);
                // Reset form fields and state
                form.reset(); 
                selectedFiles = []; 
                renderFileList(); 
                categoryButtons.forEach(btn => btn.classList.remove('selected'));
                // You might want to reset the map marker to default location here too
            } else {
                alert(`❌ Submission Failed: ${result.message || 'An unknown server error occurred.'}`);
            }

        } catch (error) {
            console.error('Submission Error:', error);
            alert('A network error occurred. Check your connection or XAMPP status.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
        }
    });
    
    // --- 5. RESET/CANCEL BUTTONS ---
    document.querySelector('.btn-reset').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all fields?')) {
            form.reset();
            selectedFiles = [];
            renderFileList();
            categoryButtons.forEach(btn => btn.classList.remove('selected'));
            // Optionally, reset the map marker to default coordinates
            // updateLocation(DEFAULT_LAT, DEFAULT_LNG); 
        }
    });

    document.querySelector('.btn-cancel').addEventListener('click', () => {
         if (confirm('Are you sure you want to cancel and go back to the homepage?')) {
             window.location.href = 'homepage.html';
         }
    });

    renderFileList(); // Initial rendering
});