# 🧠 AI Virtual Model Studio (Powered by Gemini)

> **Sugerencia**: Reemplaza esta imagen con una captura de pantalla o un GIF de tu aplicación en acción.  
> ![AI Virtual Model Studio Preview](preview.gif)

---

## 📌 Descripción

**AI Virtual Model Studio** es una potente aplicación web de estudio fotográfico virtual que utiliza la IA de **Google Gemini** para generar y editar imágenes de alta calidad con un control sin precedentes. Diseñada para **artistas, diseñadores y creadores de contenido**, esta herramienta permite dar vida a modelos virtuales y conceptos visuales con un realismo asombroso.

Desde la generación inicial basada en referencias multimodales hasta la edición precisa con máscaras y la mejora con un solo clic, esta aplicación proporciona un flujo de trabajo completo para la creación de imágenes profesionales.

---

## 🛠️ Características Principales

La aplicación está organizada en un conjunto de herramientas intuitivas:

### 🎨 **Generate (Generar)**

- **Prompt Principal y Negativo**: Guía a la IA con descripciones detalladas de lo que quieres ver y lo que quieres evitar.
- **Sistema de Referencias Multimodales**: Sube imágenes para definir con precisión la cara, el atuendo, la pose, el estilo de iluminación, el entorno y más. ¡Combina referencias visuales con prompts de texto para un control máximo!
- **Semilla (Seed) Controlable**: Guarda y reutiliza semillas para obtener resultados consistentes o explora nuevas variaciones.

### 🖌️ **Mask Editor (Editor con Máscara)**

- **Inpainting Inteligente**: Dibuja una máscara sobre cualquier parte de la imagen y describe los cambios que deseas (*"cambiar el pelo a rojo"*, *"añadir unas gafas de sol"*).
- **Edición Global**: Aplica cambios estilísticos a toda la imagen sin necesidad de una máscara.
- **Face Swap**: Enmascara una cara y súbela como referencia para realizar un intercambio de rostros de alta calidad.
- **Controles de Pincel y Zoom**: Ajusta el tamaño del pincel y navega por la imagen con zoom y panorámica para una edición precisa.

### ✨ **Enhance (Mejorar)**

- **Retoque Profesional con un Clic**: Aplica una mejora general que aumenta la resolución, suaviza la piel conservando la textura, mejora los detalles en ojos y pelo, y aplica una corrección de color cinematográfica.

### 🏞️ **Background (Fondo)**

- **Reemplazo por Prompt**: Describe el nuevo fondo que deseas y la IA lo generará, ajustando la iluminación del sujeto para una integración perfecta.
- **Reemplazo por Imagen**: Sube tu propia imagen para usarla como nuevo fondo.

### 🖼️ **Outpaint (Expandir)**

- **Expansión de Lienzo**: Amplía la imagen en cualquier dirección (arriba, abajo, izquierda, derecha) con contenido generado por IA que se integra de forma coherente con la imagen original.
- **Relaciones de Aspecto Flexibles**: Expande a relaciones de aspecto estándar (16:9, 4:5) o a dimensiones personalizadas.

### 📦 **Session Gallery & Export (Galería y Exportación)**

- **Historial Visual**: Accede a todas las imágenes generadas y editadas durante tu sesión.
- **Selección y Filtrado**: Filtra las imágenes por tipo de generación y selecciona tus favoritas.
- **Exportación Completa**: Descarga las imágenes seleccionadas como un archivo `.zip`, que incluye:
  - Imágenes en alta resolución.
  - Archivos de texto con los prompts, semillas y referencias utilizadas.

---

## ⚙️ Stack Tecnológico

- **Frontend**: React, TypeScript
- **IA Generativa**: Google Gemini API (`gemini-2.5-flash-image-preview`) a través del SDK `@google/genai`
- **Estilos**: Tailwind CSS
- **Utilidades**: JSZip (para exportación de archivos)

---

## 🚀 Instalación y Puesta en Marcha

Sigue estos pasos para ejecutar el proyecto en tu máquina local.

### 🔧 Prerrequisitos

- Node.js (versión 18 o superior recomendada)
- npm, yarn o pnpm como gestor de paquetes

### 📥 Pasos

1. **Clona el repositorio:**

   ```bash
   git clone https://github.com/tu-usuario/ai-virtual-model-studio.git
   cd ai-virtual-model-studio
