// Supabase Initialization
function initializeSupabase() {
  const supabaseUrl = "https://hmenmnohhbgcblzqsqsa.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtZW5tbm9oaGJnY2JsenFzcXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NTIyODMsImV4cCI6MjA1NjIyODI4M30.tHWd6Sr5ShV5fZvFupLmnQRhRY97w2PWYHwaPxlORwo";
  return supabase.createClient(supabaseUrl, supabaseKey);
}

// Global Variables
let supabaseClient;
const totalIcons = 30;
const TOTAL_PAIRS = 8;
let currentLevel = 1;
let scores = { high: 0, low: Infinity, avg: 0, count: 0, last: 0 };
let isChecking = false;

// Icon Functions
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
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

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

// Help Options Costs
const HINT_COST = 50;
const EXTRA_TIME_COST = 30;
const DOUBLE_COINS_COST = 70;

// Supabase Functions
async function addUser(username, password, coins = 0, theme = "light") {
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .insert([
        {
          username,
          password,
          coins,
          theme,
          high_score: 0,
          low_score: 0,
          avg_score: 0,
          scores_count: 0,
          level: 1,
          last_score: 0,
        },
      ])
      .select();
    if (error) throw new Error(error.message);
    localStorage.setItem("lastUsername", username);
    localStorage.setItem("lastPassword", password);
    return data[0];
  } catch (error) {
    console.error("خطا در ثبت کاربر:", error.message);
    alert(
      "خطا در ثبت‌نام: " +
        (error.message.includes("duplicate")
          ? "نام کاربری قبلاً استفاده شده!"
          : error.message)
    );
    return null;
  }
}

async function getUser(username, password) {
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select(
        "username, password, coins, theme, high_score, low_score, avg_score, scores_count, level, last_score"
      )
      .eq("username", username)
      .eq("password", password)
      .single();
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error("خطا در گرفتن کاربر:", error.message);
    alert("نام کاربری یا رمز عبور اشتباه است!");
    return null;
  }
}

async function updateUser(username, data) {
  try {
    const { data: updatedData, error } = await supabaseClient
      .from("users")
      .update(data)
      .eq("username", username)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updatedData;
  } catch (error) {
    console.error("خطا در آپدیت کاربر:", error.message);
    return null;
  }
}

async function checkLastUser() {
  const lastUsername = localStorage.getItem("lastUsername");
  const lastPassword = localStorage.getItem("lastPassword");
  if (lastUsername && lastPassword) {
    try {
      const user = await getUser(lastUsername, lastPassword);
      if (user) {
        currentUser = lastUsername;
        coins = user.coins || 0;
        scores = {
          high: user.high_score || 0,
          low: user.low_score === 0 ? Infinity : user.low_score || Infinity,
          avg: user.avg_score || 0,
          count: user.scores_count || 0,
          last: user.last_score || 0,
        };
        currentLevel = user.level || 1;
        setTheme(user.theme || "light");
        updateUI();
        initBoard();
        return true;
      }
    } catch (error) {
      console.error("خطا در لود کاربر:", error.message);
    }
  }
  return false;
}

// Game Functions
function initBoard() {
  cards = shuffle([...cardsArray]);
  document.querySelector(".game-board").innerHTML = "";
  flippedCards = [];
  matchedCards = [];
  errors = 0;
  correct = 0;
  pairsLeft = TOTAL_PAIRS;
  time = 60 - (currentLevel - 1);
  gameInProgress = false;
  isChecking = false;
  doubleCoinsActive = false;
  clearTimeout(doubleCoinsTimeout);
  const progressRing = document.getElementById("level-progress-ring");
  progressRing.style.strokeDashoffset = 283;
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
    document.querySelector(".game-board").appendChild(cardElement);
    cardElement.addEventListener("click", () =>
      flipCard(cardElement, card, index)
    );
  });
}

function startGame() {
  gameInProgress = true;
  time = 60 - (currentLevel - 1);
  document.getElementById("time-left").textContent = time;
  clearInterval(timer);
  timer = setInterval(() => {
    if (gameInProgress) {
      time--;
      document.getElementById("time-left").textContent = time;
      if (time <= 0) {
        clearInterval(timer);
        gameInProgress = false;
        endGame(false);
      }
    }
  }, 1000);
}

function updateUI() {
  document.getElementById("coins").textContent = coins;
  document.getElementById("current-level").textContent = currentLevel;
  document.getElementById("high-score").textContent = scores.high;
  document.getElementById("low-score").textContent = scores.low === Infinity ? 0 : scores.low;
  document.getElementById("last-score").textContent = scores.last;
  updateHelpButtons();

  const progressRing = document.getElementById("level-progress-ring");
  const progress = (correct / TOTAL_PAIRS) * 283;
  progressRing.style.strokeDashoffset = 283 - progress;
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

    let coinReward = time > 40 ? 20 : time > 20 ? 10 : 5;
    coins += doubleCoinsActive ? coinReward * 2 : coinReward;
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

async function endGame(won) {
  if (won) {
    const score = correct * 10 - errors * 5;
    scores.last = score;
    if (currentUser) {
      const user = await getUser(currentUser, localStorage.getItem("lastPassword"));
      if (user) {
        const updatedScores = {
          high_score: Math.max(user.high_score || 0, score),
          low_score: user.scores_count === 0 ? score : Math.min(user.low_score || Infinity, score),
          avg_score: user.scores_count === 0 ? score : (user.avg_score * user.scores_count + score) / (user.scores_count + 1),
          scores_count: (user.scores_count || 0) + 1,
          level: currentLevel + 1,
          last_score: score,
        };
        const updatedUser = await updateUser(currentUser, {
          ...updatedScores,
          coins,
          level: currentLevel + 1,
        });
        if (updatedUser) {
          scores = {
            high: updatedUser.high_score,
            low: updatedUser.low_score,
            avg: updatedUser.avg_score,
            count: updatedUser.scores_count,
            last: updatedUser.last_score,
          };
          currentLevel = updatedUser.level;
          coins = updatedUser.coins;
        }
      }
    } else {
      scores.high = Math.max(scores.high, score);
      scores.low = scores.count === 0 ? score : Math.min(scores.low, score);
      scores.count++;
      scores.avg = (scores.avg * (scores.count - 1) + score) / scores.count;
      scores.last = score;
    }

    updateUI();

    if (currentLevel < 7) currentLevel++;
    if (Math.random() < 0.3) addSpecialCard();
  }
  showGameModal(
    won ? "تبریک!" : "زمان تمام شد!",
    won ? "شما برنده شدید!" : "زمان به پایان رسید.",
    () => {
      initBoard();
      document.querySelector(".overlay").style.display = "flex";
    }
  );
}

function addSpecialCard() {
  const card = document.createElement("div");
  card.classList.add("special-card");
  card.style.left = `${document.getElementById("special-cards-stack").childElementCount * 10}px`;
  card.style.zIndex = document.getElementById("special-cards-stack").childElementCount;
  card.innerHTML = `<img src="img/matte.jpg" alt="Special Card" />`;
  document.getElementById("special-cards-stack").appendChild(card);
}

// Help Functions
function updateHelpButtons() {
  document.getElementById("hint").disabled = coins < HINT_COST;
  document.getElementById("extra-time").disabled = coins < EXTRA_TIME_COST;
  document.getElementById("double-coins").disabled = coins < DOUBLE_COINS_COST || doubleCoinsActive;
}

function useHint() {
  if (coins < HINT_COST) return;
  coins -= HINT_COST;
  if (currentUser) updateUser(currentUser, { coins });

  if (flippedCards.length === 1) {
    const selectedCard = flippedCards[0];
    const unmatchedCards = cards
      .map((card, index) => ({ card, index }))
      .filter((c) => !matchedCards.includes(document.querySelector(".game-board").children[c.index]));
    const matchCard = unmatchedCards.find(
      (c) => c.card === selectedCard.card && c.index !== selectedCard.index
    );

    if (matchCard) {
      const cardToShake = document.querySelector(".game-board").children[matchCard.index];
      cardToShake.classList.add("flipped");
      cardToShake.querySelector(
        ".card-back"
      ).innerHTML = `<img src="${matchCard.card}" alt="icon" class="card-img">`;
      cardToShake.classList.add("shake");

      setTimeout(() => {
        if (!matchedCards.includes(cardToShake)) {
          cardToShake.classList.remove("flipped", "shake");
          cardToShake.querySelector(".card-back").innerHTML = "";
        }
        updateUI();
      }, 1500);
    }
  } else {
    const unmatchedCards = cards
      .map((card, index) => ({ card, index }))
      .filter((c) => !matchedCards.includes(document.querySelector(".game-board").children[c.index]));
    const firstCard = unmatchedCards.find((c) =>
      unmatchedCards.some(
        (other) => other.card === c.card && other.index !== c.index
      )
    );
    const secondCard = unmatchedCards.find(
      (c) => c.card === firstCard.card && c.index !== firstCard.index
    );

    const card1 = document.querySelector(".game-board").children[firstCard.index];
    const card2 = document.querySelector(".game-board").children[secondCard.index];
    card1.classList.add("flipped");
    card2.classList.add("flipped");
    card1.querySelector(
      ".card-back"
    ).innerHTML = `<img src="${firstCard.card}" alt="icon" class="card-img">`;
    card2.querySelector(
      ".card-back"
    ).innerHTML = `<img src="${secondCard.card}" alt="icon" class="card-img">`;

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
    }, 2000);
  }
}

function useExtraTime() {
  if (coins < EXTRA_TIME_COST) return;
  coins -= EXTRA_TIME_COST;
  time += 10;
  document.getElementById("time-left").textContent = time;
  updateUI();
  if (currentUser) updateUser(currentUser, { coins });
}

function useDoubleCoins() {
  if (coins < DOUBLE_COINS_COST || doubleCoinsActive) return;
  coins -= DOUBLE_COINS_COST;
  doubleCoinsActive = true;
  document.getElementById("double-coins").classList.add("active");

  doubleCoinsTimeout = setTimeout(() => {
    doubleCoinsActive = false;
    document.getElementById("double-coins").classList.remove("active");
    updateUI();
  }, 10000);

  updateUI();
  if (currentUser) updateUser(currentUser, { coins });
}

// Theme Handling
function setTheme(theme) {
  document.body.classList.remove(
    "dark-mode",
    "green-mode",
    "purple-mode",
    "red-mode"
  );
  const themeToggleBtn = document.querySelector(".current-theme");
  const iconMap = {
    light: '<i class="fas fa-sun"></i> روز',
    dark: '<i class="fas fa-moon"></i> شب',
    green: '<i class="fas fa-leaf"></i> سبز',
    purple: '<i class="fas fa-gem"></i> بنفش',
    red: '<i class="fas fa-fire"></i> قرمز',
  };
  themeToggleBtn.innerHTML = iconMap[theme] || iconMap["light"];
  if (theme !== "light") document.body.classList.add(`${theme}-mode`);
  if (currentUser) updateUser(currentUser, { theme });
}

// Modal Functions
function showGameModal(title, message, callback) {
  const modalTitle = document.getElementById("gameModalLabel");
  const modalBody = document.querySelector("#gameModal .modal-body p");
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
  document.getElementById("userFormModalLabel").textContent = isSignup
    ? "ثبت‌نام"
    : "ورود";
  document.getElementById("submitUserForm").textContent = isSignup
    ? "ثبت‌نام"
    : "ورود";
  modal.show();
}

// Event Listeners
document.addEventListener("DOMContentLoaded", async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  supabaseClient = initializeSupabase();

  const themeOptions = document.querySelectorAll(".theme-option");

  themeOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const theme = option.dataset.theme;
      setTheme(theme);
    });
  });

  const isLoggedIn = await checkLastUser();
  if (!isLoggedIn) {
    showAuthModal();
  }

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");

  loginBtn.addEventListener("click", () => {
    bootstrap.Modal.getInstance(document.getElementById("authModal")).hide();
    showUserFormModal(false);
  });

  signupBtn.addEventListener("click", () => {
    bootstrap.Modal.getInstance(document.getElementById("authModal")).hide();
    showUserFormModal(true);
  });

  togglePasswordBtn.addEventListener("click", () => {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      togglePasswordBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
      passwordInput.type = "password";
      togglePasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
  });

  document.getElementById("userForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const isSignup =
      document.getElementById("submitUserForm").textContent === "ثبت‌نام";
    currentUser = username;

    if (username.length < 3) {
      alert("نام کاربری باید حداقل 3 کاراکتر باشد!");
      return;
    }
    if (password.length < 6) {
      alert("رمز عبور باید حداقل 6 کاراکتر باشد!");
      return;
    }

    let user;
    if (isSignup) {
      user = await addUser(username, password);
    } else {
      user = await getUser(username, password);
    }

    if (user) {
      coins = user.coins || 0;
      scores = {
        high: user.high_score || 0,
        low: user.low_score === 0 ? Infinity : user.low_score || Infinity,
        avg: user.avg_score || 0,
        count: user.scores_count || 0,
        last: user.last_score || 0,
      };
      currentLevel = user.level || 1;
      setTheme(user.theme || "light");
      updateUI();
      bootstrap.Modal.getInstance(
        document.getElementById("userFormModal")
      ).hide();
      initBoard();
    }
  });

  document.getElementById("reload").addEventListener("click", () => {
    clearInterval(timer);
    initBoard();
    document.querySelector(".overlay").style.display = "flex";
  });

  document.querySelector(".overlay button").addEventListener("click", () => {
    document.querySelector(".overlay").style.display = "none";
    startGame();
  });

  document.getElementById("hint").addEventListener("click", useHint);
  document.getElementById("extra-time").addEventListener("click", useExtraTime);
  document.getElementById("double-coins").addEventListener("click", useDoubleCoins);

  document.getElementById("help-toggle").addEventListener("click", () => {
    document.querySelector(".help-menu").classList.toggle("active");
  });
});
