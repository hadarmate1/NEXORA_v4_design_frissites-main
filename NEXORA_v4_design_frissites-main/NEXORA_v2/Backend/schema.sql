CREATE DATABASE IF NOT EXISTS nexora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nexora;

CREATE TABLE IF NOT EXISTS users (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash CHAR(128) NOT NULL,
 password_salt CHAR(32) NOT NULL,
 company VARCHAR(180) DEFAULT '',
 role ENUM('entrepreneur','admin') NOT NULL DEFAULT 'entrepreneur',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_sessions (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 token_hash CHAR(64) NOT NULL UNIQUE,
 expires_at DATETIME NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_auth_sessions_expiry(expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NEXORA v2: kibovitett termekkatalogus es PC konfigurator.
-- A rendelési, licenc-, fórum- és céges profil táblák megőrzik az eredeti API szerződést.

CREATE TABLE IF NOT EXISTS products (
 id INT AUTO_INCREMENT PRIMARY KEY,
 sku VARCHAR(40) NOT NULL UNIQUE,
 name VARCHAR(180) NOT NULL,
 category VARCHAR(100) NOT NULL,
 type VARCHAR(80) DEFAULT 'computer',
 manufacturer VARCHAR(120),
 model VARCHAR(120),
 description TEXT,
 price DECIMAL(12,2) NOT NULL DEFAULT 0,
 stock INT NOT NULL DEFAULT 0,
 image VARCHAR(1000),
 processor VARCHAR(180),
 memory VARCHAR(120),
 storage VARCHAR(180),
 graphics VARCHAR(180),
 display VARCHAR(120),
 operating_system VARCHAR(120),
 warranty_months INT DEFAULT 24,
 form_factor VARCHAR(100),
 connectivity VARCHAR(255),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_products_category(category),
 INDEX idx_products_name(name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS components (
 id INT AUTO_INCREMENT PRIMARY KEY,
 sku VARCHAR(40) NOT NULL UNIQUE,
 name VARCHAR(180) NOT NULL,
 type ENUM('cpu','motherboard','ram','gpu','storage','psu','case') NOT NULL,
 manufacturer VARCHAR(120),
 model VARCHAR(120),
 price DECIMAL(12,2) NOT NULL DEFAULT 0,
 socket VARCHAR(80),
 ram_type VARCHAR(40),
 capacity VARCHAR(80),
 speed VARCHAR(80),
 power_w INT DEFAULT 0,
 chipset VARCHAR(120),
 interface VARCHAR(120),
 image VARCHAR(1000),
 description TEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_components_type(type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
 id INT AUTO_INCREMENT PRIMARY KEY,
 order_number VARCHAR(60) NOT NULL UNIQUE,
 company_name VARCHAR(180),
 status VARCHAR(40) NOT NULL DEFAULT 'Feldolgozás alatt',
 total DECIMAL(14,2) NOT NULL DEFAULT 0,
 user_id INT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
 id INT AUTO_INCREMENT PRIMARY KEY,
 order_id INT NOT NULL,
 product_id INT NULL,
 name VARCHAR(180) NOT NULL,
 type VARCHAR(80),
 quantity INT NOT NULL DEFAULT 1,
 component_ids JSON,
 license_ids JSON,
 unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS licenses (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(180) NOT NULL,
 license_key VARCHAR(255) UNIQUE,
 order_id INT NULL,
 status VARCHAR(40) NOT NULL DEFAULT 'Aktív',
 valid_until DATE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS price_offers (
 id INT AUTO_INCREMENT PRIMARY KEY,
 product_name VARCHAR(180) NOT NULL,
 merchant VARCHAR(180) NOT NULL,
 price DECIMAL(12,2) NOT NULL,
 url VARCHAR(1000),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS forum_topics (
 id INT AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(220) NOT NULL,
 category VARCHAR(100) NOT NULL,
 description TEXT NOT NULL,
 author VARCHAR(120) DEFAULT 'NEXORA felhasználó',
 replies INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS company_profile (
 id INT PRIMARY KEY,
 company_name VARCHAR(180),
 contact_name VARCHAR(180),
 contact_email VARCHAR(180),
 tax_number VARCHAR(80),
 company_address VARCHAR(255),
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 40 vállalati gép: kategóriánként 10 modell.
INSERT INTO products (sku,name,category,type,manufacturer,model,description,price,stock,image,processor,memory,storage,graphics,display,operating_system,warranty_months,form_factor,connectivity) VALUES
('NX-0001','ThinkPad T14 Gen 5','Laptop','laptop','Lenovo','21ML','Üzleti mobil munkaállomás masszív házzal és vállalati biztonsági funkciókkal.','649900','18','https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85','Intel Core Ultra 5 125U','16 GB DDR5','512 GB NVMe SSD','Intel Graphics','14” WUXGA IPS','Windows 11 Pro','36','14 hüvelykes üzleti','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0002','Latitude 5450','Laptop','laptop','Dell','5450','Könnyű, jól szervizelhető vállalati notebook hosszú munkanapokra.','619900','14','https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=85','Intel Core Ultra 5 135U','16 GB DDR5','512 GB NVMe SSD','Intel Graphics','14” FHD+','Windows 11 Pro','36','14 hüvelykes üzleti','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0003','EliteBook 840 G11','Laptop','laptop','HP','A26Z','Prémium üzleti kivitel, fejlett kamera- és konferenciafunkciókkal.','699900','11','https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1200&q=85','Intel Core Ultra 7 155U','32 GB DDR5','1 TB NVMe SSD','Intel Graphics','14” WUXGA IPS','Windows 11 Pro','36','14 hüvelykes üzleti','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0004','ThinkPad E16 Gen 2','Laptop','laptop','Lenovo','21MA','Nagy kijelzős, bővíthető irodai notebook napi használatra.','529900','22','https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85','AMD Ryzen 5 7535U','16 GB DDR5','512 GB NVMe SSD','Radeon 660M','16” WUXGA IPS','Windows 11 Pro','24','16 hüvelykes üzleti','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0005','ProBook 450 G10','Laptop','laptop','HP','9G2','Költséghatékony flottagép irodai alkalmazásokhoz.','459900','20','https://images.unsplash.com/photo-1587614382346-4ec70e388b28?auto=format&fit=crop&w=1200&q=85','Intel Core i5-1335U','16 GB DDR4','512 GB NVMe SSD','Intel Iris Xe','15.6” FHD IPS','Windows 11 Pro','24','15.6 hüvelykes üzleti','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0006','ExpertBook B5','Laptop','laptop','ASUS','B5404','Könnyű üzleti gép vállalati menedzsmenttel és dokkolhatósággal.','589900','9','https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1200&q=85','Intel Core Ultra 5 125U','16 GB DDR5','512 GB NVMe SSD','Intel Graphics','14” WUXGA','Windows 11 Pro','36','14 hüvelykes üzleti','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0007','ThinkBook 16 G6','Laptop','laptop','Lenovo','21KH','Jó ár-érték arányú, nagy kijelzős munkagép.','489900','17','https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1200&q=85','AMD Ryzen 7 7730U','16 GB DDR4','1 TB NVMe SSD','Radeon Graphics','16” WUXGA IPS','Windows 11 Pro','24','16 hüvelykes üzleti','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0008','TravelMate P4','Laptop','laptop','Acer','TMP414','Üzleti mobilitásra optimalizált, biztonságos vállalati laptop.','559900','12','https://images.unsplash.com/photo-1593642634367-d91a135587b5?auto=format&fit=crop&w=1200&q=85','Intel Core i7-1355U','16 GB DDR5','512 GB NVMe SSD','Intel Iris Xe','14” WUXGA IPS','Windows 11 Pro','36','14 hüvelykes üzleti','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0009','Precision 3591','Laptop','laptop','Dell','3591','CAD és mérnöki feladatokra minősített mobil workstation.','999900','6','https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=1200&q=85','Intel Core Ultra 7 165H','32 GB DDR5','1 TB NVMe SSD','NVIDIA RTX 1000 Ada','15.6” FHD+','Windows 11 Pro','36','Mobil workstation','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0010','ZBook Power G11','Laptop','laptop','HP','A3ZZ','Nagy teljesítményű mobil munkaállomás professzionális alkalmazásokhoz.','1149900','5','https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=85','AMD Ryzen 9 8945HS','32 GB DDR5','1 TB NVMe SSD','NVIDIA RTX 2000 Ada','16” WUXGA','Windows 11 Pro','36','Mobil workstation','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0011','OptiPlex 7020 SFF','Asztali PC','desktop','Dell','7020','Kompakt, vállalati flottákhoz optimalizált irodai asztali gép.','389900','25','https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1200&q=85','Intel Core i5-14500','16 GB DDR5','512 GB NVMe SSD','Intel UHD 770','Nincs','Windows 11 Pro','36','SFF','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0012','ThinkCentre M75s Gen 5','Asztali PC','desktop','Lenovo','12TA','Kis helyigényű, könnyen menedzselhető üzleti PC.','419900','18','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=85','AMD Ryzen 5 8600G','16 GB DDR5','512 GB NVMe SSD','Radeon 760M','Nincs','Windows 11 Pro','36','SFF','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0013','Pro Tower 400 G9','Asztali PC','desktop','HP','8T2','Bővíthető torony PC irodai és ügyviteli környezetbe.','369900','21','https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=1200&q=85','Intel Core i5-14500','16 GB DDR5','512 GB NVMe SSD','Intel UHD 770','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0014','Vostro Tower 3030','Asztali PC','desktop','Dell','3030','Belépő üzleti torony megbízható napi működéshez.','329900','16','https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=85','Intel Core i5-14400','16 GB DDR5','512 GB NVMe SSD','Intel UHD 730','Nincs','Windows 11 Pro','24','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0015','ThinkCentre M70t Gen 5','Asztali PC','desktop','Lenovo','12U','Bővíthető üzleti torony több monitoros munkához.','449900','13','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=85','Intel Core i7-14700','16 GB DDR5','1 TB NVMe SSD','Intel UHD 770','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0016','ExpertCenter D7 SFF','Asztali PC','desktop','ASUS','D700','Csendes, kompakt vállalati asztali rendszer.','399900','10','https://images.unsplash.com/photo-1587202372616-b43abea06c2a?auto=format&fit=crop&w=1200&q=85','Intel Core i5-14500','16 GB DDR5','1 TB NVMe SSD','Intel UHD 770','Nincs','Windows 11 Pro','36','SFF','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0017','Veriton X4','Asztali PC','desktop','Acer','VX4','Könnyen telepíthető, üzleti felhasználásra kész PC.','359900','19','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=85','Intel Core i5-13400','16 GB DDR4','512 GB NVMe SSD','Intel UHD 730','Nincs','Windows 11 Pro','24','SFF','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0018','ProDesk 600 G6','Asztali PC','desktop','HP','600G6','Megbízható, általános irodai feladatokra szánt konfiguráció.','299900','8','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=85','Intel Core i5-10500','16 GB DDR4','512 GB SSD','Intel UHD 630','Nincs','Windows 11 Pro','12','SFF','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0019','Legion Tower 5','Asztali PC','desktop','Lenovo','90UT','Erős grafikus teljesítményű fejlesztői és kreatív munkaállomás.','749900','7','https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1200&q=85','AMD Ryzen 7 7700','32 GB DDR5','1 TB NVMe SSD','NVIDIA RTX 4060','Nincs','Windows 11 Pro','24','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0020','Precision 3680 Tower','Asztali PC','desktop','Dell','3680','Professzionális, bővíthető workstation CAD és render feladatokra.','1199900','4','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=85','Intel Core i7-14700K','32 GB DDR5','1 TB NVMe SSD','NVIDIA RTX 2000 Ada','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0021','PowerEdge T350','Szerver','server','Dell','T350','Torony szerver kis- és középvállalati infrastruktúrához.','1499900','5','https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=85','Intel Xeon E-2336','32 GB ECC DDR4','2× 1.2 TB SAS','Matrox G200','Nincs','Windows Server kompatibilis','36','Tower server','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0022','ThinkSystem ST50 V3','Szerver','server','Lenovo','ST50 V3','Kompakt belépő szerver fájl- és alkalmazáskiszolgáláshoz.','999900','7','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85','Intel Xeon E-2434','32 GB ECC DDR5','2× 960 GB SSD','Integrált','Nincs','Windows Server kompatibilis','36','Tower server','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0023','ProLiant ML30 Gen11','Szerver','server','HPE','ML30','Bővíthető torony szerver távoli menedzsmenttel.','1199900','4','https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&w=1200&q=85','Intel Xeon E-2436','32 GB ECC DDR5','2× 1.2 TB SAS','Integrált','Nincs','Windows Server kompatibilis','36','Tower server','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0024','PowerEdge R350','Szerver','server','Dell','R350','1U rack szerver virtualizációs és üzleti szolgáltatásokhoz.','1799900','3','https://images.unsplash.com/photo-1563770660941-10a63607739e?auto=format&fit=crop&w=1200&q=85','Intel Xeon E-2388G','64 GB ECC DDR4','2× 1.92 TB SSD','Matrox G200','Nincs','Windows Server kompatibilis','36','1U rack','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0025','ThinkSystem SR250 V3','Szerver','server','Lenovo','SR250 V3','Helytakarékos 1U rendszer edge és irodai környezetbe.','1699900','4','https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=85','Intel Xeon E-2434','32 GB ECC DDR5','2× 1.2 TB SAS','Integrált','Nincs','Windows Server kompatibilis','36','1U rack','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0026','ProLiant DL360 Gen11','Szerver','server','HPE','DL360','Nagy rendelkezésre állású, kétprocesszoros adatközponti platform.','3299900','2','https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=85','2× Intel Xeon Silver 4410Y','128 GB ECC DDR5','4× 1.92 TB SSD','Integrált','Nincs','Windows Server kompatibilis','36','1U rack','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0027','PowerEdge R760','Szerver','server','Dell','R760','Nagy sűrűségű, skálázható rack szerver kritikus rendszerekhez.','4599900','2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85','2× Intel Xeon Silver 4510','256 GB ECC DDR5','4× 1.92 TB SSD','Integrált','Nincs','Windows Server kompatibilis','36','2U rack','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0028','ThinkSystem SR650 V3','Szerver','server','Lenovo','SR650 V3','Kétfoglalatos vállalati szerver virtualizációhoz és adatbázisokhoz.','3899900','3','https://images.unsplash.com/photo-1555617981-dac3880eac6e?auto=format&fit=crop&w=1200&q=85','2× Intel Xeon Gold 5416S','128 GB ECC DDR5','4× 1.92 TB NVMe','Integrált','Nincs','Windows Server kompatibilis','36','2U rack','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0029','ProLiant ML350 Gen11','Szerver','server','HPE','ML350','Nagy bővíthetőségű torony szerver növekvő vállalatoknak.','2899900','3','https://images.unsplash.com/photo-1563770660941-10a63607739e?auto=format&fit=crop&w=1200&q=85','Intel Xeon Silver 4410Y','64 GB ECC DDR5','2× 2.4 TB SAS','Integrált','Nincs','Windows Server kompatibilis','36','Tower server','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0030','PowerEdge T560','Szerver','server','Dell','T560','Nagy teljesítményű torony szerver adatintenzív munkafolyamatokhoz.','3199900','2','https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=85','Intel Xeon Silver 4410Y','128 GB ECC DDR5','4× 1.92 TB SSD','Integrált','Nincs','Windows Server kompatibilis','36','Tower server','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0031','ThinkStation P3 Tower','Workstation','workstation','Lenovo','P3','ISV-tanúsított belépő munkaállomás tervezői és fejlesztői munkához.','899900','8','https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=85','Intel Core i7-14700','32 GB DDR5','1 TB NVMe SSD','NVIDIA RTX 2000 Ada','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0032','Precision 5860 Tower','Workstation','workstation','Dell','5860','Professzionális egyfoglalatos workstation nagy számítási kapacitással.','2499900','3','https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1200&q=85','Intel Xeon W5-2455X','64 GB ECC DDR5','1 TB NVMe SSD','NVIDIA RTX 4000 Ada','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0033','Z4 G5 Workstation','Workstation','workstation','HP','Z4 G5','Stabil platform 3D tervezéshez, mérnöki és vizualizációs feladatokhoz.','2299900','4','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=85','Intel Xeon W5-2465X','64 GB ECC DDR5','2 TB NVMe SSD','NVIDIA RTX 4000 Ada','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0034','ThinkStation P5','Workstation','workstation','Lenovo','P5','Nagy teljesítményű professzionális munkaállomás komplex projektekhez.','3199900','2','https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1200&q=85','Intel Xeon W5-2455X','128 GB ECC DDR5','2 TB NVMe SSD','NVIDIA RTX 5000 Ada','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0035','Precision 3680 MT','Workstation','workstation','Dell','3680MT','Kompakt torony CAD, BIM és adatfeldolgozó munkára.','1499900','5','https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=1200&q=85','Intel Core i9-14900K','64 GB DDR5','2 TB NVMe SSD','NVIDIA RTX 4000 Ada','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0036','Z2 Tower G9','Workstation','workstation','HP','Z2 G9','Költséghatékony workstation professzionális alkalmazásokhoz.','1199900','6','https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=1200&q=85','Intel Core i7-14700','32 GB DDR5','1 TB NVMe SSD','NVIDIA RTX 2000 Ada','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0037','ThinkStation P3 Ultra','Workstation','workstation','Lenovo','P3 Ultra','Kis méretű, mégis komoly grafikus teljesítményű munkaállomás.','1399900','4','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=85','Intel Core i7-14700','32 GB DDR5','1 TB NVMe SSD','NVIDIA RTX A2000','Nincs','Windows 11 Pro','36','SFF','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0038','Precision 7875 Tower','Workstation','workstation','Dell','7875','AMD Threadripper Pro platform nagy memória- és bővítési igénnyel.','3799900','2','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=85','AMD Threadripper Pro 7945WX','128 GB ECC DDR5','2 TB NVMe SSD','NVIDIA RTX 5000 Ada','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0039','Z6 G5 A','Workstation','workstation','HP','Z6 G5 A','Nagy magszámú AMD workstation tartalomgyártáshoz és szimulációhoz.','3499900','2','https://images.unsplash.com/photo-1593642634367-d91a135587b5?auto=format&fit=crop&w=1200&q=85','AMD Threadripper Pro 7965WX','128 GB ECC DDR5','2 TB NVMe SSD','NVIDIA RTX 5000 Ada','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE'),
('NX-0040','ThinkStation P7','Workstation','workstation','Lenovo','P7','Csúcskategóriás workstation összetett render és mérnöki feladatokra.','4999900','1','https://images.unsplash.com/photo-1587202372616-b43abea06c2a?auto=format&fit=crop&w=1200&q=85','Intel Xeon W7-2495X','256 GB ECC DDR5','4 TB NVMe SSD','NVIDIA RTX 6000 Ada','Nincs','Windows 11 Pro','36','Tower','Wi-Fi 6E, Bluetooth 5.3, 1 GbE')
ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), type=VALUES(type), manufacturer=VALUES(manufacturer), model=VALUES(model), description=VALUES(description), price=VALUES(price), stock=VALUES(stock), image=VALUES(image), processor=VALUES(processor), memory=VALUES(memory), storage=VALUES(storage), graphics=VALUES(graphics), display=VALUES(display), operating_system=VALUES(operating_system), warranty_months=VALUES(warranty_months), form_factor=VALUES(form_factor), connectivity=VALUES(connectivity);

-- 70 konfigurátor-alkatrész: típusonként 10 választási lehetőség.
INSERT INTO components (sku,name,type,manufacturer,model,price,socket,ram_type,capacity,speed,power_w,chipset,interface,image,description) VALUES
('CMP-0001','Intel Core i5-14400','cpu','Intel','i5-14400','89900','LGA1700',NULL,'10 mag','4.7 GHz','65','Raptor Lake Refresh','LGA1700','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=85','10 magos, általános üzleti és fejlesztői feladatokra'),
('CMP-0002','Intel Core i5-14500','cpu','Intel','i5-14500','99900','LGA1700',NULL,'14 mag','5.0 GHz','65','Raptor Lake Refresh','LGA1700','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=85','14 magos processzor integrált grafikával'),
('CMP-0003','Intel Core i7-14700','cpu','Intel','i7-14700','159900','LGA1700',NULL,'20 mag','5.4 GHz','65','Raptor Lake Refresh','LGA1700','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=85','Nagyobb párhuzamos terheléshez'),
('CMP-0004','Intel Core i9-14900K','cpu','Intel','i9-14900K','219900','LGA1700',NULL,'24 mag','6.0 GHz','125','Raptor Lake Refresh','LGA1700','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=85','Csúcsteljesítményű asztali CPU'),
('CMP-0005','Intel Core Ultra 5 245K','cpu','Intel','Ultra 5 245K','129900','LGA1851',NULL,'14 mag','5.2 GHz','125','Arrow Lake','LGA1851','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=85','Új generációs asztali processzor'),
('CMP-0006','AMD Ryzen 5 7600','cpu','AMD','7600','79900','AM5',NULL,'6 mag','5.1 GHz','65','Zen 4','AM5','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=85','Hatékony általános célú processzor'),
('CMP-0007','AMD Ryzen 7 7700','cpu','AMD','7700','119900','AM5',NULL,'8 mag','5.3 GHz','65','Zen 4','AM5','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=85','Nyolcmagos CPU munkaállomásokhoz'),
('CMP-0008','AMD Ryzen 7 9700X','cpu','AMD','9700X','149900','AM5',NULL,'8 mag','5.5 GHz','65','Zen 5','AM5','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=85','Modern, hatékony Zen 5 processzor'),
('CMP-0009','AMD Ryzen 9 9900X','cpu','AMD','9900X','189900','AM5',NULL,'12 mag','5.6 GHz','120','Zen 5','AM5','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=85','Nagy teljesítményű többmagos CPU'),
('CMP-0010','AMD Ryzen 9 9950X','cpu','AMD','9950X','249900','AM5',NULL,'16 mag','5.7 GHz','170','Zen 5','AM5','https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=900&q=85','Professzionális munkafolyamatokra'),
('CMP-0011','ASUS PRIME B760M-A WIFI','motherboard','ASUS','PRIME B760M-A WIFI','69900','LGA1700','DDR5','4 DIMM','DDR5 7200 OC','0','Intel B760','PCIe 4.0, 2× M.2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85','LGA1700 mATX alaplap Wi-Fi kapcsolattal'),
('CMP-0012','MSI PRO B760-P WIFI','motherboard','MSI','PRO B760-P WIFI','79900','LGA1700','DDR5','4 DIMM','DDR5 7000 OC','0','Intel B760','PCIe 5.0, 3× M.2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85','Bővíthető ATX üzleti alaplap'),
('CMP-0013','Gigabyte B760 DS3H','motherboard','Gigabyte','B760 DS3H','58900','LGA1700','DDR5','4 DIMM','DDR5 7600 OC','0','Intel B760','PCIe 4.0, 2× M.2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85','Kedvező árú Intel alaplap'),
('CMP-0014','ASUS TUF GAMING Z790-PLUS','motherboard','ASUS','TUF Z790-PLUS','119900','LGA1700','DDR5','4 DIMM','DDR5 7800 OC','0','Intel Z790','PCIe 5.0, 4× M.2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85','Erős tápellátású Z790 platform'),
('CMP-0015','MSI PRO Z790-A MAX WIFI','motherboard','MSI','PRO Z790-A MAX','139900','LGA1700','DDR5','4 DIMM','DDR5 7800 OC','0','Intel Z790','PCIe 5.0, 4× M.2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85','Professzionális bővítési lehetőségek'),
('CMP-0016','MSI PRO B650M-A WIFI','motherboard','MSI','PRO B650M-A WIFI','69900','AM5','DDR5','4 DIMM','DDR5 7200 OC','0','AMD B650','PCIe 4.0, 2× M.2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85','AM5 mATX alaplap Wi-Fi 6E-vel'),
('CMP-0017','ASUS TUF GAMING B650-PLUS','motherboard','ASUS','TUF B650-PLUS','89900','AM5','DDR5','4 DIMM','DDR5 7600 OC','0','AMD B650','PCIe 5.0, 3× M.2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85','Tartós ATX AM5 alaplap'),
('CMP-0018','Gigabyte B650 EAGLE AX','motherboard','Gigabyte','B650 EAGLE AX','74900','AM5','DDR5','4 DIMM','DDR5 7600 OC','0','AMD B650','PCIe 5.0, 3× M.2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85','Jól felszerelt AM5 platform'),
('CMP-0019','ASUS ROG STRIX X870E-E','motherboard','ASUS','X870E-E','219900','AM5','DDR5','4 DIMM','DDR5 8000 OC','0','AMD X870E','PCIe 5.0, 5× M.2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85','Felsőkategóriás AM5 alaplap'),
('CMP-0020','MSI MAG X870 TOMAHAWK WIFI','motherboard','MSI','X870 TOMAHAWK','149900','AM5','DDR5','4 DIMM','DDR5 8400 OC','0','AMD X870','PCIe 5.0, 4× M.2','https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85','Modern X870 platform'),
('CMP-0021','Kingston Fury Beast 16GB DDR4','ram','Kingston','KF432C16','15900',NULL,'DDR4','16 GB','3200 MT/s','0',NULL,'UDIMM','https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85','16 GB kétcsatornás memóriamodul'),
('CMP-0022','Kingston Fury Beast 32GB DDR4','ram','Kingston','KF432C16','29900',NULL,'DDR4','32 GB','3200 MT/s','0',NULL,'UDIMM','https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85','32 GB DDR4 kit'),
('CMP-0023','Corsair Vengeance 32GB DDR5','ram','Corsair','CMK32GX5','38900',NULL,'DDR5','32 GB','6000 MT/s','0',NULL,'UDIMM','https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85','32 GB DDR5 memória'),
('CMP-0024','Kingston Fury Beast 32GB DDR5','ram','Kingston','KF560C36','36900',NULL,'DDR5','32 GB','6000 MT/s','0',NULL,'UDIMM','https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85','Alacsony késleltetésű DDR5 kit'),
('CMP-0025','G.Skill Ripjaws S5 64GB','ram','G.Skill','F5-6000J','69900',NULL,'DDR5','64 GB','6000 MT/s','0',NULL,'UDIMM','https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85','64 GB fejlesztői és kreatív munkára'),
('CMP-0026','Crucial Pro 64GB DDR5','ram','Crucial','CP2K32G','64900',NULL,'DDR5','64 GB','5600 MT/s','0',NULL,'UDIMM','https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85','Nagy kapacitású stabil DDR5 memória'),
('CMP-0027','Corsair Vengeance 64GB DDR5','ram','Corsair','CMK64GX5','79900',NULL,'DDR5','64 GB','6400 MT/s','0',NULL,'UDIMM','https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85','Gyors 64 GB DDR5 kit'),
('CMP-0028','Kingston Server Premier 32GB ECC','ram','Kingston','KSM48E','58900',NULL,'DDR5','32 GB','4800 MT/s','0',NULL,'ECC UDIMM','https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85','ECC memória kompatibilis szerverplatformhoz'),
('CMP-0029','Samsung 64GB DDR5 ECC RDIMM','ram','Samsung','M321R','119900',NULL,'DDR5','64 GB','5600 MT/s','0',NULL,'ECC RDIMM','https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85','Regiszteres ECC szervermemória'),
('CMP-0030','Kingston Fury Renegade 96GB','ram','Kingston','KF596C','119900',NULL,'DDR5','96 GB','6400 MT/s','0',NULL,'UDIMM','https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85','Nagy kapacitású DDR5 készlet'),
('CMP-0031','NVIDIA GeForce RTX 4060 8GB','gpu','NVIDIA','RTX 4060','139900',NULL,NULL,'8 GB GDDR6','17 Gbps','115','Ada Lovelace','PCIe 4.0 x8','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85','Hatékony grafikus kártya általános kreatív feladatokra'),
('CMP-0032','NVIDIA GeForce RTX 4060 Ti 16GB','gpu','NVIDIA','RTX 4060 Ti','219900',NULL,NULL,'16 GB GDDR6','18 Gbps','165','Ada Lovelace','PCIe 4.0 x8','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85','Nagyobb VRAM igényű alkalmazásokhoz'),
('CMP-0033','NVIDIA GeForce RTX 4070 SUPER','gpu','NVIDIA','RTX 4070 SUPER','289900',NULL,NULL,'12 GB GDDR6X','21 Gbps','220','Ada Lovelace','PCIe 4.0 x16','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85','Erős grafikus teljesítmény fejlesztéshez és renderhez'),
('CMP-0034','NVIDIA GeForce RTX 4070 Ti SUPER','gpu','NVIDIA','RTX 4070 Ti SUPER','389900',NULL,NULL,'16 GB GDDR6X','21 Gbps','285','Ada Lovelace','PCIe 4.0 x16','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85','16 GB VRAM professzionális grafikus munkához'),
('CMP-0035','NVIDIA GeForce RTX 4080 SUPER','gpu','NVIDIA','RTX 4080 SUPER','529900',NULL,NULL,'16 GB GDDR6X','23 Gbps','320','Ada Lovelace','PCIe 4.0 x16','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85','Nagy teljesítményű vizualizációhoz'),
('CMP-0036','NVIDIA RTX 2000 Ada','gpu','NVIDIA','RTX 2000 Ada','359900',NULL,NULL,'16 GB GDDR6 ECC','16 Gbps','70','Ada Lovelace','PCIe 4.0 x8','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85','Professzionális workstation GPU'),
('CMP-0037','NVIDIA RTX 4000 Ada','gpu','NVIDIA','RTX 4000 Ada','699900',NULL,NULL,'20 GB GDDR6 ECC','16 Gbps','130','Ada Lovelace','PCIe 4.0 x16','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85','ISV alkalmazásokhoz minősített grafika'),
('CMP-0038','NVIDIA RTX 5000 Ada','gpu','NVIDIA','RTX 5000 Ada','1599900',NULL,NULL,'32 GB GDDR6 ECC','18 Gbps','250','Ada Lovelace','PCIe 4.0 x16','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85','Nagy memóriájú professzionális GPU'),
('CMP-0039','AMD Radeon RX 7800 XT','gpu','AMD','RX 7800 XT','219900',NULL,NULL,'16 GB GDDR6','19.5 Gbps','263','RDNA 3','PCIe 4.0 x16','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85','Nagy teljesítményű grafikus kártya'),
('CMP-0040','Intel Arc A770 16GB','gpu','Intel','Arc A770','129900',NULL,NULL,'16 GB GDDR6','17.5 Gbps','225','Alchemist','PCIe 4.0 x16','https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=85','Kedvező árú grafikus gyorsító'),
('CMP-0041','Samsung 990 EVO 1TB','storage','Samsung','990 EVO','32900',NULL,NULL,'1 TB','5000 MB/s','0',NULL,'M.2 NVMe PCIe 4.0','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85','Gyors NVMe rendszermeghajtó'),
('CMP-0042','Samsung 990 PRO 2TB','storage','Samsung','990 PRO','69900',NULL,NULL,'2 TB','7450 MB/s','0',NULL,'M.2 NVMe PCIe 4.0','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85','Nagy teljesítményű NVMe SSD'),
('CMP-0043','WD Black SN850X 1TB','storage','Western Digital','SN850X','36900',NULL,NULL,'1 TB','7300 MB/s','0',NULL,'M.2 NVMe PCIe 4.0','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85','Gyors tárhely nagy terheléshez'),
('CMP-0044','WD Black SN850X 2TB','storage','Western Digital','SN850X','64900',NULL,NULL,'2 TB','7300 MB/s','0',NULL,'M.2 NVMe PCIe 4.0','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85','2 TB teljesítményorientált SSD'),
('CMP-0045','Crucial P3 Plus 1TB','storage','Crucial','P3 Plus','25900',NULL,NULL,'1 TB','5000 MB/s','0',NULL,'M.2 NVMe PCIe 4.0','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85','Költséghatékony NVMe meghajtó'),
('CMP-0046','Crucial T500 2TB','storage','Crucial','T500','59900',NULL,NULL,'2 TB','7400 MB/s','0',NULL,'M.2 NVMe PCIe 4.0','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85','Gyors, nagy kapacitású SSD'),
('CMP-0047','Kingston KC3000 1TB','storage','Kingston','KC3000','34900',NULL,NULL,'1 TB','7000 MB/s','0',NULL,'M.2 NVMe PCIe 4.0','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85','Nagy teljesítményű üzleti SSD'),
('CMP-0048','Seagate IronWolf 4TB','storage','Seagate','IronWolf','49900',NULL,NULL,'4 TB','180 MB/s','0',NULL,'3.5” SATA HDD','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85','NAS és szerver adattárolás'),
('CMP-0049','WD Red Plus 8TB','storage','Western Digital','Red Plus','89900',NULL,NULL,'8 TB','215 MB/s','0',NULL,'3.5” SATA HDD','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85','Nagy kapacitású NAS meghajtó'),
('CMP-0050','Samsung PM9A3 3.84TB','storage','Samsung','PM9A3','229900',NULL,NULL,'3.84 TB','6800 MB/s','0',NULL,'U.2 NVMe Enterprise','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85','Adatközponti enterprise SSD'),
('CMP-0051','be quiet! System Power 10 550W','psu','be quiet!','System Power 10','21900',NULL,NULL,'550 W','80+ Bronze','550',NULL,'ATX','https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?auto=format&fit=crop&w=900&q=85','Csendes, belépő tápegység irodai gépekhez'),
('CMP-0052','Corsair RM650e 650W','psu','Corsair','RM650e','38900',NULL,NULL,'650 W','80+ Gold','650',NULL,'ATX','https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?auto=format&fit=crop&w=900&q=85','Teljesen moduláris Gold tápegység'),
('CMP-0053','Seasonic Focus GX-750','psu','Seasonic','Focus GX-750','49900',NULL,NULL,'750 W','80+ Gold','750',NULL,'ATX','https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?auto=format&fit=crop&w=900&q=85','Megbízható, moduláris tápegység'),
('CMP-0054','be quiet! Pure Power 12 M 750W','psu','be quiet!','Pure Power 12 M','45900',NULL,NULL,'750 W','80+ Gold','750',NULL,'ATX 3.0','https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?auto=format&fit=crop&w=900&q=85','ATX 3.0 kompatibilis halk tápegység'),
('CMP-0055','Corsair RM850x 850W','psu','Corsair','RM850x','59900',NULL,NULL,'850 W','80+ Gold','850',NULL,'ATX','https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?auto=format&fit=crop&w=900&q=85','Prémium moduláris tápegység'),
('CMP-0056','Seasonic Vertex GX-1000','psu','Seasonic','Vertex GX-1000','89900',NULL,NULL,'1000 W','80+ Gold','1000',NULL,'ATX 3.0','https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?auto=format&fit=crop&w=900&q=85','Nagy teljesítményű GPU-khoz'),
('CMP-0057','MSI MAG A650BN','psu','MSI','MAG A650BN','23900',NULL,NULL,'650 W','80+ Bronze','650',NULL,'ATX','https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?auto=format&fit=crop&w=900&q=85','Kedvező árú 650 wattos tápegység'),
('CMP-0058','FSP Hydro G Pro 850W','psu','FSP','Hydro G Pro','57900',NULL,NULL,'850 W','80+ Gold','850',NULL,'ATX','https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?auto=format&fit=crop&w=900&q=85','Stabil, teljesen moduláris platform'),
('CMP-0059','Corsair HX1200i','psu','Corsair','HX1200i','119900',NULL,NULL,'1200 W','80+ Platinum','1200',NULL,'ATX','https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?auto=format&fit=crop&w=900&q=85','Digitálisan felügyelhető prémium PSU'),
('CMP-0060','be quiet! Dark Power Pro 13 1300W','psu','be quiet!','Dark Power Pro 13','149900',NULL,NULL,'1300 W','80+ Titanium','1300',NULL,'ATX 3.0','https://images.unsplash.com/photo-1624705002806-5d72df19c3ad?auto=format&fit=crop&w=900&q=85','Csúcskategóriás tápegység munkaállomásokhoz'),
('CMP-0061','Fractal Design Pop Air','case','Fractal Design','Pop Air','32900',NULL,NULL,'ATX','3 ventilátor','0',NULL,'ATX / mATX','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=85','Jó szellőzésű, letisztult mid tower ház'),
('CMP-0062','Corsair 4000D Airflow','case','Corsair','4000D Airflow','39900',NULL,NULL,'ATX','2 ventilátor','0',NULL,'ATX / mATX','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=85','Kiváló légáramlású minimalista ház'),
('CMP-0063','be quiet! Pure Base 500DX','case','be quiet!','500DX','45900',NULL,NULL,'ATX','3 ventilátor','0',NULL,'ATX / mATX','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=85','Csendes, jól szellőző ház'),
('CMP-0064','NZXT H7 Flow','case','NZXT','H7 Flow','54900',NULL,NULL,'E-ATX','2 ventilátor','0',NULL,'E-ATX / ATX','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=85','Tágas, modern airflow ház'),
('CMP-0065','Fractal Design North','case','Fractal Design','North','59900',NULL,NULL,'ATX','2 ventilátor','0',NULL,'ATX / mATX','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=85','Elegáns fa előlapos prémium ház'),
('CMP-0066','Lian Li Lancool 216','case','Lian Li','Lancool 216','44900',NULL,NULL,'E-ATX','3 ventilátor','0',NULL,'E-ATX / ATX','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=85','Nagy légszállítású konstrukció'),
('CMP-0067','Cooler Master NR600','case','Cooler Master','NR600','29900',NULL,NULL,'ATX','2 ventilátor','0',NULL,'ATX / mATX','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=85','Egyszerű, jól szerelhető ház'),
('CMP-0068','Phanteks Eclipse G500A','case','Phanteks','G500A','49900',NULL,NULL,'E-ATX','3 ventilátor','0',NULL,'E-ATX / ATX','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=85','Nagy méretű, mesh előlapos ház'),
('CMP-0069','Thermaltake Core V1','case','Thermaltake','Core V1','26900',NULL,NULL,'Mini-ITX','1 ventilátor','0',NULL,'Mini-ITX','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=85','Kompakt mini-ITX ház'),
('CMP-0070','Fractal Design Define 7','case','Fractal Design','Define 7','69900',NULL,NULL,'E-ATX','3 ventilátor','0',NULL,'E-ATX / ATX','https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=85','Csendes, prémium, moduláris ház')
ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), manufacturer=VALUES(manufacturer), model=VALUES(model), price=VALUES(price), socket=VALUES(socket), ram_type=VALUES(ram_type), capacity=VALUES(capacity), speed=VALUES(speed), power_w=VALUES(power_w), chipset=VALUES(chipset), interface=VALUES(interface), image=VALUES(image), description=VALUES(description);

INSERT INTO licenses (name, license_key, status, valid_until) VALUES
('Windows 11 Pro','DEMO-WIN-001','Aktív','2027-12-31'),
('Microsoft 365 Business','DEMO-M365-001','Aktív','2027-06-30'),
('Windows Server','DEMO-SRV-001','Lejárt','2025-01-01')
ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status), valid_until=VALUES(valid_until);

INSERT INTO price_offers (product_name, merchant, price, url) VALUES
('Intel Core i5-14400','NEXORA beszállítói minta',89900,'https://www.intel.com/'),
('Kingston Fury Beast 32GB DDR5','NEXORA beszállítói minta',36900,'https://www.kingston.com/');

INSERT INTO forum_topics (title, category, description, author, replies) VALUES
('Milyen üzleti laptopot érdemes flottában választani?','Laptop','A beszerzésnél a garancia, a dokkolhatóság és az egységes menedzsment is fontos szempont.','Rendszergazda',4),
('DDR5 memória kapacitás fejlesztői gépekhez','Alkatrészek','32 vagy 64 GB memóriával érdemes indulni nagyobb fejlesztői környezetben?','Hardveres',7);

INSERT INTO company_profile (id, company_name, contact_name, contact_email, tax_number, company_address)
VALUES (1,'NEXORA Demo Kft.','Teszt Felhasználó','teszt@nexora.hu','12345678-1-42','Budapest')
ON DUPLICATE KEY UPDATE company_name=VALUES(company_name);


CREATE TABLE IF NOT EXISTS user_company_profiles (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL UNIQUE,
 tax_number VARCHAR(80) DEFAULT '',
 company_address VARCHAR(255) DEFAULT '',
 contact_email VARCHAR(190) DEFAULT '',
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_user_company_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
