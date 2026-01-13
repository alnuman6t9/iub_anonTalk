let currentTab = 'new';
let userEmail = '';

// 1. Gating Logic
if (localStorage.getItem('iub_auth') === 'true') {
    showFeed();
}

async function sendCode() {
    userEmail = document.getElementById('email-input').value.trim();
    if(!userEmail.endsWith('@iub.edu.bd')) return alert("Use @iub.edu.bd email!");

    const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: userEmail })
    });
    if(res.ok) {
        document.getElementById('step-1').style.display = 'none';
        document.getElementById('step-2').style.display = 'block';
    } else {
        alert("Failed to send code. Try again.");
    }
}

async function verifyCode() {
    const code = document.getElementById('code-input').value.trim();
    const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: userEmail, code: code })
    });
    if(res.ok) {
        localStorage.setItem('iub_auth', 'true');
        showFeed();
    } else {
        alert("Wrong code.");
    }
}

function showFeed() {
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('main-feed').style.display = 'block';
    load();
}

// 2. Main App Functions
async function load() {
    const res = await fetch(`/api/posts?filter=${currentTab}`);
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
                <span class="time">${new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                ${isAdmin ? `<span class="action-item delete" onclick="del(${p.id})">Delete</span>` : ''}
            </div>
            <div id="reply-input-${p.id}" class="reply-input-wrap" style="display:none">
                <input type="text" placeholder="Type a reply..." onkeydown="if(event.key==='Enter') sendReply(${p.id}, this)">
            </div>
            <div class="replies-list">${p.replies.map(r => `<div class="reply-item">↳ ${escapeHTML(r.content)}</div>`).join('')}</div>
        </div>
    `).join('');
}

async function createPost() {
    const box = document.getElementById('post-box');
    if(!box.value.trim()) return;
    const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ content: box.value })
    });
    const post = await res.json();
    let mine = JSON.parse(localStorage.getItem('my_posts') || '[]');
    mine.push(post.id);
    localStorage.setItem('my_posts', JSON.stringify(mine));
    box.value = '';
    load();
}

// 3. Admin & Notifs
window.loginAdmin = (pw) => {
    sessionStorage.setItem('isAdmin', 'true');
    sessionStorage.setItem('apw', pw);
    load();
};

async function del(id) {
    if(!confirm("Delete?")) return;
    await fetch(`/api/posts/${id}/delete`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password: sessionStorage.getItem('apw') })
    });
    load();
}

function checkNotifs(posts) {
    let mine = JSON.parse(localStorage.getItem('my_posts') || '[]');
    let history = JSON.parse(localStorage.getItem('notif_seen') || '[]');
    let newList = [];
    mine.forEach(id => {
        let p = posts.find(x => x.id === id);
        if(p && p.replies.length > 0) {
            p.replies.forEach(r => {
                if(!history.includes(r.id)) {
                    newList.push(r.content);
                    history.push(r.id);
                }
            });
        }
    });
    if(newList.length > 0) {
        localStorage.setItem('notif_seen', JSON.stringify(history));
        const bar = document.getElementById('notif-bar');
        bar.style.display = 'block';
        document.getElementById('notif-content').innerHTML = newList.map(t => `<div class="reply-item">${t}</div>`).join('') + document.getElementById('notif-content').innerHTML;
    }
}

function toggleRep(id) {
    let el = document.getElementById(`reply-input-${id}`);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function like(id) { await fetch(`/api/posts/${id}/like`, {method:'POST'}); load(); }

async function sendReply(id, el) {
    await fetch(`/api/posts/${id}/reply`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ content: el.value })
    });
    el.value = ''; load();
}

function setTab(t, el) {
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    currentTab = t;
    load();
}

function clearNotifs() { document.getElementById('notif-bar').style.display='none'; }
function escapeHTML(str) { return str.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t])); }
