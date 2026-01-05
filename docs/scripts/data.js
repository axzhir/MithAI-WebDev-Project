// Data file: Handles API, LocalStorage, and Default Data Structure

// CONFIGURATION
const API_URL = "https://www.themealdb.com/api/json/v1/1/search.php?s=";

// --- DEFAULT DATA (Static Fallback) ---
const DEFAULT_DATA = [
    {
        id: 'default-1',
        title: "Indian Butter Chicken",
        cuisine: "South Asian",
        mealType: "Dinner",
        desc: "A rich, creamy tomato-based curry with tender chicken.",
        image: "https://www.themealdb.com/images/media/meals/uryqmg1511798439.jpg",
        ingredients: ["500g Chicken", "2 tbsp Butter", "1 cup Tomato Puree"],
        instructions: ["Marinate chicken.", "Cook sauce.", "Combine."],
        type: 'static'
    },
    {
        id: 'default-2',
        title: "Classic Pancakes",
        cuisine: "Western",
        mealType: "Breakfast",
        desc: "Fluffy breakfast pancakes served with syrup.",
        image: "https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg",
        ingredients: ["2 cups Flour", "2 Eggs", "1.5 cups Milk"],
        instructions: ["Mix batter.", "Fry on pan.", "Serve."],
        type: 'static'
    }
];

// --- LOCAL STORAGE (CRUD) ---
function getLocalRecipes() {
    try {
        const stored = localStorage.getItem('mithai_recipes');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Local Storage Corrupted:", e);
        return [];
    }
}

function saveRecipeToLocal(recipe) {
    try {
        const current = getLocalRecipes();
        current.push(recipe);
        localStorage.setItem('mithai_recipes', JSON.stringify(current));
    } catch (e) {
        alert("Could not save. LocalStorage might be full or disabled.");
    }
}

// --- API FETCH (Asynchronous JS Requirement) ---
async function fetchApiRecipes() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); 
        const response = await fetch(API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("API Network Error");
        const data = await response.json();
        return data.meals || [];
    } catch (error) {
        console.warn("API Error (Using Defaults):", error);
        return [];
    }
}