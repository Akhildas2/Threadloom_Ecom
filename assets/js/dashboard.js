document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('#profileForm').addEventListener('submit', function (event) {
        event.preventDefault();

        // Get form data
        let formData = new FormData(this);

        // Perform client-side validation
        const name = formData.get('name');
        const mobile = formData.get('mobile');
        let isValid = true;

        // Validate name
        if (!name.trim()) {
            isValid = false;
            document.getElementById('name-error').innerText = 'Name is required';
        } else {
            document.getElementById('name-error').innerText = '';
        }

        // Validate mobile number
        if (!mobile.trim()) {
            isValid = false;
            document.getElementById('mobile-error').innerText = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(mobile.trim())) {
            isValid = false;
            document.getElementById('mobile-error').innerText = 'Mobile number must be 10 digits';
        } else {
            document.getElementById('mobile-error').innerText = '';
        }

        if (!isValid) {
            return false;
        }
        const userId = this.getAttribute('data-user-id');

        axios.put(`/dashboard/${userId}`, Object.fromEntries(formData))
            .then(response => {

                if (response.data.status) {
                    // Display success message
                    Swal.fire({
                        icon: "success",
                        title: "User details updated successfully!",
                        showConfirmButton: false,
                        timer: 2000
                    });

                    localStorage.setItem('activeTab', '#profile');
                    location.hash = '#profile';
                    location.reload();
                }
            })
            .catch(err => {
                if (err.response && !err.response.data.success) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: err.response.data.message,
                    });
                }
            });
    });



    document.querySelector("#changePasswordBtn").addEventListener('click', function (event) {
        event.preventDefault();
        let formData = new FormData(document.getElementById("changePasswordForm"));
        const oldPassword = formData.get('oldPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');
        let isValid = true;

        // Validation
        if (!oldPassword.trim()) {
            isValid = false;
            document.getElementById('oldPassword-error').innerText = 'Old password is required.';
        } else {
            document.getElementById('oldPassword-error').innerText = '';
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            isValid = false;
            document.getElementById('newPassword-error').innerText = 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.';
        } else {
            document.getElementById('newPassword-error').innerText = '';
        }

        if (newPassword !== confirmPassword) {
            isValid = false;
            document.getElementById('confirmPassword-error').innerText = 'Passwords do not match.';
        } else {
            document.getElementById('confirmPassword-error').innerText = '';
        }

        if (!isValid) {
            return;
        }
        const userId = document.querySelector('#profileForm').getAttribute('data-user-id');

        axios.put(`/dashboard/changePassword/${userId}`, Object.fromEntries(formData))
            .then(response => {
                if (response.data.status) {
                    Swal.fire({
                        icon: "success",
                        title: "Password updated successfully!",
                        showConfirmButton: false,
                        timer: 2000
                    });

                    localStorage.setItem('activeTab', '#profile');
                    location.hash = '#profile';
                    location.reload();
                }
            })
            .catch(err => {
                if (err.response && !err.response.data.success) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: err.response.data.message,
                    });
                }
            });
    });



    $(document).ready(function () {
        $('#addAddressForm').submit(function (event) {
            event.preventDefault();
            // Reset error messages
            $('.error').text('');

            // Validation
            const fullName = $('#fullName').val().trim();
            const mobileNumber = $('#mobileNumber').val().trim();
            const pincode = $('#pincode').val().trim();
            const houseNo = $('#houseNo').val().trim();
            const area = $('#area').val().trim();
            const city = $('#city').val().trim();
            const state = $('#state').val().trim();
            let isValid = true;

            if (fullName === '') {
                $('#fullNameError').text('Please enter your full name.');
                isValid = false;
            }
            if (mobileNumber === '' || !/^\d{10}$/.test(mobileNumber)) {
                $('#mobileNumberError').text('Please enter a valid 10-digit mobile number.');
                isValid = false;
            }
            if (pincode === '' || !/^\d{6}$/.test(pincode)) {
                $('#pincodeError').text('Please enter a valid 6-digit pincode.');
                isValid = false;
            }
            if (houseNo === '') {
                $('#houseNoError').text('Please enter your house number/name.');
                isValid = false;
            }
            if (area === '') {
                $('#areaError').text('Please enter your area/street/village.');
                isValid = false;
            }
            if (city === '') {
                $('#cityError').text('Please enter your city.');
                isValid = false;
            }
            if (state === '') {
                $('#stateError').text('Please enter your state.');
                isValid = false;
            }
            if (!isValid) {
                return;
            }
            const formData = new FormData(this);

            axios.post('/dashboard/addAddress', Object.fromEntries(formData))
                .then(response => {
                    if (response.data.status) {
                        Swal.fire({
                            icon: "success",
                            title: "Address add successfully!",
                            showConfirmButton: false,
                            timer: 2000
                        });

                        localStorage.setItem('activeTab', '#address');
                        location.hash = '#address';
                        location.reload();
                    }
                })
                .catch(err => {
                    if (err.response && !err.response.data.success) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: err.response.data.message,
                        });
                    }
                });
        });



        $('.edit-address-btn').click(function (event) {
            event.preventDefault();
            var addressId = $(this).data('address-id');
            $('.edit-address-modal[data-address-id="' + addressId + '"]').modal('show');
        });



        $('form[id^="editAddressForm-"]').submit(function (event) {
            event.preventDefault();
            var addressId = $(this).attr('id').split('-')[1];
            $('.modal-backdrop').remove();
            // Reset error messages
            $(this).find('.error').text('');

            // Validation
            const fullName = $(this).find('#editFullName').val().trim();
            const mobileNumber = $(this).find('#editMobileNumber').val().trim();
            const pincode = $(this).find('#editPincode').val().trim();
            const houseNo = $(this).find('#editHouseNo').val().trim();
            const area = $(this).find('#editArea').val().trim();
            const city = $(this).find('#editCity').val().trim();
            const state = $(this).find('#editState').val().trim();
            let isValid = true;

            if (fullName === '') {
                $(this).find('#editFullNameError').text('Please enter your full name.');
                isValid = false;
            }
            if (mobileNumber === '' || !/^\d{10}$/.test(mobileNumber)) {
                $(this).find('#editMobileNumberError').text('Please enter a valid 10-digit mobile number.');
                isValid = false;
            }
            if (pincode === '' || !/^\d{6}$/.test(pincode)) {
                $(this).find('#editPincodeError').text('Please enter a valid 6-digit pincode.');
                isValid = false;
            }
            if (houseNo === '') {
                $(this).find('#editHouseNoError').text('Please enter your house number/name.');
                isValid = false;
            }
            if (area === '') {
                $(this).find('#editAreaError').text('Please enter your area/street/village.');
                isValid = false;
            }
            if (city === '') {
                $(this).find('#editCityError').text('Please enter your city.');
                isValid = false;
            }
            if (state === '') {
                $(this).find('#editStateError').text('Please enter your state.');
                isValid = false;
            }
            if (!isValid) {
                return;
            }

            const formData = new FormData(this);
            axios.put('/dashboard/editAddress/' + addressId, Object.fromEntries(formData))
                .then(response => {

                    if (response.data.status) {
                        Swal.fire({
                            icon: "success",
                            title: "Address updated successfully!",
                            showConfirmButton: false,
                            timer: 2000
                        });

                        localStorage.setItem('activeTab', '#address');
                        location.hash = '#address';
                        location.reload();
                    }
                })
                .catch(err => {
                    if (err.response && !err.response.data.success) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: err.response.data.message,
                        });
                    }
                });
        });



        $('.delete-address-btn').click(function (event) {
            event.preventDefault();
            event.stopPropagation();
            var addressId = $(this).data('address-id');

            // Use SweetAlert for confirmation
            Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    // If confirmed, proceed with the deletion using Axios
                    axios.delete(`/dashboard/deleteAddress/${addressId}`)
                        .then(response => {
                            // Show success message
                            Swal.fire({
                                icon: "success",
                                title: "Your address has been deleted.",
                                showConfirmButton: false,
                                timer: 2000,
                            });

                            // Immediately remove the address from the DOM without waiting for page reload
                            $('#address-' + addressId).remove();

                            localStorage.setItem('activeTab', '#address');
                            location.hash = '#address';
                            location.reload();
                        })
                        .catch(error => {
                            Swal.fire(
                                'Error!',
                                'An error occurred while deleting the address.',
                                'error'
                            );
                        });
                }
            });
        });



    });



    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(function (toggle) {
        toggle.addEventListener('click', function () {
            const passwordInput = this.previousElementSibling;
            passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
            this.classList.toggle('fa-eye-slash');
        });
    });



    // Open the tab after successful operation
    if (window.location.hash) {
        var tabName = window.location.hash.substring(1); // Get the hash without #
        var tabElement = document.getElementById(tabName + "-tab");
        if (tabElement) {
            // Trigger the Bootstrap tab to open
            var tab = new bootstrap.Tab(tabElement);
            tab.show();
        }
    }

});



document.addEventListener("DOMContentLoaded", async function () {
    document.querySelectorAll(".stars").forEach(async (starsContainer) => {
        const productId = starsContainer.dataset.productId;
        const orderId = starsContainer.dataset.orderId;

        try {
            const response = await fetch(`/review/get-rating/${productId}/${orderId}`);
            const data = await response.json();

            if (response.ok && data.rating) {
                updateStars(starsContainer, data.rating);
            }
        } catch (error) {
            console.error("Error fetching rating:", error);
        }
    });
});



document.addEventListener("click", async function (event) {
    if (event.target.matches(".stars i")) {
        const star = event.target;
        const starsContainer = star.closest(".stars");
        const rating = star.dataset.rating;
        const productId = starsContainer.dataset.productId;
        const orderId = starsContainer.dataset.orderId;

        starsContainer.classList.add("disabled");

        try {
            const response = await fetch("/review/add-rating", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, orderId, rating })
            });

            if (response.ok) {
                updateStars(starsContainer, rating);
            }
        } catch (error) {
            console.error("Error submitting rating:", error);
        } finally {
            setTimeout(() => {
                starsContainer.classList.remove("disabled"); // Re-enable after request
            }, 1000);
        }
    }
});



function updateStars(starsContainer, rating) {
    starsContainer.querySelectorAll("i").forEach((s, index) => {
        s.classList.remove("fas", "text-warning", "far", "text-muted");

        if (index < rating) {
            s.classList.add("fas", "text-warning");
        } else {
            s.classList.add("far", "text-muted");
        }
    });

    const ratingValueElement = starsContainer.nextElementSibling.querySelector(".rating-value");
    ratingValueElement.textContent = rating;
}