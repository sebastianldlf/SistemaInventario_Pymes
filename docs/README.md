# Tarima móvil: cómo correr todo

Migración a React Native (Expo) de la web [SistemaInventario_Pymes](https://github.com/sebastianldlf/SistemaInventario_Pymes).

| Carpeta | Qué es |
|---|---|
| `backend/` | Clon de la web (Next.js 14 + Prisma). Solo se agregaron `src/app/api/**` y `scripts/demo-data.ts`. |
| `mobile/` | App Expo (SDK 58, Expo Router, TypeScript). |
| `docs/` | Este README, `api.md`, `offline.md`, `hallazgos.md`. |

Requisitos: Node 20+ (probado con Node 24) y Expo Go en el teléfono, con el teléfono y el PC en la misma red Wi-Fi.

## 1. Base de datos (Supabase)

1. Crea un proyecto en <https://supabase.com/dashboard> (región cercana, guarda la contraseña de la base).
2. En el proyecto: **Connect → ORMs → Prisma**. Copia las dos cadenas que muestra.
3. Escribe `backend/.env` (está en `.gitignore`, nunca lo subas):

   ```env
   # Pooler en modo transacción (puerto 6543): lo usa la app
   DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
   # Pooler en modo sesión (puerto 5432): lo usa prisma db push
   DIRECT_URL="postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres"
   # Opcional: si se define, la API exige el header x-api-key
   # API_KEY="<una-clave-larga>"
   ```

   > El `.env` que viene en el repo original apunta a un proyecto que ya no existe (ver `hallazgos.md`).

## 2. Backend

```bash
cd backend
# PowerShell:  $env:CYPRESS_INSTALL_BINARY="0"; $env:CHROMEDRIVER_SKIP_DOWNLOAD="true"; npm install
CYPRESS_INSTALL_BINARY=0 CHROMEDRIVER_SKIP_DOWNLOAD=true npm install   # bash
npx prisma generate
npm run db:push      # crea las tablas (solo en una base nueva)
npm run db:seed      # 3 categorías, 2 almacenes, 5 productos sin stock
npx next dev -H 0.0.0.0 -p 3002
```

En otra terminal, con el servidor corriendo, carga el stock de ejemplo (se niega a correr si el Kardex ya tiene filas):

```bash
cd backend
npx tsx scripts/demo-data.ts        # DEMO_API_URL por defecto: http://127.0.0.1:3002
```

Usamos el puerto **3002** porque 3000 y 3001 pueden estar ocupados por otros proyectos. `-H 0.0.0.0` permite que el teléfono lo alcance.
Comprueba que responde: `curl http://127.0.0.1:3002/api/inventory`.

### Firewall de Windows

Abre el puerto una vez (PowerShell como administrador):

```powershell
New-NetFirewallRule -DisplayName "Tarima API 3002" -Direction Inbound -Protocol TCP -LocalPort 3002 -Action Allow -Profile Private
```

La red Wi-Fi debe estar marcada como **Privada** en Windows.

## 3. App móvil

```bash
cd mobile
npm install
cp .env.example .env     # y edita EXPO_PUBLIC_API_URL
npx expo start           # escanea el QR con Expo Go (Android) o la cámara (iOS)
```

`EXPO_PUBLIC_API_URL` según dónde corra la app:

| Dónde | Valor |
|---|---|
| Teléfono físico (Expo Go) | `http://<IP-LAN-del-PC>:3002` (IP con `ipconfig`, adaptador Wi-Fi) |
| Emulador Android | `http://10.0.2.2:3002` |
| Simulador iOS | `http://localhost:3002` |

`localhost` no sirve desde el teléfono. Tras cambiar `.env`, reinicia con `npx expo start --clear`.

### Si iOS bloquea HTTP: túnel HTTPS

Expo Go suele permitir HTTP en desarrollo. Si en iOS ves "No se pudo conectar con el servidor" y desde el navegador del iPhone `http://<IP>:3002/api/inventory` tampoco carga, usa un túnel:

```bash
# Cloudflare (sin cuenta)
npx cloudflared tunnel --url http://localhost:3002
# o ngrok (requiere cuenta y authtoken)
ngrok http 3002
```

Copia la URL `https://…` que imprime en `EXPO_PUBLIC_API_URL` y reinicia Expo con `--clear`. Si el backend usa `API_KEY`, define también `EXPO_PUBLIC_API_KEY`. Ojo: esa clave queda dentro del bundle, solo sirve como barrera mínima.

## 4. Verificación

```bash
cd backend && npx tsc --noEmit
cd mobile  && npx tsc --noEmit && npx expo-doctor
```
