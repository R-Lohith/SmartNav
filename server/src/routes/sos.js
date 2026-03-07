const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');
const router = express.Router();

// ─── Helper: Email Transporter ──────────────────────────────────────────────
function createTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS   // Must be a Gmail App Password (16 chars)
        }
    });
}

// ─── Helper: Build HTML email body ──────────────────────────────────────────
function buildEmailHTML(name, alertType, locationLink) {
    return `
        <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;border:2px solid #dc2626;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.1);">
            <div style="background-color:#dc2626;padding:25px;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;text-transform:uppercase;letter-spacing:2px;">🚨 Emergency Alert</h1>
            </div>
            <div style="padding:30px;background-color:#ffffff;">
                <p style="font-size:16px;color:#374151;line-height:1.6;">A high-priority emergency signal has been triggered:</p>
                <div style="background-color:#fef2f2;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #fee2e2;">
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:8px 0;color:#991b1b;font-weight:bold;width:40%;">User Name:</td>
                            <td style="padding:8px 0;color:#111827;">${name || 'Unknown'}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#991b1b;font-weight:bold;">Alert Status:</td>
                            <td style="padding:8px 0;color:#dc2626;font-weight:bold;text-transform:uppercase;">${alertType}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#991b1b;font-weight:bold;">Timestamp:</td>
                            <td style="padding:8px 0;color:#111827;">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>
                </div>
                <div style="text-align:center;margin:35px 0;">
                    <p style="font-weight:bold;color:#111827;margin-bottom:15px;">LIVE TRACKING COORDINATES:</p>
                    <a href="${locationLink}" style="background-color:#dc2626;color:white;padding:15px 30px;text-decoration:none;border-radius:30px;font-weight:800;display:inline-block;box-shadow:0 4px 12px rgba(220,38,38,0.3);">
                        VIEW LIVE LOCATION ON MAPS
                    </a>
                    <p style="margin-top:10px;font-size:12px;color:#6b7280;">Link: ${locationLink}</p>
                </div>
                <p style="color:#4b5563;font-size:14px;text-align:center;font-style:italic;border-top:1px solid #e5e7eb;padding-top:20px;">
                    This is an automated emergency alert from SmartNav Safety System. Please take immediate action.
                </p>
            </div>
            <div style="background-color:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af;">
                SmartNav Secure Systems &copy; 2026 | Safe Travels Protocol
            </div>
        </div>
    `;
}

// ─── SOS Activate Route ──────────────────────────────────────────────────────
router.post('/activate', async (req, res) => {
    const { userId, name, email, phone, status, locationLink, fromLoc, toLoc } = req.body;

    const isMissed = status === 'PERSON_MISSED';
    const alertType = isMissed ? 'PERSON MISSED' : 'SOS ACTIVATED';
    const subject = `🚨 [EMERGENCY ALERT] ${alertType}: ${name || 'User'}`;

    const adminEmail = process.env.ADMIN_EMAIL || 'lohith.ec23@bitsathy.ac.in';
    const results = { email: null, sms: null, n8n: null };
    const errors = [];

    // ─── 1. Trigger n8n Webhook ──────────────────────────────────────────────
    try {
        await axios.post("https://manojkumarcs.app.n8n.cloud/webhook-test/travel-alert", {
            relative_number: phone || '+918124745559',
            person_name: name || 'Unknown',
            from_loc: fromLoc || 'Unknown Origin',
            to_loc: toLoc || 'Unknown Destination',
            connection_point: locationLink,
            time: new Date().toLocaleString()
        });
        results.n8n = "Triggered successfully";
        console.log(`✅ Triggered n8n webhook for ${name}`);
    } catch (e) {
        console.error("Failed to trigger n8n webhook:", e);
        errors.push(`n8n webhook error: ${e.message}`);
    }

    // ─── 2. Send SMS via Twilio ──────────────────────────────────────────────
    const sendSMS = async () => {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_PHONE;

        if (!sid || sid === 'your_twilio_account_sid' || !token || token === 'your_twilio_auth_token') {
            const msg = 'SMS skipped: Twilio credentials not configured.';
            console.warn('⚠️', msg);
            errors.push(msg);
            return;
        }

        // Determine who to SMS — user's own phone or emergency contact
        const toPhone = phone; // passed from client
        if (!toPhone) {
            errors.push('SMS skipped: No phone number provided.');
            return;
        }

        const twilio = require('twilio')(sid, token);
        const smsBody = `${name || 'Unknown'} is MISSING.\n\nTravel Details:\nStarted from: ${fromLoc || 'Unknown Origin'}\nGoing to: ${toLoc || 'Unknown Destination'}\nLast seen at: ${locationLink}\nLast seen on: ${new Date().toLocaleString()}\n\nMessage:\nWe are looking for this person. If you have seen them or know where they are, please let us know right away. Your help is very important to us!`;

        await twilio.messages.create({
            body: smsBody,
            from,
            to: toPhone   // e.g. +91XXXXXXXXXX
        });

        results.sms = `SMS sent to ${toPhone}`;
        console.log(`✅ SOS SMS sent to ${toPhone}`);
    };

    // ─── Fire SMS ────────────────────────────────────────────
    console.log(`🚨 SOS Alert sequence initiated for userId: ${userId}`);
    const smsResult = await sendSMS().catch(err => {
        console.error('❌ SOS SMS failed:', err);
        errors.push(`SMS error: ${err.message}`);
    });



    res.status(200).json({
        success: true,
        message: 'SOS signal received and notifications dispatched.',
        results,
        warnings: errors.length ? errors : undefined
    });
});

// ─── OTP Routes for Phone Verification ──────────────────────────────────────
// In-memory OTP store (keyed by phone number)
const otpStore = new Map(); // phone -> { otp, expiresAt }

// Send OTP to phone
router.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE;

    // Check Twilio configured
    if (!sid || sid === 'your_twilio_account_sid') {
        // Fallback: generate OTP and send via email if available
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
        console.log(`📱 [DEV MODE] OTP for ${phone}: ${otp}`);
        return res.status(200).json({ success: true, message: 'OTP generated (Twilio not configured — check server logs for OTP in dev mode).' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    try {
        const twilio = require('twilio')(sid, token);
        await twilio.messages.create({
            body: `Your SmartNav verification OTP is: ${otp}. Valid for 5 minutes.`,
            from,
            to: phone
        });
        console.log(`✅ OTP sent to ${phone}`);
        res.status(200).json({ success: true, message: 'OTP sent successfully.' });
    } catch (err) {
        console.error('OTP send failed:', err.message);
        res.status(500).json({ success: false, message: `Failed to send OTP: ${err.message}` });
    }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required.' });

    const record = otpStore.get(phone);
    if (!record) return res.status(400).json({ valid: false, message: 'No OTP found for this number. Please request a new OTP.' });
    if (Date.now() > record.expiresAt) {
        otpStore.delete(phone);
        return res.status(400).json({ valid: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== otp.toString()) {
        return res.status(400).json({ valid: false, message: 'Invalid OTP. Please try again.' });
    }

    otpStore.delete(phone); // one-time use
    console.log(`✅ OTP verified for ${phone}`);
    res.status(200).json({ valid: true, message: 'Phone number verified successfully.' });
});

module.exports = router;
