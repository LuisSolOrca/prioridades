# 🔧 SOLUCIÓN DE ERRORES DE DEPLOYMENT

## ❌ Error 1: Environment Variable references Secret

**Error completo:**
```
Environment Variable "MONGODB_URI" references Secret "mongodb-uri", which does not exist.
```

### ✅ SOLUCIÓN:

1. **Ve a tu proyecto en Vercel Dashboard**
2. **Settings** → **Environment Variables**
3. **ELIMINA** cualquier variable que tenga valores como `@mongodb-uri` o `@secret-name`
4. **AGREGA variables nuevas** con valores directos (sin @):

```
MONGODB_URI = mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/prioridades-app?retryWrites=true&w=majority

NEXTAUTH_URL = https://tu-proyecto.vercel.app

NEXTAUTH_SECRET = (genera con: openssl rand -base64 32)

ADMIN_INITIAL_PASSWORD = GCPGlobaldsdsd323232
```

5. Marca las 3 opciones: **Production**, **Preview**, **Development**
6. **Save**
7. Ve a **Deployments** → Click en los 3 puntos del último deploy → **Redeploy**

---

## ❌ Error 2: Route does not match required types

**Error completo:**
```
Type error: Route "app/api/auth/[...nextauth]/route.ts" does not match the required types of a Next.js Route.
"authOptions" is not a valid Route export field.
```

### ✅ SOLUCIÓN:

Este error ya está corregido en la versión actualizada del paquete.

**Descarga la versión corregida:**
[prioridades-app-fixed.tar.gz](../prioridades-app-fixed.tar.gz)

**Cambios realizados:**

1. **app/api/auth/[...nextauth]/route.ts** - Eliminado export de authOptions
2. **models/User.ts** - Ajustado tipado para Mongoose
3. **models/Priority.ts** - Ajustado tipado para Mongoose
4. **models/StrategicInitiative.ts** - Ajustado tipado para Mongoose
5. **types/next-auth.d.ts** - Agregado archivo de tipos personalizados
6. **tsconfig.json** - Incluida carpeta types

---

## 📋 PASOS PARA APLICAR LA CORRECCIÓN

### Opción A: Reemplazar Repositorio (Más Simple)

```bash
# 1. Elimina tu carpeta actual
rm -rf prioridades-app

# 2. Extrae la versión corregida
tar -xzf prioridades-app-fixed.tar.gz

# 3. Ve a la carpeta
cd prioridades-app

# 4. Reemplaza en tu repositorio de GitHub
git add .
git commit -m "Fix: Corrección de errores de deployment"
git push
```

### Opción B: Actualizar Archivos Específicos

Si ya tienes cambios en tu repo, solo actualiza estos archivos:

1. **Reemplaza:** `app/api/auth/[...nextauth]/route.ts`
2. **Reemplaza:** `models/User.ts`
3. **Reemplaza:** `models/Priority.ts`
4. **Reemplaza:** `models/StrategicInitiative.ts`
5. **Crea nuevo:** `types/next-auth.d.ts`
6. **Actualiza:** `tsconfig.json` (agrega `"types/**/*.ts"` al include)

```bash
git add .
git commit -m "Fix: Corrección de errores de TypeScript y NextAuth"
git push
```

---

## 🔄 VERIFICAR QUE EL BUILD FUNCIONE LOCALMENTE

Antes de hacer push a GitHub, prueba localmente:

```bash
# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env

# Edita .env con tus valores reales

# Probar build
npm run build
```

Si `npm run build` termina sin errores, estás listo para deploy.

---

## ✅ CHECKLIST POST-CORRECCIÓN

- [ ] Variables de entorno configuradas en Vercel (sin @)
- [ ] Código actualizado con la versión corregida
- [ ] Push a GitHub completado
- [ ] Vercel detectó el push y empezó nuevo deploy
- [ ] Build completado sin errores
- [ ] Puedes acceder a la URL de tu app

---

## 🎯 DEPLOY EXITOSO

Cuando el deployment termine sin errores, verás:

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Route (app)                              Size
┌ ○ /                                    ...
└ ○ /api/auth/[...nextauth]              ...
```

Tu app estará disponible en: `https://tu-proyecto.vercel.app`

---

## 🆘 SI AÚN HAY ERRORES

### Error: "Cannot find module '@/lib/mongodb'"

**Solución:**
```bash
# Verifica que la estructura sea correcta:
prioridades-app/
├── lib/
│   └── mongodb.ts
├── models/
│   ├── User.ts
│   ├── Priority.ts
│   └── StrategicInitiative.ts
```

### Error: "Module not found: Can't resolve 'bcryptjs'"

**Solución:**
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

### Error: Build time exceeded

**Solución:**
- El plan gratuito de Vercel tiene límite de tiempo de build
- Espera unos minutos y haz redeploy
- O actualiza a plan Pro si es urgente

### Error: MongoDB Connection Failed

**Solución:**
1. Verifica que MONGODB_URI esté correcta
2. Verifica que tu IP esté en MongoDB Atlas Network Access (0.0.0.0/0)
3. Verifica que el usuario de BD tenga permisos

---

## 📞 SOPORTE ADICIONAL

Si sigues teniendo problemas:

1. **Revisa los logs de Vercel:**
   - Dashboard → Deployments → Click en deployment → Function Logs

2. **Revisa errores específicos:**
   - Copia el error completo
   - Busca en la documentación de Next.js o Vercel

3. **Verifica las versiones:**
   ```json
   {
     "next": "14.2.3",
     "react": "18.3.1",
     "mongoose": "^8.3.0",
     "next-auth": "^4.24.7"
   }
   ```

---

## ✨ RESUMEN DE CAMBIOS

**Versión Original → Versión Corregida:**

1. ✅ NextAuth configurado correctamente para App Router
2. ✅ Eliminado export de authOptions innecesario
3. ✅ Modelos de Mongoose con tipado correcto
4. ✅ Archivo de tipos para NextAuth
5. ✅ vercel.json eliminado (configuración en dashboard)
6. ✅ TypeScript configurado para incluir types/

**Estado:** ✅ LISTO PARA DEPLOYMENT

---

**¡Con estos cambios tu deployment debería funcionar sin problemas!** 🚀
