# ✅ CHECKLIST DE DEPLOYMENT - Sistema de Prioridades

Imprime o guarda este documento para seguir el progreso paso a paso.

---

## 📋 FASE 1: PREPARACIÓN (5 minutos)

### Cuentas Necesarias
- [ ] Cuenta de GitHub creada: ___________________
- [ ] Cuenta de MongoDB Atlas creada: ___________________
- [ ] Cuenta de Vercel creada: ___________________

### Software Instalado
- [ ] Node.js instalado (ejecuté: `node --version`)
- [ ] Git instalado (opcional)
- [ ] Terminal/CMD abierto

### Documentos Leídos
- [ ] RESUMEN-EJECUTIVO.md
- [ ] MONGODB-SETUP.md (al menos primeros pasos)

---

## 📋 FASE 2: MONGODB ATLAS (15 minutos)

### Paso 1: Crear Cluster
- [ ] Organización creada: ___________________
- [ ] Proyecto "Prioridades App" creado
- [ ] Cluster M0 (gratis) creado en región: ___________________
- [ ] Status del cluster: ACTIVO ✓

### Paso 2: Usuario de Base de Datos
- [ ] Usuario creado: prioridadesadmin (u otro: _________)
- [ ] Contraseña generada y guardada: 
  ```
  Password: _________________________________
  ```
- [ ] Privilegios: Atlas admin ✓

### Paso 3: Network Access
- [ ] Configuración: 0.0.0.0/0 (cualquier IP) ✓
  O IPs específicas: ___________________

### Paso 4: Cadena de Conexión
- [ ] Cadena obtenida desde "Connect"
- [ ] Password reemplazado en la cadena
- [ ] Nombre de BD agregado: `/prioridades-app`
- [ ] Cadena completa guardada:
  ```
  mongodb+srv://________________________________
  ________________________________________________
  ```

### Paso 5: Verificación (Opcional)
- [ ] Conexión probada con MongoDB Compass
  O
- [ ] Conexión probada con script de Node.js

---

## 📋 FASE 3: PREPARAR PROYECTO (5 minutos)

### Extracción y Setup
- [ ] Archivo `prioridades-app-completo.tar.gz` extraído
- [ ] Carpeta ubicada en: ___________________
- [ ] Terminal abierto en la carpeta del proyecto

### Git y GitHub
- [ ] Repositorio GitHub creado: ___________________
- [ ] Código subido a GitHub:
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin [URL]
  git push -u origin main
  ```

---

## 📋 FASE 4: DEPLOY EN VERCEL (10 minutos)

### Paso 1: Importar Proyecto
- [ ] Login en Vercel con cuenta de GitHub
- [ ] Proyecto importado desde GitHub
- [ ] Nombre del proyecto: ___________________

### Paso 2: Variables de Entorno
Configura estas 4 variables:

- [ ] `MONGODB_URI`
  ```
  Valor: [Tu cadena de MongoDB completa]
  ```

- [ ] `NEXTAUTH_URL`
  ```
  Valor: https://[tu-app].vercel.app
  (se completa después del primer deploy)
  ```

- [ ] `NEXTAUTH_SECRET`
  ```
  Generado con: openssl rand -base64 32
  Valor: ___________________________________
  ```

- [ ] `ADMIN_INITIAL_PASSWORD`
  ```
  Valor: GCPGlobaldsdsd323232
  ```

- [ ] Todas marcadas para: Production, Preview, Development

### Paso 3: Deploy
- [ ] Click en "Deploy"
- [ ] Build completado sin errores
- [ ] URL de la app: https://___________________

---

## 📋 FASE 5: INICIALIZAR BASE DE DATOS (5 minutos)

### Opción A: Desde tu PC (Recomendado)
- [ ] Dependencias instaladas: `npm install`
- [ ] Archivo `.env` creado desde `.env.example`
- [ ] Variables copiadas en `.env`:
  ```
  MONGODB_URI=_______________________________
  NEXTAUTH_SECRET=___________________________
  NEXTAUTH_URL=http://localhost:3000
  ADMIN_INITIAL_PASSWORD=GCPGlobaldsdsd323232
  ```
- [ ] tsx instalado: `npm install -D tsx`
- [ ] Script ejecutado: `npx tsx scripts/init-db.ts`
- [ ] Mensajes de éxito vistos:
  - [ ] ✅ Usuario administrador creado
  - [ ] ✅ Iniciativas estratégicas creadas

---

## 📋 FASE 6: PRIMER LOGIN Y SETUP (10 minutos)

### Login Inicial
- [ ] App abierta en: https://___________________
- [ ] Login exitoso con:
  - Email: `admin@empresa.com`
  - Password: `GCPGlobaldsdsd323232`

### Cambiar Contraseña Admin
- [ ] Nueva contraseña creada: ___________________
- [ ] Contraseña guardada en lugar seguro

### Crear Usuarios del Equipo
Usuario 1:
- [ ] Nombre: ___________________
- [ ] Email: ___________________
- [ ] Password temporal: ___________________
- [ ] Rol: Usuario ☑ | Admin ☐

Usuario 2:
- [ ] Nombre: ___________________
- [ ] Email: ___________________
- [ ] Password temporal: ___________________
- [ ] Rol: Usuario ☑ | Admin ☐

Usuario 3:
- [ ] Nombre: ___________________
- [ ] Email: ___________________
- [ ] Password temporal: ___________________
- [ ] Rol: Usuario ☑ | Admin ☐

(Agregar más según sea necesario)

### Verificar Iniciativas
Iniciativas creadas:
- [ ] Generación de ingresos
- [ ] Nuevo negocio con clientes actuales
- [ ] Eficiencia Operativa
- [ ] Analítica Avanzada, Talento y Cultura
- [ ] Orca SNS

Iniciativas adicionales (si aplica):
- [ ] ___________________
- [ ] ___________________

---

## 📋 FASE 7: VERIFICACIÓN FINAL (5 minutos)

### Pruebas de Funcionalidad
- [ ] Dashboard carga correctamente
- [ ] Puedo ver usuarios en "Usuarios"
- [ ] Puedo ver iniciativas en "Iniciativas"
- [ ] Puedo crear una prioridad de prueba
- [ ] La prioridad aparece en el dashboard
- [ ] Analytics muestra datos
- [ ] No hay errores en consola del navegador (F12)

### Prueba como Usuario Normal
- [ ] Cerré sesión del admin
- [ ] Login con usuario normal exitoso
- [ ] Puedo ver "Mis Prioridades"
- [ ] Puedo crear una prioridad
- [ ] NO puedo ver prioridades de otros usuarios
- [ ] NO puedo acceder a "Usuarios" o "Iniciativas"

---

## 📋 FASE 8: POST-DEPLOYMENT (Opcional)

### Configuración Avanzada
- [ ] Dominio personalizado configurado (si aplica):
  - Dominio: ___________________
  - DNS configurado
  - SSL activo

### Comunicación al Equipo
- [ ] Email enviado a usuarios con credenciales
- [ ] Sesión de onboarding programada
- [ ] Manual de usuario compartido (si aplica)

### Monitoreo
- [ ] Analytics de Vercel revisadas
- [ ] Metrics de MongoDB Atlas revisadas
- [ ] Alertas configuradas (opcional)

---

## 🎉 DEPLOYMENT COMPLETADO

### Información del Deployment

**Fecha de deployment:** ___________________

**URLs:**
- Producción: https://___________________
- GitHub Repo: https://___________________

**Credenciales MongoDB:**
- Usuario: prioridadesadmin
- Password: (guardado en gestor de contraseñas)

**Credenciales Admin:**
- Email: admin@empresa.com
- Password: (nueva contraseña segura guardada)

**Estado:** ✅ ACTIVO Y FUNCIONANDO

---

## 📝 Notas Adicionales

```
___________________________________________
___________________________________________
___________________________________________
___________________________________________
___________________________________________
```

---

## 🆘 Problemas Encontrados

Si tuviste algún problema, anótalo aquí con su solución:

```
Problema:
___________________________________________
___________________________________________

Solución:
___________________________________________
___________________________________________
```

---

## 📞 Contactos de Soporte

- Vercel Support: https://vercel.com/support
- MongoDB Atlas: https://support.mongodb.com
- Next.js Docs: https://nextjs.org/docs

---

**¡Felicidades por completar el deployment! 🎯**

Fecha de finalización: ___________________
Completado por: ___________________
Tiempo total: ___________ minutos
