document.addEventListener('DOMContentLoaded', () => {

    // --------------------- DOM ELEMENTS ----------------------
    const body = document.body;
    const darkModeBtn = document.getElementById('dark-mode-btn');
    const lightModeBtn = document.getElementById('light-mode-btn');
    const navItems = document.querySelectorAll('.nav-item');
    const contentViews = document.querySelectorAll('.content-view');

    const incidentTableBody = document.querySelector(".incident-table tbody");
    const userTableBody = document.querySelector(".user-table tbody");

    // Static data removed. Data will now be populated via fetch calls.
    let incidentsData = [];
    let usersData = [];


    // --------------------- 1. THEME SWITCH LOGIC (Unchanged) ----------------------
    function setTheme(isDark) {
        if (isDark) {
            body.classList.add('dark-mode');
            body.classList.remove('light-mode');
            darkModeBtn.classList.add('active');
            lightModeBtn.classList.remove('active');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.add('light-mode');
            body.classList.remove('dark-mode');
            darkModeBtn.classList.remove('active');
            lightModeBtn.classList.add('active');
            localStorage.setItem('theme', 'light');
        }
    }

    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme === 'dark');

    darkModeBtn.addEventListener('click', () => setTheme(true));
    lightModeBtn.addEventListener('click', () => setTheme(false));


    // --------------------- 2. SPA NAVIGATION LOGIC (Modified to fetch on view switch) ----------------------
    function showView(viewId) {
        contentViews.forEach(view => {
            view.classList.remove('active');
            view.classList.add('hidden');
        });

        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            targetView.classList.remove('hidden');
            
            // Re-render data when switching view, fetching from the server
            if (viewId === 'incidents') loadIncidents();
            if (viewId === 'users') loadUsers();
        }

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === viewId) {
                item.classList.add('active');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.getAttribute('data-view');
            showView(viewId);
            window.location.hash = viewId;
        });
    });

    const initialView = window.location.hash ? window.location.hash.substring(1) : 'incidents';
    showView(initialView);


    // --------------------- 3. DATA RENDERING FUNCTIONS ----------------------

    /** Fetches and Renders the incident table rows. */
    async function loadIncidents() {
        try {
            const response = await fetch("dashboard.php?action=get_incidents");
            const result = await response.json();
            
            if (result.success && result.data) {
                incidentsData = result.data; // Update global data array
                renderIncidents(incidentsData);
            } else {
                 console.error("Failed to load incidents:", result.message);
                 incidentTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Failed to load incident data.</td></tr>';
            }
        } catch (error) {
            console.error('Error fetching incidents:', error);
            incidentTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Error connecting to API.</td></tr>';
        }
    }

    /** Fetches and Renders the user table rows. */
    async function loadUsers() {
        try {
            const response = await fetch("dashboard.php?action=get_users");
            const result = await response.json();

            if (result.success && result.data) {
                usersData = result.data; // Update global data array
                renderUsers(usersData);
            } else {
                 console.error("Failed to load users:", result.message);
                 userTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Failed to load user data.</td></tr>';
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            userTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Error connecting to API.</td></tr>';
        }
    }


    /** Renders the incident table rows based on filtered/sorted data. (Unchanged, uses incidentsData) */
    function renderIncidents(data) {
        if (!incidentTableBody) return;
        incidentTableBody.innerHTML = "";

        data.forEach(row => {
            const statusClass = row.status.toLowerCase().replace(/ /g, '-');
            const severityClass = row.severity.toLowerCase();

            incidentTableBody.innerHTML += `
                <tr>
                    <td>${row.id}</td>
                    <td>${row.type}</td>
                    <td>${row.location}</td>
                    <td><span class="tag severity-${severityClass}">${row.severity}</span></td>
                    <td><span class="tag status-${statusClass}">${row.status}</span></td>
                    <td>${row.date}</td>
                    <td class="action-icons">
                        <i class="fas fa-eye view-incident" data-id="${row.id}"></i>
                        <i class="fas fa-edit edit-incident" data-id="${row.id}"></i>
                        <i class="fas fa-trash-alt delete-incident" data-id="${row.id}"></i>
                    </td>
                </tr>
            `;
        });
        // Attach action listeners (view, edit, delete)
        attachActionListeners();
    }

    /** Renders the user table rows based on filtered/sorted data. (Unchanged, uses usersData) */
    function renderUsers(data) {
        if (!userTableBody) return;
        userTableBody.innerHTML = "";

        data.forEach(row => {
            const statusClass = row.status.toLowerCase();
            const avatarSrc = row.avatar || 'placeholder-avatar.png'; // Note: Avatars require image files
            const lastLogin = row.last_login ?? '-';

            userTableBody.innerHTML += `
                <tr>
                    <td><img src="${avatarSrc}" class="avatar"> ${row.name} <span class="user-id">${row.id}</span></td>
                    <td>${row.email}</td>
                    <td>${row.role}</td>
                    <td>${lastLogin}</td>
                    <td><span class="tag user-${statusClass}">${row.status}</span></td>
                    <td class="action-icons">
                        <i class="fas fa-user-edit edit-user" data-id="${row.id}"></i>
                        <i class="fas fa-user-times deactivate-user" data-id="${row.id}"></i>
                    </td>
                </tr>
            `;
        });
    }


    // --------------------- 4. TABLE INTERACTIVITY (Sorting, Filtering) ----------------------

    let currentSort = { column: 'id', direction: 1 }; // 1 for ascending, -1 for descending

    /** Attaches sorting logic to table headers. (Modified to use global data arrays) */
    document.querySelectorAll('.data-table th').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.textContent.split(' ')[0].toLowerCase().trim();
            const table = header.closest('table');
            let data = [];
            let renderer;

            if (table.classList.contains('incident-table')) {
                data = incidentsData;
                renderer = renderIncidents;
            } else if (table.classList.contains('user-table')) {
                data = usersData;
                renderer = renderUsers;
            } else {
                return;
            }

            // Determine sort direction
            if (currentSort.column === column) {
                currentSort.direction = -currentSort.direction;
            } else {
                currentSort.column = column;
                currentSort.direction = 1;
            }

            // Simple sorting function
            data.sort((a, b) => {
                const aVal = a[column] || '';
                const bVal = b[column] || '';

                if (typeof aVal === 'string') {
                    return aVal.localeCompare(bVal) * currentSort.direction;
                }
                return (aVal - bVal) * currentSort.direction;
            });

            // Update UI
            renderer(data);
            updateSortIcons(table, column, currentSort.direction);
        });
    });
    
    /** Updates the sort icon next to the active column header. */
    function updateSortIcons(table, column, direction) {
        table.querySelectorAll('th i.fa-sort, th i.fa-sort-up, th i.fa-sort-down').forEach(icon => {
            icon.classList.remove('fa-sort-up', 'fa-sort-down');
            icon.classList.add('fa-sort');
        });
        
        // Find the active header
        const activeHeader = Array.from(table.querySelectorAll('th')).find(th => 
            th.textContent.toLowerCase().trim().startsWith(column)
        );

        if (activeHeader) {
            const icon = activeHeader.querySelector('i');
            icon.classList.remove('fa-sort');
            icon.classList.add(direction === 1 ? 'fa-sort-up' : 'fa-sort-down');
        }
    }

    // Placeholder for filtering logic (e.g., in Incidents tab)
    document.querySelectorAll('.filter-select').forEach(select => {
        select.addEventListener('change', () => {
            console.log(`Filtering by ${select.value} in category ${select.classList[2]}`);
            // TODO: Implement complex filtering logic on incidentsData/usersData and call renderIncidents/renderUsers
        });
    });


    // --------------------- 5. ACTION LISTENERS (Unchanged) ----------------------

    /** Attaches event listeners for table action icons. */
    function attachActionListeners() {
        // Incident View/Edit/Delete
        document.querySelectorAll('.view-incident').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                alert(`Viewing Incident: ${id}`);
            });
        });
        document.querySelectorAll('.edit-incident').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                alert(`Editing Incident: ${id}`);
            });
        });
        document.querySelectorAll('.delete-incident').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm(`Are you sure you want to delete incident ${id}?`)) {
                    console.log(`Deleting incident ${id}. Rerunning loadIncidents.`);
                    // In a real app: Send DELETE request to server, then reload data.
                    loadIncidents(); 
                }
            });
        });

        // Pagination buttons
        document.querySelectorAll('.page-number').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pageNum = e.target.textContent;
                console.log(`Navigating to page ${pageNum}`);
                // In a real app: Request data for the new page from the server.
                document.querySelectorAll('.page-number').forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }


    // --------------------- 6. SETTINGS VIEW LOGIC (Unchanged) ----------------------

    document.querySelector('.refresh-icon')?.addEventListener('click', () => {
        alert("API Key refreshed successfully (Simulation).");
        // In a real app: Generate new key, update DB, and update input field.
    });

    document.querySelector('.connect-btn')?.addEventListener('click', () => {
        alert("Attempting to connect to external mapping service...");
        // In a real app: Perform API connection test.
    });

    document.querySelector('.save-changes-btn')?.addEventListener('click', () => {
        alert("Settings saved successfully (Simulation).");
        // In a real app: Collect all form data and send PUT request to server.
    });


    // --------------------- 7. INITIAL RENDER (Modified to fetch data) ----------------------
    // Initial fetch for the default view's data
    loadIncidents(); 


    // --------------------- 8. REAL-TIME AUTO REFRESH (Modified to fetch active view data) ----------------------
    let autoRefreshInterval = setInterval(() => {
        const activeView = document.querySelector('.content-view.active');

        if (activeView) {
            if (activeView.id === 'incidents') {
                console.log("Auto-refreshing incidents...");
                loadIncidents();
            } else if (activeView.id === 'users') {
                console.log("Auto-refreshing users...");
                loadUsers();
            }
        }
    }, 30000); // Refresh every 30 seconds

});