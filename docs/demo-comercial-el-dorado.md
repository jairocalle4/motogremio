# Demostración Comercial — Cooperativa El Dorado S.A.

Este documento detalla el objetivo, la estructura de datos simulados y el guion sugerido para ejecutar una demostración comercial del software administrativo **MotoGremio**.

## 1. Objetivo de la Demo
Demostrar la versatilidad de MotoGremio como un SaaS multiempresa de transporte capaz de gestionar cooperativas de Taxis (además de mototaxis y transporte mixto), permitiendo una experiencia pulida en el control de socios, conductores, licencias, deudas, sanciones, notificaciones y asistencia a reuniones.

---

## 2. Datos Simulados Incluidos (El Dorado S.A.)
La demostración utiliza la compañía ficticia **Cooperativa de Transporte Ejecutivo El Dorado S.A.** con los siguientes datos simulados listos para usarse:

* **Identificador Fijo (company_id)**: `00000000-0000-0000-0000-00000000demo`
* **Tipo de Servicio**: Taxi (Clasificado como `taxi` en base de datos).
* **Socios (6 en total)**:
  - *Alejandro Mendoza*: Activo, al día con sus cuotas mensuales.
  - *Beatriz Gómez*: Activa, al día con sus cuotas.
  - *Carlos Andrade*: Activo, posee abono parcial en la cuota más reciente.
  - *Diana Peralta*: Activa, cuenta con dos meses de cuotas vencidas (morosa).
  - *Eduardo Castro*: Suspendido, moroso crónico (tres meses vencidos).
  - *Francisco Ortiz*: Retirado/Inactivo.
* **Vehículos (5 en total, tipo auto/taxi)**:
  - Nissan Sentra (Disco 001, Placa PBA-1001)
  - Hyundai Accent (Disco 002, Placa PBA-1002)
  - Chevrolet Sail (Disco 003, Placa PBA-1003)
  - Kia Rio (Disco 004, Placa PBA-1004)
  - Toyota Yaris (Disco 005, Placa PBA-1005, En mantenimiento)
* **Licencias de Conducir**:
  - Conductor 1 (*Alejandro Mendoza*): Licencia Tipo C vigente.
  - Conductor 2 (*Beatriz Gómez*): Licencia Tipo B vigente.
  - Conductor 3 (*Carlos Andrade*): Licencia Tipo C próxima a vencer (en menos de 15 días).
  - Conductor 5 (*Gabriel Villalba*): Licencia Tipo C vencida.
  - Conductor 4 (*Diana Peralta*): Conductor sin licencia registrada.
* **Finanzas**: Cuotas mensuales con estados *pagado*, *pendiente* y *moroso*.
* **Sanciones**:
  - Sanción leve cobrada por atraso a asamblea.
  - Sanción grave pendiente por incumplimiento de turno de guardia.
* **Reuniones**:
  - 1 Reunión pasada finalizada con asistencia cargada.
  - 1 Reunión futura programada con invitaciones ya enviadas por correo.

---

## 3. Instrucciones de Despliegue en Ambiente de Desarrollo

Para cargar los datos de demostración en su base de datos local o de pruebas, ejecute el siguiente comando de Supabase CLI en su terminal:

```bash
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/demo/seed_el_dorado_demo.sql
```
*(Nota: Ajuste los parámetros de conexión de acuerdo a su entorno local).*

### Creación de Usuarios de Prueba (Supabase Auth)
Debido a que el seed de base de datos no introduce registros directamente en la tabla protegida de autenticación de Supabase (`auth.users`), deberá crear el usuario administrativo de la demo manualmente:
1. Ingrese a su **Supabase Auth Dashboard**.
2. Presione **Add User** -> **Create User**.
3. Ingrese el correo de la demo (ej. `admin@eldorado.demo.motogremio.local`) y configure una contraseña segura.
4. Una vez creado el usuario en Auth, copie su `User ID` (UUID).
5. Ejecute un query SQL en su editor para asociar dicho UUID al perfil de la compañía demo, asignándole el rol `admin`:
   ```sql
   INSERT INTO profiles (id, company_id, first_name, last_name, role, is_active)
   VALUES ('[AUTH_USER_UUID]', '00000000-0000-0000-0000-00000000demo', 'Administrador', 'El Dorado', 'admin', true)
   ON CONFLICT (id) DO UPDATE SET company_id = EXCLUDED.company_id, role = EXCLUDED.role;
   ```

---

## 4. Guiones de Demostración Sugeridos

### Flujo de Demo Corta (10 Minutos) - Foco: Operatividad General y Control
1. **Inicio en el Login (1 min)**: Muestre la pantalla de ingreso con la nueva estética premium oscura y slogan generalizado para transportistas.
2. **Dashboard y Alertas (2 min)**: Ingrese como el administrador de *El Dorado*. Muestre el panel de alertas indicando de inmediato que hay unidades con conductores sin licencia de conducir (Conductor 4) y licencias vencidas (Conductor 5), lo que demuestra la proactividad del sistema.
3. **Módulo de Unidades / Vehículos (2 min)**: Navegue a la lista de unidades. Muestre que son automóviles tipo taxi con sus números de disco y marcas correspondientes. Edite el Toyota Yaris (Disco 005) para cambiar su estado de "En mantenimiento" a "Activa".
4. **Módulo de Socios y Ficha del Socio (3 min)**: Visite a la socia *Diana Peralta*. Muestre sus vehículos asociados, su saldo pendiente en finanzas y sus notificaciones.
5. **Cierre (2 min)**: Muestre la flexibilidad del sistema desde la configuración de la compañía donde se aprecia el tipo de servicio "Taxi".

### Flujo de Demo Extendida (20 Minutos) - Foco: Gestión Financiera e Institucional
1. **Puntos 1 a 4 del Flujo Corto (10 min)**.
2. **Control Financiero y Caja (4 min)**: Ingrese a Finanzas. Muestre el listado general de deudas, filtre por el estado "Moroso" para ver rápidamente a *Diana Peralta* y *Eduardo Castro*. Registre un pago de abono por $10 del socio *Carlos Andrade* y muestre cómo se actualiza su saldo pendiente en tiempo real.
3. **Asambleas y Reuniones (3 min)**: Ingrese a la sección de reuniones. Muestre el acta de asistencia de la asamblea pasada (Junio) y la convocatoria a la reunión de seguridad vial de la próxima semana, enseñando los estados de envío de notificaciones.
4. **Reporte General (3 min)**: Navegue a la sección de reportes e imprima el reporte consolidado que ahora muestra de forma neutra y profesional las estadísticas de conductores sin licencia vigente sin asumir exclusivamente la clase A1.

---

> [!WARNING]
> **Advertencia de Seguridad**: Este seed es de uso exclusivo para ambientes de prueba (`localhost` / `development` / `staging`). No ejecute este script en producción para evitar la creación de perfiles huérfanos sin correspondencia en Supabase Auth.
