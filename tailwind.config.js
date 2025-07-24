/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{html,js,svelte,ts}',
    ],
    theme: {
        extend: {
            colors: {
                'base-100': 'var(--color-base-100)',
                'base-200': 'var(--color-base-200)',
                'base-300': 'var(--color-base-300)',
            },
        },
    },
    plugins: [require('daisyui')],
    daisyui: {
        themes: ["simplecontainer"],
    },
}