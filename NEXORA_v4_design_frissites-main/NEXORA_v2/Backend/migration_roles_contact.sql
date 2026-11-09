-- NEXORA jogosultsagok es kapcsolatfelvetel
USE nexora;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('entrepreneur','admin') NOT NULL DEFAULT 'entrepreneur';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INT NULL;

CREATE TABLE IF NOT EXISTS contact_messages (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 email VARCHAR(190) NOT NULL,
 subject VARCHAR(180) NOT NULL,
 message TEXT NOT NULL,
 status ENUM('new','read','closed') NOT NULL DEFAULT 'new',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_contact_status(status),
 INDEX idx_contact_created(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_company_profiles (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL UNIQUE,
 tax_number VARCHAR(80) DEFAULT '',
 company_address VARCHAR(255) DEFAULT '',
 contact_email VARCHAR(190) DEFAULT '',
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_user_company_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
