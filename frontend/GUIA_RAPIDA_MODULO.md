# 🚀 MÓDULO INTERNO DE PROYECTOS - GUÍA RÁPIDA

## ✨ Características Principales

### 1️⃣ Tema Oscuro/Claro
```
🌙 Toggle en esquina superior derecha
💾 Se guarda automáticamente en localStorage
🎨 Se aplica a toda la interfaz
⚡ Transiciones suaves
```

### 2️⃣ Página de Listado de Proyectos (/)
```
├─ Header
│  ├─ Título "Proyectos"
│  ├─ Toggle de Tema
│  └─ Botón "+ Nuevo Proyecto"
├─ Grid de Proyectos
│  ├─ Tarjetas responsivas (1-3 columnas)
│  ├─ Imagen del proyecto
│  ├─ Nombre y descripción
│  └─ Hover effects
└─ Modal Crear Proyecto
   ├─ Nombre *
   ├─ Descripción
   └─ Foto
```

### 3️⃣ Página de Detalle (/proyecto/:id)
```
LAYOUT RESPONSIVO:
┌─────────────────────────────────────┐
│ ← Volver          [🌙 Toggle Tema] │
├─────────────────────────────────────┤
│ SIDEBAR (w-80)  │  PANEL PRINCIPAL  │
│                 │                   │
│ Foto proyecto   │  Alternativas     │
│ Nombre          │  ┌──────────────┐ │
│ Descripción     │  │ Alt 1        │ │
│ Fecha creación  │  │ [✏️] [🗑️]    │ │
│                 │  │              │ │
│                 │  │ Docs: 3      │ │
│                 │  └──────────────┘ │
│                 │  ┌──────────────┐ │
│                 │  │ Alt 2        │ │
│                 │  │ [✏️] [🗑️]    │ │
│                 │  └──────────────┘ │
└─────────────────────────────────────┘

En Mobile: Stack vertical
```

### 4️⃣ CRUD Alternativas
```
📝 CREATE
├─ Botón "+ Nueva Alternativa"
├─ Modal con formulario
├─ Campos: nombre*, descripción, referencia
└─ Backdrop blur + dark mode

👁️ READ
├─ Tarjetas expandibles
├─ Click para expandir y ver documentos
├─ Información visible: nombre, desc, ref
└─ Status visual de selección

✏️ UPDATE
├─ Botón editar en cada tarjeta
├─ Modal con valores precargados
└─ Actualiza sin recargar

🗑️ DELETE
├─ Confirmación antes de eliminar
├─ Actualización automática de lista
└─ Error handling
```

### 5️⃣ Gestión de Documentos
```
📄 UPLOAD
├─ Botón "+ Subir" en cada alternativa
├─ Modal con:
│  ├─ Nombre documento
│  ├─ Drag & drop
│  └─ Click para seleccionar
└─ Backdrop blur + dark mode

📋 LISTAR
├─ Dentro de alternativa expandida
├─ Icono de documento
├─ Nombre (link a descarga)
└─ Botón eliminar

🗑️ DELETE
├─ Confirmación
└─ Actualización instantánea
```

### 6️⃣ Modals
```
TODOS CON:
✅ Backdrop blur: backdrop-blur-sm
✅ Fondo oscuro: bg-black/50
✅ Animaciones suaves
✅ Tema oscuro/claro
✅ Z-index 50 (siempre encima)
✅ Responsive
```

## 🎨 Colores Modo Oscuro
```
Fondo: slate-900 (#0f172a)
Cards: slate-800 (#1e293b)
Bordes: slate-700 (#334155)
Texto: white (#ffffff)
Secundario: slate-300 (#cbd5e1)
Subtle: slate-400 (#94a3b8)
```

## 🎨 Colores Modo Claro
```
Fondo: white / gray-50 (#fafaf9)
Cards: white (#ffffff)
Bordes: gray-200 (#e5e7eb)
Texto: slate-900 (#0f172a)
Secundario: slate-600 (#475569)
Subtle: slate-500 (#64748b)
```

## 📱 Breakpoints Tailwind
```
Mobile:  < 640px   (default stack vertical)
Tablet:  640-1024px (md: 2 columnas)
Desktop: > 1024px   (lg: 3 columnas)
```

## 🚀 Comando de Inicio
```bash
cd frontend
npm install
npm start
```

Abrirá automáticamente: http://localhost:3000

## 📂 Archivos Principales

| Archivo | Función |
|---------|---------|
| `ThemeContext.js` | Proveedor de tema global |
| `ProjectsPage.js` | Página de listado |
| `ProjectDetailPage.js` | Página de detalle |
| `AlternativasList.js` | Listado de alternativas |
| `AlternativaCard.js` | Tarjeta expandible |
| `DocumentosList.js` | Gestor de documentos |
| `ThemeToggle.js` | Botón tema |

## 🔄 Flujo de Datos
```
ThemeProvider (root)
    ↓
ProjectsPage / ProjectDetailPage
    ↓
useTheme() → isDark boolean
    ↓
Conditional rendering
    ↓
Tailwind dark: clases
```

## ✅ Checklist de Verificación

### Visualmente
- [ ] Toggle tema funciona (click)
- [ ] Modo oscuro se activa/desactiva
- [ ] Colores cambian suavemente
- [ ] Layout responsivo en móvil
- [ ] Cards se expanden en detalle

### Funcional
- [ ] Crear alternativa
- [ ] Editar alternativa
- [ ] Eliminar alternativa (con confirmación)
- [ ] Upload documento
- [ ] Eliminar documento
- [ ] Tema se guarda en refresh

### UI/UX
- [ ] Modals con blur
- [ ] Buttons con hover effects
- [ ] Spinners de carga
- [ ] Error messages claros
- [ ] Campos requeridos marcados

## 🆘 Si algo no funciona

1. **npm install no corre**: Usa `npm install --legacy-peer-deps`
2. **Tema no funciona**: Verifica localStorage en DevTools
3. **Estilos no aplican**: Limpia caché con `Ctrl+Shift+R`
4. **API error**: Verifica que backend esté en http://127.0.0.1:8000/

## 📖 Documentación Referencia

- Tailwind Dark Mode: https://tailwindcss.com/docs/dark-mode
- React Context: https://react.dev/reference/react/useContext
- localStorage: https://developer.mozilla.org/es/docs/Web/API/localStorage

---
**Status**: ✅ COMPLETADO Y FUNCIONAL
**Versión**: 1.0
**Última actualización**: 2024
