---
name: professional-ui-ux-saas
description: Define reglas de diseño UI/UX para que el sistema SaaS tenga apariencia profesional, moderna y no genérica.
---

# UI/UX Profesional para SaaS

Actúa como diseñador UI/UX senior especializado en dashboards SaaS administrativos.

El sistema debe verse profesional, limpio, moderno y confiable. No debe parecer una interfaz genérica hecha por IA.

## Estilo visual

* Diseño limpio y corporativo.
* Interfaz clara para usuarios administrativos.
* Usar buen espaciado (padding y margin consistentes).
* Evitar colores excesivos — paleta acotada y armoniosa.
* Usar jerarquía visual clara (títulos, subtítulos, etiquetas).
* Usar tarjetas, tablas, filtros y estados visuales profesionales.
* Mantener consistencia en botones, formularios, modales y menús.

## Layout

* Sidebar lateral fijo con navegación por módulos.
* Header superior con nombre de usuario, compañía activa y notificaciones.
* Dashboard principal con tarjetas de resumen (KPIs).
* Tablas con búsqueda, filtros y acciones por fila.
* Formularios ordenados por secciones con labels claros.
* Diseño responsive para laptop, tablet y celular.

## Experiencia de usuario

* Cada pantalla debe tener título claro y breadcrumb cuando corresponda.
* Cada módulo debe tener un botón de acción principal visible (ej: "Nuevo Socio").
* Las tablas deben tener acciones: ver, editar, eliminar, exportar.
* Mostrar estados explícitos: cargando (skeleton/spinner), sin datos, error, éxito.
* Confirmar acciones peligrosas con modal de confirmación.
* Usar mensajes claros y no técnicos en toasts y alertas.
* Priorizar facilidad de uso para personas no técnicas (secretarias, presidentes, tesoreros).

## Módulos visualmente importantes

* Dashboard principal — resumen general con métricas clave
* Socios — listado con búsqueda, estado y acciones
* Unidades / Mototaxis — con número de disco, placa y estado
* Pagos — historial y deudas pendientes
* Documentos vencidos — alertas visuales por vencimiento
* Sanciones — listado con gravedad y estado
* Convocatorias — creación y envío a socios
* Reportes — exportables a PDF y Excel

## Componentes reutilizables obligatorios

* `Button` — variantes: primario, secundario, peligro, outline
* `Card` — para KPIs y contenedores de sección
* `DataTable` — con búsqueda, paginación y acciones
* `Modal` — para formularios y confirmaciones
* `Badge` — para estados: activo, inactivo, pendiente, vencido
* `Input`, `Select`, `Textarea` — con validación visual
* `Alert` / `Toast` — para retroalimentación inmediata
* `EmptyState` — cuando no hay datos que mostrar
* `LoadingSpinner` / `Skeleton` — para estados de carga

## Calidad

* No crear pantallas vacías sin propósito.
* No usar diseños exagerados o con demasiados colores.
* No usar estilos inconsistentes entre módulos.
* No generar componentes gigantes sin separación de responsabilidades.
* Mantener coherencia visual en todo el sistema.
