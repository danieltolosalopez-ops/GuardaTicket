# Registro de mantenimiento

Revisión automática dos veces al día. Aquí solo se anotan los días en que se corrigió algo o se detectó un problema.

| Fecha | Qué pasó | Qué se hizo |
|---|---|---|
| 26/11/2026 | Publicación inicial | Web, app de Android (Capacitor 8, API 36) e iPhone (Xcode 26) preparadas en GitHub Actions. |
| 26/11/2026 | Texto con falta de concordancia: «Quedan 1 mes» / «Quedan 1 día» cuando a la garantía le queda exactamente 1 mes, 1 día o 1 año. | Ahora dice «Queda 1 mes» (y «Quedan 3 meses» en los demás casos), en la lista y en el detalle. Prueba nueva; las 12 pruebas y las pruebas visuales pasan. |
| 27/11/2026 | Fallo que podía estropear un ticket: si guardabas un ticket con foto y pulsabas enseguida «Guardar ticket» para meter otro (antes de que terminara de guardarse la foto), el primero se quedaba sin nombre, sin tienda, con la fecha de hoy y sin la foto. Pasaba en la web y en las apps. | Ahora el formulario se lee antes de empezar a guardar las fotos, así que abrir el siguiente ya no le afecta. Comprobación nueva en la prueba de la app nativa; las 12 pruebas y las pruebas visuales pasan. No cambia cómo se guardan los datos. |
| 27/11/2026 | Fallo que podía perder la foto del ticket: si elegías o hacías la foto y pulsabas «Guardar» antes de que la app terminara de prepararla (≈1 segundo en el móvil), el ticket se guardaba sin la foto; y si además abrías enseguida otro ticket, la foto aparecía en el formulario del siguiente. Pasaba en la web y en las apps. | Ahora, al guardar, la app espera a que la foto esté lista, y cada foto se queda en el ticket en el que se eligió. Comprobación nueva en la prueba de la app nativa; las 12 pruebas y las pruebas visuales pasan. No cambia cómo se guardan los datos. |
