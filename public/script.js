document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/USERS')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('dynamic-content');

            // Clear existing rows
            tableBody.innerHTML = '';

            // Populate table rows with data
            data.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.password}</td>
                    <td>
                        <button
                            class="delete"
                            data-name="${user.name}"
                            data-email="${user.email}"
                            data-password="${user.password}"
                        >
                            Delete
                        </button>
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

function deleteUser(name, email, password) {
    fetch('/api/USERS', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
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
