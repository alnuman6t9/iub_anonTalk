async function login() {
  const email = document.getElementById('email-input').value.trim();

  if (!email.endsWith('@iub.edu.bd')) {
    alert("Use your @iub.edu.bd email");
    return;
  }

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await res.json();

  if (data.success) {
    localStorage.setItem('anonToken', data.token);

    // 🔥 REDIRECT TO FEED PAGE
    window.location.href = '/feed.html';
  } else {
    alert(data.error || "Login failed");
  }
}
