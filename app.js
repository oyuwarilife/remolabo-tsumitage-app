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
        consecutiveDays: 0
    };
}

// データ読み込み
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : getDefaultData();
}

// データ保存
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    initSettings();
    initCelebration();
    checkBackupReminder();
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
            saveData(data);
            updateWeekLog();
        });
    });
}

// ========================================
// タスク完了
// ========================================

function initTaskButton() {
    const taskBtn = document.getElementById('taskCompleteBtn');
    const todayCountEl = document.getElementById('todayCount');
    const totalCountEl = document.getElementById('totalCount');
    const today = getToday();

    // ランダムメッセージ
    const messages = [
        'すごいにゃ！',
        '今日もがんばったにゃ！',
        'えらいにゃ！',
        'その調子にゃ！',
        'コツコツ積み上げ、素敵にゃ！'
    ];

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

        // ランダムメッセージ表示
        showTaskMessage();

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
    }

    function showTaskMessage(customMessage = null) {
        const message = customMessage || messages[Math.floor(Math.random() * messages.length)];

        // メッセージ要素を作成
        const msgEl = document.createElement('div');
        msgEl.className = 'task-message';
        msgEl.textContent = message;
        document.body.appendChild(msgEl);

        // フェードイン
        setTimeout(() => {
            msgEl.classList.add('show');
        }, 10);

        // フェードアウト
        setTimeout(() => {
            msgEl.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(msgEl);
            }, 300);
        }, 2000);
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

        // 連続記録の特別メッセージ
        if (data.consecutiveDays === 3) {
            setTimeout(() => {
                showTaskMessage('3日連続！すごいにゃ🎉');
            }, 500);
        } else if (data.consecutiveDays === 7) {
            setTimeout(() => {
                showTaskMessage('1週間達成！継続の力にゃ✨');
            }, 500);
        } else if (data.consecutiveDays === 14) {
            setTimeout(() => {
                showTaskMessage('2週間連続！素晴らしいにゃ🌟');
            }, 500);
        } else if (data.consecutiveDays === 30) {
            setTimeout(() => {
                showTaskMessage('1ヶ月達成！習慣化できてるにゃ👏');
            }, 500);
        }
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

    prevBtn.addEventListener('click', () => {
        if (currentWeekOffset > -4) {
            currentWeekOffset--;
            updateWeekLog();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentWeekOffset < 0) {
            currentWeekOffset++;
            updateWeekLog();
        }
    });

    updateWeekLog();
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
                    <span class="mini-stamp ${stamps.morning ? 'active' : ''}">☀️</span>
                    <span class="mini-stamp ${stamps.lunch ? 'active' : ''}">🍙</span>
                    <span class="mini-stamp ${stamps.night ? 'active' : ''}">⭐</span>
                    <span class="mini-stamp ${stamps.tsumitage ? 'active' : ''}">💪</span>
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
    const barEl = document.getElementById('monasashiBar');
    const countEl = document.getElementById('monasashiCount');

    // 100個単位での余り（0-100）
    const current = data.totalTasks % 100;

    countEl.textContent = current;

    // 100ブロック生成
    let html = '';
    for (let i = 0; i < 100; i++) {
        const color = getMonasashiColor(i + 1);
        const filled = i < current;
        html += `<div class="monasashi-block" style="background: ${filled ? color : '#f5f5f5'}"></div>`;
    }

    // 現在地ライン（吹き出し風）
    if (current > 0) {
        const percentage = current / 100;
        html += `
            <div class="monasashi-current" style="bottom: ${percentage * 100}%">
                <span class="current-label">今ここ 🎯</span>
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
// 設定モーダル
// ========================================

function initSettings() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeBtn = settingsModal.querySelector('.close-btn');
    const downloadBtn = document.getElementById('downloadBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const deleteAllBtn = document.getElementById('deleteAllBtn');

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('show');
        }
    });

    // CSVダウンロード
    downloadBtn.addEventListener('click', () => {
        exportCSV();
    });

    // CSV復元
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importCSV(file);
        }
        fileInput.value = '';
    });

    // 全データ削除
    deleteAllBtn.addEventListener('click', () => {
        if (confirm('本当に全データを削除しますか？この操作は取り消せません。')) {
            data = getDefaultData();
            saveData(data);
            location.reload();
        }
    });
}

function exportCSV() {
    let csv = '日付,朝活,昼活,夜活,積み上げタイム,タスク完了数\n';

    // 全日付を取得してソート
    const allDates = new Set([
        ...Object.keys(data.stamps),
        ...Object.keys(data.tasks)
    ]);
    const sortedDates = Array.from(allDates).sort();

    sortedDates.forEach(date => {
        const stamps = data.stamps[date] || {};
        const tasks = data.tasks[date] || 0;

        csv += `${date},`;
        csv += `${stamps.morning ? '○' : '×'},`;
        csv += `${stamps.lunch ? '○' : '×'},`;
        csv += `${stamps.night ? '○' : '×'},`;
        csv += `${stamps.tsumitage ? '○' : '×'},`;
        csv += `${tasks}\n`;
    });

    // ダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const today = getToday();

    link.setAttribute('href', url);
    link.setAttribute('download', `remolabo_backup_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // バックアップ日を記録
    data.lastBackupDate = today;
    saveData(data);

    alert('データをダウンロードしました');
}

function importCSV(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');

            // ヘッダー行をスキップ
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const [date, morning, lunch, night, tsumitage, tasks] = line.split(',');

                if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

                // スタンプ
                data.stamps[date] = {
                    morning: morning === '○',
                    lunch: lunch === '○',
                    night: night === '○',
                    tsumitage: tsumitage === '○'
                };

                // タスク
                const taskCount = parseInt(tasks, 10);
                if (!isNaN(taskCount)) {
                    data.tasks[date] = taskCount;
                }
            }

            // 累計タスクを再計算
            data.totalTasks = Object.values(data.tasks).reduce((sum, count) => sum + count, 0);

            saveData(data);
            location.reload();
        } catch (error) {
            alert('ファイル形式が正しくありません');
            console.error(error);
        }
    };

    reader.readAsText(file);
}

function checkBackupReminder() {
    const lastBackup = data.lastBackupDate;
    if (!lastBackup) return;

    const lastBackupDate = new Date(lastBackup);
    const today = new Date();
    const diffDays = Math.floor((today - lastBackupDate) / (1000 * 60 * 60 * 24));

    if (diffDays >= 7) {
        setTimeout(() => {
            if (confirm('📅 1週間経過しました\n\nデータをバックアップして保存しておくことをおすすめするにゃ！\n\n今すぐバックアップしますか？')) {
                exportCSV();
            }
        }, 2000);
    }
}

// ========================================
// お祝い画面
// ========================================

function initCelebration() {
    const modal = document.getElementById('celebrationModal');
    const closeBtn = modal.querySelector('.celebration-close');
    const saveImageBtn = document.getElementById('saveImageBtn');
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

    saveImageBtn.addEventListener('click', () => {
        saveImageBtn.disabled = true;
        saveImageBtn.textContent = '生成中...';

        setTimeout(() => {
            generateCelebrationImage();
            saveImageBtn.disabled = false;
            saveImageBtn.textContent = '📸 画像を保存';
        }, 500);
    });

    shareThreadsBtn.addEventListener('click', () => {
        const milestone = Math.floor(data.totalTasks / 100) * 100;
        const text = getShareText(milestone);
        const url = `https://threads.net/intent/post?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    });

    shareXBtn.addEventListener('click', () => {
        const milestone = Math.floor(data.totalTasks / 100) * 100;
        const text = getShareText(milestone);
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

    // 7色のセグメント
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

    const colors = ['#ff5252', '#4caf50', '#ffd54f', '#2196f3', '#ff9800'];

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

function getShareText(milestone) {
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
