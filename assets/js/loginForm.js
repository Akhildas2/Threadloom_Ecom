document.getElementById('loginForm').addEventListener('submit', function (event) {
    document.querySelectorAll('.fa-spinner').forEach(spinner => spinner.classList.add('hidden'));
    event.preventDefault();
    const data = {};
    const errors = [];
    // Serialize form data
    $('#loginForm').serializeArray().forEach(each => {
        data[each.name] = each.value.trim();
    });

    const email = data.email;
    const password = data.password;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    if (!emailRegex.test(email)) {
        errors.push("Invalid email. Please enter a valid email address. eg:example@gmail.com");
        document.getElementById('emailError').innerText = errors[errors.length - 1]; // Set the last error message
    } else {
        document.getElementById('emailError').innerText = ""; // Clear email error message if email is valid
    }
    if (!password) {
        errors.push("Please enter a password.");
        document.getElementById('passwordError').innerText = errors[errors.length - 1]; // Set the last error message
    } else {
        document.getElementById('passwordError').innerText = ""; // Clear password error message if password is entered
    }

    if (errors.length > 0) {
        return false;
    }

    // Post form data
    axios.post('/login', data)
        .then(res => {
            if (res.data.status) {

                const Toast = Swal.mixin({
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.onmouseenter = Swal.stopTimer;
                        toast.onmouseleave = Swal.resumeTimer;
                    }
                });
                Toast.fire({
                    icon: "success",
                    title: "You Are Logged in Successfully"
                });

                setTimeout(() => {
                    location.href = res.data.url;
                }, 2000);
            } else {
                console.error(res.data);
            }
        })
        .catch(err => {
            if (!err.response.data.success) {
                const Toast = Swal.mixin({
                    toast: true,
                    position: "top-center",
                    showConfirmButton: false,
                    timer: 2000,
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
               
            } else {
                console.error(err);
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
