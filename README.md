# Hieren AI - Advanced Multimodal AI Chat Assistant

A modern, high-performance web application built with Next.js, featuring real-time streaming, multimodal AI capabilities, and a beautiful liquid glassmorphism design. Powered by Groq's Llama 4 Scout for ultra-fast inference.

## 🚀 Features

### Core Capabilities
- **Real-time Streaming Chat** - SSE-based streaming with < 200ms TTFT (Time to First Token)
- **Image Vision Analysis** - Upload and analyze images with Groq's vision capabilities
- **Document Processing** - Q&A with PDF and DOCX files
- **Web Search Integration** - Real-time information retrieval via Tavily API
- **Session Management** - Persistent conversation history with Vercel Postgres

### Design & UX
- **Liquid Glassmorphism** - Premium frosted glass UI with animated backgrounds
- **Mobile-First Responsive** - Seamless experience on mobile, tablet, and desktop
- **Dark Mode** - Eye-friendly dark theme with gradient accents
- **Smooth Animations** - Fluid interactions and transitions throughout

### Architecture
- **Type-Safe** - Full TypeScript implementation with strict type checking
- **Modular Components** - Reusable React components with clear separation of concerns
- **Edge Runtime** - Optimized for Vercel's edge functions for global latency
- **Secure API Proxy** - API keys protected via serverless functions

## 📋 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 3.4 + Custom Glassmorphism
- **State Management**: Zustand 4.5
- **Markdown**: react-markdown with syntax highlighting

### Backend & Infrastructure
- **Runtime**: Node.js (Vercel Edge)
- **Database**: Vercel Postgres with Drizzle ORM
- **API Integration**: Groq Cloud, Tavily Search
- **Deployment**: Vercel (serverless + edge)

### AI & Processing
- **LLM**: Groq Llama 4 Scout (17B parameters)
- **STT**: Groq Whisper V3 Turbo (future phase)
- **TTS**: Groq/PlayAI (future phase)
- **Search**: Tavily API
- **Document Processing**: PDF.js, mammoth
- **Image Compression**: browser-image-compression

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18.x or higher
- npm, yarn, or pnpm
- Vercel account (for deployment)
- Groq API key (https://groq.com)
- Tavily API key (https://tavily.com)

### Local Development

1. **Clone the repository**
   ```bash
   cd /home/karel/code/hieren-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your API keys in `.env.local`:
   ```env
   GROQ_API_KEY=gsk_your_key_here
   TAVILY_API_KEY=tvly_your_key_here
   POSTGRES_URL=postgres://...
   ```

4. **Set up database** (if using Vercel Postgres)
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Project Structure

```
hieren-ai/
├── app/
│   ├── (chat)/              # Chat interface routes
│   ├── api/
│   │   ├── chat/            # Streaming chat endpoint
│   │   ├── vision/          # Image analysis endpoint
│   │   ├── search/          # Web search endpoint
│   │   └── sessions/        # Session management
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/
│   ├── chat/                # Chat-specific components
│   ├── ui/                  # Reusable UI components
│   └── background/          # Animated background
├── lib/
│   ├── api/                 # API client wrappers
│   ├── store/               # Zustand state management
│   ├── utils/               # Utilities (image, document, etc.)
│   └── db/                  # Database setup
├── types/                   # TypeScript type definitions
└── public/                  # Static assets
```

## 🔑 API Endpoints

### Chat
- `POST /api/chat` - Stream chat completions

### Vision
- `POST /api/vision` - Analyze images with vision model

### Search
- `POST /api/search` - Web search via Tavily

### Sessions
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/[id]` - Get session
- `PUT /api/sessions/[id]` - Update session
- `DELETE /api/sessions/[id]` - Delete session
- `GET /api/sessions/[id]/messages` - Get messages
- `POST /api/sessions/[id]/messages` - Save message

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial Hieren AI deployment"
   git push origin main
   ```

2. **Import in Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Configure environment variables

3. **Set environment variables in Vercel**
   ```
   GROQ_API_KEY: your_groq_key
   TAVILY_API_KEY: your_tavily_key
   POSTGRES_URL: your_postgres_url
   POSTGRES_PRISMA_URL: your_postgres_prisma_url
   POSTGRES_URL_NON_POOLING: your_postgres_non_pooling_url
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| TTFT (Time to First Token) | < 200ms | ✅ Configured |
| LCP (Largest Contentful Paint) | < 2.5s | ⚙️ To optimize |
| CLS (Cumulative Layout Shift) | < 0.1 | ✅ Optimized |
| FID (First Input Delay) | < 100ms | ✅ Edge runtime |
| Bundle Size (gzipped) | < 200KB | ⚙️ Tree-shaking enabled |

## 🔒 Security

### API Key Management
- API keys stored in Vercel environment variables (never exposed)
- Serverless functions proxy all external API calls
- No secrets in client-side code

### Data Privacy
- User documents processed locally (no server storage)
- Chat history stored in encrypted Vercel Postgres
- HTTPS/TLS enforced on all connections

## 🧪 Testing

### Local Testing
```bash
# Type check
npm run type-check

# Lint
npm run lint

# Manual testing
npm run dev
# Visit http://localhost:3000
```

### Verification Checklist
- [ ] Send text message and verify streaming response
- [ ] Upload image and analyze with vision
- [ ] Upload PDF/DOCX and ask questions
- [ ] Search with query requiring web lookup
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Verify error handling for failed requests

## 📝 Configuration

### Tailwind Customization
Edit `tailwind.config.ts` to customize:
- Glass effect opacity/blur values
- Gradient colors
- Animation timings
- Responsive breakpoints

### Groq Model Settings
Modify in `lib/api/groqClient.ts`:
- Model name
- Temperature (0.0-1.0)
- Max tokens (1-4096)
- Top P (0.0-1.0)

## 🚧 Future Phases

### Phase 11: Voice Mode
- WebRTC real-time audio
- Groq Whisper STT
- TTS synthesis
- Voice Activity Detection (VAD)

### Phase 12: Advanced Search
- Multiple tool integration
- Agentic loop with self-correction
- Fact verification

### Phase 13: Collaboration
- Real-time multi-user sessions
- Shared conversation links
- Export & save functionality

### Phase 14: Offline Mode
- Service worker caching
- IndexedDB local storage
- Sync when online

## 📚 Documentation

- [LLD Document](/LLD-Aplikasi-Flutter-AI-Groq.pdf) - Original design specification
- [Groq API Docs](https://console.groq.com/docs) - Model and API reference
- [Tavily API Docs](https://docs.tavily.com) - Search API documentation
- [Next.js Docs](https://nextjs.org/docs) - Framework documentation

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Troubleshooting

### "GROQ_API_KEY not set"
- Ensure `.env.local` file exists with proper API keys
- Verify keys are not wrapped in quotes

### "Streaming not working"
- Check browser DevTools → Network → see SSE stream
- Verify Groq API key is valid
- Check rate limiting with `retry-after` headers

### "Database connection error"
- Verify POSTGRES_URL is correct
- Run `npm run db:push` to apply migrations
- Check Vercel Postgres is provisioned

### "Image compression fails"
- Check image size (max 20MB raw)
- Verify image format (JPG, PNG, GIF, WebP)
- Try reducing image resolution

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Check existing documentation
- Review error messages in browser console

---

**Made with ❤️ using Groq's Llama 4 Scout and Vercel**
