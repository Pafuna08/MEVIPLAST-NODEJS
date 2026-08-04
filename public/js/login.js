// Mapa de rol (tal como lo devuelve la API) -> nombre visible y dashboard destino
const rolesInfo = {
  admin: { nombre: "Administrador", destino: "dashboard-admin.html" },
  supervisor: { nombre: "Supervisor", destino: "dashboard-supervisor.html" },
  operario: { nombre: "Operario", destino: "dashboard-operario.html" }
};

const form = document.querySelector("#login-form");
const username = document.querySelector("#username");
const password = document.querySelector("#password");
const status = document.querySelector("#login-status");
const toggle = document.querySelector("#toggle-password");

function error(input, message) {
  const field = input.closest(".field");
  field.classList.add("invalid");
  field.querySelector("small").textContent = message;
}

function clear(input) {
  const field = input.closest(".field");
  field.classList.remove("invalid");
  field.querySelector("small").textContent = "";
}

toggle.addEventListener("click", () => {
  const visible = password.type === "text";
  password.type = visible ? "password" : "text";
  toggle.textContent = visible ? "Ver" : "Ocultar";
  toggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
});

document.querySelectorAll("[data-user]").forEach((button) => {
  button.addEventListener("click", () => {
    username.value = button.dataset.user;
    password.value = button.dataset.password;
    status.textContent = "";
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clear(username);
  clear(password);
  status.textContent = "";

  const userKey = username.value.trim().toLowerCase();
  let valid = true;

  if (!userKey) {
    error(username, "El usuario es obligatorio.");
    valid = false;
  }
  if (!password.value) {
    error(password, "La contraseña es obligatoria.");
    valid = false;
  }
  if (!valid) return;

  try {
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: userKey, password: password.value })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      status.textContent = datos.mensaje || "Usuario o contraseña incorrectos.";
      return;
    }

    const info = rolesInfo[datos.usuario.rol];
    localStorage.setItem("meviplastToken", datos.token);
    localStorage.setItem("meviplastSession", JSON.stringify({
      username: datos.usuario.usuario,
      role: info ? info.nombre : datos.usuario.rol,
      loginAt: new Date().toISOString()
    }));
    window.location.href = info ? info.destino : "index.html";
  } catch (err) {
    status.textContent = "No fue posible conectar con el servidor.";
  }
});

