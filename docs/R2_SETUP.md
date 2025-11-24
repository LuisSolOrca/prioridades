# Configuración de Cloudflare R2 para Archivos Adjuntos 📎

Esta guía te explica cómo configurar Cloudflare R2 para el sistema de archivos adjuntos.

## 🌟 ¿Qué es Cloudflare R2?

Cloudflare R2 es un servicio de almacenamiento de objetos compatible con S3, sin costos de egreso (descarga). Perfecto para almacenar archivos adjuntos de tu aplicación.

## 📋 Paso 1: Crear Bucket en R2 (5 minutos)

1. Inicia sesión en [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Ve a **R2** en el menú lateral
3. Clic en **"Create bucket"**
4. Configura:
   - **Bucket name**: `prioridades-attachments` (o el nombre que prefieras)
   - **Location**: Automatic (recomendado)
5. Clic en **"Create bucket"**

## 🔑 Paso 2: Crear API Token (3 minutos)

1. En la página de R2, ve a **"Manage R2 API Tokens"**
2. Clic en **"Create API token"**
3. Configura:
   - **Token name**: `prioridades-app`
   - **Permissions**:
     - ✅ Object Read & Write
   - **TTL**: No expiry (o el tiempo que prefieras)
   - **Bucket**: Selecciona tu bucket o "Apply to all buckets"
4. Clic en **"Create API token"**
5. **¡IMPORTANTE!** Copia y guarda:
   - **Access Key ID** (ejemplo: `a1b2c3d4e5f6g7h8`)
   - **Secret Access Key** (ejemplo: `z9y8x7w6v5u4t3s2r1`)
   - ⚠️ No podrás volver a ver el Secret Access Key después de cerrar esta pantalla

## 📝 Paso 3: Obtener Account ID

1. En el dashboard de Cloudflare, ve a la sección de **R2**
2. Tu **Account ID** está visible en la URL o en la sección de configuración
   - URL ejemplo: `https://dash.cloudflare.com/{ACCOUNT_ID}/r2`
   - O cópialo del panel de configuración de R2

## 🔧 Paso 4: Configurar Variables de Entorno

### Opción A: Vercel (Producción)

1. Ve a [Vercel Dashboard](https://vercel.com)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega estas variables:
   ```
   R2_ACCOUNT_ID = tu-account-id-aqui
   R2_ACCESS_KEY_ID = tu-access-key-id-aqui
   R2_SECRET_ACCESS_KEY = tu-secret-access-key-aqui
   R2_BUCKET_NAME = prioridades-attachments
   ```
5. Marca **Production**, **Preview** y **Development**
6. Clic en **Save**
7. **Redeploy** tu aplicación

### Opción B: Archivo .env (Desarrollo Local)

1. Abre el archivo `.env` en la raíz del proyecto
2. Agrega estas líneas:
   ```env
   R2_ACCOUNT_ID=tu-account-id-aqui
   R2_ACCESS_KEY_ID=tu-access-key-id-aqui
   R2_SECRET_ACCESS_KEY=tu-secret-access-key-aqui
   R2_BUCKET_NAME=prioridades-attachments
   ```
3. Guarda el archivo
4. Reinicia el servidor: `npm run dev`

## ✅ Paso 5: Verificar Configuración

1. Abre tu aplicación
2. Ve a cualquier proyecto → Pestaña **"Archivos"**
3. Intenta subir un archivo de prueba
4. Si todo está bien:
   - ✅ El archivo se sube correctamente
   - ✅ Puedes verlo en la lista
   - ✅ Puedes descargarlo
   - ✅ Aparece en tu bucket de R2

## 🎯 Funcionalidades Disponibles

### En Chat
- Adjuntar archivos a mensajes
- Previsualización de archivos adjuntos
- Descargar archivos desde mensajes

### En Pestaña de Archivos
- Ver todos los archivos del proyecto
- Buscar archivos por nombre
- Filtrar por tipo (imágenes, documentos, videos, audio)
- Subir nuevos archivos
- Descargar archivos
- Eliminar archivos

## 📊 Límites y Cuotas

**Límites por defecto:**
- Tamaño máximo por archivo: **50 MB**
- Sin límite de cantidad de archivos

**R2 Free Tier (Cloudflare):**
- 10 GB de almacenamiento gratis al mes
- Sin costos de egreso (descargas ilimitadas gratis)
- 1 millón de Class A operations gratis
- 10 millones de Class B operations gratis

## 🔍 Debugging

### Error: "El almacenamiento de archivos no está configurado"

**Solución:**
1. Verifica que las 4 variables de entorno estén configuradas
2. Si estás en Vercel, asegúrate de haber hecho **Redeploy** después de agregar las variables
3. Verifica que los valores sean correctos (sin espacios extra)

### Error al subir archivo

**Posibles causas:**
1. **Access Key incorrecta**: Verifica R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY
2. **Bucket no existe**: Verifica que R2_BUCKET_NAME coincida con el nombre real
3. **Permisos insuficientes**: Asegúrate de que el API token tenga permisos de Read & Write
4. **Archivo muy grande**: Máximo 50MB por archivo

### Verificar endpoint

Puedes verificar que R2 esté configurado llamando:
```bash
curl https://tu-dominio.vercel.app/api/projects/{projectId}/attachments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 💰 Costos

**Cloudflare R2 es muy económico:**
- Sin costos de egreso (descargas gratis)
- Solo pagas almacenamiento después del free tier
- ~$0.015 USD por GB al mes de almacenamiento
- Ejemplo: 100 GB = $1.50 USD/mes

**Comparación:**
- AWS S3: ~$0.023/GB + costos de egreso (muy caro)
- Cloudflare R2: ~$0.015/GB + $0 de egreso ✅

## 🔒 Seguridad

✅ **Implementado:**
- Autenticación requerida para subir/descargar
- URLs firmadas con expiración (1 hora)
- Validación de tamaño de archivo
- Soft delete (archivos marcados como eliminados, no borrados permanentemente)
- Solo el que subió o admin pueden eliminar

## 🚀 Próximos Pasos

Después de configurar R2, puedes:
1. Subir archivos desde el chat
2. Organizar archivos en la pestaña de Archivos
3. Buscar y filtrar archivos por tipo
4. Compartir archivos con el equipo
5. Mantener historial completo de archivos del proyecto

---

**¡Listo!** Ya tienes almacenamiento de archivos con Cloudflare R2 🎉

Si tienes problemas, revisa la sección de Debugging o contacta al equipo de soporte.
