import { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, Plus, CheckCircle, Edit, ArrowLeft, Settings } from 'lucide-react';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'manager'
  const [dashboard, setDashboard] = useState({ accounts: [], totalDebt: 0 });
  const [cards, setCards] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false); // Transacciones
  const [formData, setFormData] = useState({
    amount: '', sender_id: '1', receiver_id: '2', concept: '', is_salary: false
  });

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardData, setCardData] = useState({
    name: '', type: 'TDC', periodicity: 'MENSUAL', credit_limit: '', 
    cut_day: '', payment_day: '', current_debt: '', 
    payment_no_interest: '', available_credit: '', liquidation_amount: ''
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
      fetchData();
    } catch (e) {
      console.error("Error submitting transaction", e);
    }
  };

  const openCardModal = (card = null) => {
    if (card) {
      setEditingCardId(card.id);
      setCardData({
        name: card.name,
        type: card.type,
        periodicity: card.periodicity || 'MENSUAL',
        credit_limit: card.credit_limit || '',
        cut_day: card.cut_day || '',
        payment_day: card.payment_day || '',
        current_debt: card.current_debt || '',
        payment_no_interest: card.payment_no_interest || '',
        available_credit: card.available_credit || '',
        liquidation_amount: card.liquidation_amount || ''
      });
    } else {
      setEditingCardId(null);
      setCardData({
        name: '', type: 'TDC', periodicity: 'MENSUAL', credit_limit: '', 
        cut_day: '', payment_day: '', current_debt: '', 
        payment_no_interest: '', available_credit: '', liquidation_amount: ''
      });
    }
    setIsCardModalOpen(true);
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingCardId 
        ? `http://localhost:3001/api/cards/${editingCardId}`
        : 'http://localhost:3001/api/cards';
      const method = editingCardId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
      });
      setIsCardModalOpen(false);
      fetchData();
    } catch (e) {
      console.error("Error saving card", e);
    }
  };

  const getBalanceStatus = () => {
    if (!dashboard.accounts || dashboard.accounts.length === 0) return { text: "Cargando...", color: "text-secondary" };
    const alfonso = dashboard.accounts.find(a => a.name === 'Alfonso');
    const victor = dashboard.accounts.find(a => a.name === 'Víctor');
    let victorBalance = victor?.balance || 0;
    
    if (victorBalance > 0) return { text: `Víctor debe a Alfonso: $${victorBalance.toLocaleString()}`, color: 'text-red' };
    if (victorBalance < 0) return { text: `Alfonso debe a Víctor: $${Math.abs(victorBalance).toLocaleString()}`, color: 'text-green' };
    return { text: `Están a mano ($0.00)`, color: 'text-secondary' };
  };

  const today = new Date().getDate();

  // ----- VIEW: DASHBOARD -----
  if (currentView === 'dashboard') {
    return (
      <div className="app-container">
        <header className="animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <h1>GESTION DE PAGOS A&V</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn" onClick={() => setIsModalOpen(true)}>
              <Plus size={20} /> Registrar Operación
            </button>
            <button className="btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white' }} onClick={() => setCurrentView('manager')}>
              <Settings size={20} /> Gestor de Fichas
            </button>
          </div>
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
          </div>

          {suggestion && suggestion.bestCard && (
            <div className="card suggestion-panel">
              <div className="stat-label" style={{color: 'var(--accent-purple)'}}>Sugerencia Inteligente</div>
              <div className="stat-value" style={{fontSize: '1.5rem', marginTop: '1rem'}}>
                Compra con <span style={{color: 'var(--accent-blue)'}}>{suggestion.bestCard.name}</span>
              </div>
              <div className="stat-label">
                Su corte fue hace {suggestion.daysSinceCut} días.
              </div>
            </div>
          )}
        </div>

        <h2 style={{ marginTop: '1rem' }}>Resumen de Próximos Pagos</h2>
        <div className="cards-grid animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {cards.map(card => {
            let isDanger = false;
            if (card.payment_day) {
              let diff = card.payment_day - today;
              if (diff >= 0 && diff <= 5) isDanger = true;
            }

            return (
              <div key={card.id} className={`card credit-card ${isDanger ? 'danger' : ''}`} onClick={() => { setCurrentView('manager'); setTimeout(()=>openCardModal(card), 100); }} style={{cursor: 'pointer'}}>
                <div className="card-header">
                  <span className="card-title">{card.name}</span>
                </div>
                <div className="card-details">
                  <div className="detail-row">
                    <span>Deuda Total</span>
                    <span className={card.current_debt > 0 ? 'text-red' : ''}>${card.current_debt.toLocaleString()}</span>
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

        {/* Modal Transacciones */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content animate-fade-in">
              <div className="modal-header">
                <h3>Registrar Operación</h3>
                <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
              </div>
              <form onSubmit={handleTransactionSubmit}>
                <div className="form-group">
                  <label>Concepto</label>
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

  // ----- VIEW: MANAGER -----
  return (
    <div className="app-container">
      <header className="animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-icon" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', cursor: 'pointer' }} onClick={() => setCurrentView('dashboard')}>
            <ArrowLeft size={24} />
          </button>
          <h1>GESTOR DE FICHAS</h1>
        </div>
        <button className="btn" style={{ background: 'var(--accent-purple)' }} onClick={() => openCardModal(null)}>
          <Plus size={20} /> Añadir Ficha
        </button>
      </header>

      <div className="cards-grid animate-fade-in" style={{ marginTop: '1rem' }}>
        {cards.map(card => (
          <div key={card.id} className="card credit-card" style={{cursor: 'pointer'}} onClick={() => openCardModal(card)}>
            <div className="card-header">
              <span className="card-title">{card.name}</span>
              <Edit size={16} color="var(--text-secondary)" />
            </div>
            <div className="card-details">
              <div className="detail-row"><span>Tipo</span><span>{card.type}</span></div>
              <div className="detail-row"><span>Periodicidad</span><span>{card.periodicity || 'MENSUAL'}</span></div>
              <div className="detail-row"><span>Deuda Total</span><span>${(card.current_debt || 0).toLocaleString()}</span></div>
              <div className="detail-row"><span>Crédito Disp.</span><span>${(card.available_credit || 0).toLocaleString()}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Edición / Creación de Ficha */}
      {isCardModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{editingCardId ? 'Editar Ficha' : 'Añadir Nueva Ficha'}</h3>
              <button className="close-btn" onClick={() => setIsCardModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCardSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Nombre de la Ficha</label>
                  <input required type="text" className="form-control" value={cardData.name} onChange={e => setCardData({...cardData, name: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label>Tipo de Deuda</label>
                  <select className="form-control" value={cardData.type} onChange={e => setCardData({...cardData, type: e.target.value})}>
                    <option value="TDC">Tarjeta de Crédito (TDC)</option>
                    <option value="SERVICIOS">Servicios</option>
                    <option value="CREDITO DEPARTAMENTAL">Crédito Departamental</option>
                    <option value="PRESTAMO DEPARTAMENTAL">Préstamo Departamental</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Periodicidad</label>
                  <select className="form-control" value={cardData.periodicity} onChange={e => setCardData({...cardData, periodicity: e.target.value})}>
                    <option value="MENSUAL">Mensual</option>
                    <option value="SEMANAL">Semanal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha de Corte (Día)</label>
                  <input type="number" min="1" max="31" className="form-control" value={cardData.cut_day} onChange={e => setCardData({...cardData, cut_day: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Fecha Límite de Pago (Día)</label>
                  <input required type="number" min="1" max="31" className="form-control" value={cardData.payment_day} onChange={e => setCardData({...cardData, payment_day: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>Límite de Crédito ($)</label>
                  <input type="number" step="0.01" className="form-control" value={cardData.credit_limit} onChange={e => setCardData({...cardData, credit_limit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Crédito Disponible ($)</label>
                  <input type="number" step="0.01" className="form-control" value={cardData.available_credit} onChange={e => setCardData({...cardData, available_credit: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>Deuda Total ($)</label>
                  <input type="number" step="0.01" className="form-control" value={cardData.current_debt} onChange={e => setCardData({...cardData, current_debt: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Pago para NO Generar Intereses ($)</label>
                  <input type="number" step="0.01" className="form-control" value={cardData.payment_no_interest} onChange={e => setCardData({...cardData, payment_no_interest: e.target.value})} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Monto para Liquidar HOY ($)</label>
                  <input type="number" step="0.01" className="form-control" value={cardData.liquidation_amount} onChange={e => setCardData({...cardData, liquidation_amount: e.target.value})} />
                </div>
              </div>

              <button type="submit" className="btn" style={{width: '100%', justifyContent: 'center', marginTop: '1rem', background: 'var(--accent-purple)'}}>
                {editingCardId ? 'Guardar Cambios' : 'Crear Ficha'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
