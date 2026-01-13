let currentTab = 'new';

/* ================= AUTH ================= */

// Auto-login if token exists
if (localStorage.getItem('anonToken')) {
    showFeed();
}

async function login() {
    const email = document.getElementById('email-input').value.trim();

    if (!email.endsWith('@iub.edu.bd')) {
        return alert("Use your @iub.edu.bd email only");
    }

    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (data.success) {
        localStorage.setItem('anonToken', data.token);
        showFeed();
    } else {
        alert(data.error || "Login failed");
    }
}

function showFeed() {
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('main-feed').style.display = 'block';
    load();
}

/* ================= POSTS ================= */

async function load() {
    const res = await fetch('/api/posts');
    const posts = await res.json();
    render(posts);
    checkNotifs(posts);
}

function render(posts) {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';

    document.getElementById('feed-list').innerHTML = posts.map(p => `
        <div class="post glass-card">
            <div class="post-content">${escapeHTML(p.content)}</div>

            <div class="actions">
                <span class="action-item" onclick="like(${p.id})">♥ ${p.likes}</span>
                <span class="action-item" onclick="toggleRep(${p.id})">Reply</span>
                <span class="time">
                    ${new Date(p.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                </span>
                ${isAdmin ? `<span class="action-item delete" onclick="del(${p.id})">Delete</span>` : ''}
            </div>

            <div id="reply-input-${p.id}" class="reply-input-wrap" style="display:none">
                <input type="text" placeholder="Type a reply..."
                       onkeydown="if(event.key==='Enter') sendReply(${p.id}, this)">
            </div>

            <div class="replies-list">
                ${p.replies.map(r =>
                    `<div class="reply-item">↳ ${escapeHTML(r.content)}</div>`
                ).join('')}
            </div>
        </div>
    `).join('');
}

async function createPost() {
    const box = document.getElementById('post-box');
    if (!box.value.trim()) return;

    const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('anonToken')}`
        },
        body: JSON.stringify({ content: box.value })
    });

    if (!res.ok) return alert("Not authorized");

    const post = await res.json();

    let mine = JSON.parse(localStorage.getItem('my_posts') || '[]');
    mine.push(post.id);
    localStorage.setItem('my_posts', JSON.stringify(mine));

    box.value = '';
    load();
}

/* ================= REPLIES / LIKES ================= */

async function like(id) {
    await fetch(`/api/posts/${id}/like`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('anonToken')}`
        }
    });
    load();
}

async function sendReply(id, el) {
    if (!el.value.trim()) return;

    await fetch(`/api/posts/${id}/reply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('anonToken')}`
        },
        body: JSON.stringify({ content: el.value })
    });

    el.value = '';
    load();
}

function toggleRep(id) {
    const el = document.getElementById(`reply-input-${id}`);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

/* ================= ADMIN ================= */

window.loginAdmin = (pw) => {
    sessionStorage.setItem('isAdmin', 'true');
    sessionStorage.setItem('apw', pw);
    load();
};

async function del(id) {
    if (!confirm("Delete this post?")) return;

    await fetch(`/api/posts/${id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: sessionStorage.getItem('apw') })
    });

    load();
}

/* ================= NOTIFICATIONS ================= */

function checkNotifs(posts) {
    let mine = JSON.parse(localStorage.getItem('my_posts') || '[]');
    let history = JSON.parse(localStorage.getItem('notif_seen') || '[]');
    let newList = [];

    mine.forEach(id => {
        const p = posts.find(x => x.id === id);
        if (!p) return;

        p.replies.forEach(r => {
            if (!history.includes(r.id)) {
                newList.push(r.content);
                history.push(r.id);
            }
        });
    });

    if (newList.length > 0) {
        localStorage.setItem('notif_seen', JSON.stringify(history));

        const bar = document.getElementById('notif-bar');
        bar.style.display = 'block';

        document.getElementById('notif-content').innerHTML =
            newList.map(t => `<div class="reply-item">${escapeHTML(t)}</div>`).join('')
            + document.getElementById('notif-content').innerHTML;
    }
}

function clearNotifs() {
    document.getElementById('notif-bar').style.display = 'none';
}

/* ================= UI ================= */

function setTab(t, el) {
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    currentTab = t;
    load();
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, t => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[t]));
}
