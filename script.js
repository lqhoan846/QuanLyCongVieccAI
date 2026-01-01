/* =============================================
   QUẢN LÝ CÔNG VIỆC BẰNG AI - JAVASCRIPT
   Created by: LamQuocHoan
   ============================================= */

// ===============================
// 🔑 CẤU HÌNH API - NHẬP KEY TẠI ĐÂY
// ===============================
const CONFIG = {
    GEMINI_API_KEY: 'AIzaSyDBjTdRx528XjC58s_T5kdtuHdbQXaTez8',  // ← THAY API KEY VÀO ĐÂY
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
};

// ===============================
// BIẾN TOÀN CỤC
// ===============================
let APP = {
    userId: null,
    userData: null,
    deletedTask: null,
    undoTimer: null,
    editingTaskId: null,
    pendingTask: null,
    conflictTask: null,
    contextTaskId: null
};

const ICONS = ['⭐','🌟','✨','💫','🎉','🎊','💖','❤️','💜','💙','💚','💛','🧡','🌈','🌸','🌺','🌻','🌼','🎀','🎁','🍀','🦋','🐝','🌙','☀️','⚡','🔥','💧','🎵','🎶','🚀','✈️','🎯','🎨','💎','👑','🏆'];

const HOLIDAYS = {
    '1/1': 'Tết Dương lịch',
    '14/2': 'Valentine',
    '8/3': 'Quốc tế Phụ nữ',
    '30/4': 'Giải phóng miền Nam',
    '1/5': 'Quốc tế Lao động',
    '1/6': 'Quốc tế Thiếu nhi',
    '2/9': 'Quốc khánh',
    '20/10': 'Phụ nữ Việt Nam',
    '20/11': 'Nhà giáo Việt Nam',
    '24/12': 'Giáng sinh'
};

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

// ===============================
// KHỞI ĐỘNG
// ===============================
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
        APP.userId = id;
        loadUserData();
        showPage('dashboard-page');
        initDashboard();
    } else {
        showPage('landing-page');
        initLanding();
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// ===============================
// TRANG LANDING
// ===============================
function initLanding() {
    document.getElementById('btn-create').addEventListener('click', createNewSpace);
    document.getElementById('btn-copy').addEventListener('click', copyLink);
}

function createNewSpace() {
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const newLink = `${window.location.origin}${window.location.pathname}?id=${newId}`;
    
    document.getElementById('link-output').value = newLink;
    
    // Lưu data mới
    const newData = { id: newId, name: '', tasks: [], createdAt: Date.now() };
    localStorage.setItem(`tm_${newId}`, JSON.stringify(newData));
    
    // Animation
    const btn = document.getElementById('btn-create');
    btn.innerHTML = '<i class="fas fa-check"></i> ĐÃ TẠO!';
    btn.style.background = 'linear-gradient(135deg, #10B981, #34D399)';
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-plus-circle"></i> TẠO KHÔNG GIAN RIÊNG';
        btn.style.background = '';
    }, 2000);
}

function copyLink() {
    const input = document.getElementById('link-output');
    const btn = document.getElementById('btn-copy');
    
    if (!input.value) {
        alert('Hãy tạo link trước!');
        return;
    }
    
    navigator.clipboard.writeText(input.value).then(() => {
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-copy"></i>';
            btn.classList.remove('copied');
        }, 2000);
    });
}

// ===============================
// QUẢN LÝ DỮ LIỆU
// ===============================
function loadUserData() {
    const data = localStorage.getItem(`tm_${APP.userId}`);
    APP.userData = data ? JSON.parse(data) : { id: APP.userId, name: '', tasks: [], createdAt: Date.now() };
    cleanOldTasks();
}

function saveUserData() {
    localStorage.setItem(`tm_${APP.userId}`, JSON.stringify(APP.userData));
}

function cleanOldTasks() {
    const fourWeeksAgo = Date.now() - (28 * 24 * 60 * 60 * 1000);
    APP.userData.tasks = APP.userData.tasks.filter(t => new Date(t.date).getTime() >= fourWeeksAgo);
    saveUserData();
}

// ===============================
// DASHBOARD
// ===============================
function initDashboard() {
    if (!APP.userData.name) showModal('modal-welcome');
    
    initDashboardEvents();
    renderSchedules();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setInterval(randomAIMessage, 600000);
}

function initDashboardEvents() {
    // Welcome
    document.getElementById('btn-start').onclick = () => {
        const name = document.getElementById('input-username').value.trim();
        if (!name) return alert('Nhập tên đi bạn!');
        APP.userData.name = name;
        saveUserData();
        hideModal('modal-welcome');
        setAIMessage(`Chào ${name}! Tui sẵn sàng giúp cậu nè! 🎉`);
    };
    
    // Help
    document.getElementById('btn-help').onclick = () => showModal('modal-help');
    
    // Add task
    document.getElementById('btn-add').onclick = handleAddTask;
    document.getElementById('input-task').onkeypress = (e) => { if (e.key === 'Enter') handleAddTask(); };
    
    // History & Future
    document.getElementById('btn-history').onclick = () => { renderHistoryWeeks(); showModal('modal-history'); };
    document.getElementById('btn-future').onclick = () => { renderFutureWeeks(); showModal('modal-future'); };
    
    // Close modals
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.onclick = () => hideModal(btn.dataset.close);
    });
    
    // Context menu
    document.getElementById('ctx-edit').onclick = () => { hideContextMenu(); openEditModal(); };
    document.getElementById('ctx-delete').onclick = () => { hideContextMenu(); deleteTask(APP.contextTaskId); };
    
    // Undo
    document.getElementById('btn-undo').onclick = undoDelete;
    
    // Conflict
    document.getElementById('btn-replace').onclick = replaceConflictTask;
    document.getElementById('btn-cancel-conflict').onclick = () => hideModal('modal-conflict');
    
    // Edit
    document.getElementById('btn-save-edit').onclick = saveEditTask;
    document.getElementById('btn-cancel-edit').onclick = () => hideModal('modal-edit');
    
    // Close context on click outside
    document.onclick = (e) => { if (!e.target.closest('.context-menu') && !e.target.closest('.task-item')) hideContextMenu(); };
}

// ===============================
// THÊM CÔNG VIỆC
// ===============================
// ===============================
// 🤖 XỬ LÝ CÔNG VIỆC VỚI AI - PHIÊN BẢN MỚI
// ===============================

async function handleAddTask() {
    const input = document.getElementById('input-task');
    const text = input.value.trim();
    
    if (!text) {
        setAIMessage(`${APP.userData.name || 'Bạn'} ơi, nhập gì đó đi chứ! 😅`);
        return;
    }
    
    showLoading(true);
    setAIMessage('Đợi tui phân tích chút nha... 🤔');
    
    try {
        // Lấy ngày hiện tại
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const dayOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][today.getDay()];
        
        // Tạo prompt chi tiết cho AI
        const prompt = `Bạn là trợ lý phân tích công việc. Nhiệm vụ: Phân tích câu tiếng Việt và trích xuất thông tin.

THÔNG TIN QUAN TRỌNG:
- Hôm nay là: ${dayOfWeek}, ngày ${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}
- Ngày hôm nay dạng ISO: ${todayStr}

QUY TẮC PHÂN TÍCH:
1. "hôm nay" = ${todayStr}
2. "ngày mai" = ngày tiếp theo
3. "T2/Thứ 2" = Thứ Hai tuần này hoặc tuần sau (nếu đã qua)
4. "T3/Thứ 3" = Thứ Ba, tương tự cho T4, T5, T6, T7, CN
5. "2/1" hoặc "2/1/2026" = ngày 2 tháng 1 năm 2026
6. "sáng" mặc định = 8:00, "chiều" = 14:00, "tối" = 19:00
7. "20h-22h" = từ 20:00 đến 22:00
8. "20h tới 22h" = từ 20:00 đến 22:00
9. Nếu chỉ có giờ bắt đầu, giờ kết thúc = giờ bắt đầu + 1 tiếng

CÂU CẦN PHÂN TÍCH: "${text}"

TRẢ VỀ ĐÚNG FORMAT JSON (KHÔNG CÓ GÌ KHÁC):
{
  "success": true,
  "taskName": "tên công việc ngắn gọn",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM"
}

HOẶC nếu thiếu thông tin:
{
  "success": false,
  "error": "mô tả thiếu gì"
}

CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH GÌ THÊM.`;

        // Gọi Gemini API
        const response = await fetch(`${CONFIG.API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 500
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        // Lấy text response
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!responseText) {
            throw new Error('Empty response');
        }
        
        console.log('AI Response:', responseText); // Debug
        
        // Parse JSON từ response
        const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found');
        }
        
        const result = JSON.parse(jsonMatch[0]);
        console.log('Parsed result:', result); // Debug
        
        // Xử lý kết quả
        if (!result.success) {
            const errorMsg = result.error || 'Thiếu thông tin';
            setAIMessage(`${APP.userData.name || 'Bạn'} ơi, ${errorMsg}. Thử nhập kiểu: "Họp team 9h-11h ngày 5/1" nha! 📝`);
            showLoading(false);
            return;
        }
        
        // Validate dữ liệu
        if (!result.taskName || !result.date || !result.startTime || !result.endTime) {
            setAIMessage(`Tui cần biết: tên việc, ngày, giờ bắt đầu và kết thúc nha! 🤔`);
            showLoading(false);
            return;
        }
        
        const taskData = {
            name: result.taskName,
            date: result.date,
            startTime: result.startTime,
            endTime: result.endTime
        };
        
        // Kiểm tra ngày hợp lệ
        const validation = validateTaskTime(taskData);
        if (!validation.valid) {
            setAIMessage(validation.message);
            showLoading(false);
            return;
        }
        
        // Kiểm tra trùng lịch
        const conflict = checkConflict(taskData);
        if (conflict) {
            APP.pendingTask = taskData;
            APP.conflictTask = conflict;
            showConflictModal(conflict);
            showLoading(false);
            return;
        }
        
        // Thêm task thành công
        addTask(taskData);
        input.value = '';
        setAIMessage(`Tuyệt vời ${APP.userData.name || 'bạn'}! Đã thêm "${taskData.name}" vào ${formatDate(taskData.date)} lúc ${taskData.startTime}! 🎉`);
        
    } catch (error) {
        console.error('Error:', error);
        setAIMessage(`Úi, có lỗi rồi! Thử nhập rõ hơn nha, ví dụ: "Học bài 20h-22h ngày 2/1" 😅`);
    }
    
    showLoading(false);
}

function validateTaskTime(task) {
    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 28);
    
    // Kiểm tra ngày hợp lệ
    if (isNaN(taskDate.getTime())) {
        return { valid: false, message: 'Ngày không hợp lệ! Thử lại nha 📅' };
    }
    
    // Kiểm tra quá khứ
    if (taskDate < today) {
        return { valid: false, message: 'Ngày này qua rồi! Tui không quay ngược thời gian được đâu 😅' };
    }
    
    // Kiểm tra quá xa
    if (taskDate > maxDate) {
        return { valid: false, message: 'Xa quá 4 tuần rồi! Gần gần thôi nha 📅' };
    }
    
    // Kiểm tra giờ hợp lệ
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(task.startTime) || !timeRegex.test(task.endTime)) {
        return { valid: false, message: 'Giờ không hợp lệ! Dùng format HH:MM nha ⏰' };
    }
    
    return { valid: true };
}

function checkConflict(newTask) {
    const toMin = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + (m || 0);
    };
    
    return APP.userData.tasks.find(task => {
        if (task.date !== newTask.date) return false;
        const ns = toMin(newTask.startTime), ne = toMin(newTask.endTime);
        const es = toMin(task.startTime), ee = toMin(task.endTime);
        return ns < ee && ne > es;
    });
}

function addTask(data) {
    const task = {
        id: Date.now().toString(),
        name: data.name,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        color: Math.floor(Math.random() * 8),
        createdAt: Date.now()
    };
    
    APP.userData.tasks.push(task);
    saveUserData();
    renderSchedules();
    createFireworks();
}

function validateTaskTime(task) {
    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 28);
    
    if (taskDate < today) {
        return { valid: false, message: 'Ngày này qua rồi! Tui không quay ngược thời gian được đâu 😅' };
    }
    
    if (taskDate > maxDate) {
        return { valid: false, message: 'Xa quá 4 tuần rồi! Gần gần thôi nha 📅' };
    }
    
    return { valid: true };
}

function checkConflict(newTask) {
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    
    return APP.userData.tasks.find(task => {
        if (task.date !== newTask.date) return false;
        const ns = toMin(newTask.startTime), ne = toMin(newTask.endTime);
        const es = toMin(task.startTime), ee = toMin(task.endTime);
        return ns < ee && ne > es;
    });
}

function addTask(data) {
    const task = {
        id: Date.now().toString(),
        name: data.name,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        color: Math.floor(Math.random() * 8),
        createdAt: Date.now()
    };
    
    APP.userData.tasks.push(task);
    saveUserData();
    renderSchedules();
    createFireworks();
}

function showConflictModal(conflict) {
    document.getElementById('conflict-info').innerHTML = `
        <strong>Công việc trùng:</strong><br>
        📌 ${conflict.name}<br>
        🕐 ${conflict.startTime} - ${conflict.endTime}<br>
        📅 ${formatDate(conflict.date)}
    `;
    showModal('modal-conflict');
}

function replaceConflictTask() {
    if (!APP.pendingTask || !APP.conflictTask) return;
    
    APP.userData.tasks = APP.userData.tasks.filter(t => t.id !== APP.conflictTask.id);
    addTask(APP.pendingTask);
    
    hideModal('modal-conflict');
    APP.pendingTask = null;
    APP.conflictTask = null;
    
    document.getElementById('input-task').value = '';
    setAIMessage('Đã thay thế công việc cũ! 👍');
}

// ===============================
// RENDER LỊCH
// ===============================
function renderSchedules() {
    renderWeekGrid('grid-this-week', getWeekDates(0), false);
    renderWeekGrid('grid-next-week', getWeekDates(1), true);
}

function getWeekDates(offset) {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + (offset * 7));
    
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function renderWeekGrid(gridId, dates, mini) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    
    dates.forEach((date, i) => {
        const col = document.createElement('div');
        col.className = 'day-col';
        
        const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
        const fullDate = formatDateISO(date);
        const holiday = HOLIDAYS[dateStr];
        const lunar = getLunarDate(date);
        
        // Header
        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerHTML = `
            <div class="day-name">${DAY_NAMES[i]}</div>
            <div class="day-date">${dateStr}/${date.getFullYear()}</div>
            <div class="day-lunar">${lunar}</div>
            ${holiday ? `<div class="day-holiday">${holiday}</div>` : ''}
        `;
        col.appendChild(header);
        
        // Tasks
        const tasksDiv = document.createElement('div');
        tasksDiv.className = 'day-tasks';
        
        const dayTasks = APP.userData.tasks
            .filter(t => t.date === fullDate)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        dayTasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = `task-item task-color-${task.color}`;
            taskEl.dataset.id = task.id;
            taskEl.innerHTML = `
                <div class="task-time">${task.startTime} - ${task.endTime}</div>
                <div class="task-name">${task.name}</div>
            `;
            
            // Click trái - hiệu ứng + thông báo AI
            taskEl.onclick = (e) => {
                e.stopPropagation();
                createIconBurst(e.clientX, e.clientY);
                generateTaskReminder(task);
            };
            
            // Click phải - context menu
            taskEl.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                APP.contextTaskId = task.id;
                showContextMenu(e.clientX, e.clientY);
            };
            
            tasksDiv.appendChild(taskEl);
        });
        
        col.appendChild(tasksDiv);
        grid.appendChild(col);
    });
}

// ===============================
// LỊCH SỬ & TƯƠNG LAI
// ===============================
function renderHistoryWeeks() {
    const container = document.getElementById('history-content');
    container.innerHTML = '';
    
    for (let i = 1; i <= 4; i++) {
        const dates = getWeekDates(-i);
        const card = createWeekCard(dates, -i);
        container.appendChild(card);
    }
}

function renderFutureWeeks() {
    const container = document.getElementById('future-content');
    container.innerHTML = '';
    
    for (let i = 2; i <= 5; i++) {
        const dates = getWeekDates(i - 1);
        const card = createWeekCard(dates, i - 1);
        container.appendChild(card);
    }
}

function createWeekCard(dates, offset) {
    const card = document.createElement('div');
    card.className = 'week-card';
    
    const start = dates[0];
    const end = dates[6];
    const title = `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
    
    const tasks = APP.userData.tasks.filter(t => {
        const taskDate = new Date(t.date);
        return taskDate >= start && taskDate <= end;
    });
    
    card.innerHTML = `
        <h3>${title}</h3>
        <div class="week-card-tasks">
            ${tasks.length ? tasks.slice(0, 5).map(t => `• ${t.name}`).join('<br>') + (tasks.length > 5 ? `<br>...và ${tasks.length - 5} việc khác` : '') : '<em>Không có công việc</em>'}
        </div>
    `;
    
    card.onclick = () => {
        alert(`Chi tiết tuần ${title}:\n\n${tasks.length ? tasks.map(t => `• ${t.name} (${t.date} ${t.startTime}-${t.endTime})`).join('\n') : 'Không có công việc'}`);
    };
    
    return card;
}

// ===============================
// XÓA & CHỈNH SỬA
// ===============================
function deleteTask(id) {
    const task = APP.userData.tasks.find(t => t.id === id);
    if (!task) return;
    
    APP.deletedTask = { ...task };
    APP.userData.tasks = APP.userData.tasks.filter(t => t.id !== id);
    saveUserData();
    renderSchedules();
    
    showUndoToast();
    setAIMessage('Đã xóa công việc! Bấm hoàn tác nếu cậu đổi ý nha 😊');
}

function showUndoToast() {
    const toast = document.getElementById('toast-undo');
    toast.classList.add('active');
    
    clearTimeout(APP.undoTimer);
    APP.undoTimer = setTimeout(() => {
        toast.classList.remove('active');
        APP.deletedTask = null;
    }, 10000);
}

function undoDelete() {
    if (!APP.deletedTask) return;
    
    APP.userData.tasks.push(APP.deletedTask);
    saveUserData();
    renderSchedules();
    
    document.getElementById('toast-undo').classList.remove('active');
    clearTimeout(APP.undoTimer);
    APP.deletedTask = null;
    
    setAIMessage('Đã khôi phục công việc! 🎉');
}

function openEditModal() {
    const task = APP.userData.tasks.find(t => t.id === APP.contextTaskId);
    if (!task) return;
    
    APP.editingTaskId = task.id;
    document.getElementById('input-edit').value = `${task.name} ${task.startTime}-${task.endTime} ${formatDate(task.date)}`;
    showModal('modal-edit');
}

async function saveEditTask() {
    const text = document.getElementById('input-edit').value.trim();
    if (!text) return;
    
    showLoading(true);
    
    try {
        const parsed = await parseTaskWithAI(text);
        
        if (!parsed.success) {
            setAIMessage(parsed.message);
            showLoading(false);
            return;
        }
        
        const validation = validateTaskTime(parsed.data);
        if (!validation.valid) {
            setAIMessage(validation.message);
            showLoading(false);
            return;
        }
        
        // Cập nhật task
        const task = APP.userData.tasks.find(t => t.id === APP.editingTaskId);
        if (task) {
            task.name = parsed.data.name;
            task.date = parsed.data.date;
            task.startTime = parsed.data.startTime;
            task.endTime = parsed.data.endTime;
            saveUserData();
            renderSchedules();
        }
        
        hideModal('modal-edit');
        setAIMessage('Đã cập nhật công việc! ✅');
        
    } catch (e) {
        setAIMessage('Có lỗi rồi, thử lại nha! 😅');
    }
    
    showLoading(false);
}

// ===============================
// CONTEXT MENU
// ===============================
function showContextMenu(x, y) {
    const menu = document.getElementById('context-menu');
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('active');
}

function hideContextMenu() {
    document.getElementById('context-menu').classList.remove('active');
}

// ===============================
// MODAL
// ===============================
function showModal(id) {
    document.getElementById(id).classList.add('active');
}

function hideModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showLoading(show) {
    document.getElementById('loading').classList.toggle('active', show);
}

// ===============================
// AI MESSAGE
// ===============================
function setAIMessage(msg) {
    const bubble = document.getElementById('ai-message');
    bubble.style.animation = 'none';
    bubble.offsetHeight;
    bubble.style.animation = 'bubbleIn 0.3s ease';
    bubble.textContent = msg;
}

function randomAIMessage() {
    const name = APP.userData.name || 'bạn';
    const messages = [
        `${name} ơi, nghỉ ngơi chút đi nha! ☕`,
        `Cậu đang làm tốt lắm ${name}! 💪`,
        `${name} nhớ uống nước nha! 💧`,
        `Tui luôn ở đây hỗ trợ ${name} nè! 🤗`,
        `${name} có muốn thêm công việc gì không? 📝`,
        `Chúc ${name} một ngày tuyệt vời! 🌟`,
        `${name} ơi, cố lên nha! 🚀`
    ];
    setAIMessage(messages[Math.floor(Math.random() * messages.length)]);
}

async function generateTaskReminder(task) {
    const name = APP.userData.name || 'bạn';
    
    try {
        const res = await fetch(`${CONFIG.API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Tạo 1 câu nhắc nhở dễ thương ngắn gọn (dưới 50 từ) cho ${name} về công việc "${task.name}" lúc ${task.startTime}. Xưng "tui" gọi "${name}". Thêm emoji.` }] }]
            })
        });
        
        const data = await res.json();
        const msg = data.candidates?.[0]?.content?.parts?.[0]?.text || `${name} nhớ làm "${task.name}" lúc ${task.startTime} nha! 💪`;
        setAIMessage(msg);
    } catch (e) {
        setAIMessage(`${name} nhớ làm "${task.name}" lúc ${task.startTime} nha! 💪`);
    }
}

// ===============================
// HIỆU ỨNG
// ===============================
function createFireworks() {
    const container = document.getElementById('effects-container');
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    
    for (let i = 0; i < 30; i++) {
        const fw = document.createElement('div');
        fw.className = 'firework';
        fw.style.left = (Math.random() * 100) + '%';
        fw.style.top = (Math.random() * 100) + '%';
        fw.style.background = colors[Math.floor(Math.random() * colors.length)];
        fw.style.animationDelay = (Math.random() * 0.5) + 's';
        container.appendChild(fw);
        
        setTimeout(() => fw.remove(), 1500);
    }
}

function createIconBurst(x, y) {
    const container = document.getElementById('effects-container');
    const icon = ICONS[Math.floor(Math.random() * ICONS.length)];
    
    for (let i = 0; i < 8; i++) {
        const el = document.createElement('div');
        el.className = 'burst-icon';
        el.textContent = icon;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.transform = `rotate(${i * 45}deg)`;
        container.appendChild(el);
        
        setTimeout(() => el.remove(), 1000);
    }
}

// ===============================
// THỜI GIAN
// ===============================
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('current-time').textContent = now.toLocaleDateString('vi-VN', options);
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function formatDateISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Tính lịch âm (đơn giản hóa)
function getLunarDate(date) {
    // Thuật toán đơn giản - trong thực tế cần thư viện chuyên dụng
    const lunarMonths = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'M.Một', 'Chạp'];
    
    // Ước tính đơn giản (không chính xác 100%)
    const offset = Math.floor((date.getTime() - new Date(2024, 0, 22).getTime()) / (29.5 * 24 * 60 * 60 * 1000));
    const lunarDay = ((date.getDate() + offset) % 30) + 1;
    const lunarMonth = (date.getMonth() + Math.floor(offset / 30)) % 12;
    
    return `${lunarDay} Th.${lunarMonths[lunarMonth]}`;
}

// ===============================
// KẾT THÚC
// ===============================
console.log('🚀 Task Manager by LamQuocHoan - Loaded!');
