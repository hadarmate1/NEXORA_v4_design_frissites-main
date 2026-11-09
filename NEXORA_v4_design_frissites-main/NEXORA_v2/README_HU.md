# NEXORA – vállalati hardverkatalógus és konfigurátor

## Mi van a csomagban?
- Vállalati termékkatalógus 40 géppel (10 laptop, 10 asztali PC, 10 szerver, 10 workstation).
- 70 konfigurátor-alkatrész (10 CPU, 10 alaplap, 10 RAM, 10 videokártya, 10 háttértár, 10 tápegység, 10 ház).
- Visszafogott, hagyományos üzleti megjelenés, termékfotós kártyák és reszponzív elrendezés.
- Regisztráció, bejelentkezés, kijelentkezés, 7 napos adatbázisban tárolt munkamenet.
- Sózott scrypt jelszóhash, a nyers jelszó nem kerül adatbázisba.
- Backend állapotjelzés, amely az adatbázist és a termék/alkatrész darabszámot is ellenőrzi.
- A meglévő rendelések, licencek, fórum, céges profil és konfigurátor API útvonalai megmaradtak.

## 1. Adatbázis beállítása phpMyAdminban

A csomagban lévő `Backend/schema.sql` tartalmazza a teljes adatbázis-struktúrát, az auth táblákat és a demo termékadatokat.

**Meglévő NEXORA adatbázis esetén:**
1. Készíts exportot/mentést a jelenlegi `nexora` adatbázisról.
2. phpMyAdminban válaszd ki a `nexora` adatbázist.
3. Importáld a `Backend/schema.sql` fájlt. A meglévő táblákat nem dobja el; a `CREATE TABLE IF NOT EXISTS` megőrzi őket, a termékek/alkatrészek SKU alapján frissülnek vagy bekerülnek.
4. Ha csak a bejelentkezési táblákat akarod külön létrehozni, importáld a `Backend/migration_auth.sql` fájlt.

**Teljesen új telepítésnél:**
- Importáld a `Backend/schema.sql` fájlt phpMyAdminban. Ez létrehozza a `nexora` adatbázist is.

A meglévő táblák szerkezete a kapott képernyőkép alapján illeszkedik a sémához (products és components mezők). Ha korábbi, eltérő adatbázis-szerkezetet használsz, a migráció előtt ellenőrizd az oszlopokat.

## 2. Backend `.env` fájl

A `Backend/.env` fájl már szerepel a ZIP-ben a helyi XAMPP/MySQL alapbeállításokkal:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=nexora
DB_USER=root
DB_PASSWORD=
```

A képernyőképen a MySQL szerver portja `3307`, ezért ezt állítottam be. Ha a MySQL root felhasználójához van jelszó, írd be a `DB_PASSWORD=` után. Ha a te MySQL-ed más porton fut, a `DB_PORT` értékét módosítsd. A `.env` helyi fejlesztői minta, éles szerverre ne töltsd fel.

## 3. Backend indítása

Terminálban:

```bash
cd Backend
npm install
npm start
```

A szerver címe: `http://localhost:3000`
Az adatbázis-ellenőrzés: `http://localhost:3000/api/health`

Siker esetén a health végpont többek között `database: connected`, `products: 40` és `components: 70` értékeket ad vissza. Ha nem ezt látod, ellenőrizd a MySQL futását, a 3307-es portot, a jelszót és azt, hogy importáltad-e a `schema.sql` fájlt.

## 4. Frontend megnyitása

Nyisd meg a `Frontend/vizsgaremek.html` fájlt Live Serverrel vagy más statikus webszerverrel. A frontend az `http://localhost:3000/api` címen éri el a backendet.

Első megnyitáskor regisztrálj egy vállalati fiókot. A jelszó minimum 8 karakter. A következő alkalommal a bejelentkezési felület jelenik meg; a munkamenet 7 napig érvényes.

## 5. Fontos megjegyzések
- A termékfotók külső képszolgáltatásról töltődnek, ezért internetkapcsolat szükséges. A képek reprezentatív hardverfotók, nem minden esetben az adott pontos SKU gyártói fotói.
- A ZIP-ben lévő `.env` XAMPP alapértelmezést feltételez (root, üres jelszó, MySQL 3307). A MySQL-jelszót nem lehetett megállapítani a projektfájlokból, ezért ha nálad be van állítva, neked kell megadni.
- A backend JavaScript szintaktikai ellenőrzése lefutott. A tényleges MySQL-integrációt a te helyi XAMPP adatbázisoddal kell ellenőrizni.

## Jogosultságok és kapcsolatfelvétel (frissítés)

A meglévő adatbázison egyszer futtasd a `Backend/migration_roles_contact.sql` fájlt phpMyAdminban, a `nexora` adatbázist kijelölve. Ez hozzáadja a felhasználói szerepkört, a rendelések tulajdonosát és a kapcsolatfelvételi üzenetek tábláját. A termékkatalógus és a konfigurátor tábláit nem módosítja.

A látogatók bejelentkezés nélkül böngészhetik a katalógust. A rendelések, céges profil és tömeges rendelés bejelentkezéshez kötött. A vállalkozói fiók kizárólag a saját rendeléseit látja. A licenckezelés és az adminisztráció admin szerepkörhöz kötött, a backend minden ilyen API-kérést ellenőriz.

Regisztrációnál admin fiók csak meghívókóddal hozható létre. A `Backend/.env` fájlban az `ADMIN_REGISTRATION_CODE` értékét cseréld le egy saját, titkos kódra. Ezt ne oszd meg vállalkozói felhasználókkal. A korábban létrehozott fiókok alapértelmezett szerepe vállalkozó; meglévő admin fiók kijelöléséhez phpMyAdmin SQL fülén futtasd (a megfelelő e-mail-címmel):

```sql
UPDATE users SET role='admin' WHERE email='sajat-admin@ceg.hu';
```

A kapcsolatfelvételi űrlap a `contact_messages` táblába menti az üzeneteket. Az adminisztrátor az Adminisztráció oldalon tekintheti meg őket.

Megjegyzés: az API végpontok nem titkosak a böngésző számára, de az adminisztrációs adatokhoz csak hitelesített, admin szerepkörű kérés fér hozzá. Az adatbázis-hitelesítő adatokat tartalmazó `.env` kizárólag a szerveren maradjon, éles tárhelyen ne legyen publikus webes mappában.


## V4 felületi frissítés

Ez a verzió a meglévő API- és adatbázis-struktúrát nem módosítja, ezért új SQL migrációt nem kell futtatni. A frontendben megjelent a bejelentkezési ablak bezáró X gombja; az ablak háttérre kattintva és Escape billentyűvel is bezárható. Vendég módban rejtve maradnak az összesített működési mutatók, a rendszerállapot és a pontos készletdarabszámok. A látogatók továbbra is böngészhetik a nyilvános katalógust.

A V4 telepítésekor a Frontend mappa fájljait cseréld le. A Backend mappában lévő `.env` és adatbázis-beállításokat hagyd változatlanul. SQL-futtatás nem szükséges.
