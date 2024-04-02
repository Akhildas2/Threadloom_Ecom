

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const items = document.querySelectorAll('tbody tr'); // Target table rows

    searchInput.addEventListener('input', function () {
        const searchTerm = searchInput.value.toLowerCase().trim();

        items.forEach(item => {
            const itemContent = item.textContent.toLowerCase();

            // Use regular expression to perform a search on all content
            const regex = new RegExp(searchTerm, 'i');
            if (regex.test(itemContent)) {
                item.style.display = 'table-row'; // Show the row
            } else {
                item.style.display = 'none'; // Hide the row
            }
        });
    });
});




// Function to handle blocking user
const blockUser = (userId) => {
   
    Swal.fire({
        title: 'Are you sure?',
        text: 'Do you want to block this user?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, block it!',
        confirmButtonColor: '#FF0000', // Red color
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            axios.put(`/admin/block/${userId}`)
                .then(res => {

                    if (res.data && res.data.status) {
                        Swal.fire({
                            icon: 'success',
                            title: 'User Blocked',
                            text: 'The user has been blocked successfully!',
                            showConfirmButton: false,
                            timer: 2500
                        }).then(() => {
                            location.href = res.data.url;
                        });
                    } else {
                       
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: res.data.message
                        });
                    }
                })
                .catch(error => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'An internal server error occurred. Please try again later.',
                    });
                    console.error(error);
                });
        }
    });
};


// Function to handle unblocking user
const unblockUser = (userId) => {
    
    Swal.fire({
        title: 'Are you sure?',
        text: 'Do you want to unblock this user?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, unblock it!',
        confirmButtonColor: '#28a745', // Green color
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            axios.put(`/admin/unblock/${userId}`)
                .then(res => {
                   
                    // Check for 'status' property instead of 'success'
                    if (res.data && res.data.status) {
                        Swal.fire({
                            icon: 'success',
                            title: 'User Unblocked',
                            text: 'The user has been unblocked successfully!',
                            showConfirmButton: false,
                            timer: 2500
                        }).then(() => {
                            location.href = res.data.url;
                        });
                    } else {
                        
                        // Adjust the error message handling as needed
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: res.data ? 'An unexpected error occurred.' : 'An unexpected error occurred.',
                        });
                    }
                })
                .catch(error => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'An internal server error occurred. Please try again later.',
                    });
                    console.error('Request error:', error);
                });
        }
    });
};

// Add event listeners for block and unblock buttons
document.querySelectorAll('.block-btn').forEach(button => {
    button.addEventListener('click', () => {
        const userId = button.getAttribute('data-user-id');
       
        blockUser(userId);
    });
});

document.querySelectorAll('.unblock-btn').forEach(button => {
    button.addEventListener('click', () => {
        const userId = button.getAttribute('data-user-id');
        
        unblockUser(userId);
    });
});
