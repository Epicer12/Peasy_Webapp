
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://plsyfhoquwmsmmskrerk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectPeripherals() {
    const tables = ['peripherals_prices', 'uncategorized_prices', 'accessories_prices', 'other_prices', 'products'];

    for (const t of tables) {
        console.log(`\nSearching table '${t}' for Keyboards/Mice...`);
        // Try to fetch items with "keyboard" or "mouse" in name
        const { data, error } = await supabase
            .from(t)
            .select('component_name')
            .or('component_name.ilike.%keyboard%,component_name.ilike.%mouse%,component_name.ilike.%key board%')
            .limit(5);

        if (data && data.length > 0) {
            console.log(`FOUND in ${t}:`);
            data.forEach(p => console.log(`- ${p.component_name}`));
        } else {
            // console.log(`No match in ${t} (or error: ${error?.message})`);
        }
    }
}

inspectPeripherals();
