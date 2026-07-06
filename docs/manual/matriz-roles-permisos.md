# Matriz de Roles y Permisos — MotoGremio EC

> Verificada contra `src/hooks/usePermissions.ts` y `src/router/index.tsx`.  
> Versión: julio 2026

---

## Roles Disponibles en el Sistema

| Código interno | Nombre visible en la interfaz | Descripción |
|---------------|-------------------------------|-------------|
| `super_admin` | Super Admin | Administrador de la plataforma SaaS. Gestiona compañías, planes y configuración global. No pertenece a ninguna compañía. |
| `admin` | Administrador | Administrador de la compañía. Acceso completo a todos los módulos de la organización. |
| `secretaria` | Secretario/a | Gestión operativa: socios, unidades, conductores, documentos, sanciones y reuniones. No ve pagos. |
| `tesorero` | Tesorero *(heredado)* | Acceso al módulo de pagos y cuotas, reportes y visualización de socios y unidades. |
| `gerente` | Gerente *(heredado)* | Acceso de lectura amplio. Puede gestionar sanciones y reuniones. |
| `presidente` | Presidente *(heredado)* | Lectura general. No puede gestionar operativamente. |
| `operador` | Operador *(heredado)* | Lectura general de todos los módulos. No puede crear ni editar. |
| `socio` | Socio / Consulta | Solo ve su portal personal con su información y notificaciones. |

> Los roles marcados como **heredado** corresponden a roles creados en versiones anteriores del sistema que siguen operando pero cuya creación ya no está disponible en la interfaz actual. Los nuevos usuarios se crean únicamente como `admin` o `secretaria`.

---

## Permisos por Módulo y Acción

### Autenticación y Acceso General

| Acción | Super Admin | Admin | Secretaria | Tesorero | Gerente | Presidente | Operador | Socio |
|--------|:-----------:|:-----:|:----------:|:--------:|:-------:|:----------:|:--------:|:-----:|
| Iniciar sesión | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver Dashboard de compañía | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Portal) |
| Cambiar contraseña | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cerrar sesión | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Acceder al Panel Super Admin | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Socios y Conductores

| Acción | Super Admin | Admin | Secretaria | Tesorero | Gerente | Presidente | Operador | Socio |
|--------|:-----------:|:-----:|:----------:|:--------:|:-------:|:----------:|:--------:|:-----:|
| Ver listado de socios | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Crear / editar socio | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Activar / desactivar socio | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver listado de conductores | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Crear / editar conductor | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Unidades / Vehículos

| Acción | Super Admin | Admin | Secretaria | Tesorero | Gerente | Presidente | Operador | Socio |
|--------|:-----------:|:-----:|:----------:|:--------:|:-------:|:----------:|:--------:|:-----:|
| Ver listado de unidades | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Crear / editar unidad | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cambiar estado de unidad | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Asignar / desasignar conductor | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Documentos y Licencias

| Acción | Super Admin | Admin | Secretaria | Tesorero | Gerente | Presidente | Operador | Socio |
|--------|:-----------:|:-----:|:----------:|:--------:|:-------:|:----------:|:--------:|:-----:|
| Ver documentos | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Subir / editar documentos | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Pagos y Cuotas

| Acción | Super Admin | Admin | Secretaria | Tesorero | Gerente | Presidente | Operador | Socio |
|--------|:-----------:|:-----:|:----------:|:--------:|:-------:|:----------:|:--------:|:-----:|
| Ver módulo de Pagos | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Registrar pagos | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear / editar tipos de cobro | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Generar cuotas mensuales | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Sanciones

| Acción | Super Admin | Admin | Secretaria | Tesorero | Gerente | Presidente | Operador | Socio |
|--------|:-----------:|:-----:|:----------:|:--------:|:-------:|:----------:|:--------:|:-----:|
| Ver listado de sanciones | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Crear sanción | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Apelar sanción | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Resolver sanción | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

### Reuniones

| Acción | Super Admin | Admin | Secretaria | Tesorero | Gerente | Presidente | Operador | Socio |
|--------|:-----------:|:-----:|:----------:|:--------:|:-------:|:----------:|:--------:|:-----:|
| Ver listado de reuniones | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Crear / editar reunión | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Registrar asistencia | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Finalizar / cancelar reunión | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

### Reportes

| Acción | Super Admin | Admin | Secretaria | Tesorero | Gerente | Presidente | Operador | Socio |
|--------|:-----------:|:-----:|:----------:|:--------:|:-------:|:----------:|:--------:|:-----:|
| Ver reportes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Exportar a Excel | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Imprimir reportes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

### Alertas y Notificaciones

| Acción | Super Admin | Admin | Secretaria | Tesorero | Gerente | Presidente | Operador | Socio |
|--------|:-----------:|:-----:|:----------:|:--------:|:-------:|:----------:|:--------:|:-----:|
| Ver alertas y notificaciones | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Configuración y Usuarios de Compañía

| Acción | Super Admin | Admin | Secretaria | Tesorero | Gerente | Presidente | Operador | Socio |
|--------|:-----------:|:-----:|:----------:|:--------:|:-------:|:----------:|:--------:|:-----:|
| Ver configuración de compañía | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Editar configuración | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver y gestionar usuarios internos | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invitar nuevos usuarios | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configurar branding | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Notas Adicionales

1. **Rol `socio`**: Solo accede a su portal personal en el Dashboard, que muestra su información personal, unidades asignadas, y alertas. No puede ver socios, conductores, pagos ni sanciones de otros.

2. **Roles "heredados"** (`gerente`, `presidente`, `tesorero`, `operador`): Existen en la base de datos y el sistema los reconoce, pero no pueden asignarse directamente a usuarios nuevos desde la interfaz actual. Solo se documentan sus permisos para compañías que ya los tengan configurados.

3. **Invitaciones**: Los nuevos usuarios se crean mediante invitación por correo electrónico con rol predeterminado. El rol puede ser `admin` o `secretaria`.

4. **Socios vs. Usuarios**: Un "socio" en el registro de la compañía es un conductor/propietario de unidad. Un "usuario" con rol `socio` es una persona con acceso de consulta al sistema vinculada a ese registro de socio.
