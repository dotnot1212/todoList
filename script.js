const supabase = window.supabase.createClient(
  "https://zsiusjxrqofkqqzwutsx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzaXVzanhycW9ma3Fxend1dHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NTM5MjEsImV4cCI6MjA2NzEyOTkyMX0.-RXEdOTX-SecxImWki2OLoFVR8ZbgPiSmjgxp8z-RQE"
);

const tasks = [
  { name: "10 دقیقه کد زدن دستی", points: 15 },
  { name: "10 دقیقه کد زدن با هوش مصنوعی", points: 8 },
  { name: "10 دقیقه یادگیری فرانت‌اند یا هوش مصنوعی", points: 10 },
  { name: "حل مسئله ساده جاوااسکریپت (دستی)", points: 30 },
  { name: "حل مسئله ساده جاوااسکریپت (با هوش مصنوعی)", points: 15 },
  { name: "حل مسئله متوسط (مثل کامپوننت React، دستی)", points: 70 },
  { name: "حل مسئله متوسط (با هوش مصنوعی)", points: 35 },
  { name: "حل مسئله سخت (مثل پروژه To-Do List، دستی)", points: 150 },
  { name: "حل مسئله سخت (با هوش مصنوعی)", points: 75 },
  { name: "ساخت ویژگی فرانت‌اند (مثل انیمیشن CSS، دستی)", points: 50 },
  { name: "یادگیری و پیاده‌سازی مفهوم هوش مصنوعی", points: 100 },
  { name: "دیباگ کردن کد", points: 20 },
  { name: "نوشتن توضیح یا مستندات برای کد", points: 20 },
  { name: "حواس‌پرتی (بازی یا شبکه‌های اجتماعی، بیشتر از 5 دقیقه)", points: -5 },
  { name: "استفاده غیرضروری از هوش مصنوعی", points: -3 }
];

const rewards = [
  { name: "30 دقیقه بازی دلخواه", cost: 60, unlocked: false },
  { name: "1 ساعت بازی بدون عذاب وجدان", cost: 120, unlocked: false },
  { name: "خوراکی خوشمزه (مثل چیپس، شکلات، بستنی)", cost: 100, unlocked: false },
  { name: "یه ساعت گشتن تو شبکه‌های اجتماعی", cost: 150, unlocked: false },
  { name: "فعالیت چیل تو خونه (مثل موسیقی یا نقاشی)", cost: 250, unlocked: false }
];

let totalScore = 0;
let userRewards = [...rewards];
let progressHistory = []; // تاریخچه پیشرفت

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.error('SW registration failed:', err));
  }

  initialize();
});

async function initialize() {
  const scoreElement = document.getElementById('total-score');
  const loading = document.getElementById('loading');

  // ابتدا محتوا را نمایش بده (سرعت بیشتر)
  totalScore = 0;
  userRewards = [...rewards];
  scoreElement.textContent = `امتیاز کل: ${totalScore}`;
  renderTasks();
  renderRewards();
  loading.style.display = 'none';

  // سپس در پس‌زمینه دیتابیس را بررسی کن
  try {
    const { data, error } = await supabase
  .from('gamification')
  .select('*')
  .eq('id', 1)
  .single();



    if (error && error.code === 'PGRST116') {
  const { data: newData, error: insertError } = await supabase
    .from('gamification')
    .insert({ total_score: 0, tasks })
    .select()
    .single();

  if (!insertError) {
    totalScore = 0;
    userRewards = [...rewards];
    window.currentRecordId = newData.id;
    scoreElement.textContent = `امتیاز کل: ${totalScore}`;
    renderRewards();
  }
} else if (!error) {
  totalScore = data.total_score || 0;
  userRewards = [...rewards]; // فقط مقدار اولیه لوکال
  window.currentRecordId = data.id;
  scoreElement.textContent = `امتیاز کل: ${totalScore}`;
  renderRewards();
  checkAndUnlockRewards();
}

  } catch (err) {
    console.warn('خطا در اتصال به دیتابیس:', err);
  }
}

function renderTasks() {
  const container = document.getElementById('tasks');
  container.innerHTML = '';

  tasks.forEach((task, index) => {
    const div = document.createElement('div');
    div.className = 'task-row';

    const name = document.createElement('div');
    name.className = 'task-name flex-grow-1';
    name.textContent = task.name;

    const point = document.createElement('div');
    point.className = 'points';
    point.textContent = `(${task.points} امتیاز)`;

    const btn = document.createElement('button');
    btn.className = 'task-button';
    btn.textContent = 'انجام شد';
    btn.onclick = () => addPoints(task.points, btn, task.name);

    div.append(name, point, btn);
    container.appendChild(div);
  });
}

function addPoints(points, button, taskName) {
  // ابتدا UI را آپدیت کن (سرعت بیشتر)
  button.disabled = true;
  button.textContent = '✓ انجام شد';
  
  totalScore += points;
  document.getElementById('total-score').textContent = `امتیاز کل: ${totalScore}`;
  
  // اضافه کردن به تاریخچه پیشرفت
  const progressItem = {
    id: Date.now(),
    task: taskName,
    points: points,
    date: new Date().toLocaleString('fa-IR'),
    type: 'task'
  };
  progressHistory.unshift(progressItem);
  renderProgressHistory();
  
  // بررسی جایزه‌ها
  checkAndUnlockRewards();
  renderRewards();
  
  // دکمه را بعد از 500ms آزاد کن
  setTimeout(() => {
    button.textContent = 'انجام شد';
    button.disabled = false;
  }, 500);

  // در پس‌زمینه دیتابیس را آپدیت کن
  saveToDatabase();
}

// تابع جداگانه برای ذخیره در دیتابیس
async function saveToDatabase() {
  if (window.currentRecordId) {
    try {
      await supabase
        .from('gamification')
        .update({ total_score: totalScore })
        .eq('id', window.currentRecordId);
    } catch (err) {
      console.warn('خطا در ذخیره در دیتابیس:', err);
    }
  }
}



function renderRewards() {
  const container = document.getElementById('rewards');
  container.innerHTML = '';

  userRewards.forEach((reward, index) => {
    const div = document.createElement('div');
    div.className = 'reward-item';
    if (reward.unlocked) {
      div.classList.add('unlocked');
    }

    const name = document.createElement('div');
    name.textContent = reward.name;

    const cost = document.createElement('div');
    cost.className = 'text-success fw-bold';
    cost.textContent = `${reward.cost} امتیاز`;

    const btn = document.createElement('button');

    if (reward.unlocked) {
      btn.textContent = 'استفاده کن';
      btn.disabled = false;
    } else if (totalScore >= reward.cost) {
      btn.textContent = 'استفاده کن';
      btn.disabled = false;
    } else {
      btn.textContent = `${reward.cost - totalScore} امتیاز دیگر`;
      btn.disabled = true;
    }

    btn.onclick = () => unlockReward(index);

    div.append(name, cost, btn);
    container.appendChild(div);
  });
}


// تابع بررسی و باز کردن خودکار جایزه‌ها
function checkAndUnlockRewards() {
  let unlockedNew = false;
  
  userRewards.forEach((reward, index) => {
    // فقط اگر جایزه باز نشده و امتیاز کافی باشد، باز کن
    if (!reward.unlocked && totalScore >= reward.cost) {
      userRewards[index].unlocked = true;
      unlockedNew = true;
      
      // نمایش پیام تبریک
      showRewardNotification(reward.name);
    }
  });
  
  if (unlockedNew) {
    renderRewards();
    // در پس‌زمینه ذخیره کن
    setTimeout(() => saveToDatabase(), 100);
  }
}

// تابع نمایش اعلان جایزه
function showRewardNotification(rewardName) {
  // ایجاد اعلان زیبا
  const notification = document.createElement('div');
  notification.className = 'reward-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">🎉</div>
      <div class="notification-text">
        <h4>تبریک! 🎊</h4>
        <p>جایزه "${rewardName}" باز شد!</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // حذف اعلان بعد از 3 ثانیه
  setTimeout(() => {
    notification.remove();
  }, 3000);
}



function unlockReward(index) {
  if (totalScore < userRewards[index].cost) return;

  // ابتدا UI را آپدیت کن (سرعت بیشتر)
  totalScore -= userRewards[index].cost;
  
  // اضافه کردن به تاریخچه پیشرفت
  const progressItem = {
    id: Date.now(),
    task: `استفاده از جایزه: ${userRewards[index].name}`,
    points: -userRewards[index].cost,
    date: new Date().toLocaleString('fa-IR'),
    type: 'reward'
  };
  progressHistory.unshift(progressItem);
  renderProgressHistory();

  document.getElementById('total-score').textContent = `امتیاز کل: ${totalScore}`;
  renderRewards();
  
  // نمایش پیام استفاده از جایزه
  showUsageNotification(userRewards[index].name);

  // در پس‌زمینه دیتابیس را آپدیت کن
  setTimeout(() => saveToDatabase(), 100);
}

// تابع نمایش تاریخچه پیشرفت
function renderProgressHistory() {
  const container = document.getElementById('progress-history');
  if (!container) return;
  
  container.innerHTML = '';
  
  // دکمه حذف همه
  if (progressHistory.length > 0) {
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'btn btn-outline-danger btn-sm mb-3';
    clearAllBtn.textContent = 'حذف همه';
    clearAllBtn.onclick = clearAllProgress;
    container.appendChild(clearAllBtn);
  }
  
  progressHistory.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'progress-item';
    
    const taskInfo = document.createElement('div');
    taskInfo.className = 'task-info';
    taskInfo.innerHTML = `
      <div class="task-name">${item.task}</div>
      <div class="task-date">${item.date}</div>
    `;
    
    const pointsInfo = document.createElement('div');
    pointsInfo.className = `points-info ${item.points > 0 ? 'positive' : 'negative'}`;
    pointsInfo.textContent = `${item.points > 0 ? '+' : ''}${item.points} امتیاز`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.onclick = () => deleteProgressItem(index);
    
    div.append(taskInfo, pointsInfo, deleteBtn);
    container.appendChild(div);
  });
}

// تابع حذف آیتم پیشرفت
function deleteProgressItem(index) {
  progressHistory.splice(index, 1);
  renderProgressHistory();
  saveToDatabase();
}

// تابع حذف همه پیشرفت
function clearAllProgress() {
  if (confirm('آیا مطمئن هستید که می‌خواهید همه تاریخچه را حذف کنید؟')) {
    progressHistory = [];
    renderProgressHistory();
    saveToDatabase();
  }
}

// تابع نمایش اعلان استفاده از جایزه
function showUsageNotification(rewardName) {
  const notification = document.createElement('div');
  notification.className = 'usage-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">🎁</div>
      <div class="notification-text">
        <h4>لذت ببرید! 😊</h4>
        <p>از جایزه "${rewardName}" استفاده کردید!</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// --- تایمر پومودورو ---
let timerInterval = null;
let timerSeconds = 25 * 60;
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-timer');
const resetBtn = document.getElementById('reset-timer');

function updateTimerDisplay() {
  const min = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const sec = String(timerSeconds % 60).padStart(2, '0');
  timerDisplay.textContent = `${min}:${sec}`;
}

function startTimer() {
  if (timerInterval) return;
  startBtn.disabled = true;
  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      startBtn.disabled = false;
      timerDisplay.textContent = 'تمام!';
      showTimerNotification();
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerSeconds = 25 * 60;
  updateTimerDisplay();
  startBtn.disabled = false;
}

function showTimerNotification() {
  const notification = document.createElement('div');
  notification.className = 'reward-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">⏰</div>
      <div class="notification-text">
        <h4>آفرین!</h4>
        <p>یک پومودورو کامل شد 🎉</p>
      </div>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

if (startBtn && resetBtn && timerDisplay) {
  startBtn.onclick = startTimer;
  resetBtn.onclick = resetTimer;
  updateTimerDisplay();
}
