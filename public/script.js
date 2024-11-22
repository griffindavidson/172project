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