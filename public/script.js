document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/USERS')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('dynamic-content');

            // clear existing rows
            tableBody.innerHTML = '';

            // Populate table rows with data
            data.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML =
                    `
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.password}</td>
                    `;
               tableBody.appendChild(row);
            });
        })
    .catch(error => console.error('Error fetching data: ', error));
})

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

