import * as THREE from 'three';
import { DINOSAUR_FACTS } from '../data/dinosaurFacts.js';

// Create book collectible
export function createBookCollectible(x, y, z) {
    const book = new THREE.Group();
    
    // Book body
    const bookGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.4);
    const bookMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x964B00, // Brown color
        metalness: 0.3,
        roughness: 0.8
    });
    const bookMesh = new THREE.Mesh(bookGeometry, bookMaterial);
    book.add(bookMesh);
    
    // Book pages (white part)
    const pagesGeometry = new THREE.BoxGeometry(0.45, 0.08, 0.35);
    const pagesMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        metalness: 0.1,
        roughness: 0.5
    });
    const pagesMesh = new THREE.Mesh(pagesGeometry, pagesMaterial);
    pagesMesh.position.y = 0.01; // Slightly above the cover
    book.add(pagesMesh);
    
    // Add glow effect
    const glowGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.5);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    book.add(glow);

    // Add floating animation data
    book.position.set(x, y + 0.5, z);
    book.userData.type = 'book';
    book.userData.baseY = y + 0.5;
    book.userData.rotationSpeed = 1;
    book.userData.floatOffset = Math.random() * Math.PI * 2;
    
    // Add random dinosaur fact
    book.userData.fact = DINOSAUR_FACTS[Math.floor(Math.random() * DINOSAUR_FACTS.length)];
    
    return book;
}

// Create popup for dinosaur facts
export function createFactPopup(fact) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    popup.style.color = 'white';
    popup.style.padding = '20px';
    popup.style.borderRadius = '10px';
    popup.style.maxWidth = '400px';
    popup.style.textAlign = 'center';
    popup.style.zIndex = '1000';
    popup.style.fontFamily = 'Arial, sans-serif';
    popup.style.border = '2px solid #FFD700';
    popup.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3)';

    popup.innerHTML = `
        <h2 style="color: #FFD700; margin-bottom: 15px;">${fact.title}</h2>
        <p style="font-size: 16px; line-height: 1.5;">${fact.fact}</p>
        <button style="
            background-color: #FFD700;
            color: black;
            border: none;
            padding: 10px 20px;
            margin-top: 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        ">Close</button>
    `;

    // Add click handler to close button
    const closeButton = popup.querySelector('button');
    closeButton.onclick = () => {
        document.body.removeChild(popup);
    };

    return popup;
} 