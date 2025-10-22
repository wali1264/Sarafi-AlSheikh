import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = 'https://pafxekxmhqorvhfeydap.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhZnhla3htaHFvcnZoZmV5ZGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDE0NjAsImV4cCI6MjA3NjcxNzQ2MH0.mV5_TbbmMsh-Tu5YiMTKZVMRcZaJMxbojOc1Kk1kCQQ';

// The 'Database' generic is used for type safety with generated Supabase types.
// A placeholder is created in types.ts for now.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
