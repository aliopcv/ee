// ==========================================================================
// IQ LIVE - Main Application JavaScript Engine
// ==========================================================================

// قائمة المباريات الأولية (خالية — إدارة المباريات تتم يدويًا من لوحة التحكم)
const defaultMatches = [];

// كلمة مرور لوحة الإدارة
const ADMIN_PASSWORD = "iq00";

// قائمة الأخبار الأولية (خالية — إدارة الأخبار تتم يدويًا من لوحة التحكم)
const defaultNews = [];

// حالة التطبيق الداخلية
let matches = JSON.parse(localStorage.getItem('iqLiveMatches')) || defaultMatches;
let newsList = JSON.parse(localStorage.getItem('iqLiveNews')) || defaultNews;
let editingNewsId = null;
let currentLeagueFilter = 'all';
let currentDateFilter = 'today';
let currentSearchQuery = '';
let activeMatchForPlayer = null;



// شعار غلاف افتراضي في حالة تعذر تحميل الصورة
const DEFAULT_CREST = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='none' stroke='%2300ff87' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'/%3E%3Cpath d='M2 12h20'/%3E%3C/svg%3E";



// ==========================================================================
// حساب وتحديث العداد التنازلي للمباريات
// ==========================================================================
function getCountdownData(matchTimeISO) {
    const matchTime = new Date(matchTimeISO).getTime();
    const now = Date.now();
    const diff = matchTime - now;

    if (isNaN(matchTime) || diff <= 0) {
        return { isStarted: true, hours: '00', minutes: '00', seconds: '00', formatted: 'ينطلق الآن ⚡' };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = n => String(n).padStart(2, '0');
    return {
        isStarted: false,
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
        formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    };
}

let countdownInterval = null;
function startCountdownTimerLoop() {
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        document.querySelectorAll('.cd-timer-val').forEach(el => {
            const timeISO = el.dataset.time;
            if (timeISO) {
                const cd = getCountdownData(timeISO);
                el.textContent = cd.formatted;
            }
        });

        const spotlightHours = document.getElementById('cd-hours');
        const spotlightMins = document.getElementById('cd-mins');
        const spotlightSecs = document.getElementById('cd-secs');
        if (spotlightHours && spotlightHours.dataset.time) {
            const cd = getCountdownData(spotlightHours.dataset.time);
            spotlightHours.textContent = cd.hours;
            if (spotlightMins) spotlightMins.textContent = cd.minutes;
            if (spotlightSecs) spotlightSecs.textContent = cd.seconds;
        }
    }, 1000);
}

// ==========================================================================
// تحديث واجهة المستخدم الرئيسية
// ==========================================================================
function updateUI() {
    saveMatches();
    saveNews();
    displayFeaturedMatch();
    renderMatches();
    renderNews();
    updateLiveBadge();
    updateTicker();
    startCountdownTimerLoop();
}

function saveNews() {
    localStorage.setItem('iqLiveNews', JSON.stringify(newsList));
}

function saveMatches() {
    localStorage.setItem('iqLiveMatches', JSON.stringify(matches));
}

// ==========================================================================
// عرض بطاقة المباراة القمة البارزة Spotlight
// ==========================================================================
function displayFeaturedMatch() {
    const featuredContainer = document.getElementById('featuredMatch');
    const featuredMatch = matches.find(m => m.isFeatured) || matches.find(m => m.status === 'live') || matches[0];
    
    if (!featuredMatch) {
        document.getElementById('featuredSection').style.display = 'none';
        return;
    }

    document.getElementById('featuredSection').style.display = 'block';

    const isLive = featuredMatch.status === 'live';
    const isFinished = featuredMatch.status === 'finished';
    const cd = getCountdownData(featuredMatch.time);

    const featuredDateObj = new Date(featuredMatch.time);
    const featuredTimeFormatted = featuredDateObj.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

    let statusText = isLive 
        ? `<span class="featured-status-tag"><span class="pulse-dot"></span> مباشر الآن</span>` 
        : (isFinished ? `<span class="featured-status-tag" style="color: var(--text-secondary)">انتهت المباراة</span>` : `<span class="featured-status-tag" style="color: var(--accent-cyan)"><i class="far fa-hourglass"></i> تنطلق قريباً</span>`);

    let centerBoxHtml = '';
    if (isLive || isFinished) {
        centerBoxHtml = `
            <div class="featured-score-box">
                <span>${featuredMatch.homeScore}</span>
                <span style="font-size: 20px; color: var(--text-secondary)">:</span>
                <span>${featuredMatch.awayScore}</span>
            </div>
        `;
    } else {
        centerBoxHtml = `
            <div class="spotlight-time-header">
                <i class="far fa-clock"></i> توقيت الانطلاق: ${featuredTimeFormatted}
            </div>
            <div class="spotlight-countdown-container">
                <div class="spotlight-countdown-unit">
                    <span class="spotlight-countdown-num" id="cd-hours" data-time="${featuredMatch.time}">${cd.hours}</span>
                    <span class="spotlight-countdown-txt">ساعة</span>
                </div>
                <div class="spotlight-countdown-sep">:</div>
                <div class="spotlight-countdown-unit">
                    <span class="spotlight-countdown-num" id="cd-mins">${cd.minutes}</span>
                    <span class="spotlight-countdown-txt">دقيقة</span>
                </div>
                <div class="spotlight-countdown-sep">:</div>
                <div class="spotlight-countdown-unit">
                    <span class="spotlight-countdown-num" id="cd-secs">${cd.seconds}</span>
                    <span class="spotlight-countdown-txt">ثانية</span>
                </div>
            </div>
        `;
    }

    featuredContainer.innerHTML = `
        <div class="featured-header-badge">
            <i class="fas fa-star"></i> مباراة القمة - ${featuredMatch.league}
        </div>
        <div class="featured-body">
            <div class="featured-team">
                <img src="${featuredMatch.homeLogo || DEFAULT_CREST}" alt="${featuredMatch.homeTeam}" class="team-crest" onerror="this.src='${DEFAULT_CREST}'">
                <span class="featured-team-name">${featuredMatch.homeTeam}</span>
            </div>
            
            <div class="featured-center">
                ${statusText}
                ${centerBoxHtml}
                <div style="font-size: 13px; color: var(--text-secondary);">
                    <i class="fas fa-microphone"></i> ${featuredMatch.commentator || 'تعليق عربي'} | <i class="fas fa-tv"></i> ${featuredMatch.channel || 'IQ LIVE HD'}
                </div>
                <button class="featured-btn" onclick="watchMatch(${featuredMatch.id})">
                    <i class="fas fa-play-circle"></i> ${isLive ? 'شاهد البث المباشر 4K' : 'تفاصيل والتغطية'}
                </button>
            </div>
            
            <div class="featured-team">
                <img src="${featuredMatch.awayLogo || DEFAULT_CREST}" alt="${featuredMatch.awayTeam}" class="team-crest" onerror="this.src='${DEFAULT_CREST}'">
                <span class="featured-team-name">${featuredMatch.awayTeam}</span>
            </div>
        </div>
    `;
}

// دالة توحيد الحروف العربية لمطابقة تامة وبدون مشاكل الهمزات
function normalizeArabic(str) {
    if (!str) return '';
    return str
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .toLowerCase()
        .trim();
}

// ==========================================================================
// تصفية وعرض قائمة المباريات (Grid)
// ==========================================================================
function renderMatches() {
    const matchesGrid = document.getElementById('matchesGrid');
    const noMatches = document.getElementById('noMatches');

    let filtered = matches.filter(m => {
        // League Filter (ربط تام مع الدوري المحدد من لوحة الأدمن)
        let matchLeague = true;
        if (currentLeagueFilter === 'live') {
            matchLeague = m.status === 'live';
        } else if (currentLeagueFilter !== 'all') {
            const normFilter = normalizeArabic(currentLeagueFilter);
            const normLeague = normalizeArabic(m.league);
            matchLeague = normLeague.includes(normFilter) || normFilter.includes(normLeague);
        }

        // Search Filter
        let matchSearch = true;
        if (currentSearchQuery.trim() !== '') {
            const q = currentSearchQuery.toLowerCase();
            const normQ = normalizeArabic(q);
            matchSearch = normalizeArabic(m.homeTeam).includes(normQ) || 
                          normalizeArabic(m.awayTeam).includes(normQ) || 
                          normalizeArabic(m.league).includes(normQ) || 
                          (m.commentator && normalizeArabic(m.commentator).includes(normQ));
        }

        // Date Filter
        let matchDate = true;
        if (currentDateFilter && currentLeagueFilter !== 'live') {
            matchDate = (m.dateCategory === currentDateFilter) || (!m.dateCategory && currentDateFilter === 'today');
        }

        return matchLeague && matchSearch && matchDate;
    });

    if (filtered.length === 0) {
        matchesGrid.style.display = 'none';
        noMatches.style.display = 'block';
        return;
    }

    matchesGrid.style.display = 'grid';
    noMatches.style.display = 'none';

    matchesGrid.innerHTML = filtered.map(match => {
        const isLive = match.status === 'live';
        const isFinished = match.status === 'finished';
        
        const matchDateObj = new Date(match.time);
        const timeFormatted = matchDateObj.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
        const cd = getCountdownData(match.time);

        let statusBadge = '';
        if (isLive) {
            statusBadge = `<span class="status-badge live"><span class="pulse-dot"></span> مباشر</span>`;
        } else if (isFinished) {
            statusBadge = `<span class="status-badge finished">انتهت</span>`;
        } else {
            statusBadge = `<span class="status-badge upcoming"><i class="far fa-clock"></i> ${timeFormatted}</span>`;
        }

        return `
            <div class="match-card ${isLive ? 'is-live' : ''}" onclick="watchMatch(${match.id})">
                <div class="card-top-info">
                    <span class="league-tag"><i class="fas fa-trophy"></i> ${match.league}</span>
                    ${statusBadge}
                </div>

                <div class="card-teams">
                    <div class="team-side">
                        <img src="${match.homeLogo || DEFAULT_CREST}" class="card-crest" alt="${match.homeTeam}" onerror="this.src='${DEFAULT_CREST}'">
                        <span class="team-name">${match.homeTeam}</span>
                    </div>

                    <div class="score-center">
                        ${isLive || isFinished ? `
                            <div class="live-score">${match.homeScore} - ${match.awayScore}</div>
                        ` : `
                            <div class="vs-text">VS</div>
                            <div class="countdown-box">
                                <div class="cd-kickoff-time"><i class="far fa-clock"></i> ${timeFormatted}</div>
                                <div class="cd-timer-row">
                                    <span class="cd-label"><i class="far fa-hourglass"></i> متبقي</span>
                                    <span class="cd-timer cd-timer-val" data-time="${match.time}">${cd.formatted}</span>
                                </div>
                            </div>
                        `}
                    </div>

                    <div class="team-side">
                        <img src="${match.awayLogo || DEFAULT_CREST}" class="card-crest" alt="${match.awayTeam}" onerror="this.src='${DEFAULT_CREST}'">
                        <span class="team-name">${match.awayTeam}</span>
                    </div>
                </div>

                <div class="card-footer-info">
                    <div class="meta-detail">
                        <i class="fas fa-tv"></i> ${match.channel || 'beIN Sports'}
                    </div>
                    <button class="watch-card-btn">
                        <i class="fas fa-play"></i> ${isLive ? 'شاهد البث' : 'تفاصيل والتوقيت'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================================================
// فلاتر البطولات والتاريخ والبحث
// ==========================================================================
function filterLeague(leagueName, btnElement) {
    currentLeagueFilter = leagueName;
    document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderMatches();
}

function filterDate(dateType, btnElement) {
    currentDateFilter = dateType;
    document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));

    const target = btnElement || document.querySelector(`.date-btn[onclick*="${dateType}"]`);
    if (target) target.classList.add('active');

    const titleEl = document.getElementById('matchesSectionTitle');
    const subTitleEl = document.getElementById('matchesDateText');

    if (dateType === 'yesterday') {
        if (titleEl) titleEl.innerHTML = `<i class="fas fa-history highlight-icon"></i> مباريات الأمس`;
        if (subTitleEl) subTitleEl.textContent = 'نتائج وملخصات مواجهات الأمس';
    } else if (dateType === 'tomorrow') {
        if (titleEl) titleEl.innerHTML = `<i class="fas fa-calendar-plus highlight-icon"></i> مباريات الغد`;
        if (subTitleEl) subTitleEl.textContent = 'جدول ومواعيد مواجهات الغد المرتقبة';
    } else {
        if (titleEl) titleEl.innerHTML = `<i class="fas fa-trophy highlight-icon"></i> مباريات اليوم`;
        if (subTitleEl) subTitleEl.textContent = 'تغطية مباشرة وشاملة لأهم مواجهات اليوم';
    }

    renderMatches();
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    currentSearchQuery = searchInput.value;
    renderMatches();
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    currentSearchQuery = '';
    renderMatches();
}

function resetFilters() {
    currentLeagueFilter = 'all';
    currentDateFilter = 'today';
    currentSearchQuery = '';
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
    document.querySelector('.filter-chip[data-filter="all"]').classList.add('active');
    renderMatches();
}

function updateLiveBadge() {
    const liveCount = matches.filter(m => m.status === 'live').length;
    document.getElementById('liveBadgeCount').textContent = liveCount;
}

function updateTicker() {
    const ticker = document.getElementById('tickerContent');
    const liveMatches = matches.filter(m => m.status === 'live');

    if (liveMatches.length > 0) {
        const liveString = liveMatches.map(m => `🔴 [${m.league}] ${m.homeTeam} (${m.homeScore}) - (${m.awayScore}) ${m.awayTeam}`).join(' &nbsp;&nbsp;&bull;&nbsp;&nbsp; ');
        ticker.innerHTML = `<span>${liveString}</span>`;
    } else {
        ticker.innerHTML = `<span>🔥 مرحباً بكم في عراق لايف (IRAQ LIVE) - المنصة الأقوى لمتابعة البث المباشر لمباريات اليوم بأعلى جودة وبدون تقطيع!</span>`;
    }
}

// ==========================================================================
// الصفحة المخصصة للبث المباشر (Dedicated Watch Page Navigation)
// ==========================================================================
function watchMatch(matchId) {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    activeMatchForPlayer = match;

    // إخفاء الواجهة الرئيسية وإظهار صفحة البث المخصصة
    document.getElementById('homeView').style.display = 'none';
    document.getElementById('watchView').style.display = 'block';

    // التمرير لأعلى الصفحة بثبات
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // تحديث الهيدر المساري Breadcrumb
    document.getElementById('watchLeagueBreadcrumb').textContent = match.league;
    document.getElementById('watchTeamsBreadcrumb').textContent = `${match.homeTeam} vs ${match.awayTeam}`;

    // إعداد كارت النتيجة والبيانات العليا Scoreboard
    const isLive = match.status === 'live';
    const isFinished = match.status === 'finished';
    const matchDateObj = new Date(match.time);
    const timeFormatted = matchDateObj.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    const cd = getCountdownData(match.time);

    let statusText = isLive 
        ? `<span class="featured-status-tag"><span class="pulse-dot"></span> بث مباشر الآن</span>` 
        : (isFinished ? `<span class="featured-status-tag" style="color: var(--text-secondary)">انتهت المباراة</span>` : `<span class="featured-status-tag" style="color: var(--accent-cyan)"><i class="far fa-hourglass"></i> تنطلق قريباً</span>`);

    let scoreHtml = isLive || isFinished 
        ? `<div class="featured-score-box"><span>${match.homeScore}</span><span style="font-size: 20px; color: var(--text-secondary)">:</span><span>${match.awayScore}</span></div>`
        : `<div class="countdown-box"><div class="cd-kickoff-time"><i class="far fa-clock"></i> ${timeFormatted}</div><div class="cd-timer-row"><span class="cd-label">متبقي</span><span class="cd-timer cd-timer-val" data-time="${match.time}">${cd.formatted}</span></div></div>`;

    document.getElementById('watchScoreboard').innerHTML = `
        <div class="featured-header-badge">
            <i class="fas fa-tv"></i> تغطية مباشرة - ${match.league}
        </div>
        <div class="featured-body">
            <div class="featured-team">
                <img src="${match.homeLogo || DEFAULT_CREST}" alt="${match.homeTeam}" class="team-crest" onerror="this.src='${DEFAULT_CREST}'">
                <span class="featured-team-name">${match.homeTeam}</span>
            </div>
            
            <div class="featured-center">
                ${statusText}
                ${scoreHtml}
            </div>
            
            <div class="featured-team">
                <img src="${match.awayLogo || DEFAULT_CREST}" alt="${match.awayTeam}" class="team-crest" onerror="this.src='${DEFAULT_CREST}'">
                <span class="featured-team-name">${match.awayTeam}</span>
            </div>
        </div>
    `;

    // إعداد أزرار السيرفرات والجودة
    const watchServersBar = document.getElementById('watchServersBar');
    watchServersBar.innerHTML = `
        <span class="servers-label"><i class="fas fa-server"></i> اختر السيرفر:</span>
        <button class="server-btn active" onclick="switchDedicatedServer('${match.streamUrl}', this)"><i class="fas fa-bolt"></i> سيرفر 1 (4K)</button>
        ${match.server2Url ? `<button class="server-btn" onclick="switchDedicatedServer('${match.server2Url}', this)"><i class="fas fa-video"></i> سيرفر 2 (HD 1080p)</button>` : ''}
        ${match.server3Url ? `<button class="server-btn" onclick="switchDedicatedServer('${match.server3Url}', this)"><i class="fas fa-signal"></i> سيرفر 3 (SD 480p)</button>` : ''}
    `;

    // تشغيل الشاشة الرئيسية للبث
    const iframe = document.getElementById('watchStreamFrame');
    const overlay = document.getElementById('watchScreenOverlay');
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
    iframe.src = match.streamUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ';

    iframe.onload = () => {
        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
        }, 500);
    };

    // القناة والمعلق
    document.getElementById('watchChannel').textContent = match.channel || 'beIN Sports HD 1';
    document.getElementById('watchCommentator').textContent = match.commentator || 'تعليق عربي';

    // تعبئة المباريات الأخرى في القائمة الجانبية
    renderSidebarMatches(match.id);

    // تحديث الهاش في الرابط
    window.location.hash = `watch-${match.id}`;
}

function goHome() {
    document.getElementById('watchView').style.display = 'none';
    document.getElementById('homeView').style.display = 'block';

    const iframe = document.getElementById('watchStreamFrame');
    if (iframe) iframe.src = '';

    history.pushState("", document.title, window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchDedicatedServer(url, btnElement) {
    const iframe = document.getElementById('watchStreamFrame');
    const overlay = document.getElementById('watchScreenOverlay');

    document.querySelectorAll('#watchServersBar .server-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
    iframe.src = url;

    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
    }, 500);
}

function renderSidebarMatches(currentMatchId) {
    const container = document.getElementById('sidebarLiveMatches');
    const otherMatches = matches.filter(m => m.id !== currentMatchId);

    if (otherMatches.length === 0) {
        container.innerHTML = `<p style="font-size: 12px; color: var(--text-secondary)">لا توجد مباريات أخرى حالياً.</p>`;
        return;
    }

    container.innerHTML = otherMatches.map(m => `
        <div class="sidebar-match-item" onclick="watchMatch(${m.id})">
            <div class="sidebar-match-teams">
                <span>${m.homeTeam} vs ${m.awayTeam}</span>
                <span class="sidebar-match-score">${m.status === 'live' ? `${m.homeScore}-${m.awayScore}` : 'VS'}</span>
            </div>
            <div class="sidebar-match-meta">
                <span>${m.league}</span>
                <span>${m.status === 'live' ? '🔴 مباشر' : 'قريباً'}</span>
            </div>
        </div>
    `).join('');
}

function checkHashRoute() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#watch-')) {
        const matchId = parseInt(hash.replace('#watch-', ''));
        if (matchId) {
            watchMatch(matchId);
        }
    }
}

function closePlayer() {
    goHome();
}

function toggleCinemaMode() {
    document.body.classList.toggle('cinema-mode');
    showToast(document.body.classList.contains('cinema-mode') ? 'تم تفعيل وضع السينما 🌙' : 'تم إلغاء وضع السينما ☀️');
}

function reportStream() {
    showToast('تم إرسال بلاغك بنجاح! سنقوم بفحص السيرفر في الحال 🛠️');
}

function shareMatch() {
    if (navigator.clipboard && activeMatchForPlayer) {
        navigator.clipboard.writeText(window.location.href);
        showToast('تم نسخ رابط المباراة إلى الحافظة! 📋');
    }
}


// ==========================================================================
// لوحة الإدارة المشرفين (Admin Modal)
// ==========================================================================

// الاختصار السري: النقر على اللوجو 5 مرات متتالية خلال 3 ثوانٍ
let _secretClickCount = 0;
let _secretClickTimer = null;
const SECRET_CLICKS_REQUIRED = 5;
const SECRET_CLICK_WINDOW_MS = 3000;

function handleSecretLogoClick(e) {
    e.preventDefault();
    _secretClickCount++;

    if (_secretClickTimer) clearTimeout(_secretClickTimer);

    if (_secretClickCount >= SECRET_CLICKS_REQUIRED) {
        _secretClickCount = 0;
        // توجيه إلى صفحة الدخول المخصصة
        window.location.href = 'admin.html';
        return;
    }

    _secretClickTimer = setTimeout(() => {
        _secretClickCount = 0;
    }, SECRET_CLICK_WINDOW_MS);
}

function openAdmin() {
    document.getElementById('adminModal').classList.add('active');
}

function closeAdmin() {
    document.getElementById('adminModal').classList.remove('active');
    // إعادة تعيين النموذج وإخفاء لوحة التحكم عند الإغلاق لحماية البيانات
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}


function adminLogin() {
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput.value === ADMIN_PASSWORD) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        updateAdminDashboard();
        showToast('تم تسجيل الدخول بنجاح! مرحباً بك أستاذ علي 👑');
    } else {
        showToast('كلمة المرور غير صحيحة! حاول مجدداً', 'error');
    }
}

function updateAdminDashboard() {
    document.getElementById('totalMatchesCount').textContent = matches.length;
    document.getElementById('adminLiveCount').textContent = matches.filter(m => m.status === 'live').length;



    const adminMatchesList = document.getElementById('adminMatchesList');
    adminMatchesList.innerHTML = matches.map(match => {
        const dateCatText = match.dateCategory === 'yesterday' ? '⏪ الأمس' : (match.dateCategory === 'tomorrow' ? '⏩ الغد' : '📅 اليوم');
        return `
            <div class="admin-match-item" id="admin-item-${match.id}">
                <div class="admin-item-info">
                    <span class="admin-item-teams">${match.homeTeam} (${match.homeScore}) vs (${match.awayScore}) ${match.awayTeam}</span>
                    <div style="font-size: 11px; color: var(--text-secondary);">${match.league} | ${match.status === 'live' ? '🔴 مباشر' : match.status} | <span style="color: var(--accent-cyan); font-weight: bold;">${dateCatText}</span></div>
                </div>

                <div class="admin-item-actions">
                    <button class="score-control-btn" onclick="adjustScore(${match.id}, 'home', 1)" title="+ نتيجة المضيف">+</button>
                    <button class="score-control-btn" onclick="adjustScore(${match.id}, 'home', -1)" title="- نتيجة المضيف">-</button>
                    <span style="color: var(--accent-emerald); font-weight: bold; margin: 0 4px;">|</span>
                    <button class="score-control-btn" onclick="adjustScore(${match.id}, 'away', 1)" title="+ نتيجة الضيف">+</button>
                    <button class="score-control-btn" onclick="adjustScore(${match.id}, 'away', -1)" title="- نتيجة الضيف">-</button>

                    <button class="status-toggle-btn" onclick="toggleStatus(${match.id})">
                        ${match.status === 'live' ? 'إنهاء المباراة' : (match.status === 'upcoming' ? 'بدء البث' : 'قريباً')}
                    </button>

                    <button class="edit-match-btn" onclick="editMatch(${match.id})" title="تعديل المباراة">
                        <i class="fas fa-pen"></i>
                    </button>

                    <button class="delete-match-btn" onclick="deleteMatch(${match.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    updateAdminNewsList();
}

// متغيرات حفظ شعارات الملفات المرفوعة من الجهاز
let uploadedHomeLogoBase64 = '';
let uploadedAwayLogoBase64 = '';

// معرّف المباراة قيد التعديل (null = وضع الإضافة)
let editingMatchId = null;

function handleLogoFileSelect(input, previewId, teamType) {
    const file = input.files && input.files[0];
    const previewImg = document.getElementById(previewId);

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            if (teamType === 'home') {
                uploadedHomeLogoBase64 = dataUrl;
            } else if (teamType === 'away') {
                uploadedAwayLogoBase64 = dataUrl;
            }
            if (previewImg) {
                previewImg.src = dataUrl;
                previewImg.style.display = 'inline-block';
            }
        };
        reader.readAsDataURL(file);
    } else {
        if (teamType === 'home') uploadedHomeLogoBase64 = '';
        if (teamType === 'away') uploadedAwayLogoBase64 = '';
        if (previewImg) previewImg.style.display = 'none';
    }
}

function toggleCustomLeagueInput(selectEl) {
    const customInput = document.getElementById('customMatchLeague');
    if (!customInput) return;
    if (selectEl.value === 'custom') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
    }
}

function getSelectedLeagueValue() {
    const selectEl = document.getElementById('matchLeague');
    const customInput = document.getElementById('customMatchLeague');
    if (!selectEl) return 'الدوري الإسباني';

    if (selectEl.value === 'custom') {
        return customInput ? customInput.value.trim() : '';
    }
    return selectEl.value.trim();
}

// تعبئة النموذج ببيانات مباراة للتعديل
function editMatch(matchId) {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    editingMatchId = matchId;

    // تعبئة الحقول ببيانات المباراة
    document.getElementById('matchHomeTeam').value = match.homeTeam || '';
    document.getElementById('matchHomeLogo').value = (match.homeLogo && !match.homeLogo.startsWith('data:')) ? match.homeLogo : '';
    document.getElementById('matchAwayTeam').value = match.awayTeam || '';
    document.getElementById('matchAwayLogo').value = (match.awayLogo && !match.awayLogo.startsWith('data:')) ? match.awayLogo : '';
    
    // ضبط اختيار البطولة من القائمة أو حقل البطولة المخصصة
    const selectLeagueEl = document.getElementById('matchLeague');
    const customLeagueInput = document.getElementById('customMatchLeague');
    if (selectLeagueEl) {
        const matchLeagueVal = match.league || 'الدوري الإسباني';
        const hasOption = Array.from(selectLeagueEl.options).some(opt => opt.value === matchLeagueVal);
        if (hasOption) {
            selectLeagueEl.value = matchLeagueVal;
            if (customLeagueInput) customLeagueInput.style.display = 'none';
        } else {
            selectLeagueEl.value = 'custom';
            if (customLeagueInput) {
                customLeagueInput.style.display = 'block';
                customLeagueInput.value = matchLeagueVal;
            }
        }
    }

    document.getElementById('matchChannel').value = match.channel || '';
    document.getElementById('matchCommentator').value = match.commentator || '';
    document.getElementById('matchStreamUrl').value = match.streamUrl || '';
    document.getElementById('matchIsFeatured').checked = match.isFeatured || false;

    if (document.getElementById('matchStatus')) document.getElementById('matchStatus').value = match.status || 'live';
    if (document.getElementById('matchDateCategory')) document.getElementById('matchDateCategory').value = match.dateCategory || 'today';

    // معاينة الشعارات إذا كانت base64
    if (match.homeLogo && match.homeLogo.startsWith('data:')) {
        uploadedHomeLogoBase64 = match.homeLogo;
        const prev = document.getElementById('matchHomeLogoPreview');
        if (prev) { prev.src = match.homeLogo; prev.style.display = 'inline-block'; }
    }
    if (match.awayLogo && match.awayLogo.startsWith('data:')) {
        uploadedAwayLogoBase64 = match.awayLogo;
        const prev = document.getElementById('matchAwayLogoPreview');
        if (prev) { prev.src = match.awayLogo; prev.style.display = 'inline-block'; }
    }

    // تحويل وقت المباراة لتنسيق datetime-local
    if (match.time) {
        try {
            const d = new Date(match.time);
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            document.getElementById('matchTime').value = local;
        } catch(e) {}
    }

    // تحويل عنوان النموذج وأزرار التحكم إلى وضع التعديل
    const titleEl = document.getElementById('formCardTitle');
    const iconEl = document.getElementById('formCardTitleIcon');
    const submitBtn = document.getElementById('submitMatchBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    if (titleEl) titleEl.textContent = `تعديل مباراة: ${match.homeTeam} vs ${match.awayTeam}`;
    if (iconEl) { iconEl.className = 'fas fa-pen'; }
    if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات'; }
    if (cancelBtn) cancelBtn.style.display = 'flex';

    // تمييز المباراة في القائمة
    document.querySelectorAll('.admin-match-item').forEach(el => el.classList.remove('editing-highlight'));
    const item = document.getElementById(`admin-item-${matchId}`);
    if (item) item.classList.add('editing-highlight');

    // التمرير للأعلى نحو النموذج
    const formCard = document.getElementById('adminFormCard');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    showToast(`📝 وضع التعديل: ${match.homeTeam} vs ${match.awayTeam}`);
}

// حفظ تعديلات المباراة أو إضافة مباراة جديدة
function addMatch() {
    // إذا كنا في وضع التعديل، احفظ التعديلات
    if (editingMatchId !== null) {
        saveMatchEdit();
        return;
    }

    const homeTeam = document.getElementById('matchHomeTeam').value.trim();
    const homeLogoInputUrl = document.getElementById('matchHomeLogo').value.trim();
    const awayTeam = document.getElementById('matchAwayTeam').value.trim();
    const awayLogoInputUrl = document.getElementById('matchAwayLogo').value.trim();

    const homeLogo = uploadedHomeLogoBase64 || homeLogoInputUrl;
    const awayLogo = uploadedAwayLogoBase64 || awayLogoInputUrl;

    const league = getSelectedLeagueValue();
    const time = document.getElementById('matchTime').value;
    const channel = document.getElementById('matchChannel').value.trim();
    const commentator = document.getElementById('matchCommentator').value.trim();
    const streamUrl = document.getElementById('matchStreamUrl').value.trim();
    const isFeatured = document.getElementById('matchIsFeatured').checked;

    const status = document.getElementById('matchStatus') ? document.getElementById('matchStatus').value : 'live';
    const dateCategory = document.getElementById('matchDateCategory') ? document.getElementById('matchDateCategory').value : 'today';

    if (!homeTeam || !awayTeam || !league || !streamUrl) {
        showToast('يرجى ملء جميع البيانات الأساسية واختيار البطولة للمباراة!', 'error');
        return;
    }

    if (isFeatured) {
        matches.forEach(m => m.isFeatured = false);
    }

    const newMatch = {
        id: Date.now(),
        homeTeam,
        homeLogo,
        awayTeam,
        awayLogo,
        league,
        time: time ? new Date(time).toISOString() : new Date().toISOString(),
        streamUrl,
        server2Url: "",
        server3Url: "",
        status: status,
        homeScore: 0,
        awayScore: 0,
        channel: channel || "IQ LIVE HD",
        commentator: commentator || "تعليق مباشر",
        isFeatured: isFeatured,
        dateCategory: dateCategory
    };

    matches.unshift(newMatch);
    updateUI();
    updateAdminDashboard();
    resetMatchForm();
    filterDate(dateCategory);

    const dateName = dateCategory === 'yesterday' ? 'الأمس' : (dateCategory === 'tomorrow' ? 'الغد' : 'اليوم');
    showToast(`تمت إضافة المباراة بنجاح في قسم مباريات ${dateName}! 🚀`);
}

// حفظ التعديلات على مباراة موجودة
function saveMatchEdit() {
    const match = matches.find(m => m.id === editingMatchId);
    if (!match) { cancelMatchEdit(); return; }

    const homeTeam = document.getElementById('matchHomeTeam').value.trim();
    const awayTeam = document.getElementById('matchAwayTeam').value.trim();
    const league = getSelectedLeagueValue();
    const streamUrl = document.getElementById('matchStreamUrl').value.trim();

    if (!homeTeam || !awayTeam || !league || !streamUrl) {
        showToast('يرجى ملء جميع البيانات الأساسية!', 'error');
        return;
    }

    const homeLogoInputUrl = document.getElementById('matchHomeLogo').value.trim();
    const awayLogoInputUrl = document.getElementById('matchAwayLogo').value.trim();
    const isFeatured = document.getElementById('matchIsFeatured').checked;
    const time = document.getElementById('matchTime').value;

    if (isFeatured) matches.forEach(m => m.isFeatured = false);

    match.homeTeam = homeTeam;
    match.homeLogo = uploadedHomeLogoBase64 || homeLogoInputUrl || match.homeLogo;
    match.awayTeam = awayTeam;
    match.awayLogo = uploadedAwayLogoBase64 || awayLogoInputUrl || match.awayLogo;
    match.league = league;
    match.channel = document.getElementById('matchChannel').value.trim() || match.channel;
    match.commentator = document.getElementById('matchCommentator').value.trim() || match.commentator;
    match.streamUrl = streamUrl;
    match.isFeatured = isFeatured;
    match.status = document.getElementById('matchStatus') ? document.getElementById('matchStatus').value : match.status;
    match.dateCategory = document.getElementById('matchDateCategory') ? document.getElementById('matchDateCategory').value : match.dateCategory;
    if (time) match.time = new Date(time).toISOString();

    updateUI();
    updateAdminDashboard();
    filterDate(match.dateCategory);
    cancelMatchEdit();

    const dateName = match.dateCategory === 'yesterday' ? 'الأمس' : (match.dateCategory === 'tomorrow' ? 'الغد' : 'اليوم');
    showToast(`✅ تم حفظ تعديلات المباراة في قسم مباريات ${dateName}!`);
}

// إلغاء وضع التعديل والعودة لوضع الإضافة
function cancelMatchEdit() {
    editingMatchId = null;

    const titleEl = document.getElementById('formCardTitle');
    const iconEl = document.getElementById('formCardTitleIcon');
    const submitBtn = document.getElementById('submitMatchBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    if (titleEl) titleEl.textContent = 'إضافة مباراة جديدة';
    if (iconEl) { iconEl.className = 'fas fa-plus-circle'; }
    if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة المباراة فوراً'; }
    if (cancelBtn) cancelBtn.style.display = 'none';

    document.querySelectorAll('.admin-match-item').forEach(el => el.classList.remove('editing-highlight'));
    resetMatchForm();
}

// إعادة تعيين حقول النموذج
function resetMatchForm() {
    document.getElementById('matchHomeTeam').value = '';
    document.getElementById('matchHomeLogo').value = '';
    document.getElementById('matchHomeLogoFile').value = '';
    document.getElementById('matchHomeLogoPreview').style.display = 'none';
    uploadedHomeLogoBase64 = '';

    document.getElementById('matchAwayTeam').value = '';
    document.getElementById('matchAwayLogo').value = '';
    document.getElementById('matchAwayLogoFile').value = '';
    document.getElementById('matchAwayLogoPreview').style.display = 'none';
    uploadedAwayLogoBase64 = '';

    const selectLeagueEl = document.getElementById('matchLeague');
    const customLeagueInput = document.getElementById('customMatchLeague');
    if (selectLeagueEl) selectLeagueEl.value = 'الدوري الإسباني';
    if (customLeagueInput) {
        customLeagueInput.value = '';
        customLeagueInput.style.display = 'none';
    }

    document.getElementById('matchTime').value = '';
    document.getElementById('matchChannel').value = '';
    document.getElementById('matchCommentator').value = '';
    document.getElementById('matchStreamUrl').value = '';
    if (document.getElementById('matchStatus')) document.getElementById('matchStatus').value = 'live';
    if (document.getElementById('matchDateCategory')) document.getElementById('matchDateCategory').value = 'today';
    document.getElementById('matchIsFeatured').checked = false;
}

function adjustScore(matchId, team, delta) {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    if (team === 'home') {
        match.homeScore = Math.max(0, match.homeScore + delta);
    } else {
        match.awayScore = Math.max(0, match.awayScore + delta);
    }

    updateUI();
    updateAdminDashboard();
}

function toggleStatus(matchId) {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    if (match.status === 'upcoming') {
        match.status = 'live';
    } else if (match.status === 'live') {
        match.status = 'finished';
    } else {
        match.status = 'upcoming';
    }

    updateUI();
    updateAdminDashboard();
}

function deleteMatch(matchId) {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذه المباراة؟')) {
        matches = matches.filter(m => m.id !== matchId);
        updateUI();
        updateAdminDashboard();
        showToast('تم حذف المباراة');
    }
}

function toggleAmbientGlow() {
    const glow1 = document.querySelector('.bg-glow-1');
    const glow2 = document.querySelector('.bg-glow-2');
    if (glow1.style.display === 'none') {
        glow1.style.display = 'block';
        glow2.style.display = 'block';
        showToast('تم تفعيل الإضاءة المحيطة ✨');
    } else {
        glow1.style.display = 'none';
        glow2.style.display = 'none';
        showToast('تم إيقاف الإضاءة المحيطة');
    }
}

// ==========================================================================
// التنبيهات المنبثقة Toast
// ==========================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') {
        toast.style.borderColor = 'var(--live-red)';
    }

    toast.innerHTML = `<i class="${type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'}"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================================================
// قسم إدارة وعرض آخر الأخبار (Latest News Management & Rendering)
// ==========================================================================

function renderNews() {
    const container = document.getElementById('newsListContainer');
    if (!container) return;

    if (!newsList || newsList.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 25px 10px; font-size: 13px;">لا توجد أخبار منشورة حالياً</div>`;
        return;
    }

    container.innerHTML = newsList.map(item => {
        const categoryClean = item.category ? item.category.trim() : 'أخرى';
        const hasImg = item.image && item.image.trim() !== '';
        return `
            <article class="news-item-card" onclick="openNewsModal(${item.id})">
                ${hasImg ? `<img src="${item.image}" alt="${item.title}" class="news-item-thumb" onerror="this.style.display='none'">` : ''}
                <div class="news-item-header">
                    <span class="news-cat-badge cat-${categoryClean}">${item.category || 'خبر'}</span>
                    <span class="news-date"><i class="far fa-clock"></i> ${item.date || 'الآن'}</span>
                </div>
                <h3 class="news-item-title">${item.title}</h3>
                <p class="news-item-snippet">${item.body}</p>
                <div class="news-read-more">
                    <span>اقرأ التفاصيل الكاملة</span>
                    <i class="fas fa-chevron-left"></i>
                </div>
            </article>
        `;
    }).join('');
}

function openNewsModal(newsId) {
    const item = newsList.find(n => n.id === newsId);
    if (!item) return;

    const modal = document.getElementById('newsArticleModal');
    const modalImg = document.getElementById('newsModalImg');
    const modalCategory = document.getElementById('newsModalCategory');
    const modalDate = document.getElementById('newsModalDate');
    const modalTitle = document.getElementById('newsModalTitle');
    const modalBody = document.getElementById('newsModalBody');

    if (modalImg) {
        if (item.image && item.image.trim() !== '') {
            modalImg.src = item.image;
            modalImg.style.display = 'block';
        } else {
            modalImg.style.display = 'none';
        }
    }

    if (modalCategory) {
        const categoryClean = item.category ? item.category.trim() : 'أخرى';
        modalCategory.className = `news-cat-badge cat-${categoryClean}`;
        modalCategory.textContent = item.category || 'خبر';
    }

    if (modalDate) modalDate.innerHTML = `<i class="far fa-clock"></i> ${item.date || 'الآن'}`;
    if (modalTitle) modalTitle.textContent = item.title;
    if (modalBody) modalBody.textContent = item.body;

    if (modal) modal.classList.add('active');
}

function closeNewsModal() {
    const modal = document.getElementById('newsArticleModal');
    if (modal) modal.classList.remove('active');
}

let uploadedNewsImageBase64 = '';

function handleNewsFileSelect(input) {
    const file = input.files && input.files[0];
    const previewImg = document.getElementById('newsImagePreview');
    const removeBtn = document.getElementById('removeNewsImgBtn');

    if (file) {
        if (!file.type.startsWith('image/')) {
            showToast('يرجى اختيار ملف صورة صالح!', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedNewsImageBase64 = e.target.result;
            if (previewImg) {
                previewImg.src = uploadedNewsImageBase64;
                previewImg.style.display = 'block';
            }
            if (removeBtn) {
                removeBtn.style.display = 'inline-flex';
            }
        };
        reader.readAsDataURL(file);
    }
}

function removeNewsImage() {
    uploadedNewsImageBase64 = '';
    const fileInput = document.getElementById('newsFileInput');
    const previewImg = document.getElementById('newsImagePreview');
    const removeBtn = document.getElementById('removeNewsImgBtn');

    if (fileInput) fileInput.value = '';
    if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
    }
    if (removeBtn) removeBtn.style.display = 'none';
}

function updateAdminNewsList() {
    const adminNewsList = document.getElementById('adminNewsList');
    const countEl = document.getElementById('adminNewsCount');
    if (!adminNewsList) return;

    if (countEl) countEl.textContent = `(${newsList.length} خبر)`;

    if (newsList.length === 0) {
        adminNewsList.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 15px; font-size: 13px;">لا توجد أخبار منشورة بعد</div>`;
        return;
    }

    adminNewsList.innerHTML = newsList.map(item => `
        <div class="admin-match-item" id="admin-news-${item.id}">
            <div class="admin-item-info">
                <span class="admin-item-teams">${item.title}</span>
                <div style="font-size: 11px; color: var(--text-secondary);">${item.category || 'عام'} | ${item.date || 'الآن'}</div>
            </div>

            <div class="admin-item-actions">
                <button class="edit-match-btn" onclick="editNews(${item.id})" title="تعديل الخبر">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="delete-match-btn" onclick="deleteNews(${item.id})" title="حذف الخبر">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function addNews() {
    const titleInput = document.getElementById('newsTitle');
    const bodyInput = document.getElementById('newsBody');
    const categoryInput = document.getElementById('newsCategory');

    if (!titleInput || !bodyInput) return;

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    let image = uploadedNewsImageBase64;
    const category = categoryInput ? categoryInput.value : 'انتقالات';

    if (!title || !body) {
        showToast('يرجى إدخال عنوان الخبر ونصه أولاً!', 'error');
        return;
    }

    if (editingNewsId !== null) {
        // تعديل خبر قائم
        const index = newsList.findIndex(n => n.id === editingNewsId);
        if (index !== -1) {
            newsList[index].title = title;
            newsList[index].body = body;
            newsList[index].image = image || newsList[index].image || '';
            newsList[index].category = category;
            showToast('تم حفظ تعديلات الخبر بنجاح! 📝');
        }
        editingNewsId = null;
    } else {
        // إضافة خبر جديد
        const newPost = {
            id: Date.now(),
            title: title,
            body: body,
            image: image,
            category: category,
            date: 'منذ لحظات'
        };
        newsList.unshift(newPost);
        showToast('تم نشر الخبر في قسم آخر الأخبار! 📰');
    }

    saveNews();
    resetNewsForm();
    renderNews();
    updateAdminNewsList();
}

function editNews(id) {
    const item = newsList.find(n => n.id === id);
    if (!item) return;

    editingNewsId = id;
    document.getElementById('newsTitle').value = item.title;
    document.getElementById('newsBody').value = item.body;
    document.getElementById('newsCategory').value = item.category || 'انتقالات';

    if (item.image) {
        uploadedNewsImageBase64 = item.image;
        const previewImg = document.getElementById('newsImagePreview');
        const removeBtn = document.getElementById('removeNewsImgBtn');
        if (previewImg) {
            previewImg.src = item.image;
            previewImg.style.display = 'block';
        }
        if (removeBtn) removeBtn.style.display = 'inline-flex';
    } else {
        removeNewsImage();
    }

    const submitBtn = document.getElementById('submitNewsBtn');
    const cancelBtn = document.getElementById('cancelNewsEditBtn');

    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
        submitBtn.style.background = 'linear-gradient(135deg, #00f0ff, #0088ff)';
    }
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    const adminNewsCard = document.querySelector('.admin-news-card');
    if (adminNewsCard) adminNewsCard.scrollIntoView({ behavior: 'smooth' });
}

function cancelNewsEdit() {
    editingNewsId = null;
    resetNewsForm();
}

function resetNewsForm() {
    document.getElementById('newsTitle').value = '';
    document.getElementById('newsBody').value = '';
    document.getElementById('newsCategory').value = 'انتقالات';
    removeNewsImage();

    const submitBtn = document.getElementById('submitNewsBtn');
    const cancelBtn = document.getElementById('cancelNewsEditBtn');

    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> نشر الخبر';
        submitBtn.style.background = 'linear-gradient(135deg, var(--accent-emerald), #00c96a)';
    }
    if (cancelBtn) cancelBtn.style.display = 'none';
}




function deleteNews(id) {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذا الخبر؟')) {
        newsList = newsList.filter(n => n.id !== id);
        saveNews();
        renderNews();
        updateAdminNewsList();
        showToast('تم حذف الخبر بنجاح 🗑️');
    }
}

// Esc Key Listener
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePlayer();
        closeAdmin();
        closeNewsModal();
    }
});


window.addEventListener('hashchange', checkHashRoute);

// فحص المصادقة لدى تحميل الصفحة (توجيه من admin.html)
function checkAdminAuth() {
    if (window.location.hash === '#admin-panel' && sessionStorage.getItem('iqAdminAuth') === 'true') {
        // تأخير بسيط لضمان تحميل الصفحة كاملاً
        setTimeout(() => {
            openAdmin();
            // تخطي شاشة كلمة المرور وفتح لوحة التحكم مباشرة
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('dashboardSection').style.display = 'block';
            updateAdminDashboard();
            // تنظيف الهاش
            history.replaceState(null, '', window.location.pathname);
        }, 300);
    }
}

// Initial startup
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    checkHashRoute();
    checkAdminAuth();

});