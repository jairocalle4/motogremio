-- Script idempotente para sembrar tipos de documentos base por compañía
-- Solo se insertarán los tipos en compañías existentes.

DO $$
DECLARE
    comp RECORD;
BEGIN
    FOR comp IN SELECT id FROM companies LOOP
        -- SOCIOS (member)
        INSERT INTO document_types (company_id, name, target_entity, requires_expiry, is_active)
        VALUES 
            (comp.id, 'Copia de cédula', 'member', false, true),
            (comp.id, 'Certificado de votación', 'member', true, true),
            (comp.id, 'Solicitud de ingreso', 'member', false, true),
            (comp.id, 'Contrato o acuerdo', 'member', false, true)
        ON CONFLICT (company_id, name) DO NOTHING;

        -- CONDUCTORES (driver)
        INSERT INTO document_types (company_id, name, target_entity, requires_expiry, is_active)
        VALUES 
            (comp.id, 'Copia de cédula', 'driver', false, true),
            (comp.id, 'Certificado médico', 'driver', true, true)
        ON CONFLICT (company_id, name) DO NOTHING;

        -- UNIDADES (vehicle)
        INSERT INTO document_types (company_id, name, target_entity, requires_expiry, is_active)
        VALUES 
            (comp.id, 'Matrícula', 'vehicle', true, true),
            (comp.id, 'Revisión vehicular', 'vehicle', true, true),
            (comp.id, 'Permiso de operación', 'vehicle', true, true),
            (comp.id, 'Seguro o SOAT', 'vehicle', true, true)
        ON CONFLICT (company_id, name) DO NOTHING;

    END LOOP;
END $$;
