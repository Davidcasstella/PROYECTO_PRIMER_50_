# ✈️ Simulación de Aeropuerto Inteligente con Concurrencia

## 📋 Descripción

Sistema de simulación que modela el funcionamiento de un **aeropuerto inteligente** donde múltiples aviones (simulando hilos/threads) compiten por recursos compartidos: **pistas de aterrizaje** y **puertas de embarque**.

El proyecto demuestra conceptos fundamentales de **Sistemas Operativos**:

- **Concurrencia**: Múltiples aviones operan simultáneamente
- **Exclusión Mutua**: Solo un avión puede usar una pista a la vez
- **Semáforos**: Binarios (pistas) y de conteo (puertas)
- **Condiciones de Carrera**: Demostración de acceso no sincronizado
- **Deadlocks**: Detección y prevención mediante ordenamiento global

---

## 🏗️ Arquitectura

### Backend (Node.js + Express + Socket.io)
```
BACKEND/src/
├── app.js                    # Servidor Express + Socket.io
├── config/index.js           # Configuración del sistema
├── concurrency/
│   ├── Semaphore.js          # Implementación de semáforos (conteo + binario)
│   ├── Plane.js              # Entidad avión (simula un hilo)
│   ├── Runway.js             # Recurso pista (protegido por mutex)
│   ├── Gate.js               # Recurso puerta de embarque
│   └── AirportManager.js     # Orquestador central de concurrencia
├── controllers/              # Controladores HTTP
├── services/                 # Capa de lógica de negocio
├── models/                   # Estado compartido (singleton)
├── events/                   # Sistema de eventos + WebSocket bridge
├── routes/                   # Rutas de la API REST
└── utils/                    # Logger centralizado
```

### Frontend (React + Vite)
```
FRONTEND/src/
├── App.jsx                   # Componente raíz
├── main.jsx                  # Entry point
├── index.css                 # Sistema de diseño (design tokens)
├── components/
│   ├── AirportDashboard      # Dashboard principal + controles
│   ├── RunwayView            # Visualización de pistas
│   ├── GateView              # Visualización de puertas
│   ├── PlaneQueue            # Cola de aviones
│   └── LogsPanel             # Panel de logs en tiempo real
├── pages/SimulationPage      # Página principal
├── services/                 # Clientes API y Socket.io
├── hooks/                    # Hooks personalizados
└── context/                  # Context API (estado global)
```

---

## ⚙️ Tecnologías

| Componente | Tecnología |
|-----------|-----------|
| Backend | Node.js + Express |
| Frontend | React + Vite |
| Comunicación | Socket.io (WebSockets) |
| Lenguaje | JavaScript |

---

## 🚀 Cómo Ejecutar

### Prerrequisitos
- Node.js 18+ instalado
- npm 9+

### 1. Iniciar el Backend

```bash
cd PROYECTO_PRIMER_50/BACKEND
npm install
npm run dev
```

El servidor se iniciará en `http://localhost:3001`

### 2. Iniciar el Frontend

```bash
cd PROYECTO_PRIMER_50/FRONTEND
npm install
npm run dev
```

La aplicación se abrirá en `http://localhost:5173`

---

## 🧠 Explicación de Concurrencia Aplicada

### 1. Semáforos

#### Semáforo Binario (Mutex) - Pistas
```
Capacidad = 1
Solo UN avión puede usar una pista a la vez.

Operación P (acquire): Si counter > 0 → acceso inmediato. Si counter = 0 → espera en cola.
Operación V (release): Si hay espera → resuelve siguiente. Si no → incrementa contador.
```

#### Semáforo de Conteo - Puertas
```
Capacidad = N (número de puertas)
Hasta N aviones pueden estar en puertas simultáneamente.

Mismo principio P/V pero con counter > 1.
```

### 2. Condiciones de Carrera

Se simula cuando dos aviones intentan acceder a la misma pista **sin protección del semáforo**:

```
Thread A: Lee pista (libre) → [context switch] → Escribe (ocupada por A)
Thread B: Lee pista (libre) → [context switch] → Escribe (ocupada por B)  ← SOBREESCRIBE A

Resultado: El avión A pierde su asignación. ¡Conflicto!
Solución: Usar semáforo binario para exclusión mutua.
```

### 3. Deadlocks

Se simula un interbloqueo con espera circular:

```
Avión A: Tiene Pista → Espera Puerta
Avión B: Tiene Puerta → Espera Pista
→ Ninguno puede avanzar = DEADLOCK
```

**4 Condiciones de Coffman** (todas deben cumplirse):
1. **Exclusión Mutua**: Pista/puerta no se comparten
2. **Hold and Wait**: Cada uno mantiene un recurso mientras espera otro
3. **No Preemption**: No se pueden quitar recursos a la fuerza
4. **Espera Circular**: A→B→A ciclo de dependencia

**Prevención**: Ordenamiento global de recursos → siempre adquirir **Pista ANTES que Puerta**. Esto rompe la condición #4 (espera circular).

### 4. Ciclo de Vida de un Avión

```
WAITING → LANDING → LANDED → AT_GATE → DEPARTING → DEPARTED
  (Cola)  (P pista)         (P puerta)  (P pista)   (Terminado)
                    (V pista)            (V puerta)  (V pista)
```

Cada transición involucra operaciones P (acquire) y V (release) sobre los semáforos correspondientes.

---

## 📡 API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/airport/status` | Estado completo del aeropuerto |
| POST | `/api/airport/plane` | Agregar avión a la cola |
| POST | `/api/airport/simulate` | Iniciar simulación automática |
| POST | `/api/airport/stop` | Detener simulación |
| POST | `/api/airport/race-condition` | Demo condición de carrera |
| POST | `/api/airport/deadlock` | Demo deadlock |
| GET | `/api/logs` | Obtener logs del sistema |

---

## 📡 WebSocket Events

| Evento | Descripción |
|--------|-------------|
| `status:update` | Actualización completa del estado |
| `plane:queued` | Avión entró a la cola |
| `plane:landing` | Avión aterrizando |
| `plane:landed` | Avión aterrizó |
| `plane:gate_assigned` | Puerta asignada |
| `plane:departed` | Avión despegó |
| `runway:busy` / `runway:free` | Estado de pista |
| `race_condition:detected` | Condición de carrera |
| `deadlock:detected` / `resolved` | Deadlock |

---

## 🎨 Interfaz de Usuario

- **Tema oscuro** con acentos neón
- **Indicadores de estado**: Verde (libre) / Rojo (ocupado)
- **Panel de logs** en tiempo real con colores por nivel
- **Barra de semáforo** mostrando utilización de puertas
- **Animaciones** de aterrizaje y despegue

---

## 📚 Materia

**Sistemas Operativos** - Semestre 7  
Universidad Pedagógica y Tecnológica de Colombia

### Temas demostrados:
- Concurrencia y paralelismo
- Exclusión mutua
- Semáforos (binarios y de conteo)
- Sincronización de procesos
- Condiciones de carrera
- Interbloqueos (Deadlocks) y su prevención
- Colas de procesos (FIFO)
