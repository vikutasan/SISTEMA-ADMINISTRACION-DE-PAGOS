import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  AlertCircle, 
  Plus, 
  CheckCircle, 
  Edit, 
  ArrowLeft, 
  Settings, 
  LayoutDashboard, 
  Calendar,
  DollarSign
} from 'lucide-react';
import './App.css';

function App() {
  const [activeModule, setActiveModule] = useState('payments'); // 'payments' or 'salaries'
  const [dashboard, setDashboard] = useState({ accounts: [], totalDebt: 0 });
  const [cards, setCards] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false); // Operaciones
  const [isCardModalOpen, setIsCardModalOpen] = useState(false); // Fichas
  
  const [formData, setFormData] = useState({
    amount: '', sender_id: '1', receiver_id: '2', concept: '', is_salary: false
  });

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

      const salRes = await fetch('http://localhost:3001/api/salaries');
      const salData = await salRes.json();
      setSalaries(salData);

      const transRes = await fetch('http://localhost:3001/api/transactions');
      const transData = await transRes.json();
      setTransactions(transData);
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

  const handleSalaryStatusChange = async (id, newStatus) => {
    try {
      await fetch(`http://localhost:3001/api/salaries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchData();
    } catch (e) {
      console.error("Error updating salary status", e);
    }
  };

  const openCardModal = (card = null) => {
    if (card) {
      setEditingCardId(card.id);
      setCardData({ ...card });
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

  const getBalanceStatus = () => {
    if (!dashboard.accounts || dashboard.accounts.length === 0) return { text: "Cargando...", color: "text-secondary" };
    const victor = dashboard.accounts.find(a => a.name === 'Víctor');
    let victorBalance = victor?.balance || 0;
    
    if (victorBalance > 0) return { text: `Víctor debe a Alfonso: $${victorBalance.toLocaleString()}`, color: 'text-red' };
    if (victorBalance < 0) return { text: `Alfonso debe a Víctor: $${Math.abs(victorBalance).toLocaleString()}`, color: 'text-green' };
    return { text: `Están a mano ($0.00)`, color: 'text-secondary' };
  };

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>SUITE A&V</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeModule === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveModule('payments')}
          >
            <LayoutDashboard size={20} />
            <span>Gestión de Pagos</span>
          </button>
          <button 
            className={`nav-item ${activeModule === 'salaries' ? 'active' : ''}`}
            onClick={() => setActiveModule('salaries')}
          >
            <Calendar size={20} />
            <span>Semanalidades Víctor</span>
          </button>
          <button 
            className={`nav-item ${activeModule === 'agreements' ? 'active' : ''}`}
            onClick={() => setActiveModule('agreements')}
          >
            <CheckCircle size={20} />
            <span>Acuerdos A&V</span>
          </button>
          <button 
            className={`nav-item ${activeModule === 'contributions' ? 'active' : ''}`}
            onClick={() => setActiveModule('contributions')}
          >
            <DollarSign size={20} />
            <span>Aportaciones A&V</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {activeModule === 'payments' ? (
          <div className="app-container animate-fade-in">
            <header>
              <h1>GESTIÓN DE PAGOS A&V</h1>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn" onClick={() => setIsModalOpen(true)}>
                  <Plus size={20} /> Registrar Operación
                </button>
                <button className="btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white' }} onClick={() => openCardModal(null)}>
                  <Plus size={20} /> Añadir Ficha
                </button>
              </div>
            </header>

            <div className="dashboard-grid">
              <div className="card">
                <div className="stat-label">Estado de Cuentas</div>
                <div className={`stat-value ${getBalanceStatus().color}`}>
                  {getBalanceStatus().text}
                </div>
              </div>

              <div className="card">
                <div className="stat-label">Deuda Total Acumulada</div>
                <div className="stat-value text-red">
                  ${dashboard.totalDebt ? dashboard.totalDebt.toLocaleString() : '0.00'}
                </div>
              </div>

              {suggestion && suggestion.bestCard && (
                <div className="card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
                  <div className="stat-label" style={{color: 'var(--accent-purple)'}}>Sugerencia Inteligente</div>
                  <div className="stat-value" style={{fontSize: '1.5rem', marginTop: '0.5rem'}}>
                    Usa <span style={{color: 'var(--accent-blue)'}}>{suggestion.bestCard.name}</span>
                  </div>
                  <div className="stat-label" style={{marginTop: '0.25rem'}}>
                    Corte hace {suggestion.daysSinceCut} días.
                  </div>
                </div>
              )}
            </div>

            <h2 style={{ marginBottom: '1.5rem' }}>Tarjetas y Créditos</h2>
            <div className="cards-grid">
              {cards.map(card => (
                <div key={card.id} className="card credit-card" style={{ cursor: 'pointer' }} onClick={() => openCardModal(card)}>
                  <div className="card-header" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                    <span style={{fontWeight: '700'}}>{card.name}</span>
                    <Edit size={16} className="text-secondary" />
                  </div>
                  <div className="card-details">
                    <div className="detail-row" style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem'}}>
                      <span className="text-secondary">Deuda</span>
                      <span className={card.current_debt > 0 ? 'text-red' : ''}>${(card.current_debt || 0).toLocaleString()}</span>
                    </div>
                    <div className="detail-row" style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem'}}>
                      <span className="text-secondary">Pago Límite</span>
                      <span>Día {card.payment_day || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeModule === 'contributions' ? (
          <div className="app-container animate-fade-in">
            <header>
              <h1>APORTACIONES DE ALFONSO Y DE VICTOR</h1>
              <button className="btn" onClick={() => setIsModalOpen(true)}>
                <Plus size={20} /> Registrar Aportación
              </button>
            </header>

            <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
              <div className="card">
                <div className="stat-label">Balance Alfonso</div>
                <div className={`stat-value ${dashboard.accounts.find(a => a.id === 1)?.balance < 0 ? 'text-red' : 'text-green'}`}>
                  ${(dashboard.accounts.find(a => a.id === 1)?.balance || 0).toLocaleString()}
                </div>
              </div>
              <div className="card">
                <div className="stat-label">Balance Víctor</div>
                <div className={`stat-value ${dashboard.accounts.find(a => a.id === 2)?.balance < 0 ? 'text-red' : 'text-green'}`}>
                  ${(dashboard.accounts.find(a => a.id === 2)?.balance || 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="card">
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Historial de Movimientos</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th style={{ textAlign: 'right' }}>Aportación Alfonso</th>
                      <th style={{ textAlign: 'right' }}>Aportación Víctor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id}>
                        <td className="text-secondary" style={{ fontSize: '0.8rem' }}>{new Date(t.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td style={{ fontWeight: '500' }}>{t.concept}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          {t.sender_id === 1 ? `$${t.amount.toLocaleString()}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          {t.sender_id === 2 ? `$${t.amount.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: '800' }}>
                      <td colSpan="2">TOTALES</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-blue)' }}>
                        ${transactions.reduce((acc, t) => t.sender_id === 1 ? acc + t.amount : acc, 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-green)' }}>
                        ${transactions.reduce((acc, t) => t.sender_id === 2 ? acc + t.amount : acc, 0).toLocaleString()}
                      </td>
                    </tr>
                    <tr style={{ background: 'var(--bg-dark)' }}>
                      <td colSpan="2" style={{ textAlign: 'right' }}>Diferencia (Excedente):</td>
                      <td colSpan="2" style={{ textAlign: 'center', fontSize: '1.2rem', color: 'var(--accent-purple)' }}>
                        ${Math.abs(transactions.reduce((acc, t) => t.sender_id === 1 ? acc + t.amount : acc, 0) - transactions.reduce((acc, t) => t.sender_id === 2 ? acc + t.amount : acc, 0)).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ) : activeModule === 'agreements' ? (
          <div className="app-container animate-fade-in">
            <header>
              <h1>ACUERDOS A&V</h1>
            </header>
            
            <div className="card agreements-doc" style={{ padding: '3rem', maxWidth: '900px', margin: '0 auto' }}>
              <section className="doc-section">
                <h2 style={{ color: 'var(--accent-blue)', marginBottom: '1.5rem' }}>Bases del Sistema</h2>
                <div className="agreement-box">
                  <strong>Salario Semanal:</strong> Alfonso se compromete a pagar a Víctor <strong>$5,000 MXN</strong> todos los días <strong>jueves</strong> por concepto de salario.
                </div>
              </section>

              <section className="doc-section" style={{ marginTop: '2.5rem' }}>
                <h2 style={{ color: 'var(--accent-purple)', marginBottom: '1.5rem' }}>Estrategia de Optimización Financiera</h2>
                <p className="text-secondary" style={{ marginBottom: '1rem' }}>
                  Víctor posee adeudos diversos (TDC, servicios, tiendas departamentales). Debido a la complejidad de las fechas, se incurre en intereses evitables del 3%. 
                  La estrategia "Coppel Leverage" permite reducir este costo al <strong>1% efectivo</strong>.
                </p>
                <div className="card" style={{ background: 'rgba(255,255,255,0.03)', borderStyle: 'dashed' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>La Pieza Clave: Préstamo Coppel</h3>
                  <ul className="text-secondary" style={{ paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
                    <li style={{ marginBottom: '0.5rem' }}>Solicitud de préstamo en efectivo por parte de Víctor.</li>
                    <li style={{ marginBottom: '0.5rem' }}>Liquidación total por Alfonso usando TDC dentro de los <strong>primeros 7 días</strong>.</li>
                    <li style={{ marginBottom: '0.5rem' }}>Costo estimado: 3% interés - 2% retorno en dinero electrónico = <strong>1% Neto</strong>.</li>
                    <li><strong className="text-red">Advertencia:</strong> El pago DEBE ser antes del día 7 para evitar cargos diarios y capitalización de intereses.</li>
                  </ul>
                </div>
              </section>

              <section className="doc-section" style={{ marginTop: '2.5rem' }}>
                <h2 style={{ color: 'var(--accent-green)', marginBottom: '1.5rem' }}>Los 3 Acuerdos Maestros</h2>
                <div className="agreement-item" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--accent-green)', paddingLeft: '1.5rem' }}>
                  <h3>Acuerdo 1: Liquidez Operativa</h3>
                  <p className="text-secondary">Alfonso proporcionará el efectivo necesario a Víctor para cubrir sus "Pagos para No Generar Intereses" antes de las fechas límite de sus acreedores.</p>
                </div>
                <div className="agreement-item" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--accent-green)', paddingLeft: '1.5rem' }}>
                  <h3>Acuerdo 2: Gestión de Préstamo</h3>
                  <p className="text-secondary">Alfonso liquidará con su TDC la totalidad del préstamo personal Coppel de Víctor dentro de la ventana de 7 días para asegurar el beneficio de intereses bajos y dinero electrónico.</p>
                </div>
                <div className="agreement-item" style={{ borderLeft: '3px solid var(--accent-green)', paddingLeft: '1.5rem' }}>
                  <h3>Acuerdo 3: Absorción de Intereses</h3>
                  <p className="text-secondary">Los intereses del préstamo Coppel serán <strong>absorbidos por Alfonso</strong>. Se mantendrá un registro para monitoreo de la tasa real, pero no afectarán el sueldo de Víctor.</p>
                </div>
                <div className="agreement-item" style={{ marginTop: '1.5rem', borderLeft: '3px solid var(--accent-green)', paddingLeft: '1.5rem' }}>
                  <h3>Acuerdo 4: Beneficio de Dinero Electrónico</h3>
                  <p className="text-secondary">El dinero electrónico generado por los pagos puntuales será un <strong>beneficio extra para Víctor</strong>, independiente de su salario. Víctor podrá disponer de este recurso para compras en Coppel según su preferencia.</p>
                </div>
                <div className="agreement-item" style={{ marginTop: '1.5rem', borderLeft: '3px solid var(--accent-green)', paddingLeft: '1.5rem' }}>
                  <h3>Acuerdo 5: Registro y Balance Neto</h3>
                  <p className="text-secondary">Todas las aportaciones de capital realizadas tanto por Alfonso como por Víctor serán registradas rigurosamente en el sistema para calcular el <strong>balance neto</strong> en tiempo real, asegurando transparencia total en la deuda interpersonal.</p>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="app-container animate-fade-in">
            <header>
              <h1>SEMANALIDADES DE VÍCTOR</h1>
            </header>

            <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
              <div className="card" style={{ borderLeft: '4px solid var(--accent-red)' }}>
                <div className="stat-label">Monto Pendiente por Semanalidades</div>
                <div className="stat-value text-red">
                  ${salaries.reduce((acc, curr) => curr.status === 'PENDIENTE' ? acc + (curr.amount || 5000) : acc, 0).toLocaleString()}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  CONCEPTO DE SEMANALIDADES NO PAGADAS A VICTOR
                </p>
              </div>
            </div>

            <div className="card">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Semana</th>
                      <th>Fecha de Jueves</th>
                      <th>Monto</th>
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaries.map(salary => (
                      <tr key={salary.id}>
                        <td style={{fontWeight: '600'}}>Semana {salary.week_number}</td>
                        <td className="text-secondary">{new Date(salary.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                        <td>${(salary.amount || 5000).toLocaleString()}</td>
                        <td>
                          <select 
                            className="status-select"
                            value={salary.status}
                            onChange={(e) => handleSalaryStatusChange(salary.id, e.target.value)}
                            style={{ 
                              color: salary.status === 'PAGADO' ? '#4ade80' : '#f87171',
                              fontWeight: 'bold'
                            }}
                          >
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="PAGADO">PAGADO</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL TRANSACCIONES */}
        {isModalOpen && (
          <div className="modal-overlay" style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div className="modal-content card" style={{ width: '450px', position: 'relative' }}>
              <div className="modal-header" style={{marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between'}}>
                <h3>Registrar Operación</h3>
                <button style={{background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem'}} onClick={() => setIsModalOpen(false)}>×</button>
              </div>
              <form onSubmit={handleTransactionSubmit}>
                <div className="form-group" style={{marginBottom: '1rem'}}>
                  <label className="stat-label" style={{display: 'block'}}>Concepto</label>
                  <input required type="text" className="status-select" style={{width: '100%', padding: '0.75rem'}} value={formData.concept} onChange={e => setFormData({...formData, concept: e.target.value})} />
                </div>
                <div className="form-group" style={{marginBottom: '1rem'}}>
                  <label className="stat-label" style={{display: 'block'}}>Monto ($)</label>
                  <input required type="number" step="0.01" className="status-select" style={{width: '100%', padding: '0.75rem'}} value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'}}>
                  <div className="form-group">
                    <label className="stat-label">Emisor</label>
                    <select className="status-select" style={{width: '100%'}} value={formData.sender_id} onChange={e => setFormData({...formData, sender_id: e.target.value})}>
                      <option value="1">Alfonso</option>
                      <option value="2">Víctor</option>
                      <option value="">Externo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="stat-label">Receptor</label>
                    <select className="status-select" style={{width: '100%'}} value={formData.receiver_id} onChange={e => setFormData({...formData, receiver_id: e.target.value})}>
                      <option value="1">Alfonso</option>
                      <option value="2">Víctor</option>
                      <option value="">Tercero</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn" style={{width: '100%', justifyContent: 'center'}}>Guardar</button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL FICHAS */}
        {isCardModalOpen && (
          <div className="modal-overlay" style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div className="modal-content card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header" style={{marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between'}}>
                <h3>{editingCardId ? 'Editar Ficha' : 'Nueva Ficha'}</h3>
                <button style={{background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem'}} onClick={() => setIsCardModalOpen(false)}>×</button>
              </div>
              <form onSubmit={handleCardSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="stat-label">Nombre</label>
                    <input required type="text" className="status-select" style={{width: '100%'}} value={cardData.name} onChange={e => setCardData({...cardData, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="stat-label">Tipo</label>
                    <select className="status-select" style={{width: '100%'}} value={cardData.type} onChange={e => setCardData({...cardData, type: e.target.value})}>
                      <option value="TDC">Tarjeta de Crédito</option>
                      <option value="SERVICIOS">Servicio</option>
                      <option value="CREDITO DEPARTAMENTAL">Crédito Dep.</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="stat-label">Pago Día</label>
                    <input required type="number" className="status-select" style={{width: '100%'}} value={cardData.payment_day} onChange={e => setCardData({...cardData, payment_day: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="stat-label">Deuda Actual ($)</label>
                    <input type="number" step="0.01" className="status-select" style={{width: '100%'}} value={cardData.current_debt} onChange={e => setCardData({...cardData, current_debt: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="stat-label">Límite Crédito ($)</label>
                    <input type="number" step="0.01" className="status-select" style={{width: '100%'}} value={cardData.credit_limit} onChange={e => setCardData({...cardData, credit_limit: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="btn" style={{width: '100%', marginTop: '1.5rem', justifyContent: 'center', background: 'var(--accent-purple)'}}>Guardar Ficha</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
