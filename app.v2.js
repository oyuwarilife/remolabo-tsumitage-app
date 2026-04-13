// ========================================
// データ管理
// ========================================

const STORAGE_KEY = 'remolabo_data';

// デフォルトデータ
function getDefaultData() {
    return {
        stamps: {},
        tasks: {},
        totalTasks: 0,
        achieved100: false,
        lastBackupDate: null,
        lastTaskDate: null,
        consecutiveDays: 0,
        weeklyGoals: {},
        achievements: {}
    };
}

// データ読み込み
function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return getDefaultData();

        const parsed = JSON.parse(stored);
        // データ構造の検証
        if (!parsed.stamps || !parsed.tasks) {
            console.warn('Invalid data structure, using default');
            return getDefaultData();
        }
        return parsed;
    } catch (error) {
        console.error('Failed to load data:', error);
        alert('⚠️ データの読み込みに失敗しました。初期状態から開始します。');
        return getDefaultData();
    }
}

// データ保存
function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save data:', error);
        if (error.name === 'QuotaExceededError') {
            alert('❌ データの保存に失敗しました。\n\nストレージ容量が不足しています。古いデータを削除するか、ブラウザのキャッシュをクリアしてください。');
        } else {
            alert('❌ データの保存に失敗しました。');
        }
    }
}

// 今日の日付（YYYY-MM-DD形式）
function getToday() {
    const now = new Date();
    return formatDate(now);
}

// 日付フォーマット
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ========================================
// 初期化
// ========================================

let data = loadData();
let currentWeekOffset = 0; // 0=今週, -1=先週, -2=先々週...

document.addEventListener('DOMContentLoaded', () => {
    initStamps();
    initTaskButton();
    initWeekLog();
    initMonasashi();
    initCelebration();
    initWeeklySummary();
    initStats();
});

// ========================================
// 参加スタンプ
// ========================================

function initStamps() {
    const stampBtns = document.querySelectorAll('.stamp-btn');
    const today = getToday();

    // 今日のスタンプ状態を反映
    if (!data.stamps[today]) {
        data.stamps[today] = {
            morning: false,
            lunch: false,
            night: false,
            tsumitage: false
        };
    }

    stampBtns.forEach(btn => {
        const type = btn.dataset.type;
        if (data.stamps[today][type]) {
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
            const isActive = btn.classList.contains('active');
            data.stamps[today][type] = !isActive;
            btn.classList.toggle('active');

            // 押した瞬間のアニメーション（activeになる時のみ）
            if (!isActive) {
                const hanamaru = btn.querySelector('.hanamaru');
                hanamaru.classList.add('animate');
                setTimeout(() => {
                    hanamaru.classList.remove('animate');
                }, 600);

                // 累計タスク増加
                data.totalTasks++;

                // 連続記録のチェック
                checkConsecutiveDaysForStamp();

                // 100個単位のチェック
                const milestone = Math.floor(data.totalTasks / 100) * 100;
                const prevMilestone = Math.floor((data.totalTasks - 1) / 100) * 100;

                if (milestone > prevMilestone && milestone > 0) {
                    showCelebration(milestone);
                }

                // リモにゃんとメモリバーを更新
                updateMonasashi();
                updateTaskCountDisplay();
            }

            saveData(data);
            updateWeekLog();
            checkAchievements();
        });
    });

    // スタンプ用の連続記録チェック関数
    function checkConsecutiveDaysForStamp() {
        const today = getToday();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);

        // 今日が初めての記録の場合
        if (!data.lastTaskDate) {
            data.lastTaskDate = today;
            data.consecutiveDays = 1;
            return;
        }

        // 今日既に記録がある場合は何もしない
        if (data.lastTaskDate === today) {
            return;
        }

        // 昨日に記録があれば連続
        if (data.lastTaskDate === yesterdayStr) {
            data.consecutiveDays++;
        } else {
            // 連続が途切れた
            data.consecutiveDays = 1;
        }

        data.lastTaskDate = today;
    }

    // タスクカウント表示更新用の関数
    function updateTaskCountDisplay() {
        const todayCountEl = document.getElementById('todayCount');
        const totalCountEl = document.getElementById('totalCount');
        const today = getToday();

        todayCountEl.textContent = data.tasks[today] || 0;
        totalCountEl.textContent = data.totalTasks;

        // 連続記録バッジの更新
        const streakBadge = document.getElementById('streakBadge');
        const streakCount = document.getElementById('streakCount');
        if (data.consecutiveDays >= 2) {
            streakCount.textContent = data.consecutiveDays;
            streakBadge.style.display = 'block';
        } else {
            streakBadge.style.display = 'none';
        }
    }
}

// ========================================
// タスク完了
// ========================================

function initTaskButton() {
    const taskBtn = document.getElementById('taskCompleteBtn');
    const todayCountEl = document.getElementById('todayCount');
    const totalCountEl = document.getElementById('totalCount');
    const today = getToday();

    // 初期表示
    updateTaskCount();

    taskBtn.addEventListener('click', () => {
        // 今日のカウント増加
        if (!data.tasks[today]) {
            data.tasks[today] = 0;
        }
        data.tasks[today]++;

        // 累計増加
        data.totalTasks++;

        // 連続記録のチェック
        checkConsecutiveDays();

        // 100個単位のチェック
        const milestone = Math.floor(data.totalTasks / 100) * 100;
        const prevMilestone = Math.floor((data.totalTasks - 1) / 100) * 100;

        if (milestone > prevMilestone && milestone > 0) {
            showCelebration(milestone);
        }

        saveData(data);
        updateTaskCount();
        updateMonasashi();
        updateWeekLog();
        checkAchievements();

        // 週間タスク数のマイルストーンチェック（案2）
        const weekData = getWeekData();
        checkTaskMilestone(weekData.weekTasks);

        // ボタンアニメーション
        taskBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            taskBtn.style.transform = '';
        }, 100);
    });

    function updateTaskCount() {
        const today = getToday();
        todayCountEl.textContent = data.tasks[today] || 0;
        totalCountEl.textContent = data.totalTasks;
        updateStreak();
    }

    function updateStreak() {
        const streakBadge = document.getElementById('streakBadge');
        const streakCount = document.getElementById('streakCount');

        // 2日以上連続している場合のみ表示
        if (data.consecutiveDays >= 2) {
            streakCount.textContent = data.consecutiveDays;
            streakBadge.style.display = 'block';
        } else {
            streakBadge.style.display = 'none';
        }
    }

    function checkConsecutiveDays() {
        const today = getToday();
        const yesterday = getYesterday();

        // 昨日もタスクを完了していたかチェック
        if (data.lastTaskDate === yesterday) {
            // 連続記録
            data.consecutiveDays++;
        } else if (data.lastTaskDate === today) {
            // 今日はすでに記録済み（連続日数は変更なし）
            return;
        } else {
            // 連続記録が途切れた
            data.consecutiveDays = 1;
        }

        // 最終記録日を更新
        data.lastTaskDate = today;
    }

    function getYesterday() {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return formatDate(date);
    }
}

// ========================================
// 週ログ
// ========================================

function initWeekLog() {
    const prevBtn = document.getElementById('prevWeekBtn');
    const nextBtn = document.getElementById('nextWeekBtn');
    const addGoalBtn = document.getElementById('addGoalBtn');

    prevBtn.addEventListener('click', () => {
        if (currentWeekOffset > -4) {
            currentWeekOffset--;
            updateWeekLog();
            loadWeeklyGoals();
            checkPastWeekView(); // 案3
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentWeekOffset < 0) {
            currentWeekOffset++;
            updateWeekLog();
            loadWeeklyGoals();
        }
    });

    // 目標を追加
    addGoalBtn.addEventListener('click', () => {
        addGoal();
    });

    updateWeekLog();
    loadWeeklyGoals();
}

// 週キーを生成（例: "2026-W15"）
function getWeekKey() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (currentWeekOffset * 7));

    const year = monday.getFullYear();

    // ISO週番号を計算
    const janFirst = new Date(year, 0, 1);
    const daysSinceJan = Math.floor((monday - janFirst) / 86400000);
    const weekNum = Math.ceil((daysSinceJan + janFirst.getDay() + 1) / 7);

    return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

// 週間目標を保存
function saveWeeklyGoals() {
    const weekKey = getWeekKey();
    const goalInputs = document.querySelectorAll('.goal-item input');
    const goals = Array.from(goalInputs).map(input => input.value.trim());
    // 空でない目標のみ保存（ただし最低1つの空欄は保持）
    const filteredGoals = goals.filter(g => g);
    data.weeklyGoals[weekKey] = filteredGoals.length > 0 ? filteredGoals : [''];
    saveData(data);
}

// 週間目標を読み込み
function loadWeeklyGoals() {
    const weekKey = getWeekKey();
    let goals = data.weeklyGoals[weekKey];

    // データ移行: 文字列から配列に変換
    if (typeof goals === 'string') {
        goals = goals ? [goals] : [];
        data.weeklyGoals[weekKey] = goals;
        saveData(data);
    }

    // 目標がない場合は空の配列
    if (!Array.isArray(goals)) {
        goals = [];
    }

    // 最低1つの入力欄を表示
    if (goals.length === 0) {
        goals = [''];
    }

    renderGoals(goals);
}

// 目標を追加
function addGoal() {
    // 現在表示されている目標を取得
    const goalInputs = document.querySelectorAll('.goal-item input');
    const goals = Array.from(goalInputs).map(input => input.value.trim());

    // 最大5個まで
    if (goals.length >= 5) {
        return;
    }

    // 新しい空欄を追加
    goals.push('');
    renderGoals(goals);
    updateAddGoalButton();
}

// 目標を削除
function removeGoal(index) {
    // 現在表示されている目標を取得
    const goalInputs = document.querySelectorAll('.goal-item input');
    const goals = Array.from(goalInputs).map(input => input.value.trim());

    // 指定のindexを削除
    goals.splice(index, 1);

    // 最低1つの入力欄を残す
    if (goals.length === 0) {
        goals.push('');
    }

    renderGoals(goals);
    saveWeeklyGoals();
    updateAddGoalButton();
}

// 目標を描画
function renderGoals(goals) {
    const container = document.getElementById('goalsContainer');
    container.innerHTML = '';

    goals.forEach((goal, index) => {
        const item = document.createElement('div');
        item.className = 'goal-item';

        // Input と削除ボタンのコンテナ
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.gap = '8px';
        inputContainer.style.alignItems = 'center';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = goal;
        input.placeholder = index === 0 ? '例：朝活3回、タスク20個完了' : '目標を入力';
        input.maxLength = 100;

        input.addEventListener('blur', () => {
            saveWeeklyGoals();
            renderGoals(getWeeklyGoals());
        });
        input.addEventListener('change', () => {
            saveWeeklyGoals();
            renderGoals(getWeeklyGoals());
        });

        inputContainer.appendChild(input);

        // 削除ボタン（1つ目以外）
        if (goals.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-goal-btn';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => removeGoal(index));
            inputContainer.appendChild(removeBtn);
        }

        item.appendChild(inputContainer);

        // 達成状況を追加
        if (goal && goal.trim()) {
            const progress = calculateGoalProgress(goal);
            if (progress) {
                const progressEl = document.createElement('div');
                progressEl.className = 'goal-progress';

                const progressBar = document.createElement('div');
                progressBar.className = 'goal-progress-bar';

                const progressFill = document.createElement('div');
                progressFill.className = 'goal-progress-fill';
                const percentage = Math.min(100, Math.round((progress.current / progress.target) * 100));
                progressFill.style.width = percentage + '%';

                if (percentage >= 100) {
                    progressFill.classList.add('completed');
                }

                progressBar.appendChild(progressFill);

                const progressText = document.createElement('div');
                progressText.className = 'goal-progress-text';
                progressText.textContent = `${progress.current} / ${progress.target} (${percentage}%)`;

                progressEl.appendChild(progressBar);
                progressEl.appendChild(progressText);
                item.appendChild(progressEl);
            }
        }

        container.appendChild(item);
    });

    updateAddGoalButton();
}

// 目標の達成状況を計算
function calculateGoalProgress(goalText) {
    const weekData = getWeekData();

    // 数字を抽出
    const numberMatch = goalText.match(/(\d+)/);
    if (!numberMatch) return null;

    const target = parseInt(numberMatch[1]);
    let current = 0;

    // キーワードで判定
    if (goalText.includes('朝活')) {
        current = weekData.stamps.morning;
    } else if (goalText.includes('昼活')) {
        current = weekData.stamps.lunch;
    } else if (goalText.includes('夜活')) {
        current = weekData.stamps.night;
    } else if (goalText.includes('積み上げ')) {
        current = weekData.stamps.tsumitage;
    } else if (goalText.includes('タスク')) {
        current = weekData.weekTasks;
    } else {
        return null;
    }

    return { current, target };
}

// 「+ 目標を追加」ボタンの状態更新
function updateAddGoalButton() {
    const addBtn = document.getElementById('addGoalBtn');
    const weekKey = getWeekKey();
    const goals = data.weeklyGoals[weekKey] || [];
    addBtn.disabled = goals.length >= 5;
}

function updateWeekLog() {
    const weekRowsEl = document.getElementById('weekRows');
    const weekTitleEl = document.getElementById('weekTitle');
    const prevBtn = document.getElementById('prevWeekBtn');
    const nextBtn = document.getElementById('nextWeekBtn');
    const today = new Date();

    // 週の開始日（月曜日）を計算
    const dayOfWeek = today.getDay();
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (currentWeekOffset * 7));

    // 週タイトル
    if (currentWeekOffset === 0) {
        weekTitleEl.textContent = '今週の記録';
    } else {
        weekTitleEl.textContent = `${Math.abs(currentWeekOffset)}週前の記録`;
    }

    // ボタンの有効/無効
    prevBtn.disabled = currentWeekOffset <= -4;
    nextBtn.disabled = currentWeekOffset >= 0;

    // 7日分の行を生成
    let html = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = formatDate(date);
        const isToday = dateStr === getToday();

        const stamps = data.stamps[dateStr] || {
            morning: false,
            lunch: false,
            night: false,
            tsumitage: false
        };

        const tasks = data.tasks[dateStr] || 0;

        html += `
            <div class="week-row ${isToday ? 'today' : ''}">
                <div>${formatWeekDate(date)}</div>
                <div class="week-stamps">
                    <img src="assets/morning.png" alt="朝活" class="mini-stamp ${stamps.morning ? 'active' : ''}">
                    <img src="assets/lunch.png" alt="昼活" class="mini-stamp ${stamps.lunch ? 'active' : ''}">
                    <img src="assets/night.png" alt="夜活" class="mini-stamp ${stamps.night ? 'active' : ''}">
                    <img src="assets/tsumitage.png" alt="積み上げ" class="mini-stamp ${stamps.tsumitage ? 'active' : ''}">
                </div>
                <div>${tasks}</div>
            </div>
        `;
    }

    weekRowsEl.innerHTML = html;
}

function formatWeekDate(date) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
}

// ========================================
// ものさしパネル
// ========================================

function initMonasashi() {
    updateMonasashi();
}

function updateMonasashi() {
    const imageEl = document.getElementById('remonyanImage');
    const countEl = document.getElementById('remonyanTotalCount');
    const barEl = document.getElementById('monasashiBar');

    // 100個単位での余り（0-100）
    const current = data.totalTasks % 100;

    // 累計タスク数を表示
    countEl.textContent = current;

    // リモにゃんの画像を切り替え（20個ごと）
    let imageNumber = 1;
    if (current >= 80) {
        imageNumber = 5;
    } else if (current >= 60) {
        imageNumber = 4;
    } else if (current >= 40) {
        imageNumber = 3;
    } else if (current >= 20) {
        imageNumber = 2;
    }

    imageEl.src = `assets/remonyan-${imageNumber}.png`;

    // ものさしバーを生成
    let html = '';
    for (let i = 0; i < 100; i++) {
        const color = getMonasashiColor(i + 1);
        const filled = i < current;
        html += `<div class="monasashi-block" style="background: ${filled ? color : '#f5f5f5'}"></div>`;
    }

    // 現在地の数字表示
    if (current > 0) {
        const percentage = current / 100;
        html += `
            <div class="monasashi-current" style="bottom: ${percentage * 100}%">
                <span class="monasashi-number">${current}</span>
            </div>
        `;
    }

    barEl.innerHTML = html;
}

function getMonasashiColor(count) {
    if (count <= 20) return '#fff9c4'; // 薄い黄色
    if (count <= 40) return '#ffe0b2'; // パステルオレンジ
    if (count <= 60) return '#f8bbd0'; // パステルピンク
    if (count <= 80) return '#e1bee7'; // ラベンダー
    return '#d1c4e9'; // パステルパープル
}

// ========================================
// お祝い画面
// ========================================

function initCelebration() {
    const modal = document.getElementById('celebrationModal');
    const closeBtn = modal.querySelector('.celebration-close');
    const shareThreadsBtn = document.getElementById('shareThreadsBtn');
    const shareXBtn = document.getElementById('shareXBtn');

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    shareThreadsBtn.addEventListener('click', () => {
        const milestone = Math.floor(data.totalTasks / 100) * 100;
        const text = getCelebrationShareText(milestone);
        const url = `https://threads.net/intent/post?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    });

    shareXBtn.addEventListener('click', () => {
        const milestone = Math.floor(data.totalTasks / 100) * 100;
        const text = getCelebrationShareText(milestone);
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    });
}

function showCelebration(milestone) {
    const modal = document.getElementById('celebrationModal');
    const titleEl = document.getElementById('celebrationTitle');
    const messageEl = document.getElementById('celebrationMessage');

    // メッセージ設定
    const messages = getCelebrationMessage(milestone);
    titleEl.textContent = messages.title;
    messageEl.innerHTML = messages.message;

    // Canvas描画
    drawCelebrationCircle();

    // 紙吹雪
    createConfetti();

    // モーダル表示
    modal.classList.add('show');

    // 効果音（オプション）
    playSound();
}

function getCelebrationMessage(milestone) {
    const times = milestone / 100;

    if (times === 1) {
        return {
            title: '100回達成！',
            message: 'おめでとうにゃ🎉<br>コツコツ積み上げ、すごいにゃ！'
        };
    } else if (times === 2) {
        return {
            title: '200回達成！',
            message: 'またまたおめでとうにゃ🎉🎉<br>積み上げマスターにゃ！'
        };
    } else if (times === 3) {
        return {
            title: '300回達成！',
            message: 'すごすぎるにゃ🎉🎉🎉<br>リモにゃんも応援してるにゃ！'
        };
    } else {
        return {
            title: `${milestone}回達成！`,
            message: `おめでとうにゃ${'🎉'.repeat(times)}<br>継続は力にゃ！`
        };
    }
}

function drawCelebrationCircle() {
    const canvas = document.getElementById('celebrationCanvas');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 130;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 7色のセグメント（パステル調）
    const colors = ['#ffb3ba', '#bae1b3', '#d4a5d8', '#fff4ba', '#a0c4e5', '#bae1e7', '#ffd4a3'];
    const segmentAngle = (2 * Math.PI) / colors.length;

    colors.forEach((color, i) => {
        const startAngle = i * segmentAngle - Math.PI / 2;
        const endAngle = (i + 1) * segmentAngle - Math.PI / 2;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    });

    // 内側の白い円
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 20, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    // 回転アニメーション
    let rotation = 0;
    const animate = () => {
        if (rotation < 360) {
            rotation += 2;
            canvas.style.transform = `rotate(${rotation}deg)`;
            requestAnimationFrame(animate);
        }
    };
    animate();
}

function createConfetti() {
    const confettiEl = document.getElementById('confetti');
    confettiEl.innerHTML = '';

    const colors = ['#ffb3ba', '#bae1b3', '#fff4ba', '#a0c4e5', '#ffd4a3'];

    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 2 + 's';
        confettiEl.appendChild(piece);
    }
}

function playSound() {
    // Web Audio API（オプション）
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function generateCelebrationImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // 背景
    const gradient = ctx.createLinearGradient(0, 0, 0, 1080);
    gradient.addColorStop(0, '#fff8e1');
    gradient.addColorStop(1, '#ffe082');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    // 円形プログレスバー
    const centerX = 540;
    const centerY = 400;
    const radius = 250;
    const colors = ['#ff5252', '#4caf50', '#9c27b0', '#ffd54f', '#2196f3', '#00bcd4', '#ff9800'];
    const segmentAngle = (2 * Math.PI) / colors.length;

    colors.forEach((color, i) => {
        const startAngle = i * segmentAngle - Math.PI / 2;
        const endAngle = (i + 1) * segmentAngle - Math.PI / 2;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    });

    // 内側の白い円
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 40, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    // リモにゃん画像（中央）
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, centerX - 150, centerY - 150, 300, 300);

        // タイトル
        const milestone = Math.floor(data.totalTasks / 100) * 100;
        ctx.fillStyle = '#ff6f00';
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${milestone}回達成！`, centerX, 750);

        // 日付
        ctx.fillStyle = '#5d4037';
        ctx.font = '40px sans-serif';
        ctx.fillText(getToday(), centerX, 850);

        // リモラボロゴ
        ctx.font = '50px sans-serif';
        ctx.fillText('リモラボ 積み上げアプリ', centerX, 950);

        // ダウンロード
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `remolabo_${milestone}回達成_${getToday()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        });
    };
    img.src = 'assets/remonyan.png';
}

function getCelebrationShareText(milestone) {
    const times = milestone / 100;

    if (times === 1) {
        return `リモラボで100回達成したにゃ🎉\nコツコツ積み上げって楽しいにゃ！\n#リモラボ`;
    } else if (times === 2) {
        return `リモラボで200回達成したにゃ🎉🎉\n積み上げマスターになったにゃ！\n#リモラボ`;
    } else if (times === 3) {
        return `リモラボで300回達成したにゃ🎉🎉🎉\nリモにゃんも応援してるにゃ！\n#リモラボ`;
    } else {
        return `リモラボで${milestone}回達成したにゃ${'🎉'.repeat(times)}\n継続は力にゃ！\n#リモラボ`;
    }
}

// ========================================
// ========================================
// 週間サマリー
// ========================================

function initWeeklySummary() {
    const promptModal = document.getElementById('summaryPrompt');
    const summaryModal = document.getElementById('weeklySummaryModal');
    const viewBtn = document.getElementById('viewSummaryBtn');
    const skipBtn = document.getElementById('skipSummaryBtn');
    const closeBtn = summaryModal.querySelector('.close-btn');
    const shareThreadsBtn = document.getElementById('shareThreadsSummaryBtn');
    const shareXBtn = document.getElementById('shareXSummaryBtn');

    viewBtn.addEventListener('click', () => {
        promptModal.style.display = 'none';
        showWeeklySummary();
    });

    skipBtn.addEventListener('click', () => {
        promptModal.style.display = 'none';
    });

    closeBtn.addEventListener('click', () => {
        summaryModal.style.display = 'none';
    });

    shareThreadsBtn.addEventListener('click', () => {
        const text = getWeeklySummaryShareText();
        window.open(`https://threads.net/intent/post?text=${encodeURIComponent(text)}`, '_blank');
    });

    shareXBtn.addEventListener('click', () => {
        const text = getWeeklySummaryShareText();
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    });

    // 初回アクセス時チェック（案4）
    checkDailyPrompt();
}

// 週間サマリーを表示
function showWeeklySummary() {
    const modal = document.getElementById('weeklySummaryModal');
    const weekData = getWeekData();

    // タイトル・日付
    document.getElementById('summaryWeekTitle').textContent = weekData.title;
    document.getElementById('summaryWeekDate').textContent = weekData.dateRange;

    // 統計
    document.getElementById('weekTasks').textContent = `${weekData.weekTasks}個`;
    document.getElementById('totalTasks').textContent = `${data.totalTasks}個`;
    document.getElementById('streakDays').textContent = `${data.consecutiveDays}日`;

    // 参加記録
    document.getElementById('morningCount').textContent = weekData.stamps.morning;
    document.getElementById('lunchCount').textContent = weekData.stamps.lunch;
    document.getElementById('nightCount').textContent = weekData.stamps.night;
    document.getElementById('tsumitageCount').textContent = weekData.stamps.tsumitage;

    // 今週の目標
    renderSummaryGoals(weekData.goals);

    // グラフ描画
    drawWeeklyChart(weekData.dailyTasks);

    modal.style.display = 'flex';
}

// 週間データを取得
function getWeekData() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (currentWeekOffset * 7));

    const dates = [];
    const dailyTasks = [];
    const stamps = { morning: 0, lunch: 0, night: 0, tsumitage: 0 };
    let weekTasks = 0;

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateStr = formatDate(date);
        dates.push(dateStr);

        // タスク数
        const tasks = data.tasks[dateStr] || 0;
        dailyTasks.push(tasks);
        weekTasks += tasks;

        // スタンプ
        if (data.stamps[dateStr]) {
            if (data.stamps[dateStr].morning) stamps.morning++;
            if (data.stamps[dateStr].lunch) stamps.lunch++;
            if (data.stamps[dateStr].night) stamps.night++;
            if (data.stamps[dateStr].tsumitage) stamps.tsumitage++;
        }
    }

    // 週のタイトル
    const title = currentWeekOffset === 0 ? '今週の記録' :
                  currentWeekOffset === -1 ? '先週の記録' :
                  `${Math.abs(currentWeekOffset)}週間前の記録`;

    // 日付範囲
    const startDate = formatDateJp(new Date(dates[0]));
    const endDate = formatDateJp(new Date(dates[6]));
    const dateRange = `${startDate} 〜 ${endDate}`;

    // 今週の目標
    const weekKey = getWeekKey();
    const goals = data.weeklyGoals[weekKey] || [];

    return { title, dateRange, dates, dailyTasks, weekTasks, stamps, goals };
}

// 日付を日本語表記に変換
function formatDateJp(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}

// 今週の目標を表示
function renderSummaryGoals(goals) {
    const container = document.getElementById('summaryGoals');

    if (!goals || goals.length === 0 || (goals.length === 1 && !goals[0])) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = '<h3>📝 今週の目標</h3><ul>' +
        goals.filter(g => g).map(g => `<li>${g}</li>`).join('') +
        '</ul>';
}

// グラフ描画（棒グラフ）
function drawWeeklyChart(dailyTasks) {
    const canvas = document.getElementById('weeklyChart');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // キャンバスクリア
    ctx.clearRect(0, 0, width, height);

    const days = ['月', '火', '水', '木', '金', '土', '日'];
    const barWidth = 40;
    const gap = 10;
    const startX = (width - (barWidth + gap) * 7 + gap) / 2;
    const maxTasks = Math.max(...dailyTasks, 1);
    const maxHeight = height - 50;

    dailyTasks.forEach((tasks, i) => {
        const x = startX + (barWidth + gap) * i;
        const barHeight = (tasks / maxTasks) * maxHeight;
        const y = height - barHeight - 30;

        // グラデーション
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#ffd54f');
        gradient.addColorStop(1, '#ff6f00');

        // 棒グラフ
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // 数値
        ctx.fillStyle = '#5d4037';
        ctx.font = 'bold 14px "M PLUS Rounded 1c"';
        ctx.textAlign = 'center';
        ctx.fillText(tasks, x + barWidth / 2, y - 5);

        // 曜日
        ctx.fillStyle = '#5d4037';
        ctx.font = '12px "M PLUS Rounded 1c"';
        ctx.fillText(days[i], x + barWidth / 2, height - 10);
    });
}

// SNS共有テキスト（週間サマリー用）
function getWeeklySummaryShareText() {
    const weekData = getWeekData();
    return `リモラボ 今週の記録🎉\n\n📊 タスク: ${weekData.weekTasks}個\n🌞 朝活: ${weekData.stamps.morning}回\n🍙 昼活: ${weekData.stamps.lunch}回\n⭐ 夜活: ${weekData.stamps.night}回\n💪 積み上げ: ${weekData.stamps.tsumitage}回\n\n#リモラボ #積み上げタイム`;
}

// データをクリップボードにコピー
// ポップアップ表示（案2: タスク達成時）
function checkTaskMilestone(weekTasks) {
    if (weekTasks === 10 || weekTasks === 20 || weekTasks === 30) {
        showSummaryPrompt(`今週${weekTasks}個達成！記録を見ますか？`, '');
    }
}

// ポップアップ表示（案3: 過去週を見たとき）
function checkPastWeekView() {
    if (currentWeekOffset < 0) {
        const weeksAgo = Math.abs(currentWeekOffset);
        const title = weeksAgo === 1 ? '先週の記録をまとめて見ますか？' : `${weeksAgo}週間前の記録をまとめて見ますか？`;
        showSummaryPrompt(title, '');
    }
}

// ポップアップ表示（案4: 初回アクセス時）
function checkDailyPrompt() {
    const today = getToday();
    const lastPrompt = localStorage.getItem('lastSummaryPrompt');

    if (lastPrompt !== today) {
        localStorage.setItem('lastSummaryPrompt', today);
        setTimeout(() => {
            showSummaryPrompt('今週の記録を確認しますか？', '今週の進捗を振り返ってみましょう！');
        }, 2000);
    }
}

// ポップアップ表示
function showSummaryPrompt(title, message) {
    const modal = document.getElementById('summaryPrompt');
    document.getElementById('promptTitle').textContent = title;
    document.getElementById('promptMessage').textContent = message;
    modal.style.display = 'flex';
}

// ========================================
// 積み上げ統計
// ========================================

function initStats() {
    const statsBtn = document.getElementById('statsBtn');
    const statsModal = document.getElementById('statsModal');
    const closeBtn = statsModal.querySelector('.close-btn');

    // 統計ボタンクリック
    statsBtn.addEventListener('click', () => {
        renderStats();
        statsModal.style.display = 'flex';
    });

    // モーダルを閉じる
    closeBtn.addEventListener('click', () => {
        statsModal.style.display = 'none';
    });

    // モーダル外クリックで閉じる
    statsModal.addEventListener('click', (e) => {
        if (e.target === statsModal) {
            statsModal.style.display = 'none';
        }
    });

    // Threadsシェアボタン
    document.getElementById('shareThreadsStatsBtn').addEventListener('click', () => {
        const text = getStatsShareText();
        const url = `https://threads.net/intent/post?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    });

    // Xシェアボタン
    document.getElementById('shareXStatsBtn').addEventListener('click', () => {
        const text = getStatsShareText();
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    });
}

// 統計を描画
function renderStats() {
    // 累計統計を計算
    const stats = calculateStats();

    // 統計カードに表示
    document.getElementById('totalTasksStats').textContent = stats.totalTasks + '個';
    document.getElementById('maxStreakStats').textContent = stats.maxStreak + '日';
    document.getElementById('avgTasksStats').textContent = stats.avgTasks.toFixed(1);
    document.getElementById('totalStampsStats').textContent = stats.totalStamps + '回';

    // 月間カレンダーを生成
    renderMonthlyCalendar();

    // 実績をチェックして表示
    checkAchievements();
    renderAchievements();
}

// 統計を計算
function calculateStats() {
    // 総タスク数
    const totalTasks = data.totalTasks || 0;

    // 最長連続記録を計算
    const maxStreak = calculateMaxStreak();

    // 平均タスク数/日を計算
    const avgTasks = calculateAvgTasks();

    // 総参加回数を計算
    const totalStamps = calculateTotalStamps();

    return { totalTasks, maxStreak, avgTasks, totalStamps };
}

// 最長連続記録を計算
function calculateMaxStreak() {
    const dates = Object.keys(data.tasks).sort();
    if (dates.length === 0) return 0;

    let maxStreak = 0;
    let currentStreak = 0;
    let prevDate = null;

    dates.forEach(dateStr => {
        if (data.tasks[dateStr] > 0) {
            if (prevDate) {
                const date = new Date(dateStr);
                const prev = new Date(prevDate);
                const diffDays = Math.floor((date - prev) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentStreak++;
                } else {
                    maxStreak = Math.max(maxStreak, currentStreak);
                    currentStreak = 1;
                }
            } else {
                currentStreak = 1;
            }
            prevDate = dateStr;
        }
    });

    return Math.max(maxStreak, currentStreak);
}

// 平均タスク数/日を計算
function calculateAvgTasks() {
    const dates = Object.keys(data.tasks);
    if (dates.length === 0) return 0;

    const totalDays = dates.filter(d => data.tasks[d] > 0).length;
    if (totalDays === 0) return 0;

    return data.totalTasks / totalDays;
}

// 総参加回数を計算
function calculateTotalStamps() {
    let total = 0;
    Object.keys(data.stamps).forEach(dateStr => {
        const dayStamps = data.stamps[dateStr];
        if (dayStamps.morning) total++;
        if (dayStamps.lunch) total++;
        if (dayStamps.night) total++;
        if (dayStamps.tsumitage) total++;
    });
    return total;
}

// 月間カレンダーを生成
function renderMonthlyCalendar() {
    const calendar = document.getElementById('monthlyCalendar');
    calendar.innerHTML = '';

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // 今月の1日
    const firstDay = new Date(year, month, 1);
    // 今月の最終日
    const lastDay = new Date(year, month + 1, 0);

    // 曜日ヘッダー
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    weekdays.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-weekday';
        dayEl.textContent = day;
        calendar.appendChild(dayEl);
    });

    // 月初めの空白セル
    const startDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'calendar-day empty';
        calendar.appendChild(emptyEl);
    }

    // 各日のセル
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const tasks = data.tasks[dateStr] || 0;

        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';

        // タスク数に応じてレベルを設定
        const level = getTaskLevel(tasks);
        dayEl.classList.add(`level-${level}`);

        // 今日の日付をハイライト
        if (dateStr === getToday()) {
            dayEl.classList.add('today');
        }

        // 日付とタスク数を表示
        dayEl.innerHTML = `
            <div class="calendar-date">${day}</div>
            ${tasks > 0 ? `<div class="calendar-tasks">${tasks}</div>` : ''}
        `;

        calendar.appendChild(dayEl);
    }
}

// タスク数からレベルを取得（0-5）
function getTaskLevel(tasks) {
    if (tasks === 0) return 0;
    if (tasks === 1) return 1;
    if (tasks <= 3) return 2;
    if (tasks <= 5) return 3;
    if (tasks <= 8) return 4;
    return 5;
}

// SNS共有テキスト（統計用）
function getStatsShareText() {
    const stats = calculateStats();
    const today = new Date();
    const month = today.getMonth() + 1;

    return `リモラボ ${month}月の積み上げ記録📊\n\n📊 累計タスク: ${stats.totalTasks}個\n🔥 最長連続: ${stats.maxStreak}日\n📅 平均: ${stats.avgTasks.toFixed(1)}個/日\n⭐ 参加回数: ${stats.totalStamps}回\n\n#リモラボ #積み上げタイム`;
}

// ========================================
// バッジ・実績システム
// ========================================

// 実績の定義
const ACHIEVEMENTS = [
    // 連続記録系
    { id: 'streak_3', name: '3日連続', icon: '🔥', condition: () => calculateMaxStreak() >= 3 },
    { id: 'streak_7', name: '1週間連続', icon: '🔥', condition: () => calculateMaxStreak() >= 7 },
    { id: 'streak_14', name: '2週間連続', icon: '🔥', condition: () => calculateMaxStreak() >= 14 },
    { id: 'streak_30', name: '1ヶ月連続', icon: '🔥', condition: () => calculateMaxStreak() >= 30 },

    // 累計タスク系
    { id: 'task_first', name: '初回達成', icon: '🎉', condition: () => data.totalTasks >= 1 },
    { id: 'task_50', name: 'タスク50個', icon: '📊', condition: () => data.totalTasks >= 50 },
    { id: 'task_100', name: 'タスク100個', icon: '📊', condition: () => data.totalTasks >= 100 },
    { id: 'task_300', name: 'タスク300個', icon: '📊', condition: () => data.totalTasks >= 300 },
    { id: 'task_500', name: 'タスク500個', icon: '📊', condition: () => data.totalTasks >= 500 },

    // 参加回数系
    { id: 'stamp_first', name: '初参加', icon: '⭐', condition: () => calculateTotalStamps() >= 1 },
    { id: 'morning_10', name: '朝活10回', icon: '🌞', condition: () => countStampType('morning') >= 10 },
    { id: 'lunch_10', name: '昼活10回', icon: '🍙', condition: () => countStampType('lunch') >= 10 },
    { id: 'night_10', name: '夜活10回', icon: '⭐', condition: () => countStampType('night') >= 10 },
    { id: 'tsumitage_10', name: '積み上げ10回', icon: '💪', condition: () => countStampType('tsumitage') >= 10 },

    // 月間達成系
    { id: 'month_50', name: '月間50タスク', icon: '🎯', condition: () => getMonthlyTasks() >= 50 },
    { id: 'month_100', name: '月間100タスク', icon: '🎯', condition: () => getMonthlyTasks() >= 100 },
    { id: 'month_150', name: '月間150タスク', icon: '🎯', condition: () => getMonthlyTasks() >= 150 }
];

// スタンプの種類別カウント
function countStampType(type) {
    let count = 0;
    Object.keys(data.stamps).forEach(dateStr => {
        if (data.stamps[dateStr][type]) count++;
    });
    return count;
}

// 今月のタスク数を取得
function getMonthlyTasks() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    let count = 0;
    Object.keys(data.tasks).forEach(dateStr => {
        const date = new Date(dateStr);
        if (date.getFullYear() === year && date.getMonth() === month) {
            count += data.tasks[dateStr];
        }
    });
    return count;
}

// 実績をチェックして更新
function checkAchievements() {
    if (!data.achievements) {
        data.achievements = {};
    }

    const newAchievements = [];

    ACHIEVEMENTS.forEach(achievement => {
        if (!data.achievements[achievement.id] && achievement.condition()) {
            data.achievements[achievement.id] = {
                unlocked: true,
                unlockedAt: new Date().toISOString()
            };
            newAchievements.push(achievement);
        }
    });

    if (newAchievements.length > 0) {
        saveData(data);
    }

    return newAchievements;
}

// 実績コレクションを表示
function renderAchievements() {
    const container = document.getElementById('achievementsContainer');
    if (!container) return;

    container.innerHTML = '';

    ACHIEVEMENTS.forEach(achievement => {
        const achievementEl = document.createElement('div');
        achievementEl.className = 'achievement-item';

        const unlocked = data.achievements && data.achievements[achievement.id];
        if (!unlocked) {
            achievementEl.classList.add('locked');
        }

        achievementEl.innerHTML = `
            <div class="achievement-icon">${unlocked ? achievement.icon : '🔒'}</div>
            <div class="achievement-name">${achievement.name}</div>
        `;

        container.appendChild(achievementEl);
    });
}

// ========================================
// Service Worker 登録
// ========================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
