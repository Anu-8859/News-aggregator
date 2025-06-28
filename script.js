<<<<<<< HEAD
const firebaseConfig = {
  apiKey: "AIzaSyAiZ70OtqMTTBhFjGj5LkTiEXAHHhhDxyI", // Your Firebase API Key
  authDomain: "newsaggregator-24357.firebaseapp.com",
  projectId: "newsaggregator-24357",
  storageBucket: "newsaggregator-24357.firebasestorage.app",
  messagingSenderId: "1067300193784",
  appId: "1:1067300193784:web:b888c4fed042fb4d7a420d"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Global Variables ---
const NEWS_API_KEY = "cfc7208f687749cb885a0543a8442629"; // Your NewsAPI Key
let currentPage = 1;
let currentCategory = 'general';
let currentSearchQuery = '';

// --- UI Element References ---
const authSection = document.getElementById("authSection");
const mainContent = document.getElementById("mainContent");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const signupNameInput = document.getElementById("signupName");
const signupEmailInput = document.getElementById("signupEmail");
const signupPasswordInput = document.getElementById("signupPassword");
const welcomeMsg = document.getElementById("welcomeMsg");
const newsContainer = document.getElementById("newsContainer");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const searchInput = document.getElementById("searchInput");

// --- Helper Functions ---

/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} type - Type of toast (influences color).
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Trigger reflow to ensure animation plays
    void toast.offsetWidth;

    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000); // Hide after 3 seconds
}

/**
 * Displays an error message next to an input field.
 * @param {string} elementId - ID of the input element.
 * @param {string} message - The error message.
 */
function displayError(elementId, message) {
    const errorElement = document.getElementById(`${elementId}Error`);
    if (errorElement) {
        errorElement.textContent = message;
        document.getElementById(elementId).classList.add('input-error');
    }
}

/**
 * Clears an error message for an input field.
 * @param {string} elementId - ID of the input element.
 */
function clearError(elementId) {
    const errorElement = document.getElementById(`${elementId}Error`);
    if (errorElement) {
        errorElement.textContent = '';
        document.getElementById(elementId).classList.remove('input-error');
    }
}

/**
 * Clears all error messages on the current form.
 */
function clearAllErrors() {
    clearError('loginEmail');
    clearError('loginPassword');
    clearError('signupName');
    clearError('signupEmail');
    clearError('signupPassword');
}

/**
 * Toggles the visibility of a password input field.
 * @param {string} inputId - The ID of the password input field.
 */
function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleBtn = passwordInput.nextElementSibling; // Assuming toggle button is immediate sibling

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

/**
 * Toggles between login and signup forms.
 * @param {'login'|'signup'} mode - The form to show.
 */
function toggleAuthMode(mode) {
    clearAllErrors();
    loginEmailInput.value = '';
    loginPasswordInput.value = '';
    signupNameInput.value = '';
    signupEmailInput.value = '';
    signupPasswordInput.value = '';

    if (mode === 'login') {
        loginForm.style.display = "block";
        signupForm.style.display = "none";
    } else { // signup
        loginForm.style.display = "none";
        signupForm.style.display = "block";
    }
}

/**
 * Sets button loading state.
 * @param {HTMLButtonElement} button - The button element.
 * @param {boolean} isLoading - True to show loading, false to revert.
 * @param {string} originalText - The original text of the button.
 */
function setButtonLoading(button, isLoading, originalText = '') {
    if (isLoading) {
        button.textContent = 'Loading...';
        button.disabled = true;
        button.style.cursor = 'not-allowed';
    } else {
        button.textContent = originalText;
        button.disabled = false;
        button.style.cursor = 'pointer';
    }
}

// --- Firebase Authentication ---

auth.onAuthStateChanged(user => {
  if (user) {
    authSection.style.display = "none";
    mainContent.style.display = "block";
    db.collection("users").doc(user.uid).get().then(doc => {
      const name = doc.exists && doc.data().name ? doc.data().name : user.email.split('@')[0]; // Use first part of email if no name
      welcomeMsg.textContent = `Welcome, ${name}!`;
    }).catch(error => {
        console.error("Error fetching user data:", error);
        welcomeMsg.textContent = `Welcome, ${user.email.split('@')[0]}!`;
    });
    fetchNews(currentCategory); // Fetch initial news for logged-in user
  } else {
    authSection.style.display = "flex"; // Use flex to center the auth card
    mainContent.style.display = "none";
    toggleAuthMode('login'); // Ensure login form is shown on logout
  }
});

async function signup() {
  clearAllErrors();
  const name = signupNameInput.value.trim();
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value.trim();
  const signupBtn = signupForm.querySelector('button');

  if (!name) { displayError('signupName', "Full Name is required."); return; }
  if (!email || !/\S+@\S+\.\S+/.test(email)) { displayError('signupEmail', "Please enter a valid email."); return; }
  if (!password || password.length < 6) { displayError('signupPassword', "Password must be at least 6 characters."); return; }

  setButtonLoading(signupBtn, true, 'Signup');

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection("users").doc(cred.user.uid).set({ name, email });
    showToast("Signup successful! You are now logged in.", 'success');
  } catch (err) {
    console.error("Signup error:", err);
    if (err.code === 'auth/email-already-in-use') {
        displayError('signupEmail', "This email is already in use.");
    } else if (err.code === 'auth/invalid-email') {
        displayError('signupEmail', "Invalid email format.");
    } else if (err.code === 'auth/weak-password') {
        displayError('signupPassword', "Password is too weak.");
    } else {
        showToast(`Signup failed: ${err.message}`, 'error');
    }
  } finally {
    setButtonLoading(signupBtn, false, 'Signup');
  }
}

async function login() {
  clearAllErrors();
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value.trim();
  const loginBtn = loginForm.querySelector('button:not(.social-btn)'); // Select the regular login button

  if (!email) { displayError('loginEmail', "Email is required."); return; }
  if (!password) { displayError('loginPassword', "Password is required."); return; }

  setButtonLoading(loginBtn, true, 'Login');

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast("Login successful!", 'success');
  } catch (err) {
    console.error("Login error:", err);
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        showToast("Invalid email or password.", 'error');
        displayError('loginEmail', "Invalid credentials.");
        displayError('loginPassword', "Invalid credentials.");
    } else if (err.code === 'auth/invalid-email') {
        displayError('loginEmail', "Invalid email format.");
    } else {
        showToast(`Login failed: ${err.message}`, 'error');
    }
  } finally {
    setButtonLoading(loginBtn, false, 'Login');
  }
}

async function logout() {
  try {
    await auth.signOut();
    showToast("Logged out successfully.", 'info');
  } catch (err) {
    console.error("Logout error:", err);
    showToast(`Logout failed: ${err.message}`, 'error');
  }
}

async function forgotPassword() {
    clearAllErrors();
    const email = loginEmailInput.value.trim(); // Use the login email input

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        displayError('loginEmail', "Please enter a valid email to reset password.");
        return;
    }
    
    // Temporarily disable the input and link to prevent multiple clicks
    loginEmailInput.disabled = true;
    const forgotLink = document.querySelector('.forgot-password-link');
    forgotLink.style.pointerEvents = 'none';
    forgotLink.textContent = 'Sending...';

    try {
        await auth.sendPasswordResetEmail(email);
        showToast("Password reset email sent! Check your inbox.", 'success');
        loginEmailInput.value = ''; // Clear email after sending
    } catch (err) {
        console.error("Forgot password error:", err);
        if (err.code === 'auth/user-not-found') {
            displayError('loginEmail', "No user found with this email.");
        } else {
            showToast(`Password reset failed: ${err.message}`, 'error');
        }
    } finally {
        loginEmailInput.disabled = false;
        forgotLink.style.pointerEvents = 'auto';
        forgotLink.textContent = 'Forgot Password?';
    }
}

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        // Check if user data exists in Firestore, if not, create it
        const userDocRef = db.collection("users").doc(user.uid);
        const doc = await userDocRef.get();
        if (!doc.exists) {
            await userDocRef.set({ name: user.displayName || user.email, email: user.email });
        }
        showToast("Logged in with Google!", 'success');
    } catch (error) {
        console.error("Google sign-in error:", error);
        // Handle specific errors for user feedback
        if (error.code === 'auth/popup-closed-by-user') {
            showToast("Google sign-in cancelled.", 'info');
        } else if (error.code === 'auth/cancelled-popup-request') {
             showToast("Popup already opened. Please complete or close existing one.", 'info');
        } else {
            showToast(`Google sign-in failed: ${error.message}`, 'error');
        }
    }
}


// --- Theme Toggle ---
document.getElementById("toggleTheme").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  // Save preference to localStorage
  if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem('theme', 'dark');
  } else {
      localStorage.setItem('theme', 'light');
  }
});

// Load theme preference on start
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
    // Set initial auth form to login
    toggleAuthMode('login');
});


// --- News Fetching & Display ---

async function fetchNews(category = 'general', page = 1, query = '') {
  currentCategory = category;
  currentPage = page;
  currentSearchQuery = query;

  let url;
  if (query) {
    url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=relevancy&page=${page}&apiKey=${NEWS_API_KEY}`;
  } else {
    url = `https://newsapi.org/v2/top-headlines?country=us&category=${category}&page=${page}&apiKey=${NEWS_API_KEY}`;
  }

  // Show loading indicator
  if (page === 1) { // Only show "Loading..." text for initial fetch/new category/new search
    newsContainer.innerHTML = "<p>Loading news...</p>";
    loadMoreBtn.style.display = 'none';
  } else { // For subsequent "Load More"
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'error') {
        console.error("News API Error:", data.code, data.message);
        newsContainer.innerHTML = `<p>Error loading news: ${data.message}</p>`;
        showToast(`Failed to load news: ${data.message}`, 'error');
        return;
    }

    if (data.articles.length === 0) {
        if (page === 1) {
            newsContainer.innerHTML = "<p>No news found for this selection.</p>";
        } else {
            showToast("No more news to load.", 'info');
        }
        loadMoreBtn.style.display = 'none';
        return;
    }

    // Append news for "Load More", otherwise replace
    if (page === 1) {
        newsContainer.innerHTML = "";
    }
    showNews(data.articles);

    // Show Load More button if there might be more pages
    if (data.totalResults > (currentPage * 20)) { // NewsAPI default page size is 20
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }

  } catch (error) {
    console.error("Error fetching news:", error);
    newsContainer.innerHTML = "<p>Error loading news. Please try again later.</p>";
    showToast("Failed to fetch news. Check your internet connection.", 'error');
  } finally {
      loadMoreBtn.textContent = 'Load More';
      loadMoreBtn.disabled = false;
  }
}

function showNews(articles) {
  articles.forEach(article => {
    // Basic fake news heuristic
    const isFake = article.title?.toLowerCase().includes("shocking") || article.title?.toLowerCase().includes("you won't believe") || article.title?.toLowerCase().includes("hoax");

    const card = document.createElement("div");
    card.className = "news-card";
    card.innerHTML = `
      <img src="${article.urlToImage || 'https://via.placeholder.com/320x190/f0f0f0/cccccc?text=No+Image'}" alt="${article.title || 'News Image'}" loading="lazy" />
      <h3>${article.title || 'No Title Available'}</h3>
      <p>${article.description || 'No description available for this article.'}</p>
      ${article.source && article.source.name ? `<p style="font-size:0.8em; color:#888;">Source: ${article.source.name}</p>` : ''}
      ${isFake ? "<p class='fake-news-warning'>⚠️ May be sensational/fake news!</p>" : ""}
      <div class="card-footer">
        <button onclick="window.open('${article.url}', '_blank')">Read More</button>
        <button onclick='speak("${article.description?.replace(/["']/g, "") || article.title?.replace(/["']/g, "") || "No text to speak."}")'>🔈</button>
        <button onclick='saveBookmark(${JSON.stringify(article).replace(/'/g, "\\'")})'>🔖</button>
      </div>
    `;
    newsContainer.appendChild(card);
  });
}

function speak(text) {
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        showToast("Speech synthesis failed.", 'error');
    };
    speechSynthesis.speak(utter);
  } else {
    showToast("Text-to-speech not supported in your browser.", 'info');
  }
}

async function saveBookmark(article) {
  const user = firebase.auth().currentUser;
  if (!user) {
    showToast("Please login to save news!", 'info');
    return;
  }

  // Check if article is already bookmarked to prevent duplicates
  const existingBookmark = await db.collection("bookmarks")
    .where("userId", "==", user.uid)
    .where("url", "==", article.url)
    .get();

  if (!existingBookmark.empty) {
    showToast("Article already bookmarked!", 'info');
    return;
  }

  try {
    await db.collection("bookmarks").add({
      userId: user.uid,
      title: article.title || 'No Title',
      url: article.url,
      description: article.description || 'No description.',
      urlToImage: article.urlToImage || '',
      bookmarkedAt: firebase.firestore.FieldValue.serverTimestamp() // Timestamp for sorting
    });
    showToast("Article saved to bookmarks!", 'success');
  } catch (error) {
    console.error("Error saving bookmark:", error);
    showToast(`Failed to save bookmark: ${error.message}`, 'error');
  }
}

async function showBookmarks() {
  const user = firebase.auth().currentUser;
  if (!user) {
    showToast("Please login to view bookmarks!", 'info');
    return;
  }

  newsContainer.innerHTML = "<p>Loading bookmarks...</p>";
  loadMoreBtn.style.display = 'none'; // Bookmarks won't have "load more"

  try {
    const snapshot = await db.collection("bookmarks")
      .where("userId", "==", user.uid)
      .orderBy("bookmarkedAt", "desc") // Order by newest bookmarks first
      .get();

    const articles = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })); // Include doc.id for potential delete

    if (articles.length === 0) {
        newsContainer.innerHTML = "<p>You have no bookmarks yet.</p>";
        showToast("No bookmarks found.", 'info');
        return;
    }

    newsContainer.innerHTML = ""; // Clear existing news
    articles.forEach(article => {
        const card = document.createElement("div");
        card.className = "news-card";
        card.innerHTML = `
            <img src="${article.urlToImage || 'https://via.placeholder.com/320x190/f0f0f0/cccccc?text=No+Image'}" alt="${article.title || 'Bookmarked News Image'}" loading="lazy" />
            <h3>${article.title}</h3>
            <p>${article.description}</p>
            <div class="card-footer">
                <button onclick="window.open('${article.url}', '_blank')">Read More</button>
                <button onclick='speak("${article.description?.replace(/["']/g, "") || article.title?.replace(/["']/g, "") || "No text to speak."}")'>🔈</button>
                <button class="delete-bookmark-btn" onclick="deleteBookmark('${article.id}')">🗑️</button>
            </div>
        `;
        newsContainer.appendChild(card);
    });
    showToast(`Loaded ${articles.length} bookmark(s).`, 'success');
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    newsContainer.innerHTML = "<p>Error loading bookmarks.</p>";
    showToast(`Failed to load bookmarks: ${error.message}`, 'error');
  }
}

async function deleteBookmark(bookmarkId) {
    if (!confirm("Are you sure you want to delete this bookmark?")) {
        return;
    }
    try {
        await db.collection("bookmarks").doc(bookmarkId).delete();
        showToast("Bookmark deleted!", 'success');
        showBookmarks(); // Reload bookmarks after deletion
    } catch (error) {
        console.error("Error deleting bookmark:", error);
        showToast(`Failed to delete bookmark: ${error.message}`, 'error');
    }
}

function loadMoreNews() {
    currentPage++;
    if (currentSearchQuery) {
        fetchNews(null, currentPage, currentSearchQuery);
    } else {
        fetchNews(currentCategory, currentPage);
    }
}

function searchNews() {
    const query = searchInput.value.trim();
    if (query) {
        fetchNews(null, 1, query); // Search uses 'everything' endpoint, not category
    } else {
        showToast("Please enter a search query.", 'info');
    }
}

// Initial fetch of news when the user is logged in (handled by onAuthStateChanged)
// fetchNews(); // Removed, as onAuthStateChanged now handles initial fetch





=======
const firebaseConfig = {
  apiKey: "AIzaSyAiZ70OtqMTTBhFjGj5LkTiEXAHHhhDxyI",
  authDomain: "newsaggregator-24357.firebaseapp.com",
  projectId: "newsaggregator-24357",
  storageBucket: "newsaggregator-24357.firebasestorage.app",
  messagingSenderId: "1067300193784",
  appId: "1:1067300193784:web:b888c4fed042fb4d7a420d"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    db.collection("users").doc(user.uid).get().then(doc => {
      const name = doc.exists ? doc.data().name : user.email;
      document.getElementById("welcomeMsg").textContent = `Welcome, ${name}!`;
    });
  } else {
    document.getElementById("authSection").style.display = "block";
    document.getElementById("mainContent").style.display = "none";
  }
});

function signup() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name || !email || !password) return alert("Please fill all fields");

  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      return db.collection("users").doc(cred.user.uid).set({ name });
    })
    .then(() => alert("Signup successful"))
    .catch(err => alert(err.message));
}

function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  auth.signInWithEmailAndPassword(email, password)
    .catch(err => alert(err.message));
}

function logout() {
  auth.signOut().then(() => alert("Logged out"));
}

document.getElementById("toggleTheme").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Fetch & display news
async function fetchNews(category = 'general') {
  const apiKey = "cfc7208f687749cb885a0543a8442629";
  const url = `https://newsapi.org/v2/top-headlines?country=us&category=${category}&apiKey=${apiKey}`;
  const container = document.getElementById("newsContainer");
  container.innerHTML = "Loading...";
  try {
    const res = await fetch(url);
    const data = await res.json();
    showNews(data.articles);
  } catch {
    container.innerHTML = "<p>Error loading news.</p>";
  }
}

function showNews(articles) {
  const container = document.getElementById("newsContainer");
  container.innerHTML = "";
  articles.forEach(article => {
    const isFake = article.title.toLowerCase().includes("shocking") || article.title.toLowerCase().includes("you won't believe");
    const card = document.createElement("div");
    card.className = "news-card";
    card.innerHTML = `
      <img src="${article.urlToImage || 'https://via.placeholder.com/300x180'}" />
      <h3>${article.title}</h3>
      <p>${article.description || 'No description.'}</p>
      ${isFake ? "<p style='color:red;'>⚠️ This may be fake news!</p>" : ""}
      <div>
        <button onclick="window.open('${article.url}', '_blank')">Read More</button>
        <button onclick='speak("${article.description?.replace(/["']/g, "")}")'>🔈</button>
        <button onclick='saveBookmark(${JSON.stringify(article)})'>🔖</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utter);
}

function saveBookmark(article) {
  const user = firebase.auth().currentUser;
  if (!user) return alert("Login to save news!");
  db.collection("bookmarks").add({
    userId: user.uid,
    title: article.title,
    url: article.url,
    desc: article.description,
    image: article.urlToImage
  }).then(() => alert("Saved!"));
}

function showBookmarks() {
  const user = firebase.auth().currentUser;
  if (!user) return alert("Login first!");
  db.collection("bookmarks").where("userId", "==", user.uid).get()
    .then(snapshot => {
      const articles = snapshot.docs.map(doc => doc.data());
      showNews(articles);
    });
}

fetchNews();





>>>>>>> 8d9256196d7a95de0369548b652599bae46a2e21
