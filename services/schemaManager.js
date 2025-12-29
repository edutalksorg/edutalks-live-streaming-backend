const fs = require('fs');
const path = require('path');

class SchemaManager {
    constructor(pool) {
        this.pool = pool;
        this.schemasDir = path.join(__dirname, '../models/schemas');
    }

    async sync() {
        console.log('🔄 Starting Database Schema Sync...');

        try {
            // 1. Create Database if strictly needed (usually handled by connection, but safe to ignore)

            // 2. Load all schema files
            const files = fs.readdirSync(this.schemasDir).filter(file => file.endsWith('.js'));

            // Define order if dependencies exist (roles -> users -> etc)
            // Ideally schemas should rely on FKs and IF NOT EXISTS handles creation order if we are careful,
            // but enabling foreign_key_checks=0 temporarily helps.

            await this.pool.query('SET FOREIGN_KEY_CHECKS = 0');

            for (const file of files) {
                // Clear require cache to ensure we use the latest schema
                const schemaPath = path.join(this.schemasDir, file);
                delete require.cache[require.resolve(schemaPath)];

                // console.log(`Processing schema file: ${file}`);
                const schema = require(schemaPath);
                if (!schema.tableName || !schema.createSql) {
                    console.error(`❌ Invalid schema exported in: ${file}. Expected { tableName, createSql, columns }`);
                    continue;
                }
                await this.syncTable(schema);
            }

            await this.pool.query('SET FOREIGN_KEY_CHECKS = 1');

            console.log('✅ Database Schema Sync Complete.');
        } catch (error) {
            console.error('❌ Database Schema Sync Failed:', error);
            throw error;
        }
    }

    async syncTable(schema) {
        const { tableName, createSql, columns } = schema;

        // 1. Create Table
        try {
            await this.pool.query(createSql);
            // console.log(`   - Verified table: ${tableName}`);
        } catch (err) {
            console.error(`   - Error creating table ${tableName}:`, err);
        }

        // 2. Check and Add Missing Columns
        try {
            const [rows] = await this.pool.query(`DESCRIBE ${tableName}`);
            const existingColumns = rows.map(r => r.Field);

            for (const col of columns) {
                if (!existingColumns.includes(col.name)) {
                    console.log(`   + Adding missing column: ${tableName}.${col.name}`);
                    try {
                        await this.pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.definition}`);
                    } catch (alterErr) {
                        // Ignore if there is a racing condition or other minor issue, but log it
                        if (alterErr.code !== 'ER_DUP_FIELDNAME') {
                            console.warn(`     ! Failed to add column ${col.name}:`, alterErr.message);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`   - Error syncing columns for ${tableName}:`, err);
        }
    }
}

module.exports = { SchemaManager };
