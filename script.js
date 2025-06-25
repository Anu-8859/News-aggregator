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





