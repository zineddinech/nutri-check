import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import os

load_dotenv()


EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = os.getenv("EMAIL_PORT")
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")


def send_reset_email(to_email: str, code: str):

    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email
    msg["Subject"] = "Réinitialisation de mot de passe"

    body = f"""
    Bonjour,

    Voici votre code pour réinitialiser votre mot de passe : 

    {code}

    Si vous n'avez pas demandé ce code, veuillez ignorer ce mail.
    """

    msg.attach(MIMEText(body, "plain"))

    server = smtplib.SMTP(EMAIL_HOST, int(EMAIL_PORT))
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
    server.send_message(msg)
    server.quit()
