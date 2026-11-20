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

function showPage(pageName) {
    const page = pages[pageName] ? pageName : 'dashboard';

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
showPageFromHash();

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

loadCustomerUsernames().catch((error) => {
    console.error('Gagal memuat username pelanggan:', error);
    document.querySelectorAll('[data-customer-name]').forEach((nameElement) => {
        nameElement.textContent = 'Gagal memuat';
    });
    const activityCustomer = document.querySelector('[data-activity-customer]');
    if (activityCustomer) {
        activityCustomer.textContent = 'Gagal memuat';
    }
});

const menuView = document.querySelector('#menu-view');
const cartItemsElement = document.querySelector('[data-cart-items]');
const cartEmptyElement = document.querySelector('[data-cart-empty]');
const cartSummaryElement = document.querySelector('[data-cart-summary]');
const cartCountElement = document.querySelector('[data-cart-count]');
const cartTotalElement = document.querySelector('[data-cart-total]');
const placeOrderButton = document.querySelector('[data-place-order]');
const orderFeedback = document.querySelector('[data-order-feedback]');
const recentOrderActivities = document.querySelector('[data-order-activities]');
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
let csrfToken = '';
let sessionChecked = false;
let authenticationRequired = false;
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
        title.textContent = `Pesanan baru #DW-${String(order.id).padStart(6, '0')}`;
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
    if (!Array.isArray(data.orders) || typeof data.csrf_token !== 'string') {
        throw new Error('Data aktivitas pesanan dari server tidak sesuai.');
    }

    csrfToken = data.csrf_token;
    sessionChecked = true;
    authenticationRequired = false;
    renderRecentOrders(data.orders);
    renderCart();
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
        saveCartDraft();
        const successMessage = `Pesanan #${order.code} berhasil dicatat dengan total ${formatPrice(Number(order.total))}.`;
        try {
            await loadRecentOrders();
            setOrderFeedback(successMessage, 'activity');
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
    renderRecentOrders([]);
    renderCart();
    if (error.status === 401) {
        setOrderFeedback('Masuk terlebih dahulu untuk menyimpan pesanan.', 'login');
    } else {
        setOrderFeedback(error.message || 'Pesanan belum dapat dimuat.');
    }
});
