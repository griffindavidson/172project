document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/Users')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('dynamic-content');

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
                    <td>${user.is_host}</td>
                    <td>${created_at}</td>
                    <td>
                        <button class="delete" data-id="${user.user_id}">Delete</button>
                        <button class="edit">Edit</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Add click event listeners for delete buttons
            document.querySelectorAll('.delete').forEach(button => {
                button.addEventListener('click', () => {
                    const name = button.getAttribute('data-name');
                    const email = button.getAttribute('data-email');
                    const password = button.getAttribute('data-password');
                    deleteUser(name, email, password);
                });
            });
        })
        .catch(error => console.error('Error fetching data: ', error));
});

async function submit() {
    const name = document.getElementById('name-input').value;
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;

    try {
        const response = await fetch('/api/USERS', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ name, email, password }),
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
            location.reload();
        } else {
            console.log("Failed to delete user");
        }
    })
    .catch(error => console.error("Error deleting user:", error));
}
