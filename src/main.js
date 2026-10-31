import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')

fetch('https://dummyjson.com/recipes')
.then(res => res.json())
.then(console.log);

fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=cake')
  .then(res => res.json())
  .then(data => console.log("TheMealDB Recipes:", data));

fetch('https://jsonplaceholder.typicode.com/posts/1')
  .then(response => response.json())
  .then(json => console.log(json))