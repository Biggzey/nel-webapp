-- Update the user role to SUPER_ADMIN for both email and username
UPDATE "User"
SET role = 'SUPER_ADMIN'
WHERE email = 'kieranbiggs40@gmail.com'
   OR username = 'Biggzey'; 