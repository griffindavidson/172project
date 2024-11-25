document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is a host
    checkHostPrivileges();

    // Initialize operating hours section
    initializeOperatingHours();

    // Set up form submission handler
    const form = document.getElementById('createSpaceForm');
    form.addEventListener('submit', handleFormSubmit);
});

function checkHostPrivileges() {
    fetch('/api/user-session')
        .then(response => response.json())
        .then(user => {
            if (!user || !user.isHost) {
                showMessage('You must be logged in as a host to create spaces.', 'error');
                setTimeout(() => {
                    window.location.href = '/database.html';
                }, 2000);
                return;
            }

            document.getElementById('welcomeMessage').textContent =
                `Welcome, ${user.firstName} ${user.lastName}`;
        })
        .catch(error => {
            console.error('Session check error:', error);
            window.location.href = '/';
        });
}

function initializeOperatingHours() {
    const container = document.querySelector('.weekday-container');
    const weekdays = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday'
    ];

    weekdays.forEach((day, index) => {
        const row = document.createElement('div');
        row.className = 'weekday-row';
        row.innerHTML = `
            <label>${day}</label>
            <input type="time" name="openTime_${index}" required>
            <input type="time" name="closeTime_${index}" required>
            <label>
                <input type="checkbox" name="closed_${index}">
                Closed
            </label>
        `;

        // Add event listeners for the closed checkbox
        const checkbox = row.querySelector(`input[name="closed_${index}"]`);
        const timeInputs = row.querySelectorAll('input[type="time"]');

        checkbox.addEventListener('change', () => {
            timeInputs.forEach(input => {
                input.disabled = checkbox.checked;
                if (checkbox.checked) {
                    input.value = '';
                }
            });
        });

        container.appendChild(row);
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();

    // Basic validation
    if (!validateForm()) {
        return;
    }

    try {
        const formData = await collectFormData();  // Note the await here

        // Create space first
        const spaceResponse = await fetch('/api/spaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData.space)
        });

        if (!spaceResponse.ok) {
            throw new Error('Failed to create space');
        }

        const spaceData = await spaceResponse.json();
        const spaceId = spaceData.space_id;

        // Create operating hours
        const operatingHoursPromises = formData.operatingHours.map(hours =>
            fetch('/api/operating-hours', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...hours, space_id: spaceId })
            })
        );

        await Promise.all(operatingHoursPromises);

        // Create space rules
        await fetch('/api/space-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData.rules, space_id: spaceId })
        });

        showMessage('Space created successfully!', 'success');
        setTimeout(() => {
            window.location.href = '/database.html';
        }, 2000);

    } catch (error) {
        console.error('Error creating space:', error);
        showMessage('Failed to create space: ' + error.message, 'error');
    }
}

function validateForm() {
    const spaceName = document.getElementById('spaceName').value.trim();
    const description = document.getElementById('description').value.trim();
    const capacity = parseInt(document.getElementById('capacity').value);
    const minDuration = parseInt(document.getElementById('minDuration').value);
    const maxDuration = parseInt(document.getElementById('maxDuration').value);

    if (spaceName.length < 3) {
        showMessage('Space name must be at least 3 characters long', 'error');
        return false;
    }

    if (description.length < 10) {
        showMessage('Description must be at least 10 characters long', 'error');
        return false;
    }

    if (capacity < 1 || capacity > 1000) {
        showMessage('Capacity must be between 1 and 1000', 'error');
        return false;
    }

    if (minDuration >= maxDuration) {
        showMessage('Minimum duration must be less than maximum duration', 'error');
        return false;
    }

    // Validate operating hours
    const weekdays = document.querySelectorAll('.weekday-row');
    for (const row of weekdays) {
        const isClosed = row.querySelector('input[type="checkbox"]').checked;
        if (!isClosed) {
            const openTime = row.querySelector('input[type="time"]:first-of-type').value;
            const closeTime = row.querySelector('input[type="time"]:last-of-type').value;

            if (!openTime || !closeTime) {
                showMessage('Please set both open and close times for all days or mark as closed', 'error');
                return false;
            }

            if (openTime >= closeTime) {
                showMessage('Opening time must be before closing time', 'error');
                return false;
            }
        }
    }

    return true;
}

async function collectFormData() {
    // Get the user session first to get the host_id
    const sessionResponse = await fetch('/api/user-session');
    const sessionUser = await sessionResponse.json();

    if (!sessionUser || !sessionUser.id) {
        throw new Error('User session not found');
    }

    const data = {
        space: {
            host_id: sessionUser.id,  // Add the host_id from the session
            space_name: document.getElementById('spaceName').value.trim(),
            description: document.getElementById('description').value.trim(),
            capacity: parseInt(document.getElementById('capacity').value)
        },
        operatingHours: [],
        rules: {
            min_duration_minutes: parseInt(document.getElementById('minDuration').value),
            max_duration_minutes: parseInt(document.getElementById('maxDuration').value),
            max_advance_days: parseInt(document.getElementById('maxAdvance').value),
            min_notice_hours: parseInt(document.getElementById('minNotice').value),
            modification_deadline_hours: parseInt(document.getElementById('modificationDeadline').value)
        }
    };

    // Collect operating hours
    const weekdayRows = document.querySelectorAll('.weekday-row');
    weekdayRows.forEach((row, index) => {
        const isClosed = row.querySelector('input[type="checkbox"]').checked;
        if (!isClosed) {
            data.operatingHours.push({
                day_of_week: index,
                open_time: row.querySelector('input[type="time"]:first-of-type').value,
                close_time: row.querySelector('input[type="time"]:last-of-type').value,
                is_closed: false
            });
        } else {
            data.operatingHours.push({
                day_of_week: index,
                open_time: '00:00:00',
                close_time: '00:00:00',
                is_closed: true
            });
        }
    });

    return data;
}

function showMessage(message, type) {
    const container = document.getElementById('messageContainer');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;

    container.appendChild(messageElement);

    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}
