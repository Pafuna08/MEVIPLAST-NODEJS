import React, { useEffect, useRef, useState } from "react";
import { sanitizeText } from "../comun/formato.js";
import "../../css/style.css";

// Sitio público de MEVIPLAST (antes index.html con js/script.js)

// El formulario de contacto también convierte entidades HTML antes de limpiar, para que «&lt;script&gt;»
// no se cuele como texto
const limpiarContacto = (valor, max) =>
  sanitizeText(
    String(valor ?? "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"'),
    max,
  );

function Campo({ id, etiqueta, error, children }) {
  return (
    <div className={`field${error ? " invalid" : ""}`}>
      <label htmlFor={id}>{etiqueta}</label>
      {children}
      {error !== undefined && <small>{error}</small>}
    </div>
  );
}

function FormularioContacto() {
  const [errores, setErrores] = useState({ name: "", email: "", message: "" });
  const [estado, setEstado] = useState("");

  function enviar(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const { name, email, message } = form.elements;
    const nombreLimpio = limpiarContacto(name.value, 80);
    const emailLimpio = limpiarContacto(email.value, 120).trim().toLowerCase();
    const mensajeLimpio = limpiarContacto(message.value, 1000);
    name.value = nombreLimpio;
    email.value = emailLimpio;
    message.value = mensajeLimpio;

    const nuevos = {
      name: nombreLimpio.length < 3 ? "Escribe un nombre válido." : "",
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio) ? "" : "Escribe un correo electrónico válido.",
      message: mensajeLimpio.length < 10 ? "El mensaje debe tener al menos 10 caracteres." : "",
    };
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean)) {
      setEstado("");
      return;
    }
    setEstado("Solicitud validada. En una implementación real se enviaría al servidor.");
    form.reset();
  }

  return (
    <form className="contact-form reveal" id="contact-form" noValidate onSubmit={enviar}>
      <Campo id="name" etiqueta="Nombre" error={errores.name}>
        <input id="name" name="name" autoComplete="name" />
      </Campo>
      <Campo id="email" etiqueta="Correo electrónico" error={errores.email}>
        <input id="email" name="email" type="text" inputMode="email" autoComplete="email" />
      </Campo>
      <Campo id="company" etiqueta="Empresa">
        <input id="company" name="company" autoComplete="organization" />
      </Campo>
      <Campo id="message" etiqueta="Mensaje" error={errores.message}>
        <textarea id="message" name="message" rows="5"></textarea>
      </Campo>
      <button className="btn btn-primary" type="submit">
        Enviar solicitud
      </button>
      <p className="form-status" id="form-status" role="status" aria-live="polite">
        {estado}
      </p>
    </form>
  );
}

const PRODUCTOS = [
  {
    imagen: "/assets/producto-bolsas.png",
    alt: "Bolsas plásticas transparentes y de color",
    codigo: "Línea 01",
    nombre: "Bolsas plásticas",
    texto: "Soluciones para empaque, almacenamiento y despacho en diferentes calibres y presentaciones.",
    puntos: ["Medidas personalizadas", "Sellado uniforme", "Producción por lotes"],
  },
  {
    imagen: "/assets/producto-adhesivos.png",
    alt: "Rollos de empaques y materiales adhesivos",
    codigo: "Línea 02",
    nombre: "Empaques adhesivos",
    texto: "Materiales adhesivos para identificación, protección y presentación de productos.",
    puntos: ["Acabados consistentes", "Aplicación industrial", "Formatos adaptables"],
  },
];

const BENEFICIOS = [
  ["01", "Control de calidad", "Registro de cantidades y observaciones por orden para conservar evidencia productiva."],
  ["02", "Respuesta ágil", "Información disponible para asignar tareas y consultar avances sin depender de formatos dispersos."],
  ["03", "Inventario confiable", "Actualización de materias primas y productos terminados según los movimientos registrados."],
  ["04", "Decisiones con datos", "Reportes operativos para evaluar cumplimiento, rendimiento y comportamiento comercial."],
];

const PASOS = [
  ["01", "Definición", "Se identifican producto, material, cantidad y fecha requerida."],
  ["02", "Planificación", "El supervisor organiza la orden y asigna actividades al equipo."],
  ["03", "Producción", "El operario ejecuta la tarea y registra cantidad y novedades."],
  ["04", "Control", "El sistema actualiza inventario, historial e indicadores de cumplimiento."],
];

const MENU = [
  ["#nosotros", "Nosotros"],
  ["#productos", "Productos"],
  ["#beneficios", "Beneficios"],
  ["#tecnologia", "Sistema"],
  ["#proceso", "Proceso"],
  ["#contacto", "Contacto"],
];

export default function Sitio() {
  const [conScroll, setConScroll] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const raiz = useRef(null);

  useEffect(() => {
    document.title = "MEVIPLAST | Empaques adhesivos y soluciones industriales";
    const actualizar = () => setConScroll(window.scrollY > 24);
    actualizar();
    window.addEventListener("scroll", actualizar, { passive: true });

    // Las secciones aparecen al entrar en pantalla
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("visible");
            observador.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.14 },
    );
    raiz.current.querySelectorAll(".reveal").forEach((elemento) => observador.observe(elemento));

    return () => {
      window.removeEventListener("scroll", actualizar);
      observador.disconnect();
    };
  }, []);

  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <div ref={raiz}>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <header className={`site-header${conScroll ? " scrolled" : ""}`} id="site-header">
        <nav className="navbar container" aria-label="Navegación principal">
          <a className="brand" href="#inicio" aria-label="MEVIPLAST, ir al inicio">
            <img src="/assets/logo-meviplast.png" alt="" />
            <span>MEVIPLAST</span>
          </a>

          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuAbierto}
            aria-controls="nav-menu"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`nav-menu${menuAbierto ? " open" : ""}`} id="nav-menu">
            {MENU.map(([destino, texto]) => (
              <a key={destino} href={destino} onClick={cerrarMenu}>
                {texto}
              </a>
            ))}
            <a className="btn btn-login" href="/login.html" onClick={cerrarMenu}>
              Iniciar sesión
            </a>
          </div>
        </nav>
      </header>

      <main id="contenido">
        <section className="hero" id="inicio">
          <div className="hero-overlay"></div>
          <div className="container hero-content reveal">
            <p className="eyebrow">Fabricación industrial y control confiable</p>
            <h1>MEVIPLAST</h1>
            <p className="hero-copy">
              Bolsas plásticas y empaques adhesivos fabricados con precisión, respaldo operativo y una visión digital
              de principio a fin.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#productos">
                Ver productos
              </a>
              <a className="btn btn-outline" href="/login.html">
                Iniciar sesión
              </a>
            </div>
            <dl className="hero-metrics" aria-label="Indicadores de MEVIPLAST">
              <div>
                <dt>100%</dt>
                <dd>Trazabilidad proyectada</dd>
              </div>
              <div>
                <dt>3</dt>
                <dd>Procesos digitalizados</dd>
              </div>
              <div>
                <dt>24/7</dt>
                <dd>Consulta del sistema</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="section about" id="nosotros">
          <div className="container about-grid">
            <div className="section-copy reveal">
              <p className="eyebrow">Nosotros</p>
              <h2>Empaques que acompañan la operación real</h2>
              <p>
                MEVIPLAST es una empresa dedicada a la fabricación de bolsas plásticas y empaques adhesivos para
                necesidades comerciales e industriales.
              </p>
              <p>
                El proyecto académico busca fortalecer su operación con un sistema web que centralice producción,
                inventario y ventas, reduciendo registros manuales y mejorando la toma de decisiones.
              </p>
            </div>
            <div className="about-facts reveal" aria-label="Principios de la empresa">
              <div>
                <strong>Calidad</strong>
                <span>Control de materiales y producto terminado.</span>
              </div>
              <div>
                <strong>Cumplimiento</strong>
                <span>Seguimiento de órdenes y metas productivas.</span>
              </div>
              <div>
                <strong>Evolución</strong>
                <span>Digitalización pensada para el trabajo diario.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section products" id="productos">
          <div className="container">
            <div className="section-heading reveal">
              <p className="eyebrow">Productos y servicios</p>
              <h2>Soluciones de empaque para diferentes operaciones</h2>
              <p>
                Fabricación flexible, controlada y adaptada a requerimientos de presentación, protección y
                distribución.
              </p>
            </div>
            <div className="product-grid">
              {PRODUCTOS.map((producto) => (
                <article className="product-card reveal" key={producto.codigo}>
                  <img src={producto.imagen} alt={producto.alt} />
                  <div className="product-body">
                    <span className="product-code">{producto.codigo}</span>
                    <h3>{producto.nombre}</h3>
                    <p>{producto.texto}</p>
                    <ul>
                      {producto.puntos.map((punto) => (
                        <li key={punto}>{punto}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
              <article className="service-card reveal">
                <span className="service-mark" aria-hidden="true">
                  M
                </span>
                <h3>Acompañamiento productivo</h3>
                <p>
                  Revisión de requerimientos, seguimiento de órdenes y control de entregas desde una operación
                  organizada.
                </p>
                <a href="#contacto">
                  Solicitar asesoría <span aria-hidden="true">→</span>
                </a>
              </article>
            </div>
          </div>
        </section>

        <section className="section benefits" id="beneficios">
          <div className="container">
            <div className="section-heading reveal">
              <p className="eyebrow">Ventajas competitivas</p>
              <h2>Una operación preparada para responder mejor</h2>
            </div>
            <div className="benefit-grid">
              {BENEFICIOS.map(([numero, titulo, texto]) => (
                <article className="benefit reveal" key={numero}>
                  <span>{numero}</span>
                  <h3>{titulo}</h3>
                  <p>{texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section technology" id="tecnologia">
          <div className="container technology-grid">
            <div className="tech-visual reveal" aria-label="Vista conceptual del sistema MEVIPLAST">
              <div className="screen-bar">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="screen-layout">
                <div className="screen-menu"></div>
                <div className="screen-main">
                  <div className="screen-stats">
                    <i></i>
                    <i></i>
                    <i></i>
                  </div>
                  <div className="screen-chart"></div>
                  <div className="screen-table"></div>
                </div>
              </div>
            </div>
            <div className="section-copy reveal">
              <p className="eyebrow">Solución tecnológica</p>
              <h2>Un sistema web conectado con la planta</h2>
              <p>
                La plataforma MEVIPLAST organiza el trabajo de administradores, supervisores, operarios, almacenistas
                y vendedores mediante accesos diferenciados por rol.
              </p>
              <ul className="check-list">
                <li>Asignación y seguimiento de tareas de producción.</li>
                <li>Registro de producción e inventario actualizado.</li>
                <li>Control de ventas, usuarios y materias primas.</li>
                <li>Reportes e historial para auditoría operativa.</li>
              </ul>
              <a className="text-link" href="/login.html">
                Explorar acceso al sistema <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section className="section process" id="proceso">
          <div className="container">
            <div className="section-heading reveal">
              <p className="eyebrow">Proceso de trabajo</p>
              <h2>De la necesidad al producto terminado</h2>
            </div>
            <ol className="process-list">
              {PASOS.map(([numero, titulo, texto]) => (
                <li className="reveal" key={numero}>
                  <span>{numero}</span>
                  <div>
                    <h3>{titulo}</h3>
                    <p>{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section contact" id="contacto">
          <div className="container contact-grid">
            <div className="contact-copy reveal">
              <p className="eyebrow">Contacto</p>
              <h2>Conversemos sobre su necesidad de empaque</h2>
              <p>
                Comparta los datos principales de su solicitud y el equipo de MEVIPLAST podrá orientar el siguiente
                paso.
              </p>
              <address>
                <span>Medellín, Colombia</span>
                <a href="mailto:contacto@meviplast.com">contacto@meviplast.com</a>
                <a href="tel:+573147626279">+57 3147626279</a>
              </address>
            </div>
            <FormularioContacto />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <strong>MEVIPLAST</strong>
            <p>Empaques adhesivos y soluciones de producción.</p>
          </div>
          <div>
            <span>Proyecto académico</span>
            <p>Análisis y Desarrollo de Software - SENA</p>
          </div>
          <div>
            <span>Acceso</span>
            <a href="/login.html">Sistema interno</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>&copy; {new Date().getFullYear()} MEVIPLAST</span>
          <span>Ingeniería de Software</span>
        </div>
      </footer>

      <a
        className="whatsapp"
        href="https://wa.me/573147626279"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M13.601 2.326A7.854 7.854 0 0 0 1.16 11.81L.053 15.854a.5.5 0 0 0 .61.61l4.041-1.106a7.854 7.854 0 0 0 3.747.98h.003a7.854 7.854 0 0 0 5.147-14.013m-5.15 13.4a7.25 7.25 0 0 1-3.698-1.009l-.26-.155-3.004.822.824-2.994-.17-.269A7.25 7.25 0 1 1 8.45 15.726m3.485-4.18c-.188-.094-1.113-.55-1.286-.612-.172-.063-.297-.094-.422.094s-.485.612-.594.737c-.11.125-.219.141-.407.047-.188-.094-.793-.292-1.51-.932-.558-.497-.935-1.11-1.044-1.298-.11-.188-.012-.29.082-.383.085-.084.188-.219.282-.328.094-.11.125-.188.188-.313.062-.125.031-.235-.016-.328-.047-.094-.422-1.016-.578-1.391-.152-.365-.307-.315-.422-.32a7 7 0 0 0-.36-.006.69.69 0 0 0-.5.235c-.172.188-.656.641-.656 1.563s.672 1.813.766 1.938c.094.125 1.322 2.018 3.203 2.831.447.193.796.308 1.068.394.449.143.857.123 1.18.074.36-.054 1.113-.454 1.27-.891.156-.438.156-.813.109-.891-.047-.078-.172-.125-.36-.219"
          />
        </svg>
      </a>
    </div>
  );
}
