CREATE TABLE sanction_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  default_fine_amount numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE TABLE sanctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  sanction_type_id uuid REFERENCES sanction_types(id) ON DELETE RESTRICT NOT NULL,
  charge_id uuid REFERENCES charges(id) ON DELETE SET NULL UNIQUE,
  date date NOT NULL,
  reason text NOT NULL,
  severity varchar(20),
  status sanction_status DEFAULT 'pendiente',
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  location text,
  description text,
  is_mandatory boolean DEFAULT true,
  fine_amount numeric(10,2),
  status meeting_status DEFAULT 'programada',
  acta_url text,
  communications_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE meeting_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  invitation_status varchar(20) DEFAULT 'convocado',
  email_status communication_status DEFAULT 'pendiente',
  email_sent_at timestamptz,
  whatsapp_status communication_status DEFAULT 'pendiente',
  whatsapp_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, member_id)
);

CREATE TABLE meeting_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  status attendance_status DEFAULT 'ausente',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, member_id)
);
