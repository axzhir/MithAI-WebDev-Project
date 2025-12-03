// --- MithAI Application Main Script ---
// This file handles all application logic, including data management,
// UI rendering, and event handling.

// --- 1. CONFIGURATION & GLOBAL STATE ---
const API_URL = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
const PLACEHOLDER_IMAGE = '/images/butterchicken.png';
let GLOBAL_RECIPES = [];

// --- 2. DATA HANDLING ---

const DEFAULT_DATA = [
    {
        id: 'default-bread',
        title: "Bread",
        cuisine: "General",
        mealType: "Staple",
        desc: "A simple, classic loaf of homemade bread.",
        image: "https://www.themealdb.com/images/media/meals/wprvrw1511641295.jpg",
        ingredients: ["500g Strong White Flour", "7g Dried Yeast", "1 tsp Salt", "300ml Warm Water"],
        instructions: ["Mix flour, yeast, and salt in a large bowl.", "Make a well in the center and pour in the warm water.", "Mix until you have a soft, sticky dough.", "Knead for 10 minutes on a floured surface until smooth.", "Place in a lightly oiled bowl, cover, and let rise for 1 hour.", "Bake at 220C (425F) for 25-30 minutes."],
        type: 'static'
    }
];

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

// --- 3. INITIALIZATION & ROUTING ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log("MithAI App Initializing...");

    // Immediately display loading spinners where needed
    if (document.getElementById('recent-recipes-container')) showLoading('recent-recipes-container');
    if (document.getElementById('recipe-grid')) showLoading('recipe-grid');

    try {
        // 1. Load Local & Default data for an instant UI
        const localMeals = getLocalRecipes();
        GLOBAL_RECIPES = [...localMeals, ...DEFAULT_DATA];
        refreshAllViews(); // Initial render

        // 2. Fetch API data in the background
        const apiMeals = await fetchApiRecipes();
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

        // 3. Combine all data and re-render the UI
        GLOBAL_RECIPES = [...localMeals, ...DEFAULT_DATA, ...formattedApi];
        refreshAllViews();

    } catch (err) {
        console.error("Critical Initialization Error:", err);
        // Optionally, show an error message to the user
    } finally {
        // Failsafe to remove any lingering spinners
        document.querySelectorAll('.spinner-border').forEach(el => {
            if (el.parentElement) el.parentElement.innerHTML = "";
        });
    }
});

function refreshAllViews() {
    // This function acts as a simple "router" to update content on the current page.
    if (document.getElementById('recent-recipes-container')) {
        renderGrid(GLOBAL_RECIPES.slice(0, 3), 'recent-recipes-container'); // Show 3 on homepage
    }
    if (document.getElementById('recipe-grid')) {
        renderGrid(GLOBAL_RECIPES, 'recipe-grid');
        setupSearch(GLOBAL_RECIPES);
        initFilters();
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

// --- 4. UI RENDERING ---

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

function renderGrid(recipes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; // Clear previous content

    if (!recipes || recipes.length === 0) {
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

    // Create cards using DOM elements for better performance and security
    recipes.forEach(r => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-sm-6';

        const card = document.createElement('div');
        card.className = 'recipe-card h-100 shadow-sm hover-shadow'; // <-- The hover class is here!

        const img = document.createElement('img');
        img.className = 'card-img-top';
        img.alt = r.title;
        img.style.height = '200px';
        img.style.objectFit = 'cover';
        img.src = PLACEHOLDER_IMAGE; // Start with a placeholder

        const body = document.createElement('div');
        body.className = 'card-body p-4';

        const head = document.createElement('div');
        head.className = 'd-flex justify-content-between align-items-start mb-2';

        const h5 = document.createElement('h5');
        h5.className = 'fw-bold font-serif mb-0 text-truncate';
        h5.style.maxWidth = '70%';
        h5.innerText = r.title;

        const small = document.createElement('small');
        small.className = 'badge bg-light text-dark border';
        small.innerText = r.mealType || 'General';

        head.appendChild(h5);
        head.appendChild(small);

        const p = document.createElement('p');
        p.className = 'text-muted small mb-3 text-truncate';
        p.innerText = r.desc || '';

        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary';
        badge.innerText = r.cuisine || '';

        const link = document.createElement('a');
        link.className = 'stretched-link';
        link.href = `recipe-detail.html?id=${r.id}`;

        body.appendChild(head);
        body.appendChild(p);
        body.appendChild(badge);
        body.appendChild(link);

        card.appendChild(img);
        card.appendChild(body);
        col.appendChild(card);
        container.appendChild(col);

        // Asynchronously load the correct image to prevent broken icons
        ensureImageAvailable(r.image, r.title).then(resolvedUrl => {
            img.src = resolvedUrl;
        });
    });

    const countEl = document.getElementById('resultCount');
    if (countEl) countEl.innerText = `Showing ${recipes.length} recipes`;
}

// --- 5. EVENT HANDLERS & UI HELPERS ---

// Attach handlers to the window object so inline HTML `onclick` can find them.
window.handleRecipeSubmit = function (e) {
    e.preventDefault();
    try {
        const newRecipe = {
            id: 'local-' + Date.now(),
            title: document.getElementById('title').value,
            cuisine: document.getElementById('cuisine').value,
            mealType: document.getElementById('mealType').value,
            desc: document.getElementById('desc').value,
            ingredients: document.getElementById('ingredients').value.split(','),
            instructions: document.getElementById('instructions').value.split('\n'),
            image: '', // Will be resolved
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
    // In a real app, you would save the remixed recipe here.
    alert("Remix Saved!");
    window.location.href = 'recipes.html';
};

window.demoAIFill = function () {
    const titleInput = document.getElementById('title');
    if (!titleInput) {
        alert("Wait! The form is not fully loaded yet. Try again in a second.");
        return;
    }
    alert("AI Generating Recipe... (Simulating 1-second response)");
    setTimeout(() => {
        titleInput.value = "Spiced Blueberry Waffles (AI Remix)";
        document.getElementById('desc').value = "A perfect breakfast featuring warm spices and fresh berries.";
        document.getElementById('cuisine').value = "Western";
        document.getElementById('mealType').value = "Breakfast";
        document.getElementById('ingredients').value = "Flour, Eggs, Milk, Blueberries, Cinnamon, Baking Powder";
        document.getElementById('instructions').value = "1. Mix dry ingredients.\n2. Add wet ingredients and fold in blueberries.\n3. Pour into hot waffle iron.\n4. Serve immediately with syrup.";
    }, 1000);
};

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

window.filterRecipes = function (filterValue, filterType) {
    let filtered = [];
    if (filterValue === 'all') {
        filtered = GLOBAL_RECIPES;
    } else {
        filtered = GLOBAL_RECIPES.filter(r => (r[filterType] || '').toLowerCase() === filterValue.toLowerCase());
    }
    renderGrid(filtered, 'recipe-grid');
};

function setupSearch(recipes) {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = recipes.filter(r => r.title.toLowerCase().includes(term));
        renderGrid(filtered, 'recipe-grid');
    });
}

function initFilters() {
    // This function can be expanded to add event listeners dynamically
    // instead of relying on inline onclick, which is a more robust pattern.
}

function loadDetail(allRecipes) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const recipe = allRecipes.find(r => r.id == id);

    if (recipe) {
        document.getElementById('detail-title').innerText = recipe.title;
        document.getElementById('detail-desc').innerText = recipe.desc;
        document.getElementById('detail-cuisine').innerText = recipe.cuisine;
        document.getElementById('remix-btn').href = `create-remix.html?parentId=${recipe.id}`;
        ensureImageAvailable(recipe.image, recipe.title).then(url => {
            document.getElementById('detail-img').src = url;
        });

        const instList = document.getElementById('detail-instructions');
        if (recipe.instructions && instList) {
            instList.innerHTML = recipe.instructions.map(step => `<li class="list-group-item">${step}</li>`).join('');
        }

        const ingList = document.getElementById('detail-ingredients');
        if (recipe.ingredients && ingList) {
            ingList.innerHTML = recipe.ingredients.map(ing => `<li class="list-group-item">${ing}</li>`).join('');
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
        const cuisine = r.cuisine || 'General';
        counts[cuisine] = (counts[cuisine] || 0) + 1;
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

async function ensureImageAvailable(url, title) {
    // Helper to check if an image URL is valid
    async function fetchImageOk(imgUrl) {
        if (!imgUrl) return false;
        try {
            const res = await fetch(imgUrl, { method: 'HEAD' }); // HEAD is faster
            return res.ok && (res.headers.get('content-type') || '').startsWith('image');
        } catch (err) { return false; }
    }

    // 1. Try the provided URL
    if (await fetchImageOk(url)) return url;

    // 2. If that fails, try searching TheMealDB by title
    try {
        const resp = await fetch(API_URL + encodeURIComponent(title));
        const data = await resp.json();
        const foundUrl = data?.meals?.[0]?.strMealThumb;
        if (await fetchImageOk(foundUrl)) return foundUrl;
    } catch (e) { }

    // 3. Fallback to the placeholder
    return PLACEHOLDER_IMAGE;
}