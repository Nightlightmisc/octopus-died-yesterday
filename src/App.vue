<script setup>
import { onMounted, ref } from 'vue'

const isOpen = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('')
const categories = ref([])
const recipes = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const selectedRecipe = ref(null)

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' }
]

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const closeMenu = () => {
  isOpen.value = false
}

// Fetch available categories for the dropdown
const fetchCategories = async () => {
  try {
    const response = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?c=list')
    const data = await response.json()
    categories.value = data.meals || []
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

const fetchRecipes = async (query = '', category = '') => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    let endpoint = ''

    if (category) {
      // Filter by category endpoint
      endpoint = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`
    } else {
      // Search by name endpoint
      const searchTerm = query.trim() || 'chicken'
      endpoint = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`
    }

    const response = await fetch(endpoint)

    if (!response.ok) {
      throw new Error('Failed to fetch recipes. Please try again.')
    }

    const data = await response.json()

    // Note: The filter by category endpoint returns summary objects (idMeal, strMeal, strMealThumb) 
    // without full ingredients/instructions. We handle both cases gracefully!
    const mealList = data.meals || []
    
    if (category) {
      // If filtering by category, fetch full details for each meal so modal works properly
      recipes.value = await Promise.all(
        mealList.slice(0, 12).map(async (meal) => {
          const detailRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
          const detailData = await detailRes.json()
          const fullMeal = detailData.meals ? detailData.meals[0] : meal
          return formatMealData(fullMeal)
        })
      )
    } else {
      recipes.value = mealList.map(formatMealData)
    }

  } catch (error) {
    errorMessage.value = error.message
    console.error('Error fetching recipes:', error)
  } finally {
    isLoading.value = false
  }
}

// Helper to format meal object structure
const formatMealData = (meal) => {
  const ingredients = []

  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`]
    const measure = meal[`strMeasure${i}`]

    if (ingredient?.trim()) {
      ingredients.push(
        `${measure?.trim() ? measure.trim() + ' ' : ''}${ingredient.trim()}`
      )
    }
  }

  const instructions = meal.strInstructions
    ? meal.strInstructions
        .split(/\r?\n/)
        .filter(step => step.trim())
    : []

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    cuisine: meal.strArea || 'General',
    category: meal.strCategory || 'General',
    image: meal.strMealThumb,
    caloriesPerServing: 'N/A',
    ingredients,
    instructions
  }
}

const handleSearch = () => {
  selectedCategory.value = '' // Reset category filter when searching by text
  fetchRecipes(searchQuery.value, '')
}

const handleCategoryChange = () => {
  searchQuery.value = '' // Reset search input when filtering by category
  fetchRecipes('', selectedCategory.value)
}

const openRecipeModal = recipe => {
  selectedRecipe.value = recipe
}

const closeRecipeModal = () => {
  selectedRecipe.value = null
}

onMounted(() => {
  fetchCategories()
  fetchRecipes()
})
</script>

<template>
  <div class="header-wrapper">
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-brand">
          <router-link to="/"class="logo" @click="closeMenu">FoodForFabolous</router-link>
          <router-link to="/" class="logo2" @click="closeMenu"> // Make your days better</router-link>
        </div>

        <button class="menu-toggle" :aria-expanded="isOpen" aria-label="Toggle navigation" @click="toggleMenu">
          <span
            class="burger-bar"
            :class="{ 'open-top': isOpen }"
          ></span>

          <span
            class="burger-bar"
            :class="{ 'open-mid': isOpen }"
          ></span>

          <span
            class="burger-bar"
            :class="{ 'open-bot': isOpen }"
          ></span>
        </button>

        <ul
          class="nav-links"
          :class="{ 'nav-active': isOpen }"
        >
          <li
            v-for="link in navLinks"
            :key="link.name"
            class="nav-item"
          >
            <router-link
              :to="link.path"
              class="nav-link"
              active-class="active-link"
              @click="closeMenu"
            >
              {{ link.name }}
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <div class="search-menu-bar">
      <form
        class="search-form"
        @submit.prevent="handleSearch"
      >
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Find a recipe..."
          class="search-input"
        />

        <!-- Categories Dropdown -->
        <select
          v-model="selectedCategory"
          class="category-select"
          @change="handleCategoryChange"
        >
          <option value="">All Categories</option>
          <option
            v-for="cat in categories"
            :key="cat.strCategory"
            :value="cat.strCategory"
          >
            {{ cat.strCategory }}
          </option>
        </select>

        <button
          type="submit"
          class="search-button"
        >
          Search
        </button>
      </form>
    </div>
  </div>

  <main class="recipe-content">
    <div
      v-if="isLoading"
      class="status-msg"
    >
      Loading recipes...
    </div>

    <div
      v-else-if="errorMessage"
      class="status-msg error"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else-if="recipes.length === 0"
      class="status-msg"
    >
      No recipes found.
    </div>

    <div
      v-else
      class="recipes-grid"
    >
      <div
        v-for="recipe in recipes"
        :key="recipe.id"
        class="recipe-card"
        @click="openRecipeModal(recipe)"
      >
        <img
          :src="recipe.image"
          :alt="recipe.name"
          class="recipe-img"
        />

        <p>Food name: {{ recipe.name }}</p>
        <p>Country: {{ recipe.cuisine }}</p>
      </div>
    </div>

    <div
      v-if="selectedRecipe"
      class="modal-overlay"
      @click.self="closeRecipeModal"
    >
      <div class="modal-content">
        <button
          class="close-modal"
          aria-label="Close recipe"
          @click="closeRecipeModal"
        >
          &times;
        </button>

        <img
          :src="selectedRecipe.image"
          :alt="selectedRecipe.name"
          class="modal-img"
        />

        <h2>{{ selectedRecipe.name }}</h2>

        <div class="modal-details-badge">
          <span>
            <strong>Cuisine:</strong>
            {{ selectedRecipe.cuisine }}
          </span>

          <span>
            <strong>Category:</strong>
            {{ selectedRecipe.category }}
          </span>
        </div>

        <div class="section-block">
          <h3>Ingredients</h3>

          <ul>
            <li
              v-for="(ingredient, index) in selectedRecipe.ingredients"
              :key="index"
            >
              {{ ingredient }}
            </li>
          </ul>
        </div>

        <div class="section-block">
          <h3>Instructions</h3>

          <ol>
            <li
              v-for="(step, index) in selectedRecipe.instructions"
              :key="index"
            >
              {{ step }}
            </li>
          </ol>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.header-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  width: 100%;
  background-color: #1a1a1ae7;
  backdrop-filter: blur(1rem);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.recipe-content {
  width: 100%;
  max-width: 1200px;
  margin: 145px auto 0;
  padding: 2rem;
  box-sizing: border-box;
}

.recipes-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
  align-items: stretch;
}

.recipe-card {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 1rem;
  background: #1a1a1a;
  border: 1px solid #2d2d2d;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  transition: border-color 0.3s ease, transform 0.2s ease;
}

.recipe-card:hover {
  border-color: #4e42b8;
  transform: translateY(-3px);
}

.recipe-card p {
  margin: 0.25rem 0;
}

.recipe-img {
  display: block;
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 6px;
}

.status-msg {
  padding: 2rem;
  text-align: center;
  color: #fff;
}

.error {
  color: #ff6b6b;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 2rem;
  background-color: #1f1f1f;
  border: 1px solid #333;
  border-radius: 12px;
  color: #fff;
}

.close-modal {
  position: absolute;
  top: 1rem;
  right: 1.2rem;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 30vh;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
}

.modal-img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.modal-details-badge {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1rem 0;
  padding: 0.6rem;
  background: #2a2a2a;
  border-radius: 6px;
  font-size: 0.85rem;
}

.section-block {
  margin-top: 1.5rem;
}

.section-block h3 {
  margin-bottom: 0.5rem;
  color: #4e42b8;
}

.section-block ul,
.section-block ol {
  padding-left: 1.2rem;
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.5;
}

.navbar {
  width: 100%;
  padding: 0.8rem 2rem;
  box-sizing: border-box;
  background-color: transparent;
  color: #fff;
}

.nav-container {
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-links {
  display: flex;
  gap: 2rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav-link {
  color: #ccc;
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.3s ease;
}

.nav-link:hover,
.active-link {
  color: #4e42b8;
}

.search-menu-bar {
  display: flex;
  width: 100%;
  padding: 0.6rem 2rem 1rem;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border-top: 1px solid #2d2d2d;
}

.search-form {
  display: flex;
  width: 100%;
  max-width: 600px;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
  min-width: 0;
  padding: 0.6rem 1rem;
  outline: none;
  background-color: #1a1a1a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  font-size: 0.75rem;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  border-color: #4e42b8;
}

/* Added style for category select dropdown */
.category-select {
  padding: 0.6rem 1rem;
  outline: none;
  background-color: #1a1a1a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.category-select:focus {
  border-color: #4e42b8;
}

.search-button {
  padding: 0.6rem 1.2rem;
  background-color: #4e42b8;
  border: none;
  border-radius: 6px;
  color: #c8c8c8;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.search-button:hover {
  background-color: #5b4ed6;
}

.menu-toggle {
  display: none;
  width: 24px;
  height: 18px;
  padding: 0;
  flex-direction: column;
  justify-content: space-between;
  background: transparent;
  border: none;
  cursor: pointer;
}

.burger-bar {
  width: 100%;
  height: 2px;
  background-color: #fff;
  transition: all 0.3s ease;
}

.logo {
  color: #fff;
  font-size: 1.5rem;
  font-weight: bold;
  text-decoration: none;
}

.logo2 {
  color: #888;
  font-size: 0.9rem;
  font-weight: normal;
  text-decoration: none;
}

@media (max-width: 900px) {
  .recipes-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 769px) {
  .menu-toggle {
    display: flex;
  }

  .recipe-content {
    margin-top: 135px;
  }

  .nav-links {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    display: flex;
    width: 100%;
    max-height: 0;
    overflow: hidden;
    flex-direction: column;
    gap: 0;
    background-color: #1a1a1a;
    transition: max-height 0.3s ease-in-out;
  }

  .nav-active {
    max-height: 150px;
  }

  .nav-item {
    width: 100%;
    text-align: center;
  }

  .nav-link {
    display: block;
    padding: 1rem 0;
    border-bottom: 1px solid #2a2a2a;
  }

  .open-top {
    transform: translateY(8px) rotate(45deg);
  }

  .open-mid {
    opacity: 0;
  }

  .open-bot {
    transform: translateY(-8px) rotate(-45deg);
  }
}

@media (max-width: 550px) {
  .recipes-grid {
    grid-template-columns: 1fr;
  }

  .recipe-content {
    padding: 1rem;
  }

  .navbar {
    padding: 0.8rem 1rem;
  }

  .nav-brand {
    gap: 0.5rem;
  }

  .logo {
    font-size: 1.25rem;
  }

  .logo2 {
    font-size: 0.75rem;
  }

  .search-menu-bar {
    padding: 0.6rem 1rem 1rem;
  }

  .modal-content {
    padding: 1.5rem;
  }
}

/* CUSTOM SCROLLBAR */
::-webkit-scrollbar {
  width: 5px;
}

::-webkit-scrollbar-track {
  background: #5e5e5e;
}

::-webkit-scrollbar-thumb {
  background: #888;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>