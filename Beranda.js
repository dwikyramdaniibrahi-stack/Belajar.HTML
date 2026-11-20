const pages = {
    dashboard: {
        title: 'Dashboard',
        subtitle: 'Ringkasan aktivitas kedai hari ini.'
    },
    menu: {
        title: 'Menu',
        subtitle: 'Lihat pilihan kopi, non-kopi, dan makanan.'
    },
    penjualan: {
        title: 'Penjualan',
        subtitle: 'Pantau pemasukan dan performa menu kedai.'
    },
    pesanan: {
        title: 'Pesanan',
        subtitle: 'Periksa daftar pesanan dan statusnya.'
    },
    aktivitas: {
        title: 'Aktivitas',
        subtitle: 'Lihat pembaruan terbaru dari kedai.'
    }
};

const pageTitle = document.querySelector('#pageTitle');
const pageSubtitle = document.querySelector('#pageSubtitle');
const pageViews = document.querySelectorAll('.page-view');
const pageLinks = document.querySelectorAll('[data-view]');
const adminOnlyElements = document.querySelectorAll('[data-admin-only]');
const profileUsernameElement = document.querySelector('[data-profile-username]');
const profileAvatarInitialsElement = document.querySelector('[data-profile-avatar-initials]');
const profileInitialsElement = document.querySelector('[data-profile-initials]');
const profileRoleElement = document.querySelector('[data-profile-role]');
const profileNoteElement = document.querySelector('[data-profile-note]');
let accountRole = null;
let customerUsernamesLoadStarted = false;

function renderAccountProfile(data) {
    const username = data.authenticated ? data.username.trim() : 'Tamu';
    const roleLabels = {
        admin: 'Admin',
        pelanggan: 'Pelanggan',
        tamu: 'Belum login'
    };
    const profileNotes = {
        admin: 'Akun ini memiliki akses untuk mengelola status pesanan.',
        pelanggan: 'Akun ini dapat melihat menu dan membuat pesanan.',
        tamu: 'Belum login. Pesanan tanpa akun dicatat sebagai pelanggan tamu.'
    };

    const initials = Array.from(username).slice(0, 2).join('').toUpperCase();
    profileUsernameElement.textContent = username;
    profileAvatarInitialsElement.textContent = initials;
    profileInitialsElement.textContent = initials;
    profileRoleElement.textContent = roleLabels[data.role];
    profileRoleElement.dataset.role = data.role;
    profileNoteElement.textContent = profileNotes[data.role];
}

function showProfileLoadError() {
    profileUsernameElement.textContent = 'Tidak dapat dimuat';
    profileAvatarInitialsElement.textContent = '?';
    profileInitialsElement.textContent = '?';
    profileRoleElement.textContent = 'Tidak diketahui';
    profileRoleElement.dataset.role = 'unknown';
    profileNoteElement.textContent = 'Informasi akun gagal dimuat. Muat ulang halaman untuk mencoba kembali.';
}

function updateRoleAccess() {
    adminOnlyElements.forEach((element) => {
        element.hidden = accountRole !== 'admin';
    });
}

function showPage(pageName) {
    const requestedPage = pages[pageName] ? pageName : 'dashboard';
    const page = accountRole === 'admin' ? requestedPage : 'menu';

    if (accountRole !== null && accountRole !== 'admin' && window.location.hash !== '#menu') {
        window.history.replaceState(null, '', '#menu');
    }

    pageViews.forEach((view) => {
        view.hidden = view.id !== `${page}-view`;
    });

    pageLinks.forEach((link) => {
        const isCurrentPage = link.dataset.view === page;
        link.classList.toggle('active', isCurrentPage && link.classList.contains('side-link'));

        if (link.classList.contains('side-link')) {
            if (isCurrentPage) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        }
    });

    pageTitle.textContent = pages[page].title;
    pageSubtitle.textContent = pages[page].subtitle;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showPageFromHash() {
    showPage(window.location.hash.slice(1) || 'dashboard');
}

window.addEventListener('hashchange', showPageFromHash);
showPage('menu');

async function loadCustomerUsernames() {
    const response = await fetch('pelanggan.php', {
        headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`Permintaan username gagal (${response.status}).`);
    }

    const data = await response.json();
    if (!Array.isArray(data.customers)) {
        throw new Error('Format data username dari server tidak sesuai.');
    }

    const customerNames = document.querySelectorAll('[data-customer-name]');
    const customerAvatars = document.querySelectorAll('[data-customer-avatar]');
    const activityCustomer = document.querySelector('[data-activity-customer]');

    customerNames.forEach((nameElement, index) => {
        const username = data.customers[index];
        const avatar = customerAvatars[index];

        if (typeof username !== 'string' || username.trim() === '') {
            nameElement.textContent = 'Belum ada akun';
            if (avatar) {
                avatar.hidden = true;
            }
            return;
        }

        nameElement.textContent = username;
        if (avatar) {
            avatar.textContent = username.trim().slice(0, 2).toUpperCase();
        }
    });

    if (activityCustomer) {
        activityCustomer.textContent = data.customers[0] || 'Belum ada akun terdaftar';
    }
}

function handleCustomerUsernamesError(error) {
    console.error('Gagal memuat username pelanggan:', error);
    document.querySelectorAll('[data-customer-name]').forEach((nameElement) => {
        nameElement.textContent = 'Gagal memuat';
    });
    const activityCustomer = document.querySelector('[data-activity-customer]');
    if (activityCustomer) {
        activityCustomer.textContent = 'Gagal memuat';
    }
}

const menuView = document.querySelector('#menu-view');
const cartItemsElement = document.querySelector('[data-cart-items]');
const cartEmptyElement = document.querySelector('[data-cart-empty]');
const cartSummaryElement = document.querySelector('[data-cart-summary]');
const cartCountElement = document.querySelector('[data-cart-count]');
const cartTotalElement = document.querySelector('[data-cart-total]');
const placeOrderButton = document.querySelector('[data-place-order]');
const orderFeedback = document.querySelector('[data-order-feedback]');
const recentOrderActivities = document.querySelector('[data-order-activities]');
const ordersTableBody = document.querySelector('[data-orders-table]');
const ordersCountElement = document.querySelector('[data-orders-count]');
const ordersSummaryElement = document.querySelector('[data-orders-summary]');
const orderStatusFeedback = document.querySelector('[data-order-status-feedback]');
const guestNameField = document.querySelector('[data-guest-name-field]');
const guestNameInput = document.querySelector('[data-guest-name]');
const orderNameInput = document.querySelector('[data-order-name]');
const cart = new Map();
const menuCatalog = new Map(
    Array.from(document.querySelectorAll('.menu-item[data-menu-id]'), (menuElement) => [
        menuElement.dataset.menuId,
        {
            id: menuElement.dataset.menuId,
            name: menuElement.querySelector('.menu-item-name').textContent.trim(),
            price: Number(menuElement.dataset.price)
        }
    ])
);
const cartDraftKey = 'dwiky-order-cart';
const availableOrderStatuses = ['Diproses', 'Selesai', 'Dibatalkan'];
let csrfToken = '';
let sessionChecked = false;
let authenticationRequired = false;
let isAuthenticated = false;
let canManageOrders = false;
let loadedOrders = [];
let isSubmittingOrder = false;

function formatPrice(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(amount);
}

function createQuantityButton(label, action, menuId, disabled) {
    const button = document.createElement('button');
    button.className = 'cart-quantity-button';
    button.type = 'button';
    button.textContent = label;
    button.dataset.cartAction = action;
    button.dataset.menuId = menuId;
    button.setAttribute('aria-label', `${action === 'increase' ? 'Tambah' : 'Kurangi'} jumlah ${cart.get(menuId).name}`);
    button.disabled = disabled;
    return button;
}

function renderCart() {
    if (!cartItemsElement || !cartEmptyElement || !cartSummaryElement) {
        return;
    }

    cartItemsElement.replaceChildren();
    let itemCount = 0;
    let total = 0;

    cart.forEach((item) => {
        itemCount += item.quantity;
        total += item.price * item.quantity;

        const row = document.createElement('li');
        const details = document.createElement('div');
        details.className = 'cart-item-details';
        const name = document.createElement('strong');
        name.textContent = item.name;
        const subtotal = document.createElement('span');
        subtotal.textContent = `${formatPrice(item.price)} per item`;
        details.append(name, subtotal);

        const controls = document.createElement('div');
        controls.className = 'cart-item-controls';
        controls.append(
            createQuantityButton('−', 'decrease', item.id, false)
        );
        const quantity = document.createElement('span');
        quantity.textContent = String(item.quantity);
        quantity.setAttribute('aria-label', `Jumlah ${item.name}`);
        controls.append(quantity);
        controls.append(
            createQuantityButton('+', 'increase', item.id, item.quantity >= 99)
        );
        const itemTotal = document.createElement('strong');
        itemTotal.textContent = formatPrice(item.price * item.quantity);
        controls.append(itemTotal);

        row.append(details, controls);
        cartItemsElement.append(row);
    });

    cartCountElement.textContent = `${itemCount} item`;
    cartTotalElement.textContent = formatPrice(total);
    cartEmptyElement.hidden = cart.size > 0;
    cartItemsElement.hidden = cart.size === 0;
    cartSummaryElement.hidden = cart.size === 0;
    placeOrderButton.disabled = cart.size === 0 || !sessionChecked || isSubmittingOrder;
}

function formatOrderTime(value) {
    const date = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) {
        return 'Waktu tidak tersedia';
    }

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date);
}

function renderRecentOrders(orders) {
    if (!recentOrderActivities) {
        return;
    }

    recentOrderActivities.replaceChildren();
    if (orders.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'activity-empty';
        emptyMessage.textContent = 'Belum ada pesanan baru dari menu.';
        recentOrderActivities.append(emptyMessage);
        return;
    }

    orders.forEach((order) => {
        const activity = document.createElement('div');
        activity.className = 'activity-item order-activity';
        const icon = document.createElement('span');
        icon.className = 'activity-icon icon-order';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '✓';

        const details = document.createElement('div');
        const title = document.createElement('strong');
        const orderCode = `#DW-${String(order.id).padStart(6, '0')}`;
        const orderName = typeof order.nama_pesanan === 'string' ? order.nama_pesanan.trim() : '';
        title.textContent = orderName ? `${orderName} · ${orderCode}` : `Pesanan baru ${orderCode}`;
        const description = document.createElement('p');
        const menuSummary = typeof order.ringkasan_menu === 'string' && order.ringkasan_menu
            ? order.ringkasan_menu
            : 'Rincian menu tidak tersedia';
        description.textContent = `${order.username}: ${menuSummary} · ${formatPrice(Number(order.total))} · ${order.status}`;
        details.append(title, description);

        const time = document.createElement('time');
        time.textContent = formatOrderTime(order.dibuat_pada);
        activity.append(icon, details, time);
        recentOrderActivities.append(activity);
    });
}

function renderOrdersTable(orders, { canManage = false, emptyMessage = 'Belum ada pesanan yang tersimpan.' } = {}) {
    if (!ordersTableBody || !ordersCountElement || !ordersSummaryElement) {
        return;
    }

    ordersTableBody.replaceChildren();
    ordersCountElement.textContent = `${orders.length} pesanan`;
    ordersSummaryElement.textContent = orders.length
        ? `Menampilkan ${orders.length} pesanan terbaru.`
        : emptyMessage;

    if (orders.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.className = 'orders-empty';
        cell.colSpan = 6;
        cell.textContent = emptyMessage;
        row.append(cell);
        ordersTableBody.append(row);
        return;
    }

    const statusClasses = {
        Diproses: 'status-making',
        Selesai: 'status-done',
        Dibatalkan: 'status-cancel'
    };

    orders.forEach((order) => {
        const row = document.createElement('tr');
        const orderCell = document.createElement('td');
        orderCell.className = 'order-reference';
        const orderTitle = document.createElement('strong');
        const orderName = typeof order.nama_pesanan === 'string' ? order.nama_pesanan.trim() : '';
        orderTitle.textContent = orderName || 'Pesanan menu';
        const orderCode = document.createElement('span');
        orderCode.textContent = `#DW-${String(order.id).padStart(6, '0')}`;
        orderCell.append(orderTitle, orderCode);

        const customerCell = document.createElement('td');
        const customerName = typeof order.username === 'string' && order.username.trim()
            ? order.username.trim()
            : 'Pelanggan';
        const avatar = document.createElement('span');
        avatar.className = 'customer-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = customerName.slice(0, 2).toUpperCase();
        customerCell.append(avatar, document.createTextNode(customerName));

        const menuCell = document.createElement('td');
        menuCell.className = 'order-menu';
        const menuSummary = typeof order.ringkasan_menu === 'string' && order.ringkasan_menu
            ? order.ringkasan_menu
            : 'Rincian menu tidak tersedia';
        menuCell.textContent = menuSummary;
        menuCell.title = menuSummary;

        const timeCell = document.createElement('td');
        timeCell.textContent = formatOrderTime(order.dibuat_pada);

        const totalCell = document.createElement('td');
        totalCell.textContent = formatPrice(Number(order.total));

        const statusCell = document.createElement('td');
        statusCell.className = 'status-cell';
        const status = document.createElement('span');
        status.className = `status ${statusClasses[order.status] || ''}`.trim();
        status.textContent = typeof order.status === 'string' ? order.status : 'Tidak diketahui';
        statusCell.append(status);

        if (canManage && availableOrderStatuses.includes(order.status)) {
            const statusControl = document.createElement('select');
            statusControl.className = 'status-control';
            statusControl.dataset.orderStatus = '';
            statusControl.dataset.orderId = String(order.id);
            statusControl.dataset.previousStatus = order.status;
            statusControl.setAttribute('aria-label', `Ubah status pesanan ${orderCode.textContent}`);
            availableOrderStatuses.forEach((value) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                option.selected = value === order.status;
                statusControl.append(option);
            });
            statusCell.append(statusControl);
        }

        row.append(orderCell, customerCell, menuCell, timeCell, totalCell, statusCell);
        ordersTableBody.append(row);
    });
}

function setOrderStatusFeedback(message) {
    if (orderStatusFeedback) {
        orderStatusFeedback.textContent = message;
    }
}

ordersTableBody?.addEventListener('change', async (event) => {
    const control = event.target;
    if (!(control instanceof HTMLSelectElement) || !control.hasAttribute('data-order-status')) {
        return;
    }

    const orderId = Number(control.dataset.orderId);
    const newStatus = control.value;
    const previousStatus = control.dataset.previousStatus;
    if (
        !canManageOrders
        || !Number.isSafeInteger(orderId)
        || orderId < 1
        || !availableOrderStatuses.includes(newStatus)
    ) {
        control.value = previousStatus;
        setOrderStatusFeedback('Pilihan status pesanan tidak valid.');
        return;
    }

    control.disabled = true;
    setOrderStatusFeedback('Menyimpan perubahan status...');

    try {
        const response = await fetch('pesanan.php', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                csrf_token: csrfToken,
                action: 'update_status',
                order_id: orderId,
                status: newStatus
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Status pesanan gagal diperbarui (${response.status}).`);
        }
        if (
            !data.order
            || Number(data.order.id) !== orderId
            || data.order.status !== newStatus
        ) {
            throw new Error('Respons perubahan status pesanan tidak sesuai.');
        }

        const order = loadedOrders.find((item) => Number(item.id) === orderId);
        if (!order) {
            throw new Error('Pesanan yang diubah tidak ditemukan pada daftar terbaru.');
        }

        order.status = newStatus;
        renderRecentOrders(loadedOrders);
        renderOrdersTable(loadedOrders, { canManage: canManageOrders });
        const orderReference = control.getAttribute('aria-label').replace('Ubah status pesanan ', '');
        setOrderStatusFeedback(`Status pesanan ${orderReference} diubah menjadi ${newStatus}.`);
    } catch (error) {
        console.error('Gagal memperbarui status pesanan:', error);
        control.value = previousStatus;
        control.disabled = false;
        setOrderStatusFeedback(error.message || 'Status pesanan gagal diperbarui. Silakan coba lagi.');
    }
});

async function loadRecentOrders() {
    const response = await fetch('pesanan.php', {
        headers: { Accept: 'application/json' }
    });
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error || `Pesanan gagal dimuat (${response.status}).`);
        error.status = response.status;
        throw error;
    }
    if (
        !Array.isArray(data.orders)
        || typeof data.csrf_token !== 'string'
        || typeof data.authenticated !== 'boolean'
        || typeof data.can_manage_orders !== 'boolean'
        || !['admin', 'pelanggan', 'tamu'].includes(data.role)
        || (data.authenticated && (typeof data.username !== 'string' || data.username.trim() === ''))
        || (data.authenticated && data.role === 'tamu')
        || (!data.authenticated && data.role !== 'tamu')
        || (data.can_manage_orders !== (data.role === 'admin'))
    ) {
        throw new Error('Data aktivitas pesanan dari server tidak sesuai.');
    }

    csrfToken = data.csrf_token;
    sessionChecked = true;
    authenticationRequired = false;
    isAuthenticated = data.authenticated;
    canManageOrders = data.can_manage_orders;
    accountRole = data.role;
    loadedOrders = data.orders;
    renderAccountProfile(data);
    updateRoleAccess();
    showPageFromHash();
    guestNameField.hidden = isAuthenticated;
    guestNameInput.required = false;
    renderRecentOrders(loadedOrders);
    renderOrdersTable(loadedOrders, { canManage: canManageOrders });
    renderCart();

    if (canManageOrders && !customerUsernamesLoadStarted) {
        customerUsernamesLoadStarted = true;
        loadCustomerUsernames().catch(handleCustomerUsernamesError);
    }
}

function setOrderFeedback(message, linkType) {
    if (!orderFeedback) {
        return;
    }

    orderFeedback.replaceChildren(document.createTextNode(message));
    if (linkType === 'activity') {
        const link = document.createElement('a');
        link.href = '#aktivitas';
        link.dataset.view = 'aktivitas';
        link.textContent = 'Lihat aktivitas terbaru';
        orderFeedback.append(link);
    } else if (linkType === 'login') {
        const link = document.createElement('a');
        link.href = 'Belajar2.HTML?login=required';
        link.textContent = 'Masuk untuk melanjutkan';
        orderFeedback.append(link);
    }
}

function saveCartDraft() {
    try {
        if (cart.size === 0) {
            sessionStorage.removeItem(cartDraftKey);
            return;
        }

        sessionStorage.setItem(
            cartDraftKey,
            JSON.stringify(Array.from(cart.values(), (item) => ({
                id: item.id,
                quantity: item.quantity
            })))
        );
    } catch (error) {
        console.error('Gagal menyimpan keranjang sementara:', error);
        setOrderFeedback('Keranjang tidak dapat disimpan di browser ini. Pesanan belum dikirim.');
    }
}

function restoreCartDraft() {
    let savedDraft;
    try {
        savedDraft = sessionStorage.getItem(cartDraftKey);
    } catch (error) {
        console.error('Gagal membaca keranjang sementara:', error);
        setOrderFeedback('Keranjang sebelumnya tidak dapat dipulihkan dari browser ini.');
        return;
    }

    if (!savedDraft) {
        return;
    }

    try {
        const items = JSON.parse(savedDraft);
        if (!Array.isArray(items)) {
            throw new Error('Format keranjang sementara tidak valid.');
        }

        items.forEach((item) => {
            const menuItem = menuCatalog.get(item.id);
            if (
                !menuItem
                || !Number.isInteger(item.quantity)
                || item.quantity < 1
                || item.quantity > 99
            ) {
                return;
            }

            cart.set(menuItem.id, { ...menuItem, quantity: item.quantity });
        });
    } catch (error) {
        console.error('Keranjang sementara tidak dapat dipulihkan:', error);
        sessionStorage.removeItem(cartDraftKey);
        setOrderFeedback('Keranjang sebelumnya rusak dan sudah dikosongkan. Silakan pilih menu lagi.');
    }
}

menuView?.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) {
        return;
    }

    if (button.hasAttribute('data-add-menu')) {
        const menuElement = button.closest('.menu-item');
        const menuItem = menuElement && menuCatalog.get(menuElement.dataset.menuId);
        if (!menuItem) {
            return;
        }

        const currentItem = cart.get(menuItem.id);
        if (currentItem && currentItem.quantity >= 99) {
            setOrderFeedback('Maksimal 99 item untuk setiap menu.');
            return;
        }

        cart.set(menuItem.id, {
            ...menuItem,
            quantity: currentItem ? currentItem.quantity + 1 : 1
        });
        saveCartDraft();
        setOrderFeedback(`${menuItem.name} ditambahkan ke keranjang.`);
        renderCart();
        return;
    }

    if (button.hasAttribute('data-cart-action')) {
        const item = cart.get(button.dataset.menuId);
        if (!item) {
            return;
        }

        const quantity = button.dataset.cartAction === 'increase'
            ? Math.min(item.quantity + 1, 99)
            : item.quantity - 1;
        if (quantity < 1) {
            cart.delete(item.id);
        } else {
            cart.set(item.id, { ...item, quantity });
        }
        saveCartDraft();
        renderCart();
    }
});

placeOrderButton?.addEventListener('click', async () => {
    if (cart.size === 0 || isSubmittingOrder) {
        return;
    }

    const customerName = guestNameInput.value.trim();
    const orderName = orderNameInput.value.trim();

    if (!csrfToken) {
        if (authenticationRequired) {
            saveCartDraft();
            window.location.href = 'Belajar2.HTML?login=required';
        } else {
            setOrderFeedback('Sesi belum siap. Muat ulang halaman lalu coba lagi.');
        }
        return;
    }

    isSubmittingOrder = true;
    renderCart();
    setOrderFeedback('Menyimpan pesanan...');

    try {
        const response = await fetch('pesanan.php', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                csrf_token: csrfToken,
                customer_name: isAuthenticated ? undefined : customerName || 'Pelanggan',
                order_name: orderName || null,
                items: Array.from(cart.values(), (item) => ({
                    menu_id: item.id,
                    jumlah: item.quantity
                }))
            })
        });
        const data = await response.json();
        if (!response.ok) {
            const error = new Error(data.error || `Pesanan gagal disimpan (${response.status}).`);
            error.status = response.status;
            throw error;
        }

        const order = data.order;
        cart.clear();
        orderNameInput.value = '';
        saveCartDraft();
        const successMessage = `Pesanan #${order.code} berhasil dicatat dengan total ${formatPrice(Number(order.total))}.`;
        try {
            await loadRecentOrders();
            setOrderFeedback(successMessage, canManageOrders ? 'activity' : null);
        } catch (refreshError) {
            console.error('Pesanan tersimpan, tetapi aktivitas gagal dimuat ulang:', refreshError);
            setOrderFeedback(`${successMessage} Aktivitas belum dapat dimuat ulang.`, 'activity');
        }
    } catch (error) {
        console.error('Gagal menyimpan pesanan:', error);
        if (error.status === 401) {
            authenticationRequired = true;
            saveCartDraft();
            setOrderFeedback('Sesi login berakhir. Masuk kembali untuk melanjutkan pesanan.', 'login');
        } else {
            setOrderFeedback(error.message || 'Pesanan gagal disimpan. Silakan coba lagi.');
        }
    } finally {
        isSubmittingOrder = false;
        renderCart();
    }
});

restoreCartDraft();
renderCart();
loadRecentOrders().catch((error) => {
    console.error('Gagal memuat pesanan terbaru:', error);
    sessionChecked = true;
    authenticationRequired = error.status === 401;
    canManageOrders = false;
    accountRole = 'unknown';
    loadedOrders = [];
    showProfileLoadError();
    updateRoleAccess();
    showPage('menu');
    renderRecentOrders([]);
    renderOrdersTable([], {
        emptyMessage: 'Daftar pesanan belum dapat dimuat. Muat ulang halaman untuk mencoba kembali.'
    });
    renderCart();
    if (error.status === 401) {
        setOrderFeedback('Masuk terlebih dahulu untuk menyimpan pesanan.', 'login');
    } else {
        setOrderFeedback(error.message || 'Pesanan belum dapat dimuat.');
    }
});
