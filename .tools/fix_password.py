import bcrypt
import subprocess

password = b'Findora@123'
hashed = bcrypt.hashpw(password, bcrypt.gensalt(10)).decode()

sql = f"UPDATE findora_db.users SET password='{hashed}', is_verified=1, is_approved=1 WHERE username='Isaiyalan';"

sql_path = r'C:\Users\Isaiyalan\Desktop\Findora\Findora\.tools\reset.sql'
with open(sql_path, 'w') as f:
    f.write(sql)

print(f"Hash written: {hashed[:20]}...")
print(f"SQL file written to {sql_path}")
