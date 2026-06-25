-- 1. Actualizar la política SELECT de la tabla de documentos
DROP POLICY IF EXISTS "documents_select" ON public.documents;

CREATE POLICY "documents_select"
ON public.documents
FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = documents.company_id
      AND p.is_active = true
      AND p.role IN ('admin', 'secretaria')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.members m ON m.profile_id = p.id
    WHERE p.id = auth.uid()
      AND p.company_id = documents.company_id
      AND p.is_active = true
      AND p.role = 'socio'
      AND m.company_id = documents.company_id
      AND documents.member_id = m.id
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.members m ON m.profile_id = p.id
    JOIN public.vehicles v ON v.member_id = m.id
    WHERE p.id = auth.uid()
      AND p.company_id = documents.company_id
      AND p.is_active = true
      AND p.role = 'socio'
      AND v.company_id = documents.company_id
      AND documents.vehicle_id = v.id
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.members m ON m.profile_id = p.id
    JOIN public.drivers d ON d.member_id = m.id
    WHERE p.id = auth.uid()
      AND p.company_id = documents.company_id
      AND p.is_active = true
      AND p.role = 'socio'
      AND d.company_id = documents.company_id
      AND documents.driver_id = d.id
  )
);

-- 2. Restringir lectura de Storage para rol socio (Solo admin y secretaria de la compañía correspondiente)
DROP POLICY IF EXISTS "company_documents_select" ON storage.objects;

CREATE POLICY "company_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-documents' AND
  (
    (
      (storage.foldername(name))[1] = get_my_company_id()::text
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('admin', 'secretaria')
          AND p.is_active = true
      )
    ) OR is_super_admin()
  )
);
