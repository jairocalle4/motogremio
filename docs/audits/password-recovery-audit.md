# Plan de Implementación: Recuperación de Contraseña y Manual Técnico Privado

## 1. Auditoría inicial

### Resumen de la Auditoría

| Elemento | Estado actual | Riesgo | Acción necesaria |
|---|---|---|---|
| Enlace “Olvidé mi contraseña” | ❌ No existe | Los usuarios no pueden restablecer su contraseña si la pierden | Agregar enlace en `LoginPage.tsx` que dirija a `/auth/forgot-password`. |
| Página para solicitar correo | ❌ No existe | No hay interfaz para ingresar el correo de recuperación | Crear `ForgotPasswordPage.tsx` en `src/features/auth/ForgotPasswordPage.tsx`. |
| Página para nueva contraseña | ❌ No existe | No hay interfaz para ingresar la nueva contraseña desde el enlace de Supabase | Crear `ResetPasswordPage.tsx` en `src/features/auth/ResetPasswordPage.tsx`. |
| Evento PASSWORD_RECOVERY | ❌ No manejado | Si el usuario hace clic en el enlace, el frontend no capturará el flujo y lo redirigirá al dashboard o al login sin permitirle cambiarla | Agregar control del evento `PASSWORD_RECOVERY` en `AuthContext.tsx` o interceptor del router. |
| Redirect URL | ⚠️ No verificable remotamente | Que el enlace de recuperación envíe al usuario a una URL inválida | Configurar `https://motogremio.pages.dev/auth/reset-password` y `http://localhost:5173/auth/reset-password` en el Dashboard de Supabase. |
| SMTP | ⚠️ No verificable remotamente | Que los correos no se entreguen o vayan a Spam | Evaluar el uso del SMTP integrado de Supabase vs. SMTP personalizado y marcarlo como pendiente de validación. |
| Política de contraseña | 🔒 Mínimo 6 caracteres | Inconsistencia en la validación | Reutilizar la validación de `ChangePasswordPage.tsx` (mínimo 6 caracteres). |
| Super Admin | 🔒 bootstrap_first_super_admin | Escalación de privilegios o pérdida de acceso del Super Admin | Auditar y documentar la función SQL `public.bootstrap_first_super_admin` que restringe su ejecución a `postgres`. |

---

## 2. Propuesta de Cambios

### Componentes y Rutas Nuevas

1. **Rutas Públicas Nuevas** en `src/router/index.tsx`:
   - `/auth/forgot-password` -> `ForgotPasswordPage`
   - `/auth/reset-password` -> `ResetPasswordPage`

2. **`ForgotPasswordPage.tsx`**:
   - Formulario limpio con Zod y React Hook Form.
   - Campo: Correo electrónico.
   - Envío a: `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })`.
   - Mensaje de confirmación genérico para evitar enumeración.

3. **`ResetPasswordPage.tsx`**:
   - Formulario para ingresar la nueva contraseña y confirmar.
   - Llama a `supabase.auth.updateUser({ password: newPassword })`.
   - Cierra sesión de recuperación y redirige al Login con mensaje de éxito.

4. **Modificación de `AuthContext.tsx`**:
   - Asegurar que no interfiera redirigiendo automáticamente si detecta el evento de recuperación.
   
5. **Modificación de `ProtectedRoute.tsx`**:
   - Asegurar que `/auth/reset-password` y `/auth/forgot-password` sean accesibles sin autenticación.

6. **Modificación de `LoginPage.tsx`**:
   - Agregar el enlace de "¿Olvidaste tu contraseña?".

---

## 3. Documentación

1. Crear el **Manual Técnico y Operativo Privado** en `private-docs/` (añadido al `.gitignore` para no subir a Git).
2. Crear guías y listas de verificación técnicas sanitizadas en `docs/technical/`.
3. Actualizar el **Manual de Usuario** en `docs/manual/`.
