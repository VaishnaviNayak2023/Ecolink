// -------------------------------
// auth.js  (Debuggable / Robust Redirect)
// -------------------------------

// Navbar buttons (homepage)
const navSignUp = document.getElementById("navSignUp");
const navLogin = document.getElementById("navLogin");

// Forms & tabs (register.html)
const signInTab = document.getElementById("signInTab");
const registerTab = document.getElementById("registerTab");
const signInForm = document.getElementById("signInForm");
const registerForm = document.getElementById("registerForm");
const tabsContainer = document.querySelector(".tabs");
const container = document.querySelector(".container");

// Create or reuse an on-page status area for errors/debug
let statusArea = document.getElementById("authStatusArea");
if (!statusArea) {
  statusArea = document.createElement("div");
  statusArea.id = "authStatusArea";
  statusArea.style.color = "#b91c1c"; // red-ish
  statusArea.style.textAlign = "center";
  statusArea.style.marginTop = "0.75rem";
  if (container) container.appendChild(statusArea);
}

// -------------------------------
// Utility Functions
// -------------------------------
function logDebug(...args) {
  console.debug("[auth.js]", ...args);
}

function setStatus(text, isError = true) {
  statusArea.textContent = text;
  statusArea.style.display = text ? "block" : "none";
  statusArea.style.color = isError ? "#b91c1c" : "#14532d";
  logDebug("STATUS:", text);
}

function hideNavbarButtons() {
  if (navSignUp) navSignUp.style.display = "none";
  if (navLogin) navLogin.style.display = "none";
}

function showWelcomeMessage(parent, message) {
  if (!parent) return;
  const existing = parent.querySelector(".ecolink-welcome");
  if (existing) existing.remove();

  const msg = document.createElement("p");
  msg.className = "ecolink-welcome";
  msg.textContent = message;
  msg.style.textAlign = "center";
  msg.style.color = "#14532d";
  msg.style.fontWeight = "600";
  msg.style.marginTop = "1rem";
  parent.appendChild(msg);
}

function hideFormsAndTabs() {
  if (signInForm) signInForm.style.display = "none";
  if (registerForm) registerForm.style.display = "none";
  if (tabsContainer) tabsContainer.style.display = "none";
}

function onLoginSuccess(username = "User") {
  hideNavbarButtons();
  localStorage.setItem("ecolink_logged_in", "true");
  localStorage.setItem("ecolink_username", username);
  if (container) showWelcomeMessage(container, `Welcome, ${username}!`);
}

/**
 * Redirect helper that logs then redirects.
 * Use assign to keep browser history behaved.
 */
function redirectToHomepage() {
  logDebug("Redirecting to homepage.html");
  setStatus("Redirecting to homepage...", false);
  window.location.assign("homepage.html");
}

// -------------------------------
// Persist login on page load
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const loggedIn = localStorage.getItem("ecolink_logged_in");
  const username = localStorage.getItem("ecolink_username") || "User";

  if (loggedIn === "true") {
    hideNavbarButtons();
    const hero = document.querySelector(".hero");
    if (hero) showWelcomeMessage(hero, `Welcome back, ${username}!`);
  }
});

// -------------------------------
// Tab Switching
// -------------------------------
if (signInTab && registerTab) {
  signInTab.addEventListener("click", () => {
    signInTab.classList.add("active");
    registerTab.classList.remove("active");
    signInForm?.classList.add("active");
    registerForm?.classList.remove("active");
    setStatus("", false);
  });

  registerTab.addEventListener("click", () => {
    registerTab.classList.add("active");
    signInTab.classList.remove("active");
    registerForm?.classList.add("active");
    signInForm?.classList.remove("active");
    setStatus("", false);
  });
}

// -------------------------------
// Helper: handle fetch response robustly
// -------------------------------
async function handleAuthResponse(response) {
  logDebug("Fetch response status:", response.status, response.statusText);

  const ct = response.headers.get("content-type") || "";
  logDebug("Content-Type:", ct);

  let text = "";
  try {
    text = await response.text();
  } catch (err) {
    logDebug("Failed to read response text:", err);
  }

  logDebug("Response text (preview):", text.slice(0, 500));

  if (ct.includes("application/json")) {
    try {
      const json = JSON.parse(text);
      logDebug("Parsed JSON response:", json);
      if (json.success || json.ok || json.status === "success") {
        const name = json.username || json.name || json.user || "User";
        return { success: true, username: name, message: json.message || "OK" };
      }
      return { success: false, message: json.message || JSON.stringify(json) };
    } catch (err) {
      logDebug("JSON parse failed:", err);
    }
  }

  const low = (text || "").toLowerCase();
  if (low.includes("registration successful") || low.includes("registered successfully")) {
    return { success: true, username: null, message: text };
  }
  if (low.startsWith("welcome") || low.includes("welcome,")) {
    const match = text.match(/welcome[, ]+\s*(.*?)\s*!/i);
    const username = match ? match[1] : null;
    return { success: true, username, message: text };
  }

  if (response.ok) {
    return { success: true, username: null, message: text || `HTTP ${response.status}` };
  }

  return { success: false, message: text || `HTTP ${response.status}` };
}

// -------------------------------
// Register Form Submission
// -------------------------------
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", false);

    const pass = document.getElementById("password").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (pass !== confirm) {
      setStatus("Passwords do not match!");
      return;
    }

    const fullname = document.getElementById("fullname").value.trim();
    const formData = new FormData(registerForm);
    formData.append("mode", "register");

    try {
      logDebug("Sending register request to auth.php");
      const response = await fetch("../backend/auth.php", {
        method: "POST",
        body: formData,
        credentials: "same-origin"
      });

      const result = await handleAuthResponse(response);

      if (result.success) {
        setStatus("Registration successful. Redirecting...", false);
        hideFormsAndTabs();
        onLoginSuccess(fullname || result.username || "User");
        redirectToHomepage();
      } else {
        setStatus("Registration failed: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("[auth.js] Register error:", error);
      setStatus("Server or network error. Open DevTools → Network to inspect.");
    }
  });
}

// -------------------------------
// Sign-In Form Submission
// -------------------------------
if (signInForm) {
  signInForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("", false);

    const formData = new FormData(signInForm);
    formData.append("mode", "login");

    try {
      logDebug("Sending login request to auth.php");
      const response = await fetch("../backend/auth.php", {
        method: "POST",
        body: formData,
        credentials: "same-origin"
      });

      const result = await handleAuthResponse(response);

      if (result.success) {
        let username = result.username;
        if (!username) {
          const emailInput = document.getElementById("signin-email");
          username = emailInput ? emailInput.value.split("@")[0] : "User";
        }

        setStatus("Login successful. Redirecting...", false);
        hideFormsAndTabs();
        onLoginSuccess(username);
        redirectToHomepage();
      } else {
        setStatus("Login failed: " + (result.message || "Invalid credentials"));
      }
    } catch (error) {
      console.error("[auth.js] Sign-in error:", error);
      setStatus("Server or network error. Open DevTools → Network to inspect.");
    }
  });
}

/* -----------------------
   QUICK TESTS (useful while debugging)
   // redirectToHomepage();
   ----------------------- */