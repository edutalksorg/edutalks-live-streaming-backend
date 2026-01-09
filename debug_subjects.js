```
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCurriculum() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'edutalks_db'
    });

    console.log("Connected to DB. Starting Curriculum Repair...");

    try {
        // 1. Check and Fix Column Length (if needed)
        // Check current schema for classes.name
        const [columns] = await connection.query("SHOW COLUMNS FROM classes LIKE 'name'");
        const type = columns[0].Type;
        console.log(`Current 'classes.name' type: ${ type } `);
        
        if (type.includes('varchar(20)') || type.includes('varchar(50)')) {
            console.log("Increasing column limits to VARCHAR(255)...");
            await connection.query("ALTER TABLE classes MODIFY name VARCHAR(255)");
            await connection.query("ALTER TABLE subjects MODIFY name VARCHAR(255)");
            await connection.query("ALTER TABLE users MODIFY grade VARCHAR(255)");
            console.log("Column limits increased.");
        }

        // 2. Fix Truncated Class Names
        // Map of potentially truncated names to correct names
        const corrections = {
            'Python Full Stack De': 'Python Full Stack Development',
            'Artificial Intellige': 'Artificial Intelligence and Machine Learning',
            'Java Full Stack Deve': 'Java Full Stack Development',
            'Cloud Computing and ': 'Cloud Computing and DevOps',
            'Cyber Security and N': 'Cyber Security and Networking',
            'Data Science and Ana': 'Data Science and Analytics'
        };

        const [classes] = await connection.query("SELECT * FROM classes");
        
        for (const cls of classes) {
            let currentName = cls.name;
            
            // Fix Name if it looks truncated or matches our list
            for (const [bad, good] of Object.entries(corrections)) {
                if (currentName === bad || currentName.startsWith(bad)) {
                    console.log(`Fixing class name: "${currentName}" -> "${good}"`);
                    await connection.query("UPDATE classes SET name = ? WHERE id = ?", [good, cls.id]);
                    currentName = good;
                }
            }

            // 3. Manage Subjects for this Class
            const [subjects] = await connection.query("SELECT * FROM subjects WHERE class_id = ?", [cls.id]);
            
            // A. Remove Duplicates
            if (subjects.length > 1) {
                console.log(`Class "${currentName}" has ${ subjects.length } subjects.Checking for duplicates...`);
                const uniqueNames = new Set();
                const toKeep = [];
                const toDelete = [];

                for (const sub of subjects) {
                    if (uniqueNames.has(sub.name)) {
                        toDelete.push(sub.id);
                    } else {
                        uniqueNames.add(sub.name);
                        toKeep.push(sub.id);
                    }
                }

                if (toDelete.length > 0) {
                    console.log(`Deleting ${ toDelete.length } duplicate subjects for "${currentName}"`);
                    await connection.query("DELETE FROM subjects WHERE id IN (?)", [toDelete]);
                }
            }

            // B. Create Missing Subject
            // For professional courses (not like '6th Class'), there should be at least one subject.
            // We assume if it's not a school class (doesn't start with digit), it needs a subject = class name.
            if (!/^\d/.test(currentName)) { 
                const [freshSubjects] = await connection.query("SELECT * FROM subjects WHERE class_id = ?", [cls.id]);
                if (freshSubjects.length === 0) {
                    console.log(`Class "${currentName}" has NO subjects.Creating one...`);
                    await connection.query("INSERT INTO subjects (name, class_id) VALUES (?, ?)", [currentName, cls.id]);
                    console.log(`Created subject "${currentName}" for Class ID ${ cls.id } `);
                }
            }
        }

        console.log("Curriculum repair complete!");

    } catch (err) {
        console.error("Error during repair:", err);
    } finally {
        await connection.end();
    }
}

fixCurriculum();
```
