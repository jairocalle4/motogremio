CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name plan_name NOT NULL,
  description text,
  max_members integer NOT NULL,
  max_vehicles integer NOT NULL,
  price_monthly numeric(10,2) NOT NULL,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  trade_name text,
  ruc varchar(13) UNIQUE NOT NULL,
  address text,
  phone text,
  email text,
  logo_url text,
  plan_id uuid REFERENCES plans(id),
  status text DEFAULT 'activa',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES plans(id) NOT NULL,
  status subscription_status DEFAULT 'activa',
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE company_settings (
  company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  alert_days_before_expiry integer DEFAULT 30,
  allow_member_login boolean DEFAULT false,
  currency varchar(3) DEFAULT 'USD',
  timezone varchar(50) DEFAULT 'America/Guayaquil',
  receipt_header_text text,
  receipt_footer_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
