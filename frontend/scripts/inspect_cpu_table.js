
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://plsyfhoquwmsmmskrerk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspect() {
    console.log("Listing tables (guessing common names)...");
    const tables = ['cpu', 'cpu_pricing', 'cpu_prices', 'products', 'components', 'parts', 'pricing'];

    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) {
            // console.log(`Table ${t} error:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`\nTable '${t}' exists. Keys:`, Object.keys(data[0]));
        } else {
            console.log(`\nTable '${t}' exists but empty.`);
        }
    }
}

inspect();
