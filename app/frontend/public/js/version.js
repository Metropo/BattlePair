// Versionsinformationen vom Backend laden
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/version')
        .then(response => response.json())
        .then(data => {
            const footer = document.createElement('footer');
            footer.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                color: rgba(255, 255, 255, 0.5);
                font-size: 0.8rem;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                text-align: right;
            `;
            
            let versionText = `${data.name} v${data.version}`;
            if (data.author) {
                versionText += ` | ${data.author}`;
            }
            if (data.homepage) {
                versionText += ` | <a href="${data.homepage}" style="color: inherit; text-decoration: none;">${data.homepage}</a>`;
            }
            
            footer.innerHTML = versionText;
            document.body.appendChild(footer);
        })
        .catch(error => {
            console.error('Fehler beim Laden der Versionsinformation:', error);
        });
}); 