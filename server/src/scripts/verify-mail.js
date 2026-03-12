const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const result = dotenv.config();

if (result.error) {
    console.error("❌ Error loading .env file");
    process.exit(1);
}

async function verifyConnection() {
    console.log("-----------------------------------------");
    console.log("SmartNav Email Diagnostic Tool");
    console.log("-----------------------------------------");
    console.log("Checking credentials for:", process.env.EMAIL_USER);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    console.log("Attempting to connect to Gmail servers...");

    try {
        await transporter.verify();
        console.log("✅ CONNECTION SUCCESS: Your credentials are valid!");

        console.log("Testing delivery to lohith.ec23@bitsathy.ac.in...");
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'lohith.ec23@bitsathy.ac.in',
            subject: 'Email System Verification',
            text: 'If you see this, your email system is 100% working.'
        });
        console.log("🚀 DELIVERY SUCCESS: Mail sent! Check your inbox.");
    } catch (error) {
        console.error("❌ CONNECTION FAILED");
        console.log("\nError Details:");
        console.log("Code:", error.code);
        console.log("Message:", error.message);

        if (error.message.includes('Invalid login') || error.message.includes('EAUTH')) {
            console.log("\n🛑 THE PROBLEM:");
            console.log("Google is blocking your login attempt. Your regular password will NOT work.");
            console.log("\n✅ THE SOLUTION:");
            console.log("1. Go to: https://myaccount.google.com/apppasswords");
            console.log("2. Create a new App Password (name it 'SmartNav')");
            console.log("3. Copy the 16-character code Google gives you.");
            console.log("4. Paste that code into your .env file as EMAIL_PASS.");
            console.log("5. Restart your server.");
        }
    }
}

verifyConnection();
