---
name: professional-ui-ux-saas
description: Define reglas de diseño UI/UX para que el sistema SaaS tenga apariencia profesional, moderna y no genérica.
---

# UI/UX Profesional para SaaS — Lineamientos de Diseño MotoGremio

> [!IMPORTANT]
> **Obligación para Agentes:** Todo agente de desarrollo frontend debe leer y aplicar estrictamente esta skill antes de modificar o crear pantallas, componentes o flujos de usuario en MotoGremio.

---

## 1. Principios de Diseño Visual SaaS

El sistema debe verse como una herramienta de trabajo profesional, sobria y de alto valor corporativo. 

* **Esquema de Color:** Consistencia con la paleta de color aprobada (Azul Profundo `#1E3A5F` para elementos primarios/marca; colores neutros slate/gray para bordes y fondos; y uso estratégico de alertas con rojo/verde/amarillo).
* **Tipografía y Jerarquía:** Uso de fuentes legibles (como Inter o similares del sistema) con pesos seminegritas (`font-semibold`) para títulos y etiquetas.
* **Espaciado uniforme:** Márgenes consistentes (`p-4`, `p-6` en paneles; `space-y-4` o `space-y-6` en formularios). Evitar apiñamientos de texto.

---

## 2. Componentes y Controles Estructurales

* **Sidebar Consistente:** Menú lateral fijo de navegación que diferencie claramente las opciones operativas de la compañía frente a las opciones de administración global (visibles sólo para `super_admin`).
* **Tarjetas (Cards) de Jerarquía Clara:** Las tarjetas de métricas en los dashboards deben mostrar títulos en texto pequeño y neutro, con el valor en tamaño destacado (`text-2xl` o `text-3xl`) y un badge que indique su estado de cambio o tendencia.
* **Etiquetas de Estado (Badges):** Uso de badges de color consistentes para estados de registros:
  * Verde (`bg-success-50 text-success-700`): *activo, pagada, vigente, asistió*.
  * Amarillo/Naranja (`bg-warning-50 text-warning-700`): *pendiente, parcial, por vencer, tarde, apelación*.
  * Rojo (`bg-danger-50 text-danger-700`): *vencido, ausente, inactivo, suspendido*.
  * Gris (`bg-gray-50 text-gray-700`): *anulada, justificado, retirado*.
* **Tablas de Datos (DataTables):** Deben poseer siempre:
  * Buscador interactivo y filtros del lado del cliente o del servidor según el volumen de datos.
  * Acciones de fila compactas e identificables (ver detalle, editar, eliminar).
* **Modales y Formularios:**
  * Uso de modales centrados (`max-w-md` o `max-w-lg`) para la creación y edición rápida.
  * Los formularios deben implementar validación del lado del cliente (con Zod y React Hook Form) mostrando mensajes de error inmediatos debajo de cada campo antes de invocar cualquier RPC a Supabase.
* **Estados de la Interfaz:**
  * **Loading States:** Skeletons o spinners al cargar datos en listas y formularios para evitar parpadeos bruscos.
  * **Empty States:** Mensajes e ilustraciones amigables cuando no hay registros, acompañados de un botón para crear el primer registro (ej. "Aún no hay unidades registradas. ¡Registra la primera unidad!").
  * **Error States:** Carteles de error con explicaciones comprensibles y un botón de reintento.

---

## 3. Patrones de Diseño Concretos de MotoGremio

* **Confirmaciones Explicitas para Acciones Peligrosas:** Cualquier acción destructiva (ej. anular un pago, cancelar una invitación, o dar de baja una unidad) requiere un modal de confirmación en el que el usuario deba presionar un botón de confirmación explícito, evitando activaciones accidentales por click simple.
* **Downgrades y Forzado de Planes:** En la pantalla de cambio de planes de Super Admin, si el nuevo plan tiene límites inferiores a la cantidad actual de socios/unidades de la compañía, la interfaz debe bloquear el cambio, mostrando un aviso amigable y requiriendo un checkbox explícito para activar el parámetro de **Forzado (`p_force`)** antes de habilitar el botón de envío.
* **Visor de Payloads JSON Grandes:** En la auditoría de Super Admin o estados detallados, los datos históricos (`old_data`, `new_data`) deben renderizarse mediante el componente `JsonViewer.tsx`, que cuenta con scroll lateral/vertical, colores para claves/valores y un contenedor con altura máxima delimitada para no estirar la página de forma desproporcionada.
* **Auditorías de Solo Lectura:** El visor de bitácora y los historiales de cambios de auditoría deben ser estrictamente de solo lectura. No deben existir botones de edición ni inputs modificables en estas vistas.
* **Responsividad Completa:** Todos los formularios y tablas deben ser usables en dispositivos móviles, colapsando las columnas de las tablas menos prioritarias o presentándolas como tarjetas apiladas en pantallas pequeñas.
