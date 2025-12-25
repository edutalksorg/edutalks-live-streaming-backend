const bcrypt = require('bcryptjs');

class AdminSeeder {
    constructor(pool) {
        this.pool = pool;
    }

    async seed() {
        const email = process.env.SUPER_ADMIN_EMAIL;
        const password = process.env.SUPER_ADMIN_PASSWORD;

        if (!email || !password) {
            console.log('ℹ️ Super Admin credentials not found in .env. Skipping seed.');
            return;
        }

        try {
            // Check if super admin exists
            const [rows] = await this.pool.query('SELECT * FROM users WHERE email = ?', [email]);

            if (rows.length === 0) {
                console.log('🌱 Seeding Super Admin...');
                const hashedPassword = await bcrypt.hash(password, 10);

                // Assuming role_id 1 is super_admin. If using name, we need to fetch role id.
                // Let's safe fetch role id first.
                const [roles] = await this.pool.query("SELECT id FROM roles WHERE name = 'super_admin'");
                let roleId = 1;
                if (roles.length > 0) {
                    roleId = roles[0].id;
                } else {
                    // Create if not exists (fallback)
                    const [res] = await this.pool.query("INSERT INTO roles (name) VALUES ('super_admin')");
                    roleId = res.insertId;
                }

                await this.pool.query(
                    'INSERT INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, ?, ?)',
                    ['Super Admin', email, hashedPassword, roleId, true]
                );
                console.log('✅ Super Admin created.');
            } else {
                // console.log('✓ Super Admin already exists.');
            }
        } catch (error) {
            console.error('❌ Super Admin Seed Failed:', error);
        }
    }
}

module.exports = { AdminSeeder };
