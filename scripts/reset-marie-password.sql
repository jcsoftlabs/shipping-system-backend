-- Reset password for marie.joseph@example.com to 'password123'
-- Hash generated with bcrypt rounds=12

UPDATE users 
SET password_hash = '$2b$12$RSx6D7JZm6phO..NnPWJ.O6G5PoEOSMZYZVaB9kzg3ja5xHrYV/JW'
WHERE email = 'marie.joseph@example.com';

-- Verify the update
SELECT id, email, first_name, last_name, role 
FROM users 
WHERE email = 'marie.joseph@example.com';
