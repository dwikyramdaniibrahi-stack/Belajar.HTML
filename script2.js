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

document.querySelector('#loginOpen').addEventListener('click', () => {
    loginDialog.showModal();
});

document.querySelector('#loginClose').addEventListener('click', () => {
    loginDialog.close();
});

const loginStatus = new URLSearchParams(window.location.search).get('login');

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