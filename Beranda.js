const pages = {
    dashboard: {
        title: 'Dashboard',
        subtitle: 'Ringkasan aktivitas kedai hari ini.'
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
