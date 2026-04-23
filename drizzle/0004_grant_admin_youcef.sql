-- Grant admin role to the specified account (no-op if email does not exist).
UPDATE "user"
SET role = 'admin'
WHERE lower(email) = lower('youcefyouyou201588@gmail.com');
