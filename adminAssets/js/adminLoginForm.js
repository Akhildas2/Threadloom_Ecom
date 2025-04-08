document.getElementById('adminLogin').addEventListener('submit', function (event) {
    event.preventDefault();
    const data = {};
    const errors = [];
    $('#adminLogin').serializeArray().forEach(each => {
        data[each.name] = each.value.trim();
    });

    const email = data.email;
    const password = data.password;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    if (!emailRegex.test(email)) {
        errors.push("Invalid email. Please enter a valid email address. eg:example@gmail.com");
        $('#emailError').text(errors[errors.length - 1]); // Update error message for email
    } else {
        $('#emailError').text(""); // Clear error message for email if valid
    }
    if (!password) {
        errors.push("Please enter a password.");
        $('#passwordError').text(errors[errors.length - 1]); // Update error message for password
    } else {
        $('#passwordError').text(""); // Clear error message for password if entered
    }


    if (errors.length > 0) {
       
        return false;
    }

    // Post form data
    axios.post("/admin", data)
        .then(res => {

            if (res.data.status) {
                Swal.fire({
                    icon: "success",
                    title: "Admin Logged in Successfully",
                    showConfirmButton: false,
                    timer: 2000
                });
                setTimeout(() => {
                    location.href = res.data.url;
                }, 2000);
            } 
        })
        .catch(err => {
                Swal.fire({
                    icon: 'error',
                    title: 'Operation Failed',
                    text: err.response?.data?.message || "Something went wrong.",
                });
        });
});

function displayError(fieldId, errorMessage) {
    $('#' + fieldId).html(errorMessage).addClass('text-danger');
}

function clearError(fieldId) {
    $('#' + fieldId).empty().removeClass('text-danger');
}

