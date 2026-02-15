#!/usr/bin/env python3
"""Test SendGrid configuration"""
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

# Set your API key (replace with your actual key)
api_key = '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'

# IMPORTANT: Replace with the email address you verified in SendGrid
sender_email = input("Enter your verified sender email (e.g., your-email@gmail.com): ").strip()
recipient_email = input("Enter recipient email for test: ").strip()

print(f"\nSending test email from {sender_email} to {recipient_email}...")

try:
    message = Mail(
        from_email=Email(sender_email),
        to_emails=To(recipient_email),
        subject='Test Email from Vynorob',
        html_content=Content("text/html", '<h1>Success!</h1><p>SendGrid is working!</p>')
    )
    
    sg = SendGridAPIClient(api_key)
    response = sg.send(message)
    
    print(f"✅ Success! Status code: {response.status_code}")
    print(f"Email sent from {sender_email} to {recipient_email}")
    print("\nCheck your inbox!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nMake sure you:")
    print("1. Verified your sender email in SendGrid (Settings > Sender Authentication)")
    print("2. Used the correct verified email address")
