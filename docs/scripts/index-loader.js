document.addEventListener('DOMContentLoaded', () => {
    // You need to have two containers in your index.html with these IDs
    const recentRecipesContainer = document.getElementById('recent-recipes-container');
    const myRecipesContainer = document.getElementById('my-recipes-container');

    const recipes = JSON.parse(localStorage.getItem('mithai-recipes')) || [];

    if (recipes.length === 0) {
        const placeholder = '<p class="text-muted">No recipes saved yet. <a href="pages/create-recipe.html">Create one now!</a></p>';
        if (recentRecipesContainer) recentRecipesContainer.innerHTML = placeholder;
        if (myRecipesContainer) myRecipesContainer.innerHTML = placeholder;
        return;
    }

    // Function to create a recipe card
    const createRecipeCard = (recipe) => {
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${recipe.title}</h5>
                        <p class="card-text">${recipe.description.substring(0, 100)}...</p>
                        <a href="pages/recipe.html?id=${recipe.id}" class="btn btn-sm btn-outline-dark">View Recipe</a>
                    </div>
                </div>
            </div>
        `;
    };

    // Populate "Recent Experiments" (e.g., the first 3)
    if (recentRecipesContainer) recentRecipesContainer.innerHTML = recipes.slice(0, 3).map(createRecipeCard).join('');

    // Populate "My Recipes" (all of them)
    if (myRecipesContainer) myRecipesContainer.innerHTML = recipes.map(createRecipeCard).join('');
});