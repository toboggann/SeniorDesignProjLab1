// Function to save user data to server
async function saveInputToJsonFile(name, phone, email) {
    const userData = { name, phone, email };

    try {
        const response = await fetch('/save-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

// Email sending function
async function sendMail(name, phone, email) {
    try {
        const response = await emailjs.send("service_cgie0zm", "template_gvv12ma", {
            name: name,
            email: email,
            phone: phone
        });
        console.log('Email sent successfully!', response);
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Save button event listener
    document.getElementById('saveButton').addEventListener('click', async function() {
        const firstName = document.getElementById('fname').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        
        if (!firstName || !phone || !email) {
            alert('Please fill in all fields');
            return;
        }
        
        const success = await saveInputToJsonFile(firstName, phone, email);
        
        if (success) {
            const successMessage = document.getElementById('successMessage');
            successMessage.textContent = "Saved!";
            successMessage.style.display = 'block';
            
            setTimeout(function() {
                successMessage.style.display = 'none';
                successMessage.textContent = "";
            }, 3000);
        } else {
            alert('Error saving file. Make sure the server is running.');
        }
    });

    // Test button event listener
    document.getElementById('test').addEventListener('click', async function() {
        console.log("clicked");
        const firstName = document.getElementById('fname').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        
        if (!firstName || !phone || !email) {
            alert('Please fill in all fields');
            return;
        }
        
        const success = await sendMail(firstName, phone, email);
        
        if (success) {
            // Fixed the element ID - was 'tested!' which is probably wrong
            const successMessage = document.getElementById('successMessage'); 
            successMessage.textContent = "I sent it!";
            successMessage.style.display = 'block';
            console.log("sent!");

            setTimeout(function() {
                successMessage.style.display = 'none';
                successMessage.textContent = "";
            }, 3000);
        } else {
            alert('Couldn\'t send');
        }
    });
});