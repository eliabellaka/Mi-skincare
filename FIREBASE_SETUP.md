# Activar cuentas y sincronización con Firebase

La app puede seguir usándose en modo local sin configurar Firebase. Para crear
cuentas y compartir los datos entre ordenador y móvil, completa estos pasos una
vez en tu proyecto Firebase:

1. En [Firebase Console](https://console.firebase.google.com/), crea un proyecto.
2. Añade una aplicación web y copia los valores de configuración que muestra.
   Pégalos en `firebase-config.js` (`apiKey`, `authDomain`, `projectId` y
   `appId`). La configuración web identifica el proyecto; **no** pegues aquí
   una clave privada o una clave de cuenta de servicio.
3. En **Authentication → Sign-in method**, activa **Google** y selecciona el
   correo de asistencia del proyecto. Guarda los cambios. Puedes dejar
   **Email/Password** como método alternativo si también quieres usarlo.
4. En **Firestore Database**, crea una base de datos y publica el contenido de
   `firestore.rules` en la pestaña **Rules**.
5. Para probar con Live Server, añade `localhost` a los dominios autorizados en
   **Authentication → Settings → Authorized domains** si no aparece ya.
6. Abre la app con Live Server, pulsa **Iniciar sesión** y elige **Continuar
   con Google**. En ordenador se abrirá una ventana emergente; en móvil la
   autenticación vuelve a la app mediante redirección. Al primer inicio, los
   datos locales de este navegador se copian a tu cuenta.

Para usar la cuenta en el móvil, la página debe estar alojada en una URL que el
móvil pueda abrir (idealmente HTTPS). Live Server en `localhost` solo se refiere
al propio dispositivo; no es una dirección compartida por internet. Puedes
publicar el sitio estático con Firebase Hosting u otro alojamiento HTTPS y
añadir ese dominio a los dominios autorizados de Authentication.

La sincronización incluye colección, estudios, rutinas, calendario, estado de
ánimo, checklist e historial y ritual. Los datos locales se conservan incluso
al cerrar sesión. Si la cuenta ya tiene datos en la nube, esos datos prevalecen
para cada clave sincronizada; las claves que falten se importan desde el
navegador actual.

Las reglas incluidas solo permiten que cada usuario lea y escriba documentos
bajo su propio UID. No publiques la base de datos con reglas abiertas.
