// test-db.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    console.log('Testing select from ctes...');
    const { data, error } = await supabase.from('ctes').select('*').limit(1);
    if (error) {
        console.error('Error selecting from ctes:', error);
    } else {
        console.log('Success! Data:', data);
    }
}

test();
