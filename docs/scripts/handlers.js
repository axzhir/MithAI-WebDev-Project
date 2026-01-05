// Handlers file: Contains functions called by HTML onclick events

// --- FORM SUBMISSION & BUTTON HANDLERS ---

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
        saveRecipeToLocal(newRecipe); // Uses function from data.js
        alert("Recipe Saved!");
        window.location.href = 'cookbook.html';
    } catch (err) {
        alert("Error saving: " + err.message);
    }
};

window.handleRemixSubmit = function (e) {
    e.preventDefault();
    alert("Remix Saved!");
    window.location.href = 'cookbook.html';
};

window.demoAIFill = function () {
    const titleInput = document.getElementById('title');
    if (!titleInput) {
        alert("Wait! The form is not fully loaded yet. Try again in a second.");
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