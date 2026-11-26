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
ios-res/           pantalla de inicio de iPhone
scripts/           android.mjs e ios.mjs (preparan Android e iPhone en GitHub), iconos.py (regenera iconos)
store/             FICHA.md (textos de las tiendas), iconos, imagen destacada y capturas
.github/workflows/ web.yml (pruebas + web), android.yml (APK y AAB) e ios.yml (iPhone)
```

## Puesta en marcha (una sola vez)

No hay que configurar nada: cada cambio en `main` publica la web (workflow **Probar y publicar la web**, que copia `public/` a la rama `gh-pages`) y compila las apps de Android e iPhone automáticamente.

En *Settings → Pages* debe quedar «Implementar desde una rama» → `gh-pages` / `(root)` (se pone solo la primera vez). No lo cambies a «GitHub Actions».

## App de Android (sin Android Studio)

Cada vez que se sube un cambio a `main`, GitHub compila la app solo (workflow **App Android**, pestaña *Actions*). Cuando termina (unos 8-10 minutos), en la pestaña **Releases** del repositorio aparece **«App Android (última versión)»** con:

- `GuardaTicket-prueba.apk` (o `GuardaTicket.apk` si hay firma): ábrelo desde el móvil para instalar la app y probarla. Android te pedirá permitir «instalar apps de origen desconocido» solo esa vez.
- `GuardaTicket-google-play.aab`: el archivo que se sube a Google Play (solo aparece cuando la firma está configurada).

La app usa **Capacitor 8**, que apunta a **Android 16 (API 36)**: lo que Google Play exige desde el 31 de agosto de 2026 para apps nuevas.

### Firma (necesaria para Google Play)

La firma va en los *secrets* del repositorio (*Settings → Secrets and variables → Actions → New repository secret*). Si aún no están, créalos con los datos de `firma-android-LEEME.txt` (el primero es todo el texto de `firma-base64.txt`) y vuelve a lanzar «App Android» desde la pestaña Actions:

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


## App de iPhone (App Store) sin Mac

El workflow **App iPhone** compila la app en un Mac de GitHub (macOS 26 con Xcode 26, lo que exige App Store desde abril de 2026):

- **Sin configurar nada:** en cada cambio comprueba que la app de iPhone compila.
- **Con tu cuenta de Apple configurada:** la firma y la sube a App Store Connect. Aparece en **TestFlight** y desde ahí la envías a revisión.

La app es solo para iPhone y en vertical, así que App Store no pide capturas de iPad.

### Lo que hay que hacer una vez (vale para todas tus apps)

1. Darte de alta en el **Apple Developer Program** (99 $/año) en developer.apple.com.
2. **App Store Connect → Usuarios y acceso → Integraciones → App Store Connect API → Generar clave**, con acceso **Admin** (lo necesita Xcode para crear los certificados él solo). Descarga el archivo `.p8` (solo se puede descargar una vez) y apunta el **Key ID** y el **Issuer ID**.
3. Tu **Team ID**: developer.apple.com → Account → Membership details.
4. En este repositorio, *Settings → Secrets and variables → Actions*:

| Secret | Qué es |
|---|---|
| `APPLE_TEAM_ID` | el Team ID |
| `ASC_KEY_ID` | el Key ID de la clave |
| `ASC_ISSUER_ID` | el Issuer ID |
| `ASC_KEY_P8` | el contenido completo del archivo `.p8` (desde `-----BEGIN PRIVATE KEY-----` hasta el final) |

5. **App Store Connect → Apps → «+» → Nueva app**: iOS, nombre, idioma español, Bundle ID `io.github.danieltolosalopezops.guardaticket` y un SKU cualquiera (por ejemplo, `guardaticket-ios`). Si el Bundle ID aún no aparece, lanza una vez el workflow *App iPhone*: Xcode lo registra solo.
6. *Actions → App iPhone → Run workflow*. En unos 15-20 minutos la versión aparece en TestFlight. Rellena la ficha con los textos de `store/FICHA.md`, añade las capturas de `store/capturas/iphone-6.9/` y `store/capturas/iphone-6.3/` y envía a revisión.

## Ficha de las tiendas

`store/FICHA.md` tiene todos los textos para Google Play y App Store (nombre, descripciones, palabras clave, categoría, URLs, respuestas de privacidad y notas para la revisión), ya ajustados a los límites de caracteres. Las capturas están en `store/capturas/` a los tamaños que piden las tiendas. Para rehacerlas: `bash test/capturas.sh public test/capturas.pasos.mjs store`.

## Revisión automática

Una tarea programada revisa la app dos veces al día (pruebas, web publicada y compilaciones de Android e iPhone) y corrige los fallos que encuentre. Lo que hace queda anotado en `MANTENIMIENTO.md`.

## Ideas para ganar dinero más adelante

- **Versión Pro** de pago único (2-3 €): copia de seguridad automática, más de 20 tickets, exportar a PDF.
- **Afiliación** en el aviso de renovación de seguros (comparadores de seguros de coche y hogar).

## Aviso legal

Herramienta orientativa, no oficial. No sustituye el asesoramiento de una oficina de consumo o un abogado.

Fuentes tipográficas: Anonymous Pro y DM Sans (licencia SIL Open Font License, en `public/fonts`).
