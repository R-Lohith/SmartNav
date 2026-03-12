const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function main() {
    const pool = mysql.createPool({
        host: "localhost",
        user: "root",
        password: "lohiravi@1234",
        database: "sih",
    });

    // Ensure role column exists
    const [cols] = await pool.query("DESCRIBE users");
    const hasRole = cols.some((c) => c.Field === "role");
    if (!hasRole) {
        await pool.query(
            "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"
        );
        console.log("✅ Added 'role' column to users table.");
    }

    // Check if police account already exists
    const policeEmail = "police@sih.com";
    const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [policeEmail]);

    if (existing.length > 0) {
        // Just update role to police
        await pool.query("UPDATE users SET role = 'police' WHERE email = ?", [policeEmail]);
        console.log(`✅ Updated existing account to police role: ${policeEmail}`);
    } else {
        // Create a new police account
        const hashedPassword = await bcrypt.hash("police123", 10);
        const userId = "POL" + Date.now();

        await pool.query(
            `INSERT INTO users (userId, name, dob, bloodGroup, mobile, email, password, address, emergency_contact, gender, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, "Police Officer", "1990-01-01", "O+", "9000000001", policeEmail, hashedPassword, "Police Station", "9000000000", "Male", "police"]
        );
        console.log("✅ Created police account!");
    }

    console.log("\n========================================");
    console.log("   🚔 POLICE DASHBOARD LOGIN DETAILS");
    console.log("========================================");
    console.log("  URL      : http://localhost:5173/login");
    console.log("  Email    : police@sih.com");
    console.log("  Password : police123");
    console.log("========================================\n");

    // Show all users and their roles
    const [rows] = await pool.query("SELECT name, email, role FROM users");
    console.log("=== ALL USERS IN DB ===");
    rows.forEach((u) => console.log(`  ${u.name} | ${u.email} | role: ${u.role}`));

    await pool.end();
}

main().catch(console.error);
