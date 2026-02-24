
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://plsyfhoquwmsmmskrerk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectPrices() {
    const tables = [
        'processors_prices',
        'motherboards_prices',
        'memory_prices',
        'graphic_cards_prices',
        'storage_prices',
        'power_supply_units_prices',
        'case_prices',
        'cooling_prices',
        'os_software_prices',
        'monitors_prices',
        'peripherals_prices'
    ];

    console.log("Inspecting 'prices' tables...");

    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) {
            console.log(`\nError reading ${t}: ${error.message}`);
        } else if (data && data.length > 0) {
            console.log(`\nTABLE: ${t}`);
            console.log(`Keys:`, Object.keys(data[0]).join(', '));
            console.log(`Sample:`, JSON.stringify(data[0]).substring(0, 150) + "...");
        } else {
            console.log(`\nTable '${t}' is empty.`);
        }
    }
}

inspectPrices();
