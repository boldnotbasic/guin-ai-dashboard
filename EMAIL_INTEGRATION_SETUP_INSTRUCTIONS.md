# Outlook Email Integratie - Setup Instructies

## 📧 Overzicht
Automatisch emails koppelen aan projecten op basis van keywords (bv. "Peakpioneers") of afzender email adressen.

---

## 🚀 Setup Stappen

### 1. Microsoft Azure App Registratie (5 minuten)

1. **Ga naar Azure Portal:**
   - Open: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
   - Log in met je Microsoft/Outlook account

2. **Nieuwe App Registratie:**
   - Klik **"New registration"**
   - **Name:** `Guin.ai Email Integration`
   - **Supported account types:** `Accounts in any organizational directory and personal Microsoft accounts`
   - **Redirect URI:** 
     - Type: `Single-page application (SPA)`
     - URL: `http://localhost:3000` (of je productie URL)
   - Klik **"Register"**

3. **Kopieer Credentials:**
   - Op de app overview pagina, kopieer:
     - **Application (client) ID** → dit is je `REACT_APP_MICROSOFT_CLIENT_ID`
   
4. **API Permissions Instellen:**
   - Ga naar **"API permissions"** in het menu
   - Klik **"Add a permission"**
   - Selecteer **"Microsoft Graph"**
   - Selecteer **"Delegated permissions"**
   - Voeg toe:
     - ✅ `User.Read`
     - ✅ `Mail.Read`
     - ✅ `Mail.ReadWrite`
     - ✅ `offline_access`
   - Klik **"Add permissions"**
   - Klik **"Grant admin consent"** (als je admin bent)

---

### 2. Environment Variables

Maak een `.env` file in de root van je project (als deze nog niet bestaat):

```bash
# Microsoft Graph API
REACT_APP_MICROSOFT_CLIENT_ID=your_client_id_here

# Supabase (bestaand)
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Vervang `your_client_id_here`** met de Application ID uit stap 1.3.

---

### 3. Database Setup

Voer het SQL script uit in je Supabase dashboard:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Kopieer de inhoud van `EMAIL_INTEGRATION_SETUP.sql`
3. Klik **"Run"**

Dit creëert de volgende tabellen:
- `outlook_connections` - Outlook login credentials
- `project_email_filters` - Filter regels per project
- `project_emails` - Gekoppelde emails
- `project_email_attachments` - Email bijlagen

---

### 4. NPM Packages Installeren

```bash
npm install @azure/msal-browser @microsoft/microsoft-graph-client
```

---

## 📱 Gebruik

### Email Filters Instellen

1. **Open een project** in je app
2. **Scroll naar "Email Filters"** sectie
3. **Klik "Filter Toevoegen"**
4. **Kies filter type:**
   - **Keyword:** Zoekt in onderwerp EN inhoud (bv. "Peakpioneers")
   - **Afzender:** Exacte email match (bv. "client@company.com")
   - **Onderwerp:** Zoekt alleen in onderwerp (bv. "Project Update")
5. **Klik "Filter Toevoegen"**

### Emails Bekijken

1. **Emails worden automatisch opgehaald** bij het laden van de project pagina
2. **Klik op een email** om de volledige inhoud te zien
3. **Markeer als gelezen** door erop te klikken
4. **Verwijder emails** met de prullenbak knop

---

## 🔄 Email Synchronisatie

### Automatisch
- Emails worden opgehaald wanneer je een project opent
- Alleen nieuwe emails worden toegevoegd (geen duplicaten)

### Handmatig
- Klik op **"Ververs"** knop in de email lijst

---

## 🎯 Voorbeeld Filters

### Voor "Peakpioneers" Project:
```
Filter Type: Keyword
Waarde: Peakpioneers
```

### Voor Specifieke Client:
```
Filter Type: Afzender
Waarde: john@peakpioneers.com
```

### Voor Project Updates:
```
Filter Type: Onderwerp
Waarde: Weekly Update
```

---

## 🔒 Beveiliging

- **OAuth 2.0:** Veilige authenticatie zonder wachtwoorden
- **Tokens:** Opgeslagen in Supabase met RLS policies
- **Permissions:** Alleen lezen van emails, geen verzenden

---

## 🐛 Troubleshooting

### "Login failed" Error
- Controleer of `REACT_APP_MICROSOFT_CLIENT_ID` correct is ingesteld
- Controleer of redirect URI in Azure matcht met je app URL

### "No emails found"
- Controleer of filters correct zijn ingesteld
- Controleer of je Outlook account emails bevat die matchen
- Klik op "Ververs" om opnieuw te synchroniseren

### "Permission denied"
- Ga naar Azure Portal → API Permissions
- Klik "Grant admin consent for [your organization]"

---

## 📊 Database Schema

```sql
-- Email Filters
project_email_filters
  - id (UUID)
  - project_id (BIGINT) → projects.id
  - filter_type (TEXT) → 'keyword', 'sender', 'subject'
  - filter_value (TEXT)
  - is_active (BOOLEAN)

-- Project Emails
project_emails
  - id (UUID)
  - project_id (BIGINT) → projects.id
  - email_id (TEXT) → Microsoft Graph message ID
  - subject (TEXT)
  - from_email (TEXT)
  - from_name (TEXT)
  - body_preview (TEXT)
  - body_content (TEXT)
  - received_date (TIMESTAMPTZ)
  - is_read (BOOLEAN)
  - has_attachments (BOOLEAN)
  - matched_filters (JSONB)
```

---

## 🎉 Klaar!

Je Outlook email integratie is nu volledig ingesteld. Emails met keywords zoals "Peakpioneers" of van specifieke afzenders worden automatisch gekoppeld aan je projecten!

**Vragen?** Check de console logs voor debugging informatie.
