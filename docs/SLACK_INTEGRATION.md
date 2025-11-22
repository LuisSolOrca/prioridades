# Integración con Slack

Esta guía explica cómo configurar la integración organizacional con Slack para recibir notificaciones de prioridades de **todos los usuarios** en canales específicos por proyecto.

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

## 👤 Uso

### Conectar Slack (Solo Administradores)

1. Ir a **Admin** → **Integraciones** (`/admin/integrations`)
2. Click en **"Conectar con Slack"** (solo visible para administradores)
3. Autorizar la app en Slack
4. Serás redirigido de vuelta a la aplicación

**Nota**: La integración es **organizacional**, por lo que solo necesita ser configurada una vez por un administrador.

### Configurar Canales por Proyecto (Todos los usuarios)

1. Ir a la configuración del proyecto
2. En la sección **"Slack"**, seleccionar el canal deseado
3. Guardar cambios

**Nota**: Todos los usuarios autenticados pueden seleccionar canales de Slack para sus proyectos, pero la integración debe estar configurada primero por un admin.

### Desconectar Slack (Solo Administradores)

1. Ir a **Admin** → **Integraciones**
2. Click en **"Desconectar"** (solo visible para administradores)
3. Confirmar la desconexión

**⚠️ Advertencia**: Desconectar Slack deshabilitará las notificaciones para **toda la organización**.

## 📬 Notificaciones que se Envían

La integración envía notificaciones a Slack cuando **cualquier usuario** de la organización:

- ✅ Completa una prioridad
- 💬 Agrega un comentario
- 🔄 Cambia el estado de una prioridad
- 📢 Menciona a alguien en un comentario

Cada notificación incluye:
- Título de la prioridad
- Mensaje descriptivo
- Botón para ver la prioridad en la app

**✨ Beneficio**: Con la integración organizacional, el equipo completo puede ver **toda la actividad** del proyecto en Slack, sin importar qué usuario realice la acción.

## 🔐 Seguridad

- Los tokens de acceso se almacenan encriptados en la base de datos (TODO: implementar encriptación en producción)
- Solo administradores pueden conectar/desconectar la integración organizacional
- Todos los usuarios autenticados pueden configurar canales para sus proyectos
- Cada proyecto requiere que el canal sea configurado explícitamente
- Los mensajes solo se envían a canales autorizados
- Existe una única integración organizacional (no por usuario)

## 🚨 Troubleshooting

### Error: "invalid_client_id"
- Verifica que `SLACK_CLIENT_ID` esté correctamente configurado
- Asegúrate de que la URL de callback coincida exactamente

### Error: "No se encontró integración de Slack"
- Un administrador debe configurar primero la integración organizacional en `/admin/integrations`

### Los mensajes no llegan a Slack
- Verifica que un admin haya configurado la integración organizacional
- Verifica que el proyecto tenga un canal de Slack configurado
- Revisa los logs de Vercel/consola para ver errores específicos

### Error: "Solo administradores pueden configurar Slack"
- Solo usuarios con rol ADMIN pueden conectar/desconectar la integración
- Contacta a un administrador para configurar Slack

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
2. Un administrador debe desconectar y volver a conectar la integración en `/admin/integrations`

## 🔀 Migración de Integraciones por Usuario

Si vienes de una versión anterior donde cada usuario conectaba su propio Slack:

1. Ejecuta el script de migración:
   ```bash
   npx tsx scripts/migrate-slack-to-organizational.ts
   ```

2. El script automáticamente:
   - Selecciona la integración más reciente/activa como base
   - Elimina todas las integraciones antiguas
   - Crea una nueva integración organizacional
   - Preserva el token de acceso y configuración del workspace

3. Después de la migración:
   - Solo administradores verán el botón "Conectar/Desconectar"
   - Todos los usuarios seguirán pudiendo configurar canales en sus proyectos
   - Las notificaciones se enviarán para **todas las acciones**, sin importar el usuario

**Nota**: Es seguro ejecutar el script múltiples veces si es necesario.
