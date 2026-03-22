import random
import requests
from django.conf import settings


def send_otp_via_telegram(chat_id: str, otp: str) -> bool:
    """
    Sends a password reset OTP to the user's Telegram account via the bot.
    Returns True if the message was delivered, False otherwise.
    """
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token:
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    message = (
        f"🔐 *Stock Portfolio — Password Reset*\n\n"
        f"Your OTP code is: *{otp}*\n\n"
        f"⏱ This code expires in *10 minutes*.\n"
        f"If you did not request this, please ignore this message."
    )
    try:
        response = requests.post(url, json={
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown",
        }, timeout=10)
        return response.status_code == 200
    except requests.RequestException:
        return False


def generate_otp() -> str:
    """Generates a random 6-digit OTP string."""
    return str(random.randint(100000, 999999))
