# Ejemplos de Webhook con curl

## 🚀 Ejecutar Script de Prueba

```bash
./test-webhook.sh
```

## 📋 Ejemplos Adicionales

### Ejemplo 1: Mensaje Simple

```bash
curl -X POST \
  https://prioridades-one.vercel.app/api/webhooks/incoming/8a510497022ed3c31ca480b1dc1188d8890c4c852c1977f179f691d60a71b125 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hola desde un sistema externo!"
  }'
```

### Ejemplo 2: Notificación de Build

```bash
curl -X POST \
  https://prioridades-one.vercel.app/api/webhooks/incoming/8a510497022ed3c31ca480b1dc1188d8890c4c852c1977f179f691d60a71b125 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "✅ Build #1234 completado exitosamente\n\nBranch: main\nCommit: abc123\nDuración: 2m 30s",
    "username": "CI/CD Pipeline",
    "metadata": {
      "buildNumber": "1234",
      "status": "success",
      "branch": "main",
      "commit": "abc123",
      "duration": "2m 30s"
    }
  }'
```

### Ejemplo 3: Alerta de Monitoreo

```bash
curl -X POST \
  https://prioridades-one.vercel.app/api/webhooks/incoming/8a510497022ed3c31ca480b1dc1188d8890c4c852c1977f179f691d60a71b125 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "⚠️ ALERTA: CPU al 85%\n\nServidor: prod-server-01\nFecha: 2025-01-23 14:30:00",
    "username": "Sistema de Monitoreo",
    "metadata": {
      "severity": "warning",
      "server": "prod-server-01",
      "metric": "cpu_usage",
      "value": 85,
      "threshold": 80
    }
  }'
```

### Ejemplo 4: Deployment Notification

```bash
curl -X POST \
  https://prioridades-one.vercel.app/api/webhooks/incoming/8a510497022ed3c31ca480b1dc1188d8890c4c852c1977f179f691d60a71b125 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "🚀 Deploy a producción completado\n\n**Versión:** v2.3.1\n**Ambiente:** Production\n**Deployed by:** Luis\n**Status:** Success",
    "username": "Vercel",
    "metadata": {
      "version": "v2.3.1",
      "environment": "production",
      "deployedBy": "Luis",
      "url": "https://prioridades-one.vercel.app",
      "timestamp": "2025-01-23T14:30:00Z"
    }
  }'
```

### Ejemplo 5: Recordatorio

```bash
curl -X POST \
  https://prioridades-one.vercel.app/api/webhooks/incoming/8a510497022ed3c31ca480b1dc1188d8890c4c852c1977f179f691d60a71b125 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "📅 Recordatorio: Reunión en 15 minutos\n\nTema: Sprint Planning\nSala: Zoom\nParticipantes: Todo el equipo",
    "username": "Google Calendar",
    "metadata": {
      "eventType": "reminder",
      "meetingTitle": "Sprint Planning",
      "startTime": "15:00",
      "duration": "60 min"
    }
  }'
```

## 🔍 Verificar Estado del Endpoint

```bash
curl https://prioridades-one.vercel.app/api/webhooks/teams-bridge
```

Debería responder:
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

## 💡 Notas

- El campo `content` es **requerido**
- Los campos `username` y `metadata` son **opcionales**
- El contenido puede incluir markdown y emojis
- Los saltos de línea se respetan con `\n`
- La metadata se muestra en una sección expandible en la app
