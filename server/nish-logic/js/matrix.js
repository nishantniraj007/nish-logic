const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

// Configure canvas dimensions to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Matrix Characters (Katakana + Latin + Digits)
const chars = '01'.split('');

const fontSize = 16;
// Number of columns based on font size & screen width
let columns = canvas.width / fontSize;
let drops = [];

// Initialize drop positions (all starting at y=1)
for (let x = 0; x < columns; x++) {
    drops[x] = 1;
}

function draw() {
    // Translucent black background to create trail effect
    ctx.fillStyle = 'rgba(13, 13, 13, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0'; // matrix green text
    ctx.font = fontSize + 'px monospace';

    // Update columns on resize
    if (drops.length < canvas.width / fontSize) {
        let oldDrops = drops;
        columns = canvas.width / fontSize;
        drops = [];
        for (let x = 0; x < columns; x++) {
            drops[x] = oldDrops[x] || 1;
        }
    }

    for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = chars[Math.floor(Math.random() * chars.length)];

        // Draw character
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop to top randomly after it crosses the screen
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        // Move drop down
        drops[i]++;
    }
}

// Interactivity / Dropdown Handlers
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.has-dropdown > button');

    buttons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.stopPropagation();

            // Close other open dropdowns
            document.querySelectorAll('.dropdown-content.show').forEach(dropdown => {
                if (dropdown !== this.nextElementSibling) {
                    dropdown.classList.remove('show');
                }
            });

            // Toggle current dropdown
            const dropdown = this.nextElementSibling;
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-content.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    });
});

setInterval(draw, 33);
