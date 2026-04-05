const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');

// Args: node export-cookies.js <dbPath> <masterKeyB64>
const args = process.argv.filter(a => !a.includes('node') && !a.includes('export-cookies'));
const dbPath = args.find(a => a.includes('edge_cookies') || a.includes('Cookies')) || process.argv[2];
const masterKeyB64 = args.find(a => a.length > 30 && !a.includes('edge_cookies')) || process.argv[3];
console.log('DB:', dbPath, 'Key length:', masterKeyB64?.length);
const masterKey = Buffer.from(masterKeyB64, 'base64');

const db = new Database(dbPath, { readonly: true });
const rows = db.prepare("SELECT host_key, name, path, is_secure, expires_utc, encrypted_value FROM cookies WHERE host_key LIKE '%youtube%' OR host_key LIKE '%google.com%'").all();

let out = '# Netscape HTTP Cookie File\n';
let count = 0;
for (const r of rows) {
  try {
    const ev = Buffer.from(r.encrypted_value);
    if (!ev || ev.length < 15) continue;

    // Check for v10/v20 prefix (bytes: 0x76 0x31/32 0x30)
    const prefixStr = ev.slice(0, 3).toString('ascii');
    let value = '';

    if (prefixStr === 'v10' || prefixStr === 'v20') {
      const nonce = ev.slice(3, 15);
      const ciphertext = ev.slice(15, ev.length - 16);
      const tag = ev.slice(ev.length - 16);
      const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, nonce);
      decipher.setAuthTag(tag);
      value = decipher.update(ciphertext, null, 'utf8') + decipher.final('utf8');
    }

    if (!value) continue;
    const secure = r.is_secure ? 'TRUE' : 'FALSE';
    const expiry = Math.floor((r.expires_utc / 1000000) - 11644473600);
    out += r.host_key + '\tTRUE\t' + r.path + '\t' + secure + '\t' + expiry + '\t' + r.name + '\t' + value + '\n';
    count++;
  } catch(e) {
    // skip failed decryptions
  }
}
fs.writeFileSync('C:/Users/User/AppData/Local/Temp/yt_cookies.txt', out);
console.log('Exported ' + count + ' cookies');
db.close();
