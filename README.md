# 🎯 Sistema de Prioridades Semanales

Aplicación web para gestión de prioridades semanales alineadas a iniciativas estratégicas empresariales.

## 📋 Características

- ✅ Autenticación segura con NextAuth.js
- ✅ Gestión de usuarios y roles (Admin/Usuario)
- ✅ Seguimiento semanal de prioridades
- ✅ Alineación a iniciativas estratégicas
- ✅ Dashboard con métricas en tiempo real
- ✅ Analítica e históricos
- ✅ Detección de prioridades abandonadas
- ✅ MongoDB Atlas como base de datos
- ✅ Desplegable en Vercel

## 🚀 Deploy Rápido en Vercel

### Paso 1: Configurar MongoDB Atlas

1. Ve a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea una cuenta gratuita (si no tienes)
3. Crea un nuevo cluster (opción gratuita M0)
4. Ve a **Database Access** y crea un usuario de base de datos
5. Ve a **Network Access** y agrega tu IP (o 0.0.0.0/0 para permitir desde cualquier lugar)
6. Ve a **Database** → **Connect** → **Connect your application**
7. Copia la cadena de conexión, se verá así:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
8. Reemplaza `<username>` y `<password>` con tus credenciales
9. Agrega el nombre de tu base de datos después de `.net/`, ejemplo:
   ```
   mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/prioridades-app?retryWrites=true&w=majority
   ```

### Paso 2: Deploy en Vercel

#### Opción A: Desde GitHub (Recomendado)

1. Sube este proyecto a un repositorio de GitHub
2. Ve a [Vercel](https://vercel.com)
3. Haz clic en **"Import Project"**
4. Selecciona tu repositorio de GitHub
5. Configura las variables de entorno:
   - `MONGODB_URI`: Tu cadena de conexión de MongoDB Atlas
   - `NEXTAUTH_URL`: https://tu-app.vercel.app (se completará después del primer deploy)
   - `NEXTAUTH_SECRET`: Genera uno con: `openssl rand -base64 32`
   - `ADMIN_INITIAL_PASSWORD`: GCPGlobaldsdsd323232
6. Haz clic en **"Deploy"**

#### Opción B: Desde Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login en Vercel
vercel login

# Deploy
vercel

# Configurar variables de entorno en el dashboard de Vercel
```

### Paso 3: Inicializar la Base de Datos

Después del primer deploy, necesitas inicializar la base de datos:

**Opción 1: Desde tu local (recomendado)**

```bash
# Instalar dependencias
npm install

# Crear archivo .env con tus variables
cp .env.example .env

# Editar .env con tus valores reales

# Instalar tsx para ejecutar TypeScript
npm install -D tsx

# Ejecutar script de inicialización
npx tsx scripts/init-db.ts
```

**Opción 2: Desde Vercel Serverless Function**

Crea una función serverless temporal en `/app/api/init/route.ts` y accede a ella una sola vez.

### Paso 4: Primer Login

1. Ve a tu aplicación desplegada: `https://tu-app.vercel.app`
2. Inicia sesión con:
   - **Email**: `admin@empresa.com`
   - **Password**: `GCPGlobaldsdsd323232`
3. **IMPORTANTE**: Cambia inmediatamente la contraseña del administrador

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores

# Inicializar base de datos
npx tsx scripts/init-db.ts

# Ejecutar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
prioridades-app/
├── app/                    # Rutas de Next.js (App Router)
│   ├── api/               # API Routes
│   │   ├── auth/         # NextAuth
│   │   ├── users/        # CRUD usuarios
│   │   ├── initiatives/  # CRUD iniciativas
│   │   └── priorities/   # CRUD prioridades
│   ├── dashboard/        # Dashboard principal
│   ├── login/            # Página de login
│   └── layout.tsx        # Layout principal
├── components/            # Componentes React
├── lib/                   # Utilidades
│   └── mongodb.ts        # Conexión a MongoDB
├── models/                # Modelos de Mongoose
│   ├── User.ts
│   ├── StrategicInitiative.ts
│   └── Priority.ts
├── scripts/               # Scripts de utilidad
│   └── init-db.ts        # Inicialización DB
├── .env.example          # Ejemplo de variables de entorno
└── README.md             # Este archivo
```

## 🔐 Variables de Entorno

Crea un archivo `.env` en la raíz con:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/prioridades-app?retryWrites=true&w=majority

# NextAuth (Producción)
NEXTAUTH_URL=https://tu-app.vercel.app
NEXTAUTH_SECRET=tu-secret-generado-con-openssl

# Admin Password (solo primera vez)
ADMIN_INITIAL_PASSWORD=GCPGlobaldsdsd323232
```

### Generar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## 🔑 Credenciales Iniciales

Después de ejecutar el script de inicialización:

- **Email**: admin@empresa.com
- **Password**: GCPGlobaldsdsd323232

⚠️ **IMPORTANTE**: Cambia esta contraseña inmediatamente después del primer login.

## 🎨 Tecnologías Utilizadas

- **Framework**: Next.js 14 (App Router)
- **Base de Datos**: MongoDB Atlas
- **ORM**: Mongoose
- **Autenticación**: NextAuth.js
- **Estilos**: Tailwind CSS
- **Lenguaje**: TypeScript
- **Deployment**: Vercel

## 📝 Funcionalidades Principales

### Para Administradores

- Gestionar usuarios (crear, editar, activar/desactivar)
- Gestionar iniciativas estratégicas
- Ver dashboard completo del equipo
- Acceder a analítica de todos los usuarios
- Ver histórico completo

### Para Usuarios

- Crear y editar sus propias prioridades (máximo recomendado: 5 por semana)
- Alinear prioridades a iniciativas estratégicas
- Actualizar estado y porcentaje de avance
- Ver su propia analítica e histórico
- Ver dashboard del equipo (solo lectura)

## 🆘 Troubleshooting

### Error: "Cannot connect to MongoDB"

1. Verifica que tu cadena de conexión sea correcta
2. Asegúrate de que tu IP esté en la whitelist de MongoDB Atlas
3. Verifica que el usuario de BD tenga permisos adecuados

### Error: "NEXTAUTH_SECRET is not defined"

1. Genera un secret con: `openssl rand -base64 32`
2. Agrégalo a las variables de entorno en Vercel

### La aplicación no se ve bien en producción

1. Verifica que `npm run build` funcione sin errores
2. Checa los logs en Vercel Dashboard

## 📚 Próximos Pasos

Después del deploy exitoso:

1. ✅ Cambiar contraseña del administrador
2. ✅ Crear usuarios del equipo
3. ✅ Verificar/ajustar iniciativas estratégicas
4. ✅ Configurar recordatorios semanales (opcional)
5. ✅ Personalizar colores y branding (opcional)

## 🤝 Soporte

Para problemas o preguntas, revisa:
- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de MongoDB Atlas](https://docs.atlas.mongodb.com/)
- [Documentación de Next.js](https://nextjs.org/docs)

## 📄 Licencia

Este proyecto es privado y confidencial.

---

**Desarrollado con ❤️ para optimizar el seguimiento de prioridades estratégicas**

