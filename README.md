# TikTok Video Downloader

A modern web application built with Next.js for downloading TikTok videos easily and safely.

## Features

- 🎯 Simple and intuitive user interface
- 📹 Download TikTok videos in multiple qualities
- 🚀 Fast and efficient video processing
- 🔒 Secure and private (no video storage on servers)
- 📱 Responsive design for mobile and desktop
- 💾 Download history tracking
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- **Frontend**: React 18, Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Language**: TypeScript
- **Validation**: Custom URL validation
- **Linting**: ESLint

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Navigate to the project directory:

```bash
cd tiktok-video-downloader
```

2. Install dependencies (already done):

```bash
npm install
```

3. The `.env.local` file is already created with default values.

4. Initialize the database:

```bash
npm run prisma:migrate
```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build

Build for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── download/     # Video download endpoint
│   │   └── health/       # Health check endpoint
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/
│   ├── DownloadForm.tsx  # Download form component
│   ├── Header.tsx        # Header component
│   └── Footer.tsx        # Footer component
├── lib/
│   ├── api/
│   │   └── tiktok.ts     # TikTok API integration
│   └── utils/
│       └── validation.ts # URL validation utilities
└── types/
    └── index.ts          # TypeScript type definitions

prisma/
├── schema.prisma         # Database schema
└── migrations/           # Database migrations
```

## API Endpoints

### POST `/api/download`

Download a TikTok video.

**Request:**

```json
{
  "url": "https://www.tiktok.com/@username/video/123456789",
  "quality": "high"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Video information fetched successfully",
  "data": {
    "videoId": "123456789",
    "url": "https://www.tiktok.com/@username/video/123456789",
    "downloadUrl": "...",
    "title": "Video Title",
    "author": "Username",
    "downloadedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### GET `/api/health`

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Configuration

### Environment Variables

- `DATABASE_URL`: SQLite database URL (default: `file:./dev.db`)
- `NEXT_PUBLIC_API_URL`: API base URL (default: `http://localhost:3000`)

## Database

The application uses SQLite with Prisma ORM. The database schema includes:

- `DownloadRecord`: Stores information about downloaded videos

## Development Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm start             # Start production server
npm run lint          # Run ESLint
```

## Important Notes

1. **Video Downloading**: The current implementation is a template. To actually download TikTok videos, you'll need to:

   - Set up a backend service (Python with yt-dlp, or similar)
   - Use a third-party TikTok API
   - Implement proper video extraction and conversion

2. **Legal Considerations**:

   - Ensure compliance with TikTok's Terms of Service
   - Respect copyright and intellectual property rights
   - This tool is for educational purposes only

3. **Rate Limiting**: Consider implementing rate limiting for production use

4. **Security**: Add authentication and validation for production deployment

## Roadmap

- [ ] Integration with external video download APIs
- [ ] User authentication and profiles
- [ ] Download history persistence
- [ ] Batch downloading
- [ ] Video format conversion options
- [ ] Advanced filtering and search
- [ ] Admin dashboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Disclaimer

This tool is provided as-is for educational purposes. The authors are not responsible for any misuse or legal issues arising from its use. Users are responsible for ensuring they comply with all applicable laws and respect content creators' rights.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
