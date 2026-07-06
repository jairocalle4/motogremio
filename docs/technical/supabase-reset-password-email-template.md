# Plantilla de Correo de Recuperación de Contraseña
## Documentación Técnica Sanitizada

Para personalizar la plantilla de correo en el panel de Supabase:

1. Ingrese a **Supabase Dashboard**.
2. Vaya a **Authentication → Email Templates**.
3. Seleccione **Reset Password**.
4. Ingrese los siguientes parámetros:

### Asunto (Subject)
```text
Restablecer contraseña de MotoGremio EC
```

### Cuerpo del mensaje (Body)
```html
<h2>Restablecer contraseña de MotoGremio EC</h2>
<p>Recibimos una solicitud para cambiar la contraseña de tu cuenta.</p>
<p>Presiona el botón de abajo para crear una nueva contraseña:</p>
<p><a href="{{ .ConfirmationURL }}" style="background-color:#1E3A5F;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;display:inline-block;">Crear nueva contraseña</a></p>
<p>Si no realizaste esta solicitud, puedes ignorar este mensaje.</p>
```
