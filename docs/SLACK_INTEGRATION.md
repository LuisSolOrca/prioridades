# Integración con Slack

Esta guía explica cómo configurar la integración con Slack para recibir notificaciones de prioridades en canales específicos por proyecto.

## 📋 Requisitos Previos

- Tener permisos de administrador en el workspace de Slack
- Acceso a [api.slack.com](https://api.slack.com/apps)

## 🔧 Configuración de la App de Slack

### 1. Crear una Slack App

1. Ve a [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click en **"Create New App"**
3. Selecciona **"From scratch"**
4. Nombre de la app: `Prioridades App` (o el que prefieras)
5. Selecciona tu workspace
6. Click en **"Create App"**

### 2. Configurar OAuth & Permissions

1. En el menú lateral, ve a **"OAuth & Permissions"**
2. En la sección **"Scopes"**, agrega los siguientes **Bot Token Scopes**:
   - `channels:read` - Para leer la lista de canales
   - `chat:write` - Para enviar mensajes
   - `users:read` - Para leer información del usuario

3. En la sección **"Redirect URLs"**, agrega:
   ```
   https://tu-dominio.vercel.app/api/slack/callback
   ```
   Para desarrollo local:
   ```
   http://localhost:3000/api/slack/callback
   ```

4. Click en **"Save URLs"**

### 3. Obtener Credenciales

1. Ve a **"Basic Information"** en el menú lateral
2. En **"App Credentials"**, encontrarás:
   - **Client ID** - Copia este valor
   - **Client Secret** - Click en "Show" y copia este valor

### 4. Configurar Variables de Entorno

Agrega las siguientes variables en tu archivo `.env` o en Vercel:

```bash
# Slack Integration
SLACK_CLIENT_ID=tu_client_id_aqui
SLACK_CLIENT_SECRET=tu_client_secret_aqui
```

### 5. Instalar la App en tu Workspace (Opcional)

Si quieres probar inmediatamente:

1. Ve a **"Install App"** en el menú lateral
2. Click en **"Install to Workspace"**
3. Autoriza la app

## 👤 Uso por Usuarios

### Conectar Slack

1. Ir a **Configuración** → **Integraciones** (`/settings/integrations`)
2. Click en **"Conectar con Slack"**
3. Autorizar la app en Slack
4. Serás redirigido de vuelta a la aplicación

### Configurar Canales por Proyecto

1. Ir a la configuración del proyecto
2. En la sección **"Slack"**, seleccionar el canal deseado
3. Guardar cambios

### Desconectar Slack

1. Ir a **Configuración** → **Integraciones**
2. Click en **"Desconectar"**

## 📬 Notificaciones que se Envían

La integración envía notificaciones a Slack cuando:

- ✅ Se completa una prioridad
- 💬 Se agrega un comentario
- 🔄 Cambia el estado de una prioridad
- 📢 Se menciona a alguien en un comentario

Cada notificación incluye:
- Título de la prioridad
- Mensaje descriptivo
- Botón para ver la prioridad en la app

## 🔐 Seguridad

- Los tokens de acceso se almacenan encriptados en la base de datos
- Solo usuarios autenticados pueden conectar Slack
- Cada proyecto requiere que el canal sea configurado explícitamente
- Los mensajes solo se envían a canales autorizados

## 🚨 Troubleshooting

### Error: "invalid_client_id"
- Verifica que `SLACK_CLIENT_ID` esté correctamente configurado
- Asegúrate de que la URL de callback coincida exactamente

### Error: "No se encontró integración de Slack"
- El usuario debe conectar primero su cuenta de Slack en `/settings/integrations`

### Los mensajes no llegan a Slack
- Verifica que el proyecto tenga un canal de Slack configurado
- Verifica que el usuario tenga su integración de Slack activa
- Revisa los logs de Vercel para ver errores específicos

### Error: "missing_scope"
- Revisa que la app de Slack tenga todos los scopes necesarios
- Puede ser necesario reinstalar la app en el workspace

## 📊 API Endpoints

- `GET /api/slack/auth` - Inicia OAuth flow
- `GET /api/slack/callback` - Callback de OAuth
- `GET /api/slack/status` - Estado de integración del usuario
- `GET /api/slack/channels` - Lista de canales disponibles
- `POST /api/slack/disconnect` - Desconecta integración

## 🔄 Actualización de la App

Si modificas los scopes:

1. Actualiza los scopes en la configuración de la app
2. Los usuarios deben reconectar su integración para obtener los nuevos permisos
3. Pide a los usuarios que desconecten y vuelvan a conectar en `/settings/integrations`
