# Plan de Implementación General — MotoGremio

Este documento describe el estado actual de desarrollo de **MotoGremio**, los módulos completados, la hoja de ruta para futuras fases de mantenimiento/producción, y los riesgos técnicos críticos a evitar.

---

## 1. Estado Actual (Fases Completadas)

MotoGremio cuenta con una arquitectura multi-inquilino robusta basada en esquemas relacionales consolidados (22 tablas maestras), seguridad a nivel de filas (RLS) y consumo exclusivo mediante funciones seguras del lado del servidor (RPC).

Las siguientes etapas han sido culminadas e integradas de forma segura a `main`:

* **Fase 1 — Planificación y Diseño:** Modelo de datos consolidado, matriz de trazabilidad y definición de roles.
* **Fase 2 — Base Técnica y RLS:** Configuración de React, Vite, TS, Tailwind, Supabase RLS y políticas multi-inquilino automáticas.
* **Fase 3 — Núcleo Administrativo:** Módulos de Socios, Unidades (Disco único), Documentos, Pagos parciales/completos e Historial de cuenta.
* **Fase 4 — Gestión Avanzada:** Módulos de Sanciones, Convocatorias a asambleas, Control de asistencias (asistió, tarde, ausente, justificado).
* **Fase 4.1 — Panel Super Admin SaaS:** Panel e infraestructura para administración de compañías (inquilinos) y asignación de planes.
* **Fase 4.2 — Onboarding SaaS y Gestión de Usuarios:** Invitación segura por correo y flujo de registro atado a tokens, previniendo inyección de privilegios desde el frontend.
* **Fase 4.3 — Límites por Plan y Control de Suscripción:** Reglas de base de datos y validaciones de interfaz que impiden exceder el número máximo de socios y unidades por plan.
* **Fase 4.4 — Gestión de Planes desde Super Admin:** CRUD de planes, previsualización de impacto al degradar planes y mecanismo de forzado.
* **Fase 4.5 — Auditoría Administrativa y Bitácora Super Admin:** Paginación de registros de auditoría (`audit_logs`) y visor JSON.

---

## 2. Próximas Fases Propuestas

Para continuar evolucionando la plataforma antes de la comercialización real, se sugieren las siguientes fases:

### Fase 4.6 — Configuración SaaS Avanzada / Branding por Compañía
* **Objetivo:** Permitir a cada administrador de compañía subir su propio logo corporativo, cambiar la paleta de colores de la interfaz (según plan Estándar/Premium) y configurar textos personalizados para cabeceras y pies de página de los comprobantes de pago generados.

### Fase 4.7 — Mejoras de Perfiles y Permisos por Rol
* **Objetivo:** Refinar las pantallas para que los roles secundarios (como `tesorero`, `secretaria` o `presidente`) tengan menús y botones adaptados a su matriz de permisos frontend, impidiendo ver u oprimir acciones no autorizadas.

### Fase 4.8 — Preparación para Producción y Hardening
* **Objetivo:** Asegurar el entorno de producción (`motogremio-ec-prod`), configurar CDN, HTTPS, copias de seguridad automáticas de PostgreSQL, y revisar límites de API Rate Limiting y políticas de contraseñas seguras.

### Fase 5.0 — Landing Comercial / Sitio Público del SaaS
* **Objetivo:** Construir la landing page pública comercial de MotoGremio donde se expliquen las ventajas, planes, testimonios de cooperativas (demo) y formulario de contacto o registro para demostraciones.

### Fase 5.1 — Facturación SaaS / Pagos
* **Objetivo:** Integrar pasarela de pago real (ej. Stripe u otra local de Ecuador) para la automatización de la suscripción de las compañías al SaaS, sólo si se decide avanzar a monetización automatizada.

---

## 3. Riesgos Técnicos a Evitar

> [!WARNING]
> Para mantener la estabilidad y seguridad del sistema, todo agente de desarrollo debe evitar:
>
> 1. **Fugas de RLS (Bypass en Frontend):** Nunca consultar las tablas `audit_logs`, `plans`, `companies` o `pending_invitations` directamente desde el frontend. Usar siempre funciones RPC.
> 2. **Consultar Datos de Identity directos:** No utilizar `auth.users` ni `profiles.email` en joins directos del frontend. Los correos y autenticaciones deben procesarse únicamente del lado del servidor para proteger la privacidad.
> 3. **Modificar Historial de Migraciones:** No editar ni eliminar archivos de migración SQL ya aplicados. Cualquier cambio correctivo debe aplicarse mediante una nueva migración con un timestamp superior.
> 4. **Tipados Evasivos (`as any`):** Evitar tipar con `as any`. Si se requiere compatibilidad compleja con esquemas Supabase, castear a través de `unknown` validando la estructura del objeto primero.
