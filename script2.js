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
const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#loginMessage');

document.querySelector('#loginOpen').addEventListener('click', () => {
    loginDialog.showModal();
});

document.querySelector('#loginClose').addEventListener('click', () => {
    loginDialog.close();
});

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    loginMessage.textContent = 'Form berhasil dikirim (mode demo).';
    loginForm.reset();
});