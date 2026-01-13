let currentTab = 'new';
if (localStorage.getItem('verified') === 'true') document.getElementById('auth-overlay').style.display = 'none';

async function sendCode() {
    const email = document.getElementById('iub-email').value;
    const res = await fetch('/api/auth/send-code', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email})});
    if (res.ok) { document.getElementById('email-step').style.display='none'; document.getElementById('code-step').style.display='block'; }
    else alert("IUB email required!");
}

async function verifyCode() {
    const email = document.getElementById('iub-email').value;
    const code = document.getElementById('verify-code').value;
    const res = await fetch('/api/auth/verify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, code})});
    if (res.ok) { localStorage.setItem('verified', 'true'); location.reload(); }
    else alert("Wrong code!");
}

async function load() {
    const res = await fetch(`/api/posts?filter=${currentTab}`);
    const posts = await res.json();
    checkNotifs(posts);
    render(posts);
}

function render(posts) {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    document.getElementById('feed').innerHTML = posts.map(p => `
        <div class="post">
            <div style="white-space:pre-wrap">${p.content}</div>
            <div class="actions">
                <span onclick="like(${p.id})">♥ ${p.likes}</span>
                <span onclick="toggle(${p.id})">Reply</span>
                ${isAdmin ? `<span style="color:red" onclick="del(${p.id})">Delete</span>` : ''}
            </div>
            <div id="r-${p.id}" style="display:none"><input onkeydown="if(event.key==='Enter') rep(${p.id},this)" placeholder="Reply..."></div>
            <div class="replies">${p.replies.map(r => `<div class="reply">↳ ${r.content}</div>`).join('')}</div>
        </div>`).join('');
}

async function sendPost() {
    const content = document.getElementById('box').value;
    const res = await fetch('/api/posts', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({content})});
    const post = await res.json();
    let mine = JSON.parse(localStorage.getItem('mine')||'[]'); mine.push(post.id); localStorage.setItem('mine', JSON.stringify(mine));
    document.getElementById('box').value=''; load();
}

function checkNotifs(posts) {
    let mine = JSON.parse(localStorage.getItem('mine')||'[]');
    let history = JSON.parse(localStorage.getItem('nh')||'[]');
    let updated = false;
    mine.forEach(id => {
        let p = posts.find(x => x.id === id);
        if (p && p.replies.length > 0) {
            p.replies.forEach(r => {
                if (!history.find(h => h.id === r.id)) { history.unshift({id:r.id, t:r.content}); updated = true; }
            });
        }
    });
    if (updated) { localStorage.setItem('nh', JSON.stringify(history.slice(0,5))); renderN(); }
}

function renderN() {
    let h = JSON.parse(localStorage.getItem('nh')||'[]');
    document.getElementById('notif-section').style.display = h.length ? 'block' : 'none';
    document.getElementById('notif-list').innerHTML = h.map(n => `<div class="reply">${n.t}</div>`).join('');
}

function toggle(id){ let e=document.getElementById(`r-${id}`); e.style.display=e.style.display==='none'?'block':'none';}
async function like(id){ await fetch(`/api/posts/${id}/like`, {method:'POST'}); load(); }
async function rep(id, el){ await fetch(`/api/posts/${id}/reply`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({content:el.value})}); load(); }
function setTab(t, el){ document.querySelectorAll('.t-btn').forEach(b=>b.classList.remove('active')); el.classList.add('active'); currentTab=t; load(); }
window.loginAdmin = (pw) => { sessionStorage.setItem('isAdmin', 'true'); sessionStorage.setItem('apw', pw); load(); };
async function del(id) { await fetch(`/api/posts/${id}/delete`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:sessionStorage.getItem('apw')})}); load(); }
function clearNotifs() { localStorage.setItem('nh', '[]'); renderN(); }

load(); renderN();