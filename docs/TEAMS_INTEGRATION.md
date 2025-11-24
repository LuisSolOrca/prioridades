# Integración con Microsoft Teams 🚀

Esta guía te explica cómo conectar Microsoft Teams con tu aplicación para recibir mensajes automáticamente.

## 📋 Paso 1: Crear Webhook Entrante en la App (2 minutos)

1. Abre tu aplicación → Ve a cualquier proyecto
2. Clic en la pestaña **"Webhooks"**
3. Clic en **"Nuevo Webhook"**
4. Configura:
   - **Nombre**: `Microsoft Teams`
   - **Tipo**: `Entrante`
   - **Descripción**: `Mensajes desde Microsoft Teams`
   - **Canal**: Selecciona el canal donde quieres que aparezcan los mensajes
5. Clic en **"Crear Webhook"**
6. **¡IMPORTANTE!** Copia el **Secret Token** (el código largo que aparece)
   - Ejemplo: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

## 🔧 Paso 2: Configurar Variables de Entorno (3 minutos)

### Opción A: Vercel (Recomendado si usas Vercel)

1. Ve a [Vercel Dashboard](https://vercel.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega esta variable:
   - **Name**: `TEAMS_TARGET_WEBHOOK_SECRET`
   - **Value**: [Pega el Secret Token que copiaste en Paso 1]
   - **Environments**: Marcar Production, Preview y Development
5. Clic en **Save**
6. Ve a **Deployments** → Click en los **⋯** del último deploy → **Redeploy**

### Opción B: Archivo .env local (Para desarrollo)

1. Abre el archivo `.env` en la raíz del proyecto
2. Agrega esta línea:
   ```
   TEAMS_TARGET_WEBHOOK_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
   ```
   (Reemplaza con tu Secret Token real)
3. Guarda el archivo
4. Reinicia el servidor: `npm run dev`

### Variable Opcional (Mayor Seguridad)

Si quieres validación HMAC adicional, también puedes configurar:
- **Name**: `TEAMS_WEBHOOK_SECRET`
- **Value**: [El Security Token que Teams te dará en el Paso 3]

## 📱 Paso 3: Configurar Outgoing Webhook en Teams (5 minutos)

1. Abre **Microsoft Teams**
2. Ve al canal donde quieres usar el bot
3. Clic en **⋯** (tres puntos) junto al nombre del canal
4. Selecciona **"Conectores"** o **"Workflows"** → **"Configurar"**
5. Busca **"Outgoing Webhook"** en la lista
6. Clic en **"Configurar"** o **"Agregar"**

7. Completa el formulario:
   - **Nombre**: `PrioridadesBot` (o el nombre que prefieras)
   - **Callback URL**:
     ```
     https://tu-dominio.vercel.app/api/webhooks/teams-bridge
     ```
     (Reemplaza `tu-dominio` con tu URL real de Vercel)
   - **Descripción**: `Bot para enviar mensajes a Prioridades App`
   - Opcional: Sube una imagen/icono del bot

8. Clic en **"Crear"**

9. **¡MUY IMPORTANTE!** Teams te mostrará un **Security Token**:
   - Cópialo y guárdalo (es como: `rJ7Q9qKv...`)
   - Si configuraste `TEAMS_WEBHOOK_SECRET`, pégalo ahí
   - Si no, solo guárdalo por si lo necesitas después

10. Clic en **"Listo"**

## ✅ Paso 4: Probar la Integración (1 minuto)

1. En tu canal de Teams, escribe un mensaje mencionando al bot:
   ```
   @PrioridadesBot Hola! Este es un mensaje de prueba 🚀
   ```

2. Presiona Enter

3. **¡Verifica!**:
   - Deberías ver una respuesta del bot: "✅ Mensaje recibido y publicado en el canal"
   - Ve a tu aplicación → El canal que configuraste
   - Deberías ver una **card morada** con tu mensaje!

## 🎯 Uso Diario

Para enviar mensajes desde Teams a tu app:

```
@PrioridadesBot Tu mensaje aquí
```

**Ejemplos:**
- `@PrioridadesBot Recordatorio: Reunión a las 3pm`
- `@PrioridadesBot Build #1234 completado exitosamente`
- `@PrioridadesBot ⚠️ Incidente en producción - servidor caído`

Todos aparecerán en tu canal con una bonita card morada! 💜

## 🔍 Debugging

### El mensaje no llega a la app:

1. **Verifica la URL del webhook**:
   ```
   https://tu-dominio.vercel.app/api/webhooks/teams-bridge
   ```
   Ábrela en el navegador, deberías ver:
   ```json
   {
     "status": "ok",
     "message": "Teams bridge endpoint está activo",
     "configured": {
       "teamsSecret": false,
       "targetSecret": true
     }
   }
   ```
   - `targetSecret` debe ser `true`

2. **Verifica las variables de entorno en Vercel**:
   - Settings → Environment Variables
   - Debe existir `TEAMS_TARGET_WEBHOOK_SECRET`
   - Si la agregaste recientemente, haz **Redeploy**

3. **Revisa los logs en Vercel**:
   - Ve a tu proyecto en Vercel
   - Tab "Deployments" → Click en el último
   - Tab "Functions" → Busca errores

### El bot no responde en Teams:

1. Verifica que escribiste `@PrioridadesBot` (el nombre exacto que configuraste)
2. Asegúrate de escribir algo después del @mention
3. Revisa que la URL del Callback esté correcta en el Outgoing Webhook

### Error 500 en Vercel:

- Probablemente `TEAMS_TARGET_WEBHOOK_SECRET` no está configurado
- Agrega la variable y haz Redeploy

## 📊 Características

✅ **Sin límites** - Envía todos los mensajes que quieras
✅ **Gratis** - No usa servicios externos de pago
✅ **Rápido** - Menos de 1 segundo de latencia
✅ **Seguro** - Validación HMAC opcional
✅ **Bonito** - Card morada personalizada en tu app

## 🎨 Personalización

El mensaje aparece con:
- **Nombre del usuario de Teams** como autor
- **Contenido del mensaje** formateado
- **Metadata** con canal, timestamp, etc.
- **Card morada** distintiva

## 🆘 Soporte

Si algo no funciona:
1. Revisa los pasos anteriores
2. Verifica las variables de entorno
3. Checa los logs en Vercel
4. Prueba la URL del endpoint directamente

---

**¡Listo!** Ya tienes Teams integrado con tu app 🎉
