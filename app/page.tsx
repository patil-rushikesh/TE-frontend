'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageCircle, FileText, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { IshikawaDiagram } from '@/components/ishikawa-diagram'
import { FiveWhyAnalysis } from '@/components/five-why-analysis'
import Chatbot from '@/components/chatbot'
import EightDManager from '@/components/eightd-manager'


// Mock data generator for demonstration
const generateMockIshikawa = (problem: string) => {
  const categoryTemplates = {
    People: ['Lack of training', 'Poor communication', 'Insufficient staffing', 'High turnover'],
    Process: ['Inefficient workflow', 'Missing steps', 'Poor documentation', 'No review process'],
    Materials: ['Low quality supplies', 'Inadequate inventory', 'Poor vendor relations', 'Contamination risk'],
    Equipment: ['Outdated machinery', 'Poor maintenance', 'Inadequate tools', 'Technical issues'],
    Environment: ['Poor lighting', 'Noise pollution', 'Temperature control', 'Safety hazards'],
    Methods: ['Outdated procedures', 'No standardization', 'Lack of best practices', 'Resistance to change']
  }

  const categories = Object.entries(categoryTemplates).map(([name, causes]) => ({
    name,
    causes: causes.slice(0, 3).map(cause => `${cause} - related to ${problem.toLowerCase()}`)
  }))

  return {
    mainProblem: problem,
    categories
  }
}

const generateMockFiveWhy = (problem: string) => {
  return {
    problem,
    analysis: [
      {
        level: 1,
        question: `Why is "${problem}" happening?`,
        answer: 'The underlying process has inefficiencies and lacks proper oversight mechanisms.'
      },
      {
        level: 2,
        question: 'Why does the process have inefficiencies?',
        answer: 'The current workflow was designed without considering modern best practices.'
      },
      {
        level: 3,
        question: 'Why were best practices not considered?',
        answer: 'There was insufficient knowledge transfer and training during implementation.'
      },
      {
        level: 4,
        question: 'Why was there insufficient knowledge transfer?',
        answer: 'The organization lacks a structured training and documentation program.'
      },
      {
        level: 5,
        question: 'Why does the organization lack structured training?',
        answer: 'There is insufficient investment in knowledge management and continuous improvement initiatives.'
      }
    ],
    rootCause: 'Insufficient organizational investment in knowledge management and continuous improvement',
    recommendations: [
      'Establish a formal training and certification program',
      'Create comprehensive documentation standards',
      'Implement a continuous improvement framework',
      'Allocate budget for knowledge management systems',
      'Create cross-functional learning groups'
    ]
  }
}

function ChatbotFloating() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="fixed bottom-6 right-6 z-50 bg-primary text-white rounded-full shadow-lg p-4 flex items-center gap-2 hover:bg-orange-700 transition"
        onClick={() => setOpen(true)}
        aria-label="Open Chatbot"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="font-semibold hidden md:inline">Chatbot</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end bg-black/30">
          <div className="relative w-full max-w-md md:max-w-xl m-4 md:m-12" onClick={e => e.stopPropagation()}>
            <Chatbot />
            <button
              className="absolute top-3 right-3 bg-accent text-white rounded-full p-2 shadow hover:bg-orange-700 transition"
              onClick={() => setOpen(false)}
              aria-label="Close Chatbot"
              style={{ zIndex: 60 }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function Home() {
  const [problem, setProblem] = useState('')
  const [ishikawaData, setIshikawaData] = useState<ReturnType<typeof generateMockIshikawa> | null>(null)
  const [fiveWhyData, setFiveWhyData] = useState<ReturnType<typeof generateMockFiveWhy> | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('input')

  const handleAnalyze = async () => {
    if (!problem.trim()) return

    setLoading(true)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    setIshikawaData(generateMockIshikawa(problem))
    setFiveWhyData(generateMockFiveWhy(problem))
    setActiveTab('ishikawa')
    setLoading(false)
  }

  const examples = [
    'Customer complaints about product quality',
    'High employee turnover rate',
    'System downtime incidents',
    'Project delivery delays',
    'Budget overruns'
  ]

  const handleExample = (example: string) => {
    setProblem(example)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Problem Analyzer</h1>
          <p className="text-lg text-muted-foreground">
            Discover root causes using Ishikawa Diagrams and 5 Why Analysis
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="ishikawa" disabled={!ishikawaData}>Ishikawa</TabsTrigger>
            <TabsTrigger value="five-why" disabled={!fiveWhyData}>5 Why</TabsTrigger>
            <TabsTrigger value="eightd"><FileText className="inline w-4 h-4 mr-1" />8D Docs</TabsTrigger>
          </TabsList>

          {/* Floating Chatbot Button and Modal */}
          <ChatbotFloating />

          {/* 8D Document Upload/History Tab */}
          <TabsContent value="eightd">
            <EightDManager />
          </TabsContent>

          {/* Input Tab */}
          <TabsContent value="input" className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">Describe Your Problem</h2>
              <div className="space-y-4">
                <Input
                  placeholder="Enter the problem you want to analyze..."
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  className="text-base py-3"
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={!problem.trim() || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Problem'
                  )}
                </Button>
              </div>
            </Card>

            {/* Examples */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">Quick Examples</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => handleExample(example)}
                    className="p-3 text-left border border-border rounded-lg hover:bg-muted/50 transition-colors text-foreground text-sm font-medium"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Ishikawa Tab */}
          <TabsContent value="ishikawa">
            {ishikawaData && <IshikawaDiagram data={ishikawaData} />}
          </TabsContent>

          {/* 5 Why Tab */}
          <TabsContent value="five-why">
            {fiveWhyData && <FiveWhyAnalysis />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
