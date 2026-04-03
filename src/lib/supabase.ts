import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://ekxozheyyeovqunzwdar.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVreG96aGV5eWVvdnF1bnp3ZGFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDU4NTcsImV4cCI6MjA5MDcyMTg1N30.MKEdZ2jS0hhW4Cyg4cuzDSDDEoxd9ESi3rojLpVRJes';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
