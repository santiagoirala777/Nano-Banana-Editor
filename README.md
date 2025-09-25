# 🍌 Nano Banana Editor🍌

**Nano Banan Editor** es una potente aplicación web de estudio fotográfico virtual que utiliza la IA de Google Gemini para generar y editar imágenes de alta calidad con un control sin precedentes. Diseñada para artistas, diseñadores y creadores de contenido, esta herramienta permite dar vida a modelos virtuales y conceptos visuales con un realismo asombroso.

Desde la generación inicial basada en referencias multimodales hasta la edición precisa con máscaras y la mejora con un solo clic, esta aplicación proporciona un flujo de trabajo completo para la creación de imágenes profesionales.

## Características Principales

La aplicación está organizada en un conjunto de herramientas intuitivas:

*   **🎨 Generate (Generar):**
    *   **Prompt Principal y Negativo:** Guía a la IA con descripciones detalladas de lo que quieres ver y lo que quieres evitar.
    *   **Sistema de Referencias Multimodales:** Sube imágenes para definir con precisión la **cara**, el **atuendo**, la **pose**, el **estilo de iluminación**, el **entorno** y más. ¡Combina referencias visuales con prompts de texto para un control máximo!
    *   **Semilla (Seed) Controlable:** Guarda y reutiliza semillas para obtener resultados consistentes o explora nuevas variaciones.

*   **🖌️ Mask Editor (Editor con Máscara):**
    *   **Inpainting Inteligente:** Dibuja una máscara sobre cualquier parte de la imagen y describe los cambios que deseas ("cambiar el pelo a rojo", "añadir unas gafas de sol").
    *   **Edición Global:** Aplica cambios estilísticos a toda la imagen sin necesidad de una máscara.
    *   **Face Swap:** Enmascara una cara y súbela como referencia para realizar un intercambio de rostros de alta calidad.
    *   **Controles de Pincel y Zoom:** Ajusta el tamaño del pincel y navega por la imagen con zoom y panorámica para una edición precisa.

*   **✨ Enhance (Mejorar):**
    *   **Retoque Profesional con un Clic:** Aplica una mejora general que aumenta la resolución, suaviza la piel conservando la textura, mejora los detalles en ojos y pelo, y aplica una corrección de color cinematográfica.

*   **🏞️ Background (Fondo):**
    *   **Reemplazo por Prompt:** Describe el nuevo fondo que deseas y la IA lo generará, ajustando la iluminación del sujeto para una integración perfecta.
    *   **Reemplazo por Imagen:** Sube tu propia imagen para usarla como nuevo fondo.

*   **🖼️ Outpaint (Expandir):**
    *   **Expansión de Lienzo:** Amplía la imagen en cualquier dirección (arriba, abajo, izquierda, derecha) con contenido generado por IA que se integra de forma coherente con la imagen original.
    *   **Relaciones de Aspecto Flexibles:** Expande a relaciones de aspecto estándar (16:9, 4:5) o a dimensiones personalizadas.

*   **📦 Session Gallery & Export (Galería y Exportación):**
    *   **Historial Visual:** Accede a todas las imágenes generadas y editadas durante tu sesión.
    *   **Selección y Filtrado:** Filtra las imágenes por tipo de generación y selecciona tus favoritas.
    *   **Exportación Completa:** Descarga las imágenes seleccionadas como un archivo `.zip`, que incluye no solo las imágenes en alta resolución, sino también archivos de texto con los prompts, semillas y referencias utilizadas para crearlas.

## Stack Tecnológico

*   **Frontend:** React, TypeScript
*   **IA Generativa:** Google Gemini API (`gemini-2.5-flash-image-preview`) a través del SDK `@google/genai`.
*   **Estilos:** Tailwind CSS
*   **Utilidades:** JSZip para la exportación de archivos.

## Instalación y Puesta en Marcha

Sigue estos pasos para ejecutar el proyecto en tu máquina local.

### Prerrequisitos

*   Node.js (versión 18 o superior recomendada)
*   `npm`, `yarn` o `pnpm` como gestor de paquetes

### Pasos

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/santiagoirala777/Nano-Banana-Editor.git
    cd Nano-Banana-Editor
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    # o
    # yarn install
    # o
    # pnpm install
    ```

3.  **Configura tu Clave de API de Gemini:**

    ⚠️ **¡MUY IMPORTANTE!** La aplicación necesita una clave de API de Google Gemini para funcionar. Esta clave **NO** se guarda en el código por seguridad. Debes proporcionarla a través de una variable de entorno.

    *   Crea un nuevo archivo en la raíz del proyecto llamado `.env`.
    *   Abre el archivo `.env` y añade tu clave de API de la siguiente manera:
      ```
      API_KEY=TU_API_KEY_DE_GEMINI_AQUI
      ```
    *   Reemplaza `TU_API_KEY_DE_GEMINI_AQUI` con tu clave real. Puedes obtener una en [Google AI Studio](https://aistudio.google.com/app/apikey).
      
4.  **Ejecuta el servidor de desarrollo:**
    ```bash
    npm run start 
    # O el comando que uses para iniciar tu proyecto
    ```

5.  **Abre la aplicación:**
    Abre tu navegador y ve a la URL que te indique tu consola (normalmente `http://localhost:3000`).

## ¿Cómo Funciona?

Esta es una aplicación puramente de cliente (frontend). Toda la lógica se ejecuta en el navegador del usuario.

*   `src/App.tsx`: Es el componente principal que gestiona el estado general de la aplicación, como la herramienta activa, la imagen actual y el historial de generaciones.
*   `src/components/`: Contiene todos los componentes de React que forman la interfaz de usuario, divididos en:
    *   `Sidebar.tsx`: La barra de herramientas de la izquierda.
    *   `CanvasView.tsx`: El lienzo central donde se muestra y edita la imagen.
    *   `ControlPanel.tsx`: El panel derecho contextual que cambia según la herramienta seleccionada.
    *   `Gallery.tsx`: La galería inferior con las imágenes recientes.
*   `src/services/geminiService.ts`: Este es el núcleo de la integración con la IA. Contiene todas las funciones que construyen los prompts y las solicitudes a la API de Google Gemini para cada una de las funcionalidades (generar, editar, mejorar, etc.). Es aquí donde se lee la variable de entorno `API_KEY`.
*   `src/types.ts`: Define todas las interfaces y tipos de TypeScript utilizados en la aplicación para garantizar la consistencia de los datos.

## Contribuciones

¡Las contribuciones son bienvenidas! Si tienes ideas para mejorar la aplicación, por favor, abre un *issue* para discutirlo o envía un *pull request* con tus cambios.

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.
