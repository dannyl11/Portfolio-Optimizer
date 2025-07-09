document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const form = document.getElementById('optimizeForm');
    const capitalInput = document.getElementById('capital');
    const desiredReturnInput = document.getElementById('desired_return');
    const horizonSelect = document.getElementById('horizon');
    const tickerInput = document.getElementById('tickerInput');
    const addTickerBtn = document.getElementById('addTickerBtn');
    const tickersList = document.getElementById('tickersList');
    
    // Get UI elements
    const optimizeBtn = document.getElementById('optimizeBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('error');
    
    // Store selected tickers
    let selectedTickers = [];

    // Initialize tickers list display
    updateTickersDisplay();

    // Add ticker button handler
    addTickerBtn.addEventListener('click', function() {
        addTicker();
    });

    // Add ticker on Enter key
    tickerInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTicker();
        }
    });

    // Auto-format ticker input
    tickerInput.addEventListener('input', function(e) {
        let value = e.target.value.toUpperCase();
        // Remove invalid characters (only letters allowed)
        value = value.replace(/[^A-Z]/g, '');
        e.target.value = value;
    });

    // Add ticker function
    function addTicker() {
        const ticker = tickerInput.value.trim().toUpperCase();
        
        if (!ticker) {
            showTickerError('Please enter a ticker symbol');
            return;
        }
        
        if (ticker.length < 1 || ticker.length > 5) {
            showTickerError('Ticker must be 1-5 characters long');
            return;
        }
        
        if (!/^[A-Z]+$/.test(ticker)) {
            showTickerError('Ticker can only contain letters');
            return;
        }
        
        if (selectedTickers.includes(ticker)) {
            showTickerError('This ticker is already added');
            return;
        }
        
        // Add ticker to array
        selectedTickers.push(ticker);
        
        // Clear input
        tickerInput.value = '';
        
        // Update display
        updateTickersDisplay();
        
        // Clear any error messages
        clearTickerError();
    }

    // Remove ticker function
    function removeTicker(ticker) {
        selectedTickers = selectedTickers.filter(t => t !== ticker);
        updateTickersDisplay();
    }

    // Update tickers display
    function updateTickersDisplay() {
        tickersList.innerHTML = '';
        
        if (selectedTickers.length === 0) {
            tickersList.innerHTML = '<div class="tickers-list-empty">No stocks added yet</div>';
            tickersList.classList.remove('has-tickers');
        } else {
            tickersList.classList.add('has-tickers');
            
            selectedTickers.forEach(ticker => {
                const tickerTag = document.createElement('div');
                tickerTag.className = 'ticker-tag';
                tickerTag.innerHTML = `
                    ${ticker}
                    <button class="remove-ticker" onclick="removeTicker('${ticker}')" title="Remove ${ticker}">×</button>
                `;
                tickersList.appendChild(tickerTag);
            });
        }
    }

    // Make removeTicker available globally for onclick
    window.removeTicker = removeTicker;

    // Show ticker error
    function showTickerError(message) {
        // Remove existing error
        clearTickerError();
        
        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'ticker-error';
        errorElement.style.cssText = 'color: #dc3545; font-size: 0.9rem; margin-top: 5px;';
        errorElement.textContent = message;
        
        // Add after ticker input container
        const container = document.querySelector('.ticker-input-container');
        container.parentNode.insertBefore(errorElement, container.nextSibling);
        
        // Focus back on input
        tickerInput.focus();
    }

    // Clear ticker error
    function clearTickerError() {
        const errorElement = document.querySelector('.ticker-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    // Main form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous results
        hideResults();
        hideError();
        
        // Show loading state
        setLoadingState(true);
        
        try {
            // Collect and validate user inputs
            const userInputs = collectUserInputs();
            
            if (!validateInputs(userInputs)) {
                return; // Validation errors will be shown
            }
            
            console.log('Sending data to backend:', userInputs);
            
            // Send to backend
            const response = await sendToBackend(userInputs);
            
            if (response.error) {
                displayError(response.error);
            } else {
                displayResults(response);
            }
            
        } catch (error) {
            console.error('Error:', error);
            displayError('Failed to connect to server. Please check your connection and try again.');
        } finally {
            setLoadingState(false);
        }
    });

    // Collect user inputs from form
    function collectUserInputs() {
        return {
            capital: parseFloat(capitalInput.value),
            desired_return: parseFloat(desiredReturnInput.value) / 100, // Convert % to decimal
            horizon: horizonSelect.value,
            tickers: selectedTickers // Use the selectedTickers array
        };
    }

    // Validate user inputs
    function validateInputs(inputs) {
        const errors = [];
        
        // Validate capital
        if (!inputs.capital || inputs.capital <= 0) {
            errors.push('Capital must be a positive number');
        }
        
        // Validate desired return
        if (!inputs.desired_return || inputs.desired_return <= 0) {
            errors.push('Desired return must be a positive percentage');
        }
        
        // Validate horizon
        if (!inputs.horizon) {
            errors.push('Please select an investment horizon');
        }
        
        // Validate tickers
        if (!inputs.tickers || inputs.tickers.length < 2) {
            errors.push('Please add at least 2 stocks to your portfolio');
        }
        
        // All tickers are already validated when added, so no need for format check
        
        if (errors.length > 0) {
            displayError(errors.join('<br>'));
            return false;
        }
        
        return true;
    }

    // Send data to backend
    async function sendToBackend(data) {
        const response = await fetch('/optimize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `Server error: ${response.status}`);
        }
        
        return result;
    }

    // Display optimization results
    function displayResults(portfolio) {
        const resultsContent = document.getElementById('resultsContent');
        resultsContent.innerHTML = '';
        
        // Create results display based on portfolio structure
        if (typeof portfolio === 'object' && portfolio !== null) {
            if (Array.isArray(portfolio)) {
                // Handle array of allocations
                portfolio.forEach((allocation, index) => {
                    const item = createResultItem(`Asset ${index + 1}`, allocation);
                    resultsContent.appendChild(item);
                });
            } else {
                // Handle object with portfolio data
                Object.entries(portfolio).forEach(([key, value]) => {
                    const item = createResultItem(key, value);
                    resultsContent.appendChild(item);
                });
            }
        } else {
            // Handle simple results
            const item = createResultItem('Result', portfolio);
            resultsContent.appendChild(item);
        }
        
        showResults();
    }

    // Create individual result item
    function createResultItem(title, data) {
        const item = document.createElement('div');
        item.className = 'portfolio-item';
        
        const titleElement = document.createElement('h4');
        titleElement.textContent = formatTitle(title);
        item.appendChild(titleElement);
        
        if (typeof data === 'object' && data !== null) {
            // Handle nested data
            Object.entries(data).forEach(([key, value]) => {
                const p = document.createElement('p');
                p.innerHTML = `<strong>${formatTitle(key)}:</strong> ${formatValue(value)}`;
                item.appendChild(p);
            });
        } else {
            // Handle simple values
            const p = document.createElement('p');
            p.textContent = formatValue(data);
            item.appendChild(p);
        }
        
        return item;
    }

    // Format titles (convert snake_case to Title Case)
    function formatTitle(title) {
        return title.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Format values for display
    function formatValue(value) {
    if (typeof value === 'number') {
        // Format as percentage if it's a small decimal (between -1 and 1, excluding 0)
        if (value < 1 && value > -1 && value !== 0) {
            return (value * 100).toFixed(2) + '%';
        }
        // Format as currency, with dollar sign after negative
        const absValue = Math.abs(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return (value < 0 ? '-' : '') + '$' + absValue;
    }
    return value;
}

    // UI State Management
    function setLoadingState(isLoading) {
        optimizeBtn.disabled = isLoading;
        btnText.textContent = isLoading ? 'Optimizing...' : 'Optimize Portfolio';
        btnSpinner.style.display = isLoading ? 'inline-block' : 'none';
    }

    function showResults() {
        resultsDiv.style.display = 'block';
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    function hideResults() {
        resultsDiv.style.display = 'none';
    }

    function displayError(message) {
        const errorContent = document.getElementById('errorContent');
        errorContent.innerHTML = message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth' });
    }

    function hideError() {
        errorDiv.style.display = 'none';
    }

    // Input Enhancement: Validate desired return range
    desiredReturnInput.addEventListener('input', function(e) {
        const value = parseFloat(e.target.value);
        if (value > 100) {
            e.target.setCustomValidity('Desired return seems too high (over 100%)');
        } else if (value < 0) {
            e.target.setCustomValidity('Desired return cannot be negative');
        } else {
            e.target.setCustomValidity('');
        }
    });

    // Input Enhancement: Validate capital amount
    capitalInput.addEventListener('input', function(e) {
        const value = parseFloat(e.target.value);
        if (value < 1000) {
            e.target.setCustomValidity('Minimum capital should be $1,000');
        } else {
            e.target.setCustomValidity('');
        }
    });
});