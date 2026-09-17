const menuIcon = document.getElementById("menu-icon");
const menulist = document.getElementById("menu-list");

menuIcon.addEventListener("click", () => {
    menulist.classList.toggle("hidden");
});