import React, { useState } from 'react';
import { ShoppingCart, Plus, Trash2, Send } from 'lucide-react';

/**
 * C1_Napolitana - Template Dinámico
 * Extrae datos del Bloque B de la entidad LER
 * 
 * USO: Este componente NO tiene datos hardcodeados.
 * Claude debe pasarle los datos desde bloque_B_contexto_comercial
 */

const C1_Napolitana = ({ entityData }) => {
  const [activeTab, setActiveTab] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [toast, setToast] = useState(null);
  const [cartBounce, setCartBounce] = useState(false);

  // Extraer datos del Bloque B
  const bloqueB = entityData?.bloque_B_contexto_comercial || {};
  const { identity = {}, contacto = {}, catalogo = {} } = bloqueB;
  
  const nombreComercio = identity.nombre_comercio || 'Comercio';
  const whatsappNumber = contacto.whatsapp_number || '';
  const categorias = catalogo.categorias || [];
  const items = catalogo.items || [];

  // Setear tab inicial cuando se cargan las categorías
  React.useEffect(() => {
    if (categorias.length > 0 && !activeTab) {
      setActiveTab(categorias[0]);
    }
  }, [categorias, activeTab]);

  // Función para cambiar de tab
  const changeTab = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Agregar al carrito
  const addToCart = (item, size = null) => {
    const precio = size 
      ? (size === 'mediana' ? item.precio_mediana : item.precio_grande) 
      : item.precio;
    
    const newItem = {
      ...item,
      size,
      precio,
      cartId: Date.now() + Math.random()
    };
    
    setCart([...cart, newItem]);
    
    const sizeText = size ? ` (${size})` : '';
    setToast(`✓ ${item.nombre}${sizeText} agregado`);
    setTimeout(() => setToast(null), 2000);
    
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 500);
  };

  // Remover del carrito
  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  // Calcular total
  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.precio, 0);
  };

  // Generar mensaje de WhatsApp
  const generateWhatsAppMessage = () => {
    let mensaje = `Hola! Vengo de INDICEIA, ESTE ES MI PEDIDO:\n\n`;
    
    cart.forEach(item => {
      const sizeText = item.size ? ` (${item.size})` : '';
      mensaje += `• ${item.nombre}${sizeText} [${item.id}] - $${item.precio.toLocaleString()}\n`;
    });
    
    mensaje += `\nTOTAL: $${getTotal().toLocaleString()}\n\n`;
    mensaje += `Espero tu confirmación, muchas gracias!`;
    
    const encoded = encodeURIComponent(mensaje);
    return `https://wa.me/${whatsappNumber}?text=${encoded}`;
  };

  const totalItems = cart.length;

  // Filtrar items por categoría activa
  const itemsActivos = items.filter(item => item.categoria === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-slate-700 text-white px-3 py-2 rounded-lg shadow-xl z-50 text-xs font-semibold">
          {toast}
        </div>
      )}
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-800 text-white shadow-lg">
        <div className="px-3 py-1.5 flex items-center justify-between">
          <h1 className="text-sm font-bold">{nombreComercio}</h1>
          <button 
            onClick={() => setShowCart(!showCart)}
            className={`relative bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-transform ${
              cartBounce ? 'scale-125' : 'scale-100'
            }`}
          >
            <ShoppingCart size={14} />
            <span>{totalItems}</span>
          </button>
        </div>
        
        {/* Tabs dinámicos desde categorías */}
        <div className="flex bg-slate-700 overflow-x-auto">
          {categorias.map(categoria => (
            <button
              key={categoria}
              onClick={() => changeTab(categoria)}
              className={`flex-1 py-2 px-2 font-semibold transition-all text-xs whitespace-nowrap ${
                activeTab === categoria
                  ? 'bg-white text-slate-800'
                  : 'text-white hover:bg-slate-600'
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>
      </div>

      {/* Carrito desplegable */}
      {showCart && totalItems > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowCart(false)}>
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-96 overflow-y-auto z-50" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-800 text-white p-3 flex justify-between items-center">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <ShoppingCart size={16} />
                Tu Pedido ({totalItems})
              </h2>
              <button onClick={() => setShowCart(false)} className="text-white">✕</button>
            </div>
            
            <div className="p-3 space-y-2">
              {cart.map(item => (
                <div key={item.cartId} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">{item.nombre}</p>
                    {item.size && <p className="text-xs text-slate-600">({item.size})</p>}
                    <p className="text-xs text-slate-500">[{item.id}]</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-amber-600">${item.precio.toLocaleString()}</span>
                    <button 
                      onClick={() => removeFromCart(item.cartId)}
                      className="text-red-600 hover:bg-red-50 p-1 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="border-t-2 pt-3 mt-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-slate-800">TOTAL:</span>
                  <span className="font-bold text-xl text-amber-600">${getTotal().toLocaleString()}</span>
                </div>
                
                <a
                  href={generateWhatsAppMessage()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700"
                >
                  <Send size={16} />
                  Enviar por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de productos */}
      <div className="p-2 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-w-7xl mx-auto">
          {itemsActivos.map(item => (
            <div 
              key={item.id} 
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              {/* Imagen */}
              <div className="relative h-40 overflow-hidden bg-gray-200">
                <img 
                  src={item.image_url || 'https://via.placeholder.com/800x600?text=Sin+Imagen'} 
                  alt={item.nombre}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-slate-800 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  {item.id}
                </div>
              </div>

              {/* Contenido */}
              <div className="p-2">
                <h3 className="font-bold text-sm mb-2 text-slate-800">
                  {item.nombre}
                </h3>

                {/* Si tiene múltiples precios (mediana/grande) */}
                {item.precio_mediana && item.precio_grande ? (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center bg-amber-50 p-2 rounded-lg">
                      <span className="text-slate-700 text-xs">Mediana</span>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600 font-bold text-sm">
                          ${item.precio_mediana.toLocaleString()}
                        </span>
                        <button
                          onClick={() => addToCart(item, 'mediana')}
                          className="bg-amber-600 text-white p-1.5 rounded hover:bg-amber-700"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-amber-50 p-2 rounded-lg">
                      <span className="text-slate-700 text-xs">Grande</span>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600 font-bold text-sm">
                          ${item.precio_grande.toLocaleString()}
                        </span>
                        <button
                          onClick={() => addToCart(item, 'grande')}
                          className="bg-amber-600 text-white p-1.5 rounded hover:bg-amber-700"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Precio único */
                  <div className="bg-amber-50 p-2 rounded-lg flex justify-between items-center">
                    <span className="text-amber-600 font-bold text-sm">
                      ${item.precio.toLocaleString()}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-amber-700 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Agregar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default C1_Napolitana;
