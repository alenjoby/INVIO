
require('dotenv').config();
const { createClient } = require('@supabase/supabase-admin');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*')
    .limit(1);

  if (salesError) {
    console.error('Error fetching sales:', salesError);
  } else {
    console.log('Sales record sample:', sales[0]);
    console.log('Sales Columns:', Object.keys(sales[0] || {}));
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profileError) {
    console.error('Error fetching profiles:', profileError);
  } else {
    console.log('Profile record sample:', profiles[0]);
    console.log('Profile Columns:', Object.keys(profiles[0] || {}));
  }
}

checkSchema();
