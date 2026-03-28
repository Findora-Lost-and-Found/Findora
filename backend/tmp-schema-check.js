const fs = require('fs');
const mysql = require('mysql2/promise');
const txt = fs.readFileSync('.env', 'utf8');
const env = {};
for (const l of txt.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'findora_db',
    port: Number(env.DB_PORT || 3306)
  });
  const [rows] = await conn.query('SHOW COLUMNS FROM security_transactions');
  for (const r of rows) console.log(`${r.Field} ${r.Type}`);
  await conn.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
