// DEBUG CHECK: If you don't see this console log, your HTML cannot find this file.
console.log("MithAI Script Loaded Successfully");

// CONFIGURATION
const API_URL = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
let GLOBAL_RECIPES = [];

// --- 0. DEFAULT DATA ---
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

// --- 1. DATA HANDLING ---

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

// Make these Global so HTML buttons can find them
window.clearData = function () {
    if (confirm("Delete all local data?")) {
        localStorage.removeItem('mithai_recipes');
        window.location.reload();
    }
};

window.exportData = function () {
    const data = getLocalRecipes();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", "my_recipes.json");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
};

async function fetchApiRecipes() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec timeout
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

// --- 2. INITIALIZATION ---

// New function to display spinner animation
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-orange" role="status"></div>
                <p class="text-muted small mt-2">Loading experiments...</p>
            </div>
        `;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Loaded - Initializing App...");

    // Immediately display loading state for Home and Recipes page containers
    if (document.getElementById('recent-recipes-container')) {
        showLoading('recent-recipes-container');
    }
    if (document.getElementById('recipe-grid')) {
        showLoading('recipe-grid');
    }

    try {
        // 1. Load Local & Default Immediately (Instant Render of static/local data)
        const localMeals = getLocalRecipes();
        GLOBAL_RECIPES = [...localMeals, ...DEFAULT_DATA];

        // 2. Initial Render (Clears the temporary spinner and shows local content)
        refreshAllViews();

        // 3. Fetch API in Background
        const apiMeals = await fetchApiRecipes();

        // 4. Format API Data
        const formattedApi = apiMeals.map(m => ({
            id: m.idMeal,
            title: m.strMeal,
            cuisine: m.strArea || "General",
            mealType: m.strCategory || "Dinner",
            image: m.strMealThumb,
            desc: "Imported from TheMealDB",
            ingredients: [m.strIngredient1, m.strIngredient2, m.strIngredient3].filter(Boolean),
            instructions: [m.strInstructions ? m.strInstructions.slice(0, 100) + "..." : "See online"],
            type: 'api'
        }));

        // 5. Update Global Data & Re-render
        GLOBAL_RECIPES = [...localMeals, ...DEFAULT_DATA, ...formattedApi];
        refreshAllViews();

    } catch (err) {
        console.error("Critical Error:", err);
    } finally {
        // FAILSAFE: Remove any loading elements left over
        document.querySelectorAll('.spinner-border').forEach(el => {
            if (el.parentElement) el.parentElement.innerHTML = "";
        });
    }
});

// Helper to update whatever page we are on
function refreshAllViews() {
    if (document.getElementById('recent-recipes-container')) {
        renderGrid(GLOBAL_RECIPES.slice(0, 4), 'recent-recipes-container');
    }
    if (document.getElementById('recipe-grid')) {
        renderGrid(GLOBAL_RECIPES, 'recipe-grid');
        setupSearch(GLOBAL_RECIPES);
    }
    if (document.getElementById('detail-title')) {
        loadDetail(GLOBAL_RECIPES);
    }
    if (document.getElementById('remixTitle')) {
        setupRemixPage(GLOBAL_RECIPES);
    }
    if (document.getElementById('cuisineChart')) {
        initChart(GLOBAL_RECIPES);
    }
}

// --- 3. UI FUNCTIONS ---

function renderGrid(recipes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (!recipes || recipes.length === 0) {
        // Custom Empty State with CTA
        container.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <p class="lead">There are no recipes here.</p>
                <p>Click "Start Cooking" or the button below to create some.</p>
                <a href="create-recipe.html" class="btn btn-dark rounded-pill hover-orange">
                    <i class="fas fa-plus"></i> Create Your First Recipe
                </a>
            </div>
        `;
        return;
    }

    recipes.forEach(r => {
        container.innerHTML += `
            <div class="col-md-4 col-sm-6">
                <div class="recipe-card h-100 shadow-sm hover-shadow">
                    <img src="${r.image || 'https://placehold.co/600x400'}" class="card-img-top" style="height: 200px; object-fit: cover" alt="${r.title}">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="fw-bold font-serif mb-0 text-truncate" style="max-width: 70%;">${r.title}</h5>
                            <small class="badge bg-light text-dark border">${r.mealType || 'General'}</small>
                        </div>
                        <p class="text-muted small mb-3 text-truncate">${r.desc}</p>
                        <span class="badge bg-secondary">${r.cuisine}</span>
                        <a href="recipe-detail.html?id=${r.id}" class="stretched-link"></a>
                    </div>
                </div>
            </div>
        `;
    });

    const countEl = document.getElementById('resultCount');
    if (countEl) countEl.innerText = `Showing ${recipes.length} recipes`;
}

// --- GLOBAL HANDLERS (Attached to Window for Safety) ---

// NEW FUNCTION: Simulates AI filling the form
// Add this function to the global window scope:
window.demoAIFill = function () {
    // Check if the form elements are available before proceeding
    const titleInput = document.getElementById('title');
    if (!titleInput) {
        alert("Wait! The page hasn't finished loading the form yet. Try again in a second.");
        return;
    }

    alert("AI Generating Recipe... (Simulating 1-second response)");

    // Simulate AI results populating the form fields
    setTimeout(() => {
        titleInput.value = "Spiced Blueberry Waffles (AI Remix)";
        document.getElementById('desc').value = "A perfect breakfast featuring warm spices and fresh berries.";
        document.getElementById('cuisine').value = "Western";
        document.getElementById('mealType').value = "Breakfast";
        document.getElementById('ingredients').value = "Flour, Eggs, Milk, Blueberries, Cinnamon, Baking Powder";
        document.getElementById('instructions').value = "1. Mix dry ingredients.\n2. Add wet ingredients and fold in blueberries.\n3. Pour into hot waffle iron.\n4. Serve immediately with syrup.";
    }, 1000);
};

window.filterRecipes = function (filterValue, filterType, buttonElement) {
    // UI Update
    const parentGroup = buttonElement.parentElement;
    Array.from(parentGroup.children).forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');

    // Logic
    let filtered = [];
    if (filterValue === 'all') {
        filtered = GLOBAL_RECIPES;
    } else {
        if (filterType === 'cuisine') {
            filtered = GLOBAL_RECIPES.filter(r => r.cuisine === filterValue);
        } else if (filterType === 'type') {
            filtered = GLOBAL_RECIPES.filter(r => r.mealType === filterValue);
        }
    }
    renderGrid(filtered, 'recipe-grid');
};

window.handleRecipeSubmit = function (e) {
    e.preventDefault();
    try {
        const newRecipe = {
            id: Date.now(),
            title: document.getElementById('title').value,
            cuisine: document.getElementById('cuisine').value,
            mealType: document.getElementById('mealType').value,
            desc: document.getElementById('desc').value,
            ingredients: document.getElementById('ingredients').value.split(','),
            instructions: document.getElementById('instructions').value.split('\n'),
            image: 'https://placehold.co/600x400',
            type: 'local'
        };
        saveRecipeToLocal(newRecipe);
        alert("Recipe Saved!");
        window.location.href = 'recipes.html';
    } catch (err) {
        alert("Error saving: " + err.message);
    }
};

window.handleRemixSubmit = function (e) {
    e.preventDefault();
    alert("Remix Saved!");
    window.location.href = 'recipes.html';
};

// --- HELPERS ---

function setupSearch(recipes) {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase();
        // Trigger a filter refresh which will include the search term
        filterRecipes(null, null, document.querySelector('.list-group-item.active'), null);
    });
}

function loadDetail(allRecipes) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const recipe = allRecipes.find(r => r.id == id);

    if (recipe) {
        document.getElementById('detail-title').innerText = recipe.title;
        document.getElementById('detail-desc').innerText = recipe.desc;
        document.getElementById('detail-cuisine').innerText = recipe.cuisine;
        document.getElementById('detail-img').src = recipe.image || 'https://placehold.co/600x400';
        document.getElementById('remix-btn').href = `create-remix.html?parentId=${recipe.id}`;

        const instList = document.getElementById('detail-instructions');
        if (recipe.instructions && instList) {
            instList.innerHTML = '';
            recipe.instructions.forEach(step => {
                instList.innerHTML += `<li class="list-group-item">${step}</li>`;
            });
        }

        const ingList = document.getElementById('detail-ingredients');
        if (recipe.ingredients && ingList) {
            ingList.innerHTML = '';
            recipe.ingredients.forEach(ing => {
                ingList.innerHTML += `<li class="list-group-item">${ing}</li>`;
            });
        }
    }
}

function setupRemixPage(allRecipes) {
    const params = new URLSearchParams(window.location.search);
    const parentId = params.get('parentId');
    const parent = allRecipes.find(r => r.id == parentId);
    if (parent) {
        document.getElementById('parent-title').innerText = parent.title;
        document.getElementById('remixTitle').value = parent.title + " (Remix)";
    }
}

function initChart(recipes) {
    const ctx = document.getElementById('cuisineChart');
    if (!ctx) return;

    const counts = {};
    recipes.forEach(r => {
        counts[r.cuisine] = (counts[r.cuisine] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#ea580c', '#fdba74', '#fb923c', '#fed7aa', '#1c1917']
            }]
        }
    });
}