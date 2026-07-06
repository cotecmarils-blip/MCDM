# 🎯 INSTRUCCIONES DE USO - MÓDULO DE PROYECTOS

## 1️⃣ INSTALACIÓN

```bash
# Ir a la carpeta frontend
cd frontend

# Instalar dependencias
npm install

# Si hay conflictos de versiones, usa:
npm install --legacy-peer-deps
```

## 2️⃣ INICIAR DESARROLLO

```bash
npm start
```

✨ Se abrirá automáticamente en: **http://localhost:3000**

## 3️⃣ PRIMERA VEZ: PAGINA DE PROYECTOS

```
┌─────────────────────────────────────────────────┐
│  Proyectos           [🌙] [+ Nuevo Proyecto]   │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐              │
│  │  Proyecto 1 │  │  Proyecto 2 │              │
│  │  [Imagen]   │  │  [Imagen]   │              │
│  │  Desc...    │  │  Desc...    │              │
│  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────┘

Botones disponibles:
- [🌙] Toggle Tema (esquina arriba derecha)
- [+ Nuevo Proyecto] Crear nuevo proyecto
- [Click proyecto] Ir a detalle
```

## 4️⃣ CREAR NUEVO PROYECTO

```
1. Click en "+ Nuevo Proyecto"
2. Se abre modal:
   ┌──────────────────────────┐
   │ Nuevo Proyecto           │
   │────────────────────────  │
   │ Nombre: [____________]   │
   │ Descripción: [_______]   │
   │ Foto: [Seleccionar]      │
   │────────────────────────  │
   │         [Cancelar] [OK]  │
   └──────────────────────────┘
3. Completa los campos
4. Click "OK"
5. Aparece en el grid
```

## 5️⃣ IR A DETALLE DE PROYECTO

```
Click en cualquier proyecto del grid
↓
Se carga: /proyecto/:id
↓
Ves:
┌──────────────────────────────────────┐
│ ← Volver        [🌙 Toggle Tema]     │
├─────────────┬──────────────────────── │
│  SIDEBAR    │  ALTERNATIVAS          │
│             │                        │
│  [Foto]     │  [+ Nueva Alt.]        │
│             │                        │
│  Nombre     │  ┌─────────────────┐   │
│  proyecto   │  │ Alternativa 1   │   │
│             │  │ Desc...         │   │
│  Descripción│  │ Ref...          │   │
│  ...        │  │ [✏️] [🗑️]      │   │
│             │  └─────────────────┘   │
│  Fecha: ...│  ┌─────────────────┐   │
│             │  │ Alternativa 2   │   │
└─────────────┴──────────────────────── │
```

## 6️⃣ CREAR ALTERNATIVA

```
1. En detalle, click "+ Nueva Alternativa"
2. Se abre modal:
   ┌──────────────────────────┐
   │ Nueva Alternativa        │
   │────────────────────────  │
   │ Nombre: [____________] * │
   │ Descripción: [_______]   │
   │ Referencia: [________]   │
   │────────────────────────  │
   │    [Cancelar] [Crear]    │
   └──────────────────────────┘
3. Ingresa datos
4. Click "Crear"
5. Aparece en el listado
```

## 7️⃣ VER DOCUMENTOS

```
1. Click en alternativa para expandir
2. Se muestra:
   ┌──────────────────────┐
   │ Alternativa 1 (expandida)
   │                      │
   │ Documentos:  [+ Subir]
   │ ├─ doc1.pdf [🗑️]
   │ ├─ doc2.docx [🗑️]
   │ └─ doc3.jpg [🗑️]
   └──────────────────────┘
```

## 8️⃣ SUBIR DOCUMENTO

```
1. Click en "+ Subir" dentro de alternativa
2. Se abre modal:
   ┌──────────────────────────┐
   │ Subir Documento          │
   │────────────────────────  │
   │ Nombre: [____________]   │
   │                          │
   │ ┌────────────────────┐   │
   │ │  📎 Arrastra aquí  │   │
   │ │    o haz click     │   │
   │ │                    │   │
   │ │ Archivo: none      │   │
   │ └────────────────────┘   │
   │────────────────────────  │
   │    [Cancelar] [Subir]    │
   └──────────────────────────┘
3. Opción A: Arrastra archivo
4. Opción B: Click y selecciona
5. Click "Subir"
6. Aparece en lista de documentos
```

## 9️⃣ EDITAR ALTERNATIVA

```
1. Click en [✏️] de alternativa
2. Se abre modal con datos precargados
3. Modifica los campos que quieras
4. Click "Guardar"
5. Se actualiza en el listado
```

## 🔟 ELIMINAR ALTERNATIVA

```
1. Click en [🗑️] de alternativa
2. Aparece confirmación:
   ┌──────────────────────────┐
   │ ¿Estás seguro de        │
   │ eliminar esta            │
   │ alternativa?             │
   │────────────────────────  │
   │        [No] [Sí]         │
   └──────────────────────────┘
3. Click "Sí"
4. Se elimina del listado
```

## 1️⃣1️⃣ ELIMINAR DOCUMENTO

```
1. Expande alternativa para ver docs
2. Click en [🗑️] junto al documento
3. Confirmación:
   ┌──────────────────────────┐
   │ ¿Eliminar documento?     │
   │────────────────────────  │
   │        [No] [Sí]         │
   └──────────────────────────┘
4. Click "Sí"
5. Se elimina de la lista
```

## 1️⃣2️⃣ CAMBIAR TEMA

```
En cualquier página, click en [🌙] o [☀️]:

🌙 (Modo oscuro)
├─ Fondo: oscuro
├─ Colores: azules/grises
├─ Texto: claro
└─ Persiste en localStorage

☀️ (Modo claro)
├─ Fondo: claro
├─ Colores: pasteles
├─ Texto: oscuro
└─ Persiste en localStorage
```

## 1️⃣3️⃣ RESPONSIVE - CELULAR

```
En pantalla pequeña:
├─ Header se adapta
├─ Sidebar se oculta/comprime
├─ Grid va a 1 columna
├─ Botones se amplían
└─ Todo sigue funcional
```

## 1️⃣4️⃣ KEYBOARD SHORTCUTS

```
En modal:
├─ Tab: Siguiente campo
├─ Shift+Tab: Campo anterior
├─ Enter: Enviar formulario
└─ Esc: Cerrar modal

En listado:
├─ Click: Abrir/cerrar
├─ Tab: Siguiente item
└─ Enter: Activar botón
```

---

## 📊 ESTADO DE CARGA

### Mientras carga un proyecto:
```
Muestra spinner rotando:
   🔄 (animado)
```

### Mientras guarda:
```
Botón muestra:
   🔄 Guardando...
   (deshabilitado)
```

### Mientras sube documento:
```
Botón muestra:
   🔄 Subiendo...
   (deshabilitado)
```

---

## ⚠️ MENSAJES DE ERROR

```
Error rojo en modal:
┌────────────────────────────┐
│ 🔴 Error al crear la       │
│    alternativa             │
└────────────────────────────┘

Causas comunes:
- Nombre vacío
- Error de conexión
- Backend no disponible
```

---

## 💾 DATOS GUARDADOS

```
Automáticamente:
✓ Tema preferido → localStorage
✓ Proyecto cargado → URL

Sincronizado con backend:
✓ Alternativas
✓ Documentos
✓ Cambios en proyecto
```

---

## 🔍 VERIFICAR QUE TODO FUNCIONA

Checklist:
```
□ Toggle tema funciona
□ Proyectos se cargan
□ Puedo crear alternativa
□ Puedo editar alternativa
□ Puedo eliminar alternativa
□ Puedo subir documento
□ Puedo eliminar documento
□ Tema se guarda (refresh)
□ Responsive en móvil
□ Modals tienen blur
```

---

## 🆘 SI ALGO FALLA

### No carga proyectos
```
1. Verifica backend en: http://127.0.0.1:8000/api/proyectos/
2. Revisa DevTools (F12 → Network)
3. Busca errores en Console
```

### Tema no funciona
```
1. Abre DevTools (F12)
2. Verifica localStorage:
   - localStorage.getItem('theme')
3. Debe mostrar "dark" o "light"
4. Si está vacío, resetea:
   - localStorage.clear()
   - Recarga página
```

### Modals no cierran
```
1. Presiona Escape
2. Si persiste: F12 → reload
3. Busca errores en Console
```

### Estilos raros
```
1. Ctrl+Shift+R (hard refresh)
2. npm run build
3. Reinicia servidor
```

---

## 📞 SOLUCIÓN RÁPIDA

**Problema → Solución**

| Problema | Solución |
|----------|----------|
| No carga | Backend debe estar corriendo |
| Tema no guarda | Limpia localStorage |
| Estilos rotos | Hard refresh (Ctrl+Shift+R) |
| Modals lentos | Recarga página |
| API error | Verifica CORS en backend |

---

## 🎓 TIPS & TRICKS

```
✨ Drag & drop documentos
   └─ Arrastra directamente a la zona punteada

⚡ Tab entre campos
   └─ Tab para siguiente, Shift+Tab para anterior

🎯 Click en tarjeta
   └─ Expande para ver documentos

💡 Tema automático
   └─ Se recuerda entre sesiones

🔄 Refresh sin perder datos
   └─ Datos se recargan de API
   └─ Tema se mantiene
```

---

## 📝 NOTAS IMPORTANTES

```
1. Backend en http://127.0.0.1:8000
2. Frontend en http://localhost:3000
3. CORS debe estar habilitado
4. localStorage habilitado
5. JavaScript habilitado
6. Soporte a ES6+ en navegador
```

---

## 🚀 COMANDOS ÚTILES

```bash
# Iniciar en desarrollo
npm start

# Build para producción
npm run build

# Test (si hay tests)
npm test

# Lint (si está configurado)
npm run lint

# Instalar específica
npm install <package>

# Limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

**✅ ¡LISTO PARA USAR!**

Cualquier duda: Revisa los archivos de documentación incluidos
- RESUMEN_MODULO_COMPLETADO.md
- GUIA_RAPIDA_MODULO.md
- MODULO_PROYECTOS_COMPLETADO.md
