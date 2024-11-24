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

                const timestamp = new Date(user.created_at);

                const readableDate = timestamp.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true, // Ensures AM/PM format
                    timeZoneName: 'short' // Adds time zone abbreviation
                });

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.user_id}</td>
                    <td>${user.first_name}</td>
                    <td>${user.last_name}</td>
                    <td>${user.email}</td>
                    <td>${user.is_host === 1 ? 'Yes' : 'No'}</td>
                    <td>${readableDate}</td>
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
                    const creationStamp = new Date(space.created_at);
                    const modificationStamp = new Date(space.modified_at);

                    const readableCreationDate = creationStamp.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true, // Ensures AM/PM format
                        timeZoneName: 'short' // Adds time zone abbreviation
                    });

                    const readableModificationDate = modificationStamp.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true, // Ensures AM/PM format
                        timeZoneName: 'short' // Adds time zone abbreviation
                    });

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${space.space_id}</td>
                        <td>${space.host_id}</td>
                        <td>${space.space_name}</td>
                        <td>${space.description}</td>
                        <td>${space.capacity}</td>
                        <td>${space.is_approved === 1 ? 'Yes' : 'No'}</td>
                        <td>${readableCreationDate}</td>
                        <td>${readableModificationDate}</td>
                        <td>${space.host_first_name}</td>
                        <td>${space.host_last_name}</td>
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
