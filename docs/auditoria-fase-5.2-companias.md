# 🔍 Auditoría Integral de Módulos de Compañía — Fase 5.2
**Fecha:** 23 de junio de 2026  
**Rama auditada:** `feature/fase-5.2-auditoria-companias`  
**Auditor:** Agente 4 — Product QA

---

## 1. Resumen Ejecutivo
La plataforma para usuarios finales (Compañías de Transporte) cuenta con un núcleo sólido en operaciones diarias (vehículos, conductores, pagos, asambleas). Sin embargo, existen vacíos críticos en la autogestión de la compañía, como la incapacidad de invitar a sus propios usuarios internos (Secretaria, Tesorero) y la falta de una experiencia útil para el rol de `socio`.

Para alcanzar el estado de "Listo para el primer cliente", es imperativo implementar la UI de gestión de usuarios internos y refinar la vista del socio.

---

## 2. Estado General de Interfaz de Compañía
- **Módulos Operativos (CRUD):** 🟢 Excelente. Socios, Unidades, Conductores, Sanciones, Reuniones funcionan correctamente con permisos RLS y validaciones.
- **Módulos Financieros:** 🟢 Muy bien. Los roles `tesorero` y `admin` pueden cobrar cuotas. Faltan detalles de exportación avanzada, pero operativamente es funcional.
- **Configuración:** 🟡 Parcial. La compañía puede ver sus límites de plan y modificar su branding, pero **no puede invitar a su equipo**.
- **Roles y Permisos:** 🟡 Parcial. La lógica en `usePermissions.ts` es robusta, pero la UI etiqueta roles distintos ("gerente", "presidente", "tesorero") bajo un mismo alias visual ("Administrador"), causando confusión.

---

## 3. Tabla Completa de Módulos

| Módulo | En Menú | Ruta | Componente | Backend | RPC/Hook | RLS/Seguridad | Admin | Secretaria | Tesorero | Socio | Estado | Qué Falta |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard | ✅ | `/dashboard` | `DashboardPage.tsx` | ✅ | `loadMetrics` | ✅ | Ver todo | Ver stats | Ver stats | Redirige | **PARCIAL** | Vista propia para rol `socio` |
| Socios | ✅ | `/socios` | `MembersListPage.tsx` | ✅ | `useMembers` | ✅ | CRUD | CRUD | Ver | ❌ | **FUNCIONAL** | — |
| Conductores | ✅ | `/conductores` | `DriversListPage.tsx` | ✅ | `useDrivers` | ✅ | CRUD | CRUD | Ver | ❌ | **FUNCIONAL** | — |
| Unidades | ✅ | `/unidades` | `VehiclesListPage.tsx` | ✅ | `useVehicles` | ✅ | CRUD | CRUD | Ver | ❌ | **FUNCIONAL** | — |
| Pagos | ✅ | `/pagos` | `PaymentsPage.tsx` | ✅ | `usePayments` | ✅ | CRUD | Ver | CRUD | ❌ | **FUNCIONAL** | — |
| Sanciones | ✅ | `/sanciones` | `SanctionsPage.tsx` | ✅ | `useSanctions` | ✅ | CRUD | CRUD | Ver | ❌ | **FUNCIONAL** | — |
| Reuniones | ✅ | `/reuniones` | `MeetingsPage.tsx` | ✅ | `useMeetings` | ✅ | CRUD | CRUD | Ver | ❌ | **FUNCIONAL** | — |
| Notificaciones | ✅ | `/notificaciones`| `NotificationsPage.tsx`| ✅ | `useNotifications`| ✅ | Ver | Ver | Ver | ❌ | **PARCIAL** | Envío real de email/WhatsApp |
| Reportes | ✅ | `/reportes` | `ReportsPage.tsx` | ✅ | `useReports` | ✅ | Generar | Generar | Generar | ❌ | **FUNCIONAL** | — |
| Configuración | ✅ | `/configuracion` | `CompanyConfigPage.tsx`| ✅ | `useCompany` | ✅ | Editar | Ver | Ver | ❌ | **PARCIAL** | Opciones para invitar usuarios |
| Branding | ✅ | (en config) | `CompanyBrandingTab.tsx`| ✅ | RPC | ✅ | Editar | Ver | Ver | ❌ | **FUNCIONAL** | — |
| Usuarios/Invit. | ❌ | `/usuarios` | `Placeholder` | ✅ | Tabla+RPC | ✅ | ❌ | ❌ | ❌ | ❌ | **SOLO BACKEND**| UI completa para gestión |
| Documentos | ❌ | `/documentos` | `Placeholder` | ✅ | Tabla+Hooks | ✅ | (en tabs)| (en tabs) | (en tabs)| ❌ | **PARCIAL** | Centralizar vista global |
| Auditoría | ❌ | `/auditoria` | `Placeholder` | ❌ | — | — | ❌ | ❌ | ❌ | ❌ | **NO IMPLEMENTADO**| Crear tabla de auditoría local |
| Plan / Límites | ✅ | (en config) | `PlanUsageCard.tsx` | ✅ | RPC | ✅ | Ver | Ver | Ver | ❌ | **FUNCIONAL** | — |

---

## 4. Tabla de Roles y Permisos

| Rol | CRUD Principal (Socios/Vehículos) | Finanzas | Configuración | Módulos Ocultos | Riesgos y Observaciones |
|---|---|---|---|---|---|
| `admin` | ✅ Crear, Editar, Eliminar | ✅ Gestionar | ✅ Gestionar | Usuarios, Documentos | Funciona como propietario. |
| `secretaria`| ✅ Crear, Editar, Eliminar | 👁️ Solo Ver | 👁️ Solo Ver | Usuarios, Documentos | Ideal para operativa diaria. |
| `tesorero` | 👁️ Solo Ver | ✅ Gestionar | 👁️ Solo Ver | Usuarios, Documentos | Label dice "Administrador", puede confundirse con `admin`. |
| `socio` | ❌ Bloqueado | ❌ Bloqueado | ❌ Bloqueado | Todo el menú lateral | Redirige al dashboard global que no muestra sus datos propios. |
| `operador` | 👁️ Solo Ver | 👁️ Solo Ver | ❌ Bloqueado | Configuración, Usuarios | Label dice "Secretaria / Asistente". |
| `gerente` / `presidente` | 👁️ Solo Ver | 👁️ Solo Ver | ❌ Bloqueado | Configuración, Usuarios | Labels dicen "Administrador". No pueden editar. |

**Riesgo de Alias Visual:**
En `constants.ts`, `gerente`, `presidente` y `tesorero` tienen la etiqueta "Administrador". Sin embargo, en `usePermissions.ts`, un `gerente` no puede crear socios ni editar configuraciones. Esto causará que un usuario vea "Administrador" en su perfil pero no entienda por qué no tiene permisos de escritura.

---

## 5. Estado de Invitaciones Internas

**Qué ya funciona (Backend):**
- La tabla `pending_invitations` existe.
- Las funciones RPC `invite_user` y `get_company_invitations` existen y tienen RLS seguro.
- Hay triggers que validan el token cuando un usuario se registra.

**Qué falta (Frontend):**
- **Cero UI.** El módulo `/usuarios` muestra un `Placeholder`.
- Un administrador de compañía actualmente **no tiene cómo** invitar a su secretaria, tesorero o socios a la plataforma. Depende 100% de que el Super Admin ejecute scripts manuales.
- Falta interfaz para reenviar invitación o revocarla.

---

## 6. Estado de Documentos

- **Tabla y Hooks:** `documents` y `useDocuments` están operativos.
- **Ubicación actual:** Funcionan únicamente como "Tabs" dentro del detalle de un Socio, Vehículo o Conductor específico.
- **Alertas de vencimiento:** El Dashboard global avisa de documentos expirados/próximos a vencer.
- **Módulo Centralizado:** La ruta `/documentos` en el menú principal está asignada a un `Placeholder`. Falta una vista estilo "Matriz de Documentos" para auditar vencimientos globales de forma fácil sin entrar perfil por perfil.

---

## 7. Estado de Vista Socio / Conductor

- **Login:** Puede iniciar sesión.
- **Redirección:** Entra al `/dashboard`.
- **Qué ve:** Ve un Dashboard genérico. Como las consultas RLS bloquean leer datos generales de la compañía, probablemente vea números en cero o errores silenciosos de permisos.
- **Qué falta:** Una pantalla propia que muestre **SOLO:**
  1. Su información de perfil.
  2. Sus vehículos asignados.
  3. Sus cuotas pendientes y pagadas (estado de cuenta).
  4. Sus sanciones pendientes.

---

## 8. Estado de Notificaciones

- **Backend:** Tabla `notifications` captura eventos del sistema (pagos, vencimientos).
- **Frontend:** `/notificaciones` muestra una bandeja de alertas bastante pulida.
- **Envío Real:** El campo `email_status` y `whatsapp_status` se insertan como `'pendiente'`, pero **no hay ningún worker, webhook o integración** que dispare correos reales (Resend, Brevo) o mensajes de WhatsApp.

---

## 9. Estado de Pagos / Tesorería

- **Funcionalidad:** Un tesorero o admin puede registrar cargos, cobros, abonos parciales y emitir recibos en PDF (básico).
- **Riesgos:** La Secretaria solo puede ver, lo cual es correcto.
- **Faltantes para operativa diaria:** Auditoría de "Caja Diaria" (cuánto cobró X usuario hoy) y comprobantes de anulación. El nivel actual es un "MVP fuerte" y es vendible.

---

## 10. Estado de Reportes

- **Existentes:** Filtros exportables a CSV para Socios, Vehículos, Conductores, Finanzas y Sanciones.
- **Qué falta:** Generación de PDFs formales con membrete de la compañía (actualmente solo CSV). No hay bloqueantes críticos, es bastante completo.

---

## 11. Riesgos de Seguridad

Auditoría limpia. No se detectaron vulnerabilidades críticas:
- `service_role` y `auth.users` no se utilizan en el frontend.
- Los bypass manuales de TypeScript (`as any`) encontrados en `useDocuments.ts` y exportación de CSV no representan riesgo de seguridad, solo de tipado estricto.
- RLS asegura que una compañía no vea datos de otra.

---

## 12. Readiness (Semáforo)

### 🟡 Listo para demo comercial de compañía: **Parcial**
La demo de un "administrador de compañía" es visualmente impresionante y operativa. Pero si en la demo el prospecto pregunta *"¿Cómo agrego a mi secretaria?"*, se verá el placeholder de usuarios.

### 🔴 Listo para primer cliente real: **No**
Un cliente real necesita ingresar y armar su equipo (invitar a la tesorera, la operadora). Al no existir la UI de gestión de usuarios, requeriría soporte técnico constante para algo básico.

### 🔴 Listo para producción pública: **No**
Falta cobranza del SaaS, onboarding automático, envío real de emails.

---

## 13. Roadmap Priorizado (Enfocado en Compañías)

### Prioridad 1 — Bloqueante para primer cliente
| Módulo | Qué falta y Por qué importa | Agente | Riesgo | Tiempo |
|---|---|---|---|---|
| Usuarios / Invitaciones | UI para invitar, reenviar token y asignar roles a internos. Sin esto, el cliente no puede autogestionarse. | Frontend | Medio | 1-2 días |
| Roles en UI | Aclarar las etiquetas visuales (no llamar "Administrador" al tesorero). Evita soporte y confusión. | Frontend | Bajo | 1 hora |

### Prioridad 2 — Importante para operación diaria
| Módulo | Qué falta y Por qué importa | Agente | Riesgo | Tiempo |
|---|---|---|---|---|
| Vista Socio | Un panel de estado de cuenta exclusivo para el socio. Actualmente la ruta es engañosa. | Frontend | Bajo | 1 día |
| Matriz de Documentos | Vista global y centralizada de documentos en la ruta `/documentos` (hoy es un Placeholder). | Frontend | Bajo | 1 día |

### Prioridad 3 — Mejora comercial
| Módulo | Qué falta y Por qué importa | Agente | Riesgo | Tiempo |
|---|---|---|---|---|
| Notificaciones | Integrar envíos reales de email. Da mucha percepción de valor. | Backend | Medio | 2 días |
| Reportes | PDF formal con membrete. | Frontend | Bajo | 1-2 días |

### Prioridad 4 — Futuro / premium
| Módulo | Qué falta y Por qué importa | Agente | Riesgo | Tiempo |
|---|---|---|---|---|
| Auditoría Local | Ver el log de cambios de la compañía. | Fullstack | Medio | 2 días |

---

## 14. Recomendación de la próxima fase concreta

**Recomiendo ejecutar inmediatamente la "Fase 5.3 — Autogestión de Equipo (Usuarios e Invitaciones)".**
El objetivo exclusivo de esa fase sería construir el componente de gestión de usuarios, conectarlo al menú en lugar del Placeholder actual, e integrar las RPCs de invitaciones para que la compañía pueda invitar a su Secretaria y Tesorero directamente.

---
*Confirmación de integridad: No se modificó código de la app, no se hicieron migraciones, no se ejecutó seed, no se aplicó db push ni SQL remoto.*
