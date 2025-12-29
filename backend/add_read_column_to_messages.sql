-- Script pentru adăugarea câmpului read în tabelul messages
-- Rulează acest script în MySQL dacă câmpul read nu există

USE volta_db;

-- Verifică dacă câmpul read există deja (pentru MySQL < 8.0.19, IF NOT EXISTS nu este suportat)
SET @dbname = DATABASE();
SET @tablename = "messages";
SET @columnname = "read";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column already exists' AS result;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN `", @columnname, "` BOOLEAN DEFAULT FALSE COMMENT 'TRUE dacă mesajul a fost citit de admin';")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Creează index pentru read dacă nu există (pentru MySQL < 8.0.19)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = 'idx_read')
  ) > 0,
  "SELECT 'Index already exists' AS result;",
  CONCAT("CREATE INDEX idx_read ON ", @tablename, "(`read`);")
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Verifică structura tabelei
DESCRIBE messages;

