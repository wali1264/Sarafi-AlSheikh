import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = 'https://ntrmsxksjwgspcxyfrlj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cm1zeGtzandnc3BjeHlmcmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjQzNjQsImV4cCI6MjA3NjgwMDM2NH0.w0TZ4HNRqPPD69l8mPz3a5XTGbmlbnubGgWtnkIXMXA';

// The 'Database' generic is used for type safety with generated Supabase types.
// A placeholder is created in types.ts for now.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);