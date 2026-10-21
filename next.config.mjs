// Cada compilación lleva un número de versión: la app lo compara con el del sitio y se recarga sola si quedó vieja.
export default { env: { NEXT_PUBLIC_VERSION: String(Date.now()) } };
