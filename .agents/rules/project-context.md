# Project Context — SaaS para Compañías de Mototaxis

## 1. Identidad del proyecto

Este proyecto consiste en desarrollar una aplicación web SaaS multiempresa para administrar compañías de mototaxis en Ecuador, inicialmente enfocada en compañías ubicadas en La Troncal, provincia del Cañar.

El sistema busca reemplazar procesos manuales o registros dispersos en Excel por una plataforma profesional, segura, fácil de usar y comercializable mediante planes mensuales.

Nombre comercial del producto:

**MotoGremio**

Slogan: *"Gestión inteligente para compañías de mototaxi"*

El producto será desarrollado inicialmente por un solo propietario/desarrollador y debe estar preparado para venderse a varias compañías independientes.

---

## 2. Objetivo de negocio

Construir un sistema administrativo completo que permita a cada compañía de mototaxis controlar:

* Datos institucionales.
* Directiva.
* Socios.
* Conductores.
* Mototaxis o unidades.
* Número de disco de cada unidad.
* Pagos, cuotas y deudas.
* Documentos y vencimientos.
* Sanciones.
* Convocatorias a reuniones.
* Control de asistencia.
* Reportes administrativos.
* Usuarios y permisos.

El sistema debe ser percibido como un producto profesional para compañías reales, no como una demostración académica ni una interfaz genérica.

---

## 3. Modelo SaaS multiempresa

La aplicación debe desarrollarse como SaaS multiempresa.

Cada compañía registrada en el sistema debe tener sus datos aislados de las demás compañías.

Reglas obligatorias:

* Ningún usuario de una compañía puede visualizar datos de otra compañía.
* Toda tabla operativa que pertenezca a una compañía debe relacionarse mediante `company_id`.
* Debe existir un rol de propietario o superadministrador del SaaS que pueda administrar compañías, planes y suscripciones.
* Cada compañía podrá tener sus propios usuarios administrativos y socios.
* La arquitectura debe permitir ofrecer planes comerciales diferentes sin duplicar código.

---

## 4. Usuarios y roles y Escenarios de Uso

El sistema no debe asumir que todas las compañías de mototaxis tienen varios usuarios usando el sistema. Muchas compañías pequeñas pueden operar con una sola persona encargada de registrar socios, unidades, documentos, pagos y convocatorias.

### Regla principal de administración de compañía

El rol `admin` representa al administrador principal de una compañía y puede gestionar todos los módulos de su propia compañía. Este rol puede ser asignado al gerente, presidente, secretaria o encargado de oficina, según la realidad de cada compañía.

### Roles vigentes del sistema

* **`super_admin`**: propietario global y administrador de MotoGremio (SaaS). **No es un rol interno de compañía**. Puede supervisar o asistir a nivel plataforma, pero no debe considerarse ni tratarse como rol operativo de una compañía.
* **`admin`**: administrador total de una compañía. Acceso total a los documentos y módulos de su propia compañía. No puede crear otro `admin`.
* **`secretaria`**: usuaria operativa. Gestiona documentos operativos (socios, conductores, unidades), pero **no** documentos institucionales críticos (entidad Compañía).
* **`socio`**: usuario de consulta. No tiene acceso a módulos administrativos.

> **Nota:** Ya no se utilizan roles legacy como `gerente`, `presidente`, `tesorero`, u `operador` para nuevas asignaciones.


### Escenarios de uso

* **Compañía pequeña**: Puede tener un solo usuario con el rol `admin`, quien controla todo el sistema.
* **Compañía mediana**: Puede tener un usuario `admin`, una `secretaria` y un `tesorero`.
* **Compañía organizada**: Puede usar todos los roles separados: gerente, presidente, secretaria, tesorero y socios.
* **Socios/conductores**: No es obligatorio que los socios usen el sistema desde la primera versión. El registro de socios y unidades será realizado principalmente por el administrador o personal de oficina.

### Permisos base iniciales

* **`admin`**: Acceso total a los datos de su compañía.
* **`gerente`**: Lectura general y supervisión; edición limitada según módulo.
* **`presidente`**: Lectura directiva, reuniones, sanciones y reportes.
* **`secretaria`**: Alta capacidad operativa en socios, unidades, documentos, convocatorias, asistencias y actas.
* **`tesorero`**: Acceso completo a finanzas; lectura de socios y unidades.
* **`operador`**: Acceso limitado configurable.
* **`socio`**: Solo datos propios (opcional, futuro).

No implementar todavía permisos personalizados por usuario, pero dejar la arquitectura preparada para una futura tabla de permisos avanzados si el producto lo requiere.

---

## 5. Módulos obligatorios del producto

### 5.1 Administración SaaS

Debe permitir:

* Registrar compañías clientes.
* Administrar planes comerciales.
* Registrar suscripciones.
* Activar, suspender o desactivar compañías.
* Consultar fecha de contratación y próxima renovación.
* Consultar cantidad de socios registrados por compañía.
* Consultar estado de cada cliente.
* Administrar límites y funciones disponibles por plan.

### 5.2 Gestión de compañías

Cada compañía debe poder registrar:

* Nombre legal.
* Nombre comercial.
* RUC.
* Logo.
* Dirección.
* Cantón.
* Provincia.
* Teléfono.
* Correo institucional.
* Representante legal.
* Gerente.
* Presidente.
* Secretaria.
* Tesorero.
* Permiso de operación.
* Número máximo o autorizado de unidades.
* Documentos institucionales adjuntos.

### 5.3 Gestión de socios

Cada socio debe poder registrar:

* Cédula.
* Nombres.
* Apellidos.
* Fecha de nacimiento.
* Dirección.
* Teléfono.
* Número de WhatsApp.
* Correo electrónico.
* Fotografía.
* Fecha de ingreso a la compañía.
* Estado: activo, suspendido, retirado o fallecido.
* Observaciones.
* Documentos adjuntos.
* Historial de cambios.

Información de licencia:

* Tipo de licencia.
* Para el contexto inicial del negocio, considerar licencia tipo A1 como dato relevante para socios o conductores de mototaxi.
* Número de licencia.
* Fecha de emisión.
* Fecha de vencimiento.
* Estado de vigencia.
* Archivo adjunto de la licencia.

### 5.4 Gestión de unidades o mototaxis

Cada unidad debe registrar:

* Número de disco.
* Placa.
* Marca.
* Modelo.
* Año.
* Color.
* Número de chasis, cuando aplique.
* Número de motor, cuando aplique.
* Socio propietario.
* Conductor asignado.
* Estado: activa, suspendida, inactiva, en reparación o retirada.
* Fotografías de la unidad.
* Observaciones.

Regla crítica:

El **número de disco** es un distintivo interno importante de cada compañía y debe mostrarse claramente en formularios, tablas, filtros y reportes de unidades.

Restriccción de base de datos: `UNIQUE(company_id, disk_number)` — No pueden existir dos unidades con el mismo número de disco dentro de la misma compañía.

Documentos relacionados con la unidad:

* Matrícula.
* Revisión técnica vehicular.
* Seguro, cuando aplique.
* Permiso o documentos internos.
* Fechas de emisión y vencimiento.
* Archivos adjuntos.

### 5.5 Pagos, cuotas y deudas

Debe permitir:

* Configurar tipos de pago.
* Registrar cuotas mensuales.
* Registrar pagos extraordinarios.
* Registrar multas económicas relacionadas con sanciones.
* Registrar deudas pendientes.
* Registrar descuentos o ajustes autorizados.
* Adjuntar comprobantes.
* Consultar estado de cuenta individual del socio.
* Consultar socios morosos.
* Filtrar pagos por fecha, socio, concepto y estado.
* Exportar reportes a PDF y Excel.

### 5.6 Documentos y vencimientos

Debe permitir registrar y controlar:

* Documentos de la compañía.
* Documentos del socio.
* Licencias.
* Documentos de la unidad.
* Matrículas.
* Revisiones técnicas.
* Permisos.
* Nombramientos.
* Contratos.
* Archivos adicionales.

Debe mostrar:

* Documentos vigentes.
* Documentos próximos a vencer.
* Documentos vencidos.
* Alertas visuales en dashboard.
* Filtros por tipo, socio, unidad y fecha.

### 5.7 Sanciones

Debe permitir:

* Registrar sanciones de un socio.
* Seleccionar tipo de sanción.
* Registrar motivo.
* Registrar fecha.
* Registrar observaciones.
* Adjuntar evidencias.
* Indicar si genera multa económica.
* Indicar monto de multa.
* Registrar estado: pendiente, aplicada, anulada o cumplida.
* Consultar historial de sanciones por socio.

Regla crítica de reportes:

Los reportes de socios deben incluir el **conteo total de sanciones por socio**, y permitir consultar el detalle completo de esas sanciones.

### 5.8 Convocatorias y reuniones

Debe permitir:

* Crear una convocatoria.
* Definir título de la reunión.
* Definir descripción o agenda.
* Seleccionar tipo: ordinaria, extraordinaria o urgente.
* Registrar fecha.
* Registrar hora.
* Registrar lugar.
* Adjuntar documentos.
* Invitar a todos los socios activos.
* Invitar únicamente a socios seleccionados.
* Consultar lista de invitados.
* Registrar estado de convocatoria.

Comunicación:

* Preparar envío de correo electrónico personalizado para cada socio invitado.
* Preparar mensaje de WhatsApp personalizado con fecha, hora, lugar y motivo.
* En primera versión, WhatsApp puede funcionar mediante enlace con mensaje prellenado.
* En versión avanzada o plan premium, se podrá integrar una API oficial para envío automatizado.

### 5.9 Asistencia y actas de reunión

Debe permitir:

* Registrar socios asistentes.
* Registrar ausentes.
* Registrar ausencias justificadas.
* Registrar observaciones.
* Calcular porcentaje de asistencia.
* Adjuntar acta.
* Generar acta o resumen en PDF.
* Consultar historial de reuniones por compañía.
* Consultar historial de asistencia por socio.

### 5.10 Reportes

Debe contemplar reportes de:

* Socios activos.
* Socios suspendidos.
* Socios retirados.
* Socios con licencia próxima a vencer.
* Socios con licencia vencida.
* Conteo de sanciones por socio.
* Detalle de sanciones por socio.
* Unidades activas.
* Unidades suspendidas.
* Unidades por número de disco.
* Documentos próximos a vencer.
* Documentos vencidos.
* Pagos recibidos.
* Deudas pendientes.
* Socios morosos.
* Convocatorias realizadas.
* Asistencia a reuniones.
* Resumen mensual para directiva.

Los reportes deben permitir filtros y exportación a PDF y Excel.

### 5.11 Auditoría

El sistema debe registrar acciones importantes, por ejemplo:

* Creación o edición de socios.
* Creación o edición de unidades.
* Registro, edición o eliminación lógica de pagos.
* Registro de sanciones.
* Creación de convocatorias.
* Modificación de documentos.
* Cambios de usuarios y roles.

Cada registro de auditoría debe incluir:

* Usuario responsable.
* Compañía.
* Acción realizada.
* Entidad afectada.
* Fecha y hora.
* Información relevante del cambio.

---

## 6. Planes comerciales previstos

La aplicación debe estar preparada para manejar funciones según plan contratado.

### Plan Básico

Incluye:

* Registro de socios.
* Registro de unidades.
* Número de disco.
* Pagos básicos.
* Documentos.
* Reportes simples.

### Plan Estándar

Incluye todo el Plan Básico más:

* Convocatorias.
* Preparación de mensajes de correo.
* Preparación de mensajes de WhatsApp.
* Control de asistencia.
* Alertas de vencimiento.
* Reportes PDF y Excel.
* Sanciones y conteo por socio.

### Plan Premium

Incluye todo el Plan Estándar más:

* Integración avanzada de WhatsApp mediante servicio oficial, cuando sea viable.
* Panel individual para socios.
* Actas digitales avanzadas.
* Personalización visual por compañía.
* Soporte prioritario.
* Carga inicial desde Excel.
* Automatizaciones y notificaciones avanzadas.

La arquitectura debe permitir activar o bloquear funcionalidades según el plan contratado.

---

## 7. Stack técnico decidido

La solución debe desarrollarse inicialmente como aplicación web responsive.

Tecnologías base:

* React.
* Vite.
* TypeScript.
* Tailwind CSS.
* Supabase.
* PostgreSQL.
* Supabase Auth.
* Supabase Storage.
* Row Level Security.

La aplicación debe ser usable desde:

* Computadora de oficina.
* Laptop.
* Tablet.
* Teléfono celular.

## 7.1 Configuración de entornos Supabase

### Ambiente de desarrollo

* Proyecto: `motogremio-ec-dev`
* URL: `https://phervmsyjkgjkvlfisns.supabase.co`
* Publishable Key: `sb_publishable_iCmauCSVGwicfdRn_iG-gg_5JtaxQYq`
* URL local de desarrollo: `http://localhost:5173`

### Ambiente de producción (futuro)

* Proyecto: `motogremio-ec-prod` (se creará cuando el producto esté listo para clientes reales)
* Dominio definitivo: pendiente de definir

**Regla:** Nunca mezclar credenciales de dev y prod. Usar variables de entorno (`.env.local`) para las credenciales. El archivo `.env.local` no debe incluirse en el repositorio.

---

## 8. Principios obligatorios de arquitectura

* Arquitectura multiempresa desde el inicio.
* Separación estricta por `company_id`.
* Row Level Security en Supabase.
* TypeScript en todo el frontend.
* Componentes reutilizables.
* Formularios validados.
* Estados de carga, error y vacío.
* No duplicar lógica innecesariamente.
* No crear pantallas desconectadas de los datos reales cuando ya exista Supabase configurado.
* Registrar auditoría en operaciones importantes.
* Utilizar eliminación lógica cuando exista información histórica sensible, como pagos o sanciones.
* Mantener estructura limpia de carpetas y nombres consistentes.

---

## 9. Principios obligatorios de interfaz

El producto debe verse como un SaaS profesional para organizaciones reales.

La interfaz debe ser:

* Limpia.
* Sobria.
* Moderna.
* Administrativa.
* Clara para usuarios no técnicos.
* Responsive.
* Consistente en todos los módulos.

Debe evitar:

* Colores excesivos.
* Dashboards decorativos sin utilidad.
* Íconos innecesarios.
* Tarjetas genéricas sin información relevante.
* Formularios desordenados.
* Tablas difíciles de leer.
* Pantallas con apariencia de prototipo o proyecto académico.

Pantallas principales esperadas:

* Login.
* Dashboard.
* Compañías.
* Socios.
* Perfil de socio.
* Unidades.
* Perfil de unidad.
* Pagos.
* Estado de cuenta.
* Documentos.
* Sanciones.
* Convocatorias.
* Detalle de reunión y asistencia.
* Reportes.
* Usuarios y roles.
* Suscripciones y planes para superadministrador.

---

## 10. Orden inicial de construcción

La aplicación debe construirse por fases, evitando generar todo de una vez sin validación.

### Fase 1 — Planificación

* Analizar requisitos.
* Proponer arquitectura.
* Diseñar modelo de datos.
* Diseñar roles y permisos.
* Definir navegación y estructura visual.
* Presentar plan antes de escribir código funcional.

### Fase 2 — Base técnica

* Crear proyecto.
* Configurar React, Vite, TypeScript y Tailwind.
* Configurar Supabase.
* Configurar autenticación.
* Crear layout general.
* Crear sistema inicial de roles.

### Fase 3 — Núcleo administrativo

* Compañías.
* Socios.
* Unidades.
* Número de disco.
* Documentos.
* Pagos.

### Fase 4 — Gestión avanzada

* Sanciones.
* Conteo de sanciones por socio.
* Convocatorias.
* Asistencia.
* Alertas.

### Fase 5 — Comercialización SaaS

* Planes.
* Suscripciones.
* Restricción de funcionalidades.
* Panel de superadministrador.

### Fase 6 — Reportes y calidad

* Reportes PDF.
* Reportes Excel.
* Auditoría.
* Pruebas.
* Optimización responsive.
* Preparación para demostración comercial.

---

## 11. Restricciones de trabajo para el agente

Antes de implementar funcionalidades importantes, el agente debe:

1. Revisar este contexto.
2. Crear o actualizar un plan.
3. Proponer decisiones importantes antes de implementarlas.
4. Mantener la arquitectura multiempresa.
5. No eliminar requisitos funcionales sin autorización.
6. No cambiar el stack técnico sin autorización.
7. No construir funcionalidades de forma improvisada.
8. No generar datos falsos permanentes como si fueran definitivos.
9. Mantener documentación actualizada cuando se tomen nuevas decisiones.
10. Priorizar un producto vendible, mantenible y profesional.
11. El rol socio solo puede consultar información propia. A nivel RLS, no debe poder leer documentos institucionales de compañía ni documentos de otros socios/unidades. La UI nunca debe ser la única barrera de seguridad.

---

## 12. Restricciones No Negociables del Modelo de Datos

* **No eliminar requisitos funcionales:** No se pueden omitir funcionalidades ya definidas (como control de actas, tipos de sanciones, invitaciones a reuniones, etc.) bajo ninguna excusa para reducir tablas.
* **No fusionar entidades indebidamente:** No se pueden fusionar entidades si con ello se pierde historial, trazabilidad o capacidad de reporte (ej. mezclar sanciones y multas perdiendo el tipo de sanción).
* **Matriz de trazabilidad obligatoria:** Antes de aprobar cualquier fase de base de datos, el agente debe entregar siempre una matriz de trazabilidad que cruce [Requisitos ↔ Tablas ↔ Migraciones].

---

## 13. Estado actual del proyecto

Actualmente:

* El sistema cuenta con los módulos núcleo implementados (Socios, Unidades, Conductores, Documentos, Pagos, Sanciones, Reuniones y Asistencias).
* Se completaron y validaron las siguientes fases de comercialización SaaS y seguridad:
  * **Fase 4.1 — Panel Super Admin SaaS**: Pantallas e infraestructura para administrar compañías y asignar planes.
  * **Fase 4.2 — Onboarding SaaS y Gestión de Usuarios**: Registro restringido a través de invitaciones y triggers seguros de asignación de empresa/roles en base de datos.
  * **Fase 4.3 — Límites por Plan y Control de Suscripción**: Triggers y restricciones en base de datos e interfaz para controlar el número máximo de socios y unidades según el plan contratado.
  * **Fase 4.4 — Gestión de Planes desde Super Admin**: Funciones e interfaz para crear y editar planes, así como forzar el cambio de planes recalculando límites.
  * **Fase 4.5 — Auditoría Administrativa y Bitácora Super Admin**: Registros inmutables en base de datos y visor seguro con paginación y visor JSON.
* **Último merge conocido:** `d1c3bcc Merge branch 'feature/fase-4.5-auditoria-super-admin' into main`.
* **Regla de asignación de Skills:**
  * Para tareas frontend/UI, aplicar siempre la skill [professional-ui-ux-saas](file:///.agents/skills/professional-ui-ux-saas/SKILL.md).
  * Para tareas Supabase/backend, aplicar siempre la skill [saas-architecture-supabase](file:///.agents/skills/saas-architecture-supabase/SKILL.md).
  * Para decisiones de negocio, aplicar siempre [product-owner-mototaxis](file:///.agents/skills/product-owner-mototaxis/SKILL.md).
