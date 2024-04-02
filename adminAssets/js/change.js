// JavaScript for menu item click handling
document.addEventListener('DOMContentLoaded', function () {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            // Check if the clicked menu item is already active
            if (!item.classList.contains('active')) {
                // Remove 'active' class from all menu items
                menuItems.forEach(menuItem => {
                    menuItem.classList.remove('active');
                });
                // Add 'active' class to the clicked menu item
                item.classList.add('active');
            }
        });
    });
});
