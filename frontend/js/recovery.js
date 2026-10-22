const accountForm = document.querySelector("#account-recovery-form");
const resetForm = document.querySelector("#reset-password-form");
const title = document.querySelector("#recovery-title");
const description = document.querySelector("#recovery-description");
const params = new URLSearchParams(window.location.search);
const recoveryToken = params.get("token");
const recoveryEmail = document.querySelector("#recovery-email");
const recoveryStatus = document.querySelector("#recovery-status");

async function sendRequest(path, correo, status) {
  status.textContent = "";
  try {
    const response = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || "No fue posible enviar la solicitud.");
    status.textContent = data.mensaje;
    status.classList.add("success-message");
  } catch (error) {
    status.textContent = error.message || "No fue posible conectar con el servidor.";
    status.classList.remove("success-message");
  }
}

if (recoveryToken) {
  accountForm.hidden = true;
  resetForm.hidden = false;
  title.textContent = "Crear nueva contraseña";
  description.textContent = "El enlace es válido durante 30 minutos y solo puede usarse una vez.";
} else {
  resetForm.hidden = true;
}

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

document.querySelector("#recover-password").addEventListener("click", () => {
  if (!accountForm.reportValidity()) return;
  sendRequest("recuperar-password", recoveryEmail.value, recoveryStatus);
});

document.querySelector("#recover-username").addEventListener("click", () => {
  if (!accountForm.reportValidity()) return;
  sendRequest("recordar-usuario", recoveryEmail.value, recoveryStatus);
});

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#new-password").value;
  const confirmation = document.querySelector("#confirm-password").value;
  const status = document.querySelector("#reset-status");
  status.classList.remove("success-message");
  if (password !== confirmation) {
    status.textContent = "Las contraseñas no coinciden.";
    return;
  }
  try {
    const response = await fetch("/api/auth/restablecer-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: recoveryToken, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.mensaje || "No fue posible cambiar la contraseña.");
    status.textContent = data.mensaje;
    status.classList.add("success-message");
    resetForm.reset();
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (error) {
    status.textContent = error.message || "No fue posible conectar con el servidor.";
  }
});
