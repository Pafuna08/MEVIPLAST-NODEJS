export const sanitizeText = (value, maxLength = 255) =>
  String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(
      /(?:javascript\s*:|on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))/gi,
      " ",
    )
    .replace(/\b(?:alert|confirm|prompt|eval|document\.cookie)\s*\([^)]*\)/gi, " ")
    // eslint-disable-next-line no-control-regex -- se eliminan caracteres de control a propósito
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\\["']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

export function safeProductName(value) {
  const product = String(value ?? "").trim();
  if (
    !product ||
    /[<>]|&(?:lt|gt|#0*60|#0*62);|javascript\s*:|data\s*:\s*text\/html|(?:^|\s)on\w+\s*=/i.test(
      product,
    )
  ) {
    return null;
  }
  return sanitizeText(product, 255) || null;
}

export function sanitizePayload(value) {
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const lowerKey = key.toLowerCase();
      if (typeof item !== "string") return [key, sanitizePayload(item)];
      const clean = sanitizeText(
        item,
        /(password|observaciones|cliente|producto|nombre|usuario|correo|tipo|proveedor|ubicacion|motivo|detalle)/i.test(
          lowerKey,
        )
          ? 255
          : 80,
      );
      // Igual que en el backend: «prioridad» o «medida» contienen «id» y deben seguir siendo texto
      const normalized = /^(id|activo)$|_id$|^(cantidad|precio|stock|total|unidades)(_|$)/.test(
        lowerKey,
      )
        ? Number(clean) || 0
        : lowerKey.includes("usuario")
          ? clean.toLowerCase().replace(/[^a-z0-9._-]/g, "")
          : lowerKey.includes("correo")
            ? clean.toLowerCase()
            : clean;
      return [key, normalized];
    }),
  );
}

const numberFormat = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
});

const currencyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const number = (value) => numberFormat.format(Number(value || 0));

export const percentFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

export const money = (value) => currencyFormat.format(Number(value || 0));

export const dateTimeFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeStyle: "short" });

export const roleName = (value) =>
  ({
    admin: "Administrador",
    supervisor: "Supervisor",
    operario: "Operario",
    vendedor: "Vendedor",
    almacenista: "Almacenista",
  })[value] || value;

// «1 paquete de 500» / «3 paquetes de 100»
export function packagesLabel(sale) {
  const count = Number(sale.cantidad_paquetes);
  return `${number(count)} ${count === 1 ? "paquete" : "paquetes"} de ${number(sale.unidades_paquete)}`;
}

// «2026-10-31» → «31/10» (o «31/10/2026» con el año)
export function shortDate(isoDate, withYear = false) {
  const [year, month, day] = String(isoDate).split("-");
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}
