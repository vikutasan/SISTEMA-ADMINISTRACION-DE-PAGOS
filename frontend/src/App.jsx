import { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, DollarSign, Plus, CheckCircle, Calendar } from 'lucide-react';
import './App.css';

function App() {
  const [dashboard, setDashboard] = useState({ accounts: [], totalDebt: 0 });
  const [cards, setCards] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    sender_id: '1', // Alfonso por defecto
    receiver_id: '2', // Víctor por defecto
    concept: '',
    is_salary: false
  });

  const fetchData = async () => {
    try {
      const dbRes = await fetch('http://localhost:3001/api/dashboard');
      const dbData = await dbRes.json();
      setDashboard(dbData);

      const cardsRes = await fetch('http://localhost:3001/api/cards');
      const cardsData = await cardsRes.json();
      setCards(cardsData);

      const sugRes = await fetch('http://localhost:3001/api/suggestions');
      const sugData = await sugRes.json();
      setSuggestion(sugData);
    } catch (e) {
      console.error("Error fetching data:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      setFormData({ amount: '', sender_id: '1', receiver_id: '2', concept: '', is_salary: false });
      fetchData(); // Recargar datos
    } catch (e) {
      console.error("Error submitting transaction", e);
    }
  };

  const getBalanceStatus = () => {
    if (!dashboard.accounts || dashboard.accounts.length === 0) return { text: "Cargando...", color: "text-secondary" };
    const alfonso = dashboard.accounts.find(a => a.name === 'Alfonso');
    const victor = dashboard.accounts.find(a => a.name === 'Víctor');
    
    // Balance relativo (quien le debe a quien)
    // Asumimos que si Víctor tiene un balance negativo, le debe a Alfonso.
    // O mejor, calculamos la diferencia.
    let alfonsoBalance = alfonso?.balance || 0;
    let victorBalance = victor?.balance || 0;
    
    // Simplificaremos asumiendo un balance absoluto para "Alfonso vs Víctor"
    // Si Alfonso envía dinero a Víctor, Alfonso.balance baja, Víctor.balance sube.
    // Esto significa que Víctor le debe a Alfonso (tiene dinero adelantado).
    if (victorBalance > 0) {
      return { text: `Víctor debe a Alfonso: $${victorBalance.toLocaleString()}`, color: 'text-red' };
    } else if (victorBalance < 0) {
      return { text: `Alfonso debe a Víctor: $${Math.abs(victorBalance).toLocaleString()}`, color: 'text-green' };
    } else {
      return { text: `Están a mano ($0.00)`, color: 'text-secondary' };
    }
  };

  const today = new Date().getDate();

  return (
    <div className="app-container">
      <header className="animate-fade-in">
        <h1>Gestor de Pagos A&V</h1>
        <button className="btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Registrar Operación
        </button>
      </header>

      <div className="dashboard-grid animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="card">
          <div className="stat-label">Estado de Cuentas</div>
          <div className={`stat-value ${getBalanceStatus().color}`}>
            {getBalanceStatus().text}
          </div>
          <div className="stat-label" style={{marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <CheckCircle size={16} className="text-green" /> Salario Semanal: Pendiente
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Deuda Total Acumulada</div>
          <div className="stat-value text-red">
            ${dashboard.totalDebt ? dashboard.totalDebt.toLocaleString() : '0.00'}
          </div>
          <div className="stat-label">En todas las tarjetas y préstamos</div>
        </div>

        {suggestion && suggestion.bestCard && (
          <div className="card suggestion-panel">
            <div className="stat-label" style={{color: 'var(--accent-purple)'}}>Sugerencia Inteligente</div>
            <div className="stat-value" style={{fontSize: '1.5rem', marginTop: '1rem'}}>
              Compra hoy con <span style={{color: 'var(--accent-blue)'}}>{suggestion.bestCard.name}</span>
            </div>
            <div className="stat-label">
              Su fecha de corte fue hace {suggestion.daysSinceCut} días. Maximiza tu financiamiento.
            </div>
          </div>
        )}
      </div>

      <h2 style={{ marginTop: '1rem' }}>Línea de Crédito y Tarjetas</h2>
      
      <div className="cards-grid animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {cards.map(card => {
          // Logica muy basica para "peligro"
          let isDanger = false;
          let paymentMsg = `Día ${card.payment_day}`;
          if (card.payment_day) {
            let diff = card.payment_day - today;
            if (diff >= 0 && diff <= 5) isDanger = true;
          }

          return (
            <div key={card.id} className={`card credit-card ${isDanger ? 'danger' : ''}`}>
              <div className="card-header">
                <span className="card-title">{card.name}</span>
                <span className="card-type">{card.type}</span>
              </div>
              <div className="card-details">
                <div className="detail-row">
                  <span>Deuda Actual</span>
                  <span className={card.current_debt > 0 ? 'text-red' : ''}>${card.current_debt.toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <span>Límite</span>
                  <span>{card.credit_limit ? `$${card.credit_limit.toLocaleString()}` : 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span>Día de Corte</span>
                  <span>{card.cut_day || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span>Día Límite Pago</span>
                  <span className={isDanger ? 'danger-text' : ''}>{card.payment_day || 'N/A'}</span>
                </div>
              </div>
              {isDanger && (
                <div style={{marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', fontSize: '0.875rem', fontWeight: 'bold'}}>
                  <AlertCircle size={16} /> ¡Pago Próximo!
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3>Registrar Operación</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleTransactionSubmit}>
              <div className="form-group">
                <label>Concepto (ej. Préstamo para BBVA, Salario, Pago a Alfonso)</label>
                <input required type="text" className="form-control" value={formData.concept} onChange={e => setFormData({...formData, concept: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Monto ($)</label>
                <input required type="number" step="0.01" className="form-control" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Quién envía</label>
                <select className="form-control" value={formData.sender_id} onChange={e => setFormData({...formData, sender_id: e.target.value})}>
                  <option value="1">Alfonso</option>
                  <option value="2">Víctor</option>
                  <option value="">Otro (Externo)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quién recibe</label>
                <select className="form-control" value={formData.receiver_id} onChange={e => setFormData({...formData, receiver_id: e.target.value})}>
                  <option value="1">Alfonso</option>
                  <option value="2">Víctor</option>
                  <option value="">Pago a Tarjeta/Tercero</option>
                </select>
              </div>
              <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <input type="checkbox" id="salary" checked={formData.is_salary} onChange={e => setFormData({...formData, is_salary: e.target.checked})} />
                <label htmlFor="salary" style={{marginBottom: 0}}>¿Es pago de salario semanal?</label>
              </div>
              <button type="submit" className="btn" style={{width: '100%', justifyContent: 'center', marginTop: '1rem'}}>
                Guardar Operación
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
