/* ==========================================================
   MÉTODOS DE PAGO — UI PREMIUM 2025 (Glass + iOS 17 Style)
   ========================================================== */

:root {
  --pay-bg: rgba(255, 255, 255, 0.55);
  --pay-bg-hover: rgba(255, 255, 255, 0.75);
  --pay-bg-selected: rgba(99, 102, 241, 0.25);
  --pay-blur: 14px;
  --pay-border: rgba(255, 255, 255, 0.45);
  --pay-border-selected: var(--primary);
  --pay-radius: 18px;

  --pay-shadow: 0 10px 25px rgba(0,0,0,0.08);
  --pay-shadow-hover: 0 14px 35px rgba(0,0,0,0.10);
  --pay-shadow-selected: 0 16px 48px rgba(99,102,241,0.35);

  --pay-transition: 0.28s cubic-bezier(.21,1,.33,1);
}

/* Contenedor grilla */
#paymentMethods {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.3rem;
  margin-top: 1rem;
}

/* Tarjeta base */
.payment-tag {
  position: relative;
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: 1.1rem 1.4rem;

  background: var(--pay-bg);
  backdrop-filter: blur(var(--pay-blur)) saturate(180%);
  border: 1.5px solid var(--pay-border);
  border-radius: var(--pay-radius);

  cursor: pointer;
  box-shadow: var(--pay-shadow);
  transition:
    background var(--pay-transition),
    transform var(--pay-transition),
    border-color var(--pay-transition),
    box-shadow var(--pay-transition);
}

.payment-tag input {
  display: none;
}

/* Icono */
.payment-tag i {
  font-size: 1.3rem;
  opacity: .75;
  transition: opacity .25s, transform .25s;
}

/* Hover */
.payment-tag:hover {
  background: var(--pay-bg-hover);
  transform: translateY(-4px);
  box-shadow: var(--pay-shadow-hover);
}

.payment-tag:hover i {
  opacity: 1;
  transform: scale(1.08);
}

/* ESTADO SELECCIONADO */
.payment-tag.selected {
  background: var(--pay-bg-selected);
  border-color: var(--pay-border-selected);
  box-shadow: var(--pay-shadow-selected);
  transform: translateY(-6px) scale(1.03);
}

/* Glow ring animado */
.payment-tag.selected::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 2px solid rgba(99,102,241,0.45);
  opacity: .8;
  animation: payPulse 2.8s ease-in-out infinite;
}

/* Texto */
.payment-tag label {
  flex: 1;
  cursor: pointer;
  font-size: .95rem;
  font-weight: 600;
  color: #1f2937;
  user-select: none;
}

/* Animación pulso */
@keyframes payPulse {
  0% {
    opacity: .8;
    transform: scale(1);
  }
  50% {
    opacity: .25;
    transform: scale(1.05);
  }
  100% {
    opacity: .8;
    transform: scale(1);
  }
}
