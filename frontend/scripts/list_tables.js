
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://plsyfhoquwmsmmskrerk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function listTables() {
    // Note: accessing information_schema might be restricted to anon key.
    // If this fails, I'll have to rely on guessing or RPC if available.
    // But usually public schema is visible.

    // We can't query information_schema directly with supabase-js client easily without RPC.
    // But we can try just selecting from a known table I created? No.
    // I'll try to query `pg_catalog` or just common names I missed.

    const candidates = [
        'products', 'items', 'inventory', 'prices', 'components', 'parts',
        'cpu_pricing', 'motherboard_pricing', 'gpu_pricing',
        'processor', 'motherboard', 'graphic_card',
        'processors', 'motherboards', 'graphics_cards',
        'hardware', 'specs', 'catalog'
    ];

    console.log("Checking for existence of potential tables...");

    for (const t of candidates) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (!error) {
            console.log(`FOUND TABLE: ${t}`);
            if (data.length > 0) {
                console.log(`  Columns:`, Object.keys(data[0]));
            } else {
                console.log(`  (Empty)`);
            }
        }
    }
}

listTables();
