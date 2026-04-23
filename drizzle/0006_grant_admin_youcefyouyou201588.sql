-- Idempotent: ensure youcefyouyou201588@gmail.com has admin (see also 0004, 0005).
UPDATE "user"
SET role = 'admin'
WHERE lower(email) = lower('youcefyouyou201588@gmail.com');
