
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://plsyfhoquwmsmmskrerk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectProducts() {
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (!error && data && data.length > 0) {
        console.log(`TABLE: products`);
        console.log(`Keys:`, Object.keys(data[0]).join(', '));
        console.log(`Sample:`, data[0]);
    } else {
        console.log(`Products table empty or error: ${error?.message}`);
    }
}

inspectProducts();
