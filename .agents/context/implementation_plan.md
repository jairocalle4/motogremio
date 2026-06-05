# Fase 2: Trazabilidad Final y Arquitectura Extendida

De acuerdo a tus indicaciones, se eliminaron los atajos y se diseñaron tablas estructurales dedicadas para cumplir estrictamente con los requerimientos funcionales del proyecto, resultando en un modelo de **22 tablas maestras**, sin imponer topes artificiales.

## 1. Lista Final Justificada de Tablas (22)

**Configuración Global y Tenant:**
1. `plans`: Planes SaaS.
2. `companies`: Compañías (Tenants).
3. `subscriptions`: Historial de pagos al SaaS.
4. `company_settings`: Configuración particular (días alerta, recibos).

**Usuarios, Personal y Permisos:**
5. `profiles`: Usuarios del sistema y roles (SuperAdmin, Admin, etc).
6. `members`: Socios.
7. `drivers`: Choferes.
8. `licenses` *(NUEVA)*: Gestión completa de licencias (Tipo, Fechas, Estado, Adjuntos) relacionada al socio o chofer.

**Operaciones y Documentos:**
9. `vehicles`: Unidades con número de disco único.
10. `document_types` *(NUEVA)*: Catálogo dinámico por compañía para no limitar los tipos PostgreSQL.
11. `documents`: Archivos subidos y vencimientos enlazados dinámicamente al tipo.

**Finanzas:**
12. `charge_types`: Catálogo de tipos de cobro.
13. `charges`: Obligaciones generadas por socio/vehículo.
14. `payments`: Ingresos reales a caja.
15. `payment_allocations`: Distribución del pago hacia las deudas.

**Sanciones:**
16. `sanction_types`: Catálogo de tipos de sanción y multas por defecto.
17. `sanctions`: Aplicación de una sanción, vinculada al cargo financiero.

**Asambleas y Comunicaciones:**
18. `meetings`: Convocatorias y actas MVP (`acta_url`).
19. `meeting_invites` *(NUEVA)*: Historial individual inmutable de a quién se invitó, con rastreo de despachos a WhatsApp y Correo.
20. `meeting_attendances`: Resultado puramente presencial el día del evento.

**Auditoría y Alertas:**
21. `notifications`: Alertas internas.
22. `audit_logs`: Trazabilidad inmutable de base de datos.

## 2. Matriz de Trazabilidad Corregida

| Requisito Funcional | Implementación SQL | Migración | Estado |
|---|---|---|---|
| **Licencia A1 y Alertas** | Tabla `licenses` con campos (tipo, num, emisión, vencimiento, archivo). | `003` | ✅ Cubierto |
| **Disco único por compañía** | `UNIQUE(company_id, disk_number)` en `vehicles`. | `004` | ✅ Cubierto |
| **Cuotas, pagos parciales** | `charge_types`, `charges`, `payments`, `allocations`. | `005` | ✅ Cubierto |
| **Sanción vinculada a multa** | `sanctions.charge_id` + `sanction_types`. | `006` | ✅ Cubierto |
| **Convocatoria / Reuniones** | Tabla `meetings` y campos bases. | `006` | ✅ Cubierto |
| **Invitados (Todos/Selectos)** | Tabla `meeting_invites` con estado `invitation_status`. | `006` | ✅ Cubierto |
| **WhatsApp/Correo por Socio** | Campos `email_status`, `whatsapp_sent_at` en `meeting_invites`. | `006` | ✅ Cubierto |
| **Asistencia (Independiente)** | Tabla `meeting_attendances` (`asistio`, `ausente`, `justificado`). | `006` | ✅ Cubierto |
| **Actas de Reunión (MVP)** | Campo `acta_url` en `meetings` (Almacena el PDF, versión 1). | `006` | ✅ Cubierto |
| **Documentos configurables** | Tabla `document_types` en vez de ENUM fijo. | `004` | ✅ Cubierto |
| **Conteo de sanciones** | Derivable analíticamente vía `COUNT(sanctions)`. | N/A | ✅ Cubierto |
| **Aislamiento Multiempresa** | RLS activo en las 22 tablas basado en `company_id`. | `008` | ✅ Cubierto |
| **Prevención de escalamiento** | Trigger `protect_profile_escalation` en `profiles`. | `009` | ✅ Cubierto |

## 3. Modificaciones Locales Aplicadas

1. **`001_create_extensions_and_enums.sql`**: Se removió `document_type` (ahora es tabla), se agregó `communication_status` para los envíos, y se depuró `attendance_status`.
2. **`003_create_users_and_members_tables.sql`**: Se quitó la licencia rudimentaria de `drivers` y se creó la tabla robusta `licenses`.
3. **`004_create_vehicles_and_documents_tables.sql`**: Se agregó la tabla `document_types` y se relacionó con `documents`.
4. **`006_create_sanctions_and_meetings_tables.sql`**: Se independizaron categóricamente `meeting_invites` (envíos de comunicación) de `meeting_attendances` (presencialidad).
5. **`008_enable_rls_and_policies.sql`**: Se añadieron las 3 nuevas tablas (`licenses`, `document_types`, `meeting_invites`) al macro automático de creación de políticas RLS tenant.

## 4. Plan de Pruebas Post-Implementación (Seguridad y RLS)

Una vez aplicadas estas migraciones remotamente, se probará el login real y el RLS usando 2 ventanas de incógnito:
1. **Población Segura:** Se crearán dos compañías (`Compañía Alfa` y `Compañía Beta`) desde el Seed/Backend.
2. **Autenticación Real:** Crearemos el "Socio Alfa 1" y "Socio Beta 1" mediante la UI usando Supabase Auth.
3. **Prueba de Fuego RLS:** Usando el token de "Alfa", solicitaremos el endpoint `/rest/v1/vehicles`. El RLS deberá interceptar a nivel de kernel de Postgres, invocando `get_my_company_id()`, y entregando única y exclusivamente los vehículos de Alfa. Un intento deliberado de inyectar `?company_id=eq.[ID_BETA]` retornará un arreglo vacío `[]`.

> [!NOTE]
> **Estándar UUID:** El sistema MotoGremio utiliza la función nativa `gen_random_uuid()` como estándar en todas las migraciones. La extensión `uuid-ossp` presente nativamente en los proyectos de Supabase no requiere ser eliminada, ya que su coexistencia no afecta el rendimiento ni el funcionamiento del sistema.

## 5. Fase 2.2: Plan Controlado de Semilla para RLS y Auth (Pendiente)

Para probar efectivamente el RLS sin comprometer la limpieza del entorno, se propone el siguiente flujo estructurado y aislado:

### Paso 1: Cuenta Propietaria (Global)
1. El usuario creará manualmente su identidad en Supabase Auth (`jairo@...`).
2. Se inyectará su perfil como `super_admin` con `company_id = NULL` (usando un `DELETE` previo para eludir el trigger de seguridad `BEFORE UPDATE` que impide escalar roles a usuarios normales, ya que el trigger `handle_new_user` crea a todos como `socio` inicialmente).
3. **Restricción de Pruebas:** Esta cuenta `super_admin` **no** se utilizará para comprobar el aislamiento RLS, dado que tiene acceso global por diseño.

### Paso 2: Cuentas de Inquilinos (Tenant) para Prueba RLS
1. Registrar **Usuario Admin Alfa**: (Ej. `admin.alfa@motogremio.ec`)
2. Registrar **Usuario Admin Beta**: (Ej. `admin.beta@motogremio.ec`)
   *(Esto creará de forma segura y real las identidades en `auth.users` sin hardcodear contraseñas en repositorios)*.

### Paso 2: Asociación de Perfiles
Mediante un script seguro o directamente en la base de datos tras obtener los UUIDs de Auth:
1. Insertar perfil para Alfa: `role = 'admin', company_id = [ID Compañía Alfa Demo S.A.]`.
2. Insertar perfil para Beta: `role = 'admin', company_id = [ID Compañía Beta Demo S.A.]`.

### Paso 3: Datos de Prueba Aislados
Inyectaremos transacciones operativas mínimas asignando explicitamente los respectivos IDs de las compañías demo:
1. **Socio Alfa:** `document_id = '1111111111'` vinculado a la Compañía Alfa.
2. **Socio Beta:** `document_id = '2222222222'` vinculado a la Compañía Beta.
3. **Unidad Alfa:** `disk_number = '001'` vinculado a Alfa.
4. **Unidad Beta:** `disk_number = '001'` vinculado a Beta *(demostrando que el UNIQUE(company, disk) permite colisión entre tenants distintos)*.

### Paso 4: Comprobación Ciega
Realizaremos una lectura de las unidades simulando la sesión del Admin Alfa. El RLS deberá retornar la unidad `001` de Alfa y ocultar por completo la unidad `001` de Beta, demostrando aislamiento total.

> [!IMPORTANT]
> **Aprobación Definitiva de Arquitectura**
>
> Todas las observaciones han sido corregidas mediante tablas dedicadas. Las migraciones están actualizadas localmente y aplicadas remotamente.

## 6. Actualización de Roles y Permisos (Decisión de Negocio Junio 2026)

Se actualiza el modelo para no obligar a las cooperativas pequeñas a tener múltiples usuarios. Un único usuario con rol `admin` puede realizar toda la operatividad.

### Matriz de Permisos Base del Frontend

| Módulo / Recurso | admin | gerente | presidente | secretaria | tesorero | operador | socio |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Socios** | CRUD | L (Limitado) | L | CUD | L | L | Propios |
| **Unidades** | CRUD | L (Limitado) | L | CUD | L | L | Propios |
| **Documentos** | CRUD | L | L | CRUD | L | L | Propios |
| **Pagos/Finanzas** | CRUD | L | - | - | CRUD | L | Propios |
| **Sanciones** | CRUD | CRUD | L | CRUD | - | L | Propios |
| **Convocatorias** | CRUD | CRUD | L | CRUD | - | L | L |
| **Asistencias** | CRUD | CRUD | L | CRUD | - | L | L |
| **Reportes** | CRUD | L | L | L | Finanzas | L | - |
| **Usuarios/Roles** | CRUD | - | - | - | - | - | - |
| **Config. Coope** | CRUD | - | - | - | - | - | - |

*Leyenda: CRUD = Crear/Leer/Actualizar/Borrar; CUD = Crear/Actualizar/Borrar; L = Solo Leer; - = Sin Acceso.*

