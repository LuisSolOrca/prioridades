# 🍃 Configuración de MongoDB Atlas - Guía Detallada

## Paso 1: Crear Cuenta (2 minutos)

1. Ve a: https://www.mongodb.com/cloud/atlas/register
2. Puedes registrarte con:
   - Google Account (recomendado, más rápido)
   - Email y contraseña
3. Completa el formulario si es necesario
4. Verifica tu email si lo solicita

## Paso 2: Crear Organización y Proyecto (1 minuto)

1. Después de login, te pedirá crear una organización
   - Nombre: "Mi Empresa" (o el nombre que prefieras)
   - Click **Continue**

2. Crear proyecto
   - Nombre del proyecto: "Prioridades App"
   - Click **Next**
   - Puedes agregar miembros después
   - Click **Create Project**

## Paso 3: Crear Cluster (5 minutos)

1. Te mostrará la página "Deploy a cloud database"
2. Selecciona **M0 FREE** (plan gratuito)
   - 512MB de almacenamiento
   - Perfecto para 5-10 usuarios
   - 100 conexiones simultáneas

3. Configuración del Cluster:
   
   **Provider & Region:**
   - Cloud Provider: **AWS** (recomendado)
   - Region: Selecciona la más cercana a tu ubicación
     - Para México: **N. Virginia (us-east-1)** o **São Paulo (sa-east-1)**
     - Para USA: **N. Virginia (us-east-1)**
     - Para Europa: **Ireland (eu-west-1)**
   
   **Cluster Name:**
   - Nombre: `Cluster0` (déjalo por defecto)
   
   **Additional Settings:**
   - Déjalos por defecto

4. Click **Create** (puede tardar 3-5 minutos)

## Paso 4: Configurar Database Access (2 minutos)

1. Mientras se crea el cluster, ve al menú izquierdo: **Security** → **Database Access**

2. Click **Add New Database User**

3. Configuración del usuario:
   ```
   Authentication Method: Password
   
   Username: prioridadesadmin
   (puedes usar otro nombre, pero recuérdalo)
   
   Password: 
   ┌─────────────────────────────────┐
   │ Click en "Autogenerate Secure   │
   │ Password"                        │
   └─────────────────────────────────┘
   
   IMPORTANTE: Guarda esta contraseña en un lugar seguro
   (la necesitarás para la cadena de conexión)
   ```

4. Database User Privileges:
   - Selecciona: **Built-in Role**
   - Role: **Atlas admin** (o **Read and write to any database**)

5. Click **Add User**

## Paso 5: Configurar Network Access (2 minutos)

1. En el menú izquierdo: **Security** → **Network Access**

2. Click **Add IP Address**

3. Tienes dos opciones:

   **Opción A: Permitir desde cualquier lugar (Recomendado para Vercel)**
   ```
   Click en "ALLOW ACCESS FROM ANYWHERE"
   
   IP Address: 0.0.0.0/0
   Comment: Vercel and all users
   ```
   
   **Opción B: Solo IPs específicas**
   ```
   Agrega tu IP actual
   Después deberás agregar las IPs de Vercel
   ```

4. Click **Confirm**

⚠️ **Nota de Seguridad**: 
- 0.0.0.0/0 permite acceso desde cualquier IP
- Es seguro porque aún necesitas usuario y contraseña
- MongoDB Atlas tiene protecciones adicionales
- Para máxima seguridad, puedes usar solo IPs específicas

## Paso 6: Obtener Cadena de Conexión (3 minutos)

1. Ve a **Database** en el menú izquierdo

2. Espera a que el cluster termine de crearse (status: Verde ✓)

3. Click en **Connect** en tu cluster

4. Selecciona **Drivers**

5. Configuración:
   ```
   Driver: Node.js
   Version: 5.5 or later
   ```

6. Verás una cadena de conexión como esta:
   ```
   mongodb+srv://prioridadesadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

7. **Personaliza la cadena**:
   
   **ANTES:**
   ```
   mongodb+srv://prioridadesadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   
   **DESPUÉS** (tu cadena final):
   ```
   mongodb+srv://prioridadesadmin:TU_PASSWORD_REAL@cluster0.xxxxx.mongodb.net/prioridades-app?retryWrites=true&w=majority
   ```
   
   **Cambios necesarios:**
   1. Reemplaza `<password>` con la contraseña real que guardaste
   2. Reemplaza `xxxxx` con el ID único de tu cluster
   3. Agrega `/prioridades-app` después de `.net`

8. **Ejemplo Real**:
   ```
   mongodb+srv://prioridadesadmin:Abc123XYZ!@cluster0.ab1cd.mongodb.net/prioridades-app?retryWrites=true&w=majority
   ```

9. **Copia y guarda esta cadena** - la necesitarás en Vercel

## Paso 7: Verificar Conexión (Opcional)

### Opción A: Con MongoDB Compass

1. Descarga MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Instala y abre Compass
3. Pega tu cadena de conexión
4. Click **Connect**
5. Deberías ver tu cluster conectado

### Opción B: Con el script de Node.js

```bash
# Crea un archivo test-connection.js
node test-connection.js
```

```javascript
// test-connection.js
const mongoose = require('mongoose');

const MONGODB_URI = 'TU_CADENA_DE_CONEXION_AQUI';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Conexión exitosa a MongoDB Atlas!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error de conexión:', err);
    process.exit(1);
  });
```

## 🎯 Checklist Final

Antes de continuar con Vercel, asegúrate de tener:

- [ ] Cluster creado y en estado "Active"
- [ ] Usuario de base de datos creado
- [ ] Network Access configurado (0.0.0.0/0 o IPs específicas)
- [ ] Cadena de conexión copiada y personalizada
- [ ] Cadena probada (opcional)

## 📝 Tu Información MongoDB (Guarda esto)

```
MONGODB ATLAS - PRIORIDADES APP
================================

Organization: _______________________
Project Name: Prioridades App
Cluster Name: Cluster0
Region: _______________________

Database User:
  Username: prioridadesadmin
  Password: _______________________ (SECRETO - No compartir)

Connection String:
mongodb+srv://prioridadesadmin:TU_PASSWORD@cluster0.xxxxx.mongodb.net/prioridades-app?retryWrites=true&w=majority

Status:
[ ] Cluster creado
[ ] Usuario configurado
[ ] Network access configurado
[ ] Cadena de conexión probada
```

## 🔍 Troubleshooting

### Error: "Network Access Denied"
**Solución**: Verifica que 0.0.0.0/0 esté en Network Access

### Error: "Authentication failed"
**Solución**: 
1. Verifica que el username sea correcto
2. Verifica que la contraseña no tenga caracteres especiales sin codificar
3. Si la contraseña tiene caracteres especiales, usa URL encoding:
   - @ → %40
   - : → %3A
   - / → %2F
   - # → %23
   - ? → %3F
   - & → %26
   - = → %3D

### El cluster no se crea
**Solución**: 
- Espera 5-10 minutos
- Refresca la página
- Si sigue sin funcionar, elimina y crea uno nuevo

### "Cluster0 already exists"
**Solución**: Está bien, usa ese cluster existente

## 💡 Tips Importantes

1. **Backup Automático**: El plan gratuito M0 tiene backups automáticos de 1 día
2. **Monitoreo**: Puedes ver métricas en Database → Metrics
3. **Alertas**: Configura alertas en Alerts para ser notificado de problemas
4. **Escalabilidad**: Puedes upgradear a planes pagados si creces
5. **Seguridad**: Nunca compartas tu contraseña de BD

## 🎓 Recursos Adicionales

- Documentación Oficial: https://docs.atlas.mongodb.com/
- Video Tutorial: https://www.youtube.com/watch?v=rPqRyYJmx2g
- Soporte: support.mongodb.com

---

## ✅ ¡Listo para Continuar!

Ahora que tienes MongoDB Atlas configurado, continúa con el **DEPLOYMENT.md** en el Paso 2: Deploy en Vercel.

Tu cadena de conexión es lo único que necesitas de este paso para configurar las variables de entorno en Vercel.

**¡Excelente trabajo! 🎉**
