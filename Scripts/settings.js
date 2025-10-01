// Function to save user data to server
async function saveInputToJsonFile(name, phone, email) {
    // Create a JavaScript object
    const userData = {
        name: name,
        phone: phone,
        email: email
    };

    try {
        const response = await fetch('/save-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            return true;
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        console.error('Error saving file:', error);
        return false;
    }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to the save button
    document.getElementById('saveButton').addEventListener('click', async function() {
        // Get form values
        const firstName = document.getElementById('fname').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        
        // Validate that all fields are filled
        if (!firstName || !phone || !email) {
            alert('Please fill in all fields');
            return;
        }
        
        // Call the function to save the JSON file
        const success = await saveInputToJsonFile(firstName, phone, email);
        
        if (success) {
            // Show success message
            const successMessage = document.getElementById('successMessage');
            successMessage.textContent = "Saved!";
            successMessage.style.display = 'block';
            console.log("Saved!");

            // Hide success message after 3 seconds and clear content
            setTimeout(function() {
                successMessage.style.display = 'none';
                successMessage.textContent = ""; // Change back to blank
            }, 3000);
        } else {
            alert('Error saving file. Make sure the server is running.');
        }
    });
});