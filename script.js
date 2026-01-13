let currentTab = 'new';
let email = '';

// Authentication Flow
async function sendCode() {
    email = document.getElementById('email').value;
    const res = await fetch('/api/auth/send-code', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email})});
    if (res.ok) { document.getElementById('step-1').style.display='none'; document.getElementById('step-2').style.display='block'; }
    else alert("IUB email required.");
}

async function verifyCode() {
    const code = document.getElementById('code').value;
    const res = await fetch('/api/auth/verify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, code})});
    if (res.ok) {
        localStorage.setItem('iub_verified', 'true');
        showFeed();
    } else alert("Invalid code.");
}

function showFeed() {
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('feed-view').style.display = 'block';
    loadPosts();
}

// Post Handling
async function loadPosts() {
    const res = await fetch(`/api/posts?filter=${currentTab}`);
    const posts = await res.json();
    renderFeed(posts);
    checkNotifs(posts);
}

function renderFeed(posts) {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    document.getElementById('feed-list').innerHTML = posts.map(p => `
        <div class="post">
            <div style="white-space:pre-wrap">${p.content}</div>
            <div class="post-actions">
                <span class="action" onclick="like(${p.id})">♥ ${p.likes}</span>
                <span class="action" onclick="toggleRep(${p.id})">Reply</span>
                <span>${new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                ${isAdmin ? `<span class="action" style="color:red" onclick="del(${p.id})">Delete</span>` : ''}
            </div>
            <div id="rep-box-${p.id}" style="display:none; margin-top:15px">
                <input class="glossy-input" placeholder="Type reply..." onkeydown="if(event.key==='Enter') reply(${p.id}, this)">
            </div>
            <div class="replies">${p.replies.map(r => `<div class="reply">↳ ${r.content}</div>`).join('')}</div>
        </div>
    `).join('');
}

async function createPost() {
    const box = document.getElementById('post-box');
    if (!box.value.trim()) return;
    const res = await fetch('/api/posts', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({content: box.value})});
    const post = await res.json();
    
    // Track ownership locally for notifications
    let mine = JSON.parse(localStorage.getItem('my_posts') || '[]');
    mine.push(post.id);
    localStorage.setItem('my_posts', JSON.stringify(mine));
    
    box.value = '';
    loadPosts();
}

// Notification Logic
function checkNotifs(posts) {
    let mine = JSON.parse(localStorage.getItem('my_posts') || '[]');
    let history = JSON.parse(localStorage.getItem('notif_history') || '[]');
    let updated = false;

    mine.forEach(pid => {
        let p = posts.find(x => x.id === pid);
        if (p && p.replies.length > 0) {
            p.replies.forEach(r => {
                if (!history.includes(r.id)) {
                    history.push(r.id);
                    addNotifUI(r.content);
                    updated = true;
                }
            });
        }
    });
    if (updated) localStorage.setItem('notif_history', JSON.stringify(history));
}

function addNotifUI(text) {
    const bar = document.getElementById('notif-bar');
    const list = document.getElementById('notif-list');
    bar.style.display = 'block';
    list.innerHTML = `<div class="reply">${text}</div>` + list.innerHTML;
}

// Utils
function toggleRep(id) {
    const el = document.getElementById(`rep-box-${id}`);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
async function like(id) { await fetch(`/api/posts/${id}/like`, {method:'POST'}); loadPosts(); }
async function reply(id, el) { 
    await fetch(`/api/posts/${id}/reply`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({content: el.value})});
    el.value = ''; loadPosts();
}
function setTab(t, el) {
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active'); currentTab = t; loadPosts();
}
function clearNotifs() { document.getElementById('notif-bar').style.display = 'none'; document.getElementById('notif-list').innerHTML = ''; }

// Init
if (localStorage.getItem('iub_verified') === 'true') showFeed();



### Final Steps to Launch:
1.  **Deploy** to Vercel.
2.  **Environment Variable:** Add your Resend Key in the Vercel Dashboard.
3.  **Run Init:** Visit `yoursite.vercel.app/api/init` once.
4.  **Security:** Only `@iub.edu.bd` emails will work. The email is **never** attached to the post in the database, ensuring 100% anonymity.

Would you like me to add a **"Report"** feature so users can flag inappropriate content?
