USE nexora;

-- Egyszer futtasd a régi NEXORA adatbázison, a friss schema.sql importálása ELŐTT.
-- A meglévő rendelésekhez, licencekhez és profilokhoz nem nyúl.

DROP PROCEDURE IF EXISTS nexora_add_column_if_missing;
DELIMITER //
CREATE PROCEDURE nexora_add_column_if_missing(
    IN table_name_arg VARCHAR(64),
    IN column_name_arg VARCHAR(64),
    IN definition_arg VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = table_name_arg
          AND COLUMN_NAME = column_name_arg
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', REPLACE(table_name_arg,'`','``'),
            '` ADD COLUMN `', REPLACE(column_name_arg,'`','``'),
            '` ', definition_arg
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//
DELIMITER ;

CALL nexora_add_column_if_missing('products','sku','VARCHAR(40) NULL');
CALL nexora_add_column_if_missing('products','manufacturer','VARCHAR(120) NULL');
CALL nexora_add_column_if_missing('products','model','VARCHAR(120) NULL');
CALL nexora_add_column_if_missing('products','processor','VARCHAR(180) NULL');
CALL nexora_add_column_if_missing('products','memory','VARCHAR(120) NULL');
CALL nexora_add_column_if_missing('products','storage','VARCHAR(180) NULL');
CALL nexora_add_column_if_missing('products','graphics','VARCHAR(180) NULL');
CALL nexora_add_column_if_missing('products','display','VARCHAR(120) NULL');
CALL nexora_add_column_if_missing('products','operating_system','VARCHAR(120) NULL');
CALL nexora_add_column_if_missing('products','warranty_months','INT DEFAULT 24');
CALL nexora_add_column_if_missing('products','form_factor','VARCHAR(100) NULL');
CALL nexora_add_column_if_missing('products','connectivity','VARCHAR(255) NULL');

CALL nexora_add_column_if_missing('components','sku','VARCHAR(40) NULL');
CALL nexora_add_column_if_missing('components','manufacturer','VARCHAR(120) NULL');
CALL nexora_add_column_if_missing('components','model','VARCHAR(120) NULL');
CALL nexora_add_column_if_missing('components','capacity','VARCHAR(80) NULL');
CALL nexora_add_column_if_missing('components','speed','VARCHAR(80) NULL');
CALL nexora_add_column_if_missing('components','power_w','INT DEFAULT 0');
CALL nexora_add_column_if_missing('components','chipset','VARCHAR(120) NULL');
CALL nexora_add_column_if_missing('components','interface','VARCHAR(120) NULL');
CALL nexora_add_column_if_missing('components','image','VARCHAR(1000) NULL');

UPDATE products SET sku = CONCAT('NX-OLD-', id) WHERE sku IS NULL OR sku = '';
UPDATE components SET sku = CONCAT('CMP-OLD-', id) WHERE sku IS NULL OR sku = '';

ALTER TABLE products MODIFY sku VARCHAR(40) NOT NULL;
ALTER TABLE components MODIFY sku VARCHAR(40) NOT NULL;

DROP PROCEDURE IF EXISTS nexora_add_unique_index_if_missing;
DELIMITER //
CREATE PROCEDURE nexora_add_unique_index_if_missing(
    IN table_name_arg VARCHAR(64),
    IN index_name_arg VARCHAR(64),
    IN column_name_arg VARCHAR(64)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = table_name_arg
          AND INDEX_NAME = index_name_arg
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', table_name_arg, '` ADD UNIQUE KEY `',
            index_name_arg, '` (`', column_name_arg, '`)'
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//
DELIMITER ;

CALL nexora_add_unique_index_if_missing('products','uq_products_sku','sku');
CALL nexora_add_unique_index_if_missing('components','uq_components_sku','sku');

DROP PROCEDURE IF EXISTS nexora_add_column_if_missing;
DROP PROCEDURE IF EXISTS nexora_add_unique_index_if_missing;
