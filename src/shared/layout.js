/* ==================== HEADER - COMPACTO ==================== */
.header {
  background: white;
  box-shadow: var(--shadow);
  padding: 0.75rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Logo */
.header .logo {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-align: left;
  margin: 0;
}

.header .logo-icon {
  width: 40px;
  height: 40px;
  background: var(--gradient-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.3rem;
  margin: 0;
  flex-shrink: 0;
}

.header h1 {
  font-size: 1.4rem;
  color: var(--gray-900);
  margin: 0;
}

/* User Info - Mejorado */
.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.user-name {
  font-weight: 600;
  color: var(--gray-900);
  font-size: 0.9rem;
}

.plan-badge {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  transition: var(--transition);
}

.plan-badge.active {
  background: var(--success);
}

.plan-badge.expired {
  background: var(--danger);
}

.btn-logout {
  background: var(--gray-100);
  border: none;
  padding: 0.65rem;
  border-radius: 8px;
  cursor: pointer;
  color: var(--gray-700);
  transition: var(--transition);
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-logout:hover {
  background: var(--danger);
  color: white;
  transform: scale(1.05);
}

/* ==================== SUBSCRIPTION BANNER - MÁS DISCRETO ==================== */
.subscription-banner {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  padding: 0.5rem 1rem;
  margin: 0;
  font-weight: 500;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.subscription-banner i {
  font-size: 1rem;
  flex-shrink: 0;
}

.subscription-banner.expired {
  background: #fee2e2;
  border-left-color: #ef4444;
  color: #991b1b;
}

.subscription-banner.active {
  background: #d1fae5;
  border-left-color: #10b981;
  color: #065f46;
}

.subscription-banner.trial {
  background: #eff6ff;
  border-left-color: #3b82f6;
  color: #1e40af;
}

.subscription-banner.warning {
  background: #fef3c7;
  border-left-color: #f59e0b;
  color: #92400e;
}

/* ==================== ONBOARDING PROGRESS BAR - COMPACTO ==================== */
.onboarding-progress {
  background: white;
  border-radius: var(--border-radius);
  padding: 1rem 2rem;
  margin: 0.5rem 0;
  box-shadow: var(--shadow);
  border: 1px solid var(--gray-200);
  animation: slideUp 0.6s ease forwards;
}

.progress-header {
  text-align: center;
  margin-bottom: 1rem;
}

.progress-header h3 {
  margin: 0 0 0.25rem 0;
  color: var(--gray-900);
  font-size: 1.1rem;
  font-weight: 700;
}

.progress-subtitle {
  color: var(--gray-600);
  font-size: 0.85rem;
  margin: 0;
  font-weight: 500;
}

.progress-bar-container {
  margin: 1rem 0;
}

.progress-bar {
  height: 8px;
  background: var(--gray-200);
  border-radius: 50px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

.progress-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: 50px;
  transition: width 0.8s ease;
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  margin-top: 1rem;
}

.step-item {
  text-align: center;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.step-item.completed,
.step-item.current {
  opacity: 1;
}

.step-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--gray-200);
  color: var(--gray-600);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.5rem;
  font-weight: 700;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.step-item.completed .step-circle {
  background: var(--success);
  color: white;
  border-color: var(--success);
}

.step-item.current .step-circle {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
  animation: pulse 2s infinite;
}

.step-label {
  font-size: 0.8rem;
  color: var(--gray-700);
  font-weight: 500;
  display: block;
}

.step-item.current .step-label {
  color: var(--primary);
  font-weight: 700;
}

.step-item.completed .step-label {
  color: var(--success);
  font-weight: 600;
}

/* ==================== MAIN CONTENT ==================== */
.main-content {
  max-width: 1200px;
  margin: 1.5rem auto 6rem;
  padding: 0 2rem;
}

/* ==================== NAVIGATION CONTROLS ==================== */
.navigation-controls {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 1rem 2rem;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  z-index: 90;
}

.nav-buttons {
  display: flex;
  gap: 1rem;
}

.nav-info {
  font-size: 0.9rem;
  color: var(--gray-600);
}

/* Dashboard Navbar */
.navbar-dashboard {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
  flex-wrap: wrap;
  justify-content: center;
}

.nav-item {
  padding: 1rem 1.5rem;
  background: var(--gray-50);
  border-radius: 12px;
  text-decoration: none;
  color: var(--gray-700);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: var(--transition);
}

.nav-item:hover {
  background: var(--gray-100);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 768px) {
  .header .container {
    padding: 0 1rem;
  }

  .header h1 {
    font-size: 1.2rem;
  }

  .header .logo-icon {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .user-details {
    display: none;
  }

  .subscription-banner {
    padding: 0.5rem;
    font-size: 0.8rem;
  }

  .onboarding-progress {
    padding: 0.75rem 1rem;
    margin: 0.25rem 0;
  }

  .progress-header h3 {
    font-size: 1rem;
  }

  .progress-subtitle {
    font-size: 0.75rem;
  }

  .steps-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }

  .step-circle {
    width: 32px;
    height: 32px;
    font-size: 0.85rem;
  }

  .step-label {
    font-size: 0.7rem;
  }

  .main-content {
    padding: 0 1rem 6rem;
    margin: 1rem auto;
  }

  .navigation-controls {
    padding: 1rem;
    flex-direction: column;
  }

  .nav-buttons {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .header h1 {
    font-size: 1.1rem;
  }

  .step-label {
    font-size: 0.65rem;
  }

  .subscription-banner {
    flex-direction: column;
    text-align: center;
    gap: 0.25rem;
  }
}
