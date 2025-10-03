async function getMostRecentData() {
    try {
        const response = await fetch('/Scripts/temp1.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const temp1_data = await response.json();
        const recent1 = temp1_data.readings[temp1_data.readings.length - 1];
        
        console.log('=== MOST RECENT TEMPERATURE READINGS ===');
        console.log(`Sensor 1: ${recent1.temperature}°C at ${recent1.timestamp}`);
        console.log('========================================');
        
        return recent1.temperature;
        
    } catch (error) {
        console.error('Error reading temperature data:', error.message);
        return null;
    }
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Chart.js initialization
    console.log('Chart.js version:', Chart?.version);

    const ctx = document.getElementById('myChart').getContext('2d');

    const data = {
        labels: [], // time in seconds
        datasets: [{
            label: 'Temperature (°C)',
            data: [],
            borderColor: 'rgba(75,192,192,1)',
            backgroundColor: 'rgba(75,192,192,0.1)',
            pointRadius: 3,
            tension: 0.15,
            fill: false
        }]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            animation: false,
            scales: {
                x: {
                    title: { display: true, text: 'Time (s)' }
                },
                y: {
                    title: { display: true, text: 'Temperature (°C)' },
                    min: 0,  
                    max: 60,  
                    ticks: {
                        stepSize: 10
                    }
                }
            }
        }
    };

    const myChart = new Chart(ctx, config);

    // REAL-TIME DATA from JSON file (replaces simulated data)
    let t = 0;
    setInterval(async () => {
        // Get real temperature data from JSON file
        const realTemperature = await getMostRecentData();
        
        if (realTemperature !== null) {
            // Use the real temperature value
            data.labels.push(t);
            data.datasets[0].data.push(realTemperature);

            // Keep last 300 points
            if (data.labels.length > 300) {
                data.labels.shift();
                data.datasets[0].data.shift();
            }

            myChart.update('none'); // update without animation
            t++;
        }
    }, 1000); // Update every second
});