# Diseño de Alertas Internas por Vencimiento

Este documento describe la especificación técnica de las alertas por vencimiento e incidencias operativas de MotoGremio, implementadas en la **Fase 5.5B**.

## 1. Justificación Arquitectónica
Anteriormente, el cálculo de las alertas y notificaciones se realizaba completamente en el cliente (frontend), requiriendo 10 consultas en paralelo a tablas críticas como `documents`, `licenses`, `charges`, `meetings`, etc. Esto ocasionaba serios problemas:
- **Rendimiento deficiente:** Sobrecarga de transferencias de red y lecturas de base de datos.
- **Ruptura de UI por RLS:** El rol `socio` no tiene permisos para leer ciertas tablas (como todos los vehículos, conductores u otros socios), por lo que las consultas fallaban y bloqueaban la aplicación.

La solución reside en una función RPC centralizada y optimizada en la base de datos PostgreSQL, ejecutada con privilegios de `SECURITY DEFINER` para permitir el cruce de datos seguro, filtrando la información en base al rol real del usuario solicitante.

## 2. Definición de la RPC: `get_alerts_summary()`
La RPC expone un único punto de acceso para recuperar de forma agregada todas las alertas.

### Estructura de Retorno (JSONB)
```json
{
  "generated_at": "2026-06-26T16:00:00Z",
  "role": "socio",
  "counts": {
    "total": 2,
    "critical": 1,
    "warning": 1,
    "info": 0,
    "unread": 0
  },
  "alerts": [
    {
      "id": "doc-uuid",
      "source": "documentos",
      "source_id": "uuid",
      "severity": "critical",
      "title": "Documento Vencido",
      "message": "El documento RUC ha vencido.",
      "due_date": "2026-06-20",
      "days_remaining": -6,
      "link_url": "/documentos",
      "scope": "company",
      "is_read": false
    }
  ]
}
```

## 3. Matriz de Visibilidad por Rol (Lógica de Servidor)
- **super_admin:** Retorna vacío (rol de plataforma, no operativo).
- **admin & secretaria:** Tienen visibilidad de todas las alertas operativas de su compañía (documentos institucionales, de socios, licencias de conductores, deudas, vehículos sin conductor).
- **socio:** Restringido a:
  - Sus deudas personales.
  - Sus documentos de socio y licencias.
  - Los documentos de su vehículo y conductor asociado.
  - Notificaciones persistentes dirigidas específicamente a su `user_id`.

## 4. Endurecimiento de Políticas RLS
Se modificó la política de lectura SELECT de la tabla `notifications` (`notifications_select`) para garantizar que el `socio` solo pueda consultar notificaciones donde `user_id = auth.uid()`.
Los roles de directiva (`admin`, `secretaria`, etc.) mantienen el acceso de lectura para todas las notificaciones de su compañía (`company_id = get_my_company_id()`).
