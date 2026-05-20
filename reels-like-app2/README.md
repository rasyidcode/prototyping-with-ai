# Reels-Like Web App

A modern, smooth vertical scrolling web application inspired by popular social media reels, built with React.js and Tailwind CSS.

## Features

- **Smooth Vertical Scrolling** - Full-screen reel cards with snap scrolling for a seamless experience
- **Interactive UI** - Like, comment, and share buttons with engagement counters
- **Gradient Backgrounds** - Each reel features unique gradient backgrounds
- **Responsive Design** - Optimized for mobile and desktop viewing
- **Hidden Scrollbar** - Clean visual interface without scrollbar distractions
- **Hover Effects** - Interactive buttons with smooth transitions

## Tech Stack

- **Frontend Framework**: React 19.2.0
- **Styling**: Tailwind CSS 4.1.18
- **Build Tool**: Vite 7.2.4
- **JavaScript**: ES Modules

## Project Structure

```
reels-like-app2/
├── src/
│   ├── components/
│   │   ├── Reel.jsx          # Individual reel card component
│   │   └── ReelsList.jsx     # Container for all reels with scrolling
│   ├── App.jsx               # Main application component
│   ├── App.css               # App-level styles
│   ├── index.css             # Tailwind CSS imports
│   └── main.jsx              # React entry point
├── public/                   # Static assets
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js         # PostCSS configuration
├── vite.config.js            # Vite configuration
└── package.json              # Project dependencies
```

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to `http://localhost:5173` (or the URL shown in terminal)

## Development

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

### Customizing Reels

Edit the `reels` array in `src/components/ReelsList.jsx` to add or modify reel content:

```javascript
const reels = [
  {
    id: 1,
    title: 'Your Title',
    description: 'Your description',
    author: 'author_name',
    likes: '2.4K',
    comments: '156',
    shares: '432',
    bgColor: 'bg-gradient-to-br from-purple-600 to-pink-600'
  },
  // Add more reels...
];
```

## Features Explanation

### Smooth Scrolling
- Uses Tailwind's `scroll-smooth` class for smooth vertical scrolling
- `snap-y snap-mandatory` classes create full-page snap points
- Hidden scrollbar using CSS to maintain clean UI

### Reel Components
- Each reel takes full viewport height (`h-screen`)
- Contains gradient background, content area, and action buttons
- Action buttons (like, comment, share) positioned on the right side with counters

### Responsive Design
- Mobile-first approach with Tailwind utilities
- All elements scale appropriately for different screen sizes
- Touch-friendly button sizes and spacing

## Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory ready for deployment.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- Video support in reels
- User profiles and interactions
- Comment threads
- Content recommendations
- Search functionality
- Theme customization

## License

MIT

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
