function updateSubscriptionBanner() {
  const banner = $('subscriptionBanner');
  const message = $('subscriptionMessage');
  if (!banner || !message) return;
  banner.className = 'subscription-banner';
  const estado = calcularEstadoPlan(comercioData);
  const planActual = PLANS[comercioData.plan||'trial'];
  
  switch(estado){
    case 'trial':
      banner.classList.add('trial');
      message.innerHTML = '<strong>Trial activo</strong> - Te quedan <strong>' + getDiasRestantesTrial(comercioData) + ' días</strong>';
      break;
    case 'expirado':
      banner.classList.add('expired');
      message.innerHTML = '<strong>Trial expirado</strong>';
      break;
    case 'activo':
      banner.classList.add('active');
      message.innerHTML = '<strong>Plan ' + (planActual?.nombre || '') + ' activo</strong>';
      break;
    default:
      banner.classList.add('trial');
      message.innerHTML = '<strong>Configurá tu asistente IA</strong>';
  }
}
