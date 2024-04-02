const inputs = document.querySelectorAll("input"),
button = document.querySelector("button");

// Define the function to move to the next input
function moveToNext(input, nextInputId, prevInputId) {
const maxLength = parseInt(input.getAttribute('maxlength'));
const currentLength = input.value.length;

if (currentLength === maxLength) {
  const nextInput = document.getElementById(nextInputId);
  if (nextInput) {
    nextInput.focus();
  }
} else if (currentLength === 0 && prevInputId) {
  const prevInput = document.getElementById(prevInputId);
  if (prevInput) {
    prevInput.focus();
  }
}
}

// Function to handle backspace key press
function moveToNextOnBackspace(event, currentInputId, prevInputId) {
if (event.key === 'Backspace') {
  const currentInput = document.getElementById(currentInputId);
  const currentLength = currentInput.value.length;

  if (currentLength === 0 && prevInputId) {
    const prevInput = document.getElementById(prevInputId);
    if (prevInput) {
      prevInput.focus();
      
    }
  }
}
}

// Define the function to move to the next or previous input
function moveToNextOrPrevious(input, nextInputId, prevInputId, keyCode) {
  const currentLength = input.value.length;

  if (keyCode === 39 && currentLength === input.maxLength) { // Right arrow key
    const nextInput = document.getElementById(nextInputId);
    if (nextInput) {
      nextInput.focus();
    }
  } else if (keyCode === 37 && currentLength === 0 && prevInputId) { // Left arrow key
    const prevInput = document.getElementById(prevInputId);
    if (prevInput) {
      prevInput.focus();
    }
  }
}

// Event listener for arrow key press
document.addEventListener('keydown', function(event) {
  const currentInput = document.activeElement;
  const currentInputId = currentInput.id;
  const prevInputId = currentInput.getAttribute('prevInputId');
  const nextInputId = currentInput.getAttribute('nextInputId');
  const keyCode = event.keyCode;

  moveToNextOrPrevious(currentInput, nextInputId, prevInputId, keyCode);
});


// Form submission handling
document.getElementById('otpForm').addEventListener('submit', function(event) {
event.preventDefault();
const data = {};

// Serialize form data
$('#otpForm').serializeArray().forEach(each => {
  data[each.name] = each.value.trim();
});

// Validate OTPs
const otps = [data.otp1, data.otp2, data.otp3, data.otp4, data.otp5, data.otp6];

const errorMessages = otps.map((otp, index) => {
  if (otp === '') {
    return `OTP in box ${index + 1} is required.`;
  } else if (!/^\d$/.test(otp)) {
    return `Invalid OTP in box ${index + 1}. Please enter a single digit.`;
  } else {
    return '';
  }
});

if (errorMessages.some(message => message !== '')) {
  errorMessages.forEach((error, index) => {
    document.getElementById(`otp${index + 1}Error`).textContent = error;
  });
  return false;
} else {
  // Reset error messages
  errorMessages.forEach((_, index) => {
    document.getElementById(`otp${index + 1}Error`).textContent = '';
  });
}

// Submit the form data
axios.post('/verifyOtp', data)
  .then(res => {
    if (res.data.status) {
      Swal.fire({
        icon: "success",
        title: "Register Successful. Please login",
        showConfirmButton: false,
        timer: 2000
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
      });
    } else {
      console.error(err);
    }
  });
});




const timerDuration = 60; // 60 seconds
let timerValue = parseInt(sessionStorage.getItem('timerValue')) || timerDuration;
let timerInterval;

function updateTimerDisplay() {
  const minutes = Math.floor(timerValue / 60);
  const seconds = timerValue % 60;
  document.getElementById('timerDisplay').innerHTML = `<span style="color: red;">Resend OTP in </span><span>${minutes}:${seconds < 10 ? '0' : ''}${seconds}</span>`;
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerValue--;
    updateTimerDisplay();
    sessionStorage.setItem('timerValue', timerValue.toString());
    if (timerValue === 0) {
      clearInterval(timerInterval);
      document.getElementById('resendLinkContainer').style.display = 'block';
      document.getElementById('timerDisplay').innerText = '';
    }
  }, 1000);
}

// Call startTimer when the page loads or when the resend link is clicked
startTimer();

function resendOtp() {
  document.getElementById('resendLinkContainer').style.display = 'none';
  timerValue = timerDuration;
  sessionStorage.setItem('timerValue', timerValue.toString());
  clearInterval(timerInterval); // Clear previous interval if any
  startTimer();
  // Send the resend request to the server using Axios
  axios.post('/resendOtp')
    .then(res => {
      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "OTP has been sent to your email.",
          showConfirmButton: false,
          timer: 1500
        });
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
}
