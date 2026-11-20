const app = (() => {
  const STORAGE_KEY = 'FORTUMAZTER_DB_V1_COP';
  const WHATSAPP_NUMBER = '573017856314'; // Cambia por tu WhatsApp real
  const COMMISSION_PER_TICKET = 2000; // Comisión fija en COP por cada boleto colocado por vendedor

  let historyFilterMode = 'current_month'; // 'current_month' | 'specific_date' | 'all'
  let historySpecificDate = '';

  function startFaviconEffect() {
    const faviconEl = document.getElementById('favicon');
    if (!faviconEl) return;

    const frames = [
      { color: '#00f5d4', strokeWidth: 4, fontSize: 38 },
      { color: '#ff6b00', strokeWidth: 5, fontSize: 41 },
      { color: '#39ff14', strokeWidth: 4, fontSize: 38 },
      { color: '#facc15', strokeWidth: 5, fontSize: 40 }
    ];
    let step = 0;

    const updateFrame = () => {
      const f = frames[step];
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect x='2' y='2' width='60' height='60' rx='14' fill='#050a18' stroke='${f.color}' stroke-width='${f.strokeWidth}'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='900' font-size='${f.fontSize}' fill='${f.color}'>F</text></svg>`;
      faviconEl.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
      step = (step + 1) % frames.length;
    };

    updateFrame();
    setInterval(updateFrame, 1000);
  }

  function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
  }

  function hashPass(pw) {
    return btoa(unescape(encodeURIComponent('FORTUMAZTER_SALT_' + pw)));
  }

  function getLocalDateTimeInputValue(offsetMs = 3600 * 1000) {
    const d = new Date(Date.now() + offsetMs);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const futureDate = getLocalDateTimeInputValue(3600 * 1000);

  const defaultState = {
    users: [
      {
        id: 'usr-admin-01',
        name: 'Administrador FortuMazter',
        email: 'admin@fortumazter.com',
        password: hashPass('Admin2050!'),
        gender: 'hombre',
        role: 'admin',
        status: 'activo',
        commissionBalance: 0,
        mustResetPassword: false
      }
    ],
    raffles: [
      {
        id: 'raf-01',
        title: 'iPhone 16 Pro Max VIP',
        description: 'Equipo libre de fábrica de 256GB con garantía oficial.',
        totalNumbers: 30,
        price: 10000,
        endTime: futureDate,
        isVip: true,
        winnerNumber: null,
        winnerName: null,
        finishedAt: null,
        tickets: {}
      }
    ],
    prizeCandidates: [
      {
        id: 'cand-01',
        title: 'PlayStation 5 Slim + 2 Controles',
        description: 'Consola edición 1TB con dos mandos DualSense inalámbricos.',
        icon: '🎮',
        voters: []
      },
      {
        id: 'cand-02',
        title: 'Bono Efectivo $1.000.000 COP',
        description: 'Transferencia inmediata libre de descuentos al ganador.',
        icon: '💸',
        voters: []
      },
      {
        id: 'cand-03',
        title: 'Moto Eléctrica Urbana Zero',
        description: 'Movilidad ecológica de alto rendimiento con casco certificado.',
        icon: '🏍️',
        voters: []
      }
    ],
    history: [],
    activeRaffleId: 'raf-01',
    currentUserId: null,
    cart: [],
    activeReferrer: null
  };

  let state = loadState();
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveState();
  }

  function checkUrlReferrer() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      state.activeReferrer = ref;
      saveState();
    }
  }
  checkUrlReferrer();

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.prizeCandidates) parsed.prizeCandidates = structuredClone(defaultState.prizeCandidates);
        return parsed;
      }
    } catch (e) {
      console.error('Error cargando estado:', e);
    }
    return structuredClone(defaultState);
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getCurrentUser() {
    if (!state.currentUserId) return null;
    const user = state.users.find(u => u.id === state.currentUserId);
    if (!user || user.status === 'suspendido') {
      state.currentUserId = null;
      saveState();
      return null;
    }
    return user;
  }

  function toast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function applyGenderTheme(user) {
    const html = document.documentElement;
    if (user && (user.gender === 'mujer' || user.gender === 'hombre')) {
      html.setAttribute('data-theme', user.gender);
    } else {
      html.setAttribute('data-theme', 'default');
    }
  }

  function navigate(viewName) {
    const user = getCurrentUser();

    if (viewName === 'user-panel' && !user) {
      openAuthModal('login');
      toast('Inicia sesión para acceder a tu Bóveda.');
      return;
    }

    if (viewName === 'seller-panel' && (!user || (user.role !== 'vendedor' && user.role !== 'admin'))) {
      toast('Acceso denegado: Se requiere rango de Vendedor.');
      return;
    }

    if (viewName === 'admin-panel' && (!user || user.role !== 'admin')) {
      toast('Acceso denegado: Se requieren credenciales de Administrador.');
      return;
    }

    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');

    const navBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
    if (navBtn) navBtn.classList.add('active');

    renderAll();
  }

  function openAuthModal(mode = 'login') {
    document.getElementById('auth-modal').classList.remove('hidden');
    switchAuthMode(mode);
  }

  function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
  }

  function switchAuthMode(mode) {
    const formLogin = document.getElementById('form-login');
    const formReg = document.getElementById('form-register');
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');
    const title = document.getElementById('auth-modal-title');

    if (!formLogin || !formReg) return;

    if (mode === 'login') {
      formLogin.classList.remove('hidden');
      formReg.classList.add('hidden');
      if (tabLogin) tabLogin.classList.add('active');
      if (tabReg) tabReg.classList.remove('active');
      if (title) title.textContent = 'ACCESO AL NÚCLEO';
    } else {
      formLogin.classList.add('hidden');
      formReg.classList.remove('hidden');
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabReg) tabReg.classList.add('active');
      if (title) title.textContent = 'NUEVA IDENTIDAD FORTUMAZTER';
    }
  }

  function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const gender = document.getElementById('reg-gender').value;
    const password = document.getElementById('reg-password').value;

    if (state.users.some(u => u.email === email)) {
      toast('Este correo ya está registrado.');
      return;
    }

    const newUser = {
      id: 'usr-' + Date.now(),
      name,
      email,
      password: hashPass(password),
      gender,
      role: 'cliente',
      status: 'activo',
      commissionBalance: 0,
      mustResetPassword: false
    };

    state.users.push(newUser);
    state.currentUserId = newUser.id;
    saveState();
    closeAuthModal();
    e.target.reset();
    toast(`Identidad creada. Interfaz sincronizada (${gender.toUpperCase()}).`);
    renderAll();
  }

  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    const user = state.users.find(u => u.email === email && u.password === hashPass(password));
    if (!user) {
      toast('Credenciales incorrectas.');
      return;
    }
    if (user.status === 'suspendido') {
      toast('Cuenta suspendida.');
      return;
    }

    state.currentUserId = user.id;
    saveState();
    closeAuthModal();
    e.target.reset();

    if (user.mustResetPassword) {
      document.getElementById('force-password-modal').classList.remove('hidden');
      toast('Por seguridad, debes cambiar tu contraseña temporal.');
    } else {
      toast(`Bienvenido a FortuMazter, ${user.name}.`);
      navigate('vitrina');
    }
    renderAll();
  }

  function handleForcePasswordChange(e) {
    e.preventDefault();
    const newPass = document.getElementById('new-forced-password').value;
    const user = getCurrentUser();

    if (!user) return;

    user.password = hashPass(newPass);
    user.mustResetPassword = false;
    saveState();

    document.getElementById('force-password-modal').classList.add('hidden');
    e.target.reset();
    toast('¡Contraseña actualizada con éxito! Acceso concedido.');
    navigate('vitrina');
  }

  function adminResetUserPassword(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    if (confirm(`¿Establecer la contraseña por defecto (1234) para el usuario ${user.name}? Se le exigirá cambiarla al iniciar sesión.`)) {
      user.password = hashPass('1234');
      user.mustResetPassword = true;
      saveState();
      renderAll();
      toast(`Contraseña de ${user.name} restablecida a 1234.`);
    }
  }

  function logout() {
    state.currentUserId = null;
    state.cart = [];
    saveState();
    toast('Sesión cerrada.');
    navigate('vitrina');
  }

  function selectRaffle(raffleId) {
    state.activeRaffleId = raffleId;
    saveState();
    renderVitrina();
  }

  function formatNum(n, total) {
    const digits = total >= 100 ? 3 : 2;
    return String(n).padStart(digits, '0');
  }

  function handleTicketClick(raffleId, numStr) {
    const user = getCurrentUser();
    if (!user) {
      openAuthModal('login');
      toast('Inicia sesión para agregar números al carrito.');
      return;
    }

    const raffle = state.raffles.find(r => r.id === raffleId);
    if (!raffle || raffle.winnerNumber) return;

    const ticket = raffle.tickets[numStr];
    if (ticket && ticket.status === 'paid') {
      toast(`El número #${numStr} ya está pagado por otro usuario.`);
      return;
    }

    const cartIndex = state.cart.findIndex(item => item.raffleId === raffleId && item.numStr === numStr);
    if (cartIndex > -1) {
      state.cart.splice(cartIndex, 1);
      toast(`Número #${numStr} quitado del carrito.`);
    } else {
      state.cart.push({ raffleId, raffleTitle: raffle.title, numStr, price: raffle.price });
      toast(`Número #${numStr} agregado al carrito 🛒`);
    }

    saveState();
    renderVitrina();
    renderCartModal();
  }

  function openCartModal() {
    if (!getCurrentUser()) {
      openAuthModal('login');
      return;
    }
    document.getElementById('cart-modal').classList.remove('hidden');
    renderCartModal();
  }

  function closeCartModal() {
    document.getElementById('cart-modal').classList.add('hidden');
  }

  function removeFromCart(raffleId, numStr) {
    state.cart = state.cart.filter(item => !(item.raffleId === raffleId && item.numStr === numStr));
    saveState();
    renderVitrina();
    renderCartModal();
  }

  function checkoutCartToWhatsApp() {
    const user = getCurrentUser();
    if (!user || state.cart.length === 0) return;

    let totalToPay = 0;
    let detailsText = '';
    const grouped = {};
    const assignedReferrer = state.activeReferrer || 'Ninguno';

    state.cart.forEach(item => {
      if (!grouped[item.raffleTitle]) grouped[item.raffleTitle] = [];
      grouped[item.raffleTitle].push(item.numStr);

      const raffle = state.raffles.find(r => r.id === item.raffleId);
      if (raffle) {
        raffle.tickets[item.numStr] = {
          status: 'reserved',
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          referrer: assignedReferrer,
          updatedAt: new Date().toLocaleString()
        };
        totalToPay += item.price;
      }
    });

    Object.entries(grouped).forEach(([title, nums]) => {
      detailsText += `🎁 *Rifa:* ${title}\n🔢 *Números:* ${nums.map(n => '#' + n).join(', ')}\n\n`;
    });

    const message = `Hola *FortuMazter*! 👋 Deseo confirmar mis números en reserva:\n\n${detailsText}💲 *Total a Pagar:* $${totalToPay.toLocaleString('es-CO')} COP\n👤 *Participante:* ${user.name}\n📧 *Correo:* ${user.email}\n🎟️ *Vendedor Ref:* ${assignedReferrer}\n\nQuedo atento(a) para enviar mi comprobante de pago. ¡Gracias!`;

    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    state.cart = [];
    saveState();
    closeCartModal();
    renderAll();

    window.open(whatsappURL, '_blank');
    toast('¡Boletos en reserva! Redirigiendo a WhatsApp...');
  }

  // ================= VOTACIÓN DE PRÓXIMOS PREMIOS =================
  function toggleVotePrize(candId) {
    const user = getCurrentUser();
    if (!user) {
      openAuthModal('login');
      toast('Inicia sesión para votar por tu premio favorito.');
      return;
    }

    const cand = state.prizeCandidates.find(c => c.id === candId);
    if (!cand) return;

    if (!Array.isArray(cand.voters)) cand.voters = [];

    const idx = cand.voters.indexOf(user.id);
    if (idx > -1) {
      cand.voters.splice(idx, 1);
      toast(`Voto retirado de "${cand.title}".`);
    } else {
      cand.voters.push(user.id);
      toast(`¡Voto registrado para "${cand.title}"! ⭐`);
    }

    saveState();
    renderAll();
  }

  function createPrizeCandidate(e) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;

    const title = document.getElementById('prize-cand-title').value.trim();
    const description = document.getElementById('prize-cand-desc').value.trim();
    const icon = document.getElementById('prize-cand-icon').value.trim() || '🎁';

    state.prizeCandidates.push({
      id: 'cand-' + Date.now(),
      title,
      description,
      icon,
      voters: []
    });

    saveState();
    e.target.reset();
    toast(`Artículo "${title}" añadido a la votación.`);
    renderAll();
  }

  function deletePrizeCandidate(candId) {
    if (!confirm('¿Eliminar este artículo de la votación?')) return;
    state.prizeCandidates = state.prizeCandidates.filter(c => c.id !== candId);
    saveState();
    renderAll();
    toast('Artículo eliminado.');
  }

  function resetPrizeVotes(candId) {
    const cand = state.prizeCandidates.find(c => c.id === candId);
    if (!cand) return;
    if (!confirm(`¿Reiniciar a 0 los votos de "${cand.title}"?`)) return;
    cand.voters = [];
    saveState();
    renderAll();
    toast('Votos reiniciados.');
  }

  function launchRaffleFromCandidate(candId) {
    const cand = state.prizeCandidates.find(c => c.id === candId);
    if (!cand) return;

    const firstTabBtn = document.querySelector('.admin-tab-btn');
    switchAdminTab('raffles', firstTabBtn);

    const titleInput = document.getElementById('raffle-title');
    const descInput = document.getElementById('raffle-desc');
    if (titleInput) titleInput.value = cand.title;
    if (descInput) descInput.value = cand.description;

    toast(`Premio "${cand.title}" cargado. Define cantidad, precio y fecha para desplegar la rifa.`);
  }

  // ================= TEMPORIZADOR FLUIDO SEGUNDO A SEGUNDO =================
  function checkTimersAndDraws() {
    const now = new Date().getTime();
    let updated = false;

    state.raffles.forEach(raffle => {
      if (!raffle.winnerNumber && raffle.endTime) {
        const endTime = new Date(raffle.endTime).getTime();
        if (!Number.isNaN(endTime) && now >= endTime) {
          const paidTickets = Object.entries(raffle.tickets).filter(([, v]) => v.status === 'paid');
          let winnerNum = '';
          let winnerName = 'Sin comprador (Casa)';

          if (paidTickets.length > 0) {
            const randomPick = paidTickets[Math.floor(Math.random() * paidTickets.length)];
            winnerNum = randomPick[0];
            winnerName = randomPick[1].userName;
          } else {
            const randomVal = Math.floor(Math.random() * raffle.totalNumbers) + 1;
            winnerNum = formatNum(randomVal, raffle.totalNumbers);
          }

          raffle.winnerNumber = winnerNum;
          raffle.winnerName = winnerName;
          raffle.finishedAt = now;
          updated = true;
        }
      }
    });

    state.raffles = state.raffles.filter(raffle => {
      if (raffle.winnerNumber && raffle.finishedAt) {
        const elapsed = now - raffle.finishedAt;
        if (elapsed > 5 * 60 * 1000) {
          const finDate = new Date(raffle.finishedAt);
          const isoDate = `${finDate.getFullYear()}-${String(finDate.getMonth() + 1).padStart(2, '0')}-${String(finDate.getDate()).padStart(2, '0')}`;

          state.history.unshift({
            id: raffle.id,
            title: raffle.title,
            winnerNumber: raffle.winnerNumber,
            winnerName: raffle.winnerName,
            finishedTimestamp: raffle.finishedAt,
            isoDate,
            finishedDate: finDate.toLocaleString()
          });
          updated = true;
          return false;
        }
      }
      return true;
    });

    updateCountdownsUI();

    if (updated) {
      saveState();
      renderAll();
    }
  }

  function updateCountdownsUI() {
    const now = new Date().getTime();
    state.raffles.forEach(raffle => {
      if (raffle.endTime && !raffle.winnerNumber) {
        const diff = new Date(raffle.endTime).getTime() - now;
        const daysEl = document.getElementById(`cd-days-${raffle.id}`);
        const hrsEl = document.getElementById(`cd-hrs-${raffle.id}`);
        const minsEl = document.getElementById(`cd-mins-${raffle.id}`);
        const secsEl = document.getElementById(`cd-secs-${raffle.id}`);

        if (daysEl && hrsEl && minsEl && secsEl) {
          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const mins = Math.floor((diff / 1000 / 60) % 60);
            const secs = Math.floor((diff / 1000) % 60);

            daysEl.textContent = String(days).padStart(2, '0');
            hrsEl.textContent = String(hours).padStart(2, '0');
            minsEl.textContent = String(mins).padStart(2, '0');
            secsEl.textContent = String(secs).padStart(2, '0');
          } else {
            daysEl.textContent = '00';
            hrsEl.textContent = '00';
            minsEl.textContent = '00';
            secsEl.textContent = '00';
          }
        }
      }
    });
  }

  setInterval(checkTimersAndDraws, 1000);

  function createRaffle(e) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;

    const title = document.getElementById('raffle-title').value.trim();
    const description = document.getElementById('raffle-desc').value.trim();
    const totalNumbers = parseInt(document.getElementById('raffle-count').value, 10);
    const price = parseFloat(document.getElementById('raffle-price').value);
    const endTime = document.getElementById('raffle-endtime').value;
    const isVip = document.getElementById('raffle-type').value === 'vip';

    if (price < 100) {
      toast('El valor mínimo de la rifa es de $100 COP.');
      return;
    }

    const newRaffle = {
      id: 'raf-' + Date.now(),
      title,
      description,
      totalNumbers,
      price,
      endTime,
      isVip,
      winnerNumber: null,
      winnerName: null,
      finishedAt: null,
      tickets: {}
    };

    state.raffles.unshift(newRaffle);
    state.activeRaffleId = newRaffle.id;
    saveState();
    e.target.reset();
    toast(`Rifa "${title}" desplegada con éxito.`);
    renderAll();
  }

  function deleteRaffle(raffleId) {
    if (!confirm('¿Eliminar esta rifa?')) return;
    state.raffles = state.raffles.filter(r => r.id !== raffleId);
    if (state.activeRaffleId === raffleId) state.activeRaffleId = state.raffles[0]?.id || null;
    saveState();
    renderAll();
  }

  function openEditRaffleModal(raffleId) {
    const raffle = state.raffles.find(r => r.id === raffleId);
    if (!raffle) return;

    document.getElementById('edit-raffle-id').value = raffle.id;
    document.getElementById('edit-raffle-title').value = raffle.title;
    document.getElementById('edit-raffle-desc').value = raffle.description;
    document.getElementById('edit-raffle-count').value = raffle.totalNumbers;
    document.getElementById('edit-raffle-price').value = raffle.price;
    document.getElementById('edit-raffle-endtime').value = raffle.endTime;
    document.getElementById('edit-raffle-type').value = raffle.isVip ? 'vip' : 'normal';

    document.getElementById('edit-raffle-modal').classList.remove('hidden');
  }

  function closeEditRaffleModal() {
    document.getElementById('edit-raffle-modal').classList.add('hidden');
  }

  function saveEditedRaffle(e) {
    e.preventDefault();
    const id = document.getElementById('edit-raffle-id').value;
    const raffle = state.raffles.find(r => r.id === id);
    if (!raffle) return;

    const newPrice = parseFloat(document.getElementById('edit-raffle-price').value);
    if (newPrice < 100) {
      toast('El valor mínimo de la rifa es de $100 COP.');
      return;
    }

    raffle.title = document.getElementById('edit-raffle-title').value.trim();
    raffle.description = document.getElementById('edit-raffle-desc').value.trim();
    raffle.totalNumbers = parseInt(document.getElementById('edit-raffle-count').value, 10);
    raffle.price = newPrice;
    raffle.endTime = document.getElementById('edit-raffle-endtime').value;
    raffle.isVip = document.getElementById('edit-raffle-type').value === 'vip';

    saveState();
    closeEditRaffleModal();
    renderAll();
    toast(`Rifa "${raffle.title}" actualizada correctamente.`);
  }

  function approveTicketPayment(raffleId, numStr) {
    const raffle = state.raffles.find(r => r.id === raffleId);
    if (!raffle || !raffle.tickets[numStr]) return;

    raffle.tickets[numStr].status = 'paid';

    const refName = raffle.tickets[numStr].referrer;
    if (refName && refName !== 'Ninguno') {
      const seller = state.users.find(u => u.name.toLowerCase() === refName.toLowerCase() || u.email.split('@')[0] === refName);
      if (seller) {
        seller.commissionBalance = (seller.commissionBalance || 0) + COMMISSION_PER_TICKET;
      }
    }

    saveState();
    toast(`Boleto #${numStr} aprobado como PAGADO y comisión asignada.`);
    renderAll();
  }

  function releaseTicketReservation(raffleId, numStr) {
    const raffle = state.raffles.find(r => r.id === raffleId);
    if (!raffle || !raffle.tickets[numStr]) return;
    delete raffle.tickets[numStr];
    saveState();
    renderAll();
  }

  function copySellerLink() {
    const user = getCurrentUser();
    if (!user) return;
    const identifier = user.email.split('@')[0];
    const link = `${window.location.origin}${window.location.pathname}?ref=${identifier}`;

    navigator.clipboard.writeText(link).then(() => {
      toast('¡Enlace de referido copiado al portapapeles!');
    });
  }

  function openEditUserModal(userId) {
    const u = state.users.find(x => x.id === userId);
    if (!u) return;
    document.getElementById('edit-user-id').value = u.id;
    document.getElementById('edit-user-name').value = u.name;
    document.getElementById('edit-user-email').value = u.email;
    document.getElementById('edit-user-gender').value = u.gender;
    document.getElementById('edit-user-role').value = u.role;
    document.getElementById('edit-user-modal').classList.remove('hidden');
  }

  function closeEditUserModal() {
    document.getElementById('edit-user-modal').classList.add('hidden');
  }

  function saveEditedUser(e) {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    const u = state.users.find(x => x.id === id);
    if (!u) return;
    u.name = document.getElementById('edit-user-name').value.trim();
    u.email = document.getElementById('edit-user-email').value.trim().toLowerCase();
    u.gender = document.getElementById('edit-user-gender').value;
    u.role = document.getElementById('edit-user-role').value;
    saveState();
    closeEditUserModal();
    renderAll();
    toast('Usuario actualizado.');
  }

  function toggleSuspendUser(userId) {
    const u = state.users.find(x => x.id === userId);
    if (!u || u.role === 'admin') return;
    u.status = u.status === 'activo' ? 'suspendido' : 'activo';
    saveState();
    renderAll();
  }

  function deleteUser(userId) {
    const u = state.users.find(x => x.id === userId);
    if (!u || u.role === 'admin' || !confirm('¿Eliminar usuario?')) return;
    state.users = state.users.filter(x => x.id !== userId);
    saveState();
    renderAll();
  }

  function switchAdminTab(tabName, btnEl) {
    document.querySelectorAll('.admin-subpanel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`admin-tab-${tabName}`).classList.remove('hidden');
    if (btnEl) btnEl.classList.add('active');
  }

  // ================= FILTROS DE HISTORIAL =================
  function filterHistoryByDate(dateVal) {
    if (!dateVal) {
      resetHistoryFilter();
      return;
    }
    historyFilterMode = 'specific_date';
    historySpecificDate = dateVal;
    renderHistory();
  }

  function resetHistoryFilter() {
    historyFilterMode = 'current_month';
    historySpecificDate = '';
    const input = document.getElementById('history-date-filter');
    if (input) input.value = '';
    renderHistory();
  }

  function showAllHistory() {
    historyFilterMode = 'all';
    historySpecificDate = '';
    const input = document.getElementById('history-date-filter');
    if (input) input.value = '';
    renderHistory();
  }

  function renderHeader() {
    const user = getCurrentUser();
    applyGenderTheme(user);

    const authControls = document.getElementById('auth-controls');
    const userSession = document.getElementById('user-session');
    const btnUser = document.getElementById('btn-nav-user');
    const btnSeller = document.getElementById('btn-nav-seller');
    const btnAdmin = document.getElementById('btn-nav-admin');
    const cartFloatingBtn = document.getElementById('cart-floating-btn');

    if (user) {
      authControls.classList.add('hidden');
      userSession.classList.remove('hidden');
      if (btnUser) btnUser.classList.remove('hidden');
      if (cartFloatingBtn) cartFloatingBtn.classList.remove('hidden');
      document.getElementById('header-username').textContent = user.name;
      document.getElementById('header-role').textContent = user.role;

      if (btnSeller) btnSeller.classList.toggle('hidden', user.role !== 'vendedor' && user.role !== 'admin');
      if (btnAdmin) btnAdmin.classList.toggle('hidden', user.role !== 'admin');
    } else {
      authControls.classList.remove('hidden');
      userSession.classList.add('hidden');
      if (btnUser) btnUser.classList.add('hidden');
      if (btnSeller) btnSeller.classList.add('hidden');
      if (btnAdmin) btnAdmin.classList.add('hidden');
      if (cartFloatingBtn) cartFloatingBtn.classList.add('hidden');
    }

    const badge = document.getElementById('cart-badge-count');
    if (badge) badge.textContent = state.cart.length;

    const bannerRef = document.getElementById('banner-ref-client');
    const spanRefName = document.getElementById('span-ref-name');
    if (bannerRef && spanRefName) {
      if (state.activeReferrer) {
        bannerRef.classList.remove('hidden');
        spanRefName.textContent = state.activeReferrer;
      } else {
        bannerRef.classList.add('hidden');
      }
    }
  }

  function renderVitrina() {
    let totalAvail = 0, totalRes = 0, totalSold = 0;
    state.raffles.forEach(r => {
      const tickets = Object.values(r.tickets);
      const resCount = tickets.filter(t => t.status === 'reserved').length;
      const soldCount = tickets.filter(t => t.status === 'paid').length;
      totalRes += resCount;
      totalSold += soldCount;
      totalAvail += (r.totalNumbers - resCount - soldCount);
    });

    document.getElementById('kpi-total-raffles').textContent = state.raffles.length;
    document.getElementById('kpi-avail-tickets').textContent = totalAvail;
    document.getElementById('kpi-reserved-tickets').textContent = totalRes;
    document.getElementById('kpi-sold-tickets').textContent = totalSold;

    const tabsContainer = document.getElementById('vitrina-raffle-tabs');
    if (tabsContainer) {
      tabsContainer.innerHTML = state.raffles.map(r => `
        <button class="raffle-tab ${r.id === state.activeRaffleId ? 'active' : ''}" onclick="app.selectRaffle('${r.id}')">
          <strong>${escapeHTML(r.title)}</strong> · $${r.price.toLocaleString('es-CO')} COP ${r.isVip ? '⭐ VIP' : ''}
        </button>
      `).join('');
    }

    const workspace = document.getElementById('vitrina-active-container');
    if (!workspace) return;

    const activeRaffle = state.raffles.find(r => r.id === state.activeRaffleId) || state.raffles[0];
    if (!activeRaffle) {
      workspace.innerHTML = `<div class="glass-panel vitrina-card"><p>No hay rifas activas en este momento.</p></div>`;
      return;
    }

    let timeLeftHTML = '';
    if (activeRaffle.endTime) {
      const diff = new Date(activeRaffle.endTime).getTime() - new Date().getTime();
      let days = 0, hours = 0, mins = 0, secs = 0;
      if (diff > 0) {
        days = Math.floor(diff / (1000 * 60 * 60 * 24));
        hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        mins = Math.floor((diff / 1000 / 60) % 60);
        secs = Math.floor((diff / 1000) % 60);
      }

      timeLeftHTML = `
        <div class="countdown-box">
          <div class="countdown-item"><span class="countdown-num" id="cd-days-${activeRaffle.id}">${String(days).padStart(2, '0')}</span><span class="countdown-label">Días</span></div> :
          <div class="countdown-item"><span class="countdown-num" id="cd-hrs-${activeRaffle.id}">${String(hours).padStart(2, '0')}</span><span class="countdown-label">Hrs</span></div> :
          <div class="countdown-item"><span class="countdown-num" id="cd-mins-${activeRaffle.id}">${String(mins).padStart(2, '0')}</span><span class="countdown-label">Min</span></div> :
          <div class="countdown-item"><span class="countdown-num" id="cd-secs-${activeRaffle.id}">${String(secs).padStart(2, '0')}</span><span class="countdown-label">Seg</span></div>
        </div>
      `;
    }

    let gridHTML = '';
    for (let i = 1; i <= activeRaffle.totalNumbers; i++) {
      const numStr = formatNum(i, activeRaffle.totalNumbers);
      const t = activeRaffle.tickets[numStr];
      const inCart = state.cart.some(item => item.raffleId === activeRaffle.id && item.numStr === numStr);
      const isWinner = activeRaffle.winnerNumber === numStr;

      let cssClass = 'ticket-available';
      let label = 'LIBRE';

      if (t) {
        if (t.status === 'paid') { cssClass = 'ticket-sold'; label = 'PAGADO'; }
        else if (t.status === 'reserved') { cssClass = 'ticket-reserved'; label = 'RESERVADO'; }
      }
      if (inCart) { cssClass += ' ticket-selected'; label = 'EN CARRITO'; }
      if (isWinner) { cssClass += ' ticket-winner'; label = '🏆 GANADOR'; }

      gridHTML += `
        <button class="ticket-btn ${cssClass}" onclick="app.handleTicketClick('${activeRaffle.id}', '${numStr}')">
          <span>#${numStr}</span>
          <small>${label}</small>
        </button>
      `;
    }

    workspace.innerHTML = `
      <div class="glass-panel vitrina-card ${activeRaffle.isVip ? 'vip-raffle-card' : ''}">
        ${activeRaffle.isVip ? '<span class="vip-badge">⭐ VIP EXCLUSIVO</span>' : ''}
        <div class="vitrina-header">
          <div>
            <h3>${escapeHTML(activeRaffle.title)}</h3>
            <p style="color: var(--text-muted); margin-top:4px;">${escapeHTML(activeRaffle.description)}</p>
            ${timeLeftHTML}
          </div>
          <div style="text-align:right;">
            <span class="badge-year">VALOR: $${activeRaffle.price.toLocaleString('es-CO')} COP</span>
            ${activeRaffle.winnerNumber ? `<div style="margin-top:8px; color:#facc15; font-weight:800;">🏆 GANADOR: #${activeRaffle.winnerNumber} (${escapeHTML(activeRaffle.winnerName)})</div>` : ''}
          </div>
        </div>

        <div class="legend-bar">
          <div class="legend-item"><span class="dot dot-avail"></span> Disponible</div>
          <div class="legend-item"><span class="dot dot-reserved"></span> Reservado (Reclamable)</div>
          <div class="legend-item"><span class="dot dot-sold"></span> Pagado</div>
        </div>

        <div class="tickets-grid">${gridHTML}</div>
      </div>
    `;
  }

  function renderVotingSection() {
    const grid = document.getElementById('voting-prizes-grid');
    if (!grid) return;

    const user = getCurrentUser();
    const sorted = [...state.prizeCandidates].sort((a, b) => (b.voters?.length || 0) - (a.voters?.length || 0));

    let totalVotes = 0;
    sorted.forEach(c => totalVotes += (c.voters?.length || 0));

    const kpiItems = document.getElementById('kpi-voting-items');
    const kpiVotes = document.getElementById('kpi-voting-total-votes');
    if (kpiItems) kpiItems.textContent = sorted.length;
    if (kpiVotes) kpiVotes.textContent = totalVotes;

    if (sorted.length === 0) {
      grid.innerHTML = `<div class="glass-panel" style="padding: 24px; grid-column: 1 / -1; text-align: center; color: var(--text-muted);">Aún no hay artículos publicados para votación.</div>`;
      return;
    }

    grid.innerHTML = sorted.map((cand, index) => {
      const votesCount = cand.voters?.length || 0;
      const hasVoted = user && cand.voters?.includes(user.id);
      const isLeader = index === 0 && votesCount > 0;
      const isUrl = cand.icon && (cand.icon.startsWith('http://') || cand.icon.startsWith('https://'));

      const mediaHTML = isUrl
        ? `<img src="${escapeHTML(cand.icon)}" alt="${escapeHTML(cand.title)}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px; margin-bottom: 12px;">`
        : `<div style="font-size: 3.2rem; text-align: center; padding: 18px 0; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 12px;">${escapeHTML(cand.icon || '🎁')}</div>`;

      return `
        <div class="glass-panel" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; position: relative; ${isLeader ? 'border: 1px solid #facc15; box-shadow: 0 0 20px rgba(250, 204, 21, 0.25);' : ''}">
          ${isLeader ? `<span style="position: absolute; top: -11px; right: 14px; background: #facc15; color: #050a18; font-weight: 800; font-size: 0.7rem; padding: 3px 10px; border-radius: 20px; font-family: 'Orbitron', sans-serif;">🏆 #1 MÁS VOTADO (PRÓXIMA RIFA)</span>` : ''}
          <div>
            ${mediaHTML}
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
              <h3 style="font-size: 1.05rem; margin: 0;">${escapeHTML(cand.title)}</h3>
              <span class="badge-status status-paid" style="white-space: nowrap;">⭐ ${votesCount} pts</span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">${escapeHTML(cand.description)}</p>
          </div>
          <button class="${hasVoted ? 'btn-cyber-outline' : 'btn-cyber-primary'} w-100" onclick="app.toggleVotePrize('${cand.id}')">
            ${hasVoted ? '✔ Votado (Quitar voto)' : '🔥 Votar por este Premio'}
          </button>
        </div>
      `;
    }).join('');
  }

  function renderHistory() {
    const tbody = document.getElementById('global-history-tbody');
    const subtitle = document.getElementById('history-subtitle');
    if (!tbody) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let filteredList = state.history;

    if (historyFilterMode === 'current_month') {
      if (subtitle) subtitle.textContent = 'Mostrando las últimas rifas finalizadas en el mes actual.';
      filteredList = state.history.filter(h => {
        if (h.finishedTimestamp) {
          const d = new Date(h.finishedTimestamp);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }
        return true;
      });
    } else if (historyFilterMode === 'specific_date') {
      if (subtitle) subtitle.textContent = `Mostrando resultados para la fecha: ${historySpecificDate}`;
      filteredList = state.history.filter(h => {
        if (h.isoDate) return h.isoDate === historySpecificDate;
        if (h.finishedTimestamp) {
          const d = new Date(h.finishedTimestamp);
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return iso === historySpecificDate;
        }
        return false;
      });
    } else {
      if (subtitle) subtitle.textContent = 'Mostrando el archivo histórico completo de todos los meses.';
    }

    tbody.innerHTML = filteredList.map(h => `
      <tr>
        <td><strong>${escapeHTML(h.title)}</strong></td>
        <td><span class="badge-status status-paid">#${h.winnerNumber}</span></td>
        <td>${escapeHTML(h.winnerName)}</td>
        <td><span class="badge-status status-paid">FINALIZADO</span></td>
        <td>${escapeHTML(h.finishedDate)}</td>
      </tr>
    `).join('') || `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No hay sorteos registrados para el criterio seleccionado.</td></tr>`;
  }

  function renderSellerPanel() {
    const user = getCurrentUser();
    if (!user || (user.role !== 'vendedor' && user.role !== 'admin')) return;

    const identifier = user.email.split('@')[0];
    const link = `${window.location.origin}${window.location.pathname}?ref=${identifier}`;
    const inputLink = document.getElementById('seller-ref-link-input');
    if (inputLink) inputLink.value = link;

    let soldCount = 0;
    let salesRows = '';
    let totalRevenueGenerated = 0;

    state.raffles.forEach(r => {
      Object.entries(r.tickets).forEach(([numStr, t]) => {
        if (t.status === 'paid' && t.referrer && t.referrer.toLowerCase() === identifier.toLowerCase()) {
          soldCount++;
          totalRevenueGenerated += r.price;
          salesRows += `
            <tr>
              <td><strong>${escapeHTML(r.title)}</strong></td>
              <td>#${numStr}</td>
              <td>${escapeHTML(t.userName)}</td>
              <td>$${r.price.toLocaleString('es-CO')} COP</td>
              <td><span class="text-emerald">+$${COMMISSION_PER_TICKET.toLocaleString('es-CO')} COP</span></td>
              <td>${escapeHTML(t.updatedAt)}</td>
            </tr>
          `;
        }
      });
    });

    const totalCommission = (user.commissionBalance || 0) + (soldCount * COMMISSION_PER_TICKET);

    document.getElementById('seller-stat-commission').textContent = `$${totalCommission.toLocaleString('es-CO')} COP`;
    document.getElementById('seller-stat-sold').textContent = soldCount;

    const revEl = document.getElementById('seller-stat-revenue');
    if (revEl) revEl.textContent = `$${totalRevenueGenerated.toLocaleString('es-CO')} COP`;

    document.getElementById('seller-sales-tbody').innerHTML = salesRows || `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Aún no tienes ventas acreditadas por referidos.</td></tr>`;
  }

  function renderCartModal() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-modal-total');
    if (!container || !totalEl) return;

    if (state.cart.length === 0) {
      container.innerHTML = `<p style="text-align:center; color:var(--text-muted);">Tu carrito está vacío.</p>`;
      totalEl.textContent = '$0 COP';
      return;
    }

    let total = 0;
    container.innerHTML = state.cart.map(item => {
      total += item.price;
      return `
        <div class="cart-item-row">
          <div>
            <strong>${escapeHTML(item.raffleTitle)}</strong>
            <div style="color:var(--primary); font-family:'Orbitron',sans-serif;">Número #${item.numStr} — $${item.price.toLocaleString('es-CO')} COP</div>
          </div>
          <button class="btn-xs btn-del" onclick="app.removeFromCart('${item.raffleId}', '${item.numStr}')">Quitar</button>
        </div>
      `;
    }).join('');

    totalEl.textContent = `$${total.toLocaleString('es-CO')} COP`;
  }

  function renderUserPanel() {
    const user = getCurrentUser();
    if (!user) return;
    let res = 0, paid = 0, won = 0, spent = 0, rows = '';

    state.raffles.forEach(r => {
      Object.entries(r.tickets).forEach(([numStr, t]) => {
        if (t.userId === user.id) {
          const isWon = r.winnerNumber === numStr;
          if (t.status === 'reserved') res++;
          if (t.status === 'paid') { paid++; spent += r.price; }
          if (isWon) won++;

          rows += `
            <tr>
              <td><strong>${escapeHTML(r.title)}</strong></td>
              <td>#${numStr}</td>
              <td>$${r.price.toLocaleString('es-CO')}</td>
              <td><span class="badge-status ${t.status === 'paid' ? 'status-paid' : 'status-reserved'}">${t.status.toUpperCase()}</span></td>
              <td>${isWon ? '🏆 ¡GANADOR!' : (r.winnerNumber ? `Ganó #${r.winnerNumber}` : 'En curso')}</td>
              <td>${escapeHTML(t.updatedAt)}</td>
            </tr>
          `;
        }
      });
    });

    document.getElementById('user-stat-reserved').textContent = res;
    document.getElementById('user-stat-paid').textContent = paid;
    document.getElementById('user-stat-won').textContent = won;
    document.getElementById('user-stat-spent').textContent = `$${spent.toLocaleString('es-CO')}`;
    document.getElementById('user-history-tbody').innerHTML = rows || `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Sin participaciones registradas.</td></tr>`;
  }

  function renderAdminPanel() {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') return;

    let revenue = 0, sold = 0, pending = 0, approvals = '';

    state.raffles.forEach(r => {
      Object.entries(r.tickets).forEach(([numStr, t]) => {
        if (t.status === 'paid') { sold++; revenue += r.price; }
        else if (t.status === 'reserved') {
          pending++;
          approvals += `
            <tr>
              <td>${escapeHTML(r.title)}</td>
              <td><strong>#${numStr}</strong></td>
              <td>${escapeHTML(t.userName)}</td>
              <td><span style="color:var(--primary);">${escapeHTML(t.referrer || 'Ninguno')}</span></td>
              <td>$${r.price.toLocaleString('es-CO')}</td>
              <td class="action-group">
                <button class="btn-xs btn-approve" onclick="app.approveTicketPayment('${r.id}', '${numStr}')">Aceptar</button>
                <button class="btn-xs btn-del" onclick="app.releaseTicketReservation('${r.id}', '${numStr}')">Liberar</button>
              </td>
            </tr>
          `;
        }
      });
    });

    document.getElementById('admin-stat-revenue').textContent = `$${revenue.toLocaleString('es-CO')}`;
    document.getElementById('admin-stat-sold').textContent = sold;
    document.getElementById('admin-stat-pending').textContent = pending;
    document.getElementById('admin-stat-users').textContent = state.users.length;

    document.getElementById('admin-raffles-tbody').innerHTML = state.raffles.map(r => `
      <tr>
        <td><strong>${escapeHTML(r.title)}</strong></td>
        <td>${r.isVip ? '⭐ VIP' : 'Estándar'}</td>
        <td>${r.totalNumbers}</td>
        <td>$${r.price.toLocaleString('es-CO')}</td>
        <td class="action-group">
          <button class="btn-xs btn-edit" onclick="app.openEditRaffleModal('${r.id}')">Editar</button>
          <button class="btn-xs btn-del" onclick="app.deleteRaffle('${r.id}')">Borrar</button>
        </td>
      </tr>
    `).join('');

    document.getElementById('admin-approvals-tbody').innerHTML = approvals || `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No hay reservas pendientes.</td></tr>`;

    document.getElementById('admin-users-tbody').innerHTML = state.users.map(u => `
      <tr>
        <td><strong>${escapeHTML(u.name)}</strong> ${u.mustResetPassword ? '<span class="badge-reset-pending">RESET PENDIENTE (1234)</span>' : ''}</td>
        <td>${escapeHTML(u.email)}</td>
        <td style="text-transform:capitalize;">${escapeHTML(u.gender)}</td>
        <td><span class="role-tag">${escapeHTML(u.role)}</span></td>
        <td><span class="badge-status ${u.status === 'activo' ? 'status-paid' : 'status-suspended'}">${u.status.toUpperCase()}</span></td>
        <td class="action-group">
          <button class="btn-xs btn-edit" onclick="app.openEditUserModal('${u.id}')">Editar</button>
          <button class="btn-xs btn-warn" onclick="app.adminResetUserPassword('${u.id}')" title="Restablecer contraseña a 1234">Reset 1234</button>
          ${u.role !== 'admin' ? `
            <button class="btn-xs btn-warn" onclick="app.toggleSuspendUser('${u.id}')">${u.status === 'activo' ? 'Suspender' : 'Activar'}</button>
            <button class="btn-xs btn-del" onclick="app.deleteUser('${u.id}')">Borrar</button>
          ` : ''}
        </td>
      </tr>
    `).join('');

    const adminPrizesTbody = document.getElementById('admin-prizes-tbody');
    if (adminPrizesTbody) {
      const sortedPrizes = [...state.prizeCandidates].sort((a, b) => (b.voters?.length || 0) - (a.voters?.length || 0));
      adminPrizesTbody.innerHTML = sortedPrizes.map((c, idx) => {
        const pts = c.voters?.length || 0;
        return `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td><strong>${escapeHTML(c.title)}</strong><br><small style="color:var(--text-muted);">${escapeHTML(c.description)}</small></td>
            <td><span class="badge-status status-paid">⭐ ${pts} votos</span></td>
            <td class="action-group">
              <button class="btn-xs btn-approve" onclick="app.launchRaffleFromCandidate('${c.id}')" title="Usar como premio en nueva rifa">Lanzar Rifa</button>
              <button class="btn-xs btn-warn" onclick="app.resetPrizeVotes('${c.id}')">Reset 0</button>
              <button class="btn-xs btn-del" onclick="app.deletePrizeCandidate('${c.id}')">Borrar</button>
            </td>
          </tr>
        `;
      }).join('') || `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No hay artículos en votación.</td></tr>`;
    }
  }

  function renderAll() {
    renderHeader();
    renderVitrina();
    renderVotingSection();
    renderHistory();
    renderSellerPanel();
    renderUserPanel();
    renderAdminPanel();
    renderCartModal();
  }

  document.addEventListener('DOMContentLoaded', () => {
    startFaviconEffect();
    renderAll();
    checkTimersAndDraws();
  });

  return {
    navigate, openAuthModal, closeAuthModal, switchAuthMode, handleRegister, handleLogin, logout,
    selectRaffle, handleTicketClick, openCartModal, closeCartModal, removeFromCart, checkoutCartToWhatsApp,
    switchAdminTab, createRaffle, deleteRaffle, openEditRaffleModal, closeEditRaffleModal, saveEditedRaffle,
    approveTicketPayment, releaseTicketReservation, openEditUserModal, closeEditUserModal, saveEditedUser,
    toggleSuspendUser, deleteUser, copySellerLink, adminResetUserPassword, handleForcePasswordChange,
    filterHistoryByDate, resetHistoryFilter, showAllHistory,
    toggleVotePrize, createPrizeCandidate, deletePrizeCandidate, resetPrizeVotes, launchRaffleFromCandidate
  };
})();
