
document.querySelector('#registerForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent default form submission

    // Reset error messages, hide loading icons, and remove green border
    document.querySelectorAll('.error').forEach(error => error.textContent = '');
    document.querySelectorAll('.fa-spinner').forEach(spinner => spinner.classList.add('hidden'));
    document.querySelectorAll('.valid-input').forEach(input => input.classList.remove('valid-input'));

    const data = Object.fromEntries(new FormData(this));

    // Define regular expressions and error messages
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    const mobileRegex = /^\d{10}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const errorMessages = {
        name: "Please enter a valid name.",
        email: "Invalid email. Please enter a valid email address.  for Eg:example@gmail.com",
        mobile: "Invalid mobile number. Please enter a 10-digit number.",
        password: "Invalid password. It should be at least 8 characters long and include at least one uppercase letter(A), one lowercase letter(a), one number(1), and one special character(!).",
        confirmPassword: "Passwords do not match."
    };

    // Array to store validation errors
    const errors = [];

    // Validate each field and add valid-input class to valid fields
    if (!data.name.trim()) {
        errors.push("name");
    } else {
        document.getElementById('name').classList.add('valid-input');
    }
    if (!emailRegex.test(data.email.trim())) {
        errors.push("email");
    } else {
        document.getElementById('email').classList.add('valid-input');
    }
    if (!mobileRegex.test(data.mobile.trim())) {
        errors.push("mobile");
    } else {
        document.getElementById('mobile').classList.add('valid-input');
    }
    if (!passwordRegex.test(data.password.trim())) {
        errors.push("password");
    } else {
        document.getElementById('password').classList.add('valid-input');
    }
    if (data.password !== data.confirmPassword.trim()) {
        errors.push("confirmPassword");
    } else {
        document.getElementById('confirmPassword').classList.add('valid-input');
    }

    // Display error messages
    errors.forEach(field => {
        document.getElementById(`${field}Error`).textContent = errorMessages[field];
        document.getElementById(`${field}Loading`).classList.remove('hidden');
    });

    if (errors.length > 0) {
        return false;
    }

    // Post form data
    axios.post('/register', data)
        .then(res => {
            if (res.data.status) {
                // Display success toast
                const Toast = Swal.mixin({
                    toast: true,
                    position: "center",
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.onmouseenter = Swal.stopTimer;
                        toast.onmouseleave = Swal.resumeTimer;
                    }
                });
                Toast.fire({
                    icon: "success",
                    title: "Please verify OTP"
                });
                setTimeout(() => {
                    location.href = res.data.url;
                }, 3000);
            }
        })
        .catch(err => {
            if (!err.response.data.success) {
                const Toast = Swal.mixin({
                    toast: true,
                    position: "center",
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.onmouseenter = Swal.stopTimer;
                        toast.onmouseleave = Swal.resumeTimer;
                    }
                });
                Toast.fire({
                    icon: "error",
                    text: err.response.data.message,
                });

            }
        });
});

document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', function () {
        const fieldName = this.name;
        const errorMessageElement = document.getElementById(`${fieldName}Error`);

        // Clear existing error message
        errorMessageElement.textContent = '';

        // Check validation based on field name
        switch (fieldName) {
            case 'name':
                if (!this.value.trim()) {
                    errorMessageElement.textContent = errorMessages.name;
                }
                break;
            case 'email':
                if (!emailRegex.test(this.value.trim())) {
                    errorMessageElement.textContent = errorMessages.email;
                }
                break;
            case 'mobile':
                if (!mobileRegex.test(this.value.trim())) {
                    errorMessageElement.textContent = errorMessages.mobile;
                }
                break;
            case 'password':
                if (!passwordRegex.test(this.value.trim())) {
                    errorMessageElement.textContent = errorMessages.password;
                }
                break;
            case 'confirmPassword':
                const passwordInput = document.querySelector('input[name="password"]');
                if (this.value.trim() !== passwordInput.value.trim()) {
                    errorMessageElement.textContent = errorMessages.confirmPassword;
                }
                break;
            default:
                break;
        }
    });
});


// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
        const passwordInput = this.previousElementSibling; // Assuming the input is always the previous element sibling
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        this.classList.toggle('fa-eye-slash');
    });
});




