
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://plsyfhoquwmsmmskrerk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectCables() {
    console.log("Inspecting 'cable_connector_prices'...");
    const { data: conn, error: err1 } = await supabase.from('cable_connector_prices').select('component_name').limit(10);
    if (conn) conn.forEach(p => console.log(`[Connector] ${p.component_name}`));

    console.log("\nInspecting 'cable_converter_prices'...");
    const { data: conv, error: err2 } = await supabase.from('cable_converter_prices').select('component_name').limit(10);
    if (conv) conv.forEach(p => console.log(`[Converter] ${p.component_name}`));
}

inspectCables();
