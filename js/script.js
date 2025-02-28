// Supabase Initialization
function initializeSupabase() {
  const supabaseUrl = 'https://hmenmnohhbgcblzqsqsa.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtZW5tbm9oaGJnY2JsenFzcXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NTIyODMsImV4cCI6MjA1NjIyODI4M30.tHWd6Sr5ShV5fZvFupLmnQRhRY97w2PWYHwaPxlORwo';
  return supabase.createClient(supabaseUrl, supabaseKey);
}

// متغیرهای سراسری
let supabaseClient;
const totalIcons = 30;
const TOTAL_PAIRS = 8;
let currentLevel = 1;
let scores = { high: 0, low: Infinity, avg: 0, count: 0 };
let isChecking = false;

// توابع مربوط به آیکون‌ها
function getRandomIcons() {
  let availableIcons = Array.from(
    { length: totalIcons },
    (_, i) => `icons/${i + 1}.png`
  );
  availableIcons.sort(() => Math.random() - 0.5);
  return availableIcons.slice(0, TOTAL_PAIRS);
}

function preloadIcons(icons) {
  icons.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

const selectedIcons = getRandomIcons();
preloadIcons(selectedIcons);

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// DOM Elements
const gameBoard = document.querySelector(".game-board");
const coinsDisplay = document.getElementById("coins");
const reloadButton = document.getElementById("reload");
const highScoreDisplay = document.getElementById("high-score");
const lowScoreDisplay = document.getElementById("low-score");
const avgScoreDisplay = document.getElementById("avg-score");
const currentLevelDisplay = document.getElementById("current-level");
const levelItems = document.querySelectorAll(".level-item");
const specialCardsStack = document.getElementById("special-cards-stack");
const themeOptions = document.querySelectorAll(".theme-option");
const hintButton = document.getElementById("hint");
const extraTimeButton = document.getElementById("extra-time");
const doubleCoinsButton = document.getElementById("double-coins");

// Game State
let cardsArray = selectedIcons.flatMap((icon) => [icon, icon]);
let cards = [];
let flippedCards = [];
let matchedCards = [];
let errors = 0;
let correct = 0;
let pairsLeft = TOTAL_PAIRS;
let timer;
let time = 0;
let gameInProgress = false;
let coins = 0;
let currentUser = null;
let doubleCoinsActive = false;
let doubleCoinsTimeout;

// قیمت گزینه‌های کمکی
const HINT_COST = 50;
const EXTRA_TIME_COST = 30;
const DOUBLE_COINS_COST = 70;

// Supabase Functions
async function addUser(username, coins = 0, theme = 'light') {
  const { data, error } = await supabaseClient
    .from('users')
    .insert([{ username, coins, theme }])
    .select();
  if (error) {
    console.error('خطا:', error.message);
    return null;
  }
  localStorage.setItem('lastUsername', username); // ذخیره نام کاربری در Local Storage
  return data[0];
}

async function getUser(username) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  if (error) {
    console.error('خطا:', error.message);
    return null;
  }
  return data;
}

async function updateUser(username, updates) {
  const { data, error } = await supabaseClient
    .from('users')
    .update(updates)
    .eq('username', username)
    .select();
  if (error) {
    console.error('خطا:', error.message);
    return null;
  }
  return data[0];
}

async function checkLastUser() {
  const lastUsername = localStorage.getItem('lastUsername');
  if (lastUsername) {
    const user = await getUser(lastUsername);
    if (user) {
      currentUser = lastUsername;
      coins = user.coins; // دریافت سکه‌ها از Supabase
      setTheme(user.theme);
      updateUI();
      initBoard(); // شروع خودکار بازی برای کاربر
      return true;
    }
  }
  return false;
}

// Game Functions
function initBoard() {
  cards = shuffle([...cardsArray]);
  gameBoard.innerHTML = "";
  flippedCards = [];
  matchedCards = [];
  errors = 0;
  correct = 0;
  pairsLeft = TOTAL_PAIRS;
  time = 60;
  gameInProgress = false;
  isChecking = false;
  doubleCoinsActive = false;
  clearTimeout(doubleCoinsTimeout);
  updateUI();

  cards.forEach((card, index) => {
    const cardElement = document.createElement("div");
    cardElement.classList.add("card", "bg-transparent");
    cardElement.setAttribute("data-index", index);
    cardElement.innerHTML = `
      <div class="card-inner">
        <div class="card-front">?</div>
        <div class="card-back"></div>
      </div>
    `;
    gameBoard.appendChild(cardElement);
    cardElement.addEventListener("click", () => flipCard(cardElement, card, index));
  });
}

function startGame() {
  gameInProgress = true;
  time = 60;
  clearInterval(timer);
  timer = setInterval(() => {
    if (gameInProgress) {
      time--;
      if (time <= 0) {
        clearInterval(timer);
        gameInProgress = false;
        endGame(false);
      }
    }
  }, 1000);
}

function updateUI() {
  coinsDisplay.textContent = coins;
  currentLevelDisplay.textContent = currentLevel;
  levelItems.forEach((item, idx) => {
    item.classList.toggle("active", idx + 1 <= currentLevel);
  });
  updateHelpButtons();
}

function flipCard(cardElement, card, index) {
  if (
    !gameInProgress ||
    flippedCards.length >= 2 ||
    matchedCards.includes(cardElement) ||
    flippedCards.some((c) => c.index === index) ||
    isChecking
  ) {
    return;
  }

  cardElement.classList.add("flipped");
  const cardBack = cardElement.querySelector(".card-back");
  cardBack.innerHTML = `<img src="${card}" alt="icon" class="card-img">`;
  cardBack.classList.add("revealed");

  flippedCards.push({ cardElement, card, index });

  if (flippedCards.length === 2) {
    isChecking = true;
    checkMatch();
  }
}

function checkMatch() {
  const [firstCard, secondCard] = flippedCards;

  if (firstCard.card === secondCard.card) {
    matchedCards.push(firstCard.cardElement, secondCard.cardElement);
    firstCard.cardElement.classList.add("matched");
    secondCard.cardElement.classList.add("matched");
    correct++;
    pairsLeft--;
    coins += doubleCoinsActive ? 20 : 10;
    updateUI();
    if (currentUser) updateUser(currentUser, { coins });
    flippedCards = [];
    isChecking = false;

    if (pairsLeft === 0) {
      clearInterval(timer);
      gameInProgress = false;
      setTimeout(() => endGame(true), 500);
    }
  } else {
    errors++;
    setTimeout(() => {
      if (gameInProgress) {
        firstCard.cardElement.classList.remove("flipped");
        secondCard.cardElement.classList.remove("flipped");
        firstCard.cardElement.querySelector(".card-back").innerHTML = "";
        secondCard.cardElement.querySelector(".card-back").innerHTML = "";
        flippedCards = [];
        updateUI();
      }
      isChecking = false;
    }, 1000);
  }
}

function endGame(won) {
  if (won) {
    const score = coins;
    scores.high = Math.max(scores.high, score);
    scores.low = scores.count === 0 ? score : Math.min(scores.low, score);
    scores.count++;
    scores.avg = (scores.avg * (scores.count - 1) + score) / scores.count;
    highScoreDisplay.textContent = scores.high;
    lowScoreDisplay.textContent = scores.low === Infinity ? 0 : scores.low;
    avgScoreDisplay.textContent = Math.round(scores.avg);

    if (currentLevel < 7) currentLevel++;
    if (Math.random() < 0.3) addSpecialCard();
  }
  if (currentUser) updateUser(currentUser, { coins });
  showGameModal(won ? "تبریک!" : "زمان تمام شد!", won ? "شما برنده شدید!" : "زمان به پایان رسید.", () => {
    initBoard();
    document.querySelector(".overlay").style.display = "flex";
  });
}

function addSpecialCard() {
  const card = document.createElement("div");
  card.classList.add("special-card");
  card.style.left = `${specialCardsStack.childElementCount * 10}px`;
  card.style.zIndex = specialCardsStack.childElementCount;
  card.innerHTML = `<img src="img/matte.jpg" alt="Special Card" />`;
  specialCardsStack.appendChild(card);
}

// Help Functions
function updateHelpButtons() {
  hintButton.disabled = coins < HINT_COST;
  extraTimeButton.disabled = coins < EXTRA_TIME_COST;
  doubleCoinsButton.disabled = coins < DOUBLE_COINS_COST || doubleCoinsActive;
}

function useHint() {
  if (coins < HINT_COST || flippedCards.length > 0) return;
  coins -= HINT_COST;

  const unmatchedCards = cards
    .map((card, index) => ({ card, index }))
    .filter((c) => !matchedCards.includes(gameBoard.children[c.index]));
  const firstCard = unmatchedCards.find((c) =>
    unmatchedCards.some((other) => other.card === c.card && other.index !== c.index)
  );
  const secondCard = unmatchedCards.find(
    (c) => c.card === firstCard.card && c.index !== firstCard.index
  );

  const card1 = gameBoard.children[firstCard.index];
  const card2 = gameBoard.children[secondCard.index];
  card1.classList.add("flipped");
  card2.classList.add("flipped");
  card1.querySelector(".card-back").innerHTML = `<img src="${firstCard.card}" alt="icon" class="card-img">`;
  card2.querySelector(".card-back").innerHTML = `<img src="${secondCard.card}" alt="icon" class="card-img">`;

  setTimeout(() => {
    if (!matchedCards.includes(card1)) {
      card1.classList.remove("flipped");
      card1.querySelector(".card-back").innerHTML = "";
    }
    if (!matchedCards.includes(card2)) {
      card2.classList.remove("flipped");
      card2.querySelector(".card-back").innerHTML = "";
    }
    updateUI();
    if (currentUser) updateUser(currentUser, { coins });
  }, 2000);
}

function useExtraTime() {
  if (coins < EXTRA_TIME_COST) return;
  coins -= EXTRA_TIME_COST;
  time += 10;
  updateUI();
  if (currentUser) updateUser(currentUser, { coins });
}

function useDoubleCoins() {
  if (coins < DOUBLE_COINS_COST || doubleCoinsActive) return;
  coins -= DOUBLE_COINS_COST;
  doubleCoinsActive = true;
  doubleCoinsButton.classList.add("active");

  doubleCoinsTimeout = setTimeout(() => {
    doubleCoinsActive = false;
    doubleCoinsButton.classList.remove("active");
    updateUI();
  }, 10000);

  updateUI();
  if (currentUser) updateUser(currentUser, { coins });
}

// Theme Handling
function setTheme(theme) {
  document.body.classList.remove("dark-mode", "green-mode", "purple-mode", "red-mode");
  const themeToggleBtn = document.querySelector(".current-theme");
  const iconMap = {
    light: '<i class="fas fa-sun"></i> روز',
    dark: '<i class="fas fa-moon"></i> شب',
    green: '<i class="fas fa-leaf"></i> سبز',
    purple: '<i class="fas fa-gem"></i> بنفش',
    red: '<i class="fas fa-fire"></i> قرمز'
  };
  themeToggleBtn.innerHTML = iconMap[theme] || iconMap['light'];
  if (theme !== "light") document.body.classList.add(`${theme}-mode`);
  if (currentUser) updateUser(currentUser, { theme });
}

themeOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const theme = option.dataset.theme;
    setTheme(theme);
  });
});

// Modal Functions
function showGameModal(title, message, callback) {
  const modalTitle = document.getElementById("gameModalLabel");
  const modalBody = document.querySelector("#gameModal .modal-body");
  modalTitle.textContent = title;
  modalBody.textContent = message;

  const gameModalEl = document.getElementById("gameModal");
  const gameModal = new bootstrap.Modal(gameModalEl);
  gameModal.show();

  if (typeof callback === "function") {
    gameModalEl.addEventListener("hidden.bs.modal", callback, { once: true });
  }
}

function showAuthModal() {
  const authModal = new bootstrap.Modal(document.getElementById("authModal"), {
    backdrop: "static",
    keyboard: false,
  });
  authModal.show();
}

function showUserFormModal(isSignup = false) {
  const modal = new bootstrap.Modal(document.getElementById("userFormModal"));
  document.getElementById("userFormModalLabel").textContent = isSignup ? "ثبت‌نام" : "ورود";
  document.getElementById("submitUserForm").textContent = isSignup ? "ثبت‌نام" : "ورود";
  modal.show();
}

// Event Listeners
document.addEventListener("DOMContentLoaded", async () => {
  supabaseClient = initializeSupabase();

  const isLoggedIn = await checkLastUser();
  if (!isLoggedIn) {
    showAuthModal(); // فقط اگه کاربر توی Local Storage نباشه مودال رو نشون بده
  }

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      bootstrap.Modal.getInstance(document.getElementById("authModal")).hide();
      showUserFormModal(false);
    });
  } else {
    console.error("المنت loginBtn پیدا نشد!");
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      bootstrap.Modal.getInstance(document.getElementById("authModal")).hide();
      showUserFormModal(true);
    });
  } else {
    console.error("المنت signupBtn پیدا نشد!");
  }

  document.getElementById("userForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const isSignup = document.getElementById("submitUserForm").textContent === "ثبت‌نام";
    currentUser = username;

    let user;
    if (isSignup) {
      user = await addUser(username); // ثبت‌نام و ذخیره در Local Storage توی addUser انجام می‌شه
    } else {
      user = await getUser(username);
      if (user) localStorage.setItem('lastUsername', username); // ذخیره نام کاربری موقع ورود
    }

    if (user) {
      coins = user.coins;
      setTheme(user.theme);
      updateUI();
      bootstrap.Modal.getInstance(document.getElementById("userFormModal")).hide();
      initBoard();
    } else {
      alert("نام کاربری اشتباه است یا وجود ندارد!");
    }
  });

  reloadButton.addEventListener("click", () => {
    clearInterval(timer);
    initBoard();
    document.querySelector(".overlay").style.display = "flex";
  });

  document.querySelector(".overlay button").addEventListener("click", () => {
    document.querySelector(".overlay").style.display = "none";
    startGame();
  });

  hintButton.addEventListener("click", useHint);
  extraTimeButton.addEventListener("click", useExtraTime);
  doubleCoinsButton.addEventListener("click", useDoubleCoins);

  // initBoard(); // این خط حذف شده چون توی checkLastUser فراخوانی می‌شه
});
