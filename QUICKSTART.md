# ⚡ GUÍA RÁPIDA DE DEPLOYMENT

## 📦 Contenido del Paquete

```
prioridades-app/
├── 📄 README.md              ← Documentación completa
├── 📄 DEPLOYMENT.md          ← Guía paso a paso (LEER PRIMERO)
├── 📄 package.json           ← Dependencias del proyecto
├── 📄 .env.example           ← Plantilla de variables de entorno
├── 📁 app/                   ← Aplicación Next.js
├── 📁 lib/                   ← Utilidades (conexión DB)
├── 📁 models/                ← Modelos de base de datos
└── 📁 scripts/               ← Script de inicialización
```

## 🚀 Deployment en 3 Pasos

### 1️⃣ MongoDB Atlas (10 min)
```
https://mongodb.com/cloud/atlas
→ Crear cuenta
→ Crear cluster gratis (M0)
→ Crear usuario de BD
→ Agregar 0.0.0.0/0 a Network Access
→ Copiar cadena de conexión
```

### 2️⃣ Vercel (10 min)
```
https://vercel.com
→ Conectar con GitHub
→ Importar repositorio
→ Agregar variables de entorno:
   • MONGODB_URI
   • NEXTAUTH_SECRET (generar con openssl rand -base64 32)
   • NEXTAUTH_URL
   • ADMIN_INITIAL_PASSWORD
→ Deploy
```

### 3️⃣ Inicializar DB (5 min)
```bash
# En tu computadora:
npm install
cp .env.example .env
# Editar .env con tus valores
npm install -D tsx
npx tsx scripts/init-db.ts
```

## 🔑 Credenciales Iniciales

```
Email:    admin@empresa.com
Password: GCPGlobaldsdsd323232
```

⚠️ **CAMBIAR CONTRASEÑA INMEDIATAMENTE DESPUÉS DEL PRIMER LOGIN**

## 📋 Variables de Entorno Requeridas

```env
MONGODB_URI=mongodb+srv://usuario:pass@cluster.mongodb.net/prioridades-app?retryWrites=true&w=majority
NEXTAUTH_URL=https://tu-app.vercel.app
NEXTAUTH_SECRET=tu-secret-de-32-caracteres
ADMIN_INITIAL_PASSWORD=GCPGlobaldsdsd323232
```

## ✅ Checklist Post-Deployment

- [ ] Login funciona
- [ ] Cambiaste contraseña de admin
- [ ] Creaste usuarios del equipo
- [ ] Verificaste iniciativas estratégicas
- [ ] Probaste crear una prioridad
- [ ] Dashboard muestra datos correctamente
- [ ] No hay errores en consola

## 📚 Documentos Importantes

1. **DEPLOYMENT.md** - Guía detallada paso a paso con screenshots
2. **README.md** - Documentación técnica completa
3. **Este archivo** - Referencia rápida

## 🆘 Problemas Comunes

| Error | Solución |
|-------|----------|
| Cannot connect to MongoDB | Verifica Network Access en Atlas (0.0.0.0/0) |
| Login failed | Ejecuta script de inicialización otra vez |
| Build failed en Vercel | Verifica que todas las variables de entorno estén configuradas |
| 404 en rutas | Verifica que el deploy terminó exitosamente |

## 🔧 Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Inicializar BD
npx tsx scripts/init-db.ts

# Generar NEXTAUTH_SECRET
openssl rand -base64 32
```

## 📞 Stack Tecnológico

- **Frontend**: Next.js 14 + React + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas
- **Auth**: NextAuth.js
- **Deploy**: Vercel

## 🎯 Flujo de Trabajo Semanal

```
Lunes AM
├─ Reunión de seguimiento
├─ Revisar prioridades anteriores
└─ Cargar nuevas prioridades

Lunes-Viernes
├─ Actualizar estado de prioridades
├─ Ajustar % de completado
└─ Marcar bloqueadores

Viernes PM
└─ Sistema cierra semana automáticamente
```

## 🎨 Roles y Permisos

### Administrador
- ✅ Gestionar usuarios
- ✅ Gestionar iniciativas
- ✅ Ver todo el dashboard
- ✅ Acceso completo a analytics
- ✅ Ver histórico completo

### Usuario
- ✅ Crear/editar sus prioridades
- ✅ Ver dashboard del equipo
- ✅ Ver su propia analytics
- ✅ Ver su propio histórico
- ❌ No puede ver/editar prioridades de otros

## 🌟 Características Principales

1. **Dashboard en Tiempo Real**
   - Visualización de prioridades por usuario
   - Métricas de cumplimiento
   - Estados por color

2. **Gestión de Prioridades**
   - Máximo 5 recomendadas (warning si más)
   - 4 estados: En Tiempo, En Riesgo, Bloqueado, Completado
   - % de completado
   - Alineación obligatoria a iniciativas

3. **Analítica Avanzada**
   - Rendimiento por usuario
   - Distribución por iniciativa
   - Detección de prioridades abandonadas
   - Histórico completo

4. **Seguridad**
   - Autenticación con NextAuth
   - Contraseñas hasheadas con bcrypt
   - Roles y permisos
   - Variables de entorno seguras

## 💡 Tips de Uso

- Mantén máximo 5 prioridades por semana para mejor foco
- Actualiza el estado diariamente
- Revisa prioridades abandonadas semanalmente
- Usa colores de iniciativas para identificación rápida
- Backupea MongoDB Atlas regularmente (automático en plan gratis)

## 📈 Próximos Pasos Después del Deploy

1. Configurar dominio personalizado (opcional)
2. Agregar logo de la empresa
3. Configurar notificaciones por email (futuro)
4. Integrar con Slack/Teams (futuro)
5. Generar reportes PDF automáticos (futuro)

---

**¿Listo para empezar?**

👉 Lee **DEPLOYMENT.md** para instrucciones detalladas

👉 O sigue los 3 pasos de esta guía rápida

**¡Buena suerte! 🚀**
