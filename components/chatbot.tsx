'use client'

import { useRef, useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, User, Database } from 'lucide-react'

interface ChatMessage {
  id: number
  sender: 'user' | 'history'
  text: string
  timestamp: string
}

export default function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'history',
      text: 'Welcome! You can ask about your previous 8D documents or root cause analyses here.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const userMsg: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString(),
    }
    setMessages((msgs) => [...msgs, userMsg])
    setInput('')
    setLoading(true)

    // Simulate a response from historic data
    setTimeout(() => {
      const response: ChatMessage = {
        id: Date.now() + 1,
        sender: 'history',
        text: `This is a simulated answer referencing your historic data for: "${userMsg.text}"`,
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((msgs) => [...msgs, response])
      setLoading(false)
    }, 1200)
  }

  return (
    <Card className="max-w-2xl mx-auto flex flex-col border-border bg-card shadow-lg rounded-2xl overflow-hidden" style={{ height: 540 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-primary/90 to-accent/80 border-b border-border">
        <Database className="w-6 h-6 text-white" />
        <h2 className="text-lg font-bold text-white tracking-wide">AI Chatbot Assistant</h2>
      </div>
      {/* Chat area */}
      <div className="flex-1 px-4 py-6 space-y-4 bg-muted/40 overflow-y-auto" style={{ minHeight: 0 }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-end gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`rounded-full p-2 shadow ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-accent text-accent-foreground'}`}>
                {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Database className="w-5 h-5" />}
              </div>
              <div className={`max-w-xs px-4 py-2 rounded-2xl shadow ${msg.sender === 'user' ? 'bg-primary text-white ml-1' : 'bg-white text-foreground border border-border mr-1'}`}>
                <div className="text-sm whitespace-pre-line leading-relaxed">{msg.text}</div>
                <div className="text-xs text-muted-foreground mt-1 text-right">{msg.timestamp}</div>
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      {/* Input area */}
      <form
        className="flex items-center gap-2 border-t border-border p-4 bg-card"
        onSubmit={e => {
          e.preventDefault()
          handleSend()
        }}
      >
        <Input
          className="flex-1 rounded-full px-4 py-2 text-base border border-border bg-white"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()} className="rounded-full px-6 py-2">
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Send'}
        </Button>
      </form>
    </Card>
  )
}
