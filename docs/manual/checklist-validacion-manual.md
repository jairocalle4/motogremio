# Checklist de Validación del Manual — MotoGremio EC

> A completar antes de aprobar el manual para conversión a Word/PDF.

---

## Verificación del Contenido

### Módulos y Rutas
- [ ] Todas las rutas disponibles en `src/router/index.tsx` fueron revisadas.
- [ ] Todos los módulos visibles (no placeholder) están documentados.
- [ ] Los módulos placeholder (`/auditoria`, `/super-admin/metrics`, `/super-admin/security`) NO se presentan como disponibles en el manual principal.
- [ ] La ruta del Portal del Socio (`/dashboard` con vista especial para rol `socio`) está diferenciada del Dashboard de compañía.

### Roles y Permisos
- [ ] Los 8 roles del sistema están listados con sus nombres visibles en la interfaz.
- [ ] Los roles heredados (gerente, presidente, tesorero, operador) están marcados como tales.
- [ ] La matriz de permisos fue verificada contra `usePermissions.ts`.
- [ ] El rol `socio` está documentado con acceso únicamente al portal y notificaciones.
- [ ] Se aclaró que los nuevos usuarios solo pueden crearse como `admin` o `secretaria`.

### Sanciones y Pagos (Crítico)
- [ ] Resolver una sanción NO se describe como equivalente a pagar.
- [ ] Las multas por sanción se documentan con pago completo obligatorio (sin abonos parciales).
- [ ] Se documenta que la multa se paga exclusivamente desde Pagos y Cuotas → Cobrar.
- [ ] Las tres opciones de resolución (Confirmar, Modificar, Anular) están documentadas por separado.
- [ ] Se documenta que Modificar solo se permite sin pagos previos aplicados.
- [ ] Se documenta que Anular solo se permite sin pagos previos aplicados.
- [ ] El estado "Estado sanción" (administrativo) está diferenciado del "Estado pago" (financiero).
- [ ] No se mencionan pagos parciales de multas en ninguna sección.

### Cuotas Mensuales
- [ ] El proceso de Configurar cuota mensual está antes de Generar cuotas.
- [ ] Se documenta que las multas de sanciones NO aparecen en el modal Generar cuotas.
- [ ] Se documenta que los tipos eventuales tampoco aparecen en Generar cuotas.
- [ ] Se explica la idempotencia (no se generan duplicados para el mismo período).
- [ ] Se documenta qué ocurre si no hay unidades activas.

### Tipos de Cobro
- [ ] La diferencia entre tipos recurrentes y eventuales está clara.
- [ ] Los tipos de sistema (categoría `sanction`) se documentan como NO visibles ni configurables por el administrador.

### Reuniones
- [ ] Las reuniones están documentadas como módulo disponible y funcional.
- [ ] El flujo de asistencia está documentado.
- [ ] Se documenta que una reunión obligatoria con inasistencia injustificada puede generar una sanción.

### Reportes y Exportaciones
- [ ] Solo se documentan los reportes realmente disponibles.
- [ ] La exportación a Excel está documentada (usando ExcelJS).
- [ ] La impresión con cabecera de compañía está documentada.

### PWA y Sin Conexión
- [ ] Se explica qué es una PWA en términos no técnicos.
- [ ] Se documenta la instalación en Chrome/Edge en computadora.
- [ ] Se documenta la instalación en Android.
- [ ] Se aclara que la app requiere internet para consultar y guardar.
- [ ] Se documenta la pantalla "Sin conexión".

### Seguridad y Privacidad
- [ ] No se incluyen contraseñas, API Keys, tokens ni secretos.
- [ ] No se incluyen cédulas, correos ni teléfonos reales.
- [ ] No se exponen URLs internas de Supabase.
- [ ] No se menciona `service_role` ni rutas de base de datos.
- [ ] No se menciona `RLS`, `RPC`, `PostgreSQL`, `triggers` ni terminología técnica en el cuerpo principal.

### Estilo y Redacción
- [ ] Español claro, sin anglicismos innecesarios.
- [ ] Pasos numerados en todos los procedimientos.
- [ ] Avisos (Nota, Importante, Advertencia) usados correctamente.
- [ ] No existen instrucciones contradictorias.
- [ ] No se usa "A1" o "Mototaxi" como términos exclusivos cuando aplica a cualquier tipo de transporte.
- [ ] Todos los marcadores de datos pendientes usan formato: `[INFORMACIÓN POR DEFINIR]`.

### Capturas de Pantalla
- [ ] Todas las capturas mencionadas en el listado están en `docs/manual/assets/`.
- [ ] Las capturas marcadas como pendientes tienen el marcador `[CAPTURA PENDIENTE: ...]`.
- [ ] Ninguna captura muestra datos personales reales.
- [ ] Ninguna captura muestra contraseñas ni API Keys.

### Datos del Manual
- [ ] Portada con versión y fecha actualizada.
- [ ] Información de soporte marcada como `[INFORMACIÓN DE SOPORTE POR DEFINIR]`.
- [ ] Historial de versiones iniciado con v1.0.

### Git
- [ ] Los archivos del manual solo están en `docs/manual/`.
- [ ] No se modificaron archivos en `src/`, `supabase/` ni configuraciones.
- [ ] La rama es `docs/manual-usuario-completo`.
- [ ] No se hizo merge a `main`.

---

## Pendientes del Propietario

Los siguientes datos deben ser proporcionados por el propietario del sistema antes de publicar el manual final:

1. Nombre de la empresa desarrolladora / proveedor del sistema.
2. Correo de soporte técnico.
3. Número de WhatsApp o teléfono de soporte.
4. URL del portal de soporte o documentación en línea.
5. Logo oficial de MotoGremio EC (alta resolución).
6. Capturas de pantalla reales tomadas en entorno de demostración.
7. Confirmación de los términos "Socio" vs "Conductor" preferidos para el tipo de transporte principal.
8. Confirmación de la versión del sistema a la que aplica el manual (actualmente basado en `main` julio 2026).
