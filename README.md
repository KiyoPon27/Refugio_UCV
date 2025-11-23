# METODOLOGÍA - Sistema Experto "Sumak Kawsay" para Primeros Auxilios

## 1. INTRODUCCIÓN A LA METODOLOGÍA

El presente trabajo desarrolla un sistema experto híbrido para la orientación en primeros auxilios, combinando técnicas de inteligencia artificial simbólica (sistemas basados en reglas) con métodos de aprendizaje automático supervisado. El sistema está diseñado específicamente para el contexto de Trujillo, Perú, considerando emergencias comunes de la región y la infraestructura de salud local.

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Diseño Híbrido

El sistema implementa una arquitectura híbrida que integra dos paradigmas complementarios de inteligencia artificial:

1. **Componente Simbólico (Basado en Reglas)**: Motor de inferencia con encadenamiento hacia adelante (forward chaining) y hacia atrás (backward chaining)
2. **Componente Subsimbólico (Aprendizaje Automático)**: Algoritmos de clasificación supervisada y regresión

Esta arquitectura híbrida permite:
- **Seguridad**: Las reglas expertas garantizan protocolos validados para emergencias críticas
- **Adaptabilidad**: Los modelos de ML aprenden patrones de casos históricos
- **Trazabilidad**: Cada decisión es explicable mediante reglas o características del modelo
- **Robustez**: Votación entre múltiples clasificadores reduce errores

### 2.2 Flujo de Inferencia

```
Entrada (Síntomas + Signos Vitales)
    ↓
1. Motor de Reglas (Forward Chaining)
    → Identifica emergencias críticas
    → Asigna protocolos de actuación
    → Genera triage inicial (triage_reglas)
    ↓
2. Árbol de Decisión
    → Clasificación primaria
    → Genera triage_arbol
    ↓
3. Random Forest
    → Clasificación secundaria robusta
    → Genera triage_bosque
    ↓
4. Votación Ponderada
    → Prioridad: Rojo > Amarillo > Verde > Negro
    → Genera triage_final
    ↓
5. Selección de Centro de Salud
    → Basado en distrito y prioridad
    → Estima tiempo de respuesta (Regresión Lineal)
    ↓
Salida (Clasificación + Protocolos + Recomendación)
```

## 3. COMPONENTE SIMBÓLICO: MOTOR DE REGLAS

### 3.1 Base de Conocimiento

La base de conocimiento se representa mediante una estructura de hechos (facts) que almacena:
- **Signos vitales**: consciencia, respiración, pulso
- **Síntomas**: dolor_pecho, hemorragia_severa, convulsiones, deshidratación, etc.
- **Contexto**: edad, temperatura ambiente, distrito, hora
- **Conclusiones**: triage_reglas, emergencia_critica, protocolos

**Implementación técnica**:
```python
class BaseConocimiento:
    - Almacena pares (nombre_hecho, valor)
    - Métodos: obtener(), contiene(), agregar()
```

### 3.2 Reglas de Producción

Cada regla sigue el formato:
```
SI (condiciones) ENTONCES (conclusiones)
```

**Estructura de una regla**:
- **Nombre**: Identificador descriptivo
- **Condiciones**: Lista de predicados que deben cumplirse
- **Conclusiones**: Acciones que modifican la base de conocimiento
- **Concluye_objetivo**: Para backward chaining

**Ejemplo de regla crítica**:
```
SI (respira = False OR consciente = False)
ENTONCES 
    - triage_reglas = "Rojo"
    - emergencia_critica = True
    - Protocolo: ["Verificar seguridad", "Llamar 116/911", 
                  "Abrir vía aérea", "Iniciar RCP"]
```

### 3.3 Encadenamiento hacia Adelante (Forward Chaining)

**Algoritmo**:
1. Dado un conjunto de hechos iniciales
2. Evaluar todas las reglas
3. Si una regla cumple todas sus condiciones:
   - Ejecutar sus conclusiones
   - Marcar regla como disparada
   - Agregar nuevos hechos a la base
4. Repetir hasta que no se disparen más reglas o se alcance límite de iteraciones

**Características**:
- Prioriza reglas de emergencias críticas
- Máximo 20 iteraciones por defecto
- Genera traza de reglas disparadas
- Previene ciclos infinitos

### 3.4 Encadenamiento hacia Atrás (Backward Chaining)

**Algoritmo**:
1. Dado un objetivo a probar (ej: "emergencia_critica")
2. Si el objetivo ya existe como hecho → éxito
3. Si no, buscar reglas que concluyan ese objetivo
4. Para cada regla encontrada:
   - Intentar probar recursivamente sus condiciones
   - Si todas se prueban, ejecutar conclusiones → éxito
5. Si ninguna regla lo prueba → fallo

**Ventajas**:
- Búsqueda dirigida por objetivos
- Eficiente cuando se conoce el objetivo
- Control de ciclos mediante conjunto de visitados

### 3.5 Reglas Específicas para Trujillo

El sistema implementa **15+ reglas** adaptadas al contexto regional:

**Emergencias Críticas**:
- ABC (vía aérea, respiración)
- Hemorragia severa
- Atragantamiento
- Ahogamiento (costa: Huanchaco, Moche)
- Convulsiones
- Dolor de pecho (posible infarto)

**Emergencias Relacionadas con Clima**:
- Deshidratación (clima cálido de Trujillo)
- Golpe de calor (T° ambiente > 35°C)

**Emergencias Comunes**:
- Quemaduras (graves/leves)
- Traumatismos
- Cortes superficiales

## 4. COMPONENTE SUBSIMBÓLICO: APRENDIZAJE AUTOMÁTICO

### 4.1 Árbol de Decisión para Triage

**Objetivo**: Clasificar casos en 4 categorías de triage (Rojo, Amarillo, Verde, Negro)

#### 4.1.1 Criterios de Impureza

**Índice de Gini**:
```
Gini(S) = 1 - Σ(p_i²)
```
donde p_i es la proporción de la clase i en el conjunto S

**Entropía**:
```
Entropía(S) = -Σ(p_i * log₂(p_i))
```

**Ganancia de Información**:
```
Ganancia(S, A) = Impureza(S) - Σ(|S_v|/|S| * Impureza(S_v))
```
donde S_v son las particiones resultantes de dividir por atributo A

#### 4.1.2 Algoritmo de Construcción

**Entrada**: 
- X: conjunto de casos {feature₁, feature₂, ..., feature_n}
- y: etiquetas {Rojo, Amarillo, Verde, Negro}

**Proceso Recursivo**:
```
FUNCIÓN construir_árbol(datos, profundidad):
    SI todas las etiquetas son iguales:
        RETORNAR hoja con esa etiqueta
    
    SI profundidad >= max_profundidad OR muestras < min_muestras_split:
        RETORNAR hoja con clase mayoritaria
    
    mejor_split = encontrar_mejor_división(datos)
    
    SI no hay mejora:
        RETORNAR hoja con clase mayoritaria
    
    nodo = crear_nodo_interno(mejor_split)
    nodo.izquierda = construir_árbol(datos_izquierda, profundidad+1)
    nodo.derecha = construir_árbol(datos_derecha, profundidad+1)
    
    RETORNAR nodo
```

**Encontrar Mejor División**:
```
PARA cada feature f:
    valores_únicos = ordenar(valores_únicos(f))
    candidatos = puntos_medios(valores_únicos)
    
    PARA cada umbral t en candidatos:
        izquierda = {x | x[f] <= t}
        derecha = {x | x[f] > t}
        
        impureza_total = (|izq|/|total|)*impureza(izq) + 
                         (|der|/|total|)*impureza(der)
        
        SI impureza_total < mejor_impureza:
            actualizar mejor_split
```

#### 4.1.3 Características (Features)

**16 características seleccionadas**:
- **Signos vitales** (3): consciente, respira, pulso [booleano]
- **Síntomas graves** (4): hemorragia_severa, dolor_pecho, quemadura_grave, convulsiones
- **Síntomas moderados** (3): trauma, atragantamiento, ahogamiento
- **Síntomas leves** (2): quemadura_leve, corte_superficial
- **Condiciones especiales** (2): deshidratacion, embarazada
- **Contexto** (2): temperatura [15-40°C], edad [0-120 años]

**Justificación clínica**: 
Todas las características tienen relevancia médica directa en la evaluación de emergencias. Se evita la inclusión de características irrelevantes que podrían introducir ruido.

#### 4.1.4 Hiperparámetros

- **max_profundidad**: 6 (evita sobreajuste, mantiene interpretabilidad)
- **min_muestras_split**: 2 (permite divisiones finas en datasets pequeños)
- **criterio**: Gini o Entropía (intercambiables según experimentación)

#### 4.1.5 Manejo de Empates

**Prioridad de seguridad**:
```
Rojo > Amarillo > Verde > Negro
```

Cuando múltiples clases tienen igual frecuencia en una hoja, se selecciona la más crítica para garantizar seguridad del paciente.

### 4.2 Random Forest (Bosque Aleatorio)

**Objetivo**: Mejorar robustez y reducir varianza del árbol único mediante ensamblado

#### 4.2.1 Algoritmo

```
FUNCIÓN entrenar_random_forest(X, y, n_árboles):
    árboles = []
    
    PARA i = 1 hasta n_árboles:
        # 1. Bootstrap: muestreo con reemplazo
        X_boot, y_boot = bootstrap(X, y)
        
        # 2. Subespacio de features: sqrt(F) características
        features_subset = random_sample(features, k=sqrt(|features|))
        
        # 3. Entrenar árbol con subset
        árbol = entrenar_árbol(X_boot[features_subset], y_boot)
        
        árboles.append((árbol, features_subset))
    
    RETORNAR árboles
```

**Predicción por Votación**:
```
FUNCIÓN predecir(X_nuevo):
    votos = []
    
    PARA cada (árbol, features) en árboles:
        X_sub = X_nuevo[features]
        predicción = árbol.predecir(X_sub)
        votos.append(predicción)
    
    RETORNAR clase_mayoritaria_con_prioridad(votos)
```

#### 4.2.2 Hiperparámetros

- **n_árboles**: 15 (balance entre rendimiento y velocidad)
- **max_profundidad**: 5 (árboles más simples para diversidad)
- **features por árbol**: √F ≈ 4 características de 16 totales

#### 4.2.3 Ventajas del Ensamblado

1. **Reducción de varianza**: promedio de predictores reduce error
2. **Robustez a outliers**: votos mitigan casos atípicos
3. **Estimación de incertidumbre**: distribución de votos indica confianza

### 4.3 Regresión Lineal para Tiempo de Respuesta

**Objetivo**: Estimar tiempo de llegada al centro de salud (en minutos)

#### 4.3.1 Modelo

```
tiempo = β₀ + β₁·distancia + β₂·hora + ε
```

donde:
- **distancia**: distancia al centro en km
- **hora**: hora del día [0-23]
- **ε**: error residual

#### 4.3.2 Algoritmo: Descenso de Gradiente

**Normalización de features**:
```
x_norm = (x - μ) / σ
```

**Función de costo con regularización L2**:
```
J(β) = (1/2m) Σ(h(x_i) - y_i)² + (λ/2m) Σβ_j²
```

donde:
- m: número de muestras
- h(x) = β₀ + β₁x₁ + β₂x₂ (hipótesis)
- λ: parámetro de regularización

**Actualización de parámetros**:
```
β_j := β_j - α·∂J/∂β_j

∂J/∂β_j = (1/m) Σ(h(x_i) - y_i)·x_i^j + (λ/m)·β_j
```

#### 4.3.3 Hiperparámetros

- **learning_rate (α)**: 0.05
- **n_iteraciones**: 1200
- **lambda (λ)**: 0.01 (regularización ligera)

#### 4.3.4 Características del Modelo

- **Interpretabilidad**: coeficientes indican impacto de cada variable
- **Eficiencia**: cálculo rápido para inferencia en tiempo real
- **Robustez**: regularización previene sobreajuste

## 5. FUSIÓN DE DECISIONES

### 5.1 Votación Ponderada

El sistema genera 3 clasificaciones independientes:
1. **triage_reglas**: Motor de reglas (prioridad alta en emergencias críticas)
2. **triage_arbol**: Árbol de decisión
3. **triage_bosque**: Random Forest

**Algoritmo de fusión**:
```
FUNCIÓN decidir_triage_final(triage_reglas, triage_arbol, triage_bosque):
    # Si las reglas detectan emergencia crítica, tiene máxima prioridad
    SI triage_reglas == "Rojo":
        RETORNAR "Rojo"
    
    # Votación entre los 3 clasificadores
    votos = {triage_reglas, triage_arbol, triage_bosque}
    
    SI hay mayoría (2/3 o 3/3):
        RETORNAR clase_mayoritaria
    
    # En caso de empate total (3 clases diferentes)
    RETORNAR max(votos, key=prioridad_seguridad)
```

**Prioridad de seguridad**:
```
Rojo (inmediato) > Amarillo (urgente) > Verde (no urgente) > Negro (expectante)
```

### 5.2 Justificación de la Fusión

- **Seguridad primero**: Reglas garantizan protocolos críticos
- **Validación cruzada**: Acuerdo entre modelos aumenta confianza
- **Reducción de falsos negativos**: Sistema conservador (prefiere sobre-clasificar que sub-clasificar)

## 6. SELECCIÓN DE CENTRO DE SALUD

### 6.1 Criterios de Selección

**Prioridad jerárquica**:
1. Centros de alta prioridad en el mismo distrito
2. Centros de alta prioridad en otros distritos
3. Centros en el mismo distrito (cualquier prioridad)
4. Centro más cercano disponible

### 6.2 Centros de Salud de Trujillo

**Base de datos**: 8 centros principales
- Hospital Regional Docente de Trujillo (Trujillo Centro)
- Hospital Belén (Trujillo Centro)
- Hospital Víctor Lazarte Echegaray (Trujillo Centro)
- Centro de Salud Wichanzao (La Esperanza)
- Hospital de Apoyo Florencia de Mora
- Posta Médica Huanchaco
- Centro de Salud Moche
- Hospital Distrital Vista Alegre (Víctor Larco)

**Atributos**:
- nombre, distrito, prioridad (alta/media), especialidades

### 6.3 Estimación de Tiempo de Respuesta

Modelo de regresión lineal entrenado con datos históricos simulados que consideran:
- **Distancia**: principal factor (más km = más tiempo)
- **Hora del día**: tráfico vehicular en horas pico
- **Distrito**: patrones de movilidad urbana

## 7. DATOS Y VALIDACIÓN

### 7.1 Dataset de Entrenamiento

**Fuente**: `emergencias_simuladas.json`
- **Tamaño**: 50+ casos simulados
- **Distribución por triage**:
  - Rojo: ~25% (emergencias críticas)
  - Amarillo: ~35% (urgentes)
  - Verde: ~30% (no urgentes)
  - Negro: ~10% (expectantes)

**Características de los casos**:
- Síntomas basados en protocolos médicos reales
- Contexto local: temperatura, distrito, hora
- Factores culturales: eventos masivos (Marinera, Chan Chan)
- Condiciones especiales: embarazo, edad avanzada

### 7.2 Validación Cruzada Implícita

Random Forest realiza validación implícita mediante:
- **Bootstrap**: cada árbol entrena con ~63% de datos
- **Out-of-Bag (OOB)**: ~37% restante sirve como validación

### 7.3 Métricas de Evaluación

**Exactitud (Accuracy)**:
```
Accuracy = (TP + TN) / (TP + TN + FP + FN)
```

**Precisión Macro**:
```
Precision_macro = (1/K) Σ Precision_k
Precision_k = TP_k / (TP_k + FP_k)
```

**Recall Macro**:
```
Recall_macro = (1/K) Σ Recall_k
Recall_k = TP_k / (TP_k + FN_k)
```

**F1-Score Macro**:
```
F1_macro = 2 × (Precision_macro × Recall_macro) / (Precision_macro + Recall_macro)
```

**Matriz de Confusión**:
```
         Pred: R   A   V   N
Real: R  [TP_R FP  FP  FP]
      A  [FP  TP_A FP  FP]
      V  [FP  FP  TP_V FP]
      N  [FP  FP  FP  TP_N]
```

**Métricas de Tiempo**:
- **Tiempo promedio de inferencia** (ms)
- **Percentil 95** (latencia peor caso)

### 7.4 Análisis de Patrones

**Correlaciones investigadas**:
1. Temperatura ambiente vs triage
2. Deshidratación vs triage
3. Hora del día vs tiempo de respuesta
4. Distrito vs tipo de emergencia

## 8. IMPLEMENTACIÓN TÉCNICA

### 8.1 Tecnologías Utilizadas

- **Lenguaje**: Python 3.10+
- **Librerías**: 
  - Implementación desde cero (sin sklearn) para trazabilidad educativa
  - Wrappers opcionales de sklearn para comparación
  - Streamlit para interfaz web
  - JSON para persistencia de datos

### 8.2 Estructura Modular

```
experto_trujillo/
├── rule_engine.py          # Motor de inferencia simbólico
├── inference.py            # Orquestación híbrida
├── rules/
│   └── protocolos.py       # Base de conocimiento de reglas
├── ml/
│   ├── triage_tree.py      # Árbol de decisión
│   ├── random_forest.py    # Bosque aleatorio
│   ├── linear_regression.py # Regresión lineal
│   └── sklearn_models.py   # Wrappers (opcional)
├── data/
│   ├── centros_salud_trujillo.json
│   └── emergencias_simuladas.json
├── evaluate.py             # Métricas y validación
└── cli.py                  # Interfaz de línea de comandos
```

### 8.3 Complejidad Computacional

**Motor de reglas**:
- Forward chaining: O(R × I) donde R = reglas, I = iteraciones
- Backward chaining: O(R × P) donde P = profundidad de prueba

**Árbol de decisión**:
- Entrenamiento: O(n × m × log n) donde n = muestras, m = features
- Predicción: O(log n) [profundidad del árbol]

**Random Forest**:
- Entrenamiento: O(T × n × m × log n) donde T = número de árboles
- Predicción: O(T × log n)

**Regresión lineal**:
- Entrenamiento: O(i × n × f) donde i = iteraciones, f = features
- Predicción: O(f)

**Tiempo total de inferencia**: < 50 ms promedio

## 9. CONSIDERACIONES ÉTICAS Y DE SEGURIDAD

### 9.1 Principios de Diseño

1. **Primero, no hacer daño**: Sistema conservador (prioriza seguridad)
2. **Transparencia**: Trazas de reglas y explicabilidad de decisiones
3. **Complementariedad**: No sustituye atención médica profesional
4. **Accesibilidad**: Orientación gratuita en zonas con acceso limitado

### 9.2 Limitaciones Declaradas

- Sistema de **orientación**, no diagnóstico definitivo
- Requiere validación médica profesional
- No reemplaza llamada al 116 (SAMU) o 911
- Dataset simulado (requiere validación con casos reales)

### 9.3 Advertencias al Usuario

Mensajes explícitos en la interfaz:
```
"Este sistema es de orientación; no sustituye atención profesional.
Ante emergencias: llamar al 116 SAMU / 911 inmediatamente."
```

## 10. RESULTADOS ESPERADOS

### 10.1 Métricas de Rendimiento

**Clasificación**:
- Accuracy > 85%
- Precision (Rojo) > 90% (crítico: no falsos negativos)
- Recall (Rojo) > 95% (detectar todas emergencias críticas)
- F1-score macro > 0.85

**Tiempo de Respuesta**:
- Inferencia promedio: < 50 ms
- P95 latencia: < 100 ms

### 10.2 Análisis de Errores

**Falsos Negativos (críticos)**:
- Revisión manual de casos Rojo clasificados como Amarillo/Verde
- Ajuste de reglas y umbrales

**Falsos Positivos (tolerables)**:
- Sobre-clasificación preferible a sub-clasificación
- Coste: más derivaciones innecesarias, pero mayor seguridad

### 10.3 Validación Clínica

**Revisión por expertos**:
- Protocolos validados contra guías de AHA/ERC
- Adaptaciones regionales consultadas con profesionales locales

## 11. TRABAJO FUTURO

1. **Expansión de datos**: Integración con sistemas de emergencias reales
2. **Aprendizaje continuo**: Actualización de modelos con nuevos casos
3. **Explicabilidad aumentada**: Visualización de árboles y reglas disparadas
4. **Multiidioma**: Soporte para quechua y otros idiomas locales
5. **Aplicación móvil**: Versión offline para zonas sin conexión
6. **Integración con wearables**: Monitoreo de signos vitales en tiempo real

## 12. CONCLUSIONES METODOLÓGICAS

El enfoque híbrido propuesto combina:
- **Fortalezas del conocimiento simbólico**: Seguridad, explicabilidad, validación médica
- **Fortalezas del aprendizaje automático**: Adaptabilidad, reconocimiento de patrones, robustez

Esta metodología es replicable y extensible a otros contextos geográficos y tipos de emergencias, manteniendo siempre la prioridad en la seguridad del paciente.

---

## REFERENCIAS METODOLÓGICAS

1. Russell, S., & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach* (4th ed.). Pearson. [Capítulos 9-10: Inferencia lógica y planificación]

2. Breiman, L. (2001). "Random Forests". *Machine Learning*, 45(1), 5-32.

3. Quinlan, J. R. (1986). "Induction of Decision Trees". *Machine Learning*, 1(1), 81-106.

4. Hastie, T., Tibshirani, R., & Friedman, J. (2009). *The Elements of Statistical Learning* (2nd ed.). Springer.

5. American Heart Association (2020). *Guidelines for CPR and ECC*. [Protocolos ABC]

6. Ministerio de Salud del Perú (2021). *Guía Técnica para la Implementación del Triage en Emergencias*.

---

**Nota**: Este documento describe la metodología implementada en el sistema "Sumak Kawsay". Para evidencias empíricas, consultar el archivo `reports/metrics_gini.json` generado por `evaluate.py`.
