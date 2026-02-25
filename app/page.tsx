'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import { KnowledgeBaseUpload } from '@/components/KnowledgeBaseUpload'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FiHome,
  FiList,
  FiFileText,
  FiSettings,
  FiSearch,
  FiSend,
  FiCopy,
  FiExternalLink,
  FiTrash2,
  FiCheck,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiPlay,
  FiDatabase,
  FiActivity,
  FiClock,
  FiHash,
  FiMenu,
  FiX,
  FiMessageSquare,
  FiVideo,
  FiWifi,
  FiBookOpen,
  FiMaximize2,
  FiMinimize2,
  FiLoader,
  FiZap
} from 'react-icons/fi'

// --- Constants ---
const AGENT_ID = '699efe3b25a09abf2a0825a8'
const RAG_ID = '699efe23c9ac7bb71c09d774'

// --- TypeScript Interfaces ---
interface TranscriptData {
  video_title: string
  video_url: string
  transcript_text: string
  word_count: number
  processing_date: string
  status: string
}

interface SearchResult {
  video_title: string
  video_url: string
  snippet: string
  relevance_score: number
}

interface AgentResponse {
  message?: string
  transcript_data?: TranscriptData | null
  search_results?: SearchResult[] | null
  summary?: string | null
  action_type?: 'transcribe' | 'search' | 'summarize' | 'list' | 'error' | 'greeting'
}

interface StoredTranscript {
  id: string
  video_title: string
  video_url: string
  transcript_text: string
  word_count: number
  processing_date: string
  status: string
}

type ViewType = 'dashboard' | 'library' | 'detail' | 'config'

interface ConfigState {
  apiKey: string
  webhookUrl: string
  phoneNumber: string
  autoSummarize: boolean
  maxTranscriptLength: number
  responseLanguage: string
}

// --- Markdown Renderer ---
function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm leading-relaxed">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// --- Sample Data ---
const SAMPLE_TRANSCRIPTS: StoredTranscript[] = [
  {
    id: 'sample-1',
    video_title: 'Understanding Machine Learning Fundamentals',
    video_url: 'https://youtube.com/watch?v=sample1',
    transcript_text: 'In this video we explore the core concepts of machine learning, including supervised learning, unsupervised learning, and reinforcement learning. We discuss how neural networks function at a basic level and examine real-world applications in healthcare, finance, and autonomous vehicles. The presentation covers gradient descent, backpropagation, and the importance of data preprocessing. We also look at common pitfalls in model training and how to avoid overfitting through regularization techniques.',
    word_count: 4520,
    processing_date: '2025-02-24T10:30:00Z',
    status: 'completed',
  },
  {
    id: 'sample-2',
    video_title: 'React 19 New Features Deep Dive',
    video_url: 'https://youtube.com/watch?v=sample2',
    transcript_text: 'Today we look at React 19 and its exciting new features. Server components, the new use hook, and improvements to suspense boundaries are covered in detail. We walk through practical code examples showing how these features simplify your codebase and improve performance. The talk also addresses migration strategies from older React versions.',
    word_count: 3180,
    processing_date: '2025-02-23T14:15:00Z',
    status: 'completed',
  },
  {
    id: 'sample-3',
    video_title: 'Building APIs with FastAPI and Python',
    video_url: 'https://youtube.com/watch?v=sample3',
    transcript_text: 'This tutorial walks through building production-ready APIs using FastAPI. We cover routing, dependency injection, Pydantic models, authentication with OAuth2, database integration with SQLAlchemy, and deployment strategies including Docker and Kubernetes. Each section includes hands-on examples you can follow along with.',
    word_count: 5890,
    processing_date: '2025-02-22T09:00:00Z',
    status: 'completed',
  },
  {
    id: 'sample-4',
    video_title: 'Introduction to Kubernetes Orchestration',
    video_url: 'https://youtube.com/watch?v=sample4',
    transcript_text: 'Kubernetes orchestration explained from scratch. We cover pods, services, deployments, config maps, secrets, and ingress controllers. Step-by-step guide to deploying a multi-container application with persistent storage and horizontal pod autoscaling.',
    word_count: 6120,
    processing_date: '2025-02-21T16:45:00Z',
    status: 'completed',
  },
]

// --- ErrorBoundary ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// --- Utility Functions ---
function formatDate(dateStr: string) {
  if (!dateStr) return 'Unknown'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// --- Status Badge ---
function StatusBadge({ status }: { status: string }) {
  const s = (status ?? 'unknown').toLowerCase()
  let classes = 'bg-muted text-muted-foreground border-border'
  if (s === 'completed') classes = 'bg-green-900/30 text-green-400 border-green-800/50'
  if (s === 'processing') classes = 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50'
  if (s === 'error' || s === 'failed') classes = 'bg-red-900/30 text-red-400 border-red-800/50'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${classes}`}>
      {status ?? 'unknown'}
    </span>
  )
}

// --- Stat Card ---
function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode; label: string; value: string | number; subtext?: string }) {
  return (
    <Card className="bg-card border-border shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-serif font-bold text-foreground">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
          </div>
          <div className="p-2.5 rounded-lg bg-[hsl(36,60%,31%)]/15 text-[hsl(36,60%,31%)]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Sidebar Navigation ---
function SidebarNav({
  activeView,
  onViewChange,
  isCollapsed,
  onToggle,
}: {
  activeView: ViewType
  onViewChange: (v: ViewType) => void
  isCollapsed: boolean
  onToggle: () => void
}) {
  const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiHome size={18} /> },
    { id: 'library', label: 'Transcript Library', icon: <FiList size={18} /> },
    { id: 'config', label: 'Configuration', icon: <FiSettings size={18} /> },
  ]

  return (
    <div className={`flex flex-col h-full bg-[hsl(20,28%,6%)] border-r border-[hsl(20,18%,12%)] transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between p-4 border-b border-[hsl(20,18%,12%)]">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <FiVideo className="text-[hsl(36,60%,31%)]" size={20} />
            <h1 className="font-serif text-lg font-semibold tracking-wide text-foreground">YT Transcript</h1>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-[hsl(20,18%,12%)] transition-colors text-muted-foreground"
        >
          {isCollapsed ? <FiMenu size={18} /> : <FiX size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 text-sm ${activeView === item.id ? 'bg-[hsl(36,60%,31%)] text-[hsl(35,20%,95%)] shadow-md' : 'text-muted-foreground hover:bg-[hsl(20,18%,12%)] hover:text-foreground'}`}
            title={isCollapsed ? item.label : undefined}
          >
            {item.icon}
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-[hsl(20,18%,12%)]">
        {!isCollapsed && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-secondary/50">
            <FiZap size={14} className="text-[hsl(36,60%,31%)]" />
            <span className="text-xs text-muted-foreground">Powered by Lyzr AI</span>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Agent Status Panel ---
function AgentStatusPanel({ activeAgentId }: { activeAgentId: string | null }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <FiZap size={12} className="text-[hsl(36,60%,31%)]" />
        <span className="text-xs font-medium text-foreground">Agent Status</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
        <span className="text-xs text-muted-foreground">
          {activeAgentId ? 'Processing request...' : 'Ready'}
        </span>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Transcript Assistant</span>
        <span className="mx-1">--</span>
        <span>ID: {AGENT_ID.slice(0, 8)}...</span>
      </div>
    </div>
  )
}

// --- Dashboard View ---
function DashboardView({
  transcripts,
  onViewTranscript,
  onQuickSearch,
  activeAgentId,
  lastResponse,
}: {
  transcripts: StoredTranscript[]
  onViewTranscript: (t: StoredTranscript) => void
  onQuickSearch: (query: string) => void
  activeAgentId: string | null
  lastResponse: AgentResponse | null
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const totalWords = transcripts.reduce((sum, t) => sum + (t?.word_count ?? 0), 0)

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onQuickSearch(searchQuery.trim())
    }
  }

  const [todayCount, setTodayCount] = useState(0)
  useEffect(() => {
    const now = new Date()
    const count = transcripts.filter(t => {
      try {
        const d = new Date(t?.processing_date ?? '')
        return d.toDateString() === now.toDateString()
      } catch {
        return false
      }
    }).length
    setTodayCount(count)
  }, [transcripts])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground tracking-wide">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Overview of your WhatsApp YouTube Transcript Bot</p>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Quick search transcripts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
        />
        <Button onClick={handleSearch} disabled={!searchQuery.trim()} className="bg-[hsl(36,60%,31%)] text-[hsl(35,20%,95%)] hover:bg-[hsl(36,60%,36%)]">
          <FiSearch size={16} className="mr-2" />
          Search
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FiFileText size={20} />} label="Total Transcripts" value={transcripts.length} subtext="All time" />
        <StatCard icon={<FiClock size={20} />} label="Processed Today" value={todayCount} subtext="Last 24 hours" />
        <StatCard icon={<FiHash size={20} />} label="Total Words" value={totalWords.toLocaleString()} subtext="Across all transcripts" />
        <StatCard icon={<FiActivity size={20} />} label="Agent Status" value={activeAgentId ? 'Active' : 'Ready'} subtext={activeAgentId ? 'Processing...' : 'Awaiting input'} />
      </div>

      {lastResponse?.action_type === 'search' && Array.isArray(lastResponse?.search_results) && lastResponse.search_results.length > 0 && (
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <FiSearch size={16} className="text-[hsl(36,60%,31%)]" />
              Search Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastResponse.search_results.map((sr, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{sr?.video_title ?? 'Untitled'}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sr?.snippet ?? ''}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 border-[hsl(36,60%,31%)] text-[hsl(36,60%,31%)]">
                    {((sr?.relevance_score ?? 0) * 100).toFixed(0)}%
                  </Badge>
                </div>
                {sr?.video_url && (
                  <a href={sr.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[hsl(36,60%,31%)] hover:underline mt-2">
                    <FiExternalLink size={12} />
                    View on YouTube
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <FiClock size={16} className="text-[hsl(36,60%,31%)]" />
              Recent Transcripts
            </CardTitle>
            <Badge variant="outline" className="border-border text-muted-foreground text-xs">{transcripts.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {transcripts.length === 0 ? (
            <div className="text-center py-8">
              <FiFileText size={32} className="mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No transcripts yet</p>
              <p className="text-xs text-muted-foreground mt-1">Paste a YouTube URL in the chat panel to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transcripts.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onViewTranscript(t)}
                  className="w-full text-left p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t?.video_title ?? 'Untitled'}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FiHash size={10} />
                          {(t?.word_count ?? 0).toLocaleString()} words
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FiClock size={10} />
                          {formatDate(t?.processing_date ?? '')}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={t?.status ?? 'unknown'} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- Library View ---
function LibraryView({
  transcripts,
  onViewTranscript,
  onDeleteTranscript,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  currentPage,
  onPageChange,
}: {
  transcripts: StoredTranscript[]
  onViewTranscript: (t: StoredTranscript) => void
  onDeleteTranscript: (id: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  sortBy: string
  onSortChange: (s: string) => void
  currentPage: number
  onPageChange: (p: number) => void
}) {
  const pageSize = 5
  const filtered = transcripts.filter((t) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (t?.video_title ?? '').toLowerCase().includes(q) ||
      (t?.transcript_text ?? '').toLowerCase().includes(q)
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b?.processing_date ?? 0).getTime() - new Date(a?.processing_date ?? 0).getTime()
    if (sortBy === 'date_asc') return new Date(a?.processing_date ?? 0).getTime() - new Date(b?.processing_date ?? 0).getTime()
    if (sortBy === 'words_desc') return (b?.word_count ?? 0) - (a?.word_count ?? 0)
    if (sortBy === 'words_asc') return (a?.word_count ?? 0) - (b?.word_count ?? 0)
    if (sortBy === 'title_asc') return (a?.video_title ?? '').localeCompare(b?.video_title ?? '')
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground tracking-wide">Transcript Library</h2>
        <p className="text-sm text-muted-foreground mt-1">Browse, search, and manage all stored transcripts</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm cursor-pointer"
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="words_desc">Most words</option>
          <option value="words_asc">Fewest words</option>
          <option value="title_asc">Title A-Z</option>
        </select>
      </div>

      <Card className="bg-card border-border shadow-lg">
        <CardContent className="p-0">
          {paged.length === 0 ? (
            <div className="text-center py-12">
              <FiSearch size={32} className="mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No transcripts found</p>
              {searchQuery.trim() && <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paged.map((t) => (
                <div key={t.id} className="p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <button onClick={() => onViewTranscript(t)} className="text-left group">
                        <p className="text-sm font-medium text-foreground group-hover:text-[hsl(36,60%,31%)] transition-colors truncate">{t?.video_title ?? 'Untitled'}</p>
                      </button>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <StatusBadge status={t?.status ?? 'unknown'} />
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FiHash size={10} />
                          {(t?.word_count ?? 0).toLocaleString()} words
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FiClock size={10} />
                          {formatDate(t?.processing_date ?? '')}
                        </span>
                        {t?.video_url && (
                          <a href={t.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[hsl(36,60%,31%)] hover:underline flex items-center gap-1">
                            <FiExternalLink size={10} />
                            YouTube
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{(t?.transcript_text ?? '').slice(0, 200)}{(t?.transcript_text ?? '').length > 200 ? '...' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => onViewTranscript(t)} className="text-muted-foreground hover:text-foreground">
                        <FiBookOpen size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteTranscript(t.id)} className="text-muted-foreground hover:text-destructive">
                        <FiTrash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {((safePage - 1) * pageSize) + 1}-{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange(safePage - 1)} disabled={safePage <= 1} className="border-border text-foreground">
              <FiChevronLeft size={14} />
            </Button>
            <span className="text-sm text-muted-foreground">Page {safePage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(safePage + 1)} disabled={safePage >= totalPages} className="border-border text-foreground">
              <FiChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Detail View ---
function DetailView({
  transcript,
  onBack,
  onSummarize,
  summary,
  summaryLoading,
  agentMessage,
}: {
  transcript: StoredTranscript
  onBack: () => void
  onSummarize: () => void
  summary: string | null
  summaryLoading: boolean
  agentMessage: string | null
}) {
  const [copied, setCopied] = useState(false)
  const [expandedTranscript, setExpandedTranscript] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(transcript?.transcript_text ?? '')
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <FiChevronLeft size={16} />
        Back to Library
      </button>

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="font-serif text-xl font-bold tracking-wide">{transcript?.video_title ?? 'Untitled'}</CardTitle>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <StatusBadge status={transcript?.status ?? 'unknown'} />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FiHash size={10} />
                  {(transcript?.word_count ?? 0).toLocaleString()} words
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FiClock size={10} />
                  {formatDate(transcript?.processing_date ?? '')}
                </span>
              </div>
            </div>
            {transcript?.video_url && (
              <a href={transcript.video_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button variant="outline" size="sm" className="border-border text-foreground">
                  <FiExternalLink size={14} className="mr-2" />
                  YouTube
                </Button>
              </a>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleCopy} variant="outline" className="border-border text-foreground">
          {copied ? <FiCheck size={14} className="mr-2 text-green-400" /> : <FiCopy size={14} className="mr-2" />}
          {copied ? 'Copied' : 'Copy Transcript'}
        </Button>
        <Button onClick={onSummarize} disabled={summaryLoading} className="bg-[hsl(36,60%,31%)] text-[hsl(35,20%,95%)] hover:bg-[hsl(36,60%,36%)]">
          {summaryLoading ? <FiLoader size={14} className="mr-2 animate-spin" /> : <FiBookOpen size={14} className="mr-2" />}
          {summaryLoading ? 'Summarizing...' : 'Summarize'}
        </Button>
        <Button variant="outline" onClick={() => setExpandedTranscript(!expandedTranscript)} className="border-border text-foreground">
          {expandedTranscript ? <FiMinimize2 size={14} className="mr-2" /> : <FiMaximize2 size={14} className="mr-2" />}
          {expandedTranscript ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      {agentMessage && (
        <Card className="bg-secondary/50 border-border">
          <CardContent className="p-4">
            <div className="text-sm text-foreground">{renderMarkdown(agentMessage)}</div>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card className="bg-card border-border shadow-lg border-l-4 border-l-[hsl(36,60%,31%)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <FiBookOpen size={16} className="text-[hsl(36,60%,31%)]" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-foreground leading-relaxed">{renderMarkdown(summary)}</div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-serif flex items-center gap-2">
            <FiFileText size={16} className="text-[hsl(36,60%,31%)]" />
            Full Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className={expandedTranscript ? '' : 'h-[400px]'}>
            <div className="text-sm text-foreground leading-[1.65] whitespace-pre-wrap pr-4">
              {transcript?.transcript_text ?? 'No transcript text available.'}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Config View ---
function ConfigView({
  config,
  onConfigChange,
  onSave,
  saveStatus,
  connectionStatus,
  onTestConnection,
  testingConnection,
}: {
  config: ConfigState
  onConfigChange: (key: string, value: string | boolean | number) => void
  onSave: () => void
  saveStatus: string | null
  connectionStatus: string | null
  onTestConnection: () => void
  testingConnection: boolean
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground tracking-wide">Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">WhatsApp connection settings and bot behavior</p>
      </div>

      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="connection" className="data-[state=active]:bg-[hsl(36,60%,31%)] data-[state=active]:text-[hsl(35,20%,95%)]">Connection</TabsTrigger>
          <TabsTrigger value="behavior" className="data-[state=active]:bg-[hsl(36,60%,31%)] data-[state=active]:text-[hsl(35,20%,95%)]">Bot Behavior</TabsTrigger>
          <TabsTrigger value="knowledge" className="data-[state=active]:bg-[hsl(36,60%,31%)] data-[state=active]:text-[hsl(35,20%,95%)]">Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="mt-4 space-y-4">
          <Card className="bg-card border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-base font-serif">WhatsApp Connection</CardTitle>
              <CardDescription className="text-muted-foreground">Configure your WhatsApp bot connection settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-sm text-foreground">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => onConfigChange('apiKey', e.target.value)}
                  placeholder="Enter your WhatsApp API key"
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookUrl" className="text-sm text-foreground">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhookUrl"
                    value={config.webhookUrl}
                    onChange={(e) => onConfigChange('webhookUrl', e.target.value)}
                    placeholder="https://your-webhook.example.com/api/whatsapp"
                    className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (config.webhookUrl) {
                        await copyToClipboard(config.webhookUrl)
                      }
                    }}
                    className="border-border text-foreground shrink-0"
                  >
                    <FiCopy size={14} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm text-foreground">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={config.phoneNumber}
                  onChange={(e) => onConfigChange('phoneNumber', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <Separator className="bg-border" />

              <div className="flex items-center gap-3">
                <Button onClick={onTestConnection} disabled={testingConnection} variant="outline" className="border-border text-foreground">
                  {testingConnection ? <FiLoader size={14} className="mr-2 animate-spin" /> : <FiWifi size={14} className="mr-2" />}
                  Test Connection
                </Button>
                {connectionStatus && (
                  <span className={`text-xs flex items-center gap-1 ${connectionStatus === 'connected' ? 'text-green-400' : connectionStatus === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {connectionStatus === 'connected' ? <FiCheck size={12} /> : connectionStatus === 'error' ? <FiAlertCircle size={12} /> : <FiLoader size={12} className="animate-spin" />}
                    {connectionStatus === 'connected' ? 'Connected successfully' : connectionStatus === 'error' ? 'Connection failed' : 'Testing...'}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="mt-4 space-y-4">
          <Card className="bg-card border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-base font-serif">Bot Behavior Settings</CardTitle>
              <CardDescription className="text-muted-foreground">Customize how the bot processes and responds to requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <div>
                  <Label className="text-sm font-medium text-foreground">Auto-Summarize</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Automatically generate summary after transcription</p>
                </div>
                <Switch
                  checked={config.autoSummarize}
                  onCheckedChange={(checked) => onConfigChange('autoSummarize', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxLength" className="text-sm text-foreground">Max Transcript Length (words)</Label>
                <Input
                  id="maxLength"
                  type="number"
                  value={config.maxTranscriptLength}
                  onChange={(e) => onConfigChange('maxTranscriptLength', parseInt(e.target.value) || 0)}
                  className="bg-input border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">Set to 0 for unlimited</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm text-foreground">Response Language</Label>
                <select
                  id="language"
                  value={config.responseLanguage}
                  onChange={(e) => onConfigChange('responseLanguage', e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>

              <Separator className="bg-border" />

              <div className="flex items-center gap-3">
                <Button onClick={onSave} className="bg-[hsl(36,60%,31%)] text-[hsl(35,20%,95%)] hover:bg-[hsl(36,60%,36%)]">
                  Save Settings
                </Button>
                {saveStatus && (
                  <span className={`text-xs flex items-center gap-1 ${saveStatus === 'saved' ? 'text-green-400' : 'text-red-400'}`}>
                    {saveStatus === 'saved' ? <FiCheck size={12} /> : <FiAlertCircle size={12} />}
                    {saveStatus === 'saved' ? 'Settings saved successfully' : 'Save failed'}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4 space-y-4">
          <Card className="bg-card border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-base font-serif flex items-center gap-2">
                <FiDatabase size={16} className="text-[hsl(36,60%,31%)]" />
                Knowledge Base
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Upload documents to enhance the bot with additional knowledge. Supported formats: PDF, DOCX, TXT.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeBaseUpload ragId={RAG_ID} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// --- Main Page ---
export default function Page() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [useSampleData, setUseSampleData] = useState(false)
  const [transcripts, setTranscripts] = useState<StoredTranscript[]>([])
  const [selectedTranscript, setSelectedTranscript] = useState<StoredTranscript | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<AgentResponse | null>(null)

  // Chat input
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'agent'; content: string; response?: AgentResponse }>>([])
  const [chatError, setChatError] = useState<string | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Library state
  const [librarySearch, setLibrarySearch] = useState('')
  const [librarySortBy, setLibrarySortBy] = useState('date_desc')
  const [libraryPage, setLibraryPage] = useState(1)

  // Detail state
  const [detailSummary, setDetailSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [detailAgentMessage, setDetailAgentMessage] = useState<string | null>(null)

  // Config state
  const [config, setConfig] = useState<ConfigState>({
    apiKey: '',
    webhookUrl: '',
    phoneNumber: '',
    autoSummarize: false,
    maxTranscriptLength: 0,
    responseLanguage: 'en',
  })
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)

  // Mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Sample data toggle
  const displayTranscripts = useSampleData ? SAMPLE_TRANSCRIPTS : transcripts

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleViewTranscript = useCallback((t: StoredTranscript) => {
    setSelectedTranscript(t)
    setDetailSummary(null)
    setDetailAgentMessage(null)
    setActiveView('detail')
  }, [])

  const handleDeleteTranscript = useCallback((id: string) => {
    setTranscripts(prev => prev.filter(t => t.id !== id))
  }, [])

  const processAgentResult = useCallback((result: any): AgentResponse => {
    const agentData: AgentResponse = result?.response?.result ?? {}
    return agentData
  }, [])

  const addTranscriptFromResponse = useCallback((agentData: AgentResponse) => {
    if (agentData?.action_type === 'transcribe' && agentData?.transcript_data) {
      const td = agentData.transcript_data
      const newTranscript: StoredTranscript = {
        id: 'tx_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36),
        video_title: td?.video_title ?? 'Untitled Video',
        video_url: td?.video_url ?? '',
        transcript_text: td?.transcript_text ?? '',
        word_count: td?.word_count ?? 0,
        processing_date: td?.processing_date ?? new Date().toISOString(),
        status: td?.status ?? 'completed',
      }
      setTranscripts(prev => [newTranscript, ...prev])
    }
  }, [])

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const message = chatInput.trim()
    setChatInput('')
    setChatError(null)
    setChatLoading(true)
    setActiveAgentId(AGENT_ID)

    setChatMessages(prev => [...prev, { role: 'user', content: message }])

    try {
      const result = await callAIAgent(message, AGENT_ID)

      if (result?.success) {
        const agentData = processAgentResult(result)
        setLastResponse(agentData)

        setChatMessages(prev => [
          ...prev,
          {
            role: 'agent',
            content: agentData?.message ?? 'Response received.',
            response: agentData,
          },
        ])

        addTranscriptFromResponse(agentData)
      } else {
        const errMsg = result?.error ?? 'Failed to get response from agent.'
        setChatError(errMsg)
        setChatMessages(prev => [
          ...prev,
          { role: 'agent', content: errMsg },
        ])
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setChatError(errMsg)
      setChatMessages(prev => [
        ...prev,
        { role: 'agent', content: errMsg },
      ])
    } finally {
      setChatLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleQuickSearch = async (query: string) => {
    const message = `Search transcripts for: ${query}`
    setChatError(null)
    setChatLoading(true)
    setActiveAgentId(AGENT_ID)

    setChatMessages(prev => [...prev, { role: 'user', content: message }])

    try {
      const result = await callAIAgent(message, AGENT_ID)
      if (result?.success) {
        const agentData = processAgentResult(result)
        setLastResponse(agentData)
        setChatMessages(prev => [
          ...prev,
          { role: 'agent', content: agentData?.message ?? 'Search completed.', response: agentData },
        ])
        addTranscriptFromResponse(agentData)
      } else {
        setChatMessages(prev => [
          ...prev,
          { role: 'agent', content: result?.error ?? 'Search failed.' },
        ])
      }
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        { role: 'agent', content: err instanceof Error ? err.message : 'Error occurred.' },
      ])
    } finally {
      setChatLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleSummarize = async () => {
    if (!selectedTranscript || summaryLoading) return
    setSummaryLoading(true)
    setActiveAgentId(AGENT_ID)

    try {
      const message = `Summarize the transcript for video: "${selectedTranscript?.video_title ?? 'Untitled'}". Transcript text: ${(selectedTranscript?.transcript_text ?? '').slice(0, 3000)}`
      const result = await callAIAgent(message, AGENT_ID)

      if (result?.success) {
        const agentData = processAgentResult(result)
        setDetailSummary(agentData?.summary ?? agentData?.message ?? 'No summary available.')
        setDetailAgentMessage(agentData?.message ?? null)
      } else {
        setDetailAgentMessage(result?.error ?? 'Failed to generate summary.')
      }
    } catch (err) {
      setDetailAgentMessage(err instanceof Error ? err.message : 'Error generating summary.')
    } finally {
      setSummaryLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleConfigChange = (key: string, value: string | boolean | number) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaveStatus(null)
  }

  const handleSaveConfig = () => {
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(null), 3000)
  }

  const handleTestConnection = () => {
    setTestingConnection(true)
    setConnectionStatus('testing')
    setTimeout(() => {
      setConnectionStatus(config.apiKey ? 'connected' : 'error')
      setTestingConnection(false)
    }, 2000)
  }

  const handleViewChange = (view: ViewType) => {
    setActiveView(view)
    setMobileSidebarOpen(false)
    if (view !== 'detail') {
      setSelectedTranscript(null)
      setDetailSummary(null)
      setDetailAgentMessage(null)
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
        )}

        {/* Sidebar - desktop */}
        <div className="hidden lg:block h-screen sticky top-0">
          <SidebarNav
            activeView={activeView}
            onViewChange={handleViewChange}
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Sidebar - mobile */}
        <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarNav
            activeView={activeView}
            onViewChange={handleViewChange}
            isCollapsed={false}
            onToggle={() => setMobileSidebarOpen(false)}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-md hover:bg-secondary transition-colors text-foreground"
                >
                  <FiMenu size={20} />
                </button>
                <div>
                  <h1 className="font-serif text-lg font-bold tracking-wide text-foreground">
                    WhatsApp YouTube Transcript Bot
                  </h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Transcribe, search, and summarize YouTube videos via WhatsApp
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="sampleToggle" className="text-xs text-muted-foreground hidden sm:block cursor-pointer">Sample Data</Label>
                <Switch
                  id="sampleToggle"
                  checked={useSampleData}
                  onCheckedChange={setUseSampleData}
                />
              </div>
            </div>
          </header>

          {/* Content + Chat */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Main area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-4">
                {activeView === 'dashboard' && (
                  <DashboardView
                    transcripts={displayTranscripts}
                    onViewTranscript={handleViewTranscript}
                    onQuickSearch={handleQuickSearch}
                    activeAgentId={activeAgentId}
                    lastResponse={lastResponse}
                  />
                )}
                {activeView === 'library' && (
                  <LibraryView
                    transcripts={displayTranscripts}
                    onViewTranscript={handleViewTranscript}
                    onDeleteTranscript={handleDeleteTranscript}
                    searchQuery={librarySearch}
                    onSearchChange={setLibrarySearch}
                    sortBy={librarySortBy}
                    onSortChange={setLibrarySortBy}
                    currentPage={libraryPage}
                    onPageChange={setLibraryPage}
                  />
                )}
                {activeView === 'detail' && selectedTranscript && (
                  <DetailView
                    transcript={selectedTranscript}
                    onBack={() => handleViewChange('library')}
                    onSummarize={handleSummarize}
                    summary={detailSummary}
                    summaryLoading={summaryLoading}
                    agentMessage={detailAgentMessage}
                  />
                )}
                {activeView === 'config' && (
                  <ConfigView
                    config={config}
                    onConfigChange={handleConfigChange}
                    onSave={handleSaveConfig}
                    saveStatus={saveStatus}
                    connectionStatus={connectionStatus}
                    onTestConnection={handleTestConnection}
                    testingConnection={testingConnection}
                  />
                )}
              </div>
            </div>

            {/* Chat Panel */}
            <div className="lg:w-[380px] xl:w-[420px] border-t lg:border-t-0 lg:border-l border-border flex flex-col bg-card/50">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiMessageSquare size={16} className="text-[hsl(36,60%,31%)]" />
                  <h3 className="font-serif text-sm font-semibold text-foreground">Chat with Bot</h3>
                </div>
                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                  {chatMessages.length} messages
                </Badge>
              </div>

              {/* Chat Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px] lg:max-h-none">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <FiVideo size={28} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">Start a conversation</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto leading-relaxed">
                      Paste a YouTube URL to transcribe, ask questions to search, or request summaries.
                    </p>
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={() => setChatInput('Transcribe https://youtube.com/watch?v=example')}
                        className="block w-full text-left px-3 py-2 rounded-md bg-secondary/50 border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        <FiPlay size={10} className="inline mr-2" />
                        Transcribe a YouTube video
                      </button>
                      <button
                        onClick={() => setChatInput('Search for machine learning topics')}
                        className="block w-full text-left px-3 py-2 rounded-md bg-secondary/50 border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        <FiSearch size={10} className="inline mr-2" />
                        Search across transcripts
                      </button>
                      <button
                        onClick={() => setChatInput('List all my transcripts')}
                        className="block w-full text-left px-3 py-2 rounded-md bg-secondary/50 border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        <FiList size={10} className="inline mr-2" />
                        List all transcripts
                      </button>
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2.5 ${msg.role === 'user' ? 'bg-[hsl(36,60%,31%)] text-[hsl(35,20%,95%)]' : 'bg-secondary border border-border text-foreground'}`}>
                      <div className="text-sm leading-relaxed">
                        {msg.role === 'agent' ? renderMarkdown(msg.content) : msg.content}
                      </div>

                      {/* Inline transcript data */}
                      {msg.role === 'agent' && msg.response?.transcript_data && (
                        <div className="mt-2 p-2 rounded bg-background/50 border border-border">
                          <p className="text-xs font-medium truncate">{msg.response.transcript_data?.video_title ?? 'Untitled'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{(msg.response.transcript_data?.word_count ?? 0).toLocaleString()} words</span>
                            <StatusBadge status={msg.response.transcript_data?.status ?? 'unknown'} />
                          </div>
                          {msg.response.transcript_data?.video_url && (
                            <a href={msg.response.transcript_data.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[hsl(36,60%,31%)] hover:underline mt-1">
                              <FiExternalLink size={10} />
                              Open Video
                            </a>
                          )}
                        </div>
                      )}

                      {/* Inline search results */}
                      {msg.role === 'agent' && Array.isArray(msg.response?.search_results) && msg.response.search_results.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {msg.response.search_results.map((sr, srIdx) => (
                            <div key={srIdx} className="p-2 rounded bg-background/50 border border-border">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium truncate">{sr?.video_title ?? 'Untitled'}</p>
                                <span className="text-xs text-[hsl(36,60%,31%)] shrink-0">{((sr?.relevance_score ?? 0) * 100).toFixed(0)}%</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sr?.snippet ?? ''}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline summary */}
                      {msg.role === 'agent' && msg.response?.summary && (
                        <div className="mt-2 p-2 rounded bg-background/50 border border-border border-l-2 border-l-[hsl(36,60%,31%)]">
                          <p className="text-xs font-medium mb-1">Summary</p>
                          <div className="text-xs text-muted-foreground leading-relaxed">{renderMarkdown(msg.response.summary)}</div>
                        </div>
                      )}

                      {/* Action type badge */}
                      {msg.role === 'agent' && msg.response?.action_type && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                            {msg.response.action_type}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary border border-border rounded-lg px-3 py-2.5 flex items-center gap-2">
                      <FiLoader size={14} className="animate-spin text-[hsl(36,60%,31%)]" />
                      <span className="text-sm text-muted-foreground">Processing...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat error */}
              {chatError && (
                <div className="mx-4 mb-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <FiAlertCircle size={12} />
                    {chatError}
                  </p>
                </div>
              )}

              {/* Agent status */}
              <div className="px-4 pb-2">
                <AgentStatusPanel activeAgentId={activeAgentId} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste YouTube URL or ask a question..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendChat()
                      }
                    }}
                    disabled={chatLoading}
                    className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                  <Button
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-[hsl(36,60%,31%)] text-[hsl(35,20%,95%)] hover:bg-[hsl(36,60%,36%)] shrink-0"
                  >
                    {chatLoading ? <FiLoader size={16} className="animate-spin" /> : <FiSend size={16} />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
