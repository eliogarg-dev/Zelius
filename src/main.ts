import { mount } from 'svelte';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import './app.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
