-- Adaugă coloane pentru card de reducere pe user (admin poate acorda/anula)
ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_card_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_card_value INTEGER DEFAULT 10 CHECK (discount_card_value IN (5, 10));
ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_card_expires_at TIMESTAMP NULL;
COMMENT ON COLUMN users.discount_card_enabled IS 'Card reducere activ (acordat de admin)';
COMMENT ON COLUMN users.discount_card_value IS 'Procent reducere: 5 sau 10';
COMMENT ON COLUMN users.discount_card_expires_at IS 'Data expirare card (NULL = fără expirare)';
