-- Hacer opcional el expiry_date para documentos que no caducan (ej. Copia de cédula)
ALTER TABLE public.documents
ALTER COLUMN expiry_date DROP NOT NULL;
