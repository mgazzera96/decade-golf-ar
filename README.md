# Decade Golf AR - Sistema de Entrenamiento con Realidad Aumentada

Webapp de realidad aumentada para entrenar tu juego de golf al estilo Decade Golf. Marca objetivos, mide desviaciones laterales y mejora tu precisión.

## Características

- **Realidad Aumentada con WebXR**: Usa la cámara de tu dispositivo para ver el objetivo en el mundo real
- **Marcado de Objetivos**: Establece un target en cualquier superficie
- **Zonas de Medición**: Muestra automáticamente líneas a 10 yardas a cada lado del objetivo
- **Registro de Tiros**: Marca donde cayó cada bola y calcula la desviación
- **Estadísticas**: Tracking automático de promedio de desviación, mejor tiro y total de tiros
- **Historial Visual**: Ve todos tus tiros con código de colores por dirección

## Requisitos

### Dispositivos Compatibles

- **Android**: Chrome 79+ con ARCore
  - Google Pixel (todos los modelos)
  - Samsung Galaxy S8+, S9, S10, S20, S21, S22, S23, S24
  - OnePlus 6+
  - [Lista completa de dispositivos ARCore](https://developers.google.com/ar/devices)

- **iOS**: Safari 15+ (soporte limitado)
  - iPhone 6S o superior
  - iPad Pro (todos los modelos)

### Requisitos del Sistema

- Navegador con soporte WebXR
- Permisos de cámara y sensores de movimiento
- Conexión HTTPS (requerida para WebXR)

## Instalación

1. **Clona o descarga este repositorio**

2. **Sirve los archivos con HTTPS**

   Opción A - Usando un servidor local con HTTPS:
   ```bash
   # Instalar http-server si no lo tienes
   npm install -g http-server

   # Servir con HTTPS (necesitas certificados SSL)
   http-server -S -C cert.pem -K key.pem
   ```

   Opción B - Usar GitHub Pages:
   - Sube los archivos a un repositorio de GitHub
   - Activa GitHub Pages en la configuración del repositorio
   - Accede a `https://tu-usuario.github.io/tu-repo`

   Opción C - Usar un servicio como Vercel o Netlify:
   - Arrastra la carpeta del proyecto
   - Obtendrás una URL HTTPS automáticamente

3. **Abre en tu dispositivo móvil**
   - Navega a la URL HTTPS desde Chrome (Android) o Safari (iOS)
   - Acepta los permisos de cámara y sensores cuando se soliciten

## Cómo Usar

### Paso 1: Iniciar Sesión AR
1. Abre la app en tu dispositivo móvil
2. Toca el botón "Iniciar AR"
3. Permite el acceso a la cámara cuando se solicite
4. Apunta la cámara al suelo o una superficie plana

### Paso 2: Marcar el Objetivo
1. Mueve tu dispositivo hasta que veas el retículo verde centrado
2. Apunta al lugar donde quieres establecer tu objetivo
3. Toca "Marcar Objetivo"
4. Verás aparecer:
   - Un marcador rojo en el objetivo
   - Dos líneas amarillas a 10 yardas a cada lado

### Paso 3: Registrar Tiros
1. Después de cada tiro real, apunta tu dispositivo donde cayó la bola
2. Toca "Marcar Tiro"
3. La app calculará y mostrará:
   - Desviación en yardas
   - Dirección (Izquierda/Derecha/Centro)
4. El tiro se agrega automáticamente al historial

### Paso 4: Analizar Estadísticas
- El historial muestra todos tus tiros con código de colores
- Las estadísticas incluyen:
  - Total de tiros
  - Promedio de desviación
  - Mejor tiro (menor desviación)

### Controles Adicionales
- **Reiniciar**: Limpia el objetivo y todos los tiros (mantiene la sesión AR activa)
- **Detener AR**: Termina la sesión AR completa

## Estructura del Proyecto

```
decade-golf-ar/
├── index.html      # Estructura de la webapp
├── styles.css      # Estilos y diseño responsive
├── app.js          # Lógica WebXR y cálculos
└── README.md       # Este archivo
```

## Tecnologías Utilizadas

- **WebXR Device API**: Para sesiones de realidad aumentada
- **Three.js**: Renderizado 3D y geometría
- **Hit Testing API**: Detección de superficies reales
- **HTML5/CSS3/JavaScript**: Estructura y lógica de la app

## Cómo Funciona

1. **Hit Testing**: Usa WebXR Hit Testing API para detectar superficies en el mundo real
2. **Coordenadas 3D**: Almacena posiciones usando vectores de Three.js
3. **Cálculo de Desviación**:
   - Calcula el vector desde el objetivo al tiro
   - Proyecta sobre el vector perpendicular al objetivo
   - Convierte de metros a yardas (1 yarda = 0.9144 metros)
4. **Visualización**: Usa marcadores 3D en el espacio AR y overlay 2D en pantalla

## Limitaciones Conocidas

- Requiere buena iluminación para tracking preciso
- Funciona mejor en superficies planas y texturizadas
- La precisión depende del dispositivo y las condiciones
- No funciona en interiores sin suficiente textura visual

## Solución de Problemas

### "WebXR no disponible"
- Verifica que estás usando HTTPS
- Confirma que tu navegador soporta WebXR
- Intenta con Chrome en Android

### "AR no soportado"
- Verifica que tu dispositivo tiene ARCore/ARKit
- Actualiza tu navegador a la última versión
- Comprueba que los servicios AR están habilitados en tu dispositivo

### El reticle no aparece
- Apunta a una superficie con textura visible
- Mejora la iluminación del entorno
- Mueve el dispositivo lentamente
- Intenta apuntar a un área con más contraste

### Mediciones imprecisas
- Mantén el dispositivo estable al marcar
- Asegúrate de que la superficie de tracking es plana
- Recalibra marcando un nuevo objetivo si es necesario

## Próximas Mejoras

- [ ] Exportar estadísticas a CSV
- [ ] Modo de práctica con diferentes distancias de objetivo
- [ ] Visualización de patrones de dispersión
- [ ] Integración con Decade Golf (si API disponible)
- [ ] Modo de entrenamiento guiado con drills específicos
- [ ] Soporte offline con Service Workers

## Inspiración

Esta app está inspirada en el sistema DECADE Golf creado por Scott Fawcett, que usa matemáticas y estadísticas para mejorar la toma de decisiones en el golf.

## Licencia

Este proyecto es de código abierto para uso educativo y personal.

## Contribuciones

¿Encontraste un bug o tienes una idea? Abre un issue o pull request.

---

**Desarrollado con ❤️ para mejorar tu juego de golf**
