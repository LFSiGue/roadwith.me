# Roadwith.me

Primera versión web adaptable a celular de una comunidad de acompañamiento en carretera, para México.

## Funciones

- Vista de ejemplo explícita, aislada de los datos reales. Sus cambios son temporales.
- Perfil persistente por cuenta de ChatGPT: nickname público y teléfonos privados.
- Publicación e inicio de viajes en cuatro corredores; paradas intermedias, ambos sentidos, salida programada y finalización.
- Coincidencias por segmento compartido, mismo sentido y ventanas de tiempo superpuestas de seis horas.
- Solicitudes de compañía, aceptación y rechazo dentro de la app.
- Alerta de emergencia con consentimiento y referencia de ubicación. El servidor consulta y devuelve teléfonos solo a usuarios con un viaje activo que coincida. Resolver, finalizar o expirar la ventana retira el acceso.
- Accesos de llamada a 911, CAPUFE 074 y Ángeles Verdes 078 en modo real. Fuente enlazada en la app: https://www.gob.mx/sct/es/articulos/lleva-contigo-los-numeros-de-emergencia

## Alcance de esta versión

El esquema de ruta no es un mapa geográfico ni navegación. No hay GPS, verificación de identidad, SMS, llamadas automáticas ni notificaciones push/en segundo plano. La actividad se consulta cada 15 segundos mientras la página está visible y conectada. El horario refleja la zona del dispositivo. Las coincidencias son aproximadas por ventana; no prueban cercanía física ni disponibilidad de ayuda. Un viaje vence a las seis horas y puede finalizarse antes. La publicación inicial es privada para el propietario; incorporar otros afiliados requiere ampliar el acceso de forma explícita.

Los números personales se almacenan en D1 y se protegen mediante autorización en servidor, no cifrado de extremo a extremo. Los usuarios pueden actualizar sus contactos. Los datos ya vistos por un destinatario no se pueden retirar de sus capturas o memoria. Antes de abrir el servicio a público general: completar operación de identidad, moderación/reportes, eliminación de cuenta y política de retención, además de validación en dispositivos y un piloto con viajeros.

## Desarrollo

Se conserva el proyecto generado con Sites: React / Vinext, Cloudflare Worker, D1 y migraciones Drizzle. `npm run dev`, `npm run build`, `npm run db:generate`. Las credenciales no deben guardarse en el repositorio.

Pruebas del dominio y reglas de privacidad: `node --experimental-strip-types --test tests/road.test.mjs`. Compilación de tipos: `node node_modules/typescript/bin/tsc --noEmit`.

WebMCP expone `configure_road_search` si el navegador lo soporta. La acción configura una búsqueda y no publica viajes ni activa alertas. No se realizó una prueba en un contexto WebMCP compatible ni pruebas visuales de navegador.
