// test-db.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ublyithvarvtqbwmxtyh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVibHlpdGh2YXJ2dHFid214dHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTIwMzYsImV4cCI6MjA4NjU2ODAzNn0.vTOdUsHUa32L3QdK4nVaumLqTXbjalOvcd7Mr9Dz5yU'

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function test() {
    console.log('Testing select emitido_em from ctes...');
    const { data, error } = await supabase.from('ctes').select('id, emitido_em').limit(1);
    console.log('Error:', error);
    console.log('Data:', data);
}
test();
