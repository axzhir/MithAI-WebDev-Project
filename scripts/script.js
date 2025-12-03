async function generateAIRecipe() {
    const aiButton = document.getElementById('ai-generate-btn');
    const originalButtonText = aiButton.innerHTML;
    aiButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';

    try {
        const titleInput = document.getElementById('title');
        const searchTerm = titleInput.value.trim();
        let meal;

        if (searchTerm) {
            // If there's a search term, use the search API
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.meals) {
                meal = data.meals[0]; // Use the first result
            } else {
                alert(`No recipes found for "${searchTerm}". We'll generate a random one for you!`);
            }
        }

        // If no meal was found by search or if there was no search term, get a random one
        if (!meal) {
            const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            meal = data.meals[0];
        }

        document.getElementById('title').value = meal.strMeal || '';
        document.getElementById('desc').value = `A delicious ${meal.strArea} ${meal.strCategory} dish.`;

        // Set cuisine
        const cuisineSelect = document.getElementById('cuisine');
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
        cuisineSelect.value = areaToCuisine[area] || 'General';

        // A smarter mapping for Meal Type
        const mealTypeSelect = document.getElementById('mealType');
        const category = meal.strCategory;
        const tags = (meal.strTags || '').toLowerCase().split(',');

        if (category === 'Breakfast') {
            mealTypeSelect.value = 'Breakfast';
        } else if (category === 'Dessert' || tags.includes('dessert')) {
            mealTypeSelect.value = 'Dessert';
        } else if (category === 'Snack' || tags.includes('snack')) {
            mealTypeSelect.value = 'Snack';
        } else if (category === 'Starter' || category === 'Side') {
            mealTypeSelect.value = 'Lunch'; // Or Snack, depending on preference
        } else {
            mealTypeSelect.value = 'Dinner'; // Default for main courses like "Beef", "Chicken", "Seafood"
        }

        // Collect ingredients
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            if (ingredient) {
                ingredients.push(ingredient);
            }
        }
        document.getElementById('ingredients').value = ingredients.join(', ');

        // Format instructions
        const instructions = meal.strInstructions.split('\n').filter(line => line.trim() !== '').map((line, index) => `${index + 1}. ${line.trim()}`).join('\n');
        document.getElementById('instructions').value = instructions;

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

    // 2. Get existing recipes from local storage, or initialize an empty array
    const recipes = JSON.parse(localStorage.getItem('mithai-recipes')) || [];

    // 3. Add the new recipe to the beginning of the array
    recipes.unshift(recipe);

    // 4. Save the updated array back to local storage
    localStorage.setItem('mithai-recipes', JSON.stringify(recipes));

    // 5. Redirect to the home page to see the new recipe
    window.location.href = 'index.html';
}