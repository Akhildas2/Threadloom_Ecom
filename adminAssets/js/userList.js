
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
                    }
                })
                .catch(error => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Operation Failed',
                        text: error.response?.data?.message || "Something went wrong.",
                    });
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
                    } 
                })
                .catch(error => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Operation Failed',
                        text:  error.response?.data?.message || "Something went wrong.",
                    });
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
