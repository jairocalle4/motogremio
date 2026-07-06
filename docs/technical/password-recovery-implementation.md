# Flujo de Recuperación de Contraseña (Password Recovery)
## Documentación de Implementación Técnica

Esta guía describe el diseño, la lógica de negocio y las decisiones técnicas tomadas para implementar el flujo seguro de recuperación de contraseña ("Olvidé mi contraseña" y "Establecer nueva contraseña") en **MotoGremio EC**.

---

## 1. Flujo de Experiencia de Usuario (UX)

El flujo sigue los estándares de seguridad web modernos:
1. **Acceso al Login:** En `/login`, se presenta un enlace visible "¿Olvidaste tu contraseña?".
2. **Solicitud de Correo:** Al hacer clic, redirige a la ruta pública `/auth/forgot-password`. El usuario ingresa su correo electrónico.
3. **Respuesta Genérica:** Al enviar, se muestra un mensaje de éxito uniforme independientemente de si el correo existe o no en la base de datos (previniendo enumeración de cuentas).
4. **Correo con Enlace Seguro:** Si la cuenta existe, Supabase Auth genera un correo electrónico temporal con un enlace de recuperación.
5. **Redirección:** El enlace de recuperación apunta a `https://motogremio.pages.dev/auth/reset-password`.
6. **Formulario de Nueva Contraseña:** El usuario ingresa la nueva clave, se valida la coincidencia de los campos y la longitud mínima (6 caracteres), y se guarda la nueva clave usando `supabase.auth.updateUser({ password: newPassword })`.
7. **Cierre de Sesión y Login:** El sistema cierra sesión globalmente y redirige al usuario a `/login` con un mensaje de éxito.

---

## 2. API de Supabase Utilizada

Se utilizó la versión `^2.45.0` de `@supabase/supabase-js`.

### 2.1 Envío del Correo de Recuperación
En `src/features/auth/ForgotPasswordPage.tsx`:
```typescript
const redirectToUrl = `${window.location.origin}/auth/reset-password`
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: redirectToUrl,
})
```

### 2.2 Actualización de la Contraseña
En `src/features/auth/ResetPasswordPage.tsx`:
```typescript
const { error } = await supabase.auth.updateUser({
  password: newPassword,
})
```

---

## 3. Seguridad Contra Enumeración de Cuentas

Para evitar revelar qué correos electrónicos están registrados en la plataforma:
- Tanto en la UI como en el manejo de la API, se muestra un mensaje genérico al presionar enviar: *"Si la dirección ingresada está registrada en el sistema, recibirás un mensaje con un enlace para restablecer tu contraseña."*
- No se muestra el error `User not found` de Supabase al usuario de frontend.
- Los únicos errores del servidor mostrados son de conectividad o de límite de peticiones (`Too many requests`).

---

## 4. Control de Redirecciones Incorrectas

- **AuthContext:** Se modificó `onAuthStateChange` para interceptar el evento `PASSWORD_RECOVERY` y evitar que el hook redirija prematuramente al usuario al Dashboard o al Panel de Superadministrador al detectar la sesión inicial de recuperación.
- **ProtectedRoute:** Las rutas `/auth/forgot-password` y `/auth/reset-password` están registradas como rutas públicas fuera de `ProtectedRoute`.
- **Cierre Global de Sesión:** Tras guardar la nueva contraseña, se ejecuta `supabase.auth.signOut({ scope: 'global' })` para invalidar cualquier sesión antigua en otros dispositivos y redirigir limpiamente a la pantalla de login.
