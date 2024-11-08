// Initialize OTP inputs
const inputs = document.querySelectorAll('input[type="text"]');
const timerDisplay = document.getElementById('timerDisplay');
const resendLinkContainer = document.getElementById('resendLinkContainer');
const form = document.getElementById('otpForm');
const timerDuration = 60;
let timerValue = parseInt(sessionStorage.getItem('timerValue')) || timerDuration;
let timerInterval;

// Function to display timer
function updateTimerDisplay() {
  const minutes = Math.floor(timerValue / 60);
  const seconds = timerValue % 60;
  timerDisplay.innerHTML = `<span style="color: red;">Resend OTP in </span><span>${minutes}:${seconds < 10 ? '0' : ''}${seconds}</span>`;
}

// Start the timer countdown
function startTimer() {
  clearInterval(timerInterval); // Clear any existing timer to avoid multiple intervals
  timerInterval = setInterval(() => {
    timerValue--;
    updateTimerDisplay();
    sessionStorage.setItem('timerValue', timerValue.toString());
    if (timerValue === 0) {
      clearInterval(timerInterval);
      sessionStorage.removeItem('isTimerStarted');
      resendLinkContainer.style.display = 'block';
      timerDisplay.innerText = '';
    }
  }, 1000);
}

// Check if the timer should start on the initial page load
if (!sessionStorage.getItem('isTimerStarted')) {
  sessionStorage.setItem('isTimerStarted', 'true');
  startTimer();
  updateTimerDisplay();
} else if (timerValue > 0) {
  // Restore the timer if it's running
  startTimer();
  updateTimerDisplay();
}

// Function to resend OTP
function resendOtp() {
  resendLinkContainer.style.display = 'none';
  timerValue = timerDuration;
  sessionStorage.setItem('timerValue', timerValue.toString());
  sessionStorage.setItem('isTimerStarted', 'true');
  startTimer();

  // Send the resend request to the server using Axios
  axios.post('/resendOtp')
    .then(res => {
      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "OTP has been sent to your email.",
          toast: true,
          position: 'center',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
        });
      }
    })
    .catch(err => {
      if (!err.response.data.success) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.response.data.message,
          toast: true,
          position: 'center',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      } else {
        console.error(err);
      }
    });
}


// OTP Input Navigation and Backspace Handling
inputs.forEach((input, index) => {
  input.addEventListener('input', (e) => {
    // Ensure only one digit is entered
    if (e.target.value.length > 1) {
      e.target.value = e.target.value.slice(0, 1);
    }
    // Move focus to the next input field if a digit is entered
    if (e.target.value.length === 1 && index < inputs.length - 1) {
      inputs[index + 1].focus();
    }

    // Clear the error message if a valid digit is entered
    const errorElement = document.getElementById(`otp${index + 1}Error`);
    if (/^\d$/.test(e.target.value)) {
      errorElement.textContent = '';
    }
  });

  input.addEventListener('keydown', (e) => {
    // Handle backspace to navigate to previous input field if empty
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      inputs[index - 1].focus();
    }
    // Prevent invalid characters like 'e'
    if (e.key === 'e') {
      e.preventDefault();
    }
  });
});

// Form Submission Handling
form.addEventListener('submit', function (event) {
  event.preventDefault();
  const data = {};

  // Collect OTP values
  $('#otpForm').serializeArray().forEach(each => {
    data[each.name] = each.value.trim();
  });

  // Validation for each OTP field
  let isValid = true;
  inputs.forEach((input, index) => {
    const value = input.value.trim();
    const errorElement = document.getElementById(`otp${index + 1}Error`);
    if (!value) {
      errorElement.textContent = `OTP in box ${index + 1} is required.`;
      isValid = false;
    } else if (!/^\d$/.test(value)) {
      errorElement.textContent = `Invalid OTP in box ${index + 1}. Enter a single digit.`;
      isValid = false;
    } else {
      errorElement.textContent = '';
    }
  });

  if (!isValid) return;

  // Submit using Axios
  axios.post('/verifyOtp', data)
    .then(res => {
      if (res.data.status) {
        Swal.fire({
          icon: "success",
          title: "Register Successful. Please login",
          toast: true,
          position: 'center',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
        setTimeout(() => {
          location.href = res.data.url;
        }, 2000);
      }
    })
    .catch(err => {
      if (!err.response.data.success) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.response.data.message,
          toast: true,
          position: 'center',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      } else {
        console.error(err);
      }
    });
});

document.querySelectorAll('input[type="text"]').forEach(input => {
  input.addEventListener('input', function () {
    if (this.value) {
      this.classList.remove('invalid');
      this.classList.add('valid');
    } else {
      this.classList.remove('valid');
      this.classList.add('invalid');
    }
  });
});

// For displaying errors
function displayError(inputId) {
  const input = document.getElementById(inputId);
  input.classList.remove('valid');
  input.classList.add('invalid');
}
