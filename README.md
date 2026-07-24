# Avanzza OS

Panel de control interno de Avanzza: agentes de IA, suscripciones, uso de tokens, clientes, seguimiento (Kanban), finanzas, productos, paquetes y cotizaciones.

App sin dependencias (Node puro + HTML/CSS/JS). Corre local o en Vercel, con datos compartidos en Supabase y acceso por usuario.

---

## Arquitectura

- **Frontend**: `public/` (HTML/CSS/JS, sin framework).
- **API**: `api/` (funciones serverless; en local las sirve `server.js`).
- **Datos**: capa agnóstica en `lib/store.js`:
  - Si hay variables `SUPABASE_*` → guarda en Supabase (tabla `avanzzaos_state`, compartida entre los 3 usuarios).
  - Si no → archivo local `data/store.json` (modo desarrollo).
- **Acceso**: `lib/auth.js`, contraseña por usuario (cookie de sesión firmada). Si no hay `APP_USERS`, el login se desactiva (modo local).

Los datos del negocio viven **solo en Supabase** (base `avanzza-medla`, tabla aislada `avanzzaos_state`). El repositorio no contiene datos ni contraseñas.

---

## Correr en local

```bash
node server.js
```
Abre http://localhost:4173. Sin variables de entorno usa `data/store.json` y sin login.

Para probar con Supabase + login en local, crea un archivo `.env` (ver `.env.example`) y expórtalo antes de `node server.js`.

---

## Desplegar en Vercel

1. Sube el repo a GitHub (ya hecho: `Ram-glitch03/AvanzzaOS`).
2. En Vercel → **New Project** → importa `Ram-glitch03/AvanzzaOS`. Framework: **Other** (sin build).
3. En **Settings → Environment Variables**, agrega:

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://giufhhgbaurzuhzrjmmc.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(Supabase → Settings → API → `service_role`)* |
   | `APP_USERS` | `Sebastián:clave1,Ramón:clave2,Mariana:clave3` |
   | `APP_SECRET` | *(cadena larga aleatoria)* |

4. **Deploy**. La URL que da Vercel es la que comparten Sebastián, Ramón y Mariana.

> La clave `service_role` es secreta: solo va en las variables de Vercel, nunca en el repo.

---

## Variables de entorno

Ver `.env.example`. Resumen:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — base de datos compartida.
- `APP_USERS` — usuarios y contraseñas (`Nombre:contraseña`, separados por coma).
- `APP_SECRET` — firma de las cookies de sesión.
- `AVZ_TABLE` (opcional) — nombre de la tabla, por defecto `avanzzaos_state`.

---

## Respaldo

Cada usuario puede **Exportar respaldo** (JSON) desde la barra lateral e **Importar** desde Ajustes. Útil para migrar o hacer copias.
