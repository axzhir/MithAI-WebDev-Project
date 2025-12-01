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
window.clearData = function() {
    if (confirm("Delete all local data?")) {
        localStorage.removeItem('mithai_recipes');
        window.location.reload();
    }
};

window.exportData = function() {
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

// Initialize filter button handlers (robust wiring in case inline onclicks don't work)
function initFilters() {
    const cuisineWrapper = document.getElementById('cuisineFilters');
    const typeWrapper = document.getElementById('typeFilters');

    if (cuisineWrapper) {
        Array.from(cuisineWrapper.querySelectorAll('button')).forEach(btn => {
            btn.removeEventListener('click', cuisineFilterHandler);
            btn.addEventListener('click', cuisineFilterHandler);
        });
    }

    if (typeWrapper) {
        Array.from(typeWrapper.querySelectorAll('button')).forEach(btn => {
            btn.removeEventListener('click', typeFilterHandler);
            btn.addEventListener('click', typeFilterHandler);
        });
    }

    function cuisineFilterHandler(e) {
        const val = e.currentTarget.getAttribute('data-value') || e.currentTarget.innerText || 'all';
        // normalize the 'All Cuisines' text to 'all'
        const filterVal = /all/i.test(val) ? 'all' : val.trim();
        filterRecipes(filterVal, 'cuisine', e.currentTarget);
    }

    function typeFilterHandler(e) {
        const val = e.currentTarget.getAttribute('data-value') || e.currentTarget.innerText || 'all';
        const filterVal = /all/i.test(val) ? 'all' : val.trim();
        filterRecipes(filterVal, 'type', e.currentTarget);
    }
}

// Call initFilters after definitions so filters work even if inline onclicks are missing
document.addEventListener('DOMContentLoaded', () => {
    try {
        initFilters();
    } catch (err) {
        console.warn('initFilters failed', err);
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

    // Create cards using DOM nodes and preload images to avoid broken-image icons
    recipes.forEach(r => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-sm-6';

        const card = document.createElement('div');
        card.className = 'recipe-card h-100 shadow-sm hover-shadow';

        const img = document.createElement('img');
        img.className = 'card-img-top';
        img.alt = r.title;
        img.style.height = '200px';
        img.style.objectFit = 'cover';
        // Use placeholder first to avoid broken icon while we check the real image
        img.src = '/images/butterchicken.png';

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

        // Resolve and set the image asynchronously (tries the original, then TheMealDB, then placeholder)
        ensureImageAvailable(r.image, r.title).then(resolved => {
            if (resolved) img.src = resolved;
        }).catch(() => {
            img.src = '/images/butterchicken.png';
        });
    });

    const countEl = document.getElementById('resultCount');
    if (countEl) countEl.innerText = `Showing ${recipes.length} recipes`;
}

// --- GLOBAL HANDLERS (Attached to Window for Safety) ---

// NEW FUNCTION: Simulates AI filling the form
// Add this function to the global window scope:
window.demoAIFill = function() {
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

// Generate a simulated AI recipe, attempt to attach a TheMealDB image, and optionally save
window.generateAIRecipe = async function(prompt = '', save = true) {
    const title = prompt || `AI Recipe ${new Date().toLocaleString()}`;
    const simulated = {
        id: 'ai-' + Date.now(),
        title,
        cuisine: 'Fusion',
        mealType: 'Dinner',
        desc: 'A quick AI-generated recipe. Edit as you like.',
        ingredients: ['1 cup Imagination', '2 tbsp Simplicity'],
        instructions: ['Combine ingredients.', 'Cook to taste.'],
        image: '',
        type: 'ai'
    };

    try {
        // Ask ensureImageAvailable with no original URL so it will search TheMealDB by title
        const resolved = await ensureImageAvailable(null, simulated.title);
        simulated.image = resolved || PLACEHOLDER_IMAGE;
    } catch (err) {
        console.warn('AI image resolution failed:', err);
        simulated.image = PLACEHOLDER_IMAGE;
    }

    // Push into global and optionally persist
    GLOBAL_RECIPES.unshift(simulated);
    if (save) saveRecipeToLocal(simulated);
    refreshAllViews();

    if (save) {
        // Navigate to recipes list so user sees the saved AI recipe
        window.location.href = 'recipes.html';
    } else {
        // If not saving, open detail view (optional UX)
        console.log('Generated (not saved):', simulated.title);
    }
};

window.filterRecipes = function(filterValue, filterType, buttonElement) {
    // Determine filter value: prefer a data-value attribute on the button (exact), otherwise use passed value
    let fv = 'all';
    try {
        if (buttonElement && buttonElement.dataset && buttonElement.dataset.value) {
            fv = buttonElement.dataset.value;
        } else if (typeof filterValue === 'string') {
            fv = filterValue;
        }
    } catch (e) {
        fv = filterValue || 'all';
    }

    // Normalize
    if (/all/i.test(fv)) fv = 'all';

    // UI Update - safely find the parent group
    let parentGroup = null;
    if (buttonElement && buttonElement.parentElement) parentGroup = buttonElement.parentElement;
    else parentGroup = (filterType === 'cuisine') ? document.getElementById('cuisineFilters') : document.getElementById('typeFilters');

    if (parentGroup) {
        Array.from(parentGroup.children).forEach(btn => btn.classList.remove('active'));
        if (buttonElement) buttonElement.classList.add('active');
    }

    // Logic - case-insensitive matching for robustness
    let filtered = [];
    if (fv === 'all') {
        filtered = GLOBAL_RECIPES;
    } else {
        if (filterType === 'cuisine') {
            filtered = GLOBAL_RECIPES.filter(r => (r.cuisine || '').toLowerCase() === fv.toLowerCase());
        } else if (filterType === 'type') {
            filtered = GLOBAL_RECIPES.filter(r => (r.mealType || '').toLowerCase() === fv.toLowerCase());
        }
    }

    renderGrid(filtered, 'recipe-grid');
};

window.handleRecipeSubmit = function(e) {
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
        // Try to obtain a better image silently: original URL -> TheMealDB by title -> placeholder
        (async () => {
            try {
                const resolved = await ensureImageAvailable(newRecipe.image, newRecipe.title);
                newRecipe.image = resolved || '/images/butterchicken.png';
            } catch (err) {
                console.warn('Image resolution failed, using placeholder', err);
                newRecipe.image = '/images/butterchicken.png';
            }
            saveRecipeToLocal(newRecipe);
            alert("Recipe Saved!");
            window.location.href = 'recipes.html';
        })();
    } catch (err) {
        alert("Error saving: " + err.message);
    }
};

window.handleRemixSubmit = function(e) {
    e.preventDefault();
    alert("Remix Saved!");
    window.location.href = 'recipes.html';
};

// --- HELPERS ---

const PLACEHOLDER_IMAGE = '/images/butterchicken.png';

// Check if an image URL is fetchable and returns an image content-type
async function fetchImageOk(url) {
    if (!url) return false;
    try {
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) return false;
        const ct = res.headers.get('content-type') || '';
        return ct.startsWith('image');
    } catch (err) {
        return false;
    }
}

// Query TheMealDB by meal name and return the thumbnail URL if found
async function searchTheMealDBByName(name) {
    if (!name) return null;
    try {
        const resp = await fetch(API_URL + encodeURIComponent(name));
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data || !data.meals || data.meals.length === 0) return null;
        return data.meals[0].strMealThumb || null;
    } catch (err) {
        console.warn('TheMealDB lookup failed:', err);
        return null;
    }
}

// Ensure we have a working image URL. Tries the provided URL, then TheMealDB by title, then placeholder.
async function ensureImageAvailable(url, title) {
    // 1) Try provided URL
    if (url && await fetchImageOk(url)) return url;

    // 2) Try TheMealDB by title
    const found = await searchTheMealDBByName(title);
    if (found && await fetchImageOk(found)) return found;

    // 3) Fallback placeholder
    return PLACEHOLDER_IMAGE;
}

function setupSearch(recipes) {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = recipes.filter(r => r.title.toLowerCase().includes(term));
        renderGrid(filtered, 'recipe-grid');
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