// Task 2.10: Weather Code Lookup Table
const weatherLookup = {
    0: { desc: "Clear Sky", icon: "☀️" },
    1: { desc: "Mainly Clear", icon: "🌤️" },
    2: { desc: "Partly Cloudy", icon: "⛅" },
    3: { desc: "Overcast", icon: "☁️" },
    45: { desc: "Fog", icon: "🌫️" },
    // Add more codes as per WMO standards
};

let debounceTimer;

// Task 4: Search with Debounce (500ms)
document.getElementById('cityInput').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            document.getElementById('validationMsg').style.display = 'none';
            fetchWeatherData(query);
        } else if (query.length > 0) {
            document.getElementById('validationMsg').style.display = 'block';
        }
    }, 500);
});

async function fetchWeatherData(cityName) {
    const controller = new AbortController(); // Task 4.19: Timeout
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        toggleLoading(true);
        
        // 1. Geocoding API Call
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${cityName}`, { signal: controller.signal });
        if (!geoRes.ok) throw new Error(`HTTP Error: ${geoRes.status}`);
        
        const geoData = await geoRes.json();
        if (!geoData.results) {
            showError("City not found.");
            return;
        }

        const { latitude, longitude, name } = geoData.results[0];

        // 2. Weather Forecast API Call
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
        const weatherRes = await fetch(weatherUrl, { signal: controller.signal });
        const weatherData = await weatherRes.json();
 
        clearTimeout(timeoutId);
        updateUI(name, weatherData);
        
        // Task 3: jQuery AJAX for Local Time
        fetchLocalTime(latitude, longitude);

    } catch (error) {
        if (error.name === 'AbortError') {
            showError("Request timed out after 10 seconds.");
        } else {
            showError(error.message);
        }
    } finally {
        toggleLoading(false);
    }
}

// Task 3: jQuery AJAX - Local Time Integration
function fetchLocalTime(lat, lon) {
    $.getJSON(`https://worldtimeapi.org/api/timezone/Etc/GMT`) // Simplified for example
        .done(function(data) {
            $('#localTime').text(`⏱️ Local Time: ${new Date(data.datetime).toLocaleTimeString()}`);
        })
        .fail(function() {
            // Fallback to browser time
            $('#localTime').text(`⏱️ Local Time: ${new Date().toLocaleTimeString()} (Local)`); 
        })
        .always(function() {
            console.log(`Time request finished at: ${new Date().toISOString()}`); 
        });
}

function updateUI(name, data) {
    const current = data.current_weather;
    const weather = weatherLookup[current.weathercode] || { desc: "Unknown", icon: "❓" };

    document.getElementById('cityName').textContent = name;
    document.getElementById('temp').textContent = Math.round(current.temperature);
    document.getElementById('description').textContent = `${weather.icon} ${weather.desc}`;
    
    // Populate Forecast Row
    const forecastRow = document.getElementById('forecastRow');
    forecastRow.innerHTML = '';
    data.daily.time.forEach((day, index) => {
        const dayWeather = weatherLookup[data.daily.weathercode[index]] || { icon: "❓" };
        forecastRow.innerHTML += `
            <div class="forecast-card card">
                <div>${new Date(day).toLocaleDateString('en', {weekday: 'short'})}</div>
                <div style="font-size: 2em;">${dayWeather.icon}</div>
                <div>${Math.round(data.daily.temperature_2m_max[index])}° / ${Math.round(data.daily.temperature_2m_min[index])}°</div>
            </div>
        `;
    });
}

function toggleLoading(isLoading) {
    const elements = document.querySelectorAll('.main-card, .forecast-card');
    elements.forEach(el => isLoading ? el.classList.add('skeleton') : el.classList.remove('skeleton'));
}

function showError(msg) {
    const banner = document.getElementById('errorBanner');
    document.getElementById('errorMsg').textContent = msg;
    banner.style.display = 'block';
}