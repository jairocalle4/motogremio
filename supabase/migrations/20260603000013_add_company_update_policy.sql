-- Migración: Permitir a los administradores de la compañía actualizar los datos de su propia compañía.
CREATE POLICY "Cmp_Update_Company_Admin" 
ON companies 
FOR UPDATE 
USING (
  id = get_my_company_id() 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
