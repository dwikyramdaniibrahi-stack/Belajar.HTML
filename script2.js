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