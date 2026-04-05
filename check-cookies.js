const Database = require('better-sqlite3');
console.log('DB path:', process.argv[2]);
const db = new Database(process.argv[2], { readonly: true, fileMustExist: true });
const rows = db.prepare("SELECT host_key, name, length(encrypted_value) as len, hex(substr(encrypted_value,1,4)) as prefix FROM cookies WHERE host_key LIKE '%youtube%' OR host_key LIKE '%google.com%' LIMIT 10").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
