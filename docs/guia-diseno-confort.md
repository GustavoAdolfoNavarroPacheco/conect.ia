# Guía de diseño de interfaces con confort premium inspirado en Apple

## Propósito y criterio rector

El objetivo es construir una interfaz digital que se sienta serena,
precisa, intuitiva y cuidada. La referencia es la sensación de calidad,
claridad y naturalidad asociada a los productos de Apple: una
experiencia donde cada elemento parece tener una razón de existir, el
contenido se entiende sin esfuerzo y las interacciones responden de
manera fluida.

Esta guía define **principios de diseño y criterios de implementación**,
no una maqueta rígida. No se debe interpretar como una lista de
coordenadas ni como una instrucción para ubicar componentes específicos
en lugares predeterminados. La IA responsable del diseño debe estudiar
el propósito de cada pantalla, la importancia de su contenido, las
tareas de la persona usuaria y el contexto de uso; después, debe aplicar
estos principios de forma coherente.

La meta no es copiar literalmente una interfaz de Apple ni añadir
efectos por apariencia. Se busca alcanzar una calidad equivalente en
cuanto a ritmo visual, comodidad, proporción, jerarquía, precisión y
atención al detalle.

## 1. Principio fundamental: el espacio es parte del diseño

El espacio vacío no es espacio desperdiciado. Es un recurso funcional
que permite separar ideas, reducir la sensación de ruido y hacer que la
interfaz se perciba ordenada y fácil de comprender.

-   Diseñar primero la distribución y el ritmo de los espacios; después,
    refinar los componentes.
-   Evitar que todos los elementos estén demasiado cerca o que cada
    sección intente ocupar todo el espacio disponible.
-   Dar a cada grupo de contenido suficiente separación para que se
    perciba como una unidad independiente.
-   Utilizar el espacio para indicar relaciones: los elementos
    relacionados deben estar más próximos entre sí que respecto a los
    grupos ajenos.
-   Mantener una densidad visual deliberada. Una pantalla puede contener
    mucha información sin parecer saturada si la agrupación, la
    alineación y las distancias son consistentes.
-   No confundir minimalismo con falta de contenido, ni amplitud con
    tamaños excesivos. El espacio debe facilitar la comprensión, no
    dificultar el trabajo ni obligar a desplazarse innecesariamente.
-   Revisar cada margen y separación preguntando: ¿ayuda a comprender la
    estructura?, ¿mejora la lectura?, ¿da aire a los controles?, ¿o solo
    añade distancia sin beneficio?

La sensación de comodidad debe aparecer desde la composición general
hasta el espacio interno de un botón, una celda o un campo de
formulario.

## 2. Sistema de espaciado coherente

El espaciado no debe decidirse de manera improvisada para cada elemento.
La IA debe establecer un sistema de medidas reutilizable y aplicarlo en
toda la experiencia.

### Escala y consistencia

-   Definir una escala limitada de espaciado, basada en incrementos
    coherentes y fáciles de repetir.
-   Reservar separaciones pequeñas para elementos que funcionan juntos;
    separaciones medias para grupos dentro de una sección; y
    separaciones amplias para distinguir secciones o etapas diferentes.
-   Evitar valores arbitrarios repetidos por toda la interfaz. Si dos
    componentes cumplen una función equivalente, su espaciado debería
    seguir la misma regla.
-   Permitir excepciones solo cuando la jerarquía, el contenido o el
    contexto las justifiquen.
-   Centralizar las decisiones de espaciado en variables, tokens o
    utilidades del sistema de diseño, en vez de dispersar valores
    aislados por los componentes.
-   Revisar las distancias en conjunto. Un valor puede parecer correcto
    de forma aislada y aun así romper el ritmo de la pantalla cuando se
    compara con los demás.

### Márgenes exteriores

Los márgenes exteriores protegen el contenido de los bordes de la
ventana y crean una zona de respiración visual.

-   Mantener márgenes laterales suficientes y consistentes, adaptados al
    tamaño de pantalla.
-   Evitar que el contenido quede pegado a los bordes, especialmente en
    paneles, formularios, tablas, menús y elementos interactivos.
-   En pantallas grandes, no estirar indefinidamente los bloques de
    lectura. Usar anchos máximos razonables y una composición centrada o
    alineada con intención.
-   En pantallas pequeñas, reducir los márgenes de forma proporcionada,
    sin sacrificar la comodidad táctil ni la legibilidad.
-   Mantener una relación clara entre los márgenes del contenedor
    principal y los de sus secciones internas.
-   Respetar las áreas seguras del dispositivo y evitar que contenido o
    controles queden ocultos por barras del sistema o bordes físicos.

### Padding interno

El padding debe permitir que cada componente respire y que su contenido
no se sienta comprimido.

-   Aplicar padding suficiente a tarjetas, paneles, botones, campos,
    menús y filas interactivas.
-   Mantener una relación equilibrada entre el tamaño del componente y
    su espacio interno: ni contenido apretado ni superficies
    desproporcionadamente voluminosas.
-   Usar padding consistente en componentes equivalentes.
-   Alinear ópticamente el contenido, no solo sus cajas geométricas. Un
    icono, un texto y un control pueden requerir ajustes ópticos mínimos
    para sentirse centrados.
-   En componentes con encabezado, contenido y acciones, crear una
    estructura interna clara mediante separaciones y alineaciones, en
    lugar de depender de líneas divisorias para todo.
-   En formularios, dejar espacio suficiente entre la etiqueta, el
    campo, la ayuda contextual y los mensajes de validación.

### Separación entre elementos

-   Diferenciar claramente el espacio entre elementos de un mismo grupo
    y el espacio entre grupos distintos.
-   Mantener juntos los elementos que se interpretan como una unidad,
    por ejemplo una etiqueta y su campo, un icono y su texto, o un valor
    y su descripción.
-   Dar una separación mayor entre bloques que representan tareas, temas
    o etapas diferentes.
-   No insertar separaciones grandes de manera uniforme entre todos los
    elementos: eso elimina la jerarquía y puede hacer que el contenido
    parezca fragmentado.
-   No compensar una mala composición con espacios enormes. Corregir
    primero la estructura, las proporciones y la agrupación.

## 3. Simetría, alineación y equilibrio visual

La interfaz debe transmitir estabilidad y precisión. Para conseguirlo,
se necesita una estructura visual consistente, no una simetría rígida en
todas las circunstancias.

-   Definir ejes de alineación reconocibles para títulos, descripciones,
    controles, tablas, tarjetas y acciones.
-   Alinear los elementos por su función y relación, no solo porque sea
    sencillo colocarlos en una misma fila.
-   Mantener consistencia en los bordes iniciales y finales de las
    columnas, contenedores y grupos.
-   Cuando existan varias columnas, establecer proporciones
    intencionales y conservarlas en toda la pantalla.
-   Evitar que las tarjetas parezcan distribuidas al azar o que sus
    alturas, paddings y encabezados cambien sin motivo.
-   Usar una cuadrícula flexible para estructurar la composición y
    facilitar que las secciones se relacionen visualmente.
-   Mantener el equilibrio entre áreas densas y áreas abiertas. Si una
    parte concentra mucha información, el resto de la composición debe
    ayudar a compensar esa carga.
-   Considerar el peso visual de títulos, gráficos, iconos, cifras y
    controles. El equilibrio no depende solo de que los elementos tengan
    el mismo tamaño.
-   No forzar la simetría cuando la información tiene prioridades
    diferentes. La asimetría controlada puede ser más clara, siempre que
    se perciba deliberada.
-   Revisar la pantalla a distancia y en tamaño reducido: los
    desequilibrios, las alineaciones defectuosas y los bloques
    desproporcionados suelen hacerse más evidentes.

## 4. Jerarquía visual y claridad

La persona usuaria debería entender rápidamente qué pantalla está
viendo, qué información es importante y qué acción puede realizar.

-   Establecer niveles claros entre título principal, título de sección,
    subtítulo, texto descriptivo, metadatos y contenido auxiliar.
-   Evitar que todos los elementos compitan por atención. La jerarquía
    se construye con proporción, ubicación, espaciado, peso tipográfico
    y tratamiento visual.
-   Dar protagonismo a la tarea principal de la pantalla, no a adornos,
    etiquetas secundarias ni métricas que no ayuden a decidir.
-   Escribir títulos breves y útiles. Las descripciones deben aportar
    contexto, no repetir el título.
-   Usar el espacio para reforzar la jerarquía: un título importante
    necesita una relación de separación clara con el contenido que
    introduce.
-   Mantener una longitud de línea cómoda para la lectura y evitar
    párrafos demasiado anchos.
-   Presentar la información progresivamente. Mostrar primero lo
    necesario para actuar y dejar el detalle secundario disponible
    cuando resulte útil.
-   No ocultar información imprescindible solo para conseguir una
    apariencia minimalista.
-   Evitar una acumulación de tarjetas, etiquetas, insignias,
    separadores y paneles cuando la propia estructura ya puede organizar
    el contenido.

## 5. Tipografía y comodidad de lectura

La tipografía debe sentirse precisa, legible y coherente. Su función
principal es facilitar la comprensión, no decorar la interfaz.

-   Crear una escala tipográfica limitada y consistente, con tamaños y
    pesos asignados a roles concretos.
-   Evitar saltos arbitrarios entre tamaños o el uso de demasiados
    estilos en una sola pantalla.
-   Mantener una altura de línea que facilite la lectura y distinga los
    bloques sin producir espacios excesivos.
-   Ajustar el espaciado entre letras con moderación y según el
    contexto; no aplicar ajustes globales sin evaluar el resultado.
-   Evitar textos auxiliares tan pequeños que requieran esfuerzo
    adicional para leerlos.
-   No utilizar texto en mayúsculas de forma generalizada. Reservarlo
    para casos puntuales en los que mejore la identificación.
-   Procurar que los números, cantidades, fechas y datos tabulares sean
    fáciles de comparar.
-   Evitar títulos excesivamente grandes que desplacen el contenido útil
    o provoquen una composición desproporcionada.
-   Mantener un comportamiento coherente en la tipografía de botones,
    campos, menús, tablas, mensajes y diálogos.
-   Comprobar el diseño con contenido real: nombres largos, cifras
    extensas, textos en varias líneas y traducciones pueden cambiar
    notablemente la composición.

## 6. Contenedores, tarjetas y superficies

Los contenedores deben aportar estructura y agrupación, sin convertir
cada fragmento de información en una caja independiente.

-   Usar tarjetas cuando exista una unidad de contenido reconocible, una
    tarea diferenciada o una necesidad real de agrupar información.
-   Evitar la anidación excesiva de tarjetas dentro de otras tarjetas.
    Esta práctica suele generar ruido y reduce la claridad de la
    jerarquía.
-   Mantener consistencia en los radios, el padding, la alineación y la
    estructura interna de componentes equivalentes.
-   Elegir radios de esquina con moderación y coherencia. No redondear
    todo de forma indiscriminada ni combinar geometrías incompatibles.
-   Utilizar divisores únicamente cuando faciliten la lectura o separen
    información que de otro modo se confundiría.
-   Evitar bordes y contornos redundantes si el espaciado y la
    estructura ya permiten distinguir las secciones.
-   Diseñar las superficies para que parezcan integradas en la interfaz,
    no como piezas flotantes sin relación con el resto.
-   Conservar suficiente espacio alrededor de las tarjetas para que sus
    límites se perciban sin necesidad de exagerar sus efectos.

## 7. Sombras, profundidad y elevación

La profundidad debe comunicar una relación funcional: qué elemento está
por encima, qué puede interactuar, qué se ha abierto y qué pertenece al
plano principal.

-   Aplicar sombras suaves y discretas, con transiciones amplias y
    bordes poco agresivos.
-   Utilizar la elevación de forma jerárquica: una ventana emergente o
    un menú superpuesto puede necesitar más profundidad que una tarjeta
    estática.
-   Reservar las sombras más perceptibles para elementos que realmente
    flotan o se separan del flujo del contenido.
-   Evitar sombras oscuras, muy duras, demasiado extendidas o acumuladas
    en varios niveles.
-   No aplicar la misma sombra a todos los componentes. Si todo parece
    elevado, la elevación deja de comunicar algo.
-   Evitar combinar sombra intensa, borde marcado y gran contraste de
    superficie cuando los tres recursos cumplen la misma función.
-   Mantener la dirección y el comportamiento de las sombras coherentes
    a lo largo de la interfaz.
-   Revisar el resultado en diferentes tamaños y escalas: una sombra
    sutil puede volverse excesiva en un componente pequeño.
-   No utilizar sombras como sustituto de una jerarquía mal resuelta.

## 8. Radios, geometría y proporciones

Las formas deben ser consistentes y sentirse diseñadas como parte de una
misma familia.

-   Definir un sistema de radios reutilizable para controles pequeños,
    contenedores, paneles y superficies superpuestas.
-   Evitar mezclar esquinas muy cuadradas con otras extremadamente
    redondeadas sin una razón funcional.
-   Ajustar la forma al propósito: los controles compactos y las
    superficies amplias no siempre necesitan el mismo radio.
-   Mantener proporciones naturales entre iconos, texto, altura de los
    controles y espacio interior.
-   Evitar botones demasiado altos, tarjetas innecesariamente grandes y
    campos de formulario con proporciones distintas entre sí.
-   Revisar la alineación óptica de iconos y texto, especialmente en
    botones y controles compactos.
-   Asegurarse de que los elementos no parezcan estirados, comprimidos o
    deformados al cambiar de tamaño.

## 9. Animaciones: fluidez sin espectáculo

Las animaciones deben hacer que la interfaz se sienta continua,
predecible y receptiva. No deben llamar la atención por sí mismas ni
retrasar una tarea.

### Principios de movimiento

-   Usar el movimiento para explicar una relación: apertura, cierre,
    expansión, selección, cambio de contexto o confirmación.
-   Favorecer transiciones breves, suaves y naturales, con aceleración y
    desaceleración coherentes.
-   Evitar desplazamientos largos, rebotes exagerados, giros
    decorativos, zooms agresivos y efectos que parezcan una demostración
    visual.
-   No animar todo. Los cambios de contenido simples pueden resolverse
    sin movimiento si la animación no aporta comprensión.
-   Hacer que la respuesta a una interacción se perciba inmediata. La
    animación no debe hacer que un control parezca lento.
-   Mantener una duración coherente entre interacciones equivalentes,
    adaptándola según la distancia recorrida y la importancia del
    cambio.
-   Utilizar movimientos pequeños y controlados para estados locales;
    reservar transiciones más amplias para cambios reales de contexto.
-   Evitar que múltiples elementos se muevan de forma independiente sin
    una relación clara. La coordinación debe sentirse natural, no
    coreografiada en exceso.

### Curvas y temporización

-   Elegir curvas de aceleración y desaceleración que den sensación de
    inicio y final controlados.
-   Evitar velocidades constantes cuando produzcan un movimiento
    mecánico.
-   Reducir la duración de las animaciones repetitivas o frecuentes.
-   No hacer que un elemento tarde en aparecer por esperar a que termine
    una animación decorativa.
-   Usar pequeñas diferencias de temporización solo cuando ayuden a
    comprender una secuencia; no añadir retrasos por rutina.
-   Mantener una lógica temporal compartida para entradas, salidas,
    cambios de estado y superficies flotantes.

### Interacciones concretas

-   Los botones deben proporcionar una respuesta visual discreta al
    pasar el cursor, presionar, enfocar o quedar deshabilitados.
-   Los menús y ventanas emergentes deben abrirse y cerrarse de forma
    rápida, sin ocultar la relación con el elemento que los invocó.
-   Los paneles expandibles deben mostrar una transición que permita
    entender qué contenido aparece y de dónde procede.
-   Los cambios de página o de sección deben preservar la orientación de
    la persona usuaria y evitar movimientos innecesarios.
-   Los indicadores de carga deben ser discretos y comunicar que el
    sistema está trabajando, sin bloquear la experiencia más de lo
    necesario.
-   Los estados de éxito, error y validación deben aparecer de forma
    clara y oportuna; la animación nunca debe ser el único medio de
    comunicar el resultado.
-   Evitar animar propiedades que provoquen recalcular continuamente el
    diseño si puede lograrse el efecto de forma más eficiente.

### Accesibilidad del movimiento

-   Respetar las preferencias del sistema para reducir movimiento, por
    ejemplo mediante `prefers-reduced-motion`.
-   Ofrecer una alternativa con movimiento reducido o eliminado cuando
    la persona lo solicite.
-   No depender de destellos, parpadeos o movimientos intensos para
    transmitir información.
-   Asegurar que las animaciones no provoquen mareo, desorientación ni
    pérdida del foco.

## 10. Microinteracciones y respuesta del sistema

La sensación premium aparece en buena medida en los detalles pequeños y
consistentes.

-   Cada control interactivo debe comunicar con claridad que puede
    utilizarse y responder cuando se activa.
-   Mantener estados bien definidos: normal, hover, focus, pressed,
    selected, disabled, loading, success y error cuando correspondan.
-   Evitar respuestas ambiguas, retrasos inexplicables o cambios de
    estado que no correspondan a la acción realizada.
-   Dar confirmación inmediata cuando una acción se complete o cuando el
    sistema necesite tiempo para procesarla.
-   Utilizar mensajes breves, específicos y orientados a la solución.
-   No utilizar cambios de tamaño bruscos como respuesta habitual al
    cursor.
-   Mantener un comportamiento uniforme entre componentes similares.
-   Evitar efectos puramente decorativos que distraigan de la tarea
    principal.

## 11. Botones y controles táctiles

Los controles deben sentirse cómodos, previsibles y fáciles de activar.

-   Proporcionar áreas de interacción suficientemente grandes,
    especialmente en dispositivos táctiles.
-   Separar controles próximos para reducir errores de selección.
-   Mantener alturas, alineaciones y espacios internos consistentes
    entre controles de la misma categoría.
-   Hacer que la jerarquía de las acciones sea clara: acción principal,
    acción secundaria y acción destructiva no deben competir por igual.
-   Usar etiquetas concretas que indiquen el resultado esperado, en
    lugar de textos ambiguos.
-   Evitar botones con padding excesivo que alteren el ritmo de la
    pantalla o reduzcan el espacio disponible para contenido.
-   Asegurar estados de foco visibles para navegación por teclado.
-   No depender exclusivamente del cursor para explicar que un elemento
    es interactivo.
-   Mantener los controles deshabilitados claramente distinguibles y
    explicar, cuando sea necesario, qué falta para poder utilizarlos.

## 12. Formularios y entrada de datos

Los formularios deben reducir la carga mental y permitir que la persona
avance sin fricción.

-   Agrupar campos por afinidad semántica y por el orden natural en que
    se necesita la información.
-   Mantener una distancia clara y constante entre campos, etiquetas,
    ayudas y mensajes de validación.
-   Evitar formularios que se extiendan en demasiadas columnas si eso
    dificulta seguir el orden de lectura.
-   Utilizar la distribución en columnas solo cuando los campos sean
    breves, estén relacionados y la composición siga siendo clara en
    pantallas pequeñas.
-   Colocar las etiquetas en una posición consistente y no depender
    únicamente del texto de ejemplo dentro del campo.
-   Mostrar requisitos y restricciones antes de que la persona cometa un
    error, cuando sea posible.
-   Validar de forma oportuna, sin interrumpir cada pulsación ni borrar
    la información introducida.
-   Conservar los datos ingresados cuando se produzca un error.
-   Explicar cómo corregir el problema con mensajes cercanos al campo
    correspondiente.
-   Evitar campos, selectores o controles de altura y anchura
    inconsistentes sin una razón.
-   Diseñar con datos reales y límites razonables de longitud para
    prevenir desbordamientos.

## 13. Tablas, listados y datos densos

La claridad debe mantenerse incluso en pantallas operativas que
contienen muchos registros.

-   Priorizar la lectura y comparación rápida de la información.
-   Mantener alineaciones estables entre encabezados y valores.
-   Usar alturas de fila cómodas y consistentes, evitando tanto la
    compresión excesiva como las filas gigantes.
-   Dar espacio suficiente a los datos sin permitir que las columnas se
    expandan sin control.
-   Definir anchos de columna según el tipo y la prioridad de cada dato.
-   Evitar que iconos, etiquetas, acciones y metadatos saturen cada
    fila.
-   Mantener acciones frecuentes fáciles de localizar y acciones
    secundarias menos intrusivas.
-   Tratar correctamente los textos largos, los nombres extensos, los
    valores vacíos y los datos que no caben.
-   Utilizar truncamiento solo cuando exista una forma razonable de
    consultar el contenido completo.
-   Si se usa paginación, filtros o selección de filas, mantenerlos
    alineados y coherentes con el conjunto de datos.
-   No introducir desplazamiento interno en múltiples contenedores si
    hace que la navegación sea confusa. Cada área desplazable debe tener
    una razón clara.
-   En móvil, elegir una estrategia consciente para datos tabulares, en
    vez de reducir todas las columnas hasta volverlas ilegibles.

## 14. Navegación y orientación

La persona usuaria debe comprender dónde está, cómo llegó y cómo
continuar.

-   Mantener la navegación consistente entre pantallas equivalentes.
-   Separar las opciones principales de las secundarias y evitar
    estructuras de navegación excesivamente profundas.
-   Dar un tratamiento claro a la sección activa.
-   Mantener una relación visual reconocible entre encabezados de
    página, contenido principal y acciones de contexto.
-   Evitar que cada pantalla invente una estructura distinta si forma
    parte del mismo producto.
-   No repetir innecesariamente el mismo título, las mismas acciones o
    la misma información en varios niveles.
-   Ofrecer formas previsibles de cerrar, volver o cancelar cuando la
    interacción lo requiera.
-   Preservar el contexto cuando la persona regrese de una vista de
    detalle a un listado, si resulta relevante para su tarea.

## 15. Diseño adaptable y proporciones según pantalla

La comodidad no consiste en encoger una interfaz de escritorio hasta que
quepa en un móvil. Cada tamaño necesita una composición adecuada.

-   Diseñar con una lógica adaptable basada en el espacio disponible y
    en la naturaleza del contenido.
-   Definir puntos de adaptación cuando la composición deje de
    funcionar, no solo según modelos concretos de dispositivos.
-   Reorganizar columnas, grupos y acciones cuando sea necesario,
    manteniendo el orden de lectura.
-   Reducir márgenes de forma proporcional en pantallas pequeñas,
    conservando una separación segura respecto a los bordes.
-   Evitar que las tarjetas y paneles tengan alturas rígidas que corten
    el contenido.
-   Impedir desbordamientos horizontales accidentales, superposiciones y
    controles parcialmente ocultos.
-   Mantener una jerarquía tipográfica y un tamaño de interacción
    cómodos en todas las resoluciones.
-   En pantallas amplias, utilizar el espacio adicional para mejorar la
    organización, no simplemente para agrandar cada elemento.
-   Probar estados intermedios: una interfaz puede verse bien en dos
    tamaños extremos y fallar en los anchos que existen entre ellos.

## 16. Contenido, iconografía y detalle visual

Los detalles deben apoyar la comprensión y seguir una lógica común.

-   Utilizar iconos de una misma familia visual, con proporciones y
    grosores consistentes.
-   Elegir iconos reconocibles y evitar símbolos ambiguos que requieran
    interpretación.
-   Acompañar con texto las acciones que no sean universalmente
    evidentes.
-   Mantener una escala coherente entre iconos, etiquetas y texto.
-   Evitar adornos que no aporten información, contexto o utilidad.
-   Cuidar la alineación de iconos con la línea base del texto y con el
    centro óptico del control.
-   Usar etiquetas, indicadores y metadatos con moderación.
-   Evitar duplicar el mismo significado mediante demasiados recursos
    visuales.
-   Revisar los estados vacíos, errores, carga, falta de resultados y
    contenido extenso con el mismo cuidado que la pantalla ideal.

## 17. Accesibilidad y confort cognitivo

Una interfaz cómoda debe funcionar para personas con distintas
capacidades, hábitos y formas de interacción.

-   Mantener una estructura semántica correcta y un orden de foco
    lógico.
-   Permitir el uso completo mediante teclado.
-   Mostrar claramente el foco actual.
-   Asegurar que los controles tengan nombres accesibles y que los
    iconos funcionales dispongan de una descripción apropiada.
-   No transmitir información únicamente mediante un cambio visual.
-   Mantener una legibilidad suficiente, con jerarquía clara y lenguaje
    comprensible.
-   Evitar mensajes inesperados, ventanas intrusivas y confirmaciones
    innecesarias.
-   Pedir confirmación antes de acciones irreversibles o destructivas,
    sin convertir cada operación cotidiana en un obstáculo.
-   Reducir la cantidad de decisiones simultáneas cuando sea posible.
-   Respetar las preferencias del sistema relacionadas con movimiento y
    otras opciones de accesibilidad.
-   Mantener objetivos táctiles cómodos y suficientemente separados.

## 18. Rendimiento y percepción de calidad

Una interfaz lenta no se siente refinada, aunque su apariencia sea
excelente.

-   Mantener las transiciones fluidas y evitar animaciones que bloqueen
    la interacción.
-   Evitar renderizados innecesarios, efectos costosos y cambios
    continuos de diseño.
-   Reservar el espacio de los elementos que se cargarán de forma
    diferida para reducir saltos en la composición.
-   Mostrar estados de carga apropiados cuando una operación no pueda
    resolverse inmediatamente.
-   Evitar que las imágenes, fuentes o componentes provoquen movimientos
    inesperados del contenido.
-   Priorizar la respuesta de las acciones principales.
-   Comprobar el comportamiento en dispositivos modestos y en
    situaciones de conexión lenta.
-   Usar efectos visuales con moderación y solo cuando su coste de
    rendimiento esté justificado.

## 19. Consistencia a escala de producto

El confort no puede limitarse a una pantalla aislada. Debe percibirse a
lo largo de todo el producto.

-   Crear un sistema de diseño compartido para espaciado, tipografía,
    radios, elevación, tamaños de control, transiciones y estados.
-   Reutilizar componentes cuando tengan el mismo propósito y
    comportamiento.
-   Evitar duplicar componentes con pequeñas diferencias visuales no
    justificadas.
-   Documentar las excepciones para que no se conviertan en decisiones
    improvisadas.
-   Mantener consistencia entre pantallas, diálogos, menús, formularios,
    tablas y estados vacíos.
-   Revisar el producto como un sistema: la calidad de una pantalla
    también depende de cómo se relaciona con las demás.
-   Favorecer componentes simples, predecibles y fáciles de mantener
    antes que soluciones visuales complejas difíciles de controlar.

## 20. Método de trabajo que debe seguir la IA

Antes de implementar una interfaz, la IA debe:

1.  **Comprender la tarea.** Identificar qué intenta conseguir la
    persona usuaria, qué información necesita y qué acciones son
    prioritarias.
2.  **Analizar el contenido real.** Revisar la longitud de los textos,
    la cantidad de campos, la densidad de los datos y los estados
    posibles.
3.  **Definir la jerarquía.** Determinar qué debe percibirse primero,
    qué pertenece a cada grupo y qué puede quedar en segundo plano.
4.  **Planificar los espacios.** Establecer márgenes exteriores,
    anchuras máximas, separación entre secciones, espacios entre grupos
    y padding interno mediante una escala coherente.
5.  **Establecer alineaciones.** Definir los ejes, las columnas, las
    proporciones y los puntos de referencia que darán estabilidad a la
    composición.
6.  **Construir con componentes consistentes.** Aplicar las mismas
    reglas de forma, tipografía, espaciado y comportamiento a los
    elementos equivalentes.
7.  **Añadir profundidad con criterio.** Utilizar sombras y elevación
    únicamente para explicar la estructura o la interacción.
8.  **Diseñar el movimiento.** Identificar qué cambios necesitan
    animación, cuál es su propósito y cómo respetar la rapidez y la
    accesibilidad.
9.  **Adaptar la composición.** Ajustar el sistema a pantallas grandes,
    pequeñas y anchos intermedios.
10. **Evaluar el resultado real.** Inspeccionar la interfaz renderizada,
    no conformarse con que el código compile o con una descripción
    conceptual.
11. **Corregir los desequilibrios.** Revisar márgenes, paddings,
    alineaciones, densidad, tamaños, sombras, radios, transiciones y
    estados.
12. **Repetir la revisión.** No dar por terminada la tarea mientras
    existan defectos visuales evidentes, inconsistencias o problemas de
    uso.

Si falta información esencial, la IA debe preguntar en lugar de inventar
requisitos. Cuando el objetivo esté suficientemente definido, debe tomar
decisiones razonables y explicar las excepciones importantes, sin
detener el trabajo por detalles menores.

## 21. Lista de revisión de calidad

Antes de considerar terminada una pantalla, comprobar los siguientes
puntos:

### Espacios y composición

-   [ ] Los márgenes exteriores son consistentes y apropiados para el
    tamaño de pantalla.
-   [ ] El padding interno permite que el contenido respire.
-   [ ] Los elementos relacionados están agrupados y los grupos
    diferentes se distinguen con claridad.
-   [ ] Existe una escala de espaciado coherente; no abundan los valores
    arbitrarios.
-   [ ] No hay áreas comprimidas ni zonas vacías que parezcan
    accidentales.
-   [ ] El contenido no está innecesariamente estirado ni amontonado.
-   [ ] La composición mantiene equilibrio y alineaciones reconocibles.

### Jerarquía y lectura

-   [ ] La acción principal y la información prioritaria se entienden
    rápidamente.
-   [ ] Los tamaños tipográficos son consistentes y cómodos de leer.
-   [ ] Los textos largos, las cifras y los datos reales no rompen el
    diseño.
-   [ ] No existen adornos, paneles o etiquetas redundantes.
-   [ ] Los títulos, descripciones y metadatos tienen funciones
    diferenciadas.

### Componentes y profundidad

-   [ ] Los componentes equivalentes mantienen proporciones y espaciados
    consistentes.
-   [ ] Los radios de esquina forman un sistema coherente.
-   [ ] Las sombras son sutiles y comunican una jerarquía real.
-   [ ] No se han acumulado bordes, sombras y contenedores innecesarios.
-   [ ] Los controles tienen áreas de interacción cómodas y estados
    claros.

### Movimiento y respuesta

-   [ ] Cada animación cumple una función y no es meramente decorativa.
-   [ ] Las transiciones son breves, naturales y consistentes.
-   [ ] La interfaz responde de inmediato a las acciones.
-   [ ] Se respetan las preferencias de movimiento reducido.
-   [ ] Los estados de carga, éxito y error son comprensibles sin
    depender de la animación.

### Adaptabilidad y accesibilidad

-   [ ] No hay desbordamientos, solapamientos ni contenido cortado.
-   [ ] La interfaz funciona en pantallas pequeñas, grandes e
    intermedias.
-   [ ] Se puede navegar mediante teclado y el foco es visible.
-   [ ] Los controles y mensajes tienen nombres accesibles.
-   [ ] La interfaz conserva su comodidad cuando cambia la longitud del
    contenido.

### Revisión final

-   [ ] La pantalla se percibe serena, precisa y fácil de comprender.
-   [ ] El diseño no parece genérico, recargado ni excesivamente
    voluminoso.
-   [ ] Cada espacio, efecto y componente tiene una razón de existir.
-   [ ] La experiencia se siente coherente con el resto del producto.
-   [ ] Se ha revisado la interfaz renderizada y se han corregido los
    defectos detectados.

## 22. Criterio final

La calidad no se mide por la cantidad de efectos, tarjetas, sombras o
animaciones, sino por la naturalidad con la que todo funciona en
conjunto.

Una interfaz bien resuelta debe sentirse **espaciosa sin desperdiciar
espacio, minimalista sin perder información, refinada sin ser
ornamental, animada sin distraer y consistente sin volverse rígida**.

La IA debe priorizar el orden, el ritmo del espaciado, la proporción, la
alineación y la claridad antes de añadir refinamientos. El acabado final
debe surgir de muchas decisiones pequeñas bien coordinadas, no de un
efecto visual aislado.
