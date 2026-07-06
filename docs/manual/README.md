# Documentación de MotoGremio EC

Este directorio contiene la documentación oficial del sistema MotoGremio EC.

## Estructura

```
docs/
└── manual/
    ├── README.md                              ← Este archivo
    ├── manual-usuario-completo-motogremio.md  ← Manual principal
    ├── inventario-funcional.md                ← Auditoría de módulos y funciones
    ├── matriz-roles-permisos.md               ← Tabla completa de permisos por rol
    ├── listado-capturas.md                    ← Registro de capturas requeridas
    ├── checklist-validacion-manual.md         ← Lista de validación antes de publicar
    └── assets/                                ← Capturas de pantalla (pendientes)
```

## Rama de trabajo

```
docs/manual-usuario-completo
```

Esta rama contiene únicamente documentación. No incluye cambios en `src/`, `supabase/` ni archivos de configuración.

## Estado

| Archivo | Estado |
|---------|--------|
| `manual-usuario-completo-motogremio.md` | ✅ Primera versión completa |
| `inventario-funcional.md` | ✅ Completo |
| `matriz-roles-permisos.md` | ✅ Completo |
| `listado-capturas.md` | ✅ Listado creado — Capturas pendientes de tomar |
| `checklist-validacion-manual.md` | ✅ Completo |
| `assets/` | ⏳ Capturas pendientes |

## Pendientes antes de publicar

1. **Tomar capturas de pantalla** según `listado-capturas.md` y guardarlas en `assets/`.
2. **Completar información de soporte** ([INFORMACIÓN DE SOPORTE POR DEFINIR]).
3. **Completar datos del proveedor** ([NOMBRE DE EMPRESA DESARROLLADORA POR DEFINIR]).
4. **Validar el checklist completo** en `checklist-validacion-manual.md`.
5. **Convertir a Word o PDF** para distribución a los usuarios finales.

## Notas de autoría

- Versión del sistema documentada: `main` — julio 2026
- Commits de referencia: `5873197`, `4cdaeb7`, `e3837de`
- Verificado contra: `src/router/index.tsx`, `src/hooks/usePermissions.ts`, `src/types/index.ts`
