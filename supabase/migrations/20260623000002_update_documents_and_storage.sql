-- 1. Actualizar el constraint de documentos para permitir documentos institucionales (Compañía)
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS check_document_target;

ALTER TABLE public.documents ADD CONSTRAINT check_document_target CHECK (
  ((member_id IS NOT NULL)::integer + 
   (vehicle_id IS NOT NULL)::integer + 
   (driver_id IS NOT NULL)::integer = 1)
  OR
  (member_id IS NULL AND vehicle_id IS NULL AND driver_id IS NULL) -- Documento de Compañía
);

-- 2. Añadir campos de auditoría opcionales
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Reforzar RLS para documentos de compañía (Opción A de seguridad)
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert" ON public.documents FOR INSERT WITH CHECK (
  (company_id = get_my_company_id() AND NOT is_super_admin() AND (
    (member_id IS NOT NULL OR vehicle_id IS NOT NULL OR driver_id IS NOT NULL) OR 
    (member_id IS NULL AND vehicle_id IS NULL AND driver_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  )) OR is_super_admin()
);

DROP POLICY IF EXISTS "documents_update" ON public.documents;
CREATE POLICY "documents_update" ON public.documents FOR UPDATE USING (
  (company_id = get_my_company_id() AND NOT is_super_admin() AND (
    (member_id IS NOT NULL OR vehicle_id IS NOT NULL OR driver_id IS NOT NULL) OR 
    (member_id IS NULL AND vehicle_id IS NULL AND driver_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  )) OR is_super_admin()
);

DROP POLICY IF EXISTS "documents_delete" ON public.documents;
CREATE POLICY "documents_delete" ON public.documents FOR DELETE USING (
  (company_id = get_my_company_id() AND NOT is_super_admin() AND (
    (member_id IS NOT NULL OR vehicle_id IS NOT NULL OR driver_id IS NOT NULL) OR 
    (member_id IS NULL AND vehicle_id IS NULL AND driver_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  )) OR is_super_admin()
);

-- 4. Crear Storage Bucket para company-documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-documents', 'company-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Crear Policies de Storage
DROP POLICY IF EXISTS "company_documents_select" ON storage.objects;
CREATE POLICY "company_documents_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'company-documents' AND
  (auth.role() = 'authenticated' AND (
    (storage.foldername(name))[1] = get_my_company_id()::text OR is_super_admin()
  ))
);

DROP POLICY IF EXISTS "company_documents_insert" ON storage.objects;
CREATE POLICY "company_documents_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'company-documents' AND
  (auth.role() = 'authenticated' AND (
    (storage.foldername(name))[1] = get_my_company_id()::text AND NOT is_super_admin()
  ) OR is_super_admin())
);

DROP POLICY IF EXISTS "company_documents_update" ON storage.objects;
CREATE POLICY "company_documents_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'company-documents' AND
  (auth.role() = 'authenticated' AND (
    (storage.foldername(name))[1] = get_my_company_id()::text AND NOT is_super_admin()
  ) OR is_super_admin())
);

DROP POLICY IF EXISTS "company_documents_delete" ON storage.objects;
CREATE POLICY "company_documents_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'company-documents' AND
  (auth.role() = 'authenticated' AND (
    (storage.foldername(name))[1] = get_my_company_id()::text AND NOT is_super_admin()
  ) OR is_super_admin())
);
