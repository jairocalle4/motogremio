# Lista de verificación para la configuración de Supabase Auth
## Documentación Técnica Sanitizada

Esta lista de verificación permite al administrador técnico validar que los parámetros de autenticación del nuevo entorno de Supabase están configurados correctamente para soportar el flujo de recuperación de contraseña de **MotoGremio EC**.

---

## 1. Configuración de URLs de redireccionamiento

En el panel de Supabase Dashboard, diríjase a **Authentication → URL Configuration** y configure:

- [ ] **Site URL:**
  - URL base de producción: `https://motogremio.pages.dev`
- [ ] **Redirect URLs:**
  - Agregar: `https://motogremio.pages.dev/auth/reset-password`
  - Agregar: `http://localhost:5173/auth/reset-password`

> **Nota de Seguridad:** No use comodines amplios (`*`) a menos que sea estrictamente necesario para entornos de pruebas o vistas previas específicas del desarrollador.

---

## 2. Proveedor de Correo y SMTP

En **Authentication → Providers → SMTP**:

- [ ] **Habilitar SMTP:** Activado.
- [ ] **Host:** Host del proveedor SMTP verificado.
- [ ] **Port:** `587` (o el correspondiente a TLS del proveedor).
- [ ] **Username:** Usuario del servicio.
- [ ] **Password:** Contraseña de API o contraseña SMTP del servicio.
- [ ] **Sender Email:** Correo verificado del remitente oficial de la compañía (ej. `no-reply@motogremio.com`).

---

## 3. Plantillas de correo (Email Templates)

En **Authentication → Email Templates → Reset Password**:

- [ ] **Subject:** `Restablecer contraseña de MotoGremio EC`
- [ ] **Body:**
  ```html
  <h2>Restablecer contraseña de MotoGremio EC</h2>
  <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta.</p>
  <p>Presiona el botón de abajo para crear una nueva contraseña:</p>
  <p><a href="{{ .ConfirmationURL }}" style="background-color:#1E3A5F;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;display:inline-block;">Crear nueva contraseña</a></p>
  <p>Si no realizaste esta solicitud, puedes ignorar este mensaje.</p>
  ```
