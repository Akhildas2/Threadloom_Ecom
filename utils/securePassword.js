const bcrypt = require('bcrypt');



// Secure password hashing
const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        throw new Error('Error hashing password');
    }
};



module.exports = { securePassword };