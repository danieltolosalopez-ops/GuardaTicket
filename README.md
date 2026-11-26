# Guarda el Ticket · Tus garantías bajo control

Haz una foto al ticket al comprar algo. La app calcula hasta cuándo dura la **garantía legal española**, te **avisa antes de que termine** y, si algo se estropea, te prepara la **carta de reclamación** lista para enviar. También vigila **seguros, suscripciones y contratos** que se renuevan solos.

- **Web (y app instalable desde el navegador):** https://danieltolosalopez-ops.github.io/GuardaTicket/
- **App de Android:** pestaña *Releases* de este repositorio.
- Sin registro, sin servidor y sin anuncios: las fotos y los datos se quedan en el móvil. Coste de funcionamiento: 0 €.

## Qué hace

- **Tickets:** foto con la cámara o de la galería (se reduce a ≈300 KB), producto, tienda, fecha, precio y tipo de compra. Calcula la garantía:
  - nuevo desde el 1/1/2022 → 3 años, con 2 años en los que la tienda tiene que demostrar que el fallo no venía de fábrica;
  - segunda mano a una empresa → 3 años o lo pactado por escrito (mínimo 1);
  - apps, juegos y contenido digital → 2 años; compras anteriores a 2022 → 2 años;
  - garantía ampliada del fabricante, si dura más.
- **Sellos de estado** (en garantía, termina pronto, caducada), filtros y buscador.
- **Avisos** (app de Android): 60 y 7 días antes de que acabe cada garantía; antes de cada renovación (45 días para seguros, por el preaviso de un mes del art. 22 de la Ley de Contrato de Seguro). En la web: «Añadir aviso al calendario».
- **Carta de reclamación** con los datos del producto y la base legal (RDL 1/2007), editable, para enviar por correo o WhatsApp.
- **Renovaciones:** recibo con todo lo que se renueva solo y el **total que pagas al año**.
- **Copia de seguridad** en un archivo (con fotos) y restauración.

## Estructura

```
public/            la app (HTML, CSS y JavaScript sin librerías)
  garantia.js      cálculo de garantías, renovaciones y carta
  db.js            almacenamiento local (IndexedDB)
  app.js           interfaz
  native.js        avisos y compartir archivos en la app de Android
test/              pruebas automáticas (node --test test/*.test.mjs) y recorrido visual (probar.mjs)
android-res/       iconos y pantalla de inicio de Android
scripts/           android.mjs (prepara Android en GitHub) e iconos.py (regenera iconos)
store/             imágenes para la ficha de Google Play
.github/workflows/ web.yml (pruebas + web) y android.yml (APK y AAB)
```

## Puesta en marcha (una sola vez)

1. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. Cada cambio en `main` publica la web y compila la app de Android automáticamente.

## App de Android (sin Android Studio)

Cada vez que se sube un cambio a `main`, GitHub compila la app solo (workflow **App Android**, pestaña *Actions*). Cuando termina (unos 8-10 minutos), en la pestaña **Releases** del repositorio aparece **«App Android (última versión)»** con:

- `GuardaTicket-prueba.apk` (o `GuardaTicket.apk` si hay firma): ábrelo desde el móvil para instalar la app y probarla. Android te pedirá permitir «instalar apps de origen desconocido» solo esa vez.
- `GuardaTicket-google-play.aab`: el archivo que se sube a Google Play (solo aparece cuando la firma está configurada).

La app usa **Capacitor 8**, que apunta a **Android 16 (API 36)**: lo que Google Play exige desde el 31 de agosto de 2026 para apps nuevas.

### Firma (necesaria para Google Play)

La firma está guardada en los *secrets* del repositorio (*Settings → Secrets and variables → Actions*):

| Secret | Qué es |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | el archivo de firma (`.jks`) en base64 |
| `ANDROID_KEYSTORE_PASSWORD` | contraseña del archivo |
| `ANDROID_KEY_ALIAS` | nombre de la clave |
| `ANDROID_KEY_PASSWORD` | contraseña de la clave |

**Guarda una copia del archivo `.jks` y de sus contraseñas fuera de GitHub** (por ejemplo, en tu gestor de contraseñas). Es tu «clave de subida» a Google Play: si la pierdes, hay que pedir a Google que la cambie.

Para crear una firma nueva: `keytool -genkeypair -v -keystore firma.jks -alias subida -keyalg RSA -keysize 2048 -validity 10000` y `base64 -w0 firma.jks` para el primer secret.

### Publicar en Google Play

1. Cuenta de desarrollador de Google Play (25 $, una sola vez; sirve para todas tus apps).
2. *Crear aplicación* → nombre, idioma español, gratuita.
3. **Prueba cerrada** con al menos **12 testers durante 14 días seguidos** (obligatorio en cuentas personales nuevas). Puedes usar el mismo grupo de testers para todas tus apps.
4. Sube el `.aab` de *Releases*. Activa *Firma de apps de Google Play* (Google guarda la clave final; la tuya es solo la de subida).
5. Ficha de la tienda: icono `store/play-icon-512.png`, imagen destacada `store/play-destacada-1024x500.png`, 2-8 capturas hechas con el móvil, y la política de privacidad: `https://danieltolosalopez-ops.github.io/GuardaTicket/privacy.html`.
6. Formularios: *Seguridad de los datos* → «No se recoge ni se comparte ningún dato» (las fotos se quedan en el móvil); *Anuncios* → no; *Clasificación de contenido* → cuestionario (apta para todos).


## Ideas para ganar dinero más adelante

- **Versión Pro** de pago único (2-3 €): copia de seguridad automática, más de 20 tickets, exportar a PDF.
- **Afiliación** en el aviso de renovación de seguros (comparadores de seguros de coche y hogar).

## Aviso legal

Herramienta orientativa, no oficial. No sustituye el asesoramiento de una oficina de consumo o un abogado.

Fuentes tipográficas: Anonymous Pro y DM Sans (licencia SIL Open Font License, en `public/fonts`).
