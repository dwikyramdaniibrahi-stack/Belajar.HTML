// Toggle class active
const navbarNav = document.querySelector('.navbar-nav');
const menu = document.querySelector('#Menu');

menu.addEventListener('click', () => {
    navbarNav.classList.toggle('active');
});


const Menu = document.querySelector('#Menu');
document.addEventListener('click', function(e){
    if(!Menu.contains(e.target) && !navbarNav.contains(e.target)) {
        navbarNav.classList.remove('active');
    }

});

const loginDialog = document.querySelector('#loginDialog');
const loginMessage = document.querySelector('#loginMessage');
const loginForm = document.querySelector('#loginForm');
const registerForm = document.querySelector('#registerForm');
const registerMessage = document.querySelector('#registerMessage');
const provinceSelect = document.querySelector('#province');
const regionSelect = document.querySelector('#regionName');
let provincesLoaded = false;

document.querySelector('#loginOpen').addEventListener('click', () => {
    loginDialog.showModal();
});

document.querySelector('#loginClose').addEventListener('click', () => {
    loginDialog.close();
});

document.querySelector('#showRegister').addEventListener('click', () => {
    loginForm.hidden = true;
    registerForm.hidden = false;
    registerMessage.textContent = '';
    loadProvinces();
});

document.querySelector('#showLogin').addEventListener('click', () => {
    registerForm.hidden = true;
    loginForm.hidden = false;
    loginMessage.textContent = '';
});

async function loadProvinces() {
    if (provincesLoaded) {
        return;
    }

    provinceSelect.disabled = true;
    registerMessage.textContent = 'Memuat daftar provinsi...';

    try {
        const response = await fetch('Koneksi/wilayah.php?type=provinces');
        if (!response.ok) {
            throw new Error('Daftar provinsi tidak dapat dimuat.');
        }

        const { data: provinces } = await response.json();
        provinceSelect.replaceChildren(new Option('Pilih provinsi', ''));

        for (const province of provinces) {
            const option = new Option(province.name, province.name);
            option.dataset.code = province.code;
            provinceSelect.add(option);
        }

        provincesLoaded = true;
        registerMessage.textContent = '';
    } catch (error) {
        registerMessage.textContent = 'Daftar provinsi gagal dimuat. Periksa koneksi internet lalu coba lagi.';
    } finally {
        provinceSelect.disabled = false;
    }
}

provinceSelect.addEventListener('change', async () => {
    const provinceCode = provinceSelect.selectedOptions[0]?.dataset.code;
    regionSelect.disabled = true;
    regionSelect.replaceChildren(new Option('Memuat kabupaten/kota...', ''));
    registerMessage.textContent = '';

    if (!provinceCode) {
        regionSelect.replaceChildren(new Option('Pilih provinsi terlebih dahulu', ''));
        return;
    }

    try {
        const response = await fetch(`Koneksi/wilayah.php?type=regencies&province=${encodeURIComponent(provinceCode)}`);
        if (!response.ok) {
            throw new Error('Daftar kabupaten/kota tidak dapat dimuat.');
        }

        const { data: regions } = await response.json();
        regionSelect.replaceChildren(new Option('Pilih kabupaten/kota', ''));

        for (const region of regions) {
            regionSelect.add(new Option(region.name, region.name));
        }

        regionSelect.disabled = false;
    } catch (error) {
        regionSelect.replaceChildren(new Option('Gagal memuat kabupaten/kota', ''));
        registerMessage.textContent = 'Daftar kabupaten/kota gagal dimuat. Pilih ulang provinsi untuk mencoba lagi.';
    }
});

const loginStatus = new URLSearchParams(window.location.search).get('login');
const registerStatus = new URLSearchParams(window.location.search).get('register');

if (loginStatus === 'invalid') {
    loginMessage.textContent = 'Nama pengguna atau password salah. Silakan coba lagi.';
    loginDialog.showModal();
} else if (loginStatus === 'error') {
    loginMessage.textContent = 'Login belum dapat diproses. Periksa koneksi database atau hubungi pengelola.';
    loginDialog.showModal();
} else if (loginStatus === 'logout') {
    loginMessage.textContent = 'Anda sudah keluar. Silakan masuk dengan akun lain.';
    loginDialog.showModal();
}

if (registerStatus) {
    if (registerStatus !== 'success') {
        loginForm.hidden = true;
        registerForm.hidden = false;
        loadProvinces();
        registerMessage.textContent = registerStatus === 'exists'
            ? 'Nama pengguna sudah dipakai. Silakan pilih nama lain.'
            : registerStatus === 'invalid'
                ? 'Periksa kembali data pendaftaran Anda.'
                : 'Pendaftaran belum dapat diproses. Periksa koneksi database.';
    } else {
        loginMessage.textContent = 'Akun berhasil dibuat. Silakan masuk.';
    }
    loginDialog.showModal();
}