# 📋 ESPECIFICACIÓN: Módulo Aportaciones A&V

> **⚠️ LECTURA OBLIGATORIA** para cualquier IA o desarrollador antes de modificar
> cualquier lógica relacionada con aportaciones, balances, intereses, o semanalidades.
>
> Última actualización: 2026-05-16

---

## 1. PROPÓSITO DEL MÓDULO

"Aportaciones A&V" es una **vista de transparencia financiera** que muestra todas
las aportaciones de capital entre Alfonso y Víctor en una tabla cronológica con
tres columnas: **Aportación Alfonso**, **Intereses Pagados** y **Aportación Víctor**.

Su objetivo es calcular el **balance neto de deuda interpersonal** en tiempo real.

---

## 2. INDEPENDENCIA DEL MÓDULO GESTIÓN DE PAGOS

```
⛔ PROHIBIDO: Que una operación registrada en Aportaciones A&V modifique
              fichas de crédito (credit_lines) del módulo Gestión de Pagos.
⛔ PROHIBIDO: Actualizar current_debt, credit_limit, payment_day o cualquier
              campo de la tabla credit_lines desde este módulo.
✅ CORRECTO:  Aportaciones A&V solo registra transacciones en la tabla
              `transactions` y actualiza los balances de la tabla `accounts`.
```

### ¿Por qué son independientes?

| Módulo | Tabla principal | Qué gestiona |
|--------|----------------|--------------|
| **Gestión de Pagos** | `credit_lines` + `transactions` | Fichas de crédito (TDC, préstamos, servicios), fechas de corte, deudas, sugerencias de pago |
| **Aportaciones A&V** | `transactions` + `salaries` | Historial de movimientos de dinero entre Alfonso y Víctor + balance neto |

Comparten la tabla `transactions` como fuente de datos, pero **Aportaciones A&V
NO lee ni escribe en `credit_lines`**. Si Alfonso da $19,400 a Víctor para pagar
su TDC BBVA, esa operación:

1. ✅ Se registra como transacción (Alfonso → Víctor, $19,400)
2. ✅ Actualiza el balance de `accounts` (Alfonso -19,400, Víctor +19,400)
3. ❌ **NO** reduce automáticamente la deuda de la ficha BBVA en `credit_lines`

La actualización de la ficha BBVA se hace **por separado** desde el módulo
Gestión de Pagos o mediante sincronización bancaria.

---

## 3. INTERESES DEL PRÉSTAMO PERSONAL BANCOPPEL

```
⛔ PROHIBIDO: Que el campo interest_amount afecte las columnas balance de
              la tabla accounts.
✅ CORRECTO:  interest_amount es SOLO UNA REFERENCIA VISUAL mostrada en la
              columna central "Intereses Pagados" de color morado.
```

### Regla de negocio (Acuerdo 3 de los Acuerdos A&V)

> "Los intereses del préstamo Coppel serán **absorbidos por Alfonso**.
> Se mantendrá un registro para monitoreo de la tasa real, pero
> **no afectarán el sueldo de Víctor**."

### Ejemplo concreto

Cuando Alfonso liquida el préstamo personal Bancoppel de Víctor:

```
Monto principal: $50,000    ← ESTE afecta el balance (Alfonso -50K, Víctor +50K)
Intereses:       $2,162     ← ESTE NO afecta el balance (solo se muestra como referencia)
```

**En la tabla de Aportaciones:**

| Fecha | Concepto | Aportación Alfonso | Intereses Pagados | Aportación Víctor |
|-------|----------|-------------------|-------------------|-------------------|
| 13 may 2026 | Liquidación préstamo personal Bancoppel | $50,000 | **$2,162** *(32.8% tasa real)* | - |

- La columna **Aportación Alfonso** muestra $50,000 (el principal)
- La columna **Intereses Pagados** muestra $2,162 en morado (referencia visual)
- Los $2,162 **NO se suman** al balance de Víctor ni se restan del de Alfonso
- Alfonso absorbe ese costo como parte del acuerdo

### Implementación en código

**Backend (`index.js` → `POST /api/transactions`):**
```javascript
// Solo amount afecta balances — interest_amount se guarda pero NO mueve dinero
db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, sender_id]);
db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, receiver_id]);
// interest_amount se inserta en transactions pero NO genera UPDATE en accounts
```

**Frontend (`App.jsx` → columna de intereses):**
```jsx
// Se muestra SOLO si interest_amount > 0, con color morado
{t.interest_amount > 0 ? (
  <span style={{ color: 'var(--accent-purple)' }}>
    ${t.interest_amount.toLocaleString()}
  </span>
) : '-'}
```

---

## 4. RELACIÓN CON SEMANALIDADES DE VÍCTOR

### ¿Qué son las semanalidades?

Alfonso paga a Víctor **$5,000 MXN cada jueves** como salario semanal.
El módulo "Semanalidades Víctor" gestiona el estatus de cada pago
(`PAGADO` o `PENDIENTE`).

### ¿Cómo aparecen en Aportaciones A&V?

Las semanalidades se mezclan en el historial de Aportaciones como filas
adicionales, junto con las transacciones regulares:

```
combinedHistory = [
  ...transactions.map(t => ({ ...t, _type: 'transaction' })),
  ...salaries.map(s => ({ ...s, _type: 'salary' }))
].sort((a, b) => new Date(b.date) - new Date(a.date));
```

### Regla de visualización

| Estado de semanalidad | Columna Alfonso | Columna Víctor |
|-----------------------|----------------|----------------|
| `PAGADO` | **$5,000** (verde) | - |
| `PENDIENTE` | - | **$5,000** (rojo) |

**¿Por qué?**
- Cuando Alfonso **ya pagó** la semanalidad → es una aportación de Alfonso
- Cuando está **pendiente** → es una deuda que Víctor aún no ha recibido,
  por lo que cuenta como aportación pendiente de Víctor en el balance

### Impacto en el balance neto

Las semanalidades afectan el cálculo del **RESULTADO** al final de la tabla:

```javascript
// Alfonso total: todas sus transacciones + semanalidades PAGADAS
if (item._type === 'salary' && item.status === 'PAGADO') acc + 5000;

// Víctor total: todas sus transacciones + semanalidades PENDIENTES
if (item._type === 'salary' && item.status === 'PENDIENTE') acc + 5000;

// RESULTADO = Alfonso total - Víctor total
// Si positivo → Víctor debe a Alfonso
// Si negativo → Alfonso debe a Víctor
```

> **Nota:** Las semanalidades con `week_number <= 11` se excluyen del cálculo
> porque corresponden a un período anterior al inicio del sistema de registro.

### Flujo operativo

```
Módulo "Semanalidades Víctor"          Módulo "Aportaciones A&V"
┌──────────────────────┐               ┌──────────────────────┐
│ Semana 20: PENDIENTE │──se refleja──▶│ Aportación Víctor:   │
│ Semana 19: PENDIENTE │               │ $5,000 (rojo)        │
│ Semana 18: PAGADO    │──se refleja──▶│ Aportación Alfonso:  │
│ Semana 17: PAGADO    │               │ $5,000 (verde)       │
└──────────────────────┘               └──────────────────────┘
         │                                       │
         │ Cuando Alfonso paga y cambia           │
         │ status → PAGADO, la fila se            │
         │ mueve automáticamente de la            │
         │ columna Víctor a la de Alfonso         │
         └───────────────────────────────────────┘
```

---

## 5. ESTRUCTURA DE DATOS

### Tabla `accounts` (balances interpersonales)

| id | name | balance | Significado |
|----|------|---------|-------------|
| 1 | Alfonso | negativo | Alfonso ha aportado más → Víctor le debe |
| 2 | Víctor | positivo | Víctor ha recibido más → Víctor debe a Alfonso |

> Los balances son **espejo**: `Alfonso.balance = -Víctor.balance`

### Tabla `transactions` (movimientos)

| Campo | Uso en Aportaciones |
|-------|---------------------|
| `sender_id` | Determina en qué columna aparece el monto |
| `receiver_id` | Contraparte del movimiento |
| `amount` | Monto principal (SÍ afecta balance) |
| `interest_amount` | Intereses de referencia (NO afecta balance) |
| `credit_line_id` | NO se usa en Aportaciones (es de Gestión de Pagos) |
| `concept` | Texto descriptivo del movimiento |

### Tabla `salaries` (semanalidades)

| Campo | Uso en Aportaciones |
|-------|---------------------|
| `week_number` | Identificador de semana (> 11 para cálculos) |
| `date` | Fecha del jueves correspondiente |
| `amount` | Siempre $5,000 |
| `status` | `PAGADO` → columna Alfonso / `PENDIENTE` → columna Víctor |

---

## 6. CHECKLIST ANTES DE MODIFICAR

- [ ] ¿La operación modifica solo `transactions` y `accounts`? (NO `credit_lines`)
- [ ] ¿El campo `interest_amount` se guarda pero NO afecta `accounts.balance`?
- [ ] ¿Las semanalidades PAGADAS aparecen en columna Alfonso?
- [ ] ¿Las semanalidades PENDIENTES aparecen en columna Víctor?
- [ ] ¿El cálculo de RESULTADO excluye semanalidades con `week_number <= 11`?
- [ ] ¿El balance neto se calcula como `alfonsoTotal - victorTotal`?
