
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://plsyfhoquwmsmmskrerk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const parseSpecs = (name, type) => {
    const specs = {};
    const n = name.toUpperCase();

    if (type === 'mobo' || type === 'motherboard') {
        const nUpper = n; // Already upper

        // Socket Inference via Chipset
        if (nUpper.match(/X670|B650|A620/)) specs.socket = "AM5";
        else if (nUpper.match(/X570|B550|A520|X470|B450/)) specs.socket = "AM4";
        else if (nUpper.match(/Z790|B760|H770|Z690|B660|H610/)) specs.socket = "LGA1700";
        else if (nUpper.match(/Z590|B560|H510|Z490|H410/)) specs.socket = "LGA1200";

        if (nUpper.includes('LGA1700')) specs.socket = "LGA1700";
        if (nUpper.includes('AM5')) specs.socket = "AM5";

        // RAM
        if (nUpper.includes('DDR5')) specs.ram_type = "DDR5";
        else if (nUpper.includes('DDR4')) specs.ram_type = "DDR4";
        else {
            if (specs.socket === "AM5") specs.ram_type = "DDR5";
        }
    }
    return specs;
};

async function checkMobos() {
    const { data, error } = await supabase.from('motherboards_prices').select('component_name').limit(20);
    if (error) console.log(error);

    console.log("Checking Motherboard Spec Parsing:");
    data.forEach(item => {
        const specs = parseSpecs(item.component_name, 'motherboard');
        console.log(`"${item.component_name}" -> Socket: ${specs.socket}, RAM: ${specs.ram_type}`);
    });
}

checkMobos();
