
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'sales' });
  
  // If RPC is missing, try a direct query to information_schema if permissions allow
  // Or just try inserting a dummy record with 'customer_name' and see if it fails.
  
  console.log('Checking columns for "sales" table...');
  
  const { data: sales, error: salesErr } = await supabase
    .from('sales')
    .select('*')
    .limit(1);
    
  if (salesErr) {
    console.error('Error:', salesErr);
  } else {
    // We can't see columns if data is empty. 
    // Let's try to fetch from information_schema via query
    const { data: cols, error: colErr } = await supabase
      .from('sales')
      .select()
      .limit(0); 
    
    // Actually, in JS client, select() on empty table still gives you an empty array.
    // Let's try a native SQL approach if the RPC exists or just inspect code.
  }
}

// Alternative: just try to insert and see.
async function tryInsert() {
    const { error } = await supabase.from('sales').insert({
        customer_name: 'Test Name'
    });
    if (error && error.message.includes('column "customer_name" of relation "sales" does not exist')) {
        console.log('Column "customer_name" does not exist.');
    } else if (error) {
        console.log('Other error (might exist but missing other fields):', error.message);
    } else {
        console.log('Column "customer_name" exists!');
    }
}

tryInsert();
