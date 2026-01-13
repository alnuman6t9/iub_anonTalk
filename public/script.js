async function login() {
  const email = document.getElementById('email').value;

  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const d = await r.json();
  if (d.success) {
    localStorage.setItem('token', d.token);
    location.href = '/feed.html';
  } else {
    alert(d.error);
  }
}

async function load() {
  const r = await fetch('/api/posts');
  const posts = await r.json();

  document.getElementById('feed').innerHTML = posts.map(p => `
    <div class="card">
      <p>${p.content}</p>
      <button onclick="like(${p.id})">♥ ${p.likes}</button>
      ${p.replies.map(r => `<div>↳ ${r.content}</div>`).join('')}
      <input onkeydown="if(event.key==='Enter') reply(${p.id}, this)">
    </div>
  `).join('');
}

async function post() {
  const t = document.getElementById('post').value;

  await fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    },
    body: JSON.stringify({ content: t })
  });

  document.getElementById('post').value = '';
  load();
}

async function like(id) {
  await fetch(`/api/posts/${id}/like`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
  });
  load();
}

async function reply(id, el) {
  await fetch(`/api/posts/${id}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    },
    body: JSON.stringify({ content: el.value })
  });
  el.value = '';
  load();
}

if (location.pathname.includes('feed')) load();
