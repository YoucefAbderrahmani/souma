-- Grant admin to both Youcef accounts: first name "Youcef" (case-insensitive) on the `user` table,
-- plus the legacy Gmail from 0004 if that row ever used a different `name`.
-- Idempotent. If one account uses another first name, add OR lower(email) = lower('...') and re-run.
UPDATE "user"
SET role = 'admin'
WHERE lower(trim(name)) = 'youcef'
   OR lower(email) = lower('youcefyouyou201588@gmail.com');
