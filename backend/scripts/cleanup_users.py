import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv(dotenv_path="backend/.env")

url = os.getenv("WARRANTY_SUPABASE_URL") or os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("WARRANTY_SUPABASE_KEY") or os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in backend/.env")
    exit(1)

supabase = create_client(url, key)

def cleanup_user(email):
    print(f"--- Cleaning up user: {email} ---")
    
    # 1. Find user in Supabase Auth
    try:
        user_list = supabase.auth.admin.list_users()
        target_user = None
        for u in user_list:
            if u.email == email:
                target_user = u
                break
        
        if not target_user:
            print(f"No user found with email {email} in Supabase Auth.")
        else:
            uid = target_user.id
            print(f"Found user in Auth: {uid}")
            
            # 2. Delete from user_mappings
            try:
                supabase.table("user_mappings").delete().eq("supabase_id", uid).execute()
                print(f"Deleted from user_mappings (by supabase_id)")
            except Exception as e:
                print(f"Error deleting from user_mappings: {e}")

            try:
                supabase.table("user_mappings").delete().eq("email", email).execute()
                print(f"Deleted from user_mappings (by email)")
            except Exception as e:
                print(f"Error deleting from user_mappings by email: {e}")

            # 3. Delete from Auth
            try:
                supabase.auth.admin.delete_user(uid)
                print(f"Deleted from Supabase Auth.")
            except Exception as e:
                print(f"Error deleting from Supabase Auth: {e}")

    except Exception as e:
        print(f"Error listing users: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == "--all":
            print("!!! WARNING: Purging ALL users (except IGNORE_LIST) from Supabase Auth and user_mappings !!!")
            ignore_list = ["test@gmail.com"]
            try:
                user_list = supabase.auth.admin.list_users()
                for u in user_list:
                    if u.email in ignore_list:
                        print(f"Skipping ignored user: {u.email}")
                        continue
                    cleanup_user(u.email)
                print("\nGlobal purge complete (Ignored: test@gmail.com).")
            except Exception as e:
                print(f"Error during global purge: {e}")
        else:
            for email in sys.argv[1:]:
                cleanup_user(email)
    else:
        # Check current mappings to help the user identify test accounts
        try:
            res = supabase.table("user_mappings").select("email, username").execute()
            print("\nCurrent User Mappings:")
            for row in res.data:
                print(f"- {row.get('email')} ({row.get('username')})")
        except:
            print("Could not list user_mappings.")
        print("\nUsage: python cleanup_users.py user1@email.com user2@email.com")
