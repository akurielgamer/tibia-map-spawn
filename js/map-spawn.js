let currentImageUrl = null; // Track current image URL for cleanup

let imageInputValue = "floor-07-map.png";
const selectedImage = document.getElementById('selectedImage');
const imageContainer = document.getElementById('imageContainer');
const importMarkersBtn = document.getElementById('import-markers');
let viewPortX = 0;
let viewPortY = 0;
let viewPortWidth = 0;
let viewPortHeight = 0;
const viewPort = document.getElementById('view-port');
const importSpawnsBtn = document.getElementById('import-spawns');
const monsterName = document.getElementById('monster-name');
const monsterResults = document.getElementById('monster-results');
let zoomValue = 1;
let spawnData = [];
let spawnsDB = {};
let selectedPointsForConnection = [];
let editingConnectionIndex = -1;
let monstersData = {};
let monsterIndex = -1;
let defaultZoomButton = null;
const monsterModal = new bootstrap.Modal(document.getElementById('monsterModal'));

const zeroPad = (num, places) => String(num).padStart(places, '0')

// Radio button event listeners for map selection
document.querySelectorAll('#imageInput input[name="map"]').forEach(radio => {
    radio.addEventListener('change', function (e) {
        imageInputValue = this.value;
        if (imageInputValue) {
            selectedImage.src = imageInputValue;
            selectedImage.classList.remove('d-none');
            imageContainer.setAttribute('data-floor', imageInputValue.split('-')[1]);
        } else {
            selectedImage.src = '';
            selectedImage.classList.add('d-none');
            imageContainer.setAttribute('data-floor', '');
        }
    });
});

selectedImage.addEventListener('load', updateSpawns);


function canDrawPoint(point) {
    if( (point.x >= parseInt(viewPortX)
            && point.x <= parseInt(viewPortX) + parseInt(viewPortWidth)
            && point.y >= parseInt(viewPortY)
            && point.y <= parseInt(viewPortY) + parseInt(viewPortHeight)
            && monsterName.value == '') || monsterName.value.toLowerCase() == point.name.toLowerCase()) {
        return true;
    }
    return false;
}

function updateSpawns() {
    updateViewPort();
    if(zoomValue < 4 && monsterName.value == '') {
        return;
    }
    document.querySelectorAll('.spawn').forEach(el => el.remove());
    if (!selectedImage.src || selectedImage.classList.contains('d-none'))
        return;

    const rect = selectedImage.getBoundingClientRect();
    const scaleX = rect.width / selectedImage.naturalWidth;
    const scaleY = rect.height / selectedImage.naturalHeight;
    const currentFloor = imageInputValue.split('-')[1];
    spawnData[currentFloor].forEach((point, index) => {
        if(!canDrawPoint(point)) {
            return;
        }
        const marker = document.createElement('img');
        marker.src = "images/monster_images/" + point.name.toLowerCase() + '.gif'
        marker.className = 'spawn floor-' + point.z;
        marker.style.left = (point.x * scaleX) + 'px';
        marker.style.top = (point.y * scaleY) + 'px';
        imageContainer.appendChild(marker);
    });
}



window.addEventListener("resize", function (e) {
    updateSpawns();
});

// Select all buttons with the class 'image-zoom'
const zoomButtons = document.querySelectorAll('.image-zoom');

// Add a click event listener to each button
zoomButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Get the zoom value from the button's text content (e.g., "100%", "200%")
        const value = button.textContent;

        // Select the scrollable container and the image
        const scrollContainer = imageContainer;
        const selectedImage = document.querySelector('#selectedImage');

        // Capture current scroll positions and container dimensions
        const oldScrollLeft = scrollContainer.scrollLeft;
        const oldScrollTop = scrollContainer.scrollTop;
        const clientWidth = scrollContainer.clientWidth;

        const clientHeight = scrollContainer.clientHeight;

        // Calculate the current center of the view
        const centerX = oldScrollLeft + clientWidth / 2;
        const centerY = oldScrollTop + clientHeight / 2;

        // Determine the current zoom level from the active button
        const currentPrimaryButton = document.querySelector('.image-zoom.btn-primary');
        const currentZoom = currentPrimaryButton ? currentPrimaryButton.textContent : "100%";

        // Calculate the scaling factor (e.g., 200 / 100 = 2)
        zoomValue = parseFloat(value) / 100;
        const scalingFactor = parseFloat(value) / parseFloat(currentZoom);

        // Apply the new zoom level to the image
        selectedImage.style.width = value;

        // Calculate and set new scroll positions to maintain the center
        const newScrollLeft = centerX * scalingFactor - clientWidth / 2;
        const newScrollTop = centerY * scalingFactor - clientHeight / 2;
        scrollContainer.scrollLeft = newScrollLeft;
        scrollContainer.scrollTop = newScrollTop;

        // Update button classes to reflect the active zoom level
        zoomButtons.forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        });

        // Set the clicked button to 'btn-primary' by removing 'btn-secondary'
        button.classList.remove('btn-secondary');
        button.classList.add('btn-primary');

        // Trigger the restore button (assuming it has other functionality)
        updateSpawns();
    });
    if(button.textContent == '800%') {
        defaultZoomButton = button;
    }
});

imageContainer.addEventListener('mousedown', function(event) {

    event.preventDefault(); // Prevents text selection or other default behaviors

    const startX = event.clientX;
    const startY = event.clientY;
    const startScrollLeft = imageContainer.scrollLeft;
    const startScrollTop = imageContainer.scrollTop;
    imageContainer.classList.add('panning');

    function onMouseMove(event) {
        const dx = event.clientX - startX; // Horizontal mouse movement
        const dy = event.clientY - startY; // Vertical mouse movement
        imageContainer.scrollLeft = startScrollLeft - dx; // Adjust horizontal scroll
        imageContainer.scrollTop = startScrollTop - dy;   // Adjust vertical scroll
    }

    function onMouseUp(event) {
        imageContainer.classList.remove('panning');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        updateSpawns();
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

function findSpawnAt(x, y) {
    const rect = selectedImage.getBoundingClientRect();
    const scaleDisplayedX = rect.width / selectedImage.naturalWidth;
    const scaleDisplayedY = rect.height / selectedImage.naturalHeight;
    const threshold = 10; // 10 pixels on screen
    const currentFloor = imageInputValue.split('-')[1];
    return spawnData[currentFloor].findIndex(point => {
        const dx = (point.x - x) * scaleDisplayedX;
        const dy = (point.y - y) * scaleDisplayedY;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
    });
}

// Image click handler
selectedImage.addEventListener('click', function (e) {
    if (!selectedImage.src || selectedImage.classList.contains('d-none'))
        return;

    const rect = selectedImage.getBoundingClientRect();
    const scaleX = selectedImage.naturalWidth / rect.width;
    const scaleY = selectedImage.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX - scaleX / 2;
    const y = (e.clientY - rect.top) * scaleY - scaleY / 2;

    const clickedIndex = findSpawnAt(x, y);
    if (clickedIndex !== -1) {
        showMonsterData(clickedIndex);
    }
});

// Function to open the modal and populate fields
function showMonsterData(index) {
    monsterIndex = index;
    const currentFloor = imageInputValue.split('-')[1];
    const monster = spawnData[currentFloor][index];
    if(!canDrawPoint(monster) || (zoomValue < 4 && monsterName.value == ''))
    {
        return;
    }
    const monsterName = monster.name.toLowerCase();
    
    if (monstersData[monsterName]) {
        const monsterData = monstersData[monsterName];
        
        // Update modal title
        document.querySelector('#monsterModal .modal-title').textContent = monsterData.name.charAt(0).toUpperCase() + monsterData.name.slice(1);
        
        // Create HTML content for modal body
        const modalBody = document.querySelector('#monsterModal .modal-body');
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>HP:</strong> ${monsterData.hp}</p>
                    <p><strong>Experience:</strong> ${monsterData.exp}</p>
                    <p><strong>Mitigation:</strong> ${monsterData.mitigation}%</p>
                    <p><strong>Bestiary Class:</strong> ${monsterData.bestiary_class}</p>
                    <p><strong>Speed:</strong> ${monsterData.speed}</p>
                    <p><strong>Armor:</strong> ${monsterData.armor}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Resistances:</strong></p>
                    <ul>
                        <li>Death: ${monsterData.death}%</li>
                        <li>Earth: ${monsterData.earth}%</li>
                        <li>Energy: ${monsterData.energy}%</li>
                        <li>Ice: ${monsterData.ice}%</li>
                        <li>Fire: ${monsterData.fire}%</li>
                        <li>Holy: ${monsterData.holy}%</li>
                        <li>Physical: ${monsterData.physical}%</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <p><strong>Bestiary Kills:</strong> ${monsterData.bestiary_kills}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Average Loot:</strong> ${monsterData.average_loot.toFixed(2)}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>EXP / HP:</strong> ${(monsterData.exp/monsterData.hp).toFixed(2)}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Loot / HP:</strong> ${(monsterData.average_loot/monsterData.hp).toFixed(2)}</p>
                </div>
            </div>
        `;
        
        // Show the modal
        monsterModal.show();
    } else {
        alert("Not found: " + monsterName);
    }
}

function updateViewPort() {
    const rect = selectedImage.getBoundingClientRect();
    const scaleDisplayed = rect.width / selectedImage.naturalWidth;
    viewPortWidth = selectedImage.naturalWidth / zoomValue;
    viewPortHeight = (selectedImage.naturalHeight) / zoomValue;
    viewPortX = (imageContainer.scrollLeft) / scaleDisplayed;
    viewPortY = (imageContainer.scrollTop) / scaleDisplayed;
    viewPort.style.top = (viewPortY * scaleDisplayed) + 'px';
    viewPort.style.left = (viewPortX * scaleDisplayed) + 'px';
    viewPort.style.width = (viewPortWidth * scaleDisplayed) + 'px';
    viewPort.style.height = (viewPortHeight * scaleDisplayed) + 'px';
}

updateViewPort();
    
fetch('data/map-spawn-v2.json')
.then(response => {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json(); // Parse JSON
})
.then(data => {
    for (var i in data.spawns) {
        for (var n in data.spawns[i].monsters) {
            let zValue = zeroPad(data.spawns[i].centerz, 2);
            if(spawnData[zValue] == undefined) {
                spawnData[zValue] = [];
            }
            // Check bounds.json xMin and yMin
            spawnData[zValue].push({'x': Math.round(parseInt(data.spawns[i].centerx) + parseInt(data.spawns[i].monsters[n].x) - 31744), 'y': Math.round(parseInt(data.spawns[i].centery) + parseInt(data.spawns[i].monsters[n].y) - 30976), 'z': zValue, 'name': data.spawns[i].monsters[n].name});
        }
    }
    defaultZoomButton.click();
    updateViewPort();
})
.catch(error => {
    console.error('Error fetching JSON:', error);
});


monsterName.addEventListener('keyup', function(event) {
    updateSpawns();
    if(monsterName.value.trim() !== '') {
        let monsterResultsHTML = '';
        for (var i = 0; i <  Object.keys(spawnData).length; i++ ) {
            let zValue = zeroPad(i, 2);
            let total = 0;
            spawnData[zValue].forEach((point, index) => {
                if(point.name.toLowerCase() == monsterName.value.toLowerCase()) {
                    total++;
                }
            });
            monsterResultsHTML += '<span class="me-4"><b>' + i + '</b>: ' + total + '</span>';
        }
        monsterResults.innerHTML = monsterResultsHTML;
        //monsterResults // append total of monster here
    }
});

fetch('data/monsters.json')
.then(response => {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json(); // Parse JSON
})
.then(data => {
    for (var i in data) {
        monstersData[data[i].name.toLowerCase()] = data[i];
    }
    console.log(monstersData);
})
.catch(error => {
    console.error('Error fetching JSON:', error);
});
