function sanitizarTexto(valor, maxLongitud = 255) {
  if (valor === null || valor === undefined) return "";

  const texto = String(valor)
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
    .replace(/^[\s"'`\\]+|[\s"'`\\]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return texto.slice(0, maxLongitud);
}

function sanitizarNumero(
  valor,
  { minimo = 0, maximo = Number.MAX_SAFE_INTEGER } = {},
) {
  if (valor === null || valor === undefined || valor === "") return 0;

  const numero = Number(String(valor).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numero)) return 0;

  if (numero < minimo) return 0;
  if (numero > maximo) return maximo;
  return numero;
}

function sanitizarObjeto(valor) {
  if (Array.isArray(valor)) {
    return valor.map((item) => sanitizarObjeto(item));
  }

  if (valor && typeof valor === "object") {
    const limpio = {};
    Object.entries(valor).forEach(([clave, item]) => {
      const nombre = String(clave).trim();
      if (!nombre) return;

      const claveNormalizada = nombre.toLowerCase();
      const esNumero =
        /(cantidad|precio|stock|min|max|total|id|activo|cantidad_producida|cantidad_total)/i.test(
          claveNormalizada,
        );

      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        limpio[nombre] = sanitizarObjeto(item);
      } else if (typeof item === "string") {
        if (
          claveNormalizada.includes("usuario") ||
          claveNormalizada.includes("user")
        ) {
          limpio[nombre] = sanitizarTexto(item, 50).toLowerCase();
          return;
        }

        if (claveNormalizada.includes("password")) {
          limpio[nombre] = sanitizarTexto(item, 128);
          return;
        }

        if (esNumero) {
          limpio[nombre] = sanitizarNumero(item);
          return;
        }

        limpio[nombre] = sanitizarTexto(item, 255);
      } else if (typeof item === "number") {
        limpio[nombre] = Number.isFinite(item) ? item : 0;
      } else if (typeof item === "boolean") {
        limpio[nombre] = item;
      } else if (item === undefined) {
        limpio[nombre] = "";
      } else {
        limpio[nombre] = sanitizarTexto(item, 255);
      }
    });

    return limpio;
  }

  if (typeof valor === "string") {
    return sanitizarTexto(valor, 255);
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  return valor;
}

module.exports = {
  sanitizarTexto,
  sanitizarNumero,
  sanitizarObjeto,
};
