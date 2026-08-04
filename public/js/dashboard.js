const session = JSON.parse(localStorage.getItem("meviplastSession") || "null");
const token = localStorage.getItem("meviplastToken");
const expectedRole = document.body.dataset.role;

if (!session || !token || session.role !== expectedRole) {
  window.location.replace("login.html");
}

// Helper para futuras llamadas a la API protegida (Authorization: Bearer <token>)
async function apiFetch(url, options = {}) {
  const respuesta = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (respuesta.status === 401 || respuesta.status === 403) {
    localStorage.removeItem("meviplastToken");
    localStorage.removeItem("meviplastSession");
    window.location.replace("login.html");
    return null;
  }
  return respuesta.json();
}

const sidebar = document.querySelector(".sidebar");
const toggle = document.querySelector(".sidebar-toggle");
const logout = document.querySelector("#logout");
const toast = document.querySelector("#toast");

document.querySelectorAll("[data-user-name]").forEach((element) => {
  element.textContent = session?.username || "usuario";
});

document.querySelectorAll("[data-role-name]").forEach((element) => {
  element.textContent = session?.role || expectedRole;
});

document.querySelectorAll("[data-today]").forEach((element) => {
  element.textContent = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());
});

toggle?.addEventListener("click", () => sidebar.classList.toggle("open"));

logout?.addEventListener("click", () => {
  localStorage.removeItem("meviplastSession");
  localStorage.removeItem("meviplastToken");
  window.location.href = "login.html";
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

document.querySelectorAll("[data-demo-action]").forEach((button) => {
  button.addEventListener("click", () => {
    showToast(`${button.dataset.demoAction}. Funcionalidad demostrativa sin backend.`);
  });
});

