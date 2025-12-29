// Clear Node.js require cache for schema files
// This forces Node to reload the updated schema files
const path = require('path');

const schemasDir = path.join(__dirname, '../models/schemas');

// Clear cache for all schema files
Object.keys(require.cache).forEach(key => {
    if (key.includes('models\\schemas') || key.includes('models/schemas')) {
        console.log(`Clearing cache for: ${key}`);
        delete require.cache[key];
    }
});

console.log('✅ Schema cache cleared!');
console.log('Please restart the server now.');
