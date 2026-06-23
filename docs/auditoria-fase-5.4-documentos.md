# Auditoría Técnica y Funcional: Módulo de Documentos y Vencimientos (Fase 5.4A)

## 1. Estado actual del módulo documentos
Actualmente, el sistema posee una infraestructura base de datos que vincula documentos a tres entidades principales (socios, unidades, conductores). Sin embargo, carece de una interfaz global unificada, y se apoya en componentes incrustados (`DocumentsList`) dentro de las vistas de detalle de cada entidad. Las alertas están implementadas en el Dashboard, pero no de manera centralizada en un módulo especializado.

## 2. Tablas existentes
- `documents`: Tabla central de registros de documentos.
- `document_types`: Diccionario de tipos de documentos permitidos por compañía.
- `licenses`: Tabla separada y específica para licencias de conducir (vinculada a miembros o conductores).
- `document_status`: Enum (`vigente`, `por_vencer`, `vencido`).

## 3. Campos disponibles
En la tabla `documents`:
- Claves primarias/foráneas: `id`, `company_id`, `member_id`, `vehicle_id`, `driver_id`, `document_type_id`.
- Datos: `document_number`, `issue_date`, `expiry_date` (nullable), `file_url`, `status`, `notes`.

## 4. RLS/RPCs existentes
- RLS habilitado para `documents`, `document_types` y `licenses` restringiendo la visibilidad al `company_id` del usuario autenticado.
- No se detectaron RPCs especializadas para cálculo masivo de vencimientos (se hace de lado del cliente o en `DashboardPage.tsx` / `useReports.ts`).

## 5. Hooks existentes
- `useDocuments.ts`: Provee funciones CRUD estándar (`fetchDocuments`, `createDocument`, `updateDocument`, `deleteDocument`, etc.).
- `useLicenses.ts`: CRUD para licencias separadas.
- Cálculo de estados manejado por la utilidad en `src/utils/statusCalculator.ts`.

## 6. Pantallas existentes
- Componente `DocumentsList.tsx` insertado en:
  - `MemberDetailPage.tsx`
  - `DriverDetailPage.tsx`
  - `VehicleDetailPage.tsx`
- No existe una página general `/documentos`.
- Existe configuración de tipos en `CompanyConfigPage.tsx` (`CompanyConfigPage` pestaña "Tipos de Documentos").

## 7. Qué falta
- No se pueden subir documentos institucionales ("de Compañía"). El constraint actual `CHECK` en la tabla `documents` exige que exactamente uno de los IDs de entidad (member, vehicle, driver) no sea nulo, imposibilitando subir un documento a nivel corporativo (donde todos serían NULL).
- No hay tracking de auditoría (`created_by`, `updated_by`).
- Falta la pantalla unificada `/documentos` sugerida en el sidebar.
- Falta la infraestructura real de Supabase Storage (no hay migración de buckets).

## 8. Riesgos
- **Separación de licencias**: Existe una tabla `licenses` por separado. Integrar "licencia" dentro de `documents` vs. mantener la tabla dedicada podría generar duplicidad o confusión en el UX.
- **Rendimiento Frontend**: El cálculo de estados "por_vencer" y "vencido" se efectúa en tiempo de ejecución (`calculateDocumentStatus`). Con volumen alto, esto podría relantizar el Dashboard. Sería ideal delegarlo a vistas de BD o funciones.

## 9. Propuesta funcional
Unificar la visibilidad de vencimientos:
- Visualización de documentos cruzada por entidad (Socio, Conductor, Unidad, Compañía).
- Filtros por estado: Vigentes, Por vencer (ej. < 30 días), Vencidos, Faltantes.
- Soporte para subir archivos reales.

## 10. Propuesta UX
**Ruta:** `/documentos`
**Secciones / Tabs:**
1. **Resumen General (Dashboard Documental):** KPIs de vigentes, por vencer, vencidos y faltantes.
2. **Alertas Inmediatas:** Lista de lo que requiere atención urgente.
3. **Explorador:** Tabla unificada con filtros de Entidad (Socios/Unidades/Conductores/Compañía) y Tipo de Documento.

## 11. Propuesta de permisos
- `super_admin`: Acceso global de sólo lectura / supervisión.
- `admin`: Acceso total (CRUD) a documentos operativos y de compañía.
- `secretaria`: Acceso (CRUD) solo a documentos operativos. (No editar documentos constitutivos de compañía, de implementarse tipos de confidencialidad).
- `socio`: Acceso de sólo consulta a sus propios documentos y los de su unidad/conductor asignado.

## 12. Si hace falta nueva migración en 5.4B
**SÍ.** Se requiere una migración para:
1. Modificar el constraint `check_document_target` en la tabla `documents` para permitir que `member_id`, `vehicle_id` y `driver_id` sean todos `NULL` (para documentos de la empresa).
2. (Opcional pero sugerido) Agregar campos de tracking de usuario: `created_by_id`, `updated_by_id`.

## 13. Si hace falta storage/bucket
**SÍ.** Se necesita una migración de Storage para crear el bucket privado `company-documents` y aplicarle políticas de RLS (basadas en RLS de base de datos o en Storage Policies).

## 14. Si hace falta RPC nueva
Posiblemente se necesite una RPC `get_company_documents_summary` para calcular estadísticas de estado sin traer miles de registros al frontend, lo que optimizará el nuevo Dashboard Documental.

## 15. Recomendación final para Fase 5.4B
Para la Fase 5.4B, se recomienda enfocar el esfuerzo en:
1. **Infraestructura Backend**: Ejecutar la migración que ajusta el constraint `check_document_target` y crea el bucket de Storage con sus políticas.
2. **Desarrollo Frontend**: Construir la página `/documentos` integrando un Dashboard de Alertas locales. No se deben conectar alertas externas (correo/WhatsApp) todavía, hasta asegurar la solidez del reporte y subida de archivos en la UI.
3. **Manejo de Licencias**: Tomar la decisión de negocio de mantener la tabla `licenses` para alertas rápidas o migrarla a `documents`. Se sugiere mantenerla si la licencia tiene propiedades muy particulares (ej. puntos, tipo específico "A1/B", etc.), pero enlazando el recordatorio visual en la misma vista de Alertas.
