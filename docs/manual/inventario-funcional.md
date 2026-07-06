# Inventario Funcional — MotoGremio EC

> Versión verificada: rama `main` — julio 2026  
> Este inventario fue generado revisando el código fuente real (`src/router`, `src/features`, `src/hooks/usePermissions.ts`, `src/types/index.ts`).

---

## Módulos del Sistema

| # | Módulo | Ruta | Acceso | Estado | Incluir en Manual |
|---|--------|------|--------|--------|-------------------|
| 1 | Inicio de sesión | `/login` | Todos | ✅ Disponible | Sí |
| 2 | Registro de compañía | `/register` | Todos | ✅ Disponible | Sí (flujo de onboarding) |
| 3 | Dashboard de compañía | `/dashboard` | Todos los roles | ✅ Disponible | Sí |
| 4 | Portal del socio | `/dashboard` | `socio` (vista especial) | ✅ Disponible | Sí |
| 5 | Socios | `/socios` | admin, gerente, presidente, secretaria, tesorero, operador | ✅ Disponible | Sí |
| 6 | Detalle de socio | `/socios/:id` | idem anterior | ✅ Disponible | Sí |
| 7 | Conductores | `/conductores` | admin, gerente, presidente, secretaria, tesorero, operador | ✅ Disponible | Sí |
| 8 | Detalle de conductor | `/conductores/:id` | idem anterior | ✅ Disponible | Sí |
| 9 | Unidades / Vehículos | `/unidades` | admin, gerente, presidente, secretaria, tesorero, operador | ✅ Disponible | Sí |
| 10 | Detalle de unidad | `/unidades/:id` | idem anterior | ✅ Disponible | Sí |
| 11 | Pagos y Cuotas | `/pagos` | admin, gerente, tesorero, operador | ✅ Disponible | Sí |
| 12 | Documentos | `/documentos` | admin, secretaria | ✅ Disponible | Sí |
| 13 | Sanciones | `/sanciones` | admin, gerente, presidente, secretaria, operador | ✅ Disponible | Sí |
| 14 | Reuniones | `/reuniones` | admin, gerente, presidente, secretaria, operador | ✅ Disponible | Sí |
| 15 | Detalle de reunión | `/reuniones/:id` | idem anterior | ✅ Disponible | Sí |
| 16 | Notificaciones/Alertas | `/notificaciones` | Todos los roles (incluye socio) | ✅ Disponible | Sí |
| 17 | Reportes | `/reportes` | admin, gerente, presidente, secretaria, tesorero, operador, super_admin | ✅ Disponible | Sí |
| 18 | Usuarios de compañía | `/usuarios` | super_admin, admin | ✅ Disponible | Sí |
| 19 | Configuración de compañía | `/configuracion` | super_admin, admin | ✅ Disponible | Sí |
| 20 | Auditoría de compañía | `/auditoria` | super_admin, admin | ⚠️ Placeholder | Solo inventario |
| 21 | Cambio de contraseña | `/account/security` | Todos los autenticados | ✅ Disponible | Sí |
| 22 | Dashboard super admin | `/super-admin` | super_admin | ✅ Disponible | Sí (sección SA) |
| 23 | Compañías (SA) | `/super-admin/companies` | super_admin | ✅ Disponible | Sí (sección SA) |
| 24 | Detalle compañía (SA) | `/super-admin/companies/:id` | super_admin | ✅ Disponible | Sí (sección SA) |
| 25 | Planes (SA) | `/super-admin/plans` | super_admin | ✅ Disponible | Sí (sección SA) |
| 26 | Suscripciones (SA) | `/super-admin/subscriptions` | super_admin | ✅ Disponible | Sí (sección SA) |
| 27 | Alertas Globales (SA) | `/super-admin/alerts` | super_admin | ✅ Disponible | Sí (sección SA) |
| 28 | Configuración Global (SA) | `/super-admin/settings` | super_admin | ✅ Disponible | Sí (sección SA) |
| 29 | Auditoría (SA) | `/super-admin/auditoria` | super_admin | ✅ Disponible | Sí (sección SA) |
| 30 | Métricas (SA) | `/super-admin/metrics` | super_admin | ⚠️ Placeholder | Solo inventario |
| 31 | Seguridad (SA) | `/super-admin/security` | super_admin | ⚠️ Placeholder | Solo inventario |

---

## Funciones por Módulo (Resumen)

### Autenticación
- Inicio de sesión con correo y contraseña
- Mostrar / ocultar contraseña
- Redirección según el rol (super_admin → panel SA; otros → dashboard)
- Manejo de errores de autenticación en español
- Pantalla de usuario inactivo (AccountDisabledPage)
- Pantalla de compañía suspendida (CompanySuspendedPage)
- Cierre de sesión desde el menú lateral

### Socios
- Listar socios con búsqueda y filtros
- Crear socio (nombre, CI, contacto, fecha de ingreso, grupo sanguíneo)
- Editar socio
- Activar / desactivar socio
- Ver detalle de socio con licencias y vehículos asociados
- Registrar licencia de conducir del socio (tipo, número, fechas, archivo)

### Conductores
- Listar conductores
- Crear conductor (puede ser externo — sin socio vinculado)
- Editar conductor
- Activar / desactivar
- Ver detalle con licencias y unidades asignadas
- Gestionar licencias de conductor

### Unidades / Vehículos
- Listar unidades con filtros y búsqueda
- Crear unidad (disco, placa, marca, modelo, tipo de vehículo, socio propietario)
- Editar unidad
- Cambiar estado (activa, inactiva, mantenimiento)
- Ver detalle con conductor asignado e historial de asignaciones
- Asignar / desasignar conductor
- Agregar documentos a la unidad

### Documentos
- Ver documentos de la compañía, socios y unidades
- Subir documentos (archivo con fecha de vencimiento)
- Ver estado: vigente, por vencer (menos de 30 días), vencido
- Filtrar por entidad y tipo
- Abrir / descargar documentos desde Cloudinary

### Pagos y Cuotas
- Ver KPIs: Total facturado, total recaudado, saldo pendiente, deudores
- Lista de Deudores con búsqueda y filtros
- Registrar pago desde modal (selección de cuotas, método, fecha, referencia)
- Restricción: multas por sanción se pagan individualmente y en monto exacto
- Historial de Pagos con búsqueda y filtros
- Tipos de Cobro: crear, editar, desactivar
- Tipos recurrentes vs. eventuales
- Tipos de sistema (sanciones) NO visibles en UI de administración
- Configurar cuota mensual (seed de tipo recurrente)
- Generar cuotas del mes (RPC atómica por unidades activas)
- Botón Actualizar

### Sanciones
- Listar sanciones con estado administrativo y financiero por separado
- Crear sanción: socio, tipo, fecha, descripción, monto de multa, reunión asociada (opcional)
- Ver detalle: estado, cargo vinculado, pagos aplicados
- Apelar sanción (solo cuando está pendiente o resuelta con cargo pendiente)
- Resolver sanción con opciones: Confirmar multa, Modificar multa, Anular multa
- Restricción: Modificar/Anular solo sin pagos previos aplicados
- Pago de multa: exclusivamente desde Pagos y Cuotas, saldo completo

### Reuniones
- Listar reuniones con estado y tipo
- Crear reunión (título, tipo, fecha, hora, lugar, obligatoriedad, multa por inasistencia)
- Ver detalle de reunión
- Registrar asistencia (asistió, faltó, tarde, justificado)
- Finalizar reunión (cierra asistencia)
- Cancelar reunión
- Generar sanción automática por inasistencia injustificada a reunión obligatoria

### Alertas / Notificaciones
- Centro de alertas interno
- Visible para todos los roles incluyendo `socio`
- Alertas de vencimiento de documentos, licencias
- Alertas de morosidad

### Reportes
- Reporte de socios / conductores
- Reporte de unidades / vehículos
- Reporte de documentos y licencias
- Reporte financiero
- Reporte de sanciones
- Filtros por fecha
- Exportación a Excel (usando ExcelJS con colores y bordes)
- Impresión con cabecera de compañía

### Configuración de Compañía
- Datos generales: nombre legal, nombre comercial, RUC, dirección, contacto
- Cargos directivos: gerente, presidente, secretario, tesorero
- Tipo de servicio de transporte (predefinido o personalizado)
- Branding: logo, nombre comercial, color principal
- Vista previa del branding en el sidebar

### Usuarios de Compañía
- Listar usuarios internos
- Invitar usuario por correo electrónico con rol asignado
- Activar / desactivar usuario
- Cambiar rol de usuario
- Gestión de invitaciones pendientes

### Super Admin — Compañías
- Listar todas las compañías
- Ver detalle de compañía (datos, plan, estado, uso)
- Crear compañía desde super admin
- Editar información
- Activar / suspender / inactivar compañía
- Asignar plan
- Ver límites del plan (socios, unidades)
- Ver uso actual vs. límites

### Super Admin — Planes
- Listar planes (básico, profesional, empresarial)
- Crear plan con límites y precio
- Editar plan
- Activar / desactivar plan
- Configurar funciones disponibles por plan

### Super Admin — Suscripciones
- Ver suscripciones activas
- Gestionar facturación SaaS

### Super Admin — Alertas Globales
- Ver alertas del sistema para todas las compañías

### Super Admin — Configuración Global
- Configuración global del SaaS (parámetros generales)

### Super Admin — Auditoría
- Ver logs de auditoría por compañía, usuario, acción y fecha
- Filtrar y buscar registros

---

## Módulos Placeholder (No disponibles actualmente)

| Módulo | Ruta | Estado |
|--------|------|--------|
| Auditoría de compañía | `/auditoria` | Placeholder — muestra mensaje "En desarrollo (Fase 3)" |
| Métricas (SA) | `/super-admin/metrics` | Placeholder |
| Seguridad (SA) | `/super-admin/security` | Placeholder |

> Estos módulos NO deben documentarse como disponibles en el manual. Se mencionan únicamente en este inventario.

---

## Rutas de Redirección

| Ruta | Destino |
|------|---------|
| `/` | `/dashboard` |
| `/convocatorias` | `/reuniones` |
| `/asistencia` | `/reuniones` |
| `/*` (cualquier ruta no existente) | `/dashboard` |
