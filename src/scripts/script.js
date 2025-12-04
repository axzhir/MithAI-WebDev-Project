// Show remix button only for cuisine recipes
document.addEventListener('DOMContentLoaded', function () {
    var remixBtn = document.getElementById('remix-btn');
    var cuisine = document.getElementById('detail-cuisine');
    if (remixBtn && cuisine && cuisine.textContent && cuisine.textContent !== 'Cuisine' && cuisine.textContent !== '') {
        remixBtn.style.display = '';
    } else if (remixBtn) {
        remixBtn.style.display = 'none';
    }
});
async function generateAIRecipe() {
    const aiButton = document.getElementById('ai-generate-btn');
    const originalButtonText = aiButton.innerHTML;
    aiButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';

    try {
        const titleInput = document.getElementById('title');
        const searchTerm = titleInput.value.trim();
        let meal;

        const API_KEY = '65232507';
        const API_BASE = 'https://www.themealdb.com/api/json/v2';
        const API_SEARCH = `${API_BASE}/${API_KEY}/search.php?s=`;
        const API_RANDOM = `${API_BASE}/${API_KEY}/random.php`;

        if (searchTerm) {
            // If there's a search term, use the search API (cache-busted)
            const response = await fetch(`${API_SEARCH}${encodeURIComponent(searchTerm)}&t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.meals && data.meals.length) {
                // Pick a random match so repeated clicks vary even with same search term
                const idx = Math.floor(Math.random() * data.meals.length);
                meal = data.meals[idx];
            } else {
                alert(`No recipes found for "${searchTerm}". We'll generate a random one for you!`);
            }
        }

        // If no meal was found by search or if there was no search term, get a random one
        if (!meal) {
            // Cache-bust the random endpoint so each click returns a fresh result
            const response = await fetch(`${API_RANDOM}?t=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            meal = data.meals[0];
        }

        // Create small random variation to avoid identical wording on repeated clicks
        const flavorTextVariants = [
            'A delicious',
            'A mouthwatering',
            'A comforting',
            'An irresistible',
            'A savory',
            'A delightful'
        ];
        const pickedFlavor = flavorTextVariants[Math.floor(Math.random() * flavorTextVariants.length)];

        const titleEl = document.getElementById('title');
        const descEl = document.getElementById('desc');
        const cuisineEl = document.getElementById('cuisine');
        const mealTypeEl = document.getElementById('mealType');
        const ingredientsEl = document.getElementById('ingredients');
        const instructionsEl = document.getElementById('instructions');

        const generatedDesc = `${pickedFlavor} ${meal.strArea} ${meal.strCategory} dish.`;
        if (titleEl) titleEl.value = meal.strMeal || '';
        if (descEl) descEl.value = generatedDesc;

        // Set cuisine
        const area = meal.strArea;
        // A simple mapping from area to cuisine category
        const areaToCuisine = {
            'British': 'European', 'American': 'Western', 'French': 'European', 'Canadian': 'Western',
            'Jamaican': 'Western', 'Chinese': 'East Asian', 'Dutch': 'European', 'Egyptian': 'African',
            'Greek': 'European', 'Indian': 'South Asian', 'Irish': 'European', 'Italian': 'European',
            'Japanese': 'East Asian', 'Kenyan': 'African', 'Malaysian': 'South Asian', 'Mexican': 'Western',
            'Moroccan': 'African', 'Croatian': 'European', 'Norwegian': 'European', 'Portuguese': 'European',
            'Russian': 'European', 'Argentinian': 'Western', 'Spanish': 'European', 'Slovakian': 'European',
            'Thai': 'South Asian', 'Vietnamese': 'South Asian', 'Turkish': 'Middle Eastern', 'Syrian': 'Middle Eastern',
            'Tunisian': 'African', 'Polish': 'European', 'Filipino': 'South Asian'
        };
        // Default from area mapping
        let resolvedCuisine = areaToCuisine[area] || 'General';

        // Keyword-based overrides from the description/title
        const textForInference = `${generatedDesc} ${meal.strMeal || ''}`.toLowerCase();
        const keywordCuisineMap = [
            { keywords: ['saudi', 'arabian', 'ksa'], cuisine: 'Middle Eastern' },
            { keywords: ['korean'], cuisine: 'East Asian' },
            { keywords: ['japanese', 'sushi', 'ramen'], cuisine: 'East Asian' },
            { keywords: ['chinese', 'szechuan', 'cantonese'], cuisine: 'East Asian' },
            { keywords: ['indian', 'masala', 'curry'], cuisine: 'South Asian' },
            { keywords: ['pakistani'], cuisine: 'South Asian' },
            { keywords: ['thai'], cuisine: 'South Asian' },
            { keywords: ['vietnamese', 'pho', 'banh'], cuisine: 'South Asian' },
            { keywords: ['turkish'], cuisine: 'European' },
            { keywords: ['syrian', 'lebanese'], cuisine: 'Middle Eastern' },
            { keywords: ['moroccan'], cuisine: 'African' },
            { keywords: ['egyptian'], cuisine: 'African' },
            { keywords: ['italian', 'pasta'], cuisine: 'European' },
            { keywords: ['french'], cuisine: 'European' },
            { keywords: ['spanish', 'tapas'], cuisine: 'European' },
            { keywords: ['mexican', 'taco'], cuisine: 'Western' },
            { keywords: ['american', 'bbq'], cuisine: 'Western' }
        ];

        for (const entry of keywordCuisineMap) {
            if (entry.keywords.some(k => textForInference.includes(k))) {
                resolvedCuisine = entry.cuisine;
                break;
            }
        }

        if (cuisineEl) cuisineEl.value = resolvedCuisine;

        // A smarter mapping for Meal Type
        const category = meal.strCategory;
        const tags = (meal.strTags || '').toLowerCase().split(',');

        if (mealTypeEl) {
            if (category === 'Breakfast') {
                mealTypeEl.value = 'Breakfast';
            } else if (category === 'Dessert' || tags.includes('dessert')) {
                mealTypeEl.value = 'Dessert';
            } else if (category === 'Snack' || tags.includes('snack')) {
                mealTypeEl.value = 'Snack';
            } else if (category === 'Starter' || category === 'Side') {
                mealTypeEl.value = 'Lunch'; // Or Snack, depending on preference
            } else {
                mealTypeEl.value = 'Dinner'; // Default for main courses like "Beef", "Chicken", "Seafood"
            }
        }

        // Collect ingredients
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            if (ingredient) {
                ingredients.push(ingredient);
            }
        }
        if (ingredientsEl) ingredientsEl.value = ingredients.join(', ');

        // Format instructions
        const instructions = (meal.strInstructions || '')
            .split('\n')
            .filter(line => line.trim() !== '')
            .map((line, index) => `${index + 1}. ${line.trim()}`)
            .join('\n');
        if (instructionsEl) instructionsEl.value = instructions;

    } catch (error) {
        console.error("Failed to generate AI recipe:", error);
        alert("Could not generate a recipe. Please try again later.");
    } finally {
        aiButton.innerHTML = originalButtonText;
    }
}

function handleRecipeSubmit(event) {
    event.preventDefault();

    // 1. Get all values from the form
    const recipe = {
        id: Date.now(), // Unique ID for the recipe
        title: document.getElementById('title').value,
        description: document.getElementById('desc').value,
        cuisine: document.getElementById('cuisine').value,
        mealType: document.getElementById('mealType').value,
        ingredients: document.getElementById('ingredients').value.split(',').map(item => item.trim()),
        instructions: document.getElementById('instructions').value.split('\n').map(item => item.trim()),
        // You can add an image property here later
        // image: 'path/to/image.jpg' 
    };

    // 2. Get existing recipes from local storage (canonical key), or initialize an empty array
    const RECIPES_KEY = 'mithai_recipes';
    const recipes = JSON.parse(localStorage.getItem(RECIPES_KEY)) || [];

    // 3. Add the new recipe to the beginning of the array
    recipes.unshift(recipe);

    // 4. Save the updated array back to local storage (canonical key)
    localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
    // Write to legacy key for backward compatibility (optional)
    localStorage.setItem('mithai-recipes', JSON.stringify(recipes));

    // 5. Redirect to the home page to see the new recipe
    window.location.href = 'index.html';
}