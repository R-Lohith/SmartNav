const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
    const pool = mysql.createPool({
        host: "localhost",
        user: "root",
        password: "lohiravi@1234",
        database: "sih",
    });

    // 1. Check current table structure
    const [cols] = await pool.query("DESCRIBE users");
    console.log("=== CURRENT users TABLE COLUMNS ===");
    cols.forEach((c) => console.log(`  ${c.Field} (${c.Type})`));

    const hasRole = cols.some((c) => c.Field === "role");

    if (!hasRole) {
        console.log("\n❌ 'role' column MISSING! Adding it now...");
        await pool.query(
            "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"
        );
        console.log("✅ 'role' column added with default value 'user'");
    } else {
        console.log("\n✅ 'role' column already exists.");
    }

    // 2. Show all users
    const [rows] = await pool.query("SELECT userId, name, email, mobile, role FROM users");
    console.log("\n=== ALL USERS ===");
    rows.forEach((u) => {
        console.log(`  Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
    });

    // 3. Check for police accounts
    const [police] = await pool.query("SELECT * FROM users WHERE role = 'police'");
    if (police.length === 0) {
        console.log("\n⚠️  No police accounts found. Use the SQL below to promote a user:");
        console.log("  UPDATE users SET role = 'police' WHERE email = 'your-email@here.com';");
    } else {
        console.log("\n✅ Police accounts found:");
        police.forEach((u) => console.log(`  Email: ${u.email}`));
    }

    await pool.end();
}

main().catch(console.error);
