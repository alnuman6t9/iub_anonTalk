let isAdmin = false;

async function loadPosts() {
  const res = await fetch("/api/posts");
  const posts = await res.json();

  document.getElementById("feed").innerHTML = posts.map(p => `
    <div class="card">
      <p>${p.content}</p>

      ${p.suggestions.map(s => `
        <div class="suggestion ${s.by_admin ? 'admin' : ''}">
          💬 ${s.content} ${s.by_admin ? '(Admin)' : ''}
        </div>
      `).join("")}

      <input placeholder="Write a supportive suggestion..."
        onkeydown="if(event.key==='Enter') suggest(${p.id}, this)" />

      ${isAdmin ? `<button onclick="deletePost(${p.id})">Delete</button>` : ""}
    </div>
  `).join("");
}

async function sendPost() {
  const box = document.getElementById("postBox");
  if (!box.value) return;

  await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: box.value })
  });

  box.value = "";
  loadPosts();
}

async function suggest(id, el) {
  await fetch(`/api/posts/${id}/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: el.value,
      admin: isAdmin
    })
  });
  el.value = "";
  loadPosts();
}

function loginAdmin() {
  const pw = document.getElementById("admin-pw").value;
  if (pw === "Nom@n123") {
    isAdmin = true;
    document.getElementById("admin-login").style.display = "none";
    loadPosts();
  } else alert("Wrong password");
}

async function deletePost(id) {
  await fetch(`/api/posts/${id}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "Nom@n123" })
  });
  loadPosts();
}

loadPosts();
