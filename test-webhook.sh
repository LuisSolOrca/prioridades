#!/bin/bash

# Script de prueba para webhook entrante
# URL: https://prioridades-one.vercel.app/api/webhooks/incoming/8a510497022ed3c31ca480b1dc1188d8890c4c852c1977f179f691d60a71b125

echo "🚀 Enviando mensaje de prueba al webhook..."
echo ""

curl -X POST \
  https://prioridades-one.vercel.app/api/webhooks/incoming/8a510497022ed3c31ca480b1dc1188d8890c4c852c1977f179f691d60a71b125 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "🎉 Mensaje de prueba desde curl!\n\nEste es un mensaje enviado desde un script de prueba.\n\n✅ Si ves esto, el webhook está funcionando correctamente.",
    "username": "Sistema de Pruebas",
    "metadata": {
      "test": true,
      "timestamp": "'$(date -Iseconds)'",
      "source": "curl script",
      "version": "1.0"
    }
  }'

echo ""
echo ""
echo "✅ Webhook enviado! Verifica el canal en la app."
