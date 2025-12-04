// --- MiTHAI Application Main Script ---
// This file handles all application logic, including data management,
// UI rendering, and event handling.

// --- 1. CONFIGURATION & GLOBAL STATE ---
const API_KEY = '65232507';
const API_BASE = 'https://www.themealdb.com/api/json/v2';
const API_SEARCH = `${API_BASE}/${API_KEY}/search.php?s=`;
const API_RANDOM = `${API_BASE}/${API_KEY}/random.php`;
const PLACEHOLDER_IMAGE = '/images/butterchicken.png';
let GLOBAL_RECIPES = [];
let GLOBAL_REMIXES = [];

// --- 2. DATA HANDLING ---

const DEFAULT_DATA = [
    {
        id: 'default-bread',
        title: "Bread",
        cuisine: "General",
        mealType: "Staple",
        desc: "A simple, classic loaf of homemade bread.",
        // Use TheMealDB ingredient image for a clear bread visual
        image: "https://www.themealdb.com/images/ingredients/Bread.png",
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

function getLocalRemixes() {
    try {
        const stored = localStorage.getItem('mithai-remixes') || localStorage.getItem('mithai_remixes');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Local Remix Storage Corrupted:", e);
        return [];
    }
}

function saveRemixToLocal(remix) {
    try {
        const current = getLocalRemixes();
        current.push(remix);
        localStorage.setItem('mithai-remixes', JSON.stringify(current));
    } catch (e) {
        alert("Could not save remix. LocalStorage might be full or disabled.");
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
        const response = await fetch(API_SEARCH, { signal: controller.signal });
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
    console.log("MiTHAI App Initializing...");

    // Immediately display loading spinners where needed
    if (document.getElementById('recent-recipes-container')) showLoading('recent-recipes-container');
    if (document.getElementById('recipe-grid')) showLoading('recipe-grid');

    try {
        // 1. Load Local & Default data for an instant UI
        const localMeals = getLocalRecipes();
        const localRemixes = GLOBAL_REMIXES = getLocalRemixes();
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
    // Stats page: compute from user-made data only
    if (document.getElementById('stats-root')) {
        const userRecipesOnly = getLocalRecipes();
        initStats(userRecipesOnly, GLOBAL_REMIXES);
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
    try {
        const params = new URLSearchParams(window.location.search);
        const parentId = params.get('parentId') || document.getElementById('parentId')?.value || null;
        const remix = {
            id: Date.now(),
            parentId,
            title: document.getElementById('remixTitle')?.value || 'Untitled Remix',
            changesLog: document.getElementById('remixLog')?.value || '',
            rating: parseInt(document.getElementById('remixRating')?.value || '0', 10) || 0,
            dateCreated: new Date().toISOString()
        };
        saveRemixToLocal(remix);
        alert("Remix Saved!");
        window.location.href = 'recipes.html';
    } catch (err) {
        alert("Error saving remix: " + err.message);
    }
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
    // Confirmation is handled by the modal in stats.html
    // Clear only user-made data keys and reload
    localStorage.removeItem('mithai_recipes');
    localStorage.removeItem('mithai-remixes');
    setTimeout(() => window.location.reload(), 300);
};

window.exportData = function () {
    const recipes = getLocalRecipes();
    const remixes = getLocalRemixes();
    const payload = { recipes, remixes, exportedAt: new Date().toISOString() };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", "mithai-data.json");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => { alert('Data exported as mithai-data.json'); }, 200);
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

function initChart() {
    const ctx = document.getElementById('cuisineChart');
    if (!ctx) return;

    // Only use user-made recipes
    const localMeals = getLocalRecipes();
    const counts = {};
    (localMeals || []).forEach(r => {
        const cuisine = r.cuisine || 'General';
        counts[cuisine] = (counts[cuisine] || 0) + 1;
    });

    const hasData = Object.keys(counts).length > 0;
    const labels = hasData ? Object.keys(counts) : ['No Data'];
    const data = hasData ? Object.values(counts) : [1];
    const palette = ['#ea580c', '#fdba74', '#fb923c', '#fed7aa', '#1c1917', '#20c997', '#0dcaf0', '#ffc107', '#dc3545', '#6f42c1', '#198754', '#6610f2'];
    const colors = hasData ? labels.map((_, i) => palette[i % palette.length]) : ['#e9ecef'];

    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors
            }]
        },
        options: {
            cutout: hasData ? '60%' : '85%',
            plugins: {
                legend: { display: hasData },
                tooltip: { enabled: hasData }
            }
        }
    });

    if (!hasData) {
        const c = chart.ctx;
        const { left, right, top, bottom } = chart.chartArea;
        c.save();
        c.font = '600 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        c.fillStyle = '#6c757d';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('No Data', (left + right) / 2, (top + bottom) / 2);
        c.restore();
    }
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
        const resp = await fetch(API_SEARCH + encodeURIComponent(title));
        const data = await resp.json();
        const foundUrl = data?.meals?.[0]?.strMealThumb;
        if (await fetchImageOk(foundUrl)) return foundUrl;
    } catch (e) { }

    // 3. Fallback to the placeholder
    return PLACEHOLDER_IMAGE;
}

// --- 6. ANALYTICS / STATS ---
function initStats(recipes, remixes) {
    try {
        // If data sets are empty, explicitly set "N/A" states and clear the table
        const noRecipes = !Array.isArray(recipes) || recipes.length === 0;
        const noRemixes = !Array.isArray(remixes) || remixes.length === 0;

        if (noRecipes) {
            const elIng = document.getElementById('stat-most-ingredient');
            if (elIng) elIng.textContent = 'N/A';
        }
        if (noRemixes) {
            const elAvg = document.getElementById('stat-avg-rating');
            if (elAvg) elAvg.textContent = 'N/A';
            const elTop = document.getElementById('stat-top-recipe');
            if (elTop) elTop.textContent = 'N/A';
            const elCommon = document.getElementById('stat-common-change');
            if (elCommon) elCommon.textContent = 'N/A';
            const tbody = document.getElementById('ratingsTbody');
            if (tbody) tbody.innerHTML = '';
        }

        // 1) Most used ingredient across recipes
        const freq = {};
        (recipes || []).forEach(r => {
            const list = Array.isArray(r.ingredients) ? r.ingredients : [];
            list.forEach(raw => {
                const name = String(raw || '')
                    .toLowerCase()
                    .replace(/[^a-z\s]/g, '')
                    .trim();
                if (!name) return;
                freq[name] = (freq[name] || 0) + 1;
            });
        });
        const mostIngredient = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        const elIng = document.getElementById('stat-most-ingredient');
        if (elIng && !noRecipes) elIng.textContent = capitalizeWords(mostIngredient);

        // 2) Remix ratings
        const byRecipe = {};
        (remixes || []).forEach(rx => {
            if (!rx.parentId) return;
            byRecipe[rx.parentId] = byRecipe[rx.parentId] || { sum: 0, n: 0 };
            byRecipe[rx.parentId].sum += Number(rx.rating || 0);
            byRecipe[rx.parentId].n += 1;
        });
        const avgAcross = Object.values(byRecipe).reduce((acc, v) => acc + (v.n ? v.sum / v.n : 0), 0);
        const avgRating = (Object.keys(byRecipe).length ? (avgAcross / Object.keys(byRecipe).length) : 0).toFixed(2);
        const elAvg = document.getElementById('stat-avg-rating');
        if (elAvg && !noRemixes) elAvg.textContent = `${avgRating}/5`;

        // 3) Top rated recipe (by average of its remixes)
        let best = null;
        Object.entries(byRecipe).forEach(([id, v]) => {
            const avg = v.sum / v.n;
            if (!best || avg > best.avg) best = { id, avg };
        });
        const titleMap = Object.fromEntries((recipes || []).map(r => [String(r.id), r.title]));
        const elTop = document.getElementById('stat-top-recipe');
        if (elTop && !noRemixes) elTop.textContent = best ? `${titleMap[best.id] || 'Unknown'} (${best.avg.toFixed(2)}/5)` : 'N/A';

        // 4) Most common remix change keyword
        const changeKeywords = ['added', 'reduced', 'increased', 'removed', 'substituted', 'swapped', 'replaced'];
        const changeFreq = {};
        (remixes || []).forEach(rx => {
            const log = String(rx.changesLog || '').toLowerCase();
            changeKeywords.forEach(k => { if (log.includes(k)) changeFreq[k] = (changeFreq[k] || 0) + 1; });
        });
        const common = Object.entries(changeFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        const elCommon = document.getElementById('stat-common-change');
        if (elCommon && !noRemixes) elCommon.textContent = common === '—' ? 'N/A' : capitalizeWords(common);

        // 5) Ratings table
        const tbody = document.getElementById('ratingsTbody');
        if (tbody) {
            tbody.innerHTML = '';
            const rows = Object.entries(byRecipe)
                .map(([id, v]) => ({ id, avg: v.sum / v.n, n: v.n }))
                .sort((a, b) => b.avg - a.avg);
            if (!noRemixes) {
                rows.forEach(rw => {
                    const tr = document.createElement('tr');
                    const tdName = document.createElement('td');
                    tdName.textContent = titleMap[rw.id] || rw.id;
                    const tdAvg = document.createElement('td');
                    tdAvg.textContent = rw.avg.toFixed(2);
                    const tdN = document.createElement('td');
                    tdN.textContent = String(rw.n);
                    tr.appendChild(tdName);
                    tr.appendChild(tdAvg);
                    tr.appendChild(tdN);
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (err) {
        console.warn('Stats initialization failed:', err);
    }
}

function capitalizeWords(s) {
    return String(s || '').replace(/\b\w/g, m => m.toUpperCase());
}