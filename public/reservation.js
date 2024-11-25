let currentWeekStart = new Date();
currentWeekStart.setHours(0, 0, 0, 0);
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start from Sunday

let selectedSpace = null;
let spaceRules = null;
let operatingHours = null;
let existingReservations = [];
let selectedTimeSlot = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    checkUserSession();
    loadSpaces();

    // Debug: Check if the element exists
    const spaceSelect = document.getElementById('spaceSelect');
    console.log('Space Select Element:', spaceSelect);

    if (spaceSelect) {
        console.log('Adding change event listener to spaceSelect');
        spaceSelect.addEventListener('change', (event) => {
            console.log('Space selection changed!'); // This will tell us if the event fires
            handleSpaceSelection(event);
        });
    } else {
        console.error('spaceSelect element not found!');
    }

    document.getElementById('reservationForm').addEventListener('submit', handleReservationSubmit);
});

function checkUserSession() {
    fetch('/api/user-session')
        .then(response => response.json())
        .then(user => {
            if (!user) {
                showMessage('Please log in to make reservations', 'error');
                setTimeout(() => window.location.href = '/', 2000);
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

function loadSpaces() {
    fetch('/api/spaces')
        .then(response => response.json())
        .then(spaces => {
            console.log('Loaded spaces:', spaces); // Debug log
            const select = document.getElementById('spaceSelect');
            select.innerHTML = '<option value="">Choose a space...</option>'; // Reset dropdown
            spaces.forEach(space => {
                const option = document.createElement('option');
                option.value = space.space_id;
                option.textContent = space.space_name;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading spaces:', error);
            showMessage('Error loading spaces', 'error');
        });
}

async function handleSpaceSelection(event) {
    const spaceId = event.target.value;
    if (!spaceId) {
        document.getElementById('spaceDetails').style.display = 'none';
        document.getElementById('reservationForm').style.display = 'none';
        return;
    }

    try {
        // Clear existing details first
        document.getElementById('spaceDetails').style.display = 'none';
        document.getElementById('reservationForm').style.display = 'none';

        // Fetch and log each response
        const spaceResponse = await fetch(`/api/spaces/${spaceId}`);
        const space = await spaceResponse.json();
        console.log('Space Response:', space);

        const rulesResponse = await fetch(`/api/space-rules/${spaceId}`);
        const rules = await rulesResponse.json();
        console.log('Rules Response:', rules);

        // Log specific rule values
        console.log('Rule Values:', {
            min_duration: rules.min_duration_minutes,
            max_duration: rules.max_duration_minutes,
            min_notice: rules.min_notice_hours,
            max_advance: rules.max_advance_days
        });

        const hoursResponse = await fetch(`/api/operating-hours/${spaceId}`);
        const hours = await hoursResponse.json();
        console.log('Hours Response:', hours);

        // Store data globally
        selectedSpace = space;
        spaceRules = rules;
        operatingHours = hours;

        console.log('Global State Updates:', {
            selectedSpace,
            spaceRules,
            operatingHours
        });

        // Update display
        const detailsSection = document.getElementById('spaceDetails');

        // Log the rules object right before template literal
        console.log('Rules object before template:', rules);

        const templateHTML = `
            <h2>Space Details</h2>
            <div class="details-grid">
                <div>Space Name: <span class="detail-value">${space.space_name}</span></div>
                <div>Host: <span class="detail-value">${space.host_name}</span></div>
                <div>Capacity: <span class="detail-value">${space.capacity} people</span></div>
                <div>Description: <span class="detail-value">${space.description}</span></div>
                ${rules ? `
                    <div>Minimum Duration: <span class="detail-value">${rules.min_duration_minutes} minutes</span></div>
                    <div>Maximum Duration: <span class="detail-value">${rules.max_duration_minutes} minutes</span></div>
                    <div>Minimum Notice: <span class="detail-value">${rules.min_notice_hours} hours</span></div>
                    <div>Max Advance Booking: <span class="detail-value">${rules.max_advance_days} days</span></div>
                ` : ''}
            </div>
        `;

        console.log('Generated HTML:', templateHTML);

        detailsSection.innerHTML = templateHTML;
        detailsSection.style.display = 'block';

        // Initialize calendar and show form
        initializeCalendar();
        loadReservations();
        document.getElementById('reservationForm').style.display = 'block';

    } catch (error) {
        console.error('Error loading space details:', error);
        showMessage('Error loading space details', 'error');
    }
}

function initializeCalendar() {
    const timeColumn = document.querySelector('.time-column');
    const daysGrid = document.querySelector('.days-grid');

    // Clear existing content
    timeColumn.innerHTML = '';
    daysGrid.innerHTML = '';

    // Add time slots (8 AM to 8 PM)
    for (let hour = 8; hour <= 20; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = formatHour(hour);
        timeColumn.appendChild(timeSlot);
    }

    // Add day columns
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDate = new Date(currentWeekStart);

    days.forEach((day, index) => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';

        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = `${day} ${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
        dayColumn.appendChild(header);

        const daySlots = document.createElement('div');
        daySlots.className = 'day-slots';

        // Add time slots
        for (let hour = 8; hour <= 20; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot-cell';
            timeSlot.dataset.hour = hour;
            timeSlot.dataset.date = currentDate.toISOString().split('T')[0];

            // Check if this time is within operating hours
            const dayOperatingHours = operatingHours.find(oh => oh.day_of_week === index);
            if (dayOperatingHours && !isWithinOperatingHours(hour, dayOperatingHours)) {
                timeSlot.classList.add('closed-time');
            } else {
                timeSlot.addEventListener('click', handleTimeSlotClick);
            }

            daySlots.appendChild(timeSlot);
        }

        dayColumn.appendChild(daySlots);
        daysGrid.appendChild(dayColumn);

        currentDate.setDate(currentDate.getDate() + 1);
    });

    updateWeekDisplay();
}

function loadReservations() {
    const startDate = currentWeekStart.toISOString().split('T')[0];
    const endDate = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    fetch(`/api/reservations/space/${selectedSpace.space_id}?start=${startDate}&end=${endDate}`)
        .then(response => response.json())
        .then(reservations => {
            existingReservations = reservations;
            displayReservations();
        })
        .catch(error => console.error('Error loading reservations:', error));
}

function displayReservations() {
    // Clear existing reservation displays
    document.querySelectorAll('.booked-slot').forEach(el => el.remove());

    existingReservations.forEach(reservation => {
        const startDate = new Date(reservation.start_time);
        const endDate = new Date(reservation.end_time);

        // Calculate position and height
        const dayIndex = startDate.getDay();
        const startHour = startDate.getHours() + startDate.getMinutes() / 60;
        const endHour = endDate.getHours() + endDate.getMinutes() / 60;
        const duration = endHour - startHour;

        const dayColumn = document.querySelectorAll('.day-column')[dayIndex];
        const daySlots = dayColumn.querySelector('.day-slots');

        const bookedSlot = document.createElement('div');
        bookedSlot.className = 'booked-slot';
        bookedSlot.style.top = `${(startHour - 8) * 60}px`;
        bookedSlot.style.height = `${duration * 60}px`;
        bookedSlot.textContent = `Reserved by ${reservation.user_name}`;

        daySlots.appendChild(bookedSlot);
    });
}

function handleTimeSlotClick(event) {
    const cell = event.target;
    if (cell.classList.contains('closed-time')) return;

    // Remove previous selection
    document.querySelectorAll('.selected-slot').forEach(el =>
        el.classList.remove('selected-slot'));

    // Add selection to clicked cell
    cell.classList.add('selected-slot');
    selectedTimeSlot = cell;

    // Update form with selected time
    const date = cell.dataset.date;
    const hour = cell.dataset.hour;

    document.getElementById('reservationDate').value = date;
    document.getElementById('startTime').value = `${hour.padStart(2, '0')}:00`;
    document.getElementById('endTime').value = `${(parseInt(hour) + 1).toString().padStart(2, '0')}:00`;
}

async function handleReservationSubmit(event) {
    event.preventDefault();

    if (!selectedSpace || !selectedTimeSlot) {
        showMessage('Please select a space and time slot', 'error');
        return;
    }

    const date = document.getElementById('reservationDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    // Validate time slot availability
    if (!validateTimeSlot(date, startTime, endTime)) {
        showMessage('Selected time slot conflicts with existing reservations', 'error');
        return;
    }

    try {
        const sessionResponse = await fetch('/api/user-session');
        const user = await sessionResponse.json();

        const reservation = {
            space_id: selectedSpace.space_id,
            user_id: user.id,
            start_time: `${date}T${startTime}`,
            end_time: `${date}T${endTime}`,
            created_by: user.id
        };

        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reservation)
        });

        if (!response.ok) throw new Error('Failed to create reservation');

        showMessage('Reservation created successfully!', 'success');
        setTimeout(() => window.location.href = '/database.html', 2000);

    } catch (error) {
        console.error('Error creating reservation:', error);
        showMessage('Failed to create reservation', 'error');
    }
}

function validateTimeSlot(date, startTime, endTime) {
    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);

    // Check against existing reservations
    return !existingReservations.some(reservation => {
        const existingStart = new Date(reservation.start_time);
        const existingEnd = new Date(reservation.end_time);
        return (newStart < existingEnd && newEnd > existingStart);
    });
}

function isWithinOperatingHours(hour, operatingHours) {
    if (operatingHours.is_closed) return false;

    const openHour = parseInt(operatingHours.open_time.split(':')[0]);
    const closeHour = parseInt(operatingHours.close_time.split(':')[0]);

    return hour >= openHour && hour < closeHour;
}

function formatHour(hour) {
    return `${hour % 12 || 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
}

function previousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    initializeCalendar();
    loadReservations();
}

function nextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    initializeCalendar();
    loadReservations();
}

function updateWeekDisplay() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    document.getElementById('currentWeek').textContent =
        `${formatDate(currentWeekStart)} - ${formatDate(weekEnd)}`;
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
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

function handleLogout() {
    fetch('/api/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/';
        } else {
            throw new Error('Logout failed');
        }
    })
    .catch(error => {
        console.error('Logout error:', error);
        showMessage('Logout failed', 'error');
    });
}