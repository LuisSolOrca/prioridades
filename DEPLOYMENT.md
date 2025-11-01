# 🚀 GUÍA DE DEPLOYMENT PASO A PASO

## PASO 1: Configurar MongoDB Atlas (10 minutos)

### 1.1 Crear cuenta y cluster
1. Ve a https://www.mongodb.com/cloud/atlas/register
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto llamado "Prioridades App"
4. Crea un cluster gratuito (M0 Sandbox)
   - Provider: AWS
   - Region: Elige la más cercana a tus usuarios
   - Nombre del cluster: "Cluster0" (por defecto)

### 1.2 Configurar usuario de base de datos
1. En el menú izquierdo, ve a **Database Access**
2. Click en **"Add New Database User"**
3. Método de autenticación: **Password**
4. Username: `prioridadesadmin`
5. Password: Genera una contraseña segura (guárdala)
6. Database User Privileges: **"Atlas admin"**
7. Click **"Add User"**

### 1.3 Configurar acceso de red
1. En el menú izquierdo, ve a **Network Access**
2. Click en **"Add IP Address"**
3. Click en **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Esto permite que Vercel se conecte
4. Click **"Confirm"**

### 1.4 Obtener cadena de conexión
1. Ve a **Database** en el menú izquierdo
2. Click en **"Connect"** en tu cluster
3. Selecciona **"Connect your application"**
4. Driver: **Node.js**, Version: **5.5 or later**
5. Copia la cadena de conexión, se verá así:
   ```
   mongodb+srv://prioridadesadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Reemplaza `<password>` con la contraseña que creaste
7. Agrega el nombre de la base de datos: `prioridades-app`
   ```
   mongodb+srv://prioridadesadmin:TU_PASSWORD@cluster0.xxxxx.mongodb.net/prioridades-app?retryWrites=true&w=majority
   ```

---

## PASO 2: Preparar el Proyecto (5 minutos)

### 2.1 Subir a GitHub
```bash
# Inicializar git (si no lo has hecho)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit - Sistema de Prioridades"

# Crear repositorio en GitHub y subir
git remote add origin https://github.com/TU_USUARIO/prioridades-app.git
git branch -M main
git push -u origin main
```

---

## PASO 3: Deploy en Vercel (10 minutos)

### 3.1 Crear cuenta en Vercel
1. Ve a https://vercel.com/signup
2. Regístrate con tu cuenta de GitHub

### 3.2 Importar proyecto
1. En Vercel, click en **"Add New..."** → **"Project"**
2. Busca tu repositorio `prioridades-app`
3. Click en **"Import"**

### 3.3 Configurar variables de entorno
En la sección **"Environment Variables"**, agrega:

| NAME | VALUE |
|------|-------|
| `MONGODB_URI` | Tu cadena de conexión completa de MongoDB Atlas |
| `NEXTAUTH_SECRET` | Genera con: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | https://prioridades-app.vercel.app (o tu dominio) |
| `ADMIN_INITIAL_PASSWORD` | GCPGlobaldsdsd323232 |

**Importante**: Marca todas las variables para **Production**, **Preview**, y **Development**

### 3.4 Deploy
1. Click en **"Deploy"**
2. Espera 2-3 minutos a que termine el build
3. Una vez completado, verás el mensaje "Congratulations!"
4. Click en **"Visit"** para ver tu aplicación

---

## PASO 4: Inicializar Base de Datos (5 minutos)

### Opción A: Desde tu computadora (Recomendado)

```bash
# 1. Clona el repositorio (si no lo tienes)
git clone https://github.com/TU_USUARIO/prioridades-app.git
cd prioridades-app

# 2. Instala dependencias
npm install

# 3. Crea archivo .env
cp .env.example .env

# 4. Edita .env y pega tus valores reales
# Usa tu editor favorito (nano, vim, vscode, etc.)
nano .env

# 5. Instala tsx
npm install -D tsx

# 6. Ejecuta script de inicialización
npx tsx scripts/init-db.ts
```

Deberías ver:
```
🔌 Conectando a MongoDB...
✅ Conectado a MongoDB
✅ Usuario administrador creado
   Email: admin@empresa.com
   Password: GCPGlobaldsdsd323232
✅ Iniciativas estratégicas creadas
🎉 Inicialización completada exitosamente!
```

### Opción B: Usando MongoDB Compass (Interfaz Gráfica)

1. Descarga MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Conéctate usando tu cadena de conexión
3. Crea manualmente:
   - Base de datos: `prioridades-app`
   - Colección: `users`
   - Inserta el usuario admin (ver script para formato)
   - Colección: `strategicinitiatives`
   - Inserta las 5 iniciativas

---

## PASO 5: Primer Login y Configuración (5 minutos)

### 5.1 Acceder a la aplicación
1. Ve a tu URL de Vercel: https://tu-app.vercel.app
2. Serás redirigido a `/login`

### 5.2 Login inicial
- **Email**: `admin@empresa.com`
- **Password**: `GCPGlobaldsdsd323232`

### 5.3 Cambiar contraseña del admin (MUY IMPORTANTE)
1. Ve a tu perfil (esquina superior derecha)
2. Click en **"Cambiar Contraseña"**
3. Ingresa una contraseña segura nueva
4. Guarda la nueva contraseña en un lugar seguro

### 5.4 Crear usuarios del equipo
1. Ve a **"Usuarios"** en el menú
2. Click en **"Nuevo Usuario"**
3. Completa el formulario:
   - Nombre completo
   - Email corporativo
   - Contraseña temporal (el usuario podrá cambiarla después)
   - Rol: "Usuario"
   - Estado: "Activo"
4. Repite para cada miembro del equipo

### 5.5 Verificar iniciativas estratégicas
1. Ve a **"Iniciativas"** en el menú
2. Verifica que las 5 iniciativas estén creadas:
   - Generación de ingresos
   - Nuevo negocio con clientes actuales
   - Eficiencia Operativa
   - Analítica Avanzada, Talento y Cultura
   - Orca SNS
3. Edita o agrega más según sea necesario

---

## PASO 6: Verificación Final (5 minutos)

### 6.1 Checklist de verificación
- [ ] Login funciona correctamente
- [ ] Puedes crear usuarios
- [ ] Puedes crear iniciativas
- [ ] Dashboard muestra correctamente
- [ ] Puedes crear prioridades como usuario
- [ ] Analítica muestra datos
- [ ] No hay errores en la consola

### 6.2 Probar como usuario normal
1. Cierra sesión del admin
2. Inicia sesión con uno de los usuarios creados
3. Ve a **"Mis Prioridades"**
4. Crea una prioridad de prueba
5. Verifica que aparezca en el dashboard

---

## 🎉 ¡DEPLOYMENT COMPLETADO!

Tu aplicación está lista para usar en producción.

### Próximos pasos recomendados:

1. **Configurar dominio personalizado** (opcional)
   - En Vercel: Settings → Domains
   - Agrega tu dominio (ej: prioridades.tuempresa.com)

2. **Configurar backup automático**
   - MongoDB Atlas tiene backups automáticos en el plan gratuito

3. **Monitorear uso**
   - Vercel Dashboard: Analytics
   - MongoDB Atlas: Metrics

4. **Comunicar al equipo**
   - Envía emails con credenciales a cada usuario
   - Programa una sesión de onboarding
   - Comparte el link de la app

---

## 🆘 Troubleshooting

### Error: "Cannot connect to MongoDB"
**Solución**: Verifica que 0.0.0.0/0 esté en Network Access de MongoDB Atlas

### Error: "Invalid credentials"
**Solución**: Ejecuta de nuevo el script de inicialización

### La app no se ve bien
**Solución**: Haz un hard refresh (Ctrl+Shift+R o Cmd+Shift+R)

### No aparecen las prioridades
**Solución**: Verifica que el usuario esté activo y tenga permisos

---

## 📞 Necesitas ayuda?

1. Revisa los logs en Vercel Dashboard → Deployments → Logs
2. Revisa los logs de MongoDB Atlas → Database → Monitoring
3. Revisa la consola del navegador (F12)

---

**¡Feliz gestión de prioridades! 🎯**
