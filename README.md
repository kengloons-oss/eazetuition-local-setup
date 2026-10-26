# EazeTuition local setup

For the complete Windows clone, MySQL import, backend and Expo instructions, see [Setup.md](Setup.md).

This repository contains a Flask/MySQL backend at the repository root and an Expo mobile app in EazeTuition/.

## 1. Prerequisites

Install Python 3.10 or newer, Node.js LTS, and MySQL 8 (or a compatible MariaDB server). The SQL dump is a MariaDB/phpMyAdmin export and may need compatibility fixes when imported into a different MySQL version.

## 2. Restore the database

The included tuition_fyp.sql contains the schema and sample data. In MySQL Workbench, create a schema named tuition_fyp, then use Server → Data Import → Import from Self-Contained File to load this file into that schema. Alternatively, from PowerShell:

```powershell
mysql -u root -p -e "CREATE DATABASE tuition_fyp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Get-Content .\tuition_fyp.sql | mysql -u root -p tuition_fyp
```

If you already have data in a local tuition_fyp database, back it up before importing. The dump includes inserts and should only be imported into a fresh database unless you intend to replace or merge data.

## 3. Configure and start the backend

From the repository root, create a local env file and set your own MySQL password:

```powershell
Copy-Item .env.example .env
# Edit .env and set DATABASE_URI to your local MySQL credentials
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

The backend listens on port 5000 and creates any missing SQLAlchemy tables at startup. db.create_all() does not update existing table layouts; use the supplied SQL dump for the expected schema. Open http://127.0.0.1:5000/ to reach the admin login.

Email, Stripe and OpenAI features need their corresponding credentials in .env; basic server startup does not require them. The old guide contains credentials and test keys committed to the repository. Treat them as exposed: rotate/revoke those credentials and use your own values in .env rather than copying them.

## 4. Start the Expo app

Open a second PowerShell window in EazeTuition/:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://localhost:5000" # Expo web
npm ci
npx expo start -c
```

For an Android emulator use http://10.0.2.2:5000. For a physical phone, set the URL to the computer's LAN IPv4 address (for example http://192.168.1.20:5000); phone and computer must share Wi-Fi, and Windows Firewall must allow inbound TCP port 5000. The app's old hard-coded LAN IP may no longer match this computer.

## Optional: Stripe webhook testing

Install and authenticate the Stripe CLI with your own Stripe test account, then run:

```powershell
stripe listen --forward-to localhost:5000/payment/stripe/webhook
```

Copy the CLI's displayed signing secret into STRIPE_WEBHOOK_SECRET in .env and restart Flask.

