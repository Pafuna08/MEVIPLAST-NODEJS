const header = document.querySelector("#site-header");
const menuButton = document.querySelector(".menu-toggle");
const navMenu = document.querySelector("#nav-menu");

const sanitizeText = (value, maxLength = 255) =>
  String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(
      /(?:javascript\s*:|on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))/gi,
      " ",
    )
    .replace(
      /\b(?:alert|confirm|prompt|eval|document\.cookie)\s*\([^)]*\)/gi,
      " ",
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\\["']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const updateHeader = () =>
  header?.classList.toggle("scrolled", window.scrollY > 24);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  menuButton.setAttribute("aria-label", open ? "Abrir menu" : "Cerrar menu");
  navMenu.classList.toggle("open", !open);
});

navMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 },
);

document
  .querySelectorAll(".reveal")
  .forEach((element) => observer.observe(element));
document.querySelector("#year").textContent = new Date().getFullYear();

const contactForm = document.querySelector("#contact-form");
const status = document.querySelector("#form-status");

function setError(input, message) {
  const field = input.closest(".field");
  field.classList.add("invalid");
  field.querySelector("small").textContent = message;
}

function clearError(input) {
  const field = input.closest(".field");
  field.classList.remove("invalid");
  const message = field.querySelector("small");
  if (message) message.textContent = "";
}

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = contactForm.elements.name;
  const email = contactForm.elements.email;
  const message = contactForm.elements.message;
  const nombreLimpio = sanitizeText(name.value, 80);
  const emailLimpio = sanitizeText(email.value, 120).trim().toLowerCase();
  const mensajeLimpio = sanitizeText(message.value, 1000);
  let valid = true;

  [name, email, message].forEach(clearError);
  status.textContent = "";

  name.value = nombreLimpio;
  email.value = emailLimpio;
  message.value = mensajeLimpio;

  if (nombreLimpio.length < 3) {
    setError(name, "Escribe un nombre valido.");
    valid = false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
    setError(email, "Escribe un correo electronico valido.");
    valid = false;
  }
  if (mensajeLimpio.length < 10) {
    setError(message, "El mensaje debe tener al menos 10 caracteres.");
    valid = false;
  }

  if (valid) {
    status.textContent =
      "Solicitud validada. En una implementacion real se enviaria al servidor.";
    contactForm.reset();
  }
});
