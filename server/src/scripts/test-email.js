const nodemailer = require('nodemailer');
require('dotenv').config();

async function testMail() {
    console.log("Testing with User:", process.env.EMAIL_USER);
    console.log("Testing with Pass:", process.env.EMAIL_PASS ? "****" : "MISSING");

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'lohith.ec23@bitsathy.ac.in',
        subject: 'SmartNav Test Mail',
        text: 'This is a test email to verify configuration.'
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully!');
        console.log('Response:', info.response);
    } catch (error) {
        console.error('❌ Email failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.message.includes('Invalid login')) {
            console.log('\n💡 SUGGESTION: This error usually means you need an "App Password".');
            console.log('Go to: https://myaccount.google.com/apppasswords');
        }
    }
}

testMail();
