# Guía de Puesta en Marcha de un Entorno Nuevo (Bootstrap)
## Documentación Técnica Sanitizada

Esta guía detalla los pasos para levantar un entorno nuevo (desarrollo, QA o producción) de **MotoGremio EC** utilizando Supabase y Cloudflare Pages.

---

## 1. Configuración del Proyecto en Supabase

1. Crear un proyecto en Supabase Dashboard.
2. Anotar la referencia del proyecto (`project_ref`).
3. Registrar la región del servidor.
4. Definir la contraseña de la base de datos y guardarla en un gestor de contraseñas seguro.

---

## 2. Inicialización de la Base de Datos (CLI)

1. Autenticar la CLI local:
   ```bash
   npx supabase login
   ```
2. Vincular el proyecto:
   ```bash
   npx supabase link --project-ref <NUEVO_PROJECT_REF>
   ```
3. Empujar el esquema de la base de datos ejecutando las migraciones:
   ```bash
   npx supabase db push
   ```
4. Verificar que todas las migraciones locales aparezcan como aplicadas (`active`) en el entorno remoto:
   ```bash
   npx supabase migration list
   ```

---

## 3. Generación de Tipos de TypeScript

Si existen cambios en el esquema, se deben regenerar los tipos para asegurar la consistencia del frontend:
```bash
npx supabase gen types typescript --linked > src/types/database.types.ts
```

---

## 4. Configuración de Variables en Cloudflare Pages

En el panel de Cloudflare Pages, configure las siguientes variables de entorno en la sección de compilación:
- `VITE_SUPABASE_URL`: URL de la API del nuevo proyecto de Supabase.
- `VITE_SUPABASE_ANON_KEY`: Clave pública anónima de Supabase.
- `NODE_VERSION`: `20.x`

---

## 5. SMTP de Producción (Recomendación Crítica)

Para que el envío de correos de recuperación de contraseña e invitaciones de usuarios funcione de forma confiable, **no se debe usar el proveedor de correos interno de Supabase**, ya que posee un límite estricto de 3 correos por hora.

Debe habilitarse SMTP personalizado en **Authentication → Providers → SMTP** con un proveedor verificado (Resend, SendGrid, Amazon SES, etc.).

---

## 6. Creación del primer Superadministrador

En una instalación limpia, ningún usuario posee privilegios globales. Siga este flujo:
1. Cree un usuario manualmente en **Authentication → Users** desde el Dashboard de Supabase.
2. Copie el UUID del usuario.
3. En el SQL Editor de Supabase, ejecute la función exclusiva de bootstrap:
   ```sql
   SELECT public.bootstrap_first_super_admin('<UUID_DEL_USUARIO>'::uuid);
   ```
4. Esta función actualizará el registro en `public.profiles` asignándole el rol `super_admin` de forma segura.
5. Inicie sesión en el frontend para confirmar el acceso al Panel Global de Superadministrador.
