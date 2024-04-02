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
    const emailRegex = /^[^\s@]+@gmail\.com$/i;
    if (!emailRegex.test(email)) {
        errors.push("Invalid email. Please enter a valid Gmail address. eg:example@gmail.com");
        document.getElementById('emailError').innerText = "Invalid email. Please enter a valid Gmail address. eg:example@gmail.com";
    } else {
        document.getElementById('emailError').innerText = ""; // Clear email error message if email is valid
    }
    if (!password) {
        errors.push("Please enter a password.");
        document.getElementById('passwordError').innerText = "Please enter a password."; 
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
                Swal.fire({
                    icon: "success",
                    title: "You Are Logged in Successfully",
                    showConfirmButton: false,
                    timer: 2000
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
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: err.response.data.message,
                });
            } else {
                console.error(err);
            }
        });
});
// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(function(toggle) {
    toggle.addEventListener('click', function() {
        const passwordInput = this.previousElementSibling; // Assuming the input is always the previous element sibling
        passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        this.classList.toggle('fa-eye-slash');
    });
});
