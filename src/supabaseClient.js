import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oppulcqhhgubrirzritp.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wcHVsY3FoaGd1YnJpcnpyaXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjQ3MzQsImV4cCI6MjA4NzAwMDczNH0.Irfpx7vAmM5EFzpmafFYEa9WkbELrwmmClBoIlbvX4M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
