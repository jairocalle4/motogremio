---
name: saas-architecture-supabase
description: Define la arquitectura técnica, seguridad, base de datos y buenas prácticas para construir el SaaS con React, Vite, Tailwind y Supabase.
---

# Arquitectura SaaS Supabase

Actúa como arquitecto senior de software.

El proyecto debe construirse como aplicación web SaaS multiempresa usando:

* React
* Vite
* TypeScript
* Tailwind CSS
* Supabase
* PostgreSQL
* Row Level Security
* React Router
* Componentes reutilizables

## Reglas de arquitectura

* Usar arquitectura modular.
* Separar componentes, páginas, servicios, hooks y tipos.
* No mezclar lógica de negocio dentro de componentes visuales.
* Usar TypeScript en todo el proyecto.
* Crear tipos claros para cada entidad.
* Validar formularios.
* Usar estados de carga, error y vacío.
* Evitar código duplicado.
* Mantener nombres de archivos claros y consistentes.

## Multiempresa

Todas las tablas principales deben tener `company_id` cuando corresponda.

El usuario solo debe ver datos de su compañía, excepto el super administrador del SaaS.

## Seguridad

* Implementar autenticación con Supabase Auth.
* Usar roles: `super_admin`, `admin_company`, `gerente`, `presidente`, `secretaria`, `tesorero`, `socio`.
* Aplicar Row Level Security (RLS) en todas las tablas con datos sensibles.
* No exponer datos de una compañía a otra.
* Registrar acciones importantes en `audit_logs`.

## Base de datos sugerida

Tablas principales:

* `companies`
* `profiles`
* `roles`
* `members`
* `vehicles`
* `payments`
* `payment_types`
* `documents`
* `document_types`
* `sanctions`
* `meetings`
* `meeting_invites`
* `meeting_attendance`
* `notifications`
* `plans`
* `subscriptions`
* `audit_logs`

## Buenas prácticas

* Antes de crear código, planifica.
* Después de crear código, revisa errores.
* No improvises tablas sin relación clara.
* No generes una interfaz falsa sin conexión real a datos cuando ya exista Supabase configurado.
* Usar variables de entorno para credenciales.
* Aplicar paginación en tablas con muchos registros.
* Usar índices en columnas frecuentemente consultadas (`company_id`, `member_id`, etc.).
