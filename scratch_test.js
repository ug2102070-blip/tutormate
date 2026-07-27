const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from("events")
    .insert({
      tutor_id: '123e4567-e89b-12d3-a456-426614174000', // dummy UUID
      batch_id: null,
      title: 'Test Event',
      event_date: '2026-07-31',
      type: 'announcement'
    })
    .select()
    .single();

  console.log("Error:", error);
}

run();
