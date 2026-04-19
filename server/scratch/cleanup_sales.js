import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config(); // Loads .env from current directory

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  console.log('🚀 Starting Finance Dashboard Cleanup...');
  
  if (!process.env.SUPABASE_URL) {
    console.error('❌ ERROR: SUPABASE_URL is missing in .env');
    return;
  }

  const { error: salesError } = await supabase
    .from('sales')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (salesError) {
    console.error('❌ Error clearing sales:', salesError.message);
  } else {
    console.log('✅ Sales table cleared successfully.');
  }

  console.log('✨ Cleanup Complete. Your dashboard is now fresh!');
}

cleanup();
