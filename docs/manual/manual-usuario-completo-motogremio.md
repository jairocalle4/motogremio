# MotoGremio EC — Manual de Usuario

<p align="center">
  <br/>
  <strong>MotoGremio EC</strong><br/>
  <em>Gestión integral para compañías y organizaciones de transporte</em><br/><br/>
  Versión del manual: <strong>1.0</strong><br/>
  Fecha de actualización: <strong>Julio 2026</strong>
</p>

<p align="center">
  [Logo de MotoGremio EC]<br/><br/>
  Desarrollado por: [NOMBRE DE EMPRESA DESARROLLADORA POR DEFINIR]<br/>
  Soporte: [INFORMACIÓN DE SOPORTE POR DEFINIR]
</p>

---

## Índice

1. [Introducción](#1-introducción)
2. [¿Qué es MotoGremio EC?](#2-qué-es-motogremio-ec)
3. [Requisitos para utilizar el sistema](#3-requisitos-para-utilizar-el-sistema)
4. [Roles y permisos](#4-roles-y-permisos)
5. [Acceso al sistema](#5-acceso-al-sistema)
6. [Instalación como aplicación (PWA)](#6-instalación-como-aplicación-pwa)
7. [Navegación general](#7-navegación-general)
8. [Panel principal (Dashboard)](#8-panel-principal-dashboard)
9. [Gestión de socios](#9-gestión-de-socios)
10. [Gestión de conductores](#10-gestión-de-conductores)
11. [Gestión de unidades o vehículos](#11-gestión-de-unidades-o-vehículos)
12. [Documentos y licencias](#12-documentos-y-licencias)
13. [Sanciones y multas](#13-sanciones-y-multas)
14. [Pagos y cuotas](#14-pagos-y-cuotas)
15. [Tipos de cobro](#15-tipos-de-cobro)
16. [Configurar cuota mensual](#16-configurar-cuota-mensual)
17. [Generar cuotas del mes](#17-generar-cuotas-del-mes)
18. [Registrar pagos](#18-registrar-pagos)
19. [Reuniones](#19-reuniones)
20. [Alertas y notificaciones](#20-alertas-y-notificaciones)
21. [Reportes](#21-reportes)
22. [Configuración de la compañía](#22-configuración-de-la-compañía)
23. [Gestión de usuarios y roles](#23-gestión-de-usuarios-y-roles)
24. [Panel del Superadministrador](#24-panel-del-superadministrador)
25. [Puesta en marcha de una compañía nueva](#25-puesta-en-marcha-de-una-compañía-nueva)
26. [Seguridad y buenas prácticas](#26-seguridad-y-buenas-prácticas)
27. [Funcionamiento sin conexión](#27-funcionamiento-sin-conexión)
28. [Mensajes y errores frecuentes](#28-mensajes-y-errores-frecuentes)
29. [Preguntas frecuentes](#29-preguntas-frecuentes)
30. [Glosario](#30-glosario)
31. [Historial de versiones](#31-historial-de-versiones)

---

## 1. Introducción

Este manual explica paso a paso cómo utilizar **MotoGremio EC**, el sistema de gestión integral para compañías y organizaciones de transporte.

Está dirigido a cualquier persona que tenga acceso al sistema, independientemente de sus conocimientos técnicos. No es necesario saber programación para seguir las instrucciones.

> **Nota:** Este manual corresponde a la versión publicada en **julio de 2026**. Algunas pantallas pueden variar levemente en futuras actualizaciones.

---

## 2. ¿Qué es MotoGremio EC?

MotoGremio EC es un sistema de administración en la nube diseñado para compañías de transporte. Permite:

- Registrar y gestionar socios, conductores y unidades de transporte.
- Controlar el estado de documentos y licencias.
- Registrar y dar seguimiento a sanciones y multas.
- Administrar cuotas, pagos y deudas.
- Programar y registrar reuniones con control de asistencia.
- Generar reportes financieros y operativos.
- Gestionar usuarios con distintos niveles de acceso.

El sistema está disponible en línea en:

```
https://motogremio.pages.dev
```

No necesita instalarse como un programa tradicional. Funciona en cualquier navegador moderno conectado a internet.

---

## 3. Requisitos para utilizar el sistema

| Requisito | Detalle |
|-----------|---------|
| Conexión a internet | Obligatoria para consultar y guardar información |
| Navegador recomendado | Google Chrome o Microsoft Edge (versión reciente) |
| Dispositivo | Computadora, tablet o teléfono con Android |
| Cuenta de usuario | Correo electrónico y contraseña asignados por el administrador |

> **Importante:** MotoGremio EC no funciona sin conexión a internet. La pantalla "Sin conexión" indica que no hay comunicación con los servidores.

---

## 4. Roles y permisos

MotoGremio EC tiene diferentes niveles de acceso según el rol del usuario.

| Rol | Nombre visible | Descripción |
|-----|----------------|-------------|
| `super_admin` | Super Admin | Administra la plataforma completa: compañías, planes y configuración global. |
| `admin` | Administrador | Acceso completo a todos los módulos de su compañía. |
| `secretaria` | Secretario/a | Gestión operativa: socios, unidades, conductores, documentos y sanciones. No ve pagos. |
| `tesorero` | Tesorero | Acceso al módulo de pagos, cuotas y reportes. |
| `gerente` | Gerente | Lectura general y gestión de sanciones y reuniones. |
| `presidente` | Presidente | Lectura general de todos los módulos. |
| `operador` | Operador | Lectura general de todos los módulos. |
| `socio` | Socio / Consulta | Solo accede a su portal personal con su información. |

> **Nota:** Los roles Gerente, Presidente, Tesorero y Operador corresponden a una versión anterior del sistema. Los nuevos usuarios se crean como Administrador o Secretario/a.

El Superadministrador tiene un panel separado para gestionar todas las compañías de la plataforma.

---

## 5. Acceso al sistema

### 5.1 Cómo iniciar sesión

#### ¿Para qué sirve?
Ingresar al sistema con el correo y contraseña asignados.

#### ¿Quién puede realizarlo?
Cualquier usuario con cuenta activa.

#### Pasos

1. Abra su navegador (Chrome o Edge).
2. Ingrese a la dirección: `https://motogremio.pages.dev`
3. Ingrese su **correo electrónico**.
4. Ingrese su **contraseña**.
5. Para ver la contraseña mientras escribe, presione el ícono del ojo.
6. Presione el botón **Iniciar sesión**.

#### Resultado esperado
El sistema lo llevará automáticamente al panel principal según su rol:
- Si es Superadministrador → Panel de Superadministrador.
- Si es cualquier otro rol → Dashboard de la compañía.

#### Posibles errores

| Mensaje | Causa | Solución |
|---------|-------|----------|
| Credenciales inválidas | Correo o contraseña incorrectos | Verifique los datos e intente de nuevo |
| Su cuenta está desactivada | El administrador desactivó la cuenta | Contacte al administrador |
| La compañía está suspendida | La compañía fue suspendida por el superadmin | Contacte al superadministrador |

[CAPTURA PENDIENTE: 01-login.png — Pantalla de inicio de sesión]

---

### 5.2 Cambiar contraseña

#### ¿Para qué sirve?
Actualizar la contraseña de su cuenta por seguridad.

#### ¿Quién puede realizarlo?
Cualquier usuario autenticado.

#### Pasos

1. En el menú lateral, desplácese al área del usuario (parte inferior).
2. Busque la opción **Seguridad** o acceda directamente a `/account/security`.
3. Ingrese su contraseña actual.
4. Ingrese la nueva contraseña.
5. Repita la nueva contraseña.
6. Presione **Guardar**.

[CAPTURA PENDIENTE: 39-cambiar-contrasena.png — Pantalla de cambio de contraseña]

---

### 5.3 Cerrar sesión

#### Pasos

1. En el menú lateral (parte inferior), presione el botón **Cerrar sesión**.
2. Confirme si el sistema lo solicita.

> **Importante:** Si usa un equipo compartido o público, siempre cierre sesión antes de retirarse.

---

## 6. Instalación como aplicación (PWA)

MotoGremio EC puede instalarse como una aplicación en su computadora o teléfono sin necesidad de descargarla desde una tienda de aplicaciones.

### ¿Qué significa esto?
Puede abrir MotoGremio EC directamente desde su escritorio o pantalla de inicio como si fuera una aplicación normal, sin necesidad de abrir el navegador.

### 6.1 En computadora (Windows, macOS)

#### Pasos con Chrome o Edge

1. Abra `https://motogremio.pages.dev` en Chrome o Edge.
2. Espere a que cargue completamente.
3. En la barra de direcciones (esquina derecha), busque el ícono de **Instalar**.
   - En Chrome: ícono de computadora con flecha hacia abajo.
   - En Edge: ícono de "+" o "Agregar al escritorio".
4. Presione ese ícono.
5. En la ventana que aparece, presione **Instalar**.
6. La aplicación se abrirá automáticamente.
7. Desde ese momento puede abrirla desde el escritorio.

#### Para desinstalarla
- En Windows: clic derecho sobre el ícono de la aplicación → Desinstalar.
- En el navegador: Configuración → Aplicaciones → MotoGremio → Eliminar.

[CAPTURA PENDIENTE: 36-pwa-instalar.png — Botón de instalación PWA en Chrome]

---

### 6.2 En teléfono Android

#### Pasos

1. Abra Chrome en su teléfono Android.
2. Ingrese a `https://motogremio.pages.dev`.
3. Espere a que cargue completamente.
4. Aparecerá una barra en la parte inferior con la opción **Agregar a pantalla de inicio**. Si no aparece automáticamente:
   - Presione el menú de tres puntos (⋮) en la esquina superior derecha.
   - Seleccione **Agregar a pantalla de inicio**.
5. Confirme el nombre y presione **Agregar**.
6. La aplicación aparecerá en su pantalla de inicio.

[CAPTURA PENDIENTE: 37-pwa-android.png — Instalación en Android]

---

### 6.3 Actualizaciones de la aplicación

Cuando el sistema recibe una actualización:
1. Abra la aplicación (o el navegador si no está instalada).
2. Si aparece un mensaje de nueva versión disponible, recargue la página.
3. Si nota que la información no se actualiza, cierre y vuelva a abrir la aplicación.

> **Nota:** Si la PWA muestra una versión antigua: cierre la aplicación completamente, ábrala nuevamente y espere unos segundos mientras se actualiza.

---

## 7. Navegación general

### 7.1 Menú lateral (Sidebar)

El menú lateral aparece al lado izquierdo de la pantalla en computadoras. En teléfonos, se abre presionando el ícono de menú (☰) en la parte superior.

**Secciones del menú de compañía:**
- Dashboard
- Socios
- Conductores
- Unidades
- Pagos
- Documentos
- Sanciones
- Reuniones
- Reportes
- Alertas
- *(Separador)*
- Usuarios *(solo admin)*
- Configuración *(solo admin)*

> **Nota:** Los ítems del menú que usted ve dependen de su rol. Los usuarios con acceso limitado verán menos opciones.

### 7.2 Encabezado (Header)

En la parte superior de la pantalla se muestra:
- El nombre de la sección actual.
- El nombre de su compañía.
- Un ícono de campana para alertas rápidas.
- Botón de menú en dispositivos móviles.

### 7.3 Elementos visuales comunes

| Elemento | Descripción |
|----------|-------------|
| Botón azul / principal | Acción principal de la pantalla |
| Botón blanco con borde | Acción secundaria o cancelar |
| Ícono de lápiz (✏️) | Editar un registro |
| Ícono de ojo (👁️) | Ver detalle |
| Ícono de candado | Acción bloqueada o protegida |
| Casilla de verificación | Selección múltiple |
| Buscador | Filtrar por nombre, número u otro campo |
| Paginación | Navegar entre páginas de resultados |

### 7.4 Significado de los estados visuales

| Estado | Significado |
|--------|-------------|
| **Activo** | El registro está en funcionamiento normal |
| **Inactivo** | El registro existe pero no opera actualmente |
| **Suspendido** | Temporalmente bloqueado por una gestión administrativa |
| **Pendiente** | Acción o proceso que aún no se completa |
| **Pagada** | La deuda fue saldada completamente |
| **Parcial** | Se pagó solo una parte (solo aplica a cuotas normales, no a multas) |
| **Vencido** | Documento o licencia que superó su fecha de vencimiento |
| **Por vencer** | Documento a menos de 30 días de vencerse |
| **Vigente** | Documento en regla |
| **Resuelta** | Sanción con decisión final tomada |
| **Anulada** | Cancelada sin efecto financiero o administrativo |
| **En apelación** | En proceso de revisión; el cobro está suspendido temporalmente |

---

## 8. Panel principal (Dashboard)

### 8.1 Dashboard de la compañía

El Dashboard es la primera pantalla que ve al iniciar sesión. Muestra un resumen del estado actual de la organización.

**Indicadores típicos mostrados:**
- Total de socios activos.
- Total de unidades activas.
- Documentos vencidos o por vencer.
- Alertas de morosidad.
- Actividad reciente.

> Los indicadores exactos dependen del rol. Los administradores ven más información que los operadores.

[CAPTURA PENDIENTE: 03-dashboard-compania.png — Panel principal de la compañía]

---

### 8.2 Portal del socio

Si inicia sesión con el rol **Socio / Consulta**, verá el portal personal.

Este portal muestra:
- Sus datos personales registrados.
- Sus unidades asociadas.
- Su estado en la compañía.
- Notificaciones y alertas relevantes para usted.

El socio **no puede** ver información de otros socios, cuotas de otros, ni administrar ningún dato.

[CAPTURA PENDIENTE: 04-portal-socio.png — Portal personal del socio]

---

## 9. Gestión de socios

### 9.1 Ver el listado de socios

#### ¿Para qué sirve?
Consultar todos los socios registrados en la compañía.

#### ¿Quién puede realizarlo?
Administrador, Secretario/a, Gerente, Presidente, Tesorero, Operador.

#### Pasos

1. En el menú lateral, presione **Socios**.
2. Aparecerá una tabla con todos los socios.
3. Use el buscador para filtrar por nombre o número de cédula.
4. Use los filtros para ver socios por estado (activo, inactivo, suspendido).

[CAPTURA PENDIENTE: 06-socios-listado.png — Listado de socios]

---

### 9.2 Crear un socio nuevo

#### ¿Para qué sirve?
Registrar un nuevo socio o conductor propietario en la compañía.

#### ¿Quién puede realizarlo?
Administrador, Secretario/a.

#### Requisitos previos
Tener la cédula de identidad, nombre completo y datos de contacto del socio.

#### Pasos

1. En **Socios**, presione el botón **Nuevo socio** o **+ Agregar**.
2. Complete los datos del formulario:
   - **Número de cédula** (obligatorio)
   - **Nombre** y **apellido** (obligatorio)
   - **Correo electrónico** (opcional)
   - **Teléfono** (opcional)
   - **Dirección** (opcional)
   - **Fecha de ingreso** (obligatorio)
   - **Grupo sanguíneo** (opcional)
   - **Contacto de emergencia** (nombre y teléfono, opcionales)
   - **Observaciones** (opcional)
3. Presione **Guardar**.

#### Resultado esperado
El socio aparece en el listado con estado **Activo**.

#### Posibles errores

| Error | Causa | Solución |
|-------|-------|----------|
| Cédula duplicada | Ya existe un socio con ese número | Verifique si el socio ya está registrado |
| Campo obligatorio vacío | Faltó llenar un dato requerido | Revise los campos marcados con * |

> **Importante:** La información personal de los socios es privada. No comparta capturas de pantalla que muestren cédulas o datos de contacto de socios reales.

[CAPTURA PENDIENTE: 07-nuevo-socio.png — Formulario de nuevo socio]

---

### 9.3 Editar un socio

#### Pasos

1. En el listado de socios, presione el ícono de editar (✏️) junto al socio.
2. Modifique los datos necesarios.
3. Presione **Guardar**.

---

### 9.4 Activar o desactivar un socio

#### ¿Para qué sirve?
Marcar a un socio como inactivo cuando ya no forma parte de la compañía, sin eliminarlo del historial.

#### Pasos

1. En el listado de socios, busque al socio.
2. Presione el botón de cambio de estado o el interruptor correspondiente.
3. Confirme la acción.

> **Importante:** Desactivar un socio no elimina su historial de pagos ni sanciones. Sus datos quedan conservados para consulta.

---

### 9.5 Ver el detalle de un socio

#### Pasos

1. En el listado, presione el nombre del socio o el ícono de ver (👁️).
2. Se abrirá la ficha completa con:
   - Datos personales.
   - Estado actual.
   - Unidades asociadas.
   - Licencias registradas.
   - Documentos relacionados.

[CAPTURA PENDIENTE: 08-detalle-socio.png — Detalle de socio]

---

## 10. Gestión de conductores

Los conductores son personas que operan las unidades. Pueden ser el propio socio propietario o un conductor externo (sin vínculo con el registro de socios).

### 10.1 Ver el listado de conductores

#### ¿Quién puede realizarlo?
Administrador, Secretario/a, Gerente, Presidente, Tesorero, Operador.

#### Pasos

1. En el menú lateral, presione **Conductores**.
2. Verá la lista de conductores registrados.
3. Use el buscador o filtros para encontrar un conductor específico.

[CAPTURA PENDIENTE: 12-conductores.png — Listado de conductores]

---

### 10.2 Crear un conductor nuevo

#### ¿Quién puede realizarlo?
Administrador, Secretario/a.

#### Pasos

1. Presione el botón **Nuevo conductor**.
2. Complete:
   - **Número de cédula** (obligatorio)
   - **Nombre** y **apellido** (obligatorio)
   - **Teléfono** y **dirección** (opcionales)
   - **Socio vinculado** (si el conductor es propietario de unidad, vincule al socio)
   - **Fecha de ingreso** (opcional)
   - **Observaciones** (opcional)
3. Presione **Guardar**.

---

### 10.3 Licencias de conductor

Desde el detalle del conductor puede registrar su licencia de conducir:

1. Abra el detalle del conductor.
2. En la sección de licencias, presione **Agregar licencia**.
3. Complete:
   - Tipo de licencia
   - Número de licencia
   - Fecha de emisión
   - Fecha de vencimiento
   - Archivo (imagen o PDF de la licencia)
4. Presione **Guardar**.

> **Nota:** El sistema mostrará una alerta cuando la licencia esté a menos de 30 días de vencer o ya haya vencido.

---

## 11. Gestión de unidades o vehículos

Las "unidades" representan los vehículos de transporte registrados en la compañía (pueden ser mototaxis, taxis, camionetas u otro tipo de transporte, según la configuración).

### 11.1 Ver el listado de unidades

#### ¿Quién puede realizarlo?
Administrador, Secretario/a, Gerente, Presidente, Tesorero, Operador.

#### Pasos

1. En el menú lateral, presione **Unidades**.
2. Aparecerá la lista de todas las unidades con su estado.
3. Use el buscador para filtrar por disco, placa o socio.

[CAPTURA PENDIENTE: 09-unidades-listado.png — Listado de unidades]

---

### 11.2 Crear una unidad nueva

#### ¿Quién puede realizarlo?
Administrador, Secretario/a.

#### Requisitos previos
El socio propietario debe estar ya registrado en el sistema.

#### Pasos

1. Presione el botón **Nueva unidad**.
2. Complete el formulario:
   - **Número de disco** (obligatorio, único por compañía)
   - **Placa** (obligatorio, única por compañía)
   - **Socio propietario** (obligatorio)
   - **Tipo de vehículo** (seleccione de la lista o ingrese uno personalizado)
   - **Marca**, **modelo**, **año**, **color** (opcionales)
   - **Número de motor** y **número de chasis** (opcionales)
   - **Estado**: activa, inactiva, en mantenimiento
   - **Observaciones** (opcional)
3. Presione **Guardar**.

#### Resultado esperado
La unidad aparece en el listado. Si está activa, participará en la generación de cuotas mensuales.

> **Importante:** Solo las unidades con estado **Activa** reciben cuotas mensuales al generarse.

[CAPTURA PENDIENTE: 10-nueva-unidad.png — Formulario de nueva unidad]

---

### 11.3 Asignar un conductor a una unidad

#### ¿Para qué sirve?
Registrar quién opera una unidad. Puede ser distinto del propietario (socio).

#### Pasos

1. Abra el detalle de la unidad.
2. En la sección de conductor, presione **Asignar conductor**.
3. Busque y seleccione el conductor.
4. Indique el motivo del cambio (opcional).
5. Presione **Guardar**.

---

### 11.4 Cambiar el estado de una unidad

#### Pasos

1. En el detalle de la unidad, localice el campo de **Estado**.
2. Seleccione el nuevo estado: Activa, Inactiva o En mantenimiento.
3. Guarde los cambios.

> **Advertencia:** Cambiar una unidad a "Inactiva" la excluye de la generación de cuotas mensuales hasta que vuelva a estar "Activa".

---

## 12. Documentos y licencias

### 12.1 Ver documentos

#### ¿Quién puede realizarlo?
Administrador, Secretario/a, Gerente, Presidente, Tesorero, Operador.

#### Pasos

1. En el menú lateral, presione **Documentos**.
2. Verá los documentos organizados por tipo: compañía, socios, unidades.
3. Use los filtros para buscar por estado o entidad.

El estado de cada documento puede ser:
- **Vigente**: en regla.
- **Por vencer**: vence en menos de 30 días.
- **Vencido**: ya superó la fecha de vencimiento.

[CAPTURA PENDIENTE: 13-documentos.png — Módulo de documentos]

---

### 12.2 Subir un documento

#### ¿Quién puede realizarlo?
Administrador, Secretario/a.

#### Pasos

1. En **Documentos**, presione **Subir documento** o el botón equivalente.
2. Seleccione a qué entidad pertenece: compañía, socio o unidad.
3. Busque y seleccione la entidad específica.
4. Seleccione el tipo de documento.
5. Ingrese el título del documento.
6. Agregue la fecha de emisión y fecha de vencimiento (si aplica).
7. Presione el botón de selección de archivo y elija el documento de su dispositivo.
8. Presione **Guardar**.

#### Posibles errores

| Error | Causa | Solución |
|-------|-------|----------|
| El archivo es demasiado grande | Supera el límite del plan | Comprima el archivo o use un formato más ligero |
| No se puede subir el archivo | Error en la configuración de almacenamiento | Contacte al administrador del sistema |

> **Importante:** Los documentos se almacenan en la nube. Necesita conexión a internet para subirlos o verlos.

---

## 13. Sanciones y multas

Este módulo permite registrar infracciones o incumplimientos de los socios, con su respectiva multa económica.

### Conceptos importantes

| Término | Significado |
|---------|-------------|
| **Sanción** | Registro administrativo de una infracción |
| **Multa** | Monto económico asociado a la sanción |
| **Cargo** | Deuda financiera generada por la multa |
| **Estado de sanción** | Estado administrativo: Pendiente, En apelación, Resuelta, Anulada |
| **Estado de pago** | Estado financiero del cargo: Pendiente, Pagada, Suspendida, Anulada |

> **Regla fundamental:**
> - **Resolver una sanción** es una decisión administrativa (confirmar, modificar o anular).
> - **Pagar una multa** es una operación financiera que se realiza desde **Pagos y Cuotas**.
> - Resolver una sanción **no** registra un pago ni elimina la deuda.

---

### 13.1 Ver el listado de sanciones

#### ¿Quién puede realizarlo?
Administrador, Secretario/a, Gerente, Presidente, Operador.

#### Pasos

1. En el menú lateral, presione **Sanciones**.
2. Verá la tabla con las sanciones registradas y las columnas:
   - Socio
   - Unidad
   - Infracción / Suceso
   - Fecha
   - Monto
   - Saldo
   - Estado sanción
   - Estado pago
   - Acciones

[CAPTURA PENDIENTE: 14-sanciones-listado.png — Listado de sanciones]

---

### 13.2 Crear una sanción

#### ¿Quién puede realizarlo?
Administrador, Secretario/a, Gerente.

#### Requisitos previos
El socio debe estar registrado en el sistema.

#### Pasos

1. En **Sanciones**, presione **Nueva sanción**.
2. Complete el formulario:
   - **Socio** (obligatorio)
   - **Tipo de sanción** (seleccione de la lista configurada por su compañía)
   - **Fecha de la infracción** (obligatorio)
   - **Descripción del suceso o motivo** (obligatorio)
   - **Unidad relacionada** (opcional, si la infracción involucra un vehículo)
   - **Reunión relacionada** (opcional, si la sanción viene de una reunión)
   - **Monto de la multa** (obligatorio si aplica multa económica)
3. Presione **Guardar**.

#### Resultado esperado
- La sanción aparece en el listado con:
  - **Estado sanción: Pendiente**
  - **Estado pago: Pendiente**
  - El saldo completo visible
- El socio aparece en la **Lista de Deudores** dentro de Pagos y Cuotas.

> **Advertencia:** La multa por sanción **no aparece** en el módulo de Tipos de Cobro ni en la generación de cuotas mensuales. Las multas son cobros individuales y específicos.

[CAPTURA PENDIENTE: 15-nueva-sancion.png — Formulario de nueva sanción]

---

### 13.3 Ver el detalle de una sanción

#### Pasos

1. En el listado, presione el nombre del socio o el ícono de ver (👁️).
2. Se abrirá el detalle con:
   - Información de la infracción.
   - Estado administrativo actual.
   - Estado financiero del cargo.
   - Historial de pagos aplicados (si existe alguno).
   - Observaciones y resoluciones previas.

[CAPTURA PENDIENTE: 16-detalle-sancion.png — Detalle de sanción]

---

### 13.4 Estados administrativos de una sanción

| Estado | Significado |
|--------|-------------|
| **Pendiente** | Sanción registrada, esperando resolución o pago |
| **En apelación** | El socio apeló; el cobro queda suspendido temporalmente |
| **Resuelta** | Se tomó una decisión final (confirmada, modificada o el cargo fue pagado) |
| **Anulada** | La sanción fue cancelada sin efecto financiero |

---

### 13.5 Apelar una sanción

#### ¿Para qué sirve?
Suspender temporalmente el cobro mientras se revisa la infracción.

#### ¿Quién puede realizarlo?
Administrador, Secretario/a, Gerente.

#### Pasos

1. Abra el detalle de la sanción.
2. Presione el botón **Apelar**.
3. Ingrese el motivo de la apelación.
4. Presione **Confirmar**.

#### Resultado esperado
- **Estado sanción: En apelación**
- **Estado pago: Suspendida**
- El cargo **no puede cobrarse** mientras esté en apelación.
- La deuda no desaparece; el saldo se conserva.

> **Importante:** Una sanción en apelación no puede cobrarse desde Pagos y Cuotas. Si intenta registrar el pago, el sistema lo rechazará.

[CAPTURA PENDIENTE: 17-apelar-sancion.png — Pantalla de apelación]

---

### 13.6 Resolver una sanción

Resolver significa tomar una decisión final sobre la apelación. Solo se puede hacer cuando la sanción está **En apelación** (o en ciertos casos **Pendiente**).

#### ¿Quién puede realizarlo?
Administrador, Secretario/a, Gerente.

#### Pasos

1. Abra el detalle de la sanción.
2. Presione **Resolver sanción**.
3. Seleccione una de las tres opciones:

[CAPTURA PENDIENTE: 18-resolver-sancion.png — Modal de resolución]

---

#### Opción 1: Confirmar multa

**¿Qué hace?**
Confirma que la infracción es válida y el saldo queda disponible para ser cobrado.

**Mensaje que verá:**
> La sanción será confirmada y el saldo completo volverá a estar disponible para cobro.

**Resultado:**
- Estado sanción: **Resuelta**
- Estado pago: **Pendiente**
- El saldo completo se conserva
- La multa vuelve a aparecer en Lista de Deudores
- **No se crea ningún pago**

---

#### Opción 2: Modificar multa

**¿Qué hace?**
Cambia el monto de la multa (por ejemplo, si se redujo parcialmente).

> **Advertencia:** Solo puede modificarse si **no existe ningún pago** registrado contra esta multa.

**Pasos:**
1. Ingrese el **monto actual** (solo lectura, referencia).
2. Ingrese el **nuevo monto** (mayor que cero).
3. Ingrese un **motivo** de la modificación.
4. Presione **Confirmar modificación**.

**Resultado:**
- Estado sanción: **Resuelta**
- Estado pago: **Pendiente**
- El nuevo monto y saldo quedan registrados
- La multa vuelve a estar disponible para cobro completo
- **No se crea ningún pago**

---

#### Opción 3: Anular multa

**¿Qué hace?**
Cancela por completo la sanción y la deuda económica.

**Mensaje que verá:**
> La sanción y su deuda serán anuladas. No se registrará ningún pago.

> **Advertencia:** Solo puede anularse si **no existe ningún pago** registrado. Si ya se abonó parcial o totalmente, no puede anularse.

**Resultado:**
- Estado sanción: **Anulada**
- Estado pago: **Anulada**
- Saldo: **$0.00**
- La multa desaparece de la Lista de Deudores
- **No se crea ningún pago**

---

### 13.7 Pagar una multa

Las multas **se pagan exclusivamente desde el módulo Pagos y Cuotas**, no desde el módulo Sanciones.

> Consulte la sección **18. Registrar pagos** → **Pagar una multa por sanción**.

**Reglas de pago para multas:**
- Se paga el saldo completo en una sola operación.
- No se aceptan abonos ni pagos parciales.
- No puede mezclarse con otras cuotas en el mismo cobro.
- No puede cobrarse si la sanción está En apelación, Anulada o ya fue Pagada.

**Después del pago:**
- Estado sanción: **Resuelta**
- Estado pago: **Pagada**
- Saldo: **$0.00**
- La multa desaparece de la Lista de Deudores.
- Permanece visible en el historial de Sanciones.

---

### 13.8 Acciones disponibles según el estado

| Estado | Acciones disponibles |
|--------|---------------------|
| **Pendiente** | Ver, Apelar |
| **En apelación** | Ver, Resolver (Confirmar / Modificar / Anular) |
| **Resuelta con saldo pendiente** | Ver (el cobro se hace desde Pagos y Cuotas) |
| **Resuelta y pagada** | Ver (solo consulta) |
| **Anulada** | Ver (solo consulta) |

---

## 14. Pagos y cuotas

El módulo de Pagos y Cuotas centraliza toda la gestión financiera de la compañía.

#### ¿Quién puede acceder?
Administrador, Tesorero, Gerente, Operador.

> **Nota:** La Secretaria **no** tiene acceso al módulo de Pagos.

---

### 14.1 Indicadores principales

Al abrir **Pagos**, verá un resumen en la parte superior con:

| Indicador | Significado |
|-----------|-------------|
| Total facturado | Suma de todas las cuotas generadas |
| Total recaudado | Suma de todos los pagos registrados |
| Saldo pendiente | Diferencia entre facturado y recaudado |
| Socios morosos | Número de socios con deudas vencidas |

Presione el botón **Actualizar** para refrescar estos datos sin recargar la página.

[CAPTURA PENDIENTE: 19-pagos-kpis.png — Indicadores de Pagos]

---

### 14.2 Lista de Deudores

Muestra todos los socios que tienen cuotas o multas pendientes de pago.

**Información visible por fila:**
- Socio (nombre y cédula)
- Unidad relacionada
- Concepto (descripción de la cuota o multa)
- Período (mes y año, si aplica)
- Monto original
- Saldo pendiente
- Estado del cargo
- Botón **Cobrar**

> **Nota:** Los cargos con estado **Suspendida** (sanción en apelación) o **Anulada** no muestran el botón Cobrar.

[CAPTURA PENDIENTE: 20-lista-deudores.png — Lista de Deudores]

---

### 14.3 Historial de Pagos

Muestra todos los pagos registrados, más recientes primero.

**Información por registro:**
- Fecha del pago
- Socio
- Unidad
- Concepto
- Método de pago
- Número de referencia (si existe)
- Monto
- Estado

Use el buscador o los filtros para localizar un pago específico.

[CAPTURA PENDIENTE: 23-historial-pagos.png — Historial de Pagos]

---

## 15. Tipos de cobro

Los tipos de cobro son plantillas que definen los conceptos por los que se generan cuotas.

#### ¿Quién puede gestionarlos?
Administrador, Tesorero.

[CAPTURA PENDIENTE: 24-tipos-cobro.png — Tipos de cobro]

---

### 15.1 Crear un tipo de cobro

#### Pasos

1. En **Pagos**, presione la pestaña o botón **Tipos de Cobro**.
2. Presione **Nuevo tipo de cobro**.
3. Complete:
   - **Nombre** (obligatorio): ej. "Cuota mensual administrativa"
   - **Descripción** (opcional)
   - **Monto por defecto** (obligatorio para tipos recurrentes)
   - **Tipo**: Recurrente o Eventual
4. Presione **Guardar**.

---

### 15.2 Tipos Recurrentes vs. Eventuales

| Tipo | Descripción | Ejemplos |
|------|-------------|----------|
| **Recurrente** | Se usa para generar cuotas mensuales automáticas a todas las unidades activas | Cuota mensual, aporte mensual |
| **Eventual** | Se cobra puntualmente a un socio específico, sin generación masiva | Duplicado de credencial, aporte extraordinario |

> **Importante:** Las multas generadas desde el módulo Sanciones son conceptos internos del sistema y **no aparecen** en los Tipos de Cobro visibles al administrador, ni en la generación de cuotas mensuales. Esto es correcto y esperado.

---

## 16. Configurar cuota mensual

Antes de generar cuotas mensuales, es necesario tener configurado un tipo de cobro recurrente.

### ¿Para qué sirve?
Define el concepto y monto que se cobrará mensualmente a cada unidad activa.

#### Pasos

1. En **Pagos**, presione la pestaña **Tipos de Cobro**.
2. Si aún no existe un tipo recurrente, presione **Configurar cuota mensual** o cree uno nuevo.
3. Ingrese:
   - **Nombre**: ej. "Cuota administrativa mensual"
   - **Descripción**: ej. "Cuota mensual por uso de la plataforma"
   - **Monto**: el valor definido por su compañía
   - **Tipo**: Recurrente (obligatorio)
4. Presione **Guardar**.

> **Resultado esperado:** El tipo de cobro recurrente aparece en la lista y estará disponible al generar cuotas del mes.

> **Ejemplo ilustrativo:** La compañía Demo S.A. configuró una cuota de $15.00 mensuales. *Cada compañía define su propio valor.*

[CAPTURA PENDIENTE: 25-configurar-cuota.png — Configuración de cuota mensual]

---

## 17. Generar cuotas del mes

### ¿Para qué sirve?
Crear automáticamente una cuota para cada unidad activa en un mes y año específicos.

#### ¿Quién puede realizarlo?
Administrador, Tesorero.

#### Requisitos previos
- Al menos una unidad activa registrada.
- Un tipo de cobro recurrente configurado con monto.

#### Pasos

1. En **Pagos**, presione el botón **Generar cuotas del mes**.
2. En el modal que aparece, seleccione:
   - **Tipo de cobro**: solo verá tipos recurrentes (no eventuales, no multas).
   - **Mes**: ej. Julio.
   - **Año**: ej. 2026.
   - **Fecha de vencimiento**: cuándo vence la cuota.
3. Revise el resumen:
   - Número de unidades activas que recibirán la cuota.
   - Monto por unidad.
4. Presione **Confirmar**.

#### Resultado esperado
Se crea una cuota por cada unidad activa. Estas aparecen en la Lista de Deudores.

#### Situaciones especiales

| Situación | Resultado |
|-----------|-----------|
| No existe tipo recurrente | El sistema muestra el mensaje "No existe una cuota mensual configurada" y ofrece el botón Configurar cuota mensual |
| No hay unidades activas | El sistema informa que no existen unidades activas para el período |
| Ya se generó la cuota para ese período | El sistema omite las cuotas duplicadas automáticamente |

> **Nota:** El sistema evita generar dos veces la misma cuota para una misma unidad, concepto y período. No hace falta preocuparse por duplicados.

[CAPTURA PENDIENTE: 26-generar-cuotas.png — Modal de generación de cuotas]

---

## 18. Registrar pagos

### 18.1 Pagar una cuota normal

#### ¿Para qué sirve?
Registrar el pago de una o varias cuotas mensuales de un socio.

#### ¿Quién puede realizarlo?
Administrador, Tesorero.

#### Pasos

1. En **Pagos → Lista de Deudores**, busque al socio.
2. Presione el botón **Cobrar** junto a la cuota correspondiente.
3. En el modal que aparece:
   - Seleccione las cuotas a pagar (se pueden seleccionar varias).
   - Seleccione el **método de pago**: efectivo, transferencia, depósito, cheque u otro.
   - Si es transferencia, depósito o cheque, ingrese el **número de referencia**.
   - Seleccione la **fecha del pago**.
   - Agregue **observaciones** si es necesario.
4. Verifique el total a cobrar.
5. Presione **Registrar pago**.

#### Resultado esperado
- El saldo de las cuotas seleccionadas se actualiza a $0.00.
- Las cuotas desaparecen de la Lista de Deudores.
- El pago aparece en el Historial de Pagos.
- Los indicadores de KPIs se actualizan al presionar **Actualizar**.

[CAPTURA PENDIENTE: 21-registrar-pago.png — Modal de registro de pago normal]

---

### 18.2 Pagar una multa por sanción

#### Reglas especiales para multas

> **Las multas por sanciones deben pagarse en una sola operación, por el valor completo del saldo pendiente. No se aceptan pagos parciales.**

El modal de pago para multas tiene las siguientes diferencias:

- El monto queda **fijo** al saldo completo de la multa.
- **No es posible** ingresar un valor menor ni mayor.
- **No se puede** combinar con otras cuotas normales en el mismo cobro.
- Los demás cargos quedan deshabilitados mientras se selecciona la multa.
- Se muestra el aviso: *"Las multas por sanciones se pagan en una sola operación. No se admiten abonos parciales."*
- El botón de acción dice: **Pagar multa completa**.

[CAPTURA PENDIENTE: 22-pagar-multa.png — Modal de pago de multa por sanción]

#### Resultado esperado tras el pago completo de la multa

- Estado de sanción: **Resuelta**
- Estado de pago: **Pagada**
- Saldo: **$0.00**
- El cobro aparece en el Historial de Pagos.
- La multa desaparece de la Lista de Deudores.
- La sanción permanece visible en el historial del módulo Sanciones.

---

## 19. Reuniones

El módulo de Reuniones permite programar y gestionar reuniones de la organización, registrar asistencia y generar sanciones por inasistencia injustificada.

#### ¿Quién puede acceder?
Administrador, Secretario/a, Gerente, Presidente, Operador.

---

### 19.1 Ver el listado de reuniones

#### Pasos

1. En el menú lateral, presione **Reuniones**.
2. Verá la lista con:
   - Título de la reunión
   - Tipo (Ordinaria, Extraordinaria, Asamblea, Capacitación, Otra)
   - Fecha y hora
   - Estado: Programada, En curso, Finalizada, Cancelada
3. Presione una reunión para ver su detalle.

[CAPTURA PENDIENTE: 30-reuniones-listado.png — Listado de reuniones]

---

### 19.2 Crear una reunión

#### ¿Quién puede realizarlo?
Administrador, Secretario/a, Gerente.

#### Pasos

1. Presione **Nueva reunión**.
2. Complete:
   - **Título** (obligatorio)
   - **Tipo de reunión** (seleccione de la lista)
   - **Fecha** y **hora** (obligatorio)
   - **Lugar** (opcional)
   - **¿Es obligatoria?** (active si la inasistencia puede generar sanción)
   - **Multa por inasistencia** (monto, si aplica)
3. Presione **Guardar**.

[CAPTURA PENDIENTE: 31-nueva-reunion.png — Formulario de nueva reunión]

---

### 19.3 Registrar asistencia

#### Pasos

1. Abra el detalle de la reunión.
2. En la sección de asistencia, verá la lista de socios.
3. Para cada socio seleccione:
   - **Asistió**
   - **Faltó**
   - **Llegó tarde**
   - **Justificado**
4. Agregue observaciones si es necesario.
5. Guarde los cambios.

[CAPTURA PENDIENTE: 32-asistencia-reunion.png — Registro de asistencia]

---

### 19.4 Finalizar una reunión

#### Pasos

1. Abra el detalle de la reunión.
2. Cuando la reunión haya concluido, presione **Finalizar reunión**.
3. Confirme la acción.

> **Nota:** Al finalizar una reunión obligatoria, el sistema puede generar automáticamente sanciones para los socios que estén marcados como "Faltó" sin justificación.

---

### 19.5 Cancelar una reunión

#### Pasos

1. Abra el detalle de la reunión.
2. Presione **Cancelar reunión**.
3. Confirme la acción.

> **Importante:** Cancelar una reunión no elimina el registro histórico, solo cambia el estado.

---

## 20. Alertas y notificaciones

El centro de alertas muestra notificaciones internas del sistema.

#### ¿Quién puede acceder?
Todos los roles, incluido el Socio.

#### Pasos

1. En el menú lateral, presione **Alertas**.
2. Verá las notificaciones ordenadas por fecha.

**Tipos de alertas:**
- Documentos por vencer o vencidos.
- Licencias por vencer.
- Socios con deudas vencidas.
- Alertas generales del sistema.

[CAPTURA PENDIENTE: 33-notificaciones.png — Centro de alertas]

---

## 21. Reportes

El módulo de Reportes permite generar informes de la compañía para consulta, impresión o exportación.

#### ¿Quién puede acceder?
Administrador, Secretario/a, Tesorero, Gerente, Presidente, Operador.

[CAPTURA PENDIENTE: 27-reportes.png — Módulo de reportes]

---

### 21.1 Tipos de reportes disponibles

| Reporte | Descripción |
|---------|-------------|
| Socios / Conductores | Listado completo con datos de contacto y estado |
| Unidades / Vehículos | Inventario de unidades con estado y propietario |
| Licencias y documentos | Estado de vencimientos |
| Financiero | Cuotas, pagos y saldos por período |
| Sanciones | Historial de infracciones y estado |

---

### 21.2 Exportar a Excel

1. Abra el reporte deseado.
2. Aplique los filtros necesarios.
3. Presione **Exportar a Excel** o el ícono correspondiente.
4. El archivo se descargará con formato de colores y bordes.

---

### 21.3 Imprimir

1. Abra el reporte.
2. Presione **Imprimir** o el ícono de impresora.
3. El reporte incluirá la cabecera con el logo y nombre de la compañía.

---

## 22. Configuración de la compañía

Permite personalizar los datos y apariencia de la compañía en el sistema.

#### ¿Quién puede acceder?
Administrador únicamente.

[CAPTURA PENDIENTE: 28-configuracion.png — Configuración de compañía]

---

### 22.1 Datos generales

1. En el menú lateral, presione **Configuración**.
2. En la pestaña de datos generales, puede editar:
   - **Nombre legal**: nombre oficial registrado
   - **Nombre comercial**: nombre que aparece en la app
   - **RUC**: número de registro único de contribuyentes
   - **Dirección**, **teléfono** y **correo**
   - **Nombres de los directivos**: gerente, presidente, secretario/a, tesorero/a
   - **Tipo de servicio de transporte**: seleccione de la lista o ingrese uno personalizado
3. Presione **Guardar**.

---

### 22.2 Branding (Identidad visual)

Puede personalizar la apariencia del sistema para su compañía:

1. En **Configuración**, presione la pestaña **Branding** o similar.
2. Puede ajustar:
   - **Logo**: suba el logotipo de su compañía
   - **Color principal**: el color que usará el menú lateral y botones principales
3. Presione **Guardar**.

#### Resultado esperado
- El menú lateral cambia al color seleccionado.
- El nombre comercial aparece en el menú.
- Los reportes impresos incluyen el logo.

[CAPTURA PENDIENTE: 29-branding.png — Sección de branding]

---

## 23. Gestión de usuarios y roles

Permite invitar a otras personas a usar el sistema con acceso controlado.

#### ¿Quién puede acceder?
Administrador únicamente.

[CAPTURA PENDIENTE: 34-usuarios-compania.png — Listado de usuarios]

---

### 23.1 Ver usuarios de la compañía

1. En el menú lateral, presione **Usuarios**.
2. Verá la lista de usuarios activos con su nombre, correo y rol.

---

### 23.2 Invitar un usuario nuevo

#### Pasos

1. Presione **Invitar usuario**.
2. Ingrese:
   - **Correo electrónico** de la persona a invitar.
   - **Rol**: Administrador o Secretario/a.
3. Presione **Enviar invitación**.

#### Resultado esperado
- La persona recibirá un correo con el enlace de invitación.
- El usuario aparece como "Pendiente" hasta que complete su registro.
- Una vez activo, puede iniciar sesión con sus credenciales.

[CAPTURA PENDIENTE: 35-invitar-usuario.png — Formulario de invitación]

---

### 23.3 Activar o desactivar un usuario

1. En el listado de usuarios, localice al usuario.
2. Use el interruptor o botón de cambio de estado.
3. Confirme la acción.

> **Importante:** Un usuario desactivado no puede iniciar sesión. Sus datos e historial se conservan.

---

## 24. Panel del Superadministrador

El Superadministrador gestiona la plataforma completa. Tiene acceso a un panel separado.

> Esta sección está dirigida exclusivamente al personal de la empresa que administra MotoGremio EC como plataforma.

[CAPTURA PENDIENTE: 40-super-admin-dashboard.png — Panel del Super Admin]

---

### 24.1 Dashboard global

Al ingresar como Superadministrador, verá:
- Total de compañías registradas.
- Compañías activas, suspendidas e inactivas.
- Resumen de planes activos.
- Alertas globales del sistema.

---

### 24.2 Gestión de compañías

[CAPTURA PENDIENTE: 41-super-admin-companias.png — Listado de compañías]

#### Ver compañías

1. En el panel SA, presione **Compañías**.
2. Verá la lista de todas las compañías con su estado y plan actual.

#### Crear una compañía

1. Presione **Nueva compañía**.
2. Complete los datos generales de la empresa.
3. Asigne un plan.
4. Presione **Guardar**.

#### Ver detalle de una compañía

1. Presione el nombre de la compañía.
2. Verá los datos, uso actual (socios, unidades), plan y estado.

#### Activar / suspender / inactivar una compañía

- Desde el detalle, cambie el estado con el botón correspondiente.
- Al suspender una compañía, sus usuarios no podrán ingresar al sistema.
- Al reactivarla, vuelve a estar disponible.

---

### 24.3 Gestión de planes

[CAPTURA PENDIENTE: 42-super-admin-planes.png — Planes]

Desde **Planes**, puede:
- Ver los planes disponibles: Básico, Profesional, Empresarial.
- Crear un plan nuevo con límites de socios, unidades y funciones habilitadas.
- Editar un plan existente.
- Activar o desactivar planes.

---

### 24.4 Suscripciones

Desde **Suscripciones** puede ver las suscripciones activas de cada compañía y su estado de facturación.

---

### 24.5 Alertas Globales

Muestra alertas del sistema aplicables a todas las compañías: documentos vencidos, morosidad generalizada, etc.

---

### 24.6 Configuración Global

Permite ajustar parámetros generales de la plataforma.

---

### 24.7 Auditoría del sistema

[CAPTURA PENDIENTE: 43-super-admin-auditoria.png — Auditoría global]

La auditoría registra todas las acciones importantes realizadas en el sistema.

**Para usar la auditoría:**
1. En el panel SA, presione **Auditoría**.
2. Use los filtros:
   - Por compañía
   - Por usuario
   - Por tipo de acción
   - Por fecha
3. Revise el listado de eventos.

**Información visible por registro:**
- Fecha y hora de la acción.
- Usuario que la realizó.
- Tipo de acción (crear, modificar, eliminar, pagar).
- Entidad afectada y su identificador.
- Datos anteriores y nuevos (cuando aplica).

> **Importante:** Los registros de auditoría no deben modificarse ni eliminarse. Son el historial oficial del sistema.

---

## 25. Puesta en marcha de una compañía nueva

Si su compañía acaba de acceder a MotoGremio EC, siga este orden recomendado:

### Lista de comprobación inicial

- [ ] **1. Completar datos generales**: nombre legal, nombre comercial, RUC, dirección, contacto y directivos.
- [ ] **2. Configurar el tipo de servicio de transporte**: seleccione o ingrese el tipo que opera su compañía.
- [ ] **3. Configurar el branding**: suba el logo y defina el color principal.
- [ ] **4. Crear usuarios administrativos**: invite a los operadores del sistema (secretaria/o, tesorero/a).
- [ ] **5. Registrar los socios o conductores**: ingrese a todos los miembros activos de la compañía.
- [ ] **6. Registrar las unidades o vehículos**: asocie cada unidad a su socio propietario.
- [ ] **7. Registrar licencias y documentos**: suba los documentos vigentes de cada unidad y socio.
- [ ] **8. Configurar la cuota mensual**: defina el tipo de cobro recurrente con el monto acordado.
- [ ] **9. Generar la primera cuota**: use el modal de Generar cuotas del mes.
- [ ] **10. Verificar permisos**: confirme que cada usuario ve únicamente lo que corresponde a su rol.
- [ ] **11. Realizar una prueba de pago**: registre un pago de prueba para verificar el flujo completo.
- [ ] **12. Revisar reportes**: genere un reporte financiero para confirmar que los datos son correctos.

> **Recomendación:** Haga la configuración inicial antes de ingresar datos reales de socios y pagos. Esto evita tener que corregir información posteriormente.

---

## 26. Seguridad y buenas prácticas

### 26.1 Protección de credenciales

- No comparta su contraseña con ninguna otra persona.
- Cambie su contraseña si sospecha que alguien más la conoce.
- Use contraseñas largas y diferentes a las de otros servicios.
- En equipos compartidos, siempre cierre sesión al terminar.

### 26.2 Protección de datos personales

- Los datos de socios (cédula, teléfono, correo, dirección) son información sensible.
- No comparta capturas de pantalla que muestren datos personales de socios reales.
- Solo el personal autorizado debe tener acceso al sistema.

### 26.3 Buenas prácticas operativas

- Verifique los datos antes de presionar Guardar.
- No repita una operación de pago si no está seguro del resultado; revise primero el Historial de Pagos.
- No genere cuotas para un período que ya fue facturado.
- Use el botón **Actualizar** para refrescar los datos antes de consultar saldos o reportes.
- Revise el período correcto antes de generar cuotas mensuales.
- Documente el motivo cuando apele, resuelva, modifique o anule una sanción.
- Desactive registros en lugar de eliminarlos cuando un socio o conductor deja la compañía.
- Mantenga actualizado el navegador para garantizar la compatibilidad con el sistema.
- Revise periódicamente los permisos de los usuarios para asegurarse de que corresponden al rol actual de cada persona.

---

## 27. Funcionamiento sin conexión

### ¿Necesito internet?

**Sí.** MotoGremio EC requiere conexión a internet para:
- Consultar información (socios, unidades, pagos).
- Guardar cualquier cambio (pagos, sanciones, cuotas).
- Subir documentos.
- Iniciar sesión.

### Pantalla "Sin conexión"

Si aparece la pantalla de "Sin conexión":

[CAPTURA PENDIENTE: 38-sin-conexion.png — Pantalla sin conexión]

1. Verifique que su dispositivo tiene internet activo (pruebe abrir otra página web).
2. Si tiene Wi-Fi pero el sistema no carga, es posible que el servidor esté temporalmente no disponible. Espere unos minutos y reintente.
3. Presione el botón **Reintentar** o actualice la página.

### Diferencia importante

| Situación | Causa |
|-----------|-------|
| Sin internet en el dispositivo | El Wi-Fi o datos móviles están desconectados |
| Internet activo pero el sistema no responde | El servidor puede tener mantenimiento temporal |

### Recomendaciones durante operaciones importantes

- **No cierre el navegador** mientras registra un pago o genera cuotas.
- Si la pantalla queda en blanco o "Sin conexión" durante un pago, **no repita la operación** de inmediato. Verifique primero en el Historial de Pagos si el registro se procesó.
- Si la app muestra información desactualizada, presione **Actualizar** o reabra la aplicación.

---

## 28. Mensajes y errores frecuentes

| Mensaje o situación | Significado | Solución |
|--------------------|-------------|----------|
| *No existe una cuota mensual configurada* | No hay un tipo de cobro recurrente con monto | Ir a Tipos de Cobro → Configurar cuota mensual |
| *No existen unidades activas para el período seleccionado* | Todas las unidades están inactivas o en mantenimiento | Revisar el estado de las unidades |
| *La multa está bajo proceso de apelación* | El cargo está suspendido, no se puede cobrar | Resolver la sanción primero |
| *Las multas por sanciones deben pagarse en su totalidad* | El monto ingresado no es igual al saldo completo | Pagar el saldo exacto de la multa |
| *Esta sanción ya tiene pagos aplicados* | Intenta modificar o anular una multa ya cobrada | No es posible modificar ni anular si ya hay pagos |
| *Operación no permitida para socios* | El rol Socio intenta realizar una acción restringida | El socio solo puede consultar su portal |
| *No tiene permisos suficientes* | El rol actual no permite esa acción | Contactar al administrador de la compañía |
| *Sin conexión* | No hay comunicación con el servidor | Verificar internet y reintentar |
| *Cédula duplicada* | Ya existe un socio o conductor con ese número | Buscar el registro existente antes de crear uno nuevo |
| *Ya existe una cuota para ese período y unidad* | El sistema evitó crear un duplicado | No repetir la generación de cuotas para ese mes |
| *El monto del pago debe ser mayor a cero* | Se intentó registrar un pago de $0 | Ingresar un monto válido |
| *La compañía está suspendida* | El superadministrador suspendió la cuenta | Contactar al administrador de la plataforma |
| *Su cuenta está desactivada* | El administrador desactivó el usuario | Contactar al administrador de la compañía |

---

## 29. Preguntas frecuentes

**¿Cómo instalo MotoGremio EC?**
No necesita instalarlo como programa. Abra `https://motogremio.pages.dev` en Chrome o Edge. Opcionalmente, puede instalarlo como aplicación usando el botón de instalación del navegador. Consulte la sección 6.

**¿Necesito internet?**
Sí. El sistema no funciona sin conexión. Consulte la sección 27.

**¿Cómo creo un socio?**
En el menú lateral → Socios → Nueva socio. Consulte la sección 9.2.

**¿Cómo registro una unidad?**
En el menú lateral → Unidades → Nueva unidad. El socio propietario debe existir previamente. Consulte la sección 11.2.

**¿Por qué una unidad no recibe cuota?**
Porque está en estado Inactiva o En mantenimiento. Solo las unidades Activas reciben cuotas. Consulte la sección 11.4.

**¿Por qué el selector "Tipo de cobro" está vacío en Generar cuotas?**
Porque no existe un tipo de cobro recurrente configurado. Consulte la sección 16.

**¿Cómo configuro la cuota mensual?**
En Pagos → Tipos de Cobro → Configurar cuota mensual. Consulte la sección 16.

**¿Puedo generar dos veces la cuota del mismo mes?**
No. El sistema detecta duplicados y omite automáticamente las cuotas que ya existen para el mismo período y unidad.

**¿Por qué una multa no aparece en "Generar cuotas"?**
Las multas por sanción son cobros individuales y no se generan masivamente. Tampoco aparecen en los Tipos de Cobro visibles. Esto es correcto.

**¿Dónde se paga una multa?**
En Pagos y Cuotas → Lista de Deudores → Cobrar. Consulte la sección 18.2.

**¿Se puede pagar parcialmente una multa?**
No. Las multas por sanciones deben pagarse en su totalidad en una sola operación. El sistema no acepta abonos parciales.

**¿Qué significa Apelar?**
Apelar suspende temporalmente el cobro de una multa mientras se revisa la infracción. La deuda no desaparece; el saldo se conserva suspendido. Consulte la sección 13.5.

**¿Qué significa Resolver?**
Resolver es tomar una decisión final sobre una sanción en apelación: confirmar la multa, modificar el monto o anularla. Consulte la sección 13.6.

**¿Resolver una sanción significa pagarla?**
No. Resolver es una decisión administrativa. El pago es una operación financiera separada que se realiza desde Pagos y Cuotas.

**¿Cómo anulo una multa?**
En el detalle de la sanción, cuando está en apelación, seleccione Resolver → Anular multa. Solo es posible si no existen pagos registrados.

**¿Por qué no puedo cobrar una sanción apelada?**
Porque está suspendida. Primero debe resolver la sanción (confirmar o modificar) para habilitarla nuevamente.

**¿Cómo sé si una multa ya fue pagada?**
En el módulo Sanciones, la columna "Estado pago" mostrará "Pagada" y el saldo "$0.00".

**¿Cómo actualizo la información de Pagos?**
Presione el botón **Actualizar** en la parte superior del módulo de Pagos.

**¿Qué hago si aparece "Sin conexión"?**
Verifique que tiene internet, espere unos segundos y presione **Reintentar**. Consulte la sección 27.

**¿Qué hago si la PWA muestra una versión anterior?**
Cierre la aplicación completamente y ábrala de nuevo. El sistema se actualizará automáticamente.

**¿Cómo cambio el logo de la compañía?**
En el menú lateral → Configuración → Branding. Consulte la sección 22.2.

**¿Qué ocurre cuando se alcanza el límite del plan?**
El sistema le avisará que no puede agregar más socios o unidades. Contacte al administrador de la plataforma para cambiar de plan.

---

## 30. Glosario

| Término | Definición |
|---------|-----------|
| **Administrador** | Usuario con acceso completo a todos los módulos de la compañía |
| **Apelación** | Proceso de revisión de una sanción que suspende temporalmente el cobro |
| **Asignación de pago** | Registro que vincula un pago con la cuota o cargo específico que cubre |
| **Auditoría** | Registro de todas las acciones realizadas en el sistema |
| **Branding** | Identidad visual de la compañía: logo, color y nombre comercial |
| **Cargo** | Deuda financiera generada para un socio (puede ser cuota o multa) |
| **Cobro recurrente** | Tipo de cobro diseñado para generarse mensualmente a todas las unidades activas |
| **Compañía** | Organización de transporte registrada en MotoGremio EC |
| **Conductor** | Persona que opera una unidad (puede ser externo al registro de socios) |
| **Cuota** | Deuda periódica (generalmente mensual) generada para un socio por una unidad activa |
| **Documento** | Archivo digital adjunto a una entidad: compañía, socio o unidad |
| **Estado de pago** | Situación financiera de un cargo: Pendiente, Parcial, Pagada, Suspendida, Anulada |
| **Estado de sanción** | Situación administrativa de una infracción: Pendiente, En apelación, Resuelta, Anulada |
| **Licencia** | Documento de habilitación para conducir, registrado para socios o conductores |
| **Multa** | Monto económico asociado a una sanción |
| **Pago** | Registro de una transacción de dinero recibida de un socio |
| **Plan** | Nivel de suscripción que define los límites y funciones disponibles para una compañía |
| **PWA** | Aplicación Web Progresiva — aplicación que puede instalarse desde el navegador sin tienda de aplicaciones |
| **Resolución** | Decisión final sobre una sanción: confirmar, modificar o anular la multa |
| **Saldo** | Monto aún pendiente de pago en una cuota o cargo |
| **Sanción** | Registro administrativo de una infracción cometida por un socio |
| **Secretario/a** | Usuario con acceso operativo: gestiona socios, unidades, conductores, documentos y sanciones |
| **Sin conexión** | Estado en el que el dispositivo no puede comunicarse con los servidores del sistema |
| **Socio** | Persona registrada como miembro de la compañía; puede ser propietario de una unidad |
| **Superadministrador** | Administrador de la plataforma completa de MotoGremio EC |
| **Tesorero** | Usuario con acceso al módulo de pagos y cuotas |
| **Tipo de cobro** | Plantilla que define el concepto, descripción y monto de un cobro |
| **Unidad** | Vehículo de transporte registrado en la compañía, asociado a un socio propietario |
| **Vehículo** | Ver "Unidad" |

---

## 31. Historial de versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | Julio 2026 | Primera versión del manual. Documenta todos los módulos disponibles en la versión de julio 2026. Incluye ciclo completo de sanciones y pagos con restricción de pago único para multas. |

---

*Manual de Usuario MotoGremio EC — Versión 1.0 — Julio 2026*  
*[INFORMACIÓN DE SOPORTE POR DEFINIR]*
