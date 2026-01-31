let mode = "member";

function setMode(m) {
  mode = m;
  document.getElementById("memberBtn").classList.toggle("active", m === "member");
  document.getElementById("adminBtn").classList.toggle("active", m === "admin");

  document.getElementById("memberBox").style.display = m === "member" ? "block" : "none";
  document.getElementById("adminBox").style.display = m === "admin" ? "block" : "none";
}

/* MEMBER LOGIN */
function loginMember() {
  const nick = document.getElementById("nickname").value.trim();
  if (!nick) {
    alert("Please enter a nickname");
    return;
  }

  localStorage.setItem("nickname", nick);
  localStorage.setItem("role", "member");

  // redirect to app
  window.location.href = "/app.html";
}

/* ADMIN LOGIN */
function loginAdmin() {
  const pw = document.getElementById("adminPw").value;
  if (pw !== "Nom@n123") {
    alert("Wrong admin password");
    return;
  }

  localStorage.setItem("role", "admin");
  window.location.href = "/app.html";
}
