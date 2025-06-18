import { createClient } from '@supabase/supabase-js';

// Fallback configuration for development/demo purposes
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bvxsdjbpuujegeikuipi.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2eHNkamJwdXVqZWdlaWt1aXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NTE0MDksImV4cCI6MjA2MzEyNzQwOX0.U_1GP7rHL7uGSeLAeEH6tv-8BjZOqMxXIG_DhgtVis0';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration is incomplete. Some features may not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);