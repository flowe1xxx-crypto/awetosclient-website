import os
from supabase import create_client, Client

SUPABASE_URL = "https://kvtxxxmzgblaliwlkxhz.supabase.co"
SUPABASE_KEY = "sb_publishable_g8UPMvSYclO0DmW0rN1Q4g_VtAxBfuh"

try:
    print(f"Connecting to: {SUPABASE_URL}")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Testing 'users' table access...")
    res = supabase.table('users').select('*').limit(1).execute()
    print("Success! Data:", res.data)
except Exception as e:
    print("Connection failed!")
    print(e)

