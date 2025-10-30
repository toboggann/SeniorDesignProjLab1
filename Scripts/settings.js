// Function to check if user exists
async function checkUserExists(email) {
    try {
        const response = await fetch('/get-user');
        const userData = await response.json();
        
        // Check if we have any user data and if the email matches
        return userData && userData.email && userData.email === email;
    } catch (error) {
        console.error('Error checking user:', error);
        return false;
    }
}

// Function to save user data to server
async function saveInputToJsonFile(name, phone, email) {
    const userData = { name, phone, email };

    try {
        const response = await fetch('/save-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        
        if (response.ok) {
            console.log('Save successful:', result.message);
            console.log('User data:', name, phone, email);
            return true;
        } else {
            console.error('Server error:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Error saving file:', error);
        return false;
    }
}

// Function to load existing user data
async function loadUserData() {
    try {
        const response = await fetch('/get-user');
        const userData = await response.json();
        
        if (userData && userData.name) {
            // Pre-fill the form with existing data
            document.getElementById('fname').value = userData.name || '';
            document.getElementById('phone').value = userData.phone || '';
            document.getElementById('email').value = userData.email || '';
            console.log('Loaded existing user data:', userData);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Email sending functions
async function sendWelcomeEmail(name, phone, email) {
    try {
        const response = await emailjs.send("service_cgie0zm", "template_6kkuq5f", {
            name: name,
            email: email,
            phone: phone,
            message: "Welcome! You have successfully signed up for our service."
        });
        console.log('Welcome email sent successfully!', response);
        return true;
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return false;
    }
}

async function sendUpdateEmail(name, phone, email) {
    try {
        const response = await emailjs.send("service_cgie0zm", "template_6kkuq5f", {
            name: name,
            email: email,
            phone: phone,
            message: "Your information has been updated successfully."
        });
        console.log('Update email sent successfully!', response);
        return true;
    } catch (error) {
        console.error('Failed to send update email:', error);
        return false;
    }
}

// Function to read and display power state
// Function to read and display power state
async function togglePower() {
    try {
        // Always set power to 1, ignore current state
        const powerData = { power: 1 , units1: "celsius", units2: "celsius"};
        
        console.log('Setting power to ON (1)');
        
        // Update the JSON file on the server
        const updateResponse = await fetch('/update-power', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(powerData)
        });
        const userExists = await checkUserExists(email);
        if( userExists){
        if (updateResponse.ok) {
            const result = await updateResponse.json();
            console.log(`Power set to ON - ${result.message}`);
            
            // Update button text
            const powerBtn = document.getElementById("power");

            if (powerBtn) {
                powerBtn.textContent = `Power: ON`;
            }
        } else {
            const errorText = await updateResponse.text();
            console.error('Failed to update power state:', updateResponse.status, errorText);
        }
    }   else{
        alert('Please enter your information and save before setting power.');
    }
    
        
    } catch (error) {
        console.error('Error setting power:', error);
    }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load existing user data when page loads
    loadUserData();

    // Save button event listener
    document.getElementById('saveButton').addEventListener('click', async function() {
        const firstName = document.getElementById('fname').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        
        if (!firstName || !phone || !email) {
            alert('Please fill in all fields');
            return;
        }
        
        // Check if user exists before saving
        const userExists = await checkUserExists(email);
        console.log('User exists:', userExists);
        
        const success = await saveInputToJsonFile(firstName, phone, email);
        
        if (success) {
            const successMessage = document.getElementById('successMessage');
            
            // Send appropriate email based on whether user is new or existing
            let emailSuccess;
            if (userExists) {
                emailSuccess = await sendUpdateEmail(firstName, phone, email);
                successMessage.textContent = "Information Updated Successfully!";
            } else {
                emailSuccess = await sendWelcomeEmail(firstName, phone, email);
                successMessage.textContent = "Welcome! Your account has been created!";
            }
            
            successMessage.style.display = 'block';
            
            setTimeout(function() {
                successMessage.style.display = 'none';
                successMessage.textContent = "";
            }, 5000);
        } else {
            alert('Error saving data. Please try again.');
        }
    });

    // Power button event listener
    const powerBtn = document.getElementById("power");
    if (powerBtn) {
        powerBtn.addEventListener("click", togglePower);
    }
});