---
name: saas-architecture-supabase
description: Define la arquitectura técnica, seguridad, base de datos y buenas prácticas para construir el SaaS con React, Vite, Tailwind y Supabase.
---

# Arquitectura SaaS Supabase — Reglas Técnicas Obligatorias

Establece las directrices y estándares técnicos para el desarrollo en el backend (PostgreSQL/Supabase) y frontend (React/TypeScript/Vite/Tailwind).

---

## 1. Seguridad en Base de Datos y Supabase (Reglas Críticas)

### 1.Row Level Security (RLS)
* **Obligatorio:** Todas las tablas operacionales con datos de compañías deben tener RLS habilitado y una política que filtre por `company_id = public.get_my_company_id()`.
* **Tablas blindadas:** Las tablas de configuración crítica como `plans`, `audit_logs`, `companies` y `pending_invitations` deben tener RLS deshabilitado para selects/updates directos del frontend o limitarse estrictamente.

### 2. Funciones RPC (SECURITY DEFINER)
Para ejecutar operaciones privilegiadas que requieran omitir RLS (bypass) de forma segura:
* **search_path obligatorio:** Toda función `SECURITY DEFINER` debe incluir obligatoriamente `SET search_path = public` para mitigar ataques de inyección de esquemas de búsqueda.
* **Validación interna de privilegios:** La función debe comprobar el rol del usuario que la invoca utilizando validaciones como:
  ```plpgsql
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;
  ```
  O validando que el `company_id` del registro coincida con el `company_id` del perfil del invocador.
* **Coalesce contra Nulos:** Los parámetros booleanos (por ejemplo, `p_force`) o campos opcionales pasados por RPC deben sanearse utilizando `coalesce(param, false)` para evitar comportamientos nulos no deseados en la lógica de control.

### 3. Firmas de Ejecución (REVOKE / GRANT)
Toda nueva función creada mediante migraciones debe revocar explícitamente permisos públicos y asignarlos al rol correspondiente al final del script:
```sql
REVOKE ALL ON FUNCTION public.mi_funcion_rpc(...) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mi_funcion_rpc(...) TO authenticated;
```

---

## 2. Buenas Prácticas de Frontend y API

* **No usar `service_role` en frontend:** La clave secreta de `service_role` nunca debe estar presente en el código cliente (`src/`). El frontend solo consume la base de datos usando la anon key (`VITE_SUPABASE_PUBLISHABLE_KEY`) y la sesión del usuario.
* **Bypass de REST API Prohibido:** Evitar mutaciones directas (`.insert`, `.update`, `.delete`) en tablas sensibles como `plans`, `companies`, `profiles` o `pending_invitations`. Toda mutación en estas debe invocarse por RPC para que la base de datos aplique las auditorías, límites de plan y triggers.
* **Evitar `as any` en Typescript:** Utilizar tipado estricto. Si se interactúa con retornos JSON complejos de Supabase, castear a través de `unknown` realizando comprobaciones previas para no silenciar advertencias del linter.
* **Auditoría inmutable:** Las operaciones críticas (ej. creación de empresas, modificación de planes, anulación de deudas o cobros) deben registrar un registro en `audit_logs` con la estructura de datos antiguos (`old_data`) y nuevos (`new_data`).

---

## 3. Gestión de Migraciones en Supabase (Historial Limpio)

* **Sin migraciones temporales en commits:** Nunca se deben crear, subir o versionar archivos de migración temporales (ej. timestamps improvisados, nombres como `temp_promote` o pruebas rápidas) al repositorio.
* **Inmutabilidad del historial:** No se deben borrar, renombrar o modificar archivos de migración SQL que ya hayan sido aplicados y subidos a la rama `main`. Cualquier corrección o alteración del esquema debe aplicarse mediante una nueva migración con un timestamp secuencial superior.
* **Reporte de fallos del CLI:** Si durante el desarrollo o integración de una fase el comando `npx supabase migration list` no responde, se cuelga o falla por falta de dependencias del entorno local (Docker, etc.), no se debe reportar como validada la migración remota. Se debe reportar explícitamente:
  `No pude confirmar migration list remoto porque el CLI no respondió.`
* **No usar migraciones para promover usuarios:** Nunca crear migraciones para inyectar o promover usuarios de prueba en Auth. Los usuarios de QA o demostraciones deben crearse mediante scripts transitorios locales o interfaz gráfica, manteniendo limpias las migraciones del sistema de producción.
