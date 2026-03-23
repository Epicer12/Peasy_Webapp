import os
import httpx
from dotenv import load_dotenv

# Load environment variables
# Try default first, then try specified paths
if not load_dotenv():
    # If we are in backend/app/services/email_service.py, the .env is up two levels
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    load_dotenv(dotenv_path=env_path)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
if not RESEND_API_KEY:
    # Try one more level up just in case (if run from root)
    env_path_root = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'backend', '.env')
    load_dotenv(dotenv_path=env_path_root)
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")

FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")

async def send_otp_email(to_email: str, otp: str):
    """
    Sends a 6-digit OTP code to the user's email using Resend API.
    """
    if not RESEND_API_KEY:
        print("ERROR: RESEND_API_KEY not found in environment.")
        return False

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    html_content = f"""
    <div style="font-family: 'Courier New', Courier, monospace; background-color: #050505; color: #eeeeee; padding: 40px; border: 2px solid #333; max-width: 500px; margin: auto;">
        <h1 style="color: #00f3ff; border-bottom: 2px solid #333; padding-bottom: 10px; text-transform: uppercase;">Peasy_Verification</h1>
        <p style="font-size: 14px; color: #666;">// SECURE_ACCESS_REQUESTED</p>
        <p style="margin-top: 20px;">Use the following 6-digit code to finalize your registration:</p>
        <div style="background-color: #111; border: 1px solid #00f3ff; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 12px; color: #ccff00;">{otp}</span>
        </div>
        <p style="font-size: 10px; color: #444; border-top: 1px solid #222; pt-10px; margin-top: 30px;">
            This code expires in 5 minutes. If you did not request this, please ignore this email.<br>
            PEASY_SYSTEM v2.5.0 // END_TO_END_ENCRYPTION
        </p>
    </div>
    """

    payload = {
        "from": f"Peasy <{FROM_EMAIL}>",
        "to": [to_email],
        "subject": f"Peasy Verification Code: {otp}",
        "html": html_content
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200 or response.status_code == 201:
                print(f"INFO: OTP email sent to {to_email}")
                return True
            else:
                print(f"ERROR: Resend API failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"ERROR: Exception sending email: {e}")
            return False
