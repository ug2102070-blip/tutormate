-- ==============================================================================
-- PHASE 3 SCHEMA UPDATES — Advanced Features & Owner Portal Tables
-- ==============================================================================

-- 1. SUBSCRIPTION PLANS & AUDIT HISTORY TABLE
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free_trial', 'starter', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trial', 'past_due')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount_paid NUMERIC(10,2) DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  payment_method TEXT,
  payment_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_plans_tutor ON subscription_plans(tutor_id);
CREATE INDEX IF NOT EXISTS idx_sub_plans_status ON subscription_plans(status, valid_until);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can view own subscription plans" ON subscription_plans;
CREATE POLICY "Tutors can view own subscription plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (
    tutor_id IN (
      SELECT id FROM tutors WHERE id = auth.uid() OR user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access on subscription_plans" ON subscription_plans;
CREATE POLICY "Service role full access on subscription_plans"
  ON subscription_plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 2. COACHING STAFF TABLE
CREATE TABLE IF NOT EXISTS coaching_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES coaching_centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Accountant' CHECK (role IN ('Accountant', 'Receptionist', 'Manager', 'Other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_staff_center ON coaching_staff(center_id);

ALTER TABLE coaching_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own center staff" ON coaching_staff;
CREATE POLICY "Owners can view own center staff"
  ON coaching_staff
  FOR SELECT
  TO authenticated
  USING (
    center_id IN (
      SELECT id FROM coaching_centers WHERE owner_uid = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can manage own center staff" ON coaching_staff;
CREATE POLICY "Owners can manage own center staff"
  ON coaching_staff
  FOR ALL
  TO authenticated
  USING (
    center_id IN (
      SELECT id FROM coaching_centers WHERE owner_uid = auth.uid()
    )
  )
  WITH CHECK (
    center_id IN (
      SELECT id FROM coaching_centers WHERE owner_uid = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access on coaching_staff" ON coaching_staff;
CREATE POLICY "Service role full access on coaching_staff"
  ON coaching_staff
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 3. COACHING EXPENSES & PAYROLL TABLE
CREATE TABLE IF NOT EXISTS coaching_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES coaching_centers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Rent', 'Utilities', 'Payroll', 'Marketing', 'Maintenance', 'Other')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_to TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_expenses_center ON coaching_expenses(center_id);
CREATE INDEX IF NOT EXISTS idx_coaching_expenses_date ON coaching_expenses(date);

ALTER TABLE coaching_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own center expenses" ON coaching_expenses;
CREATE POLICY "Owners can view own center expenses"
  ON coaching_expenses
  FOR SELECT
  TO authenticated
  USING (
    center_id IN (
      SELECT id FROM coaching_centers WHERE owner_uid = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can manage own center expenses" ON coaching_expenses;
CREATE POLICY "Owners can manage own center expenses"
  ON coaching_expenses
  FOR ALL
  TO authenticated
  USING (
    center_id IN (
      SELECT id FROM coaching_centers WHERE owner_uid = auth.uid()
    )
  )
  WITH CHECK (
    center_id IN (
      SELECT id FROM coaching_centers WHERE owner_uid = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access on coaching_expenses" ON coaching_expenses;
CREATE POLICY "Service role full access on coaching_expenses"
  ON coaching_expenses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

