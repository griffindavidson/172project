document.addEventListener('DOMContentLoaded', () => {
    // grab Users table
    fetch('/api/Users')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('dynamic-content-users');

            // Clear existing rows
            tableBody.innerHTML = '';

            // Populate table rows with data
            data.forEach(user => {

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.user_id}</td>
                    <td>${user.first_name}</td>
                    <td>${user.last_name}</td>
                    <td>${user.email}</td>
                    <td>${user.is_host === 1 ? 'Yes' : 'No'}</td>
                    <td>${formatDateTime(user.created_at)}</td>
                    <td>
                        <button class="delete" data-id="${user.user_id}">Delete</button>
                        <button class="edit">Edit</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Add click event listeners for delete buttons
            attachDeleteListeners();
        })
        .catch(error => console.error('Error fetching Users: ', error));

        // grab spaces table
        fetch('/api/spaces')
            .then(response => response.json())
            .then(data => {
                const tableBody = document.getElementById('dynamic-content-spaces');

                //clear any rows
                tableBody.innerHTML = '';

                //populate rows
                data.forEach(space => {

                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${space.host}</td>
                        <td>${space.space_name}</td>
                        <td>${space.description}</td>
                        <td>${space.capacity}</td>
                        <td>${space.is_approved === 1 ? 'Yes' : 'No'}</td>
                        <td>${formatDateTime(space.created_at)}</td>
                        <td>${formatDateTime(space.modified_at)}</td>
                        <td>
                            <button class="delete" data-id="${space.space_id}">Delete</button>
                            <button class="edit">Edit</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
                attachDeleteListeners();
            })
        .catch(error => { console.error("Error fetching Spaces", error) });

        // get operating hours table
        fetch('/api/operating-hours')
            .then(response => response.json())
            .then(data => {

                const weekday = {
                    0: 'Sundays',
                    1: 'Mondays',
                    2: 'Tuesdays',
                    3: 'Wednesdays',
                    4: 'Thursdays',
                    5: 'Fridays',
                    6: 'Saturdays'
                }

                const tableBody = document.getElementById('dynamic-content-operating');

                // clear any innerHTML
                tableBody.innerHTML = "";

                // populate rows
                data.forEach(operation => {

                    function formatTime(inputTime) {
                        const [hours, minutes] = inputTime.split(":");
                        const date = new Date();
                        date.setHours(parseInt(hours, 10), parseInt(minutes,10));

                        let formatter = Intl.DateTimeFormat('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                        });

                        return formatter.format(date);
                    }

                    const openTime = formatTime(operation.open_time);
                    const closeTime = formatTime(operation.close_time);

                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${operation.space_name}</td>
                        <td>${weekday[operation.day_of_week]}</td>
                        <td>${openTime}</td>
                        <td>${closeTime}</td>
                        <td>
                            <button class="delete" data-id="${operation.operating_hours_id}">Delete</button>
                            <button class="edit">Edit</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
                attachDeleteListeners();
            })
            .catch(error => { console.error("Error fetching Operating Hours", error) });

        // grab reservations table
        fetch('/api/reservations')
            .then(response => response.json())
            .then(data => {

                const tableBody = document.getElementById('dynamic-content-reservations');

                // clear any extraenous innerHTML
                tableBody.innerHTML = '';

                // populate rows
                data.forEach(reservation => {

                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${reservation.name}</td>
                        <td>${reservation.space_name}</td>
                        <td>${formatDateTime(reservation.start_time)}</td>
                        <td>${formatDateTime(reservation.end_time)}</td>
                        <td>${reservation.status}</td>
                        <td>${formatDateTime(reservation.created_at)}</td>
                        <td>${formatDateTime(reservation.modified_at)}</td>
                        <td>${reservation.created_by_name}</td>
                        <td>${reservation.last_modified_by_name}</td>
                        <td>
                            <button class="delete" data-id="${reservation.reservation_id}">Delete</button>
                            <button class="edit">Edit</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
                attachDeleteListeners();
            })
        .catch(error => { console.error("Error fetching Reservations", error) });

        // grab space rules
        fetch('/api/space-rules')
            .then(response => response.json())
            .then(data => {

                const tableBody = document.getElementById('dynamic-content-rules')

                // clear any potential innerHTML
                tableBody.innerHTML = '';

                // populate rows
                data.forEach(rule => {

                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${rule.space_name}</td>
                        <td>${rule.min_duration_minutes}</td>
                        <td>${rule.max_duration_minutes}</td>
                        <td>${formatDateTime(rule.created_at)}</td>
                        <td>${formatDateTime(rule.modified_at)}</td>
                        <td>
                            <button class="delete" data-id="${rule.space_id}">Delete</button>
                            <button class="edit">Edit</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
                attachDeleteListeners();
            })
        .catch(error => { console.error("Error fetching Space Rules", error) });
});

// still broken, will reimplement later
async function submit() {
    const firstName = document.getElementById('name-input').value;
    const lastName = document.getElementById('name-input').value;
    const email = document.getElementById('email-input').value;
    const passwordHash = document.getElementById('password-input').value;
    const isHost = document.getElementByID('password-input').value;

    try {
        const response = await fetch('/api/USERS', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ firstName, lastName, email, passwordHash, isHost }),
        });

        // handle server response
        if (response.ok) {
            location.reload();
        } else {
            const error = await response.text();
            console.log(`Error adding user: ${error}`);
        }
    } catch (err) {
        console.error("Error submitting data: ", err);
    }
}

function deleteUser(id) {
    fetch('/api/Users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    })
    .then(response => {
        if (response.ok) {
            // row removed on server, need to update DOM manually
            const rowToDelete = document.querySelector(`button[data-id="${id}"`).closest('tr');
            if (rowToDelete) {
                rowToDelete.remove();
            }
        } else {
            console.log("Failed to delete user");
        }
    })
    .catch(error => console.error("Error deleting user:", error));
}

// run this function when adding new rows
function attachDeleteListeners() {
    document.querySelectorAll('.delete').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            deleteUser(id);
        })
    })
}

function formatDateTime(isoString) {
    const date = new Date(isoString);

    // Format date and time
    let formattedDate = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    })

   formattedDate = formattedDate.replaceAll(' at', ',')
   formattedDate = formattedDate.replaceAll(' AM', 'am');
   formattedDate = formattedDate.replaceAll(' PM', 'pm');

    return formattedDate;
}