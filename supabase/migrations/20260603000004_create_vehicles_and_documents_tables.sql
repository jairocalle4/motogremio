CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE RESTRICT NOT NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  disk_number varchar(10) NOT NULL,
  plate varchar(20) NOT NULL,
  brand varchar(50),
  model varchar(50),
  year integer,
  color varchar(30),
  motor_number varchar(50),
  chassis_number varchar(50),
  status vehicle_status DEFAULT 'activa',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, disk_number),
  UNIQUE(company_id, plate)
);

CREATE TABLE document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_entity varchar(20) NOT NULL,
  requires_expiry boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE,
  document_type_id uuid REFERENCES document_types(id) ON DELETE RESTRICT NOT NULL,
  document_number varchar(50),
  issue_date date,
  expiry_date date NOT NULL,
  file_url text,
  status document_status DEFAULT 'vigente',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT check_document_target CHECK (
    (member_id IS NOT NULL)::integer + 
    (vehicle_id IS NOT NULL)::integer + 
    (driver_id IS NOT NULL)::integer = 1
  )
);
